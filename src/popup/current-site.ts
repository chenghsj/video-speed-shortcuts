import { getDomain } from 'tldts'
import { getSiteRule, isSiteBlocked, normalizeHostname } from '../shared/site-matching'
import type { SiteRule } from '../shared/types'

export type BlockSiteUndo = {
  host: string
  kind: 'added' | 'reactivated'
}

export const getCurrentSiteHost = (url: string | undefined): string | null => {
  return normalizeHostname(url)
}

export const getSiteRuleHost = (
  hostname: string,
  siteRules: SiteRule[] = []
): string => {
  const matchingRule = getSiteRule(hostname, siteRules)
  if (matchingRule && !matchingRule.enabled) return matchingRule.host
  return getDomain(hostname, { allowPrivateDomains: true }) ?? hostname
}

export const addBlockedSite = (
  siteRules: SiteRule[],
  host: string
): { siteRules: SiteRule[]; undo: BlockSiteUndo | null } => {
  if (isSiteBlocked(host, siteRules)) return { siteRules, undo: null }

  const exactEntry = siteRules.find(entry => entry.host === host)
  if (exactEntry) {
    return {
      siteRules: siteRules.map(entry =>
        entry.host === host ? { ...entry, enabled: true } : entry
      ),
      undo: { host, kind: 'reactivated' },
    }
  }

  return {
    siteRules: [...siteRules, { host, enabled: true, targetSpeed: null, showIndicator: null }],
    undo: { host, kind: 'added' },
  }
}

export const undoBlockedSite = (
  siteRules: SiteRule[],
  undo: BlockSiteUndo
): SiteRule[] => {
  if (undo.kind === 'added') {
    return siteRules.filter(entry => entry.host !== undo.host)
  }

  return siteRules.map(entry =>
    entry.host === undo.host ? { ...entry, enabled: false } : entry
  )
}
