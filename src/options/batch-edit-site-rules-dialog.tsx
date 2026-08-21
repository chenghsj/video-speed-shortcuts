import { useState } from 'react'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import type { TranslationKey } from '../shared/i18n'
import type { SiteRule } from '../shared/types'
import {
  createBatchSiteRuleChanges,
  createSiteRuleSettingsDraft,
  isSiteRuleSettingsDraftValid,
  SiteRuleSettingsEditor,
} from './site-rule-settings-editor'

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string
type SiteRuleChanges = Partial<Omit<SiteRule, 'host'>>

type BatchEditSiteRulesDialogProps = {
  entries: SiteRule[]
  minimumSpeed: number
  globalTargetSpeed: number
  t: Translate
  onClose: () => void
  onApply: (changes: SiteRuleChanges) => void
}

export const BatchEditSiteRulesDialog = ({
  entries,
  minimumSpeed,
  globalTargetSpeed,
  t,
  onClose,
  onApply,
}: BatchEditSiteRulesDialogProps) => {
  const initialEntry = entries[0]
  const [draft, setDraft] = useState(
    createSiteRuleSettingsDraft(initialEntry, globalTargetSpeed)
  )
  const isValid = isSiteRuleSettingsDraftValid(draft, minimumSpeed)

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <form
          className="grid gap-4"
          onSubmit={event => {
            event.preventDefault()
            if (!isValid) return
            onApply(createBatchSiteRuleChanges(draft))
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('editSelectedSites', { count: entries.length })}</DialogTitle>
            <DialogDescription>
              {t('batchEditSiteRulesDescription', { host: initialEntry.host })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>{t('siteDomains')}</Label>
            <div className="max-h-24 overflow-y-auto rounded-md border bg-muted/35 px-3 py-2 text-sm" role="list">
              {entries.map(entry => (
                <div key={entry.host} className="truncate" role="listitem" title={entry.host}>
                  {entry.host}
                </div>
              ))}
            </div>
          </div>

          <SiteRuleSettingsEditor
            idPrefix="batch-site"
            draft={draft}
            minimumSpeed={minimumSpeed}
            t={t}
            onChange={setDraft}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" disabled={!isValid}>
              {t('applyChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
