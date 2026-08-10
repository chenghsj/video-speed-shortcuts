import { describe, expect, it } from 'vitest'
import {
  addBlockedSite,
  getCurrentSiteHost,
  getSiteRuleHost,
  undoBlockedSite,
} from './current-site'

describe('current-site popup controls', () => {
  it('extracts registrable domains and keeps local network hosts intact', () => {
    expect(getCurrentSiteHost('https://www.youtube.com/watch?v=1')).toBe('www.youtube.com')
    expect(getCurrentSiteHost('https://news.bbc.co.uk/story')).toBe('news.bbc.co.uk')
    expect(getCurrentSiteHost('http://localhost:3000')).toBe('localhost')
    expect(getCurrentSiteHost('http://127.0.0.1:8080')).toBe('127.0.0.1')
  })

  it('rejects browser-internal and missing URLs', () => {
    expect(getCurrentSiteHost('chrome://settings')).toBeNull()
    expect(getCurrentSiteHost('about:blank')).toBeNull()
    expect(getCurrentSiteHost(undefined)).toBeNull()
  })

  it('uses the registrable domain as the rule target', () => {
    expect(getSiteRuleHost('www.youtube.com')).toBe('youtube.com')
    expect(getSiteRuleHost('news.bbc.co.uk')).toBe('bbc.co.uk')
    expect(getSiteRuleHost('project.github.io')).toBe('project.github.io')
  })

  it('targets the most specific enabling rule when disabling the current site', () => {
    const siteRules = [
      { host: 'example.com', enabled: true, targetSpeed: null, showIndicator: null },
      { host: 'video.example.com', enabled: false, targetSpeed: 1.5, showIndicator: false },
    ]

    const host = getSiteRuleHost('watch.video.example.com', siteRules)
    const result = addBlockedSite(siteRules, host)

    expect(host).toBe('video.example.com')
    expect(result.siteRules).toEqual([
      siteRules[0],
      { host: 'video.example.com', enabled: true, targetSpeed: 1.5, showIndicator: false },
    ])
    expect(result.undo).toEqual({ host: 'video.example.com', kind: 'reactivated' })
  })

  it('does not add a redundant rule when a parent domain already blocks the site', () => {
    const siteRules = [{ host: 'example.com', enabled: true, targetSpeed: null, showIndicator: null }]
    const result = addBlockedSite(siteRules, 'shop.example.com')

    expect(result).toEqual({ siteRules, undo: null })
  })

  it('adds and removes a new rule', () => {
    const result = addBlockedSite([], 'example.com')

    expect(result.siteRules).toEqual([
      { host: 'example.com', enabled: true, targetSpeed: null, showIndicator: null },
    ])
    expect(result.undo).toEqual({ host: 'example.com', kind: 'added' })
    expect(undoBlockedSite(result.siteRules, result.undo!)).toEqual([])
  })

  it('reactivates a paused rule and restores it when undone', () => {
    const original = [{ host: 'example.com', enabled: false, targetSpeed: null, showIndicator: null }]
    const result = addBlockedSite(original, 'example.com')

    expect(result.siteRules).toEqual([
      { host: 'example.com', enabled: true, targetSpeed: null, showIndicator: null },
    ])
    expect(result.undo).toEqual({ host: 'example.com', kind: 'reactivated' })
    expect(undoBlockedSite(result.siteRules, result.undo!)).toEqual(original)
  })
})
