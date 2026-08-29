import { DatabaseBackup, Download, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import type { TranslationKey } from '../shared/i18n'
import {
  parseSettingsBackup,
  serializeSettingsBackup,
  SettingsBackupError,
  type ParsedSettingsBackup,
  type SettingsBackupErrorCode,
} from '../shared/settings-backup'
import { SHORTCUT_ACTIONS, type Locale, type Theme, type VideoSpeedSettings } from '../shared/types'

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string

type SettingsTransferProps = {
  settings: VideoSpeedSettings
  t: Translate
  onImport: (settings: VideoSpeedSettings) => Promise<void>
}

const ERROR_COPY: Record<SettingsBackupErrorCode, TranslationKey> = {
  invalidJson: 'backupInvalidJson',
  invalidFormat: 'backupInvalidFormat',
  unsupportedFormatVersion: 'backupUnsupportedFormatVersion',
  missingSettings: 'backupMissingSettings',
  unsupportedSettingsVersion: 'backupUnsupportedSettingsVersion',
}

const LOCALE_COPY: Record<Locale, TranslationKey> = {
  auto: 'automatic',
  en: 'english',
  'zh-TW': 'traditionalChinese',
  'zh-CN': 'simplifiedChinese',
  ja: 'japanese',
  ko: 'korean',
}

const THEME_COPY: Record<Theme, TranslationKey> = {
  system: 'system',
  light: 'light',
  dark: 'dark',
}

const formatExportedAt = (value: string, locale: Locale): string => {
  try {
    return new Intl.DateTimeFormat(locale === 'auto' ? undefined : locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export const SettingsTransfer = ({ settings, t, onImport }: SettingsTransferProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ParsedSettingsBackup | null>(null)
  const [statusKey, setStatusKey] = useState<TranslationKey | null>(null)
  const [dialogErrorKey, setDialogErrorKey] = useState<TranslationKey | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const exportedAtLabel = useMemo(
    () => pending ? formatExportedAt(pending.exportedAt, pending.settings.locale) : '',
    [pending]
  )

  const exportSettings = (): void => {
    const now = new Date()
    const contents = serializeSettingsBackup(
      settings,
      chrome.runtime.getManifest().version,
      now.toISOString()
    )
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `video-speed-shortcuts-settings-${now.toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const selectBackup = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setStatusKey(null)
    setDialogErrorKey(null)
    try {
      const contents = await file.text()
      setPending(parseSettingsBackup(contents))
    } catch (error) {
      setPending(null)
      setStatusKey(
        error instanceof SettingsBackupError
          ? ERROR_COPY[error.code]
          : 'backupReadFailed'
      )
    }
  }

  const confirmImport = async (): Promise<void> => {
    if (!pending || isImporting) return
    setIsImporting(true)
    setDialogErrorKey(null)
    try {
      await onImport(pending.settings)
      setPending(null)
      setStatusKey('backupImportSuccess')
    } catch {
      setDialogErrorKey('backupSaveFailed')
    } finally {
      setIsImporting(false)
    }
  }

  const closePreview = (): void => {
    if (isImporting) return
    setPending(null)
    setDialogErrorKey(null)
  }

  return (
    <>
      <Card className="bg-card/85 backdrop-blur-xl">
        <CardHeader className="p-4 pb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <DatabaseBackup aria-hidden="true" className="size-4 text-primary" />
            {t('backupRestore')}
          </h2>
          <CardDescription>{t('backupRestoreDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Button variant="outline" onClick={exportSettings}>
            <Download aria-hidden="true" className="size-4" />
            {t('exportSettings')}
          </Button>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden="true" className="size-4" />
            {t('importSettings')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={t('importSettings')}
            onChange={event => void selectBackup(event)}
          />
          {statusKey ? (
            <p
              className={`text-xs sm:col-span-2 lg:col-span-1 xl:col-span-2 ${
                statusKey === 'backupImportSuccess' ? 'text-muted-foreground' : 'text-destructive'
              }`}
              aria-live="polite"
            >
              {t(statusKey)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(pending)} onOpenChange={open => { if (!open) closePreview() }}>
        <DialogContent showCloseButton={!isImporting}>
          <DialogHeader>
            <DialogTitle>{t('importPreviewTitle')}</DialogTitle>
            <DialogDescription>{t('importPreviewDescription')}</DialogDescription>
          </DialogHeader>
          {pending ? (
            <dl className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">{t('backupExportedAt')}</dt>
                <dd className="mt-0.5 font-medium">{exportedAtLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('backupExtensionVersion')}</dt>
                <dd className="mt-0.5 font-medium">{pending.extensionVersion}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('backupEnabledState')}</dt>
                <dd className="mt-0.5 font-medium">{t(pending.settings.enabled ? 'active' : 'inactive')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('backupShortcuts')}</dt>
                <dd className="mt-0.5 font-medium">{t('backupShortcutsValue', {
                  total: SHORTCUT_ACTIONS.length,
                  enabled: SHORTCUT_ACTIONS.filter(action => pending.settings.shortcutEnabled[action]).length,
                })}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('backupSpeedRange')}</dt>
                <dd className="mt-0.5 font-medium">{pending.settings.minimumSpeed}×–{pending.settings.maximumSpeed}×</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('backupSiteRules')}</dt>
                <dd className="mt-0.5 font-medium">{t('backupSiteRulesValue', {
                  count: pending.settings.siteRules.length,
                })}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('language')}</dt>
                <dd className="mt-0.5 font-medium">{t(
                  pending.settings.locale === 'auto'
                    ? 'automaticBrowser'
                    : LOCALE_COPY[pending.settings.locale]
                )}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('theme')}</dt>
                <dd className="mt-0.5 font-medium">{t(
                  pending.settings.theme === 'system'
                    ? 'automaticSystem'
                    : THEME_COPY[pending.settings.theme]
                )}</dd>
              </div>
            </dl>
          ) : null}
          {dialogErrorKey ? (
            <p className="text-sm text-destructive" role="alert">{t(dialogErrorKey)}</p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={isImporting} onClick={closePreview}>
              {t('cancel')}
            </Button>
            <Button disabled={isImporting} onClick={() => void confirmImport()}>
              <Upload aria-hidden="true" className="size-4" />
              {t(isImporting ? 'importingSettings' : 'confirmImportSettings')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
