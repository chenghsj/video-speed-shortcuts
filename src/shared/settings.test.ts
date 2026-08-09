import { describe, expect, it } from 'vitest'
import {
  createSettingsStore,
  DEFAULT_SETTINGS,
  normalizeSettings,
  type SettingsStorageAdapter,
} from './settings'
import type { VideoSpeedSettings } from './types'

const createMemoryStorage = (initial: unknown = undefined, blockFirstWrite = false) => {
  let value = initial
  let writeCount = 0
  let resolveFirstWrite: (() => void) | null = null
  let firstWriteStarted = false
  const listeners = new Set<(nextValue: unknown) => void>()

  const storage: SettingsStorageAdapter = {
    read: async () => value,
    write: async nextSettings => {
      writeCount += 1
      if (blockFirstWrite && writeCount === 1) {
        firstWriteStarted = true
        await new Promise<void>(resolve => {
          resolveFirstWrite = resolve
        })
      }
      value = nextSettings
    },
    subscribe: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  return {
    storage,
    emit: (nextValue: unknown) => listeners.forEach(listener => listener(nextValue)),
    getValue: () => value,
    getWriteCount: () => writeCount,
    isFirstWriteStarted: () => firstWriteStarted,
    releaseFirstWrite: () => resolveFirstWrite?.(),
  }
}

describe('normalizeSettings', () => {
  it('uses product defaults for missing settings', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })

  it('clamps unsafe numeric values', () => {
    const settings = normalizeSettings({
      minimumSpeed: -1,
      maximumSpeed: 99,
      speedStep: 0,
      holdSpeed: 99,
      holdDelayMs: 10,
    })

    expect(settings.minimumSpeed).toBe(0.1)
    expect(settings.maximumSpeed).toBe(16)
    expect(settings.speedStep).toBe(0.05)
    expect(settings.holdSpeed).toBe(16)
    expect(settings.holdDelayMs).toBe(100)
  })

  it('keeps locale and theme values safe for older or invalid storage', () => {
    const settings = normalizeSettings({ locale: 'fr', theme: 'neon' })

    expect(settings.locale).toBe(DEFAULT_SETTINGS.locale)
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme)
  })

  it('normalizes, deduplicates, and orders blacklist entries', () => {
    const settings = normalizeSettings({
      blacklist: [
        { host: 'z.example.com', enabled: true },
        { host: 'https://YouTube.com/watch', enabled: false },
        { host: 'youtube.com', enabled: true },
        { host: 'a.example.com', enabled: false },
        { host: '*.invalid.com', enabled: true },
      ],
    })

    expect(settings.blacklist).toEqual([
      { host: 'youtube.com', enabled: true },
      { host: 'z.example.com', enabled: true },
      { host: 'a.example.com', enabled: false },
    ])
  })

  it('notifies subscribers and removes the storage adapter when unsubscribed', async () => {
    const memory = createMemoryStorage()
    const store = createSettingsStore(memory.storage)
    const received: number[] = []
    const unsubscribe = store.subscribe(settings => received.push(settings.speedStep))

    await store.update({ speedStep: 0.5 })
    memory.emit({ speedStep: 0.75 })
    unsubscribe()
    memory.emit({ speedStep: 1 })

    expect(received).toEqual([0.5, 0.75])
  })

  it('serializes writes and lets the latest local update win', async () => {
    const memory = createMemoryStorage(undefined, true)
    const store = createSettingsStore(memory.storage)

    const first = store.update({ speedStep: 0.5 })
    while (!memory.isFirstWriteStarted()) await Promise.resolve()
    const second = store.update({ speedStep: 0.75 })
    memory.releaseFirstWrite()

    await Promise.all([first, second])

    expect(memory.getWriteCount()).toBe(2)
    expect((memory.getValue() as VideoSpeedSettings).speedStep).toBe(0.75)
  })
})
