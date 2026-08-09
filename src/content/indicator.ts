const INDICATOR_ID = 'video-speed-shortcuts-indicator'
let hideTimer: number | null = null

type IndicatorOptions = {
  persist?: boolean
}

type IndicatorAnchor = {
  centerX: number
  top: number
}

const visibleVideoAnchor = (video: HTMLVideoElement): IndicatorAnchor | null => {
  const viewport = video.ownerDocument.defaultView
  const viewportWidth = viewport?.innerWidth ?? 0
  const viewportHeight = viewport?.innerHeight ?? 0
  if (viewportWidth <= 0 || viewportHeight <= 0) return null

  const rect = video.getBoundingClientRect()
  const left = Math.max(0, Math.min(rect.left, viewportWidth))
  const right = Math.max(0, Math.min(rect.right, viewportWidth))
  if (right <= left) return null

  const visibleTop = Math.max(0, Math.min(rect.top, viewportHeight))
  return {
    centerX: left + (right - left) / 2,
    top: visibleTop + 16,
  }
}

export const showIndicator = (
  label: string,
  targetDocument: Document = document,
  targetVideo: HTMLVideoElement | null = null,
  { persist = false }: IndicatorOptions = {}
): void => {
  const root = targetDocument.documentElement
  if (!root) return

  let indicator = targetDocument.getElementById(INDICATOR_ID)
  if (!indicator) {
    indicator = targetDocument.createElement('div')
    indicator.id = INDICATOR_ID
    Object.assign(indicator.style, {
      position: 'fixed',
      zIndex: '2147483647',
      padding: '6px 14px',
      borderRadius: '9999px',
      background: 'rgba(10, 12, 16, 0.68)',
      color: 'rgba(255, 255, 255, 0.98)',
      font: '600 14px/1.2 -apple-system, BlinkMacSystemFont, sans-serif',
      letterSpacing: '0.01em',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
      pointerEvents: 'none',
      opacity: '0.82',
      transition: 'opacity 160ms ease',
    })
    root.append(indicator)
  }

  indicator.textContent = label
  const viewport = targetDocument.defaultView
  const anchor = targetVideo ? visibleVideoAnchor(targetVideo) : null
  const centerX = anchor?.centerX ?? (viewport?.innerWidth ?? 0) / 2
  indicator.style.top = `${anchor?.top ?? 16}px`
  indicator.style.left = `${centerX - indicator.offsetWidth / 2}px`
  indicator.style.opacity = '0.82'
  if (hideTimer !== null) window.clearTimeout(hideTimer)
  hideTimer = null
  if (persist) return

  hideTimer = window.setTimeout(() => {
    if (indicator) indicator.style.opacity = '0'
    hideTimer = null
  }, 850)
}

export const hideIndicator = (targetDocument: Document = document): void => {
  if (hideTimer !== null) window.clearTimeout(hideTimer)
  hideTimer = null
  const indicator = targetDocument.getElementById(INDICATOR_ID)
  if (indicator) indicator.style.opacity = '0'
}
