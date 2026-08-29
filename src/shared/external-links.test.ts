import { describe, expect, it } from 'vitest'
import { EXTERNAL_LINKS, getRatingUrl } from './external-links'

describe('external links', () => {
  it.each([
    ['Mozilla/5.0 Edg/140.0', EXTERNAL_LINKS.edgeAddons],
    ['Mozilla/5.0 Firefox/142.0', EXTERNAL_LINKS.firefoxAddons],
    ['Mozilla/5.0 Chrome/140.0', EXTERNAL_LINKS.chromeWebStore],
    ['Mozilla/5.0 Seamonkey/2.53 Firefox/128.0', EXTERNAL_LINKS.chromeWebStore],
  ])('chooses the matching rating page for %s', (userAgent, expected) => {
    expect(getRatingUrl(userAgent)).toBe(expected)
  })
})
