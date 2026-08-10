export const SHORTCUT_ACTIONS = [
  'holdSpeed',
  'toggleTargetSpeed',
  'speedUp',
  'speedDown',
  'speedReset',
] as const

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

export const LOCALES = ['auto', 'en', 'zh-TW', 'zh-CN', 'ja', 'ko'] as const

export type Locale = (typeof LOCALES)[number]

export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export const SETTINGS_VERSION = 7 as const

export type KeyBinding = {
  code: string
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export type SiteRule = {
  host: string
  enabled: boolean
  targetSpeed: number | null
  showIndicator: boolean | null
}

export type VideoSpeedSettings = {
  version: typeof SETTINGS_VERSION
  enabled: boolean
  minimumSpeed: number
  maximumSpeed: number
  speedStep: number
  targetSpeed: number
  holdSpeed: number
  holdDelayMs: number
  showIndicator: boolean
  locale: Locale
  theme: Theme
  bindings: Record<ShortcutAction, KeyBinding>
  shortcutEnabled: Record<ShortcutAction, boolean>
  siteRules: SiteRule[]
}
