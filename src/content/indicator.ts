const INDICATOR_ID = 'video-speed-shortcuts-indicator'
const PLAYBACK_HINT_ID = 'video-speed-shortcuts-playback-hint'
const PLAYBACK_HINT_ENTER_TRANSITION =
  'opacity 100ms ease, transform 100ms cubic-bezier(0.2, 0.8, 0.2, 1)'
const PLAYBACK_HINT_EXIT_TRANSITION = 'opacity 180ms ease-out, transform 180ms ease-out'
const PLAYBACK_HINT_TOTAL_DURATION_MS = 620
const PLAYBACK_HINT_EXIT_MS = 180
const HINT_VISIBLE_OPACITY = '0.82'
let hideTimer: number | null = null
let playbackHideTimer: number | null = null

type IndicatorOptions = {
  persist?: boolean
}

type IndicatorAnchor = {
  centerX: number
  centerY: number
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
  const visibleBottom = Math.max(0, Math.min(rect.bottom, viewportHeight))
  if (visibleBottom <= visibleTop) return null
  return {
    centerX: left + (right - left) / 2,
    centerY: visibleTop + (visibleBottom - visibleTop) / 2,
    top: visibleTop + 16,
  }
}

const createPlaybackIcon = (
  targetDocument: Document,
  action: 'play' | 'pause'
): SVGSVGElement => {
  const svg = targetDocument.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '56')
  svg.setAttribute('height', '56')
  svg.setAttribute('fill', 'currentColor')
  svg.setAttribute('aria-hidden', 'true')
  svg.dataset.hintIcon = `playback-${action}`

  if (action === 'play') {
    const path = targetDocument.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('transform', 'translate(1.25 0)')
    path.setAttribute(
      'd',
      'M5.2 2.4C4.55 2.03 3.75 2.5 3.75 3.25v17.5c0 .75.8 1.22 1.45.85l15.5-8.75c.67-.38.67-1.34 0-1.72L5.2 2.4z'
    )
    svg.append(path)
    return svg
  }

  for (const x of [5, 14]) {
    const rect = targetDocument.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', String(x))
    rect.setAttribute('y', '3')
    rect.setAttribute('width', '5')
    rect.setAttribute('height', '18')
    rect.setAttribute('rx', '1.25')
    svg.append(rect)
  }
  return svg
}

export const showPlaybackHint = (
  action: 'play' | 'pause',
  targetDocument: Document = document,
  targetVideo: HTMLVideoElement | null = null
): void => {
  const root = targetDocument.documentElement
  if (!root) return

  let hint = targetDocument.getElementById(PLAYBACK_HINT_ID)
  if (!hint) {
    hint = targetDocument.createElement('div')
    hint.id = PLAYBACK_HINT_ID
    Object.assign(hint.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'flex',
      width: '92px',
      height: '92px',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.68)',
      color: 'white',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.22)',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'scale(0.88)',
      transition: PLAYBACK_HINT_ENTER_TRANSITION,
      willChange: 'opacity, transform',
    })
    root.append(hint)
  }

  hint.replaceChildren(createPlaybackIcon(targetDocument, action))
  const viewport = targetDocument.defaultView
  const anchor = targetVideo ? visibleVideoAnchor(targetVideo) : null
  const centerX = anchor?.centerX ?? (viewport?.innerWidth ?? 0) / 2
  const centerY = anchor?.centerY ?? (viewport?.innerHeight ?? 0) / 2
  hint.style.left = `${centerX - 46}px`
  hint.style.top = `${centerY - 46}px`
  hint.style.transition = PLAYBACK_HINT_ENTER_TRANSITION
  hint.style.opacity = '0'
  hint.style.transform = 'scale(0.88)'
  void hint.offsetWidth
  hint.style.opacity = HINT_VISIBLE_OPACITY
  hint.style.transform = 'scale(1)'

  if (playbackHideTimer !== null) window.clearTimeout(playbackHideTimer)
  playbackHideTimer = window.setTimeout(() => {
    if (hint) {
      hint.style.transition = PLAYBACK_HINT_EXIT_TRANSITION
      hint.style.opacity = '0'
      hint.style.transform = 'scale(0.96)'
    }
    playbackHideTimer = null
  }, PLAYBACK_HINT_TOTAL_DURATION_MS - PLAYBACK_HINT_EXIT_MS)
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
      background: 'rgba(0, 0, 0, 0.68)',
      color: 'white',
      font: '600 14px/1.2 -apple-system, BlinkMacSystemFont, sans-serif',
      letterSpacing: '0.01em',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
      pointerEvents: 'none',
      opacity: HINT_VISIBLE_OPACITY,
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
  indicator.style.opacity = HINT_VISIBLE_OPACITY
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
  if (playbackHideTimer !== null) window.clearTimeout(playbackHideTimer)
  playbackHideTimer = null
  const playbackHint = targetDocument.getElementById(PLAYBACK_HINT_ID)
  if (playbackHint) playbackHint.style.opacity = '0'
}
