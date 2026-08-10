import type { SiteRule } from './types'

const HOSTNAME_PATTERN = /^[a-z0-9.-]+$/i
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/

const isIpv4 = (host: string): boolean => {
  if (!IPV4_PATTERN.test(host)) return false
  return host.split('.').every(part => Number(part) >= 0 && Number(part) <= 255)
}

const isIpv6 = (host: string): boolean => host.startsWith('[') && host.endsWith(']')

const isValidHostname = (host: string): boolean => {
  if (host === 'localhost' || isIpv4(host) || isIpv6(host)) return true
  if (!host.includes('.') || !HOSTNAME_PATTERN.test(host)) return false

  return host.split('.').every(label => {
    if (!label || label.length > 63 || label.startsWith('-') || label.endsWith('-')) return false
    return true
  })
}

export const normalizeHostname = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const input = value.trim()
  if (!input || input.includes('*')) return null

  let parsed: URL
  try {
    parsed = input.includes('://') ? new URL(input) : new URL(`https://${input}`)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (parsed.username || parsed.password) return null

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '')
  return isValidHostname(host) ? host : null
}

export const isSiteBlocked = (hostname: string, siteRules: SiteRule[]): boolean => {
  return getSiteRule(hostname, siteRules)?.enabled ?? false
}

export const getSiteRule = (
  hostname: string,
  rules: SiteRule[]
): SiteRule | null => {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return rules
    .filter(entry => host === entry.host || host.endsWith(`.${entry.host}`))
    .sort((left, right) => right.host.length - left.host.length)[0] ?? null
}

export const resolveSitePreferences = (
  hostname: string,
  rules: SiteRule[],
  defaults: { targetSpeed: number; showIndicator: boolean }
): { blocked: boolean; targetSpeed: number; showIndicator: boolean } => {
  const rule = getSiteRule(hostname, rules)
  return {
    blocked: rule?.enabled ?? false,
    targetSpeed: rule?.targetSpeed ?? defaults.targetSpeed,
    showIndicator: rule?.showIndicator ?? defaults.showIndicator,
  }
}
