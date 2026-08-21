const RANGE_NAVIGATION_CODES = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
])

export const isTypingTarget = (event: KeyboardEvent): boolean => {
  const target = event.composedPath()[0]
  return (
    (target instanceof HTMLInputElement &&
      (target.type !== 'range' || RANGE_NAVIGATION_CODES.has(event.code))) ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable === true)
  )
}
