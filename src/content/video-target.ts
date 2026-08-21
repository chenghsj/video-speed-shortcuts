const visibleArea = (video: HTMLVideoElement): number => {
  const rect = video.getBoundingClientRect()
  const viewportWidth = video.ownerDocument.defaultView?.innerWidth ?? rect.right
  const viewportHeight = video.ownerDocument.defaultView?.innerHeight ?? rect.bottom
  const width = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0))
  const height = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
  return width * height
}

const scoreVideo = (video: HTMLVideoElement): number => {
  if (video.ownerDocument.pictureInPictureElement === video) return Number.MAX_SAFE_INTEGER

  const playing = !video.paused && !video.ended ? 1_000_000_000 : 0
  const hasFrame = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? 100_000_000 : 0
  return playing + hasFrame + visibleArea(video)
}

type ShadowRootCache = {
  roots: ShadowRoot[]
  refreshedAt: number
}

const SHADOW_ROOT_REFRESH_INTERVAL_MS = 500
const shadowRootsByDocument = new WeakMap<Document, ShadowRootCache>()

const discoverShadowRoots = (root: Document | ShadowRoot): ShadowRoot[] => {
  const shadowRoots: ShadowRoot[] = []

  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    if (!element.shadowRoot) continue
    shadowRoots.push(element.shadowRoot, ...discoverShadowRoots(element.shadowRoot))
  }

  return shadowRoots
}

const refreshShadowRootCache = (targetDocument: Document): ShadowRootCache => {
  const cache: ShadowRootCache = {
    roots: discoverShadowRoots(targetDocument),
    refreshedAt: Date.now(),
  }

  shadowRootsByDocument.set(targetDocument, cache)
  return cache
}

const findVideos = (targetDocument: Document, refreshShadowRoots: boolean): HTMLVideoElement[] => {
  let cache = shadowRootsByDocument.get(targetDocument)
  if (
    refreshShadowRoots ||
    !cache ||
    Date.now() - cache.refreshedAt >= SHADOW_ROOT_REFRESH_INTERVAL_MS ||
    cache.roots.some(root => !root.host.isConnected)
  ) {
    cache = refreshShadowRootCache(targetDocument)
  }

  const roots = cache.roots.filter(
    root => root.host.isConnected
  )
  return [targetDocument, ...roots].flatMap(root =>
    Array.from(root.querySelectorAll<HTMLVideoElement>('video'))
  )
}

export const findActiveVideo = (
  targetDocument: Document = document,
  refreshShadowRoots = true
): HTMLVideoElement | null =>
  findVideos(targetDocument, refreshShadowRoots).reduce<HTMLVideoElement | null>(
    (best, video) => (!best || scoreVideo(video) > scoreVideo(best) ? video : best),
    null
  )
