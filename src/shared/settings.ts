import { DEFAULT_BINDINGS } from './keys'
import { NUMERIC_SETTING_CONSTRAINTS, type NumericSettingId } from './numeric-settings'
import { normalizeHostname } from './site-matching'
import {
  LOCALES,
  SETTINGS_VERSION,
  SHORTCUT_ACTIONS,
  THEMES,
  type KeyBinding,
  type Locale,
  type Theme,
  type VideoSpeedSettings,
} from './types'

export const STORAGE_KEY = 'videoSpeedSettings'

export const DEFAULT_SETTINGS: VideoSpeedSettings = {
  version: SETTINGS_VERSION,
  enabled: true,
  minimumSpeed: 0.25,
  maximumSpeed: 2,
  speedStep: 0.25,
  targetSpeed: 2,
  holdSpeed: 2,
  holdDelayMs: 250,
  showIndicator: true,
  locale: 'auto',
  theme: 'system',
  bindings: structuredClone(DEFAULT_BINDINGS),
  shortcutEnabled: Object.fromEntries(
    SHORTCUT_ACTIONS.map(action => [action, true])
  ) as Record<(typeof SHORTCUT_ACTIONS)[number], boolean>,
  siteRules: [],
}

export type SettingsUpdater =
  | Partial<VideoSpeedSettings>
  | ((current: VideoSpeedSettings) => VideoSpeedSettings)

export type SettingsStorageAdapter = {
  read: () => Promise<unknown>
  write: (settings: VideoSpeedSettings) => Promise<void>
  subscribe: (listener: (value: unknown) => void) => () => void
}

export type SettingsStore = {
  get: () => Promise<VideoSpeedSettings>
  save: (settings: VideoSpeedSettings) => Promise<void>
  update: (updater: SettingsUpdater) => Promise<VideoSpeedSettings>
  subscribe: (listener: (settings: VideoSpeedSettings) => void) => () => void
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))

const roundSpeed = (value: number): number => Number(value.toFixed(2))

const finiteOr = (value: unknown, fallback: number): number => {
  const candidate = Number(value)
  return Number.isFinite(candidate) ? candidate : fallback
}

const normalizeNumericSetting = (
  id: NumericSettingId,
  value: unknown,
  fallback: number
): number => {
  const { min, max } = NUMERIC_SETTING_CONSTRAINTS[id]
  const normalized = clamp(finiteOr(value, fallback), min, max)
  return id === 'holdDelayMs' ? Math.round(normalized) : roundSpeed(normalized)
}

const isKeyBinding = (value: unknown): value is KeyBinding => {
  if (!value || typeof value !== 'object') return false
  const binding = value as Partial<KeyBinding>
  return (
    typeof binding.code === 'string' &&
    binding.code.length > 0 &&
    typeof binding.key === 'string' &&
    typeof binding.ctrl === 'boolean' &&
    typeof binding.alt === 'boolean' &&
    typeof binding.shift === 'boolean' &&
    typeof binding.meta === 'boolean'
  )
}

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && LOCALES.includes(value as Locale)

const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && THEMES.includes(value as Theme)

const normalizeSiteRules = (
  value: unknown,
  minimumSpeed: number,
  maximumSpeed: number
): VideoSpeedSettings['siteRules'] => {
  if (!Array.isArray(value)) return []

  const entries = value.flatMap(item => {
    const source = typeof item === 'string' ? { host: item, enabled: true } : item
    if (!source || typeof source !== 'object') return []

    const candidate = source as {
      host?: unknown
      enabled?: unknown
      targetSpeed?: unknown
      showIndicator?: unknown
    }
    const host = normalizeHostname(candidate.host)
    if (!host) return []

    const targetSpeed = candidate.targetSpeed == null
      ? null
      : roundSpeed(clamp(finiteOr(candidate.targetSpeed, minimumSpeed), minimumSpeed, maximumSpeed))

    return [{
      host,
      enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
      targetSpeed,
      showIndicator: typeof candidate.showIndicator === 'boolean' ? candidate.showIndicator : null,
    }]
  })

  const unique = new Map(entries.map(entry => [entry.host, entry]))
  return [...unique.values()].sort(
    (left, right) => Number(right.enabled) - Number(left.enabled) || left.host.localeCompare(right.host)
  )
}

export const normalizeSettings = (value: unknown): VideoSpeedSettings => {
  const source = value && typeof value === 'object'
    ? (value as Partial<VideoSpeedSettings> & { blacklist?: unknown })
    : {}
  const minimumSpeed = normalizeNumericSetting(
    'minimumSpeed',
    source.minimumSpeed,
    DEFAULT_SETTINGS.minimumSpeed
  )
  const maximumSpeed = normalizeNumericSetting(
    'maximumSpeed',
    source.maximumSpeed,
    DEFAULT_SETTINGS.maximumSpeed
  )

  return {
    version: SETTINGS_VERSION,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_SETTINGS.enabled,
    minimumSpeed,
    maximumSpeed: Math.max(minimumSpeed, maximumSpeed),
    speedStep: normalizeNumericSetting(
      'speedStep',
      source.speedStep,
      DEFAULT_SETTINGS.speedStep
    ),
    targetSpeed: roundSpeed(
      clamp(
        finiteOr(source.targetSpeed, DEFAULT_SETTINGS.targetSpeed),
        minimumSpeed,
        Math.max(minimumSpeed, maximumSpeed)
      )
    ),
    holdSpeed: normalizeNumericSetting(
      'holdSpeed',
      source.holdSpeed,
      DEFAULT_SETTINGS.holdSpeed
    ),
    holdDelayMs: normalizeNumericSetting(
      'holdDelayMs',
      source.holdDelayMs,
      DEFAULT_SETTINGS.holdDelayMs
    ),
    showIndicator:
      typeof source.showIndicator === 'boolean'
        ? source.showIndicator
        : DEFAULT_SETTINGS.showIndicator,
    locale: isLocale(source.locale) ? source.locale : DEFAULT_SETTINGS.locale,
    theme: isTheme(source.theme) ? source.theme : DEFAULT_SETTINGS.theme,
    bindings: Object.fromEntries(
      SHORTCUT_ACTIONS.map(action => [
        action,
        isKeyBinding(source.bindings?.[action])
          ? source.bindings[action]
          : DEFAULT_BINDINGS[action],
      ])
    ) as VideoSpeedSettings['bindings'],
    shortcutEnabled: Object.fromEntries(
      SHORTCUT_ACTIONS.map(action => [
        action,
        typeof source.shortcutEnabled?.[action] === 'boolean'
          ? source.shortcutEnabled[action]
          : true,
      ])
    ) as VideoSpeedSettings['shortcutEnabled'],
    siteRules: normalizeSiteRules(
      source.siteRules ?? source.blacklist,
      minimumSpeed,
      Math.max(minimumSpeed, maximumSpeed)
    ),
  }
}

export const createSettingsStore = (storage: SettingsStorageAdapter): SettingsStore => {
  let current = DEFAULT_SETTINGS
  let persisted = DEFAULT_SETTINGS
  let writeQueue: Promise<void> = Promise.resolve()
  let externalUnsubscribe: (() => void) | null = null
  const listeners = new Set<(settings: VideoSpeedSettings) => void>()

  const emit = (value: unknown): VideoSpeedSettings => {
    current = normalizeSettings(value)
    for (const listener of listeners) listener(current)
    return current
  }

  const ensureExternalSubscription = (): void => {
    if (externalUnsubscribe || listeners.size === 0) return
    externalUnsubscribe = storage.subscribe(value => {
      persisted = emit(value)
    })
  }

  const get = async (): Promise<VideoSpeedSettings> => {
    persisted = emit(await storage.read())
    return persisted
  }

  const save = async (settings: VideoSpeedSettings): Promise<void> => {
    const next = emit(settings)
    const pendingWrite = writeQueue
      .catch(() => undefined)
      .then(() => storage.write(next))
    writeQueue = pendingWrite.catch(() => undefined)
    try {
      await pendingWrite
      persisted = next
    } catch (error) {
      if (current === next) emit(persisted)
      throw error
    }
  }

  const update = async (updater: SettingsUpdater): Promise<VideoSpeedSettings> => {
    const next = normalizeSettings(
      typeof updater === 'function' ? updater(current) : { ...current, ...updater }
    )
    await save(next)
    return next
  }

  const subscribe = (listener: (settings: VideoSpeedSettings) => void): (() => void) => {
    listeners.add(listener)
    ensureExternalSubscription()

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && externalUnsubscribe) {
        externalUnsubscribe()
        externalUnsubscribe = null
      }
    }
  }

  return { get, save, update, subscribe }
}

const chromeStorageAdapter: SettingsStorageAdapter = {
  read: async () => {
    const stored = await chrome.storage.sync.get(STORAGE_KEY)
    return stored[STORAGE_KEY]
  },
  write: async settings => {
    await chrome.storage.sync.set({ [STORAGE_KEY]: normalizeSettings(settings) })
  },
  subscribe: listener => {
    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'sync' || !changes[STORAGE_KEY]) return
      listener(changes[STORAGE_KEY].newValue)
    }

    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  },
}

export const settingsStore = createSettingsStore(chromeStorageAdapter)

export const getSettings = (): Promise<VideoSpeedSettings> => settingsStore.get()

export const saveSettings = (settings: VideoSpeedSettings): Promise<void> => settingsStore.save(settings)

export const updateSettings = (updater: SettingsUpdater): Promise<VideoSpeedSettings> =>
  settingsStore.update(updater)

export const subscribeSettings = (
  listener: (settings: VideoSpeedSettings) => void
): (() => void) => settingsStore.subscribe(listener)
