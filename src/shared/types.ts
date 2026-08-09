export const SHORTCUT_ACTIONS = ['holdSpeed', 'speedUp', 'speedDown', 'speedReset'] as const

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

export const LOCALES = ['auto', 'en', 'zh-TW', 'zh-CN', 'ja', 'ko'] as const

export type Locale = (typeof LOCALES)[number]

export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export type KeyBinding = {
  code: string
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export type BlacklistEntry = {
  host: string
  enabled: boolean
}

export type VideoSpeedSettings = {
  version: 3
  enabled: boolean
  minimumSpeed: number
  maximumSpeed: number
  speedStep: number
  holdSpeed: number
  holdDelayMs: number
  showIndicator: boolean
  locale: Locale
  theme: Theme
  bindings: Record<ShortcutAction, KeyBinding>
  blacklist: BlacklistEntry[]
}
