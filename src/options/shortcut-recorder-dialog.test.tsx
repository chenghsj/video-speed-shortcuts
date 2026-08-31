/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { TranslationKey } from '../shared/i18n'
import { ShortcutRecorderDialog } from './shortcut-recorder-dialog'
import { useSettingsEditor } from './use-settings-editor'

const t = (key: TranslationKey): string => key

const RecorderHarness = () => {
  const editor = useSettingsEditor()

  return (
    <>
      <button type="button" onClick={() => editor.startRecording('speedUp')}>
        Open recorder
      </button>
      <ShortcutRecorderDialog
        action={editor.recordingAction}
        actionTitle="Increase speed"
        savedBinding={editor.recordingAction ? editor.settings.bindings[editor.recordingAction] : null}
        draft={editor.recordingDraft}
        conflictTitle={editor.shortcutConflict}
        saveFailed={editor.recordingSaveFailed}
        t={t}
        onCapture={editor.captureRecording}
        onCancel={editor.cancelRecording}
        onRestore={editor.restoreRecording}
        onSave={editor.saveRecording}
      />
    </>
  )
}

describe('ShortcutRecorderDialog', () => {
  let root: Root | undefined
  let storageSet: ReturnType<typeof vi.fn>

  const openRecorder = async (): Promise<void> => {
    const container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => root?.render(<RecorderHarness />))
    await act(async () => container.querySelector<HTMLButtonElement>('button')?.click())
  }

  beforeAll(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    storageSet = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        storage: {
          sync: {
            get: vi.fn().mockResolvedValue({}),
            set: storageSet,
          },
          onChanged: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
          },
        },
      },
    })
  })

  afterEach(() => {
    act(() => root?.unmount())
    document.body.replaceChildren()
    storageSet.mockReset().mockResolvedValue(undefined)
  })

  it('leaves navigation and activation keys available to the recorder controls', async () => {
    await openRecorder()

    const save = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent === 'save'
    )
    expect(save).toBeDefined()
    for (const [key, code] of [
      ['Tab', 'Tab'],
      ['Enter', 'Enter'],
      [' ', 'Space'],
    ]) {
      const event = new KeyboardEvent('keydown', {
        key,
        code,
        bubbles: true,
        cancelable: true,
      })
      expect(save?.dispatchEvent(event)).toBe(true)
      expect(event.defaultPrevented).toBe(false)
    }
  })

  it('focuses the recording area and gives the dialog and recorder a valid description', async () => {
    await openRecorder()

    const capture = document.querySelector<HTMLElement>('[data-shortcut-recorder-capture]')
    const event = new KeyboardEvent('keydown', {
      key: 's',
      code: 'KeyS',
      bubbles: true,
      cancelable: true,
    })

    expect(capture).not.toBeNull()
    expect(capture).toHaveProperty('role', 'textbox')
    expect(capture?.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(capture?.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'recordShortcutDescription'
    )
    const dialog = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')
    expect(document.activeElement).toBe(capture)
    expect(dialog?.getAttribute('aria-describedby')).toBe(capture?.getAttribute('aria-describedby'))
    expect(document.getElementById(dialog?.getAttribute('aria-describedby') ?? '')).not.toBeNull()
    act(() => capture?.dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(capture?.querySelector('[data-slot="kbd"]')?.textContent).toBe('S')
  })

  it('keeps a captured draft open after storage fails so save can be retried', async () => {
    storageSet.mockRejectedValueOnce(new Error('sync unavailable')).mockResolvedValueOnce(undefined)
    await openRecorder()

    const capture = document.querySelector<HTMLElement>('[data-shortcut-recorder-capture]')
    act(() => {
      capture?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 's',
          code: 'KeyS',
          bubbles: true,
          cancelable: true,
        })
      )
    })
    const findSave = () =>
      [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        button => button.textContent === 'save'
      )

    await act(async () => findSave()?.click())

    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
    expect(capture?.querySelector('[data-slot="kbd"]')?.textContent).toBe('S')
    expect(
      [...document.querySelectorAll('[data-slot="dialog-content"] [role="alert"]')].some(alert =>
        alert.textContent?.includes('saveFailed')
      )
    ).toBe(true)

    await act(async () => findSave()?.click())

    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
  })

  it('does not capture letters while a recorder control has focus', async () => {
    await openRecorder()

    const capture = document.querySelector<HTMLElement>('[data-shortcut-recorder-capture]')
    act(() => {
      capture?.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        bubbles: true,
        cancelable: true,
      }))
    })

    const restore = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent === 'restoreShortcutDraft'
    )
    restore?.focus()
    expect(document.activeElement).toBe(restore)

    const event = new KeyboardEvent('keydown', {
      key: 'd',
      code: 'KeyD',
      bubbles: true,
      cancelable: true,
    })
    act(() => restore?.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(false)
    expect(capture?.querySelector('[data-slot="kbd"]')?.textContent).toBe('S')
  })

  it('records Space immediately after restoring from the footer', async () => {
    await openRecorder()

    const capture = document.querySelector<HTMLElement>('[data-shortcut-recorder-capture]')
    act(() => {
      capture?.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        bubbles: true,
        cancelable: true,
      }))
    })

    const restore = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent === 'restoreShortcutDraft'
    )
    act(() => {
      restore?.focus()
      restore?.click()
    })
    expect(document.activeElement).toBe(capture)

    act(() => {
      capture?.dispatchEvent(new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true,
      }))
    })

    expect(capture?.querySelector('[data-slot="kbd"]')?.textContent).toBe('Space')
  })

  it('does not capture modified activation keys while a footer button is focused', async () => {
    await openRecorder()

    const capture = document.querySelector<HTMLElement>('[data-shortcut-recorder-capture]')
    act(() => {
      capture?.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        bubbles: true,
        cancelable: true,
      }))
    })
    const restore = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent === 'restoreShortcutDraft'
    )
    restore?.focus()

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => restore?.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(false)
    expect(capture?.querySelector('[data-slot="kbd"]')?.textContent).toBe('S')
  })
})
