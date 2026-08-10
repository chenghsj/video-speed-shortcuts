import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import {
  createSettingsBackup,
  parseSettingsBackup,
  serializeSettingsBackup,
  SettingsBackupError,
} from './settings-backup'
import { SETTINGS_VERSION } from './types'

const expectBackupError = (input: string, code: SettingsBackupError['code']): void => {
  try {
    parseSettingsBackup(input)
    throw new Error('Expected backup parsing to fail')
  } catch (error) {
    expect(error).toBeInstanceOf(SettingsBackupError)
    expect((error as SettingsBackupError).code).toBe(code)
  }
}

describe('settings backup', () => {
  it('serializes a complete, versioned backup and round-trips every setting', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
      targetSpeed: 1.5,
      locale: 'en' as const,
      theme: 'dark' as const,
      shortcutEnabled: { ...DEFAULT_SETTINGS.shortcutEnabled, speedUp: false },
      siteRules: [{ host: 'youtube.com', enabled: true, targetSpeed: 1.5, showIndicator: false }],
    }
    const exportedAt = '2026-08-11T12:34:56.000Z'
    const serialized = serializeSettingsBackup(settings, '0.2.0', exportedAt)
    const raw = JSON.parse(serialized)

    expect(raw).toEqual({
      format: 'video-speed-shortcuts-settings',
      formatVersion: 1,
      exportedAt,
      extensionVersion: '0.2.0',
      settings,
    })
    expect(serialized.endsWith('\n')).toBe(true)

    const parsed = parseSettingsBackup(serialized)
    expect(parsed.settings).toEqual(settings)
    expect(parsed.exportedAt).toBe(exportedAt)
    expect(parsed.extensionVersion).toBe('0.2.0')
    expect(parsed.sourceSettingsVersion).toBe(SETTINGS_VERSION)
  })

  it('creates metadata without changing the supplied settings', () => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, '1.2.3', '2026-08-11T00:00:00.000Z')

    expect(backup.formatVersion).toBe(1)
    expect(backup.extensionVersion).toBe('1.2.3')
    expect(backup.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('rejects malformed and unrelated files', () => {
    expectBackupError('{', 'invalidJson')
    expectBackupError(JSON.stringify({ format: 'another-extension', formatVersion: 1 }), 'invalidFormat')
    expectBackupError(JSON.stringify({
      format: 'video-speed-shortcuts-settings',
      formatVersion: 2,
      exportedAt: '2026-08-11T00:00:00.000Z',
      extensionVersion: '0.2.0',
      settings: DEFAULT_SETTINGS,
    }), 'unsupportedFormatVersion')
  })

  it('rejects missing settings and settings from a future version', () => {
    const base = {
      format: 'video-speed-shortcuts-settings',
      formatVersion: 1,
      exportedAt: '2026-08-11T00:00:00.000Z',
      extensionVersion: '0.2.0',
    }

    expectBackupError(JSON.stringify(base), 'missingSettings')
    expectBackupError(JSON.stringify({
      ...base,
      settings: { ...DEFAULT_SETTINGS, version: SETTINGS_VERSION + 1 },
    }), 'unsupportedSettingsVersion')
  })

  it('migrates a v6 backup from blacklist to site rules before importing', () => {
    const parsed = parseSettingsBackup(JSON.stringify({
      format: 'video-speed-shortcuts-settings',
      formatVersion: 1,
      exportedAt: '2026-08-11T00:00:00.000Z',
      extensionVersion: '0.1.0',
      settings: {
        version: 6,
        minimumSpeed: -1,
        maximumSpeed: 99,
        blacklist: ['https://YouTube.com/watch'],
      },
    }))

    expect(parsed.sourceSettingsVersion).toBe(6)
    expect(parsed.settings.version).toBe(SETTINGS_VERSION)
    expect(parsed.settings.minimumSpeed).toBe(0.1)
    expect(parsed.settings.maximumSpeed).toBe(4)
    expect(parsed.settings.siteRules).toEqual([
      { host: 'youtube.com', enabled: true, targetSpeed: null, showIndicator: null },
    ])
    expect(parsed.settings).not.toHaveProperty('blacklist')
  })
})
