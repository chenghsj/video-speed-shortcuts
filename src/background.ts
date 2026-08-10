import { normalizeSettings, STORAGE_KEY } from './shared/settings'
import contentScriptFile from './content/index.ts?iife'

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

const injectContentScriptIntoOpenTabs = async (): Promise<void> => {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
  const injectableTabs = tabs.filter(
    (tab): tab is chrome.tabs.Tab & { id: number } =>
      tab.id !== undefined &&
      typeof tab.url === 'string' &&
      (tab.url.startsWith('http://') || tab.url.startsWith('https://'))
  )

  await Promise.allSettled(
    injectableTabs.map(tab =>
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: [contentScriptFile],
      })
    )
  )
}

void syncActionIcon().catch(() => undefined)

chrome.runtime.onInstalled.addListener(details => {
  void syncActionIcon().catch(() => undefined)
  if (details.reason === 'install') {
    void injectContentScriptIntoOpenTabs().catch(() => undefined)
  }
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
