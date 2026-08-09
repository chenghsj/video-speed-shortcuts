import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  getSettings,
  settingsStore,
  updateSettings as persistSettings,
  type SettingsUpdater,
} from './settings'
import type { VideoSpeedSettings } from './types'

export const useSettings = () => {
  const [settings, setSettings] = useState<VideoSpeedSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const unsubscribe = settingsStore.subscribe(nextSettings => {
      if (active) setSettings(nextSettings)
    })

    void getSettings()
      .then(nextSettings => {
        if (active) setSettings(nextSettings)
      })
      .catch(() => {
        if (active) setSettings(DEFAULT_SETTINGS)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const updateSettings = useCallback(
    async (updater: SettingsUpdater): Promise<void> => {
      await persistSettings(updater)
    },
    []
  )

  return { settings, isLoading, updateSettings }
}
