import { useCallback, useEffect, useMemo } from 'react'
import { translate, type TranslationKey } from './i18n'
import { applyTheme } from './theme'
import type { Locale, Theme } from './types'

export const useLocalizedAppearance = (locale: Locale, theme: Theme) => {
  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(locale, key, values),
    [locale]
  )

  useEffect(() => {
    const update = () => applyTheme(theme)
    update()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [theme])

  const localeOptions = useMemo(
    () => [
      { value: 'auto' as const, label: t('automatic') },
      { value: 'en' as const, label: t('english') },
      { value: 'zh-TW' as const, label: t('traditionalChinese') },
      { value: 'zh-CN' as const, label: t('simplifiedChinese') },
      { value: 'ja' as const, label: t('japanese') },
      { value: 'ko' as const, label: t('korean') },
    ],
    [t]
  )

  const themeOptions = useMemo(
    () => [
      { value: 'system' as const, label: t('system') },
      { value: 'light' as const, label: t('light') },
      { value: 'dark' as const, label: t('dark') },
    ],
    [t]
  )

  return { t, localeOptions, themeOptions }
}
