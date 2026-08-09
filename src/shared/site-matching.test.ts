import { describe, expect, it } from 'vitest'
import { isSiteBlocked, normalizeHostname } from './site-matching'

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
    const blacklist = [{ host: 'youtube.com', enabled: true }]

    expect(isSiteBlocked('youtube.com', blacklist)).toBe(true)
    expect(isSiteBlocked('music.youtube.com', blacklist)).toBe(true)
    expect(isSiteBlocked('notyoutube.com', blacklist)).toBe(false)
    expect(isSiteBlocked('youtube.com', [{ host: 'youtube.com', enabled: false }])).toBe(false)
  })
})
