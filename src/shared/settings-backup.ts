import { normalizeSettings } from './settings'
import { SETTINGS_VERSION, type VideoSpeedSettings } from './types'

export const SETTINGS_BACKUP_FORMAT = 'video-speed-shortcuts-settings' as const
export const SETTINGS_BACKUP_FORMAT_VERSION = 1 as const

export type SettingsBackupV1 = {
  format: typeof SETTINGS_BACKUP_FORMAT
  formatVersion: typeof SETTINGS_BACKUP_FORMAT_VERSION
  exportedAt: string
  extensionVersion: string
  settings: VideoSpeedSettings
}

export type ParsedSettingsBackup = {
  exportedAt: string
  extensionVersion: string
  sourceSettingsVersion: number
  settings: VideoSpeedSettings
}

export type SettingsBackupErrorCode =
  | 'invalidJson'
  | 'invalidFormat'
  | 'unsupportedFormatVersion'
  | 'missingSettings'
  | 'unsupportedSettingsVersion'

export class SettingsBackupError extends Error {
  constructor(readonly code: SettingsBackupErrorCode) {
    super(code)
    this.name = 'SettingsBackupError'
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const createSettingsBackup = (
  settings: VideoSpeedSettings,
  extensionVersion: string,
  exportedAt = new Date().toISOString()
): SettingsBackupV1 => ({
  format: SETTINGS_BACKUP_FORMAT,
  formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
  exportedAt,
  extensionVersion,
  settings: normalizeSettings(settings),
})

export const serializeSettingsBackup = (
  settings: VideoSpeedSettings,
  extensionVersion: string,
  exportedAt?: string
): string => `${JSON.stringify(createSettingsBackup(settings, extensionVersion, exportedAt), null, 2)}\n`

export const parseSettingsBackup = (contents: string): ParsedSettingsBackup => {
  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    throw new SettingsBackupError('invalidJson')
  }

  if (!isRecord(value) || value.format !== SETTINGS_BACKUP_FORMAT) {
    throw new SettingsBackupError('invalidFormat')
  }
  if (value.formatVersion !== SETTINGS_BACKUP_FORMAT_VERSION) {
    throw new SettingsBackupError('unsupportedFormatVersion')
  }
  if (!isRecord(value.settings)) {
    throw new SettingsBackupError('missingSettings')
  }

  const sourceSettingsVersion = value.settings.version
  if (
    !Number.isInteger(sourceSettingsVersion) ||
    (sourceSettingsVersion as number) < 1 ||
    (sourceSettingsVersion as number) > SETTINGS_VERSION
  ) {
    throw new SettingsBackupError('unsupportedSettingsVersion')
  }
  if (
    typeof value.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(value.exportedAt)) ||
    typeof value.extensionVersion !== 'string' ||
    value.extensionVersion.length === 0
  ) {
    throw new SettingsBackupError('invalidFormat')
  }

  return {
    exportedAt: value.exportedAt,
    extensionVersion: value.extensionVersion,
    sourceSettingsVersion: sourceSettingsVersion as number,
    settings: normalizeSettings(value.settings),
  }
}
