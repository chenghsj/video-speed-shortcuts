import { Check, CircleOff, Gauge, Keyboard, Loader2, Palette, RotateCcw, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KeyboardShortcut } from '../components/keyboard-shortcut'
import { ScrubbableLabel } from '../components/scrubbable-label'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import { Switch } from '../components/ui/switch'
import type { TranslationKey } from '../shared/i18n'
import { NUMERIC_SETTING_CONSTRAINTS, resolveNumericDraft } from '../shared/numeric-settings'
import { isSiteBlocked } from '../shared/site-matching'
import { useSettings } from '../shared/use-settings'
import { useLocalizedAppearance } from '../shared/use-localized-appearance'
import type { Locale, Theme } from '../shared/types'
import {
  addBlockedSite,
  getCurrentSiteHost,
  getSiteRuleHost,
  undoBlockedSite,
  type BlockSiteUndo,
} from './current-site'
import '../styles.css'

document.body.className = 'popup-page'
document.documentElement.classList.add('popup-page-root')

const SHORTCUT_COPY: Array<{ action: 'holdSpeed' | 'toggleTargetSpeed' | 'speedUp' | 'speedDown' | 'speedReset'; title: TranslationKey }> = [
  { action: 'holdSpeed', title: 'holdSpeedTitle' },
  { action: 'toggleTargetSpeed', title: 'toggleTargetSpeedTitle' },
  { action: 'speedUp', title: 'speedUpTitle' },
  { action: 'speedDown', title: 'speedDownTitle' },
  { action: 'speedReset', title: 'speedResetTitle' },
]

const NumericSetting = ({
  id,
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (value: number) => void
}) => {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground">
        <ScrubbableLabel
          value={resolveNumericDraft(draft, value)}
          min={min}
          max={max}
          step={step}
          onChange={nextValue => setDraft(String(nextValue))}
          onCommit={nextValue => {
            setDraft(String(nextValue))
            onCommit(nextValue)
          }}
        >
          {label}
        </ScrubbableLabel>
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onWheel={event => event.currentTarget.blur()}
        onBlur={() => {
          const nextValue = resolveNumericDraft(draft, value)
          if (!draft.trim() || !Number.isFinite(Number(draft))) setDraft(String(value))
          else onCommit(nextValue)
        }}
        className="h-8 text-xs"
      />
    </div>
  )
}

const App = () => {
  const { settings, isLoading, updateSettings } = useSettings()
  const [currentSiteHost, setCurrentSiteHost] = useState<string | null | undefined>()
  const [siteUndo, setSiteUndo] = useState<BlockSiteUndo | null>(null)
  const [isUpdatingSite, setIsUpdatingSite] = useState(false)
  const [siteUpdateFailed, setSiteUpdateFailed] = useState(false)

  const { t, localeOptions, themeOptions } = useLocalizedAppearance(
    settings.locale,
    settings.theme
  )

  useEffect(() => {
    let active = true

    void chrome.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (active) setCurrentSiteHost(getCurrentSiteHost(tab?.url))
      })
      .catch(() => {
        if (active) setCurrentSiteHost(null)
      })

    return () => {
      active = false
    }
  }, [])

  const currentSiteRuleHost = currentSiteHost
    ? getSiteRuleHost(currentSiteHost, settings.siteRules)
    : null
  const currentSiteIsBlocked = currentSiteHost
    ? isSiteBlocked(currentSiteHost, settings.siteRules)
    : false

  const handleBlockCurrentSite = async () => {
    if (!currentSiteRuleHost || currentSiteIsBlocked || isUpdatingSite) return

    const result = addBlockedSite(settings.siteRules, currentSiteRuleHost)
    if (!result.undo) return

    setIsUpdatingSite(true)
    setSiteUpdateFailed(false)
    try {
      await updateSettings(current => ({
        ...current,
        siteRules: addBlockedSite(current.siteRules, currentSiteRuleHost).siteRules,
      }))
      setSiteUndo(result.undo)
    } catch {
      setSiteUpdateFailed(true)
    } finally {
      setIsUpdatingSite(false)
    }
  }

  const handleUndoCurrentSite = async () => {
    if (!siteUndo || isUpdatingSite) return

    setIsUpdatingSite(true)
    setSiteUpdateFailed(false)
    try {
      await updateSettings(current => ({
        ...current,
        siteRules: undoBlockedSite(current.siteRules, siteUndo),
      }))
      setSiteUndo(null)
    } catch {
      setSiteUpdateFailed(true)
    } finally {
      setIsUpdatingSite(false)
    }
  }

  if (isLoading) {
    return <div className="grid min-h-[420px] place-items-center text-sm text-muted-foreground">{t('loading')}</div>
  }

  return (
    <div className="w-full p-2.5">
      <header className="flex items-center justify-between gap-2 px-1 pb-2">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-128.png" alt="" className="size-7" />
          <div>
            <p className="text-sm font-semibold tracking-tight">{t('appName')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="group size-11 rounded-[9px] hover:bg-transparent"
          aria-label={t('openSettings')}
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          <span className="grid size-9 place-items-center rounded-[10px] transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
            <Settings2 aria-hidden="true" className="size-4" />
          </span>
        </Button>
      </header>

      <Card className="overflow-hidden bg-card/85 shadow-lg backdrop-blur-xl">
        <CardContent className="p-2.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <div className="rounded-[7px] bg-primary/10 p-1.5 text-primary">
                <Gauge aria-hidden="true" className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t('speedShortcuts')}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('popupHint')}</p>
              </div>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={checked => void updateSettings({ enabled: checked })} aria-label={t('enabled')} />
          </div>
          <Badge variant={settings.enabled ? 'success' : 'secondary'} className="mt-2.5 gap-1">
            <span className="size-1.5 rounded-full bg-current" />
            {settings.enabled ? t('active') : t('inactive')}
          </Badge>
          <Separator className="my-2.5" />
          {siteUndo ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-2.5 py-2 text-primary" role="status">
              <div className="flex min-w-0 items-center gap-2">
                <Check aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate text-xs font-medium">
                  {t('disabledOnSiteSuccess', { host: siteUndo.host })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-primary hover:text-primary"
                disabled={isUpdatingSite}
                onClick={() => void handleUndoCurrentSite()}
              >
                {isUpdatingSite ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <RotateCcw aria-hidden="true" className="size-3.5" />}
                {t('undo')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              disabled={!currentSiteHost || currentSiteIsBlocked || isUpdatingSite}
              onClick={() => void handleBlockCurrentSite()}
            >
              {isUpdatingSite || currentSiteHost === undefined ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <CircleOff aria-hidden="true" className="size-4" />
              )}
              <span className="truncate">
                {currentSiteHost === undefined
                  ? t('checkingCurrentSite')
                  : currentSiteHost === null
                    ? t('currentSiteUnavailable')
                    : currentSiteIsBlocked
                      ? t('disabledOnThisSite')
                      : t('disableOnThisSite')}
              </span>
              {currentSiteRuleHost && <span className="ml-auto max-w-32 truncate text-[10px] font-normal text-muted-foreground">{currentSiteRuleHost}</span>}
            </Button>
          )}
          {!settings.enabled && currentSiteHost && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t('siteRulePending')}</p>
          )}
          {siteUpdateFailed && (
            <p className="mt-1.5 text-[11px] text-destructive" role="alert">{t('saveFailed')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-1.5 bg-card/85 shadow-lg backdrop-blur-xl">
        <CardHeader className="p-2.5 pb-1.5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Keyboard aria-hidden="true" className="size-3.5 text-primary" />
            {t('keyboardShortcuts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-0.5 p-2.5 pt-0">
          {SHORTCUT_COPY.map(({ action, title }) => (
            <div
              key={action}
              className={`flex items-center justify-between gap-2 rounded-md px-1 py-1 ${
                settings.shortcutEnabled[action] ? '' : 'opacity-45'
              }`}
            >
              <span className="truncate text-xs font-medium">{t(title)}</span>
              <KeyboardShortcut
                binding={settings.bindings[action]}
                className="shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-1.5 bg-card/85 shadow-lg backdrop-blur-xl">
        <CardHeader className="p-2.5 pb-1.5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings2 aria-hidden="true" className="size-3.5 text-primary" />
            {t('quickControls')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 p-2.5 pt-0">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{t('speedRange')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <NumericSetting
                id="popup-minimum-speed"
                label={t('minimumSpeed')}
                value={settings.minimumSpeed}
                {...NUMERIC_SETTING_CONSTRAINTS.minimumSpeed}
                onCommit={value => void updateSettings({ minimumSpeed: value })}
              />
              <NumericSetting
                id="popup-maximum-speed"
                label={t('maximumSpeed')}
                value={settings.maximumSpeed}
                {...NUMERIC_SETTING_CONSTRAINTS.maximumSpeed}
                onCommit={value => void updateSettings({ maximumSpeed: value })}
              />
              <NumericSetting
                id="popup-speed-step"
                label={t('speedStep')}
                value={settings.speedStep}
                {...NUMERIC_SETTING_CONSTRAINTS.speedStep}
                onCommit={value => void updateSettings({ speedStep: value })}
              />
              <NumericSetting
                id="popup-target-speed"
                label={t('targetSpeed')}
                value={settings.targetSpeed}
                min={settings.minimumSpeed}
                max={NUMERIC_SETTING_CONSTRAINTS.targetSpeed.max}
                step={NUMERIC_SETTING_CONSTRAINTS.targetSpeed.step}
                onCommit={value => void updateSettings({ targetSpeed: value })}
              />
            </div>
          </div>
          <Separator />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{t('holdSpace')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <NumericSetting
                id="popup-hold-speed"
                label={t('holdSpeed')}
                value={settings.holdSpeed}
                {...NUMERIC_SETTING_CONSTRAINTS.holdSpeed}
                onCommit={value => void updateSettings({ holdSpeed: value })}
              />
              <NumericSetting
                id="popup-hold-delay"
                label={t('holdDelay')}
                value={settings.holdDelayMs}
                {...NUMERIC_SETTING_CONSTRAINTS.holdDelayMs}
                onCommit={value => void updateSettings({ holdDelayMs: value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-1.5 bg-card/85 shadow-lg backdrop-blur-xl">
        <CardContent className="flex min-h-20 items-center justify-between gap-2.5 p-2.5">
          <div>
            <p className="text-xs font-semibold">{t('indicator')}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('indicatorDescription')}</p>
          </div>
          <Switch checked={settings.showIndicator} onCheckedChange={checked => void updateSettings({ showIndicator: checked })} aria-label={t('indicator')} />
        </CardContent>
      </Card>

      <Card className="mt-1.5 bg-card/85 shadow-lg backdrop-blur-xl">
        <CardHeader className="p-2.5 pb-1.5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette aria-hidden="true" className="size-3.5 text-primary" />
            {t('appearance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 p-2.5 pt-0">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">{t('language')}</div>
              <Select value={settings.locale} onValueChange={value => void updateSettings({ locale: value as Locale })}>
                <SelectTrigger className="h-8 text-xs">
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
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">{t('theme')}</div>
              <Select value={settings.theme} onValueChange={value => void updateSettings({ theme: value as Theme })}>
                <SelectTrigger className="h-8 text-xs">
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
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

createRoot(document.querySelector('#app')!).render(<App />)
