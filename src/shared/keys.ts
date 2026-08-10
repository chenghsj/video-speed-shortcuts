import type { KeyBinding, ShortcutAction } from './types'

export const DEFAULT_BINDINGS: Record<ShortcutAction, KeyBinding> = {
  holdSpeed: { code: 'Space', key: ' ', ctrl: false, alt: false, shift: false, meta: false },
  speedUp: { code: 'Period', key: '>', ctrl: false, alt: false, shift: true, meta: false },
  speedDown: { code: 'Comma', key: '<', ctrl: false, alt: false, shift: true, meta: false },
  speedReset: { code: 'Slash', key: '/', ctrl: false, alt: false, shift: true, meta: false },
  toggleTargetSpeed: { code: 'Quote', key: '"', ctrl: false, alt: false, shift: true, meta: false },
}

type KeyEventLike = Pick<
  KeyboardEvent,
  'code' | 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
>

export const bindingFromEvent = (event: KeyEventLike): KeyBinding => ({
  code: event.code,
  key: event.key,
  ctrl: event.ctrlKey,
  alt: event.altKey,
  shift: event.shiftKey,
  meta: event.metaKey,
})

export const bindingsEqual = (left: KeyBinding, right: KeyBinding): boolean =>
  left.code === right.code &&
  left.ctrl === right.ctrl &&
  left.alt === right.alt &&
  left.shift === right.shift &&
  left.meta === right.meta

export const matchesBinding = (event: KeyEventLike, binding: KeyBinding): boolean =>
  bindingsEqual(bindingFromEvent(event), binding)

const KEY_LABELS: Record<string, string> = {
  Space: 'Space',
  Period: '.',
  Comma: ',',
  Slash: '/',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
}

const isDefaultBinding = (binding: KeyBinding): boolean =>
  Object.values(DEFAULT_BINDINGS).some(
    defaultBinding => bindingsEqual(binding, defaultBinding) && binding.key === defaultBinding.key
  )

export const formatBindingParts = (binding: KeyBinding): string[] =>
  [
    binding.ctrl ? 'Ctrl' : '',
    binding.alt ? '⌥' : '',
    binding.shift ? 'Shift' : '',
    binding.meta ? '⌘' : '',
    isDefaultBinding(binding)
      ? KEY_LABELS[binding.code] ?? binding.key.toUpperCase()
      : binding.key.length === 1 && binding.key !== ' '
        ? binding.key.toUpperCase()
        : KEY_LABELS[binding.code] ?? binding.key.toUpperCase(),
  ].filter(Boolean)

export const formatBinding = (binding: KeyBinding): string =>
  formatBindingParts(binding).join(' + ')

export const isModifierOnly = (event: KeyboardEvent): boolean =>
  ['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)
