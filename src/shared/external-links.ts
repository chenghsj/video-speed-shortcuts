export const EXTERNAL_LINKS = {
  githubRepository: 'https://github.com/chenghsj/video-speed-shortcuts',
  chromeWebStore:
    'https://chromewebstore.google.com/detail/video-speed-shortcuts/bpeaikhaccabhfijfgijmgbmjbbhipjg/reviews',
  edgeAddons:
    'https://microsoftedge.microsoft.com/addons/detail/video-speed-shortcuts/doffmlcohipbjamkfdeaamnlbfjcegob',
  firefoxAddons: 'https://addons.mozilla.org/firefox/addon/video-speed-shortcuts/reviews/',
} as const

export const getRatingUrl = (userAgent = globalThis.navigator?.userAgent ?? '') => {
  if (/\bEdg\/\d/i.test(userAgent)) return EXTERNAL_LINKS.edgeAddons

  if (/\bFirefox\/\d/i.test(userAgent) && !/\bSeamonkey\/\d/i.test(userAgent)) {
    return EXTERNAL_LINKS.firefoxAddons
  }

  return EXTERNAL_LINKS.chromeWebStore
}
