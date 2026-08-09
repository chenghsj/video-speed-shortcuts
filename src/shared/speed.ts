import type { VideoSpeedSettings } from './types'

export const resolveNextSpeed = (
  currentSpeed: number,
  direction: -1 | 1,
  settings: Pick<VideoSpeedSettings, 'minimumSpeed' | 'maximumSpeed' | 'speedStep'>
): number => {
  const safeCurrent = Number.isFinite(currentSpeed) && currentSpeed > 0 ? currentSpeed : 1
  const stepped = safeCurrent + direction * settings.speedStep
  const next =
    direction === -1 && safeCurrent > 1 && stepped < 1
      ? 1
      : direction === 1 && safeCurrent < 1 && stepped > 1
        ? 1
        : stepped

  return Number(
    Math.min(settings.maximumSpeed, Math.max(settings.minimumSpeed, next)).toFixed(2)
  )
}
