import { describe, expect, it } from 'vitest'
import type { SiteRule } from '../shared/types'
import {
  createBatchSiteRuleChanges,
  createNewSiteRule,
  requiresCustomTargetSpeed,
} from './site-rule-settings-editor'
import { getSelectedSiteRules } from './site-rules-table'

describe('site rule selection', () => {
  it('keeps selection order so the first selected rule provides batch edit defaults', () => {
    const entries: SiteRule[] = [
      { host: 'alpha.example', enabled: false, targetSpeed: null, showIndicator: null },
      { host: 'beta.example', enabled: true, targetSpeed: 1.5, showIndicator: false },
    ]

    expect(getSelectedSiteRules(entries, new Set(['beta.example', 'alpha.example'])))
      .toEqual([entries[1], entries[0]])
  })

  it('does not require a disabled custom-speed field', () => {
    expect(requiresCustomTargetSpeed({
      shortcutsEnabled: false,
      speedMode: 'custom',
      targetSpeed: '',
      indicator: 'show',
    })).toBe(false)
    expect(requiresCustomTargetSpeed({
      shortcutsEnabled: true,
      speedMode: 'custom',
      targetSpeed: '2',
      indicator: 'show',
    })).toBe(true)
    expect(createBatchSiteRuleChanges({
      shortcutsEnabled: false,
      speedMode: 'custom',
      targetSpeed: '',
      indicator: 'show',
    })).toEqual({
      enabled: true,
    })
  })

  it('creates a new rule from the shared settings draft', () => {
    expect(createNewSiteRule({
      shortcutsEnabled: true,
      speedMode: 'custom',
      targetSpeed: '2.5',
      indicator: 'hide',
    })).toEqual({
      enabled: false,
      targetSpeed: 2.5,
      showIndicator: false,
    })
  })
})
