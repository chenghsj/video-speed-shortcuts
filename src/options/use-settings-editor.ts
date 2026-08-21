import { useCallback, useEffect, useRef, useState } from 'react'
import { isModifierOnly } from '../shared/keys'
import { useSettings } from '../shared/use-settings'
import type { SiteRule, ShortcutAction, VideoSpeedSettings } from '../shared/types'
import {
  bindingFromKeyboardEvent,
  createEditorState,
  reduceEditor,
  type EditorEvent,
  type EditorEffect,
  type EditorSection,
  type EditorState,
  type NumberFieldId,
  type NewSiteRule,
} from './editor'

export const useSettingsEditor = () => {
  const { settings: storedSettings, isLoading, updateSettings } = useSettings()
  const [editor, setEditor] = useState<EditorState>(() => createEditorState())
  const editorRef = useRef(editor)
  const dispatchRef = useRef<((event: EditorEvent) => void) | null>(null)

  const persist = useCallback(
    async (effect: EditorEffect): Promise<void> => {
      try {
        await updateSettings(effect.settings)
        dispatchRef.current?.({
          type: 'save-succeeded',
          siteRulesDraft: effect.siteRulesDraft,
        })
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
      if (transition.effect?.type === 'save') void persist(transition.effect)
    },
    [persist]
  )

  dispatchRef.current = dispatch

  const replaceSettings = useCallback(
    async (settings: VideoSpeedSettings): Promise<void> => {
      try {
        await updateSettings(settings)
        dispatchRef.current?.({ type: 'replace-settings-succeeded', settings })
      } catch (error) {
        dispatchRef.current?.({ type: 'save-failed' })
        throw error
      }
    },
    [updateSettings]
  )

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
    siteRulesDraft: editor.siteRulesDraft,
    siteRulesError: editor.siteRulesError,
    draftNumbers: editor.draftNumbers,
    startRecording: (action: ShortcutAction) => dispatch({ type: 'start-recording', action }),
    setNumberDraft: (id: NumberFieldId, value: string) =>
      dispatch({ type: 'set-number-draft', id, value }),
    commitNumber: (id: NumberFieldId) => dispatch({ type: 'commit-number', id }),
    setSiteRulesDraft: (value: string) => dispatch({ type: 'set-site-rules-draft', value }),
    addSiteRules: (rule?: NewSiteRule) => dispatch({ type: 'add-site-rules', rule }),
    toggleSiteRule: (host: string, enabled: boolean) =>
      dispatch({ type: 'toggle-site-rule', host, enabled }),
    patchSiteRule: (host: string, changes: Partial<Omit<SiteRule, 'host'>>) =>
      dispatch({ type: 'patch-site-rule', host, changes }),
    patchSiteRules: (hosts: string[], changes: Partial<Omit<SiteRule, 'host'>>) =>
      dispatch({ type: 'patch-site-rules', hosts, changes }),
    removeSiteRules: (hosts: string[]) => dispatch({ type: 'remove-site-rules', hosts }),
    resetSection: (section: EditorSection) => dispatch({ type: 'reset-section', section }),
    patchSettings: (changes: Partial<VideoSpeedSettings>) =>
      dispatch({ type: 'patch-settings', changes }),
    replaceSettings,
  }
}
