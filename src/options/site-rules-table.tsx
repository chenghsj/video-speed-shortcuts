import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Globe2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { Textarea } from '../components/ui/textarea'
import type { TranslationKey } from '../shared/i18n'
import type { SiteRule } from '../shared/types'
import type { EditorSiteRuleError, NewSiteRule } from './editor'

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string
type StatusFilter = 'all' | 'active' | 'disabled'
type SortKey = 'host' | 'status'
type SortDirection = 'asc' | 'desc'

type SiteRulesTableProps = {
  entries: SiteRule[]
  minimumSpeed: number
  maximumSpeed: number
  globalTargetSpeed: number
  draft: string
  error: EditorSiteRuleError | null
  t: Translate
  onDraftChange: (value: string) => void
  onAdd: (rule: NewSiteRule) => void
  onToggle: (host: string, enabled: boolean) => void
  onPatch: (host: string, changes: Partial<Omit<SiteRule, 'host'>>) => void
  onRemove: (hosts: string[]) => void
}

const RuleSpeedInput = ({
  entry,
  minimumSpeed,
  maximumSpeed,
  globalTargetSpeed,
  inheritLabel,
  label,
  disabled,
  onCommit,
}: {
  entry: SiteRule
  minimumSpeed: number
  maximumSpeed: number
  globalTargetSpeed: number
  inheritLabel: string
  label: string
  disabled?: boolean
  onCommit: (value: number | null) => void
}) => {
  const [draft, setDraft] = useState(entry.targetSpeed == null ? '' : String(entry.targetSpeed))

  useEffect(() => {
    setDraft(entry.targetSpeed == null ? '' : String(entry.targetSpeed))
  }, [entry.targetSpeed])

  return (
    <Input
      type="number"
      min={minimumSpeed}
      max={maximumSpeed}
      step={0.05}
      value={draft}
      placeholder={`${inheritLabel} · ${globalTargetSpeed}×`}
      title={entry.targetSpeed == null ? `${inheritLabel} · ${globalTargetSpeed}×` : undefined}
      aria-label={`${label}: ${entry.host}`}
      disabled={disabled}
      className="h-8 w-20 text-xs"
      onChange={event => setDraft(event.target.value)}
      onWheel={event => event.currentTarget.blur()}
      onBlur={() => {
        const trimmed = draft.trim()
        if (!trimmed) {
          onCommit(null)
          return
        }
        const value = Number(trimmed)
        if (Number.isFinite(value)) onCommit(value)
        else setDraft(entry.targetSpeed == null ? '' : String(entry.targetSpeed))
      }}
    />
  )
}

const RuleSpeedControl = ({
  entry,
  minimumSpeed,
  maximumSpeed,
  globalTargetSpeed,
  t,
  onPatch,
}: {
  entry: SiteRule
  minimumSpeed: number
  maximumSpeed: number
  globalTargetSpeed: number
  t: Translate
  onPatch: (changes: Partial<Omit<SiteRule, 'host'>>) => void
}) => (
  <div className={`flex items-center gap-1.5 ${entry.enabled ? 'opacity-45' : ''}`}>
    <Select
      disabled={entry.enabled}
      value={entry.targetSpeed == null ? 'inherit' : 'custom'}
      onValueChange={value => onPatch({
        targetSpeed: value === 'inherit' ? null : globalTargetSpeed,
      })}
    >
      <SelectTrigger className="h-8 w-40" aria-label={`${t('targetSpeed')}: ${entry.host}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="inherit">{t('followGeneralSettings')}</SelectItem>
        <SelectItem value="custom">{t('custom')}</SelectItem>
      </SelectContent>
    </Select>
    {entry.targetSpeed != null ? (
      <RuleSpeedInput
        entry={entry}
        minimumSpeed={minimumSpeed}
        maximumSpeed={maximumSpeed}
        globalTargetSpeed={globalTargetSpeed}
        inheritLabel={t('followGeneralSettings')}
        label={t('targetSpeed')}
        disabled={entry.enabled}
        onCommit={targetSpeed => onPatch({ targetSpeed })}
      />
    ) : null}
  </div>
)

const sortEntries = (
  entries: SiteRule[],
  key: SortKey,
  direction: SortDirection
): SiteRule[] => {
  const multiplier = direction === 'asc' ? 1 : -1
  return [...entries].sort((left, right) => {
    const comparison = key === 'host'
      ? left.host.localeCompare(right.host, undefined, { numeric: true, sensitivity: 'base' })
      : Number(left.enabled) - Number(right.enabled)
    return comparison * multiplier || left.host.localeCompare(right.host)
  })
}

const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
  if (!active) return <ChevronsUpDown aria-hidden="true" className="size-3.5" />
  return direction === 'asc'
    ? <ChevronUp aria-hidden="true" className="size-3.5" />
    : <ChevronDown aria-hidden="true" className="size-3.5" />
}

export const SiteRulesTable = ({
  entries,
  minimumSpeed,
  maximumSpeed,
  globalTargetSpeed,
  draft,
  error,
  t,
  onDraftChange,
  onAdd,
  onToggle,
  onPatch,
  onRemove,
}: SiteRulesTableProps) => {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('host')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isEditing, setIsEditing] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newShortcutsEnabled, setNewShortcutsEnabled] = useState(true)
  const [newSpeedMode, setNewSpeedMode] = useState<'inherit' | 'custom'>('inherit')
  const [newTargetSpeedDraft, setNewTargetSpeedDraft] = useState(String(globalTargetSpeed))
  const [newIndicator, setNewIndicator] = useState<'inherit' | 'show' | 'hide'>('inherit')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(() => new Set())
  const previousEntryCount = useRef(entries.length)

  useEffect(() => {
    setIsDeleteConfirming(false)
  }, [query, statusFilter])

  useEffect(() => {
    if (entries.length > previousEntryCount.current) {
      setIsAddOpen(false)
      setNewShortcutsEnabled(true)
      setNewSpeedMode('inherit')
      setNewTargetSpeedDraft(String(globalTargetSpeed))
      setNewIndicator('inherit')
    }
    previousEntryCount.current = entries.length
  }, [entries.length, globalTargetSpeed])

  useEffect(() => {
    const existingHosts = new Set(entries.map(entry => entry.host))
    setSelectedHosts(current => {
      const next = new Set([...current].filter(host => existingHosts.has(host)))
      return next.size === current.size ? current : next
    })
  }, [entries])

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const matchingEntries = entries.filter(entry => {
      const matchesName = !normalizedQuery || entry.host.toLocaleLowerCase().includes(normalizedQuery)
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && !entry.enabled)
        || (statusFilter === 'disabled' && entry.enabled)
      return matchesName && matchesStatus
    })
    return sortEntries(matchingEntries, sortKey, sortDirection)
  }, [entries, query, sortDirection, sortKey, statusFilter])

  const visibleHosts = filteredEntries.map(entry => entry.host)
  const selectedCount = selectedHosts.size
  const allVisibleSelected = visibleHosts.length > 0
    && visibleHosts.every(host => selectedHosts.has(host))
  const someVisibleSelected = visibleHosts.some(host => selectedHosts.has(host))
  const filtersActive = Boolean(query.trim()) || statusFilter !== 'all'

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  const ariaSort = (key: SortKey): 'ascending' | 'descending' | 'none' => {
    if (sortKey !== key) return 'none'
    return sortDirection === 'asc' ? 'ascending' : 'descending'
  }

  const exitEditing = () => {
    setIsEditing(false)
    setSelectedHosts(new Set())
    setIsDeleteConfirming(false)
  }

  const toggleHost = (host: string, checked: boolean) => {
    setSelectedHosts(current => {
      const next = new Set(current)
      if (checked) next.add(host)
      else next.delete(host)
      return next
    })
    setIsDeleteConfirming(false)
  }

  const toggleAllVisible = (checked: boolean) => {
    setSelectedHosts(current => {
      const next = new Set(current)
      for (const host of visibleHosts) {
        if (checked) next.add(host)
        else next.delete(host)
      }
      return next
    })
    setIsDeleteConfirming(false)
  }

  const closeAddDialog = () => {
    setIsAddOpen(false)
    onDraftChange('')
    setNewShortcutsEnabled(true)
    setNewSpeedMode('inherit')
    setNewTargetSpeedDraft(String(globalTargetSpeed))
    setNewIndicator('inherit')
  }

  const customTargetSpeed = Number(newTargetSpeedDraft)
  const customTargetSpeedIsValid = Number.isFinite(customTargetSpeed)
    && customTargetSpeed >= minimumSpeed
    && customTargetSpeed <= maximumSpeed
  const customTargetSpeedIsRequired = newShortcutsEnabled && newSpeedMode === 'custom'

  return (
    <>
      <Card className="bg-card/85 backdrop-blur-xl">
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Globe2 aria-hidden="true" className="size-4 text-primary" />
                {t('siteRules')}
              </h2>
              <CardDescription className="mt-1">{t('siteRulesDescription')}</CardDescription>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {!isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
                    <Plus aria-hidden="true" className="size-3.5" />
                    {t('add')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil aria-hidden="true" className="size-3.5" />
                    {t('edit')}
                  </Button>
                </>
              ) : isDeleteConfirming ? (
                <div
                  className="flex items-center gap-1"
                  role="group"
                  aria-label={t('deleteSelectedSites', { count: selectedCount })}
                >
                  <span className="mr-1 text-xs font-medium tabular-nums text-foreground">
                    {t('confirmDeleteSites', { count: selectedCount })}
                  </span>
                  <Button
                    autoFocus
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => setIsDeleteConfirming(false)}
                    aria-label={t('cancel')}
                    title={t('cancel')}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      onRemove([...selectedHosts])
                      setSelectedHosts(new Set())
                      setIsDeleteConfirming(false)
                    }}
                    aria-label={t('confirm')}
                    title={t('confirm')}
                  >
                    <Check aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>
                    <Plus aria-hidden="true" className="size-3.5" />
                    {t('add')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={selectedCount === 0}
                    onClick={() => setIsDeleteConfirming(true)}
                    aria-label={t('deleteSelectedSites', { count: selectedCount })}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    {t('delete')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={exitEditing}>
                    <Check aria-hidden="true" className="size-3.5" />
                    {t('done')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-4 pt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={t('filterSiteRules')}
                  aria-label={t('filterSiteRules')}
                  className="h-9 pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={value => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="h-9 w-full sm:w-44" aria-label={t('filterByStatus')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('blockedSiteDisabled')}</SelectItem>
                  <SelectItem value="disabled">{t('blockedSiteEnabled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs tabular-nums text-muted-foreground">
                {isEditing && selectedCount > 0
                  ? t('selectedSitesCount', { count: selectedCount })
                  : t('siteRulesCount', { shown: filteredEntries.length, total: entries.length })}
              </span>
              {filtersActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setStatusFilter('all')
                  }}
                >
                  <X aria-hidden="true" className="size-3.5" />
                  {t('clearFilters')}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[22rem] overflow-auto rounded-lg border [&_[data-slot=table-container]]:overflow-visible">
            <Table className="min-w-[52rem] table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
                <TableRow className="hover:bg-card">
                  {isEditing ? (
                    <TableHead
                      className="w-12 cursor-pointer p-0"
                      onClick={() => toggleAllVisible(!allVisibleSelected)}
                    >
                      <div className="flex size-11 items-center justify-center">
                        <Checkbox
                          checked={allVisibleSelected || (someVisibleSelected && 'indeterminate')}
                          onCheckedChange={checked => toggleAllVisible(checked === true)}
                          onClick={event => event.stopPropagation()}
                          aria-label={t('selectAllSites')}
                        />
                      </div>
                    </TableHead>
                  ) : null}
                  <TableHead className="w-auto pl-4" aria-sort={ariaSort('host')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 px-2"
                      onClick={() => changeSort('host')}
                    >
                      {t('siteName')}
                      <SortIcon active={sortKey === 'host'} direction={sortDirection} />
                    </Button>
                  </TableHead>
                  <TableHead className="w-40" aria-sort={ariaSort('status')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 px-2"
                      onClick={() => changeSort('status')}
                    >
                      <span>{t('status')}</span>
                      <SortIcon active={sortKey === 'status'} direction={sortDirection} />
                    </Button>
                  </TableHead>
                  <TableHead className="w-72">
                    <span className="block">{t('targetSpeed')}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {t('siteTargetSpeedHint')}
                    </span>
                  </TableHead>
                  <TableHead className="w-48">{t('indicator')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isEditing ? 5 : 4} className="h-24 text-center text-muted-foreground">
                      {t('siteRulesEmpty')}
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isEditing ? 5 : 4} className="h-24 text-center text-muted-foreground">
                      <div className="space-y-1">
                        <p>{t('siteRulesNoResults')}</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setQuery('')
                            setStatusFilter('all')
                          }}
                        >
                          {t('clearFilters')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map(entry => {
                    const selected = selectedHosts.has(entry.host)
                    return (
                      <TableRow key={entry.host} data-state={selected ? 'selected' : undefined}>
                        {isEditing ? (
                          <TableCell
                            className="h-11 w-12 cursor-pointer p-0"
                            onClick={() => toggleHost(entry.host, !selected)}
                          >
                            <div className="flex size-11 items-center justify-center">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={checked => toggleHost(entry.host, checked === true)}
                                onClick={event => event.stopPropagation()}
                                aria-label={t('selectSite', { host: entry.host })}
                              />
                            </div>
                          </TableCell>
                        ) : null}
                        <TableCell className="h-14 overflow-hidden pl-4 font-medium">
                          <span className="block truncate" title={entry.host}>{entry.host}</span>
                          <span className="block truncate text-[11px] font-normal text-muted-foreground">
                            {t('includesSubdomains')}
                          </span>
                        </TableCell>
                        <TableCell className="h-14">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!entry.enabled}
                              onCheckedChange={enabled => onToggle(entry.host, !enabled)}
                              aria-label={t(entry.enabled ? 'disableBlockedSite' : 'enableBlockedSite', { host: entry.host })}
                            />
                            <span className="text-xs text-muted-foreground max-sm:hidden">
                              {t(entry.enabled ? 'blockedSiteEnabled' : 'blockedSiteDisabled')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="h-14">
                          <RuleSpeedControl
                            entry={entry}
                            minimumSpeed={minimumSpeed}
                            maximumSpeed={maximumSpeed}
                            globalTargetSpeed={globalTargetSpeed}
                            t={t}
                            onPatch={changes => onPatch(entry.host, changes)}
                          />
                        </TableCell>
                        <TableCell className="h-14">
                          <div className={entry.enabled ? 'opacity-45' : ''}>
                            <Select
                              disabled={entry.enabled}
                              value={entry.showIndicator == null ? 'inherit' : entry.showIndicator ? 'show' : 'hide'}
                              onValueChange={value => onPatch(entry.host, {
                                showIndicator: value === 'inherit' ? null : value === 'show',
                              })}
                            >
                              <SelectTrigger className="h-8 w-40" aria-label={`${t('indicator')}: ${entry.host}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inherit">{t('followGeneralSettings')}</SelectItem>
                                <SelectItem value="show">{t('show')}</SelectItem>
                                <SelectItem value="hide">{t('hide')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isAddOpen}
        onOpenChange={open => {
          if (open) setIsAddOpen(true)
          else closeAddDialog()
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl"
        >
          <form
            className="grid gap-4"
            onSubmit={event => {
              event.preventDefault()
              if (customTargetSpeedIsRequired && !customTargetSpeedIsValid) return
              onAdd({
                enabled: !newShortcutsEnabled,
                targetSpeed: customTargetSpeedIsRequired ? customTargetSpeed : null,
                showIndicator: !newShortcutsEnabled || newIndicator === 'inherit'
                  ? null
                  : newIndicator === 'show',
              })
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('addSiteRules')}</DialogTitle>
              <DialogDescription>{t('addSiteRulesDescription')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="site-rule-hosts">{t('siteDomains')}</Label>
              <Textarea
                autoFocus
                id="site-rule-hosts"
                value={draft}
                onChange={event => onDraftChange(event.target.value)}
                placeholder={t('blockedSitePlaceholder')}
                aria-invalid={Boolean(error)}
                className="min-h-24 resize-y"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('siteRuleScopeDescription')}
              </p>
              {error ? (
                <p className="text-xs text-destructive" role="alert">
                  {t(
                    error.key === 'invalid' ? 'blockedSiteInvalid' : 'blockedSiteDuplicate',
                    { line: error.line }
                  )}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex min-h-10 items-center justify-between gap-4">
                <div>
                  <Label htmlFor="new-site-shortcuts">{t('siteShortcuts')}</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('siteShortcutsDescription')}
                  </p>
                </div>
                <Switch
                  id="new-site-shortcuts"
                  checked={newShortcutsEnabled}
                  onCheckedChange={setNewShortcutsEnabled}
                />
              </div>

              <div className={!newShortcutsEnabled ? 'opacity-45' : ''}>
                <Label htmlFor="new-site-speed-mode">{t('targetSpeed')}</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Select
                    disabled={!newShortcutsEnabled}
                    value={newSpeedMode}
                    onValueChange={value => setNewSpeedMode(value as 'inherit' | 'custom')}
                  >
                    <SelectTrigger id="new-site-speed-mode" className="h-9 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">{t('followGeneralSettings')}</SelectItem>
                      <SelectItem value="custom">{t('custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {newSpeedMode === 'custom' ? (
                    <Input
                      type="number"
                      min={minimumSpeed}
                      max={maximumSpeed}
                      step={0.05}
                      value={newTargetSpeedDraft}
                      disabled={!newShortcutsEnabled}
                      aria-label={t('targetSpeed')}
                      aria-invalid={!customTargetSpeedIsValid}
                      className="h-9 w-28"
                      onChange={event => setNewTargetSpeedDraft(event.target.value)}
                      onWheel={event => event.currentTarget.blur()}
                    />
                  ) : null}
                </div>
                {customTargetSpeedIsRequired && !customTargetSpeedIsValid ? (
                  <p className="mt-1.5 text-xs text-destructive" role="alert">
                    {t('siteTargetSpeedInvalid', { minimum: minimumSpeed, maximum: maximumSpeed })}
                  </p>
                ) : null}
              </div>

              <div className={!newShortcutsEnabled ? 'opacity-45' : ''}>
                <Label htmlFor="new-site-indicator">{t('indicator')}</Label>
                <Select
                  disabled={!newShortcutsEnabled}
                  value={newIndicator}
                  onValueChange={value => setNewIndicator(value as 'inherit' | 'show' | 'hide')}
                >
                  <SelectTrigger id="new-site-indicator" className="mt-1.5 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">{t('followGeneralSettings')}</SelectItem>
                    <SelectItem value="show">{t('show')}</SelectItem>
                    <SelectItem value="hide">{t('hide')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAddDialog}>{t('cancel')}</Button>
              <Button
                type="submit"
                disabled={customTargetSpeedIsRequired && !customTargetSpeedIsValid}
              >
                {t('addSiteRules')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
