import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('i18n', () => {
  it('translates interface copy and interpolates values', () => {
    expect(translate('zh-TW', 'active')).toBe('快捷鍵使用中')
    expect(translate('en', 'rangeSummary', { minimum: 0.25, maximum: 4, step: 0.25 })).toContain('0.25×')
    expect(translate('zh-TW', 'automatic')).toBe('自動')
    expect(translate('en', 'system')).toBe('Automatic')
    expect(translate('zh-TW', 'siteRules')).toBe('網站規則')
    expect(translate('zh-TW', 'generalSettings')).toBe('一般')
    expect(translate('en', 'followGeneralSettings')).toBe('Use general settings')
    expect(translate('en', 'status')).toBe('Shortcuts')
    expect(translate('en', 'custom')).toBe('Custom')
    expect(translate('zh-TW', 'targetSpeed')).toBe('常用速度')
    expect(translate('zh-TW', 'targetSpeedDescription')).toBe('按下「常用速度」快捷鍵時，直接套用此速度。')
    expect(translate('zh-TW', 'toggleTargetSpeedTitle')).toBe('常用速度')
    expect(translate('en', 'blockedSiteDuplicate', { line: 3 })).toBe(
      'Line 3 duplicates another entry or an existing site.'
    )
    expect(translate('zh-TW', 'loading')).toBe('載入中…')
    expect(translate('zh-TW', 'backupRestore')).toBe('備份與還原')
    expect(translate('zh-TW', 'importPreviewTitle')).toBe('確認匯入設定')
    expect(translate('zh-TW', 'automaticBrowser')).toBe('自動（跟隨瀏覽器）')
    expect(translate('zh-TW', 'automaticSystem')).toBe('自動（跟隨系統）')
    expect(translate('en', 'backupShortcutsValue', { total: 5, enabled: 4 })).toBe(
      '5 shortcuts (4 enabled)'
    )
    expect(translate('en', 'backupSiteRulesValue', { count: 3 })).toBe('3 rules')
  })

  it.each([
    ['zh-CN', 'simplifiedChinese', '简体中文'],
    ['ja', 'japanese', '日本語'],
    ['ko', 'korean', '한국어'],
  ] as const)('supports the %s locale', (locale, key, label) => {
    expect(translate(locale, 'language')).not.toBe('Language')
    expect(translate(locale, key)).toBe(label)
  })

  it.each([
    ['zh-TW', '提高速度'],
    ['en', 'Increase speed'],
    ['zh-CN', '提高速度'],
    ['ja', '速度を上げる'],
    ['ko', '속도 높이기'],
  ] as const)('identifies the shortcut action in the %s recorder description', (locale, action) => {
    expect(translate(locale, 'recordShortcutDescription', { action })).toContain(action)
  })
})
