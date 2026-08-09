import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('i18n', () => {
  it('translates interface copy and interpolates values', () => {
    expect(translate('zh-TW', 'active')).toBe('快捷鍵使用中')
    expect(translate('en', 'rangeSummary', { minimum: 0.25, maximum: 4, step: 0.25 })).toContain('0.25×')
    expect(translate('zh-TW', 'automatic')).toBe('自動')
    expect(translate('en', 'system')).toBe('Automatic')
    expect(translate('zh-TW', 'blockedSites')).toBe('封鎖網站')
    expect(translate('en', 'blockedSiteDuplicate')).toBe('This site is already blocked.')
    expect(translate('zh-TW', 'loading')).toBe('載入中…')
  })

  it.each([
    ['zh-CN', 'simplifiedChinese', '简体中文'],
    ['ja', 'japanese', '日本語'],
    ['ko', 'korean', '한국어'],
  ] as const)('supports the %s locale', (locale, key, label) => {
    expect(translate(locale, 'language')).not.toBe('Language')
    expect(translate(locale, key)).toBe(label)
  })
})
