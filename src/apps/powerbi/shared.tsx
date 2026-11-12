import {
  DataBarVertical20Filled,
  Board20Filled,
  Database20Filled,
  Flow20Filled,
  ShieldCheckmark16Filled,
  Ribbon16Filled,
} from '@fluentui/react-icons'
import { createContext, useContext } from 'react'
import { db, uid } from '@/db/db'
import { logoUrl } from '@/os/registry'

export const THEME = ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550']

export const TYPE_LABEL: Record<string, string> = {
  report: 'Report',
  dashboard: 'Dashboard',
  semanticModel: 'Semantic model',
  dataflow: 'Dataflow Gen2',
}

export function ItemIcon({ type, size = 20 }: { type: string; size?: number }) {
  const s = { width: size, height: size, fontSize: size }
  if (type === 'dashboard') return <Board20Filled style={{ ...s, color: '#C8A51B' }} />
  if (type === 'semanticModel') return <Database20Filled style={{ ...s, color: '#0F6CBD' }} />
  if (type === 'dataflow') return <Flow20Filled style={{ ...s, color: '#038387' }} />
  return <DataBarVertical20Filled style={{ ...s, color: '#E5A00D' }} />
}

export function Endorsement({ value }: { value?: string }) {
  if (!value) return <span className="text-[#605E5C]">—</span>
  return (
    <span className="inline-flex items-center gap-1 text-[#323130]">
      {value === 'Certified' ? <ShieldCheckmark16Filled className="text-[#0F6CBD]" /> : <Ribbon16Filled className="text-[#6B007B]" />}
      {value}
    </span>
  )
}

export function Sensitivity({ value }: { value?: string }) {
  const color = value === 'Highly Confidential' ? '#A4262C' : value === 'Confidential' ? '#CA5010' : '#107C10'
  return (
    <span className="inline-flex items-center gap-1.5 text-[#323130]">
      <span className="w-2 h-2 rounded-[2px]" style={{ background: color }} />
      {value ?? 'General'}
    </span>
  )
}

export function HWChip({ label = 'Refreshed by H-Worker' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full text-[10.5px] font-semibold text-white whitespace-nowrap"
      style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}
    >
      <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> {label}
    </span>
  )
}

export const fmtDT = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
export const fmtDTShort = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' }) : '—'
export const fmtN = (n: number) => n.toLocaleString('en-US')

export function wsGuid(name: string) {
  const w = db.get('powerbi.workspaces').find((x) => x.name === name)
  return w?.guid ?? 'me'
}

export function itemUrl(rec: any, page = 0) {
  const g = wsGuid(rec.workspace)
  if (rec.type === 'report') return `https://app.powerbi.com/groups/${g}/reports/${rec.guid}/ReportSection${page ? 'b' + (page * 37).toString(16) + 'e1c0d4' : ''}?experience=power-bi`
  if (rec.type === 'dashboard') return `https://app.powerbi.com/groups/${g}/dashboards/${rec.guid}?experience=power-bi`
  if (rec.type === 'semanticModel') return `https://app.powerbi.com/groups/${g}/datasets/${rec.guid}/details?experience=power-bi`
  return `https://app.powerbi.com/groups/${g}/dataflows-gen2/${rec.guid}?experience=power-bi`
}

/** the record whose lastRefreshed should be displayed for an item */
export function dataSource(rec: any, all: any[]) {
  if (rec.reportId) return all.find((r) => r.id === rec.reportId) ?? rec
  return rec
}

/** Apply a completed refresh to the db: swaps pendingKpis in, bumps timestamps, logs history. */
export function applyRefresh(id: string, isAgent: boolean, kind: 'OnDemand' | 'Visuals' = 'OnDemand') {
  const all = db.get('powerbi.reports')
  const rec = all.find((r) => r.id === id)
  if (!rec) return
  const target = rec.reportId ? all.find((r) => r.id === rec.reportId) ?? rec : rec
  const now = new Date().toISOString()
  const by = isAgent ? 'hworker' : undefined
  const startedAt = new Date(Date.now() - 2500).toISOString()
  db.update('powerbi.reports', target.id, (r) => {
    const patch: any = {
      lastRefreshed: now,
      refreshedBy: by,
      history: [{ id: uid('h'), start: startedAt, end: now, type: kind === 'Visuals' ? 'On demand' : 'On demand', status: 'Completed', by }, ...(r.history ?? [])],
    }
    if (r.pendingKpis) {
      const pd = r.pendingData ?? {}
      patch.prevKpis = r.kpis
      patch.kpis = r.pendingKpis
      patch.pendingKpis = undefined
      patch.pendingData = undefined
      if (pd.fiscalWeek) patch.fiscalWeek = pd.fiscalWeek
      if (pd.weekRange) patch.weekRange = pd.weekRange
      if (pd.week && r.weekly) patch.weekly = [...r.weekly.slice(1), pd.week]
      for (const k of ['byRegion', 'byCarrier', 'backorderCats', 'cycleStages']) if (pd[k]) patch[k] = pd[k]
    }
    return patch
  })
  for (const r of all) if (r.reportId === target.id) db.update('powerbi.reports', r.id, { lastRefreshed: now, refreshedBy: by })
}

export interface Notice {
  id: string
  kind: 'progress' | 'success' | 'info'
  title: string
  body?: string
}

export interface PbiCtx {
  openItem: (id: string, page?: number) => void
  openWorkspace: (name: string) => void
  goHome: () => void
  notify: (n: Omit<Notice, 'id'>, ttl?: number) => string
  dismiss: (id: string) => void
  /** navigate to a left-nav view (create, browse, onelake, metrics, monitor, learn, apps) */
  navigate?: (view: string) => void
  /** open the item settings dialog */
  itemSettings?: (id: string) => void
}
export const PbiContext = createContext<PbiCtx>(null as any)
export const usePbi = () => useContext(PbiContext)
