import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import type { TranslationKey } from '../shared/i18n'
import { NUMERIC_SETTING_CONSTRAINTS } from '../shared/numeric-settings'
import type { SiteRule } from '../shared/types'

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string

export type SiteRuleSettingsDraft = {
  shortcutsEnabled: boolean
  speedMode: 'inherit' | 'custom'
  targetSpeed: string
  indicator: 'inherit' | 'show' | 'hide'
}

export const createSiteRuleSettingsDraft = (
  rule: Pick<SiteRule, 'enabled' | 'targetSpeed' | 'showIndicator'>,
  globalTargetSpeed: number
): SiteRuleSettingsDraft => ({
  shortcutsEnabled: !rule.enabled,
  speedMode: rule.targetSpeed == null ? 'inherit' : 'custom',
  targetSpeed: String(rule.targetSpeed ?? globalTargetSpeed),
  indicator: rule.showIndicator == null ? 'inherit' : rule.showIndicator ? 'show' : 'hide',
})

export const requiresCustomTargetSpeed = (draft: SiteRuleSettingsDraft): boolean =>
  draft.shortcutsEnabled && draft.speedMode === 'custom'

export const isSiteRuleSettingsDraftValid = (
  draft: SiteRuleSettingsDraft,
  minimumSpeed: number
): boolean => {
  if (!requiresCustomTargetSpeed(draft)) return true
  const targetSpeed = Number(draft.targetSpeed)
  return Number.isFinite(targetSpeed)
    && targetSpeed >= minimumSpeed
    && targetSpeed <= NUMERIC_SETTING_CONSTRAINTS.targetSpeed.max
}

const enabledRuleSettings = (
  draft: SiteRuleSettingsDraft
): Pick<SiteRule, 'targetSpeed' | 'showIndicator'> => ({
  targetSpeed: draft.speedMode === 'inherit' ? null : Number(draft.targetSpeed),
  showIndicator: draft.indicator === 'inherit' ? null : draft.indicator === 'show',
})

export const createNewSiteRule = (draft: SiteRuleSettingsDraft): Omit<SiteRule, 'host'> => ({
  enabled: !draft.shortcutsEnabled,
  ...(draft.shortcutsEnabled
    ? enabledRuleSettings(draft)
    : { targetSpeed: null, showIndicator: null }),
})

export const createBatchSiteRuleChanges = (
  draft: SiteRuleSettingsDraft
): Partial<Omit<SiteRule, 'host'>> => ({
  enabled: !draft.shortcutsEnabled,
  ...(draft.shortcutsEnabled ? enabledRuleSettings(draft) : {}),
})

type SiteRuleSettingsEditorProps = {
  idPrefix: string
  draft: SiteRuleSettingsDraft
  minimumSpeed: number
  t: Translate
  onChange: (draft: SiteRuleSettingsDraft) => void
}

export const SiteRuleSettingsEditor = ({
  idPrefix,
  draft,
  minimumSpeed,
  t,
  onChange,
}: SiteRuleSettingsEditorProps) => {
  const targetSpeed = Number(draft.targetSpeed)
  const targetSpeedIsValid = Number.isFinite(targetSpeed)
    && targetSpeed >= minimumSpeed
    && targetSpeed <= NUMERIC_SETTING_CONSTRAINTS.targetSpeed.max
  const customTargetSpeedIsRequired = requiresCustomTargetSpeed(draft)
  const patchDraft = (changes: Partial<SiteRuleSettingsDraft>) => {
    onChange({ ...draft, ...changes })
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex min-h-10 items-center justify-between gap-4">
        <div>
          <Label htmlFor={`${idPrefix}-shortcuts`}>{t('siteShortcuts')}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('siteShortcutsDescription')}</p>
        </div>
        <Switch
          id={`${idPrefix}-shortcuts`}
          checked={draft.shortcutsEnabled}
          onCheckedChange={shortcutsEnabled => patchDraft({ shortcutsEnabled })}
        />
      </div>

      <div className={!draft.shortcutsEnabled ? 'opacity-45' : ''}>
        <Label htmlFor={`${idPrefix}-speed-mode`}>{t('targetSpeed')}</Label>
        <div className="mt-1.5 flex items-center gap-2">
          <Select
            disabled={!draft.shortcutsEnabled}
            value={draft.speedMode}
            onValueChange={speedMode => patchDraft({ speedMode: speedMode as 'inherit' | 'custom' })}
          >
            <SelectTrigger id={`${idPrefix}-speed-mode`} className="h-9 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">{t('followGeneralSettings')}</SelectItem>
              <SelectItem value="custom">{t('custom')}</SelectItem>
            </SelectContent>
          </Select>
          {draft.speedMode === 'custom' ? (
            <Input
              type="number"
              min={minimumSpeed}
              max={NUMERIC_SETTING_CONSTRAINTS.targetSpeed.max}
              step={NUMERIC_SETTING_CONSTRAINTS.targetSpeed.step}
              value={draft.targetSpeed}
              disabled={!draft.shortcutsEnabled}
              aria-label={t('targetSpeed')}
              aria-invalid={!targetSpeedIsValid}
              className="h-9 w-28"
              onChange={event => patchDraft({ targetSpeed: event.target.value })}
              onWheel={event => event.currentTarget.blur()}
            />
          ) : null}
        </div>
        {customTargetSpeedIsRequired && !targetSpeedIsValid ? (
          <p className="mt-1.5 text-xs text-destructive" role="alert">
            {t('siteTargetSpeedInvalid', {
              minimum: minimumSpeed,
              maximum: NUMERIC_SETTING_CONSTRAINTS.targetSpeed.max,
            })}
          </p>
        ) : null}
      </div>

      <div className={!draft.shortcutsEnabled ? 'opacity-45' : ''}>
        <Label htmlFor={`${idPrefix}-indicator`}>{t('indicator')}</Label>
        <Select
          disabled={!draft.shortcutsEnabled}
          value={draft.indicator}
          onValueChange={indicator => patchDraft({
            indicator: indicator as SiteRuleSettingsDraft['indicator'],
          })}
        >
          <SelectTrigger id={`${idPrefix}-indicator`} className="mt-1.5 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">{t('followGeneralSettings')}</SelectItem>
            <SelectItem value="show">{t('show')}</SelectItem>
            <SelectItem value="hide">{t('hide')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
