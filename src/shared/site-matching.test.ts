import { describe, expect, it } from 'vitest'
import { getSiteRule, isSiteBlocked, normalizeHostname, resolveSitePreferences } from './site-matching'

describe('site matching', () => {
  it('normalizes domains and full URLs', () => {
    expect(normalizeHostname(' HTTPS://WWW.YouTube.com/watch?v=1 ')).toBe('www.youtube.com')
    expect(normalizeHostname('localhost:3000')).toBe('localhost')
    expect(normalizeHostname('127.0.0.1')).toBe('127.0.0.1')
  })

  it('rejects unsupported or overly broad hosts', () => {
    expect(normalizeHostname('*.example.com')).toBeNull()
    expect(normalizeHostname('com')).toBeNull()
    expect(normalizeHostname('chrome://settings')).toBeNull()
  })

  it('matches the host and its subdomains without matching similar names', () => {
    const siteRules = [{ host: 'youtube.com', enabled: true, targetSpeed: null, showIndicator: null }]

    expect(isSiteBlocked('youtube.com', siteRules)).toBe(true)
    expect(isSiteBlocked('music.youtube.com', siteRules)).toBe(true)
    expect(isSiteBlocked('notyoutube.com', siteRules)).toBe(false)
    expect(isSiteBlocked('youtube.com', [
      { host: 'youtube.com', enabled: false, targetSpeed: null, showIndicator: null },
    ])).toBe(false)
  })

  it('uses the most specific site rule for blocking and preferences', () => {
    const rules = [
      { host: 'example.com', enabled: true, targetSpeed: null, showIndicator: null },
      { host: 'video.example.com', enabled: false, targetSpeed: 1.5, showIndicator: false },
    ]

    expect(getSiteRule('watch.video.example.com', rules)?.host).toBe('video.example.com')
    expect(isSiteBlocked('watch.video.example.com', rules)).toBe(false)
    expect(resolveSitePreferences('watch.video.example.com', rules, {
      targetSpeed: 2,
      showIndicator: true,
    })).toEqual({ blocked: false, targetSpeed: 1.5, showIndicator: false })
  })
})
