import { Gauge, Keyboard, Languages, Monitor, Moon, Settings2, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import { Switch } from '../components/ui/switch'
import { formatBinding } from '../shared/keys'
import type { TranslationKey } from '../shared/i18n'
import { useSettings } from '../shared/use-settings'
import { useLocalizedAppearance } from '../shared/use-localized-appearance'
import type { Locale, Theme } from '../shared/types'
import '../styles.css'

document.body.className = 'popup-page'
document.documentElement.classList.add('popup-page-root')

const SHORTCUT_COPY: Array<{ action: 'holdSpeed' | 'speedUp' | 'speedDown' | 'speedReset'; title: TranslationKey }> = [
  { action: 'holdSpeed', title: 'holdSpeedTitle' },
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
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          const nextValue = Number(draft)
          if (Number.isFinite(nextValue)) onCommit(nextValue)
          else setDraft(String(value))
        }}
        className="h-8 text-xs"
      />
    </div>
  )
}

const App = () => {
  const { settings, isLoading, updateSettings } = useSettings()

  const { t, localeOptions, themeOptions } = useLocalizedAppearance(
    settings.locale,
    settings.theme
  )

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
        <Button variant="ghost" size="icon" aria-label={t('openSettings')} onClick={() => void chrome.runtime.openOptionsPage()}>
          <Settings2 aria-hidden="true" className="size-4" />
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
                <p className="text-sm font-semibold">{t('quickControls')}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('popupHint')}</p>
              </div>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={checked => void updateSettings({ enabled: checked })} aria-label={t('enabled')} />
          </div>
          <Badge variant={settings.enabled ? 'success' : 'secondary'} className="mt-2.5 gap-1">
            <span className="size-1.5 rounded-full bg-current" />
            {settings.enabled ? t('active') : t('inactive')}
          </Badge>
        </CardContent>
      </Card>

      <Card className="mt-1.5 bg-card/85 shadow-lg backdrop-blur-xl">
        <CardHeader className="p-2.5 pb-1.5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Keyboard aria-hidden="true" className="size-3.5 text-primary" />
            {t('keyboardShortcuts')}
          </CardTitle>
          <CardDescription>{t('rangeSummary', { minimum: settings.minimumSpeed, maximum: settings.maximumSpeed, step: settings.speedStep })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 p-2.5 pt-0">
          {SHORTCUT_COPY.map(({ action, title }) => (
            <div key={action} className="flex items-center justify-between gap-2 rounded-md bg-muted/65 px-2 py-1">
              <span className="truncate text-xs text-muted-foreground">{t(title)}</span>
              <kbd className="shrink-0 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm">
                {formatBinding(settings.bindings[action])}
              </kbd>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-1.5 bg-card/85 shadow-lg backdrop-blur-xl">
        <CardHeader className="p-2.5 pb-1.5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings2 aria-hidden="true" className="size-3.5 text-primary" />
            {t('settings')}
          </CardTitle>
          <CardDescription>{t('optionsSaved')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 p-2.5 pt-0">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{t('speedRange')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <NumericSetting
                id="popup-minimum-speed"
                label={t('minimumSpeed')}
                value={settings.minimumSpeed}
                min={0.1}
                max={1}
                step={0.05}
                onCommit={value => void updateSettings({ minimumSpeed: value })}
              />
              <NumericSetting
                id="popup-maximum-speed"
                label={t('maximumSpeed')}
                value={settings.maximumSpeed}
                min={1}
                max={16}
                step={0.05}
                onCommit={value => void updateSettings({ maximumSpeed: value })}
              />
              <NumericSetting
                id="popup-speed-step"
                label={t('speedStep')}
                value={settings.speedStep}
                min={0.05}
                max={4}
                step={0.05}
                onCommit={value => void updateSettings({ speedStep: value })}
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
                min={0.1}
                max={16}
                step={0.05}
                onCommit={value => void updateSettings({ holdSpeed: value })}
              />
              <NumericSetting
                id="popup-hold-delay"
                label={t('holdDelay')}
                value={settings.holdDelayMs}
                min={100}
                max={1000}
                step={10}
                onCommit={value => void updateSettings({ holdDelayMs: value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-1.5 bg-card/85 shadow-lg backdrop-blur-xl">
        <CardContent className="space-y-2.5 p-2.5">
          <div className="flex items-center justify-between gap-2.5">
            <div>
              <p className="text-xs font-medium">{t('indicator')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('indicatorDescription')}</p>
            </div>
            <Switch checked={settings.showIndicator} onCheckedChange={checked => void updateSettings({ showIndicator: checked })} aria-label={t('indicator')} />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Languages aria-hidden="true" className="size-3" />{t('language')}</div>
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
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                {settings.theme === 'dark' ? <Moon aria-hidden="true" className="size-3" /> : settings.theme === 'light' ? <Sun aria-hidden="true" className="size-3" /> : <Monitor aria-hidden="true" className="size-3" />}
                {t('theme')}
              </div>
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
