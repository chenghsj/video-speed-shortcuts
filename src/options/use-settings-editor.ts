import { useCallback, useEffect, useRef, useState } from 'react'
import { isModifierOnly } from '../shared/keys'
import { useSettings } from '../shared/use-settings'
import type { ShortcutAction, VideoSpeedSettings } from '../shared/types'
import {
  bindingFromKeyboardEvent,
  createEditorState,
  reduceEditor,
  type EditorEvent,
  type EditorSection,
  type EditorState,
  type NumberFieldId,
} from './editor'

export const useSettingsEditor = () => {
  const { settings: storedSettings, isLoading, updateSettings } = useSettings()
  const [editor, setEditor] = useState<EditorState>(() => createEditorState())
  const editorRef = useRef(editor)
  const dispatchRef = useRef<((event: EditorEvent) => void) | null>(null)

  const persist = useCallback(
    async (settings: EditorState['settings']): Promise<void> => {
      try {
        await updateSettings(settings)
        dispatchRef.current?.({ type: 'save-succeeded' })
      } catch {
        dispatchRef.current?.({ type: 'save-failed' })
      }
    },
    [updateSettings]
  )

  const dispatch = useCallback(
    (event: EditorEvent): void => {
      const transition = reduceEditor(editorRef.current, event)
      editorRef.current = transition.state
      setEditor(transition.state)
      if (transition.effect?.type === 'save') void persist(transition.effect.settings)
    },
    [persist]
  )

  dispatchRef.current = dispatch

  useEffect(() => {
    dispatch({ type: 'settings-changed', settings: storedSettings })
  }, [dispatch, storedSettings])

  useEffect(() => {
    if (!editor.recordingAction) return

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        dispatch({ type: 'cancel-recording' })
        return
      }
      if (isModifierOnly(event)) return
      dispatch({ type: 'capture-binding', binding: bindingFromKeyboardEvent(event) })
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [dispatch, editor.recordingAction])

  return {
    settings: editor.settings,
    isLoading,
    recordingAction: editor.recordingAction,
    shortcutConflict: editor.shortcutConflict,
    statusKey: editor.statusKey,
    blacklistDraft: editor.blacklistDraft,
    blacklistError: editor.blacklistError,
    draftNumbers: editor.draftNumbers,
    startRecording: (action: ShortcutAction) => dispatch({ type: 'start-recording', action }),
    setNumberDraft: (id: NumberFieldId, value: string) =>
      dispatch({ type: 'set-number-draft', id, value }),
    commitNumber: (id: NumberFieldId) => dispatch({ type: 'commit-number', id }),
    setBlacklistDraft: (value: string) => dispatch({ type: 'set-blacklist-draft', value }),
    addBlacklist: () => dispatch({ type: 'add-blacklist' }),
    toggleBlacklist: (host: string, enabled: boolean) =>
      dispatch({ type: 'toggle-blacklist', host, enabled }),
    removeBlacklist: (host: string) => dispatch({ type: 'remove-blacklist', host }),
    resetSection: (section: EditorSection) => dispatch({ type: 'reset-section', section }),
    patchSettings: (changes: Partial<VideoSpeedSettings>) =>
      dispatch({ type: 'patch-settings', changes }),
  }
}
