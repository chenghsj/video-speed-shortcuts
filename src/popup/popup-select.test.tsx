/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { PopupSelect } from './popup-select'

describe('PopupSelect', () => {
  let root: Root | undefined

  beforeAll(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    act(() => root?.unmount())
    document.body.replaceChildren()
  })

  it('stays open when the toolbar popup receives a transient window blur', () => {
    const container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <PopupSelect
          ariaLabel="Language"
          value="auto"
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'en', label: 'English' },
          ]}
          onValueChange={vi.fn()}
        />
      )
    })

    const trigger = container.querySelector<HTMLButtonElement>('button')
    expect(trigger).not.toBeNull()

    act(() => trigger?.click())
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()

    act(() => window.dispatchEvent(new Event('blur')))
    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()
  })

  it('supports keyboard selection and closes after choosing a value', () => {
    const container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const onValueChange = vi.fn()

    act(() => {
      root?.render(
        <PopupSelect
          ariaLabel="Theme"
          value="system"
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'dark', label: 'Dark' },
          ]}
          onValueChange={onValueChange}
        />
      )
    })

    const trigger = container.querySelector<HTMLButtonElement>('button')
    act(() => trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    act(() => trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
    act(() => trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))

    expect(onValueChange).toHaveBeenCalledWith('dark')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
})
