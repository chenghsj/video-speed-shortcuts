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
let indicatorPositionCleanup: (() => void) | null = null
let playbackPositionCleanup: (() => void) | null = null
let overlayRoot: HTMLDivElement | null = null
let overlayContainer: HTMLElement | null = null
let indicatorElement: HTMLDivElement | null = null
let playbackHintElement: HTMLDivElement | null = null

type IndicatorOptions = {
  persist?: boolean
}

type IndicatorAnchor = {
  centerX: number
  centerY: number
  top: number
}

type RectBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

type OverlayPlacement = {
  root: HTMLDivElement
  container: HTMLElement | null
}

type OverlayMount = {
  parent: HTMLElement | ShadowRoot
  container: HTMLElement | null
}

type ClippingBounds = RectBounds & {
  clipsHorizontally: boolean
  clipsVertically: boolean
}

const CLIPPING_OVERFLOW_VALUES = new Set(['auto', 'clip', 'hidden', 'scroll'])

const composedParentElement = (element: Element): HTMLElement | null => {
  if (element.assignedSlot) return element.assignedSlot
  if (element.parentElement instanceof HTMLElement) return element.parentElement

  const root = element.getRootNode()
  return root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null
}

const clippingAncestorBounds = (
  video: HTMLVideoElement
): ClippingBounds | null => {
  const viewport = video.ownerDocument.defaultView
  if (!viewport) return null

  const bounds: ClippingBounds = {
    left: Number.NEGATIVE_INFINITY,
    right: Number.POSITIVE_INFINITY,
    top: Number.NEGATIVE_INFINITY,
    bottom: Number.POSITIVE_INFINITY,
    clipsHorizontally: false,
    clipsVertically: false,
  }

  for (
    let ancestor = composedParentElement(video);
    ancestor;
    ancestor = composedParentElement(ancestor)
  ) {
    const style = viewport.getComputedStyle(ancestor)
    const clipsBoth = CLIPPING_OVERFLOW_VALUES.has(style.overflow)
    const clipsHorizontally = clipsBoth || CLIPPING_OVERFLOW_VALUES.has(style.overflowX)
    const clipsVertically = clipsBoth || CLIPPING_OVERFLOW_VALUES.has(style.overflowY)
    if (clipsHorizontally || clipsVertically) {
      const rect = ancestor.getBoundingClientRect()
      if (clipsHorizontally && rect.width > 0) {
        bounds.clipsHorizontally = true
        bounds.left = Math.max(bounds.left, rect.left)
        bounds.right = Math.min(bounds.right, rect.right)
      }
      if (clipsVertically && rect.height > 0) {
        bounds.clipsVertically = true
        bounds.top = Math.max(bounds.top, rect.top)
        bounds.bottom = Math.min(bounds.bottom, rect.bottom)
      }
      if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) return null
    }

    if (ancestor.matches(':fullscreen')) break
  }
  return bounds
}

const videoAnchor = (video: HTMLVideoElement): IndicatorAnchor | null => {
  const videoRect = video.getBoundingClientRect()
  const clippingBounds = clippingAncestorBounds(video)
  if (!clippingBounds) return null

  const horizontalIntersection = {
    left: Math.max(videoRect.left, clippingBounds.left),
    right: Math.min(videoRect.right, clippingBounds.right),
  }
  const verticalIntersection = {
    top: Math.max(videoRect.top, clippingBounds.top),
    bottom: Math.min(videoRect.bottom, clippingBounds.bottom),
  }
  const rect: RectBounds = {
    left:
      clippingBounds.clipsHorizontally && horizontalIntersection.right <= horizontalIntersection.left
        ? clippingBounds.left
        : horizontalIntersection.left,
    right:
      clippingBounds.clipsHorizontally && horizontalIntersection.right <= horizontalIntersection.left
        ? clippingBounds.right
        : horizontalIntersection.right,
    top:
      clippingBounds.clipsVertically && verticalIntersection.bottom <= verticalIntersection.top
        ? clippingBounds.top
        : verticalIntersection.top,
    bottom:
      clippingBounds.clipsVertically && verticalIntersection.bottom <= verticalIntersection.top
        ? clippingBounds.bottom
        : verticalIntersection.bottom,
  }
  if (rect.right <= rect.left || rect.bottom <= rect.top) return null
  return {
    centerX: rect.left + (rect.right - rect.left) / 2,
    centerY: rect.top + (rect.bottom - rect.top) / 2,
    top: rect.top + 16,
  }
}

const assignedSlotFor = (element: Element): HTMLSlotElement | null => {
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (current.assignedSlot) return current.assignedSlot
  }
  return null
}

const findOverlayMount = (video: HTMLVideoElement): OverlayMount | null => {
  const viewport = video.ownerDocument.defaultView
  if (!viewport) return null

  const assignedSlot = assignedSlotFor(video)
  const assignedRoot = assignedSlot?.getRootNode()
  if (assignedSlot && assignedRoot instanceof ShadowRoot) {
    for (
      let ancestor = assignedSlot.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const rect = ancestor.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) continue
      if (viewport.getComputedStyle(ancestor).position !== 'static') {
        return { parent: ancestor, container: ancestor }
      }
    }

    const host = assignedRoot.host instanceof HTMLElement ? assignedRoot.host : null
    const positionedHost =
      host && viewport.getComputedStyle(host).position !== 'static' ? host : null
    return { parent: assignedRoot, container: positionedHost }
  }

  const videoRoot = video.getRootNode()
  for (let ancestor = video.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const rect = ancestor.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    if (viewport.getComputedStyle(ancestor).position === 'static') continue
    if (ancestor.shadowRoot) {
      return { parent: ancestor.shadowRoot, container: ancestor }
    }
    return { parent: ancestor, container: ancestor }
  }

  if (videoRoot instanceof ShadowRoot) {
    const host = videoRoot.host instanceof HTMLElement ? videoRoot.host : null
    const positionedHost =
      host && viewport.getComputedStyle(host).position !== 'static' ? host : null
    return { parent: videoRoot, container: positionedHost }
  }
  return null
}

const ensureOverlayPlacement = (
  targetDocument: Document,
  targetVideo: HTMLVideoElement | null
): OverlayPlacement | null => {
  const mount = targetVideo ? findOverlayMount(targetVideo) : null
  const parent = mount?.parent ?? targetDocument.documentElement
  const container = mount?.container ?? null
  if (!parent) return null

  if (
    !overlayRoot?.isConnected ||
    overlayRoot.ownerDocument !== targetDocument ||
    overlayRoot.parentNode !== parent ||
    overlayContainer !== container
  ) {
    overlayRoot?.remove()
    indicatorElement = null
    playbackHintElement = null
    overlayRoot = targetDocument.createElement('div')
    overlayRoot.dataset.videoSpeedShortcutsOverlay = 'true'
    Object.assign(overlayRoot.style, {
      position: container ? 'absolute' : 'fixed',
      inset: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: container ? '60' : '2147483647',
    })
    parent.append(overlayRoot)
    overlayContainer = container
  }

  return { root: overlayRoot, container }
}

const overlayAnchor = (
  video: HTMLVideoElement,
  placement: OverlayPlacement
): IndicatorAnchor | null => {
  const anchor = videoAnchor(video)
  if (!anchor || !placement.container) return anchor

  const containerRect = placement.container.getBoundingClientRect()
  const rootRect = placement.root.getBoundingClientRect()
  const hasMeasuredRoot = rootRect.width > 0 && rootRect.height > 0
  const coordinateRect = hasMeasuredRoot ? rootRect : containerRect
  const layoutWidth = placement.root.offsetWidth || containerRect.width
  const layoutHeight = placement.root.offsetHeight || containerRect.height
  const scaleX = coordinateRect.width > 0 && layoutWidth > 0
    ? coordinateRect.width / layoutWidth
    : 1
  const scaleY = coordinateRect.height > 0 && layoutHeight > 0
    ? coordinateRect.height / layoutHeight
    : 1
  return {
    centerX: (anchor.centerX - coordinateRect.left) / scaleX,
    centerY: (anchor.centerY - coordinateRect.top) / scaleY,
    top: (anchor.top - coordinateRect.top) / scaleY,
  }
}

const clearPlaybackPositionTracking = (): void => {
  playbackPositionCleanup?.()
  playbackPositionCleanup = null
}

const clearIndicatorPositionTracking = (): void => {
  indicatorPositionCleanup?.()
  indicatorPositionCleanup = null
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
  if (playbackHideTimer !== null) window.clearTimeout(playbackHideTimer)
  playbackHideTimer = null
  clearPlaybackPositionTracking()

  const placement = ensureOverlayPlacement(targetDocument, targetVideo)
  if (!placement) return
  const viewport = targetDocument.defaultView
  const anchor = targetVideo ? overlayAnchor(targetVideo, placement) : null
  if (targetVideo && !anchor) {
    if (playbackHintElement?.ownerDocument === targetDocument) {
      playbackHintElement.style.opacity = '0'
    }
    return
  }

  if (
    !playbackHintElement?.isConnected ||
    playbackHintElement.ownerDocument !== targetDocument ||
    playbackHintElement.parentElement !== placement.root
  ) {
    playbackHintElement?.remove()
    playbackHintElement = targetDocument.createElement('div')
    playbackHintElement.id = PLAYBACK_HINT_ID
    Object.assign(playbackHintElement.style, {
      position: 'absolute',
      zIndex: '1',
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
    placement.root.append(playbackHintElement)
  }
  const hint = playbackHintElement

  hint.replaceChildren(createPlaybackIcon(targetDocument, action))
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

  if (targetVideo && viewport) {
    const updatePosition = (): void => {
      const nextAnchor = overlayAnchor(targetVideo, placement)
      if (!nextAnchor) {
        hint.style.opacity = '0'
        return
      }

      hint.style.left = `${nextAnchor.centerX - 46}px`
      hint.style.top = `${nextAnchor.centerY - 46}px`
      hint.style.transition = PLAYBACK_HINT_ENTER_TRANSITION
      hint.style.opacity = HINT_VISIBLE_OPACITY
      hint.style.transform = 'scale(1)'
    }

    viewport.addEventListener('scroll', updatePosition, true)
    viewport.addEventListener('resize', updatePosition)
    playbackPositionCleanup = () => {
      viewport.removeEventListener('scroll', updatePosition, true)
      viewport.removeEventListener('resize', updatePosition)
    }
  }

  playbackHideTimer = window.setTimeout(() => {
    clearPlaybackPositionTracking()
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
  if (hideTimer !== null) window.clearTimeout(hideTimer)
  hideTimer = null
  clearIndicatorPositionTracking()

  const placement = ensureOverlayPlacement(targetDocument, targetVideo)
  if (!placement) return
  const viewport = targetDocument.defaultView
  const anchor = targetVideo ? overlayAnchor(targetVideo, placement) : null
  if (targetVideo && !anchor) {
    if (indicatorElement?.ownerDocument === targetDocument) indicatorElement.style.opacity = '0'
    return
  }

  if (
    !indicatorElement?.isConnected ||
    indicatorElement.ownerDocument !== targetDocument ||
    indicatorElement.parentElement !== placement.root
  ) {
    indicatorElement?.remove()
    indicatorElement = targetDocument.createElement('div')
    indicatorElement.id = INDICATOR_ID
    Object.assign(indicatorElement.style, {
      position: 'absolute',
      zIndex: '1',
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
    placement.root.append(indicatorElement)
  }
  const indicator = indicatorElement

  indicator.textContent = label
  const centerX = anchor?.centerX ?? (viewport?.innerWidth ?? 0) / 2
  indicator.style.top = `${anchor?.top ?? 16}px`
  indicator.style.left = `${centerX - indicator.offsetWidth / 2}px`
  indicator.style.opacity = HINT_VISIBLE_OPACITY

  if (targetVideo && viewport) {
    const updatePosition = (): void => {
      const nextAnchor = overlayAnchor(targetVideo, placement)
      if (!nextAnchor) {
        indicator.style.opacity = '0'
        return
      }

      indicator.style.top = `${nextAnchor.top}px`
      indicator.style.left = `${nextAnchor.centerX - indicator.offsetWidth / 2}px`
      indicator.style.opacity = HINT_VISIBLE_OPACITY
    }

    viewport.addEventListener('scroll', updatePosition, true)
    viewport.addEventListener('resize', updatePosition)
    indicatorPositionCleanup = () => {
      viewport.removeEventListener('scroll', updatePosition, true)
      viewport.removeEventListener('resize', updatePosition)
    }
  }

  if (persist) return

  hideTimer = window.setTimeout(() => {
    clearIndicatorPositionTracking()
    if (indicator) indicator.style.opacity = '0'
    hideTimer = null
  }, 850)
}

export const hideIndicator = (targetDocument: Document = document): void => {
  if (hideTimer !== null) window.clearTimeout(hideTimer)
  hideTimer = null
  clearIndicatorPositionTracking()
  if (indicatorElement?.ownerDocument === targetDocument) indicatorElement.style.opacity = '0'
  if (playbackHideTimer !== null) window.clearTimeout(playbackHideTimer)
  playbackHideTimer = null
  clearPlaybackPositionTracking()
  if (playbackHintElement?.ownerDocument === targetDocument) playbackHintElement.style.opacity = '0'
}
