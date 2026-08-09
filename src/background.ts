import { normalizeSettings, STORAGE_KEY } from './shared/settings'

const ACTION_ICONS = {
  enabled: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
  },
  disabled: {
    16: 'icons/icon-disabled-16.png',
    32: 'icons/icon-disabled-32.png',
  },
} as const

const setActionIcon = (enabled: boolean): Promise<void> =>
  chrome.action.setIcon({ path: enabled ? ACTION_ICONS.enabled : ACTION_ICONS.disabled })

const syncActionIcon = async (): Promise<void> => {
  const stored = await chrome.storage.sync.get(STORAGE_KEY)
  await setActionIcon(normalizeSettings(stored[STORAGE_KEY]).enabled)
}

void syncActionIcon().catch(() => undefined)

chrome.runtime.onInstalled.addListener(() => {
  void syncActionIcon().catch(() => undefined)
})

chrome.runtime.onStartup.addListener(() => {
  void syncActionIcon().catch(() => undefined)
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes[STORAGE_KEY]) return
  void setActionIcon(normalizeSettings(changes[STORAGE_KEY].newValue).enabled).catch(() => undefined)
})

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage()
})
