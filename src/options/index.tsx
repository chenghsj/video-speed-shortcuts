import { Gauge, Globe2, Keyboard, Languages, Monitor, Moon, RotateCcw, Sun, Timer, Trash2 } from 'lucide-react'
import { createRoot } from 'react-dom/client'
import { GitHubIcon } from '../components/github-icon'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import { Switch } from '../components/ui/switch'
import { formatBinding } from '../shared/keys'
import type { TranslationKey } from '../shared/i18n'
import { SHORTCUT_ACTIONS, type Locale, type ShortcutAction, type Theme } from '../shared/types'
import { useLocalizedAppearance } from '../shared/use-localized-appearance'
import { HOLD_FIELDS, NUMBER_FIELDS } from './editor'
import { useSettingsEditor } from './use-settings-editor'
import '../styles.css'

document.body.className = 'options-page'

const GITHUB_REPOSITORY_URL = 'https://github.com/chenghsj/video-speed-shortcuts'

const ACTION_COPY: Record<ShortcutAction, { title: TranslationKey; description: TranslationKey }> = {
  holdSpeed: { title: 'holdSpeedTitle', description: 'holdSpeedDescription' },
  speedUp: { title: 'speedUpTitle', description: 'speedUpDescription' },
  speedDown: { title: 'speedDownTitle', description: 'speedDownDescription' },
  speedReset: { title: 'speedResetTitle', description: 'speedResetDescription' },
}

const NumericField = ({
  id,
  label,
  min,
  max,
  step,
  suffix,
  value,
  onChange,
  onBlur,
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  suffix?: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
}) => (
  <div className="space-y-1 rounded-lg border bg-background/70 p-2.5 shadow-sm">
  <Label htmlFor={id} className="text-xs text-muted-foreground">
      {label}
    </Label>
    <div className="relative">
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
        className={`h-9 text-base font-semibold tracking-tight ${suffix ? 'pr-9' : 'pr-2.5'}`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  </div>
)

const AppearanceField = ({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) => (
  <div className="space-y-1.5">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
    {children}
  </div>
)

const RestoreButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <Button
    variant="ghost"
    size="sm"
    className="h-8 shrink-0 px-2 text-muted-foreground hover:text-foreground"
    onClick={onClick}
  >
    <RotateCcw aria-hidden="true" className="size-3.5" />
    {label}
  </Button>
)

const App = () => {
  const {
    settings,
    isLoading,
    recordingAction,
    shortcutConflict,
    statusKey,
    blacklistDraft,
    blacklistError,
    draftNumbers,
    startRecording,
    setNumberDraft,
    commitNumber,
    setBlacklistDraft,
    addBlacklist,
    toggleBlacklist,
    removeBlacklist,
    resetSection,
    patchSettings,
  } = useSettingsEditor()

  const { t, localeOptions, themeOptions } = useLocalizedAppearance(
    settings.locale,
    settings.theme
  )

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">{t('loading')}</div>
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 md:px-5 md:py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/icons/icon-128.png" alt="" className="size-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t('appName')}</h1>
          </div>
        </div>
        <a
          href={GITHUB_REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="GitHub repository"
        >
          <GitHubIcon className="size-4" />
          GitHub
        </a>
      </header>

      <main className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(18rem,3fr)] lg:items-start">
        <div className="grid min-w-0 content-start gap-3">
          <Card className="bg-card/85 backdrop-blur-xl">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    <Gauge aria-hidden="true" className="size-4 text-primary" />
                    {t('quickControls')}
                  </h2>
                  <CardDescription className="mt-1">
                    {t('rangeSummary', { minimum: settings.minimumSpeed, maximum: settings.maximumSpeed, step: settings.speedStep })}
                  </CardDescription>
                </div>
                <RestoreButton label={t('reset')} onClick={() => resetSection('quickControls')} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <section aria-labelledby="speed-range-heading">
                <div>
                  <h3 id="speed-range-heading" className="text-sm font-semibold">{t('speedRange')}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('speedRangeDescription')}</p>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {NUMBER_FIELDS.map(field => (
                    <NumericField
                      key={field.id}
                      {...field}
                      label={t(field.label)}
                      value={draftNumbers[field.id]}
                      onChange={value => setNumberDraft(field.id, value)}
                      onBlur={() => commitNumber(field.id)}
                    />
                  ))}
                </div>
              </section>

              <Separator />

              <section aria-labelledby="hold-space-heading">
                <div>
                  <h3 id="hold-space-heading" className="flex items-center gap-1.5 text-sm font-semibold">
                    <Timer aria-hidden="true" className="size-3.5 text-primary" />
                    {t('holdSpace')}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('holdSpaceDescription')}</p>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {HOLD_FIELDS.map(field => (
                    <NumericField
                      key={field.id}
                      {...field}
                      label={t(field.label)}
                      value={draftNumbers[field.id]}
                      onChange={value => setNumberDraft(field.id, value)}
                      onBlur={() => commitNumber(field.id)}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3">
                  <div>
                    <p className="text-sm font-medium">{t('indicator')}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t('indicatorDescription')}</p>
                  </div>
                  <Switch checked={settings.showIndicator} onCheckedChange={checked => patchSettings({ showIndicator: checked })} aria-label={t('indicator')} />
                </div>
              </section>
            </CardContent>
          </Card>

          <Card className="bg-card/85 backdrop-blur-xl">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    <Keyboard aria-hidden="true" className="size-4 text-primary" />
                    {t('shortcuts')}
                  </h2>
                  <CardDescription className="mt-1">{t('shortcutsDescription')}</CardDescription>
                </div>
                <RestoreButton label={t('reset')} onClick={() => resetSection('shortcuts')} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-hidden rounded-lg border">
                {SHORTCUT_ACTIONS.map(action => {
                  const copy = ACTION_COPY[action]
                  const recording = recordingAction === action
                  return (
                    <div key={action} className="flex flex-col gap-2 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="mt-0.5 rounded-[5px] bg-muted p-1 text-muted-foreground">
                          <Keyboard aria-hidden="true" className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{t(copy.title)}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t(copy.description)}</p>
                        </div>
                      </div>
                      <Button
                        variant={recording ? 'default' : 'outline'}
                        size="sm"
                        className="min-w-32 justify-center font-mono"
                        onClick={() => startRecording(action)}
                      >
                        {recording ? t('recording') : formatBinding(settings.bindings[action])}
                      </Button>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 min-h-4 text-xs text-destructive" aria-live="polite">
                {shortcutConflict
                  ? t('shortcutConflict', { action: t(ACTION_COPY[shortcutConflict].title) })
                  : recordingAction
                    ? t('recordingHint')
                    : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="grid min-w-0 content-start gap-3">
          <Card className="bg-card/85 backdrop-blur-xl">
            <CardContent className="flex items-center justify-between gap-4 p-3">
              <div>
                <p className="text-sm font-semibold">{t('enabled')}</p>
                <Badge variant={settings.enabled ? 'success' : 'secondary'} className="mt-1 gap-1 px-2 py-0.5">
                  <span className="size-1.5 rounded-full bg-current" />
                  {settings.enabled ? t('active') : t('inactive')}
                </Badge>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={checked => patchSettings({ enabled: checked })} aria-label={t('enabled')} />
            </CardContent>
          </Card>

          <Card className="bg-card/85 backdrop-blur-xl">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    <Globe2 aria-hidden="true" className="size-4 text-primary" />
                    {t('blockedSites')}
                  </h2>
                  <CardDescription className="mt-1">{t('blockedSitesDescription')}</CardDescription>
                </div>
                <RestoreButton label={t('reset')} onClick={() => resetSection('blockedSites')} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <form
                className="grid gap-2"
                onSubmit={event => {
                  event.preventDefault()
                  addBlacklist()
                }}
              >
                <Label htmlFor="blacklist-site" className="sr-only">
                  {t('blockedSites')}
                </Label>
                <Input
                  id="blacklist-site"
                  value={blacklistDraft}
                  onChange={event => setBlacklistDraft(event.target.value)}
                  placeholder={t('blockedSitePlaceholder')}
                  aria-invalid={Boolean(blacklistError)}
                  className="h-9"
                />
                <Button type="submit" size="sm" className="w-full">
                  {t('addBlockedSite')}
                </Button>
              </form>
              <p className="mt-1 min-h-4 text-xs text-destructive" aria-live="polite">
                {blacklistError === 'invalid'
                  ? t('blockedSiteInvalid')
                  : blacklistError === 'duplicate'
                    ? t('blockedSiteDuplicate')
                    : ''}
              </p>

              <div className="overflow-hidden rounded-lg border">
                {settings.blacklist.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">{t('blockedSitesEmpty')}</p>
                ) : (
                  settings.blacklist.map(entry => (
                    <div key={entry.host} className="flex items-center justify-between gap-2 border-b p-2.5 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.host}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.enabled ? t('blockedSiteEnabled') : t('blockedSiteDisabled')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Switch
                          checked={entry.enabled}
                          onCheckedChange={enabled => toggleBlacklist(entry.host, enabled)}
                          aria-label={t(entry.enabled ? 'disableBlockedSite' : 'enableBlockedSite', { host: entry.host })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBlacklist(entry.host)}
                          aria-label={t('removeBlockedSite', { host: entry.host })}
                          title={t('removeBlockedSite', { host: entry.host })}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/85 backdrop-blur-xl">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    <Languages aria-hidden="true" className="size-4 text-primary" />
                    {t('appearance')}
                  </h2>
                  <CardDescription className="mt-1">{t('appearanceDescription')}</CardDescription>
                </div>
                <RestoreButton label={t('reset')} onClick={() => resetSection('appearance')} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-0">
              <AppearanceField label={t('language')} description={t('languageDescription')}>
                <Select value={settings.locale} onValueChange={value => patchSettings({ locale: value as Locale })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {localeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AppearanceField>
              <AppearanceField label={t('theme')} description={t('themeDescription')}>
                <div className="relative">
                  <Select value={settings.theme} onValueChange={value => patchSettings({ theme: value as Theme })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {themeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="pointer-events-none absolute right-9 top-1/2 hidden -translate-y-1/2 text-muted-foreground sm:block">
                    {settings.theme === 'dark' ? <Moon className="size-3.5" /> : settings.theme === 'light' ? <Sun className="size-3.5" /> : <Monitor className="size-3.5" />}
                  </div>
                </div>
              </AppearanceField>
            </CardContent>
          </Card>
        </aside>
      </main>

      {statusKey === 'saveFailed' && (
        <footer className="flex justify-end px-1 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2" aria-live="polite">
            {t(statusKey)}
          </span>
        </footer>
      )}
    </div>
  )
}

createRoot(document.querySelector('#app')!).render(<App />)
