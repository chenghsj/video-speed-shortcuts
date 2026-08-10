const CONTENT_SCRIPT_MARKER = '__videoSpeedShortcutsContentScriptInitialized__' as const

type ContentScriptScope = typeof globalThis & {
  [CONTENT_SCRIPT_MARKER]?: boolean
}

export const claimContentScriptInitialization = (scope: typeof globalThis): boolean => {
  const contentScriptScope = scope as ContentScriptScope
  if (contentScriptScope[CONTENT_SCRIPT_MARKER]) return false

  Object.defineProperty(contentScriptScope, CONTENT_SCRIPT_MARKER, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  })
  return true
}
