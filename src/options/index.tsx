import { CircleHelp, Gauge, Keyboard, Palette, Pencil, RotateCcw } from 'lucide-react'
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { GitHubIcon } from '../components/github-icon'
import { KeyboardShortcut } from '../components/keyboard-shortcut'
import { ScrubbableLabel } from '../components/scrubbable-label'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import { Switch } from '../components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import type { TranslationKey } from '../shared/i18n'
import { SHORTCUT_ACTIONS, type Locale, type ShortcutAction, type Theme } from '../shared/types'
import { useLocalizedAppearance } from '../shared/use-localized-appearance'
import { SiteRulesTable } from './site-rules-table'
import { HOLD_FIELDS, NUMBER_FIELDS, TARGET_SPEED_FIELD } from './editor'
import { SettingsTransfer } from './settings-transfer'
import { useSettingsEditor } from './use-settings-editor'
import '../styles.css'

document.body.className = 'options-page'

const GITHUB_REPOSITORY_URL = 'https://github.com/chenghsj/video-speed-shortcuts'
type OptionsTab = 'general' | 'sites'

const getInitialTab = (): OptionsTab => window.location.hash === '#sites' ? 'sites' : 'general'

const ACTION_TITLE: Record<ShortcutAction, TranslationKey> = {
  holdSpeed: 'holdSpeedTitle',
  toggleTargetSpeed: 'toggleTargetSpeedTitle',
  speedUp: 'speedUpTitle',
  speedDown: 'speedDownTitle',
  speedReset: 'speedResetTitle',
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
  <div className="flex h-full flex-col justify-end gap-1.5">
    <Label htmlFor={id} className="flex w-full items-start justify-between gap-2 text-xs font-medium text-muted-foreground">
      <ScrubbableLabel
        value={Number(value)}
        min={min}
        max={max}
        step={step}
        onChange={nextValue => onChange(String(nextValue))}
        onCommit={nextValue => {
          onChange(String(nextValue))
          onBlur()
        }}
      >
        {label}
      </ScrubbableLabel>
      <span className="shrink-0 font-normal tabular-nums text-muted-foreground/80">
        {min}–{max}{suffix ? ` ${suffix}` : '×'}
      </span>
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
        onWheel={event => event.currentTarget.blur()}
        className={`h-10 text-base font-semibold tracking-tight shadow-none ${suffix ? 'pr-9' : 'pr-2.5'}`}
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
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="space-y-1.5">
    <p className="text-sm font-medium">{label}</p>
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
    siteRulesDraft,
    siteRulesError,
    draftNumbers,
    startRecording,
    setNumberDraft,
    commitNumber,
    setSiteRulesDraft,
    addSiteRules,
    toggleSiteRule,
    patchSiteRule,
    patchSiteRules,
    removeSiteRules,
    resetSection,
    patchSettings,
    replaceSettings,
  } = useSettingsEditor()
  const [activeTab, setActiveTab] = useState<OptionsTab>(getInitialTab)

  const selectTab = (tab: OptionsTab): void => {
    setActiveTab(tab)
    window.history.replaceState(
      null,
      '',
      tab === 'sites' ? '#sites' : `${window.location.pathname}${window.location.search}`
    )
  }

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

      <nav
        className="mt-5 inline-flex rounded-lg border bg-muted/50 p-1"
        role="tablist"
        aria-label={t('settingsSections')}
      >
        {(['general', 'sites'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => selectTab(tab)}
          >
            {t(tab === 'general' ? 'generalSettings' : 'sites')}
          </button>
        ))}
      </nav>

      <main className={`${activeTab === 'general' ? 'grid' : 'hidden'} mt-3 gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(18rem,3fr)] lg:items-start`}>
        <div className="grid min-w-0 content-start gap-3">
          <Card className="bg-card/85 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                  <Keyboard aria-hidden="true" className="size-4 text-primary" />
                  {t('shortcuts')}
                </h2>
                <RestoreButton label={t('reset')} onClick={() => resetSection('shortcuts')} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <TooltipProvider delayDuration={250}>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-4">{t('actions')}</TableHead>
                        <TableHead className="w-24 text-center">{t('shortcutEnabled')}</TableHead>
                        <TableHead className="w-40">{t('shortcutKey')}</TableHead>
                        <TableHead className="w-12"><span className="sr-only">{t('edit')}</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SHORTCUT_ACTIONS.map(action => {
                        const recording = recordingAction === action
                        return (
                          <TableRow key={action}>
                            <TableCell className="pl-4 font-medium">
                              <span>{t(ACTION_TITLE[action])}</span>
                              {action === 'toggleTargetSpeed' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="ml-1.5 inline-flex size-5 items-center justify-center rounded-sm align-middle text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      aria-label={t('targetSpeedDescription')}
                                    >
                                      <CircleHelp aria-hidden="true" className="size-3.5 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('targetSpeedDescription')}</TooltipContent>
                                </Tooltip>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={settings.shortcutEnabled[action]}
                                onCheckedChange={checked => patchSettings({
                                  shortcutEnabled: {
                                    ...settings.shortcutEnabled,
                                    [action]: checked,
                                  },
                                })}
                                aria-label={`${t('shortcutEnabled')}: ${t(ACTION_TITLE[action])}`}
                              />
                            </TableCell>
                            <TableCell>
                              {recording ? (
                                <span className="inline-flex h-6 items-center rounded-full bg-primary px-2 text-[11px] font-medium text-primary-foreground">
                                  {t('recording')}
                                </span>
                              ) : (
                                <KeyboardShortcut
                                  binding={settings.bindings[action]}
                                  keyClassName="h-6 min-w-6 px-2 text-xs"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 rounded-md text-muted-foreground"
                                disabled={recording}
                                onClick={() => startRecording(action)}
                                aria-label={`${t('recordShortcut')}: ${t(ACTION_TITLE[action])}`}
                                title={t('recordShortcut')}
                              >
                                <Pencil aria-hidden="true" className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>
              {shortcutConflict || recordingAction ? (
                <p className="mt-2 text-xs text-destructive" aria-live="polite">
                  {shortcutConflict
                    ? t('shortcutConflict', { action: t(ACTION_TITLE[shortcutConflict]) })
                    : t('recordingHint')}
                </p>
              ) : null}
            </CardContent>
          </Card>

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
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                  <NumericField
                    {...TARGET_SPEED_FIELD}
                    min={settings.minimumSpeed}
                    label={t(TARGET_SPEED_FIELD.label)}
                    value={draftNumbers.targetSpeed}
                    onChange={value => setNumberDraft('targetSpeed', value)}
                    onBlur={() => commitNumber('targetSpeed')}
                  />
                </div>
              </section>

              <Separator />

              <section aria-labelledby="hold-space-heading">
                <div>
                  <h3 id="hold-space-heading" className="text-sm font-semibold">{t('holdSpace')}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('holdSpaceDescription')}</p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              </section>
            </CardContent>
          </Card>

        </div>

        <aside className="grid min-w-0 content-start gap-3">
          <Card className="bg-card/85 backdrop-blur-xl">
            <CardContent className="flex items-center justify-between gap-4 p-3">
              <div>
                <p className="text-sm font-semibold">{t('enabled')}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('enabledDescription')}</p>
                <Badge variant={settings.enabled ? 'success' : 'secondary'} className="mt-2 gap-1 px-2 py-0.5">
                  <span className="size-1.5 rounded-full bg-current" />
                  {settings.enabled ? t('active') : t('inactive')}
                </Badge>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={checked => patchSettings({ enabled: checked })} aria-label={t('enabled')} />
            </CardContent>
          </Card>

          <Card className="bg-card/85 backdrop-blur-xl">
            <CardContent className="flex min-h-20 items-center justify-between gap-4 p-3">
              <div>
                <p className="text-sm font-semibold">{t('indicator')}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('indicatorDescription')}</p>
              </div>
              <Switch checked={settings.showIndicator} onCheckedChange={checked => patchSettings({ showIndicator: checked })} aria-label={t('indicator')} />
            </CardContent>
          </Card>

          <Card className="bg-card/85 backdrop-blur-xl">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    <Palette aria-hidden="true" className="size-4 text-primary" />
                    {t('appearance')}
                  </h2>
                  <CardDescription className="mt-1">{t('appearanceDescription')}</CardDescription>
                </div>
                <RestoreButton label={t('reset')} onClick={() => resetSection('appearance')} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-0">
              <AppearanceField label={t('language')}>
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
              <AppearanceField label={t('theme')}>
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
              </AppearanceField>
            </CardContent>
          </Card>

          <SettingsTransfer settings={settings} t={t} onImport={replaceSettings} />
        </aside>

      </main>

      <main className={activeTab === 'sites' ? 'mt-3' : 'hidden'}>
        <SiteRulesTable
          active={activeTab === 'sites'}
          entries={settings.siteRules}
          minimumSpeed={settings.minimumSpeed}
          globalTargetSpeed={settings.targetSpeed}
          draft={siteRulesDraft}
          error={siteRulesError}
          t={t}
          onDraftChange={setSiteRulesDraft}
          onAdd={addSiteRules}
          onToggle={toggleSiteRule}
          onPatch={patchSiteRule}
          onPatchMany={patchSiteRules}
          onRemove={removeSiteRules}
        />
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
