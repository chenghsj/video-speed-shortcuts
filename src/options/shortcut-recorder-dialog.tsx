import { Play } from 'lucide-react'
import { useId, useRef } from 'react'
import { KeyboardShortcut } from '../components/keyboard-shortcut'
import { Alert, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Separator } from '../components/ui/separator'
import { bindingFromEvent, bindingsEqual, isModifierOnly } from '../shared/keys'
import type { TranslationKey } from '../shared/i18n'
import type { KeyBinding, ShortcutAction } from '../shared/types'

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string

type ShortcutRecorderDialogProps = {
  action: ShortcutAction | null
  actionTitle: string
  savedBinding: KeyBinding | null
  draft: KeyBinding | null
  conflictTitle: string | null
  saveFailed: boolean
  t: Translate
  onCapture: (binding: KeyBinding) => void
  onCancel: () => void
  onRestore: () => void
  onSave: () => void
}

export const ShortcutRecorderDialog = ({
  action,
  actionTitle,
  savedBinding,
  draft,
  conflictTitle,
  saveFailed,
  t,
  onCapture,
  onCancel,
  onRestore,
  onSave,
}: ShortcutRecorderDialogProps) => {
  const descriptionId = useId()
  const captureRef = useRef<HTMLDivElement>(null)
  const canRestore = Boolean(draft && savedBinding && !bindingsEqual(draft, savedBinding))
  const canSave = Boolean(draft && !conflictTitle)

  return (
    <Dialog
      open={Boolean(action)}
      onOpenChange={open => {
        if (!open) onCancel()
      }}
    >
      <DialogContent
        aria-describedby={descriptionId}
        className="rounded-xl border-0 bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 shadow-none duration-100 sm:max-w-sm"
        overlayClassName="isolate bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs"
        closeButtonClassName="top-2 right-2 inline-flex size-7 items-center justify-center rounded-md opacity-100 hover:bg-muted hover:text-foreground focus:ring-3 focus:ring-ring/50 focus:ring-offset-0"
        onOpenAutoFocus={event => {
          event.preventDefault()
          captureRef.current?.focus()
        }}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-base font-medium">{t('recordShortcutTitle')}</DialogTitle>
          <DialogDescription id={descriptionId}>
            {t('recordShortcutDescription', { action: actionTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div
            ref={captureRef}
            data-shortcut-recorder-capture
            role="textbox"
            tabIndex={0}
            aria-label={t('pressShortcut')}
            aria-describedby={descriptionId}
            aria-live="polite"
            className="flex min-h-20 items-center justify-center rounded-lg border border-dashed bg-muted/35 px-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onKeyDown={event => {
              if (event.key === 'Escape' || event.key === 'Tab') return
              event.preventDefault()
              event.stopPropagation()
              if (isModifierOnly(event.nativeEvent)) return
              onCapture(bindingFromEvent(event))
            }}
          >
            {draft ? (
              <KeyboardShortcut
                binding={draft}
                className="max-w-full justify-center gap-1"
                keyClassName="w-fit rounded-sm px-1 text-xs font-medium text-muted-foreground"
              />
            ) : (
              <span className="text-lg font-semibold">{t('pressShortcut')}</span>
            )}
          </div>

          {draft ? (
            <Alert variant={conflictTitle ? 'destructive' : 'default'}>
              <Play aria-hidden="true" />
              <AlertTitle>
                {conflictTitle ? t('shortcutConflict', { action: conflictTitle }) : t('shortcutNoConflict')}
              </AlertTitle>
            </Alert>
          ) : null}
          {saveFailed ? (
            <Alert variant="destructive">
              <AlertTitle>{t('saveFailed')}</AlertTitle>
            </Alert>
          ) : null}
        </div>

        <Separator />

        <DialogFooter className="-mx-4 -mb-4 rounded-b-xl border-t bg-muted/50 p-4 sm:justify-between">
          <Button
            variant="ghost"
            className="h-8 px-2.5 font-medium hover:bg-muted hover:text-foreground"
            onClick={() => {
              onRestore()
              captureRef.current?.focus()
            }}
            disabled={!canRestore}
            aria-label={`${t('restoreShortcutDraft')} ${actionTitle}`}
          >
            {t('restoreShortcutDraft')}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-8 border-border px-2.5 font-medium shadow-none hover:bg-muted hover:text-foreground"
              onClick={onCancel}
            >
              {t('cancel')}
            </Button>
            <Button className="h-8 px-2.5 font-medium shadow-none hover:bg-primary/80" onClick={onSave} disabled={!canSave}>
              {t('save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
