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

export const findActiveVideo = (targetDocument: Document = document): HTMLVideoElement | null =>
  Array.from(targetDocument.querySelectorAll<HTMLVideoElement>('video')).reduce<
    HTMLVideoElement | null
  >((best, video) => (!best || scoreVideo(video) > scoreVideo(best) ? video : best), null)
