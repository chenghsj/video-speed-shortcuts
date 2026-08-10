import type { VideoSpeedSettings } from './types'

export type NumericSettingId = keyof Pick<
  VideoSpeedSettings,
  'minimumSpeed' | 'maximumSpeed' | 'speedStep' | 'targetSpeed' | 'holdSpeed' | 'holdDelayMs'
>

type NumericSettingConstraint = {
  min: number
  max: number
  step: number
}

export const NUMERIC_SETTING_CONSTRAINTS = {
  minimumSpeed: { min: 0.1, max: 1, step: 0.05 },
  maximumSpeed: { min: 1, max: 4, step: 0.05 },
  speedStep: { min: 0.05, max: 1, step: 0.05 },
  targetSpeed: { min: 0.1, max: 4, step: 0.05 },
  holdSpeed: { min: 0.1, max: 4, step: 0.05 },
  holdDelayMs: { min: 100, max: 1000, step: 10 },
} as const satisfies Record<NumericSettingId, NumericSettingConstraint>

export const resolveNumericDraft = (draft: string, currentValue: number): number => {
  if (!draft.trim()) return currentValue
  const value = Number(draft)
  return Number.isFinite(value) ? value : currentValue
}
