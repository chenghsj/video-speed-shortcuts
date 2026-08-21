/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest'
import { isTypingTarget } from './typing-target'

const keyboardEventFrom = (target: EventTarget, code = ''): KeyboardEvent =>
  ({ code, composedPath: () => [target] }) as KeyboardEvent

describe('isTypingTarget', () => {
  it('allows shortcuts when a shadow-player timeline has focus', () => {
    const host = document.createElement('mux-player')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const timeline = document.createElement('input')
    timeline.type = 'range'
    timeline.setAttribute('aria-label', 'seek')
    shadowRoot.append(timeline)
    document.body.append(host)

    let typingTarget: boolean | undefined
    window.addEventListener('keydown', event => {
      typingTarget = isTypingTarget(event)
    }, { capture: true, once: true })
    timeline.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Space', bubbles: true, composed: true })
    )

    expect(typingTarget).toBe(false)
  })

  it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])(
    'protects the native %s interaction of a range input',
    code => {
      const range = document.createElement('input')
      range.type = 'range'

      expect(isTypingTarget(keyboardEventFrom(range, code))).toBe(true)
    }
  )

  it('continues to protect text entry controls', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editor = document.createElement('div')
    Object.defineProperty(editor, 'isContentEditable', { value: true })

    expect(isTypingTarget(keyboardEventFrom(input))).toBe(true)
    expect(isTypingTarget(keyboardEventFrom(textarea))).toBe(true)
    expect(isTypingTarget(keyboardEventFrom(select))).toBe(true)
    expect(isTypingTarget(keyboardEventFrom(editor))).toBe(true)
  })
})
