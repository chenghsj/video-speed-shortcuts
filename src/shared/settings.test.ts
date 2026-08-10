import { describe, expect, it } from 'vitest'
import {
  createSettingsStore,
  DEFAULT_SETTINGS,
  normalizeSettings,
  type SettingsStorageAdapter,
} from './settings'
import { SETTINGS_VERSION, type VideoSpeedSettings } from './types'

const createMemoryStorage = (
  initial: unknown = undefined,
  blockFirstWrite = false,
  failFirstWrite = false
) => {
  let value = initial
  let writeCount = 0
  let resolveFirstWrite: (() => void) | null = null
  let firstWriteStarted = false
  const listeners = new Set<(nextValue: unknown) => void>()

  const storage: SettingsStorageAdapter = {
    read: async () => value,
    write: async nextSettings => {
      writeCount += 1
      if (failFirstWrite && writeCount === 1) throw new Error('write failed')
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
  it('defaults language and theme to automatic', () => {
    expect(DEFAULT_SETTINGS.locale).toBe('auto')
    expect(DEFAULT_SETTINGS.theme).toBe('system')
  })

  it('uses product defaults for missing settings', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })

  it('clamps unsafe numeric values', () => {
    const settings = normalizeSettings({
      minimumSpeed: -1,
      maximumSpeed: 99,
      speedStep: 99,
      targetSpeed: 99,
      holdSpeed: 99,
      holdDelayMs: 10,
    })

    expect(settings.minimumSpeed).toBe(0.1)
    expect(settings.maximumSpeed).toBe(4)
    expect(settings.speedStep).toBe(1)
    expect(settings.targetSpeed).toBe(4)
    expect(settings.holdSpeed).toBe(4)
    expect(settings.holdDelayMs).toBe(100)
    expect(normalizeSettings({ speedStep: 0 }).speedStep).toBe(0.05)
  })

  it('keeps target speed inside the configured playback range', () => {
    expect(normalizeSettings({ minimumSpeed: 0.5, maximumSpeed: 2, targetSpeed: 0.25 }).targetSpeed).toBe(0.5)
    expect(normalizeSettings({ minimumSpeed: 0.5, maximumSpeed: 2, targetSpeed: 3 }).targetSpeed).toBe(2)
    expect(normalizeSettings({ maximumSpeed: 1.5 }).targetSpeed).toBe(1.5)
  })

  it('keeps locale and theme values safe for older or invalid storage', () => {
    const settings = normalizeSettings({ locale: 'fr', theme: 'neon' })

    expect(settings.locale).toBe(DEFAULT_SETTINGS.locale)
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme)
  })

  it('enables migrated shortcuts and preserves explicit disabled actions', () => {
    expect(normalizeSettings({}).shortcutEnabled).toEqual(DEFAULT_SETTINGS.shortcutEnabled)
    expect(normalizeSettings({ shortcutEnabled: { speedUp: false } }).shortcutEnabled).toEqual({
      ...DEFAULT_SETTINGS.shortcutEnabled,
      speedUp: false,
    })
  })

  it('migrates and normalizes site rules with optional overrides', () => {
    const settings = normalizeSettings({
      siteRules: [
        { host: 'z.example.com', enabled: true },
        { host: 'https://YouTube.com/watch', enabled: false },
        { host: 'youtube.com', enabled: true, targetSpeed: 99, showIndicator: false },
        { host: 'a.example.com', enabled: false },
        { host: '*.invalid.com', enabled: true },
      ],
    })

    expect(settings.siteRules).toEqual([
      { host: 'youtube.com', enabled: true, targetSpeed: 2, showIndicator: false },
      { host: 'z.example.com', enabled: true, targetSpeed: null, showIndicator: null },
      { host: 'a.example.com', enabled: false, targetSpeed: null, showIndicator: null },
    ])
  })

  it('migrates the legacy blacklist field to site rules', () => {
    const settings = normalizeSettings({
      version: 6,
      blacklist: [
        { host: 'youtube.com', enabled: true, targetSpeed: 1.5, showIndicator: false },
      ],
    })

    expect(settings.version).toBe(SETTINGS_VERSION)
    expect(settings.siteRules).toEqual([
      { host: 'youtube.com', enabled: true, targetSpeed: 1.5, showIndicator: false },
    ])
    expect(settings).not.toHaveProperty('blacklist')
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

  it('rolls subscribers back when a storage write fails', async () => {
    const memory = createMemoryStorage(DEFAULT_SETTINGS, false, true)
    const store = createSettingsStore(memory.storage)
    const received: boolean[] = []

    await store.get()
    store.subscribe(settings => received.push(settings.enabled))

    await expect(store.update({ enabled: false })).rejects.toThrow('write failed')

    expect(received).toEqual([false, true])
  })

  it('does not keep an imported replacement when its storage write fails', async () => {
    const memory = createMemoryStorage(DEFAULT_SETTINGS, false, true)
    const store = createSettingsStore(memory.storage)
    const received: VideoSpeedSettings[] = []

    await store.get()
    store.subscribe(settings => received.push(settings))
    const imported = { ...DEFAULT_SETTINGS, enabled: false, locale: 'en' as const }

    await expect(store.save(imported)).rejects.toThrow('write failed')

    expect(received).toEqual([imported, DEFAULT_SETTINGS])
    expect(memory.getValue()).toBe(DEFAULT_SETTINGS)
  })
})
