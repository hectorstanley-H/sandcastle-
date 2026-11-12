/** Power BI: extra navigation views (Create, Browse, OneLake, Metrics, Monitor, Learn) and shared dialogs. */
import { useMemo, useState, type ReactNode } from 'react'
import {
  Dismiss20Regular,
  Add20Regular,
  Database20Regular,
  DataBarVertical20Regular,
  Table20Regular,
  Search16Regular,
  CheckmarkCircle16Filled,
  ErrorCircle16Filled,
  Trophy20Regular,
  BookOpen20Regular,
  ArrowRight16Regular,
  Board20Regular,
  ClipboardPaste20Regular,
} from '@fluentui/react-icons'
import { db, uid, useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { Endorsement, ItemIcon, Sensitivity, THEME, TYPE_LABEL, dataSource, fmtDT, usePbi } from './shared'
import { ItemTable } from './Home'

/* ───────────── primitives ───────────── */

export function PbiModal({ title, sub, children, onClose, footer, width = 480, agent }: { title: string; sub?: string; children: ReactNode; onClose: () => void; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center" onMouseDown={onClose}>
      <div data-agent={agent} role="dialog" aria-label={title} className="bg-white rounded-lg shadow-[0_25.6px_57.6px_rgba(0,0,0,0.22),0_4.8px_14.4px_rgba(0,0,0,0.18)] p-6 max-h-[88%] flex flex-col" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-semibold text-[#252423]">{title}</div>
            {sub && <div className="text-[12.5px] text-[#605E5C] truncate">{sub}</div>}
          </div>
          <button aria-label="Close" onClick={onClose} className="w-8 h-8 rounded hover:bg-[#F3F2F1] flex items-center justify-center">
            <Dismiss20Regular />
          </button>
        </div>
        <div className="mt-4 overflow-auto text-[13px] flex-1 min-h-0">{children}</div>
        {footer && <div className="mt-5 flex items-center justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

export function PBtn({ children, primary, onClick, disabled, agent }: { children: ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean; agent?: string }) {
  return (
    <button
      data-agent={agent}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 px-4 rounded-[4px] text-[13px] font-semibold disabled:opacity-50 ${primary ? 'bg-[#0F6CBD] hover:bg-[#115EA3] text-white' : 'border border-[#D1D1D1] hover:bg-[#F3F2F1]'}`}
    >
      {children}
    </button>
  )
}

export const field = 'w-full h-8 px-2.5 rounded-[4px] border border-[#8A8886] focus:border-[#0F6CBD] outline-none text-[13px] bg-white'
export function Lbl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[12.5px] font-semibold text-[#252423] mb-1">{label}</span>
      {children}
    </label>
  )
}

/** People picker used by Manage access / Subscribe */
export function PeoplePicker({ value, onChange, placeholder = 'Enter a name or email', agent }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; agent?: string }) {
  const [t, setT] = useState('')
  const matches = t.length > 1 ? PEOPLE.filter((p) => !p.external && (p.name + ' ' + p.email).toLowerCase().includes(t.toLowerCase()) && !value.includes(p.email)).slice(0, 5) : []
  const add = (e: string) => {
    if (e && !value.includes(e)) onChange([...value, e])
    setT('')
  }
  return (
    <div className="relative min-h-[34px] flex flex-wrap items-center gap-1 px-2 py-1 rounded-[4px] border border-[#8A8886] focus-within:border-[#0F6CBD]">
      {value.map((e) => (
        <span key={e} className="flex items-center gap-1.5 h-6 pl-0.5 pr-2 rounded-full bg-[#EBF3FC] text-[12.5px]">
          <Avatar email={e} size={20} /> {PEOPLE.find((p) => p.email === e)?.name ?? e}
          <button onClick={() => onChange(value.filter((x) => x !== e))} aria-label={`Remove ${e}`} className="text-[#605E5C]">
            ×
          </button>
        </span>
      ))}
      <input
        data-agent={agent}
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(matches[0]?.email ?? (t.includes('@') ? t.trim() : ''))
          }
        }}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 min-w-[140px] h-7 outline-none text-[13px]"
      />
      {matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13)] py-1">
          {matches.map((p) => (
            <button key={p.id} onClick={() => add(p.email)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F3F2F1] text-left">
              <Avatar id={p.id} size={26} />
              <span>
                <span className="block text-[13px]">{p.name}</span>
                <span className="block text-[11.5px] text-[#605E5C]">{p.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PageHead = ({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) => (
  <div className="flex items-end gap-3 mb-4">
    <div className="flex-1">
      <div className="text-[20px] font-semibold">{title}</div>
      {sub && <div className="text-[12.5px] text-[#605E5C] mt-0.5">{sub}</div>}
    </div>
    {right}
  </div>
)

/** create a new report record from an existing source (copy of its data) */
export function createReportFrom(src: any, name: string, workspace = 'My workspace', isAgent = false) {
  const id = uid('rpt')
  const guid = crypto.randomUUID?.() ?? `${Date.now().toString(16)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14)}`
  const { history: _h, exports: _e, sharedWith: _s, sharedBy: _sb, shareMessage: _m, subscriptions: _sub, bookmarks: _b, comments: _c, favorite: _f, ...rest } = src
  db.insert('powerbi.reports', {
    ...JSON.parse(JSON.stringify(rest)),
    id,
    guid,
    name,
    workspace,
    type: 'report',
    owner: ME.id,
    endorsement: undefined,
    lastOpened: new Date().toISOString(),
    reportId: undefined,
    ...(isAgent ? { createdBy: 'hworker' } : {}),
  })
  return id
}

/* ───────────── Create ───────────── */

export function CreateView({ isAgent }: { isAgent: boolean }) {
  const items = useCollection('powerbi.reports')
  const { openItem } = usePbi()
  const models = items.filter((r) => r.type === 'semanticModel')
  const [q, setQ] = useState('')
  const build = (m: any) => {
    const src = dataSource(m, items)
    if (!src || src === m) return
    let name = `${m.name} report`
    let k = 2
    while (items.some((r) => r.name === name)) name = `${m.name} report (${k++})`
    openItem(createReportFrom(src, name, 'My workspace', isAgent))
  }
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="powerbi-create">
      <PageHead title="Create" sub="Build a report from a published semantic model, or start from data you paste in." />
      <div className="grid grid-cols-3 gap-4 max-w-[980px]">
        {[
          [ClipboardPaste20Regular, 'Paste or manually enter data', 'Start with a blank table and type values.'],
          [Database20Regular, 'Pick a published semantic model', 'Reuse a certified model from your organization.'],
          [DataBarVertical20Regular, 'Create a blank report', 'Starts from the Operations KPI model.'],
        ].map(([I, t, d]: any, i) => (
          <button
            key={t}
            onClick={() => {
              if (i === 2) build(models.find((m) => m.id === 'sm-ops-kpi') ?? models[0])
              else if (i === 0) {
                const id = uid('rpt')
                db.insert('powerbi.reports', {
                  id,
                  guid: `${Date.now().toString(16)}-1111-4000-8000-${Math.random().toString(16).slice(2, 14)}`,
                  name: 'Untitled report',
                  workspace: 'My workspace',
                  type: 'report',
                  owner: ME.id,
                  lastOpened: new Date().toISOString(),
                  lastRefreshed: new Date().toISOString(),
                  pages: ['Page 1'],
                  generic: {
                    cards: [
                      { label: 'Rows', value: 3, fmt: 'int' },
                      { label: 'Total', value: 1250, fmt: 'int' },
                    ],
                    line: { title: 'Value by row', a: 'Value', b: 'Target', data: ['A', 'B', 'C'].map((x, j) => ({ x, a: [300, 450, 500][j], b: 400 })) },
                    bars: { title: 'Value by row', data: ['A', 'B', 'C'].map((name, j) => ({ name, v: [300, 450, 500][j] })) },
                    donut: { title: 'Share of total', data: ['A', 'B', 'C'].map((name, j) => ({ name, v: [300, 450, 500][j] })) },
                    table: { title: 'Table 1', cols: ['Row', 'Value'], rows: [['A', '300'], ['B', '450'], ['C', '500']] },
                  },
                  ...(isAgent ? { createdBy: 'hworker' } : {}),
                })
                openItem(id)
              } else document.getElementById('pbi-create-models')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="text-left rounded-md border border-[#E1DFDD] p-4 hover:shadow-[0_3.2px_7.2px_rgba(0,0,0,0.13)]"
          >
            <I className="w-6 h-6 text-[#0F6CBD]" />
            <div className="text-[14px] font-semibold mt-2">{t}</div>
            <div className="text-[12.5px] text-[#605E5C] mt-1">{d}</div>
          </button>
        ))}
      </div>
      <div id="pbi-create-models" className="mt-8 flex items-center gap-3 max-w-[980px]">
        <div className="text-[16px] font-semibold flex-1">Semantic models</div>
        <div className="h-8 w-[240px] rounded border border-[#D1D1D1] flex items-center gap-1.5 px-2 text-[#605E5C]">
          <Search16Regular />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search semantic models" className="flex-1 text-[12.5px] outline-none text-[#242424]" />
        </div>
      </div>
      <div className="mt-2 max-w-[980px]">
        {models
          .filter((m) => m.name.toLowerCase().includes(q.toLowerCase()))
          .map((m) => (
            <div key={m.id} className="flex items-center gap-3 h-12 border-b border-[#F3F2F1] text-[13px]">
              <ItemIcon type="semanticModel" />
              <span className="flex-1 truncate">
                {m.name} <span className="text-[#605E5C]">· {m.workspace}</span>
              </span>
              <Endorsement value={m.endorsement} />
              <button data-agent={`powerbi-create-from-${m.id}`} onClick={() => build(m)} className="h-7 px-3 rounded border border-[#D1D1D1] hover:bg-[#F3F2F1] text-[12.5px] flex items-center gap-1">
                <Add20Regular className="w-4 h-4" /> Create report
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ───────────── Browse ───────────── */

export function BrowseView() {
  const items = useCollection('powerbi.reports')
  const { openItem, openWorkspace } = usePbi()
  const [tab, setTab] = useState<'recent' | 'favorites' | 'shared'>('recent')
  const [q, setQ] = useState('')
  const rows = (tab === 'recent' ? [...items].filter((r) => r.lastOpened).sort((a, b) => +new Date(b.lastOpened) - +new Date(a.lastOpened)) : tab === 'favorites' ? items.filter((r) => r.favorite) : items.filter((r) => r.owner !== ME.id && r.type !== 'dataflow')).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="powerbi-browse">
      <PageHead title="Browse" />
      <div className="flex items-center gap-5 border-b border-[#E1DFDD]">
        {(
          [
            ['recent', 'Recent'],
            ['favorites', 'Favorites'],
            ['shared', 'Shared with me'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`relative h-9 text-[14px] ${tab === k ? 'font-semibold' : 'text-[#424242]'}`}>
            {l}
            {tab === k && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t bg-[#117865]" />}
          </button>
        ))}
        <div className="ml-auto h-7 w-[220px] rounded border border-[#D1D1D1] flex items-center gap-1.5 px-2 mb-1 text-[#605E5C]">
          <Search16Regular />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by keyword" aria-label="Filter by keyword" className="flex-1 text-[12.5px] outline-none text-[#242424]" />
        </div>
      </div>
      <BrowseTable rows={rows} all={items} onOpen={openItem} onWorkspace={openWorkspace} />
      {!rows.length && <div className="py-10 text-center text-[13px] text-[#605E5C]">Nothing here yet.</div>}
    </div>
  )
}

function BrowseTable({ rows, all, onOpen, onWorkspace }: { rows: any[]; all: any[]; onOpen: (id: string) => void; onWorkspace: (n: string) => void }) {
  return <ItemTable rows={rows} all={all} cols={['name', 'type', 'opened', 'location', 'endorsement', 'sensitivity']} onOpen={onOpen} onWorkspace={onWorkspace} agentPrefix="powerbi-browse-item" />
}

/* ───────────── OneLake data hub ───────────── */

export function OneLakeView() {
  const items = useCollection('powerbi.reports')
  const { openItem } = usePbi()
  const [endorsed, setEndorsed] = useState(false)
  const rows = items.filter((r) => (r.type === 'semanticModel' || r.type === 'dataflow') && (!endorsed || r.endorsement))
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="powerbi-onelake">
      <PageHead
        title="OneLake catalog"
        sub="Discover and reuse the data in your organization."
        right={
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={endorsed} onChange={(e) => setEndorsed(e.target.checked)} /> Endorsed only
          </label>
        }
      />
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[#605E5C] h-10 border-b border-[#EDEBE9]">
            <th className="w-8" />
            {['Name', 'Type', 'Owner', 'Workspace', 'Refreshed', 'Endorsement', 'Sensitivity'].map((h) => (
              <th key={h} className="font-normal px-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => openItem(r.id)} className="h-11 border-b border-[#F3F2F1] hover:bg-[#F5F5F5] cursor-pointer">
              <td className="pl-2">
                <ItemIcon type={r.type} />
              </td>
              <td className="px-2">{r.name}</td>
              <td className="px-2">{TYPE_LABEL[r.type]}</td>
              <td className="px-2">{person(r.owner).name}</td>
              <td className="px-2">{r.workspace}</td>
              <td className="px-2">{fmtDT(dataSource(r, items).lastRefreshed)}</td>
              <td className="px-2">
                <Endorsement value={r.endorsement} />
              </td>
              <td className="px-2">
                <Sensitivity value={r.sensitivity} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────── Metrics (scorecard) ───────────── */

export function MetricsView() {
  const items = useCollection('powerbi.reports')
  const { openItem } = usePbi()
  const ops = items.find((r) => r.id === 'rpt-ops-kpi')
  const k = ops?.kpis ?? {}
  const t = ops?.targets ?? {}
  const goals: [string, string, number, number, boolean, string][] = [
    ['On-time delivery', 'onTimeDelivery', k.onTimeDelivery, t.onTimeDelivery, false, '%'],
    ['Warehouse SLA', 'warehouseSla', k.warehouseSla, t.warehouseSla, false, '%'],
    ['Order cycle time', 'orderCycleTimeDays', k.orderCycleTimeDays, t.orderCycleTimeDays, true, ' days'],
    ['Cost per order', 'costPerOrder', k.costPerOrder, t.costPerOrder, true, ''],
    ['Backorders', 'backorders', k.backorders, t.backorders, true, ''],
    ['Orders shipped', 'ordersShipped', k.ordersShipped, t.ordersShipped, false, ''],
  ].filter((g) => g[2] !== undefined && g[3] !== undefined) as any
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="powerbi-metrics">
      <PageHead title="Operations FY scorecard" sub={ops ? `Values connected to “${ops.name}” · updated ${fmtDT(ops.lastRefreshed)}` : 'No connected data'} />
      <table className="w-full max-w-[980px] text-[13px]">
        <thead>
          <tr className="text-left text-[#605E5C] h-10 border-b border-[#EDEBE9]">
            {['Goal', 'Owner', 'Status', 'Current', 'Target', 'Progress'].map((h) => (
              <th key={h} className="font-normal px-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {goals.map(([label, key, cur, tgt, lower, unit]) => {
            const ok = lower ? cur <= tgt : cur >= tgt
            const near = lower ? cur <= tgt * 1.05 : cur >= tgt * 0.97
            const status = ok ? 'On track' : near ? 'At risk' : 'Behind'
            const pct = Math.max(0, Math.min(1, lower ? tgt / cur : cur / tgt))
            const f = (v: number) => (key === 'costPerOrder' ? `$${v.toFixed(2)}` : key === 'ordersShipped' || key === 'backorders' ? v.toLocaleString('en-US') : `${v}${unit}`)
            return (
              <tr key={key} onClick={() => ops && openItem(ops.id)} className="h-12 border-b border-[#F3F2F1] hover:bg-[#F5F5F5] cursor-pointer">
                <td className="px-2 font-semibold flex items-center gap-2 h-12">
                  <Trophy20Regular className="w-4 h-4 text-[#C8A51B]" /> {label}
                </td>
                <td className="px-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar id="priya" size={20} /> Priya Raman
                  </span>
                </td>
                <td className="px-2">
                  <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[12px] font-semibold" style={{ background: ok ? '#DFF6DD' : near ? '#FFF4CE' : '#FDE7E9', color: ok ? '#107C10' : near ? '#8A6100' : '#A4262C' }}>
                    {status}
                  </span>
                </td>
                <td className="px-2">{f(cur)}</td>
                <td className="px-2 text-[#605E5C]">{f(tgt)}</td>
                <td className="px-2 w-[180px]">
                  <div className="h-2 rounded-full bg-[#EDEBE9] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: ok ? '#107C10' : near ? '#D9B300' : '#D13438' }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────── Monitor ───────────── */

export function MonitorView() {
  const items = useCollection('powerbi.reports')
  const { openItem } = usePbi()
  const [status, setStatus] = useState<'all' | 'Completed' | 'Failed'>('all')
  const runs = useMemo(
    () =>
      items
        .flatMap((r) => (r.history ?? []).map((h: any) => ({ ...h, item: r })))
        .filter((h) => status === 'all' || h.status === status)
        .sort((a, b) => +new Date(b.start) - +new Date(a.start)),
    [items, status],
  )
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="powerbi-monitor">
      <PageHead
        title="Monitor"
        sub="Refresh activity across the items you can access."
        right={
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-8 px-2 rounded border border-[#D1D1D1] text-[13px]" aria-label="Status filter">
            <option value="all">All statuses</option>
            <option value="Completed">Succeeded</option>
            <option value="Failed">Failed</option>
          </select>
        }
      />
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-left text-[#605E5C] h-10 border-b border-[#EDEBE9]">
            {['Activity name', 'Status', 'Item type', 'Start time', 'Submitted by', 'Location', 'Details'].map((h) => (
              <th key={h} className="font-normal px-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((h) => (
            <tr key={h.item.id + h.id} onClick={() => openItem(h.item.id)} className="h-10 border-b border-[#F3F2F1] hover:bg-[#F5F5F5] cursor-pointer">
              <td className="px-2">{h.item.name}</td>
              <td className="px-2">
                <span className="inline-flex items-center gap-1">
                  {h.status === 'Completed' ? <CheckmarkCircle16Filled className="text-[#107C10]" /> : <ErrorCircle16Filled className="text-[#A4262C]" />}
                  {h.status === 'Completed' ? 'Succeeded' : h.status}
                </span>
              </td>
              <td className="px-2">{TYPE_LABEL[h.item.type]}</td>
              <td className="px-2">{fmtDT(h.start)}</td>
              <td className="px-2">{h.by === 'hworker' ? 'H-Worker' : h.type === 'Scheduled' ? 'Scheduled' : ME.name}</td>
              <td className="px-2">{h.item.workspace}</td>
              <td className="px-2 text-[#605E5C] max-w-[320px] truncate">{h.error ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!runs.length && <div className="py-10 text-center text-[13px] text-[#605E5C]">No activity.</div>}
    </div>
  )
}

/* ───────────── Learn ───────────── */

export function LearnView({ onOpen }: { onOpen: (title: string) => void }) {
  const items = [
    ['Get started with Power BI', 'Beginner · 45 min', '#118DFF'],
    ['Create reports from semantic models', 'Beginner · 1 hr', '#12239E'],
    ['Design effective dashboards', 'Intermediate · 50 min', '#E66C37'],
    ['Write DAX measures', 'Intermediate · 2 hr', '#6B007B'],
    ['Configure scheduled refresh and gateways', 'Advanced · 40 min', '#744EC2'],
    ['Share and distribute content', 'Beginner · 30 min', '#D64550'],
  ]
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6" data-agent="powerbi-learn">
      <PageHead title="Learning center" sub="Training modules, samples and documentation." />
      <div className="grid grid-cols-3 gap-4 max-w-[1000px]">
        {items.map(([t, d, c]) => (
          <button key={t} onClick={() => onOpen(t)} className="text-left rounded-md border border-[#E1DFDD] overflow-hidden hover:shadow-md">
            <div className="h-20 flex items-center justify-center" style={{ background: c }}>
              <BookOpen20Regular className="w-8 h-8 text-white" />
            </div>
            <div className="p-3">
              <div className="text-[14px] font-semibold">{t}</div>
              <div className="text-[12px] text-[#605E5C] mt-0.5 flex items-center gap-1">
                {d} <ArrowRight16Regular className="ml-auto" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ───────────── Lineage ───────────── */

export function LineageView({ ws }: { ws: string }) {
  const items = useCollection('powerbi.reports')
  const { openItem } = usePbi()
  const inWs = items.filter((r) => r.workspace === ws)
  const flows = inWs.filter((r) => r.type === 'dataflow')
  const models = inWs.filter((r) => r.type === 'semanticModel')
  const reports = inWs.filter((r) => r.type === 'report')
  const dashes = inWs.filter((r) => r.type === 'dashboard')
  const Card = ({ r }: { r: any }) => (
    <button data-agent={`powerbi-lineage-${r.id}`} onClick={() => openItem(r.id)} className="w-[210px] text-left rounded-md border border-[#C8C6C4] bg-white hover:shadow-md p-2.5">
      <div className="flex items-center gap-2">
        <ItemIcon type={r.type} />
        <span className="text-[12.5px] font-semibold truncate">{r.name}</span>
      </div>
      <div className="text-[11px] text-[#605E5C] mt-1">{TYPE_LABEL[r.type]}</div>
      {r.reportId && <div className="text-[11px] text-[#605E5C] truncate">→ {items.find((x) => x.id === r.reportId)?.name}</div>}
    </button>
  )
  const col = (title: string, list: any[]) => (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] font-semibold text-[#605E5C] uppercase tracking-wide">{title}</div>
      {list.map((r) => (
        <Card key={r.id} r={r} />
      ))}
      {!list.length && <div className="text-[12px] text-[#A19F9D]">None</div>}
    </div>
  )
  return (
    <div className="mt-4 p-6 rounded-md bg-[#FAF9F8] border border-[#EDEBE9] flex gap-10 overflow-auto" data-agent="powerbi-lineage">
      {col('Dataflows', flows)}
      <ArrowRight16Regular className="self-center text-[#A19F9D]" />
      {col('Semantic models', models)}
      <ArrowRight16Regular className="self-center text-[#A19F9D]" />
      {col('Reports', reports)}
      <ArrowRight16Regular className="self-center text-[#A19F9D]" />
      {col('Dashboards', dashes)}
    </div>
  )
}

/* ───────────── dialogs ───────────── */

export function NewWorkspaceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const workspaces = useCollection('powerbi.workspaces')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const taken = workspaces.some((w) => w.name.toLowerCase() === name.trim().toLowerCase())
  return (
    <PbiModal
      title="Create a workspace"
      onClose={onClose}
      agent="powerbi-new-workspace-dialog"
      footer={
        <>
          <PBtn
            primary
            agent="powerbi-new-workspace-apply"
            disabled={!name.trim() || taken}
            onClick={() => {
              const n = name.trim()
              db.insert('powerbi.workspaces', { id: uid('ws'), name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), guid: crypto.randomUUID?.() ?? uid('g'), color: THEME[Math.floor(Math.random() * THEME.length)], description: desc, capacity: 'Pro', members: [ME.id] })
              onCreated(n)
            }}
          >
            Apply
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <Lbl label="Name *">
        <input autoFocus data-agent="powerbi-new-workspace-name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </Lbl>
      {taken && <div className="text-[12px] text-[#A4262C] -mt-2 mb-2">This name is already in use.</div>}
      <Lbl label="Description">
        <textarea className={`${field} h-20 py-1.5 resize-none`} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Lbl>
      <div className="text-[12px] text-[#605E5C]">License mode: Pro</div>
    </PbiModal>
  )
}

export function ManageAccessDialog({ ws, onClose }: { ws: any; onClose: () => void }) {
  const [add, setAdd] = useState<string[]>([])
  const [role, setRole] = useState('Contributor')
  const members: string[] = ws.members ?? []
  return (
    <PbiModal title="Manage access" sub={ws.name} onClose={onClose} width={520} agent="powerbi-manage-access">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          <PeoplePicker value={add} onChange={setAdd} placeholder="Enter a name or email to add" agent="powerbi-access-add" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-8 px-2 rounded border border-[#8A8886] text-[13px]">
          {['Admin', 'Member', 'Contributor', 'Viewer'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <PBtn
          primary
          disabled={!add.length}
          onClick={() => {
            const ids = add.map((e) => PEOPLE.find((p) => p.email === e)?.id).filter(Boolean) as string[]
            db.update('powerbi.workspaces', ws.id, { members: Array.from(new Set([...members, ...ids])), roles: { ...(ws.roles ?? {}), ...Object.fromEntries(ids.map((i) => [i, role])) } })
            setAdd([])
          }}
        >
          Add
        </PBtn>
      </div>
      {members.map((m) => (
        <div key={m} className="flex items-center gap-3 h-11 border-b border-[#F3F2F1]">
          <Avatar id={m} size={28} />
          <div className="flex-1 min-w-0">
            <div className="truncate">{person(m).name}</div>
            <div className="text-[11.5px] text-[#605E5C] truncate">{person(m).email}</div>
          </div>
          <select
            value={ws.roles?.[m] ?? (m === ME.id || m === 'priya' ? 'Admin' : 'Member')}
            onChange={(e) => db.update('powerbi.workspaces', ws.id, { roles: { ...(ws.roles ?? {}), [m]: e.target.value } })}
            className="h-7 px-1 rounded border border-[#D1D1D1] text-[12.5px]"
          >
            {['Admin', 'Member', 'Contributor', 'Viewer'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button disabled={m === ME.id} onClick={() => db.update('powerbi.workspaces', ws.id, { members: members.filter((x) => x !== m) })} className="text-[12px] text-[#A4262C] hover:underline disabled:opacity-30">
            Remove
          </button>
        </div>
      ))}
    </PbiModal>
  )
}

export function WorkspaceSettingsDialog({ ws, onClose }: { ws: any; onClose: () => void }) {
  const [desc, setDesc] = useState(ws.description ?? '')
  const [contact, setContact] = useState(ws.contact ?? 'Workspace admins')
  return (
    <PbiModal
      title="Workspace settings"
      sub={ws.name}
      onClose={onClose}
      footer={
        <>
          <PBtn primary onClick={() => (db.update('powerbi.workspaces', ws.id, { description: desc, contact }), onClose())}>
            Save
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <Lbl label="Workspace name">
        <input className={`${field} bg-[#F3F2F1]`} value={ws.name} disabled />
      </Lbl>
      <Lbl label="Description">
        <textarea className={`${field} h-24 py-1.5 resize-none`} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Lbl>
      <Lbl label="Contact list">
        <select className={field} value={contact} onChange={(e) => setContact(e.target.value)}>
          <option>Workspace admins</option>
          <option>Specific users or groups</option>
        </select>
      </Lbl>
      <div className="text-[12px] text-[#605E5C]">License info: {ws.capacity}</div>
    </PbiModal>
  )
}

export function SubscribeDialog({ rec, pages, onClose, onDone }: { rec: any; pages: string[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [to, setTo] = useState<string[]>([ME.email])
  const [subject, setSubject] = useState(`${rec.name} — weekly`)
  const [freq, setFreq] = useState('Weekly')
  const [time, setTime] = useState('08:00')
  const [page, setPage] = useState(pages[0] ?? 'Page 1')
  return (
    <PbiModal
      title="Subscribe to emails"
      sub={rec.name}
      onClose={onClose}
      width={500}
      agent="powerbi-subscribe-dialog"
      footer={
        <>
          <PBtn
            primary
            agent="powerbi-subscribe-save"
            disabled={!to.length}
            onClick={() => {
              db.update('powerbi.reports', rec.id, (r) => ({ subscriptions: [...(r.subscriptions ?? []), { id: uid('sub'), to, subject, freq, time, page, createdAt: new Date().toISOString() }] }))
              onDone(`You’ll get “${subject}” ${freq.toLowerCase()} at ${time}.`)
              onClose()
            }}
          >
            Save and close
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <Lbl label="Recipients">
        <PeoplePicker value={to} onChange={setTo} />
      </Lbl>
      <Lbl label="Subject">
        <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Lbl>
      <div className="grid grid-cols-3 gap-3">
        <Lbl label="Page">
          <select className={field} value={page} onChange={(e) => setPage(e.target.value)}>
            {pages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Lbl>
        <Lbl label="Repeat">
          <select className={field} value={freq} onChange={(e) => setFreq(e.target.value)}>
            {['Daily', 'Weekly', 'Monthly', 'After data refresh'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Lbl>
        <Lbl label="Time">
          <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
        </Lbl>
      </div>
      {(rec.subscriptions ?? []).length > 0 && (
        <div className="mt-2">
          <div className="text-[12.5px] font-semibold mb-1">Existing subscriptions</div>
          {rec.subscriptions.map((s: any) => (
            <div key={s.id} className="flex items-center gap-2 h-8 text-[12.5px] border-b border-[#F3F2F1]">
              <span className="flex-1 truncate">
                {s.subject} · {s.freq} {s.time}
              </span>
              <button onClick={() => db.update('powerbi.reports', rec.id, (r) => ({ subscriptions: (r.subscriptions ?? []).filter((x: any) => x.id !== s.id) }))} className="text-[#A4262C] hover:underline">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </PbiModal>
  )
}

export function TeamsShareDialog({ rec, onClose, onDone }: { rec: any; onClose: () => void; onDone: (msg: string) => void }) {
  const [where, setWhere] = useState('Operations › Ops Leadership')
  const [msg, setMsg] = useState('')
  return (
    <PbiModal
      title="Share to Microsoft Teams"
      sub={rec.name}
      onClose={onClose}
      footer={
        <>
          <PBtn
            primary
            onClick={() => {
              onDone(`Link to “${rec.name}” posted in ${where}.`)
              onClose()
            }}
          >
            Share
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <Lbl label="Share to">
        <select className={field} value={where} onChange={(e) => setWhere(e.target.value)}>
          {['Operations › Ops Leadership', 'Operations › General', 'Priya Raman (chat)', 'David Okafor (chat)'].map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </Lbl>
      <Lbl label="Message">
        <textarea className={`${field} h-20 py-1.5 resize-none`} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Add a message" />
      </Lbl>
      <div className="rounded border border-[#E1DFDD] p-3 flex items-center gap-3">
        <ItemIcon type="report" size={28} />
        <div>
          <div className="font-semibold">{rec.name}</div>
          <div className="text-[12px] text-[#605E5C]">Power BI report · {rec.workspace}</div>
        </div>
      </div>
    </PbiModal>
  )
}

export function PinDialog({ title, rec, page, onClose, onDone }: { title: string; rec: any; page: number; onClose: () => void; onDone: (dashName: string, id: string) => void }) {
  const items = useCollection('powerbi.reports')
  const dashes = items.filter((r) => r.type === 'dashboard')
  const [mode, setMode] = useState<'existing' | 'new'>(dashes.length ? 'existing' : 'new')
  const [sel, setSel] = useState(dashes[0]?.id ?? '')
  const [name, setName] = useState('')
  return (
    <PbiModal
      title="Pin to dashboard"
      sub={title}
      onClose={onClose}
      agent="powerbi-pin-dialog"
      footer={
        <>
          <PBtn
            primary
            agent="powerbi-pin-apply"
            disabled={mode === 'existing' ? !sel : !name.trim()}
            onClick={() => {
              const tile = { id: uid('tile'), title, reportId: rec.id, reportName: rec.name, page, pinnedAt: new Date().toISOString() }
              let id = sel
              if (mode === 'new') {
                id = uid('db')
                db.insert('powerbi.reports', { id, guid: crypto.randomUUID?.() ?? uid('g'), name: name.trim(), workspace: rec.workspace, type: 'dashboard', owner: ME.id, reportId: rec.id, lastOpened: new Date().toISOString(), lastRefreshed: rec.lastRefreshed, tiles: [tile] })
              } else db.update('powerbi.reports', id, (d) => ({ tiles: [...(d.tiles ?? []), tile] }))
              onDone(mode === 'new' ? name.trim() : (dashes.find((d) => d.id === id)?.name ?? 'dashboard'), id)
              onClose()
            }}
          >
            Pin
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <label className="flex items-center gap-2 mb-2">
        <input type="radio" checked={mode === 'existing'} disabled={!dashes.length} onChange={() => setMode('existing')} /> Existing dashboard
      </label>
      {mode === 'existing' && (
        <select className={`${field} mb-3`} value={sel} onChange={(e) => setSel(e.target.value)}>
          {dashes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.workspace})
            </option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-2 mb-2">
        <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} /> New dashboard
      </label>
      {mode === 'new' && <input autoFocus className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dashboard name" />}
    </PbiModal>
  )
}

export function ScheduleDialog({ rec, onClose, onDone }: { rec: any; onClose: () => void; onDone: (msg: string) => void }) {
  const s = rec.schedule ?? { on: true, freq: 'Daily', times: ['06:00'] }
  const [on, setOn] = useState<boolean>(s.on)
  const [freq, setFreq] = useState<string>(s.freq)
  const [time, setTime] = useState<string>(s.times?.[0] ?? '06:00')
  const nextRun = () => {
    const [h, m] = time.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + (freq === 'Weekly' ? 7 : 1))
    return d.toISOString()
  }
  return (
    <PbiModal
      title="Refresh schedule"
      sub={rec.name}
      onClose={onClose}
      agent="powerbi-schedule-dialog"
      footer={
        <>
          <PBtn
            primary
            onClick={() => {
              db.update('powerbi.reports', rec.id, { schedule: { on, freq, times: [time] }, nextRefresh: on ? nextRun() : undefined })
              onDone(on ? `Next refresh ${fmtDT(nextRun())}.` : 'Scheduled refresh is off.')
              onClose()
            }}
          >
            Apply
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <label className="flex items-center gap-2 mb-3">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Configure a refresh schedule
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Lbl label="Refresh frequency">
          <select className={field} value={freq} disabled={!on} onChange={(e) => setFreq(e.target.value)}>
            <option>Daily</option>
            <option>Weekly</option>
          </select>
        </Lbl>
        <Lbl label="Time">
          <input type="time" className={field} value={time} disabled={!on} onChange={(e) => setTime(e.target.value)} />
        </Lbl>
      </div>
      {rec.gateway && <div className="text-[12px] text-[#605E5C]">Gateway: {rec.gateway}</div>}
    </PbiModal>
  )
}

export function ExploreDialog({ rec, onClose }: { rec: any; onClose: () => void }) {
  const items = useCollection('powerbi.reports')
  const src = dataSource(rec, items)
  const [table, setTable] = useState<string>(src.byRegion ? 'Distribution centers' : 'Table')
  const tables: Record<string, { cols: string[]; rows: (string | number)[][] }> = {}
  if (src.byRegion) tables['Distribution centers'] = { cols: ['Distribution center', 'Region', 'Orders', 'On-time %', 'SLA %', 'Backorders'], rows: src.byRegion.map((r: any) => [r.dc, r.region, r.orders, r.onTime, r.sla, r.backorders]) }
  if (src.byCarrier) tables['Carriers'] = { cols: ['Carrier', 'Shipments', 'On-time %', 'Avg transit (d)'], rows: src.byCarrier.map((r: any) => [r.carrier, r.orders, r.onTime, r.transitDays]) }
  if (src.weekly) tables['Weekly'] = { cols: ['Week', 'Orders', 'On-time %', 'Orders LY'], rows: src.weekly.map((r: any) => [r.week, r.orders, r.onTime, r.ordersLY]) }
  if (src.generic) tables['Table'] = { cols: src.generic.table.cols, rows: src.generic.table.rows }
  const t = tables[table] ?? Object.values(tables)[0]
  return (
    <PbiModal title="Explore this data" sub={src.name} onClose={onClose} width={720} agent="powerbi-explore-dialog">
      <div className="flex gap-2 mb-3">
        {Object.keys(tables).map((k) => (
          <button key={k} onClick={() => setTable(k)} className={`h-7 px-3 rounded-full text-[12.5px] border ${k === table ? 'bg-[#EBF3FC] border-[#0F6CBD] text-[#0F6CBD]' : 'border-[#D1D1D1] hover:bg-[#F3F2F1]'}`}>
            <Table20Regular className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            {k}
          </button>
        ))}
      </div>
      {t ? (
        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr className="border-b-2 border-[#252423]">
              {t.cols.map((c) => (
                <th key={c} className="text-left py-1 px-2 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i} className={`border-b border-[#EDEBE9] ${i % 2 ? 'bg-[#FAFAFA]' : ''}`}>
                {r.map((v, j) => (
                  <td key={j} className="py-1 px-2">
                    {typeof v === 'number' ? v.toLocaleString('en-US') : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-[#605E5C]">This item has no tables you can preview.</div>
      )}
    </PbiModal>
  )
}

export function FeedbackDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [t, setT] = useState('')
  const [kind, setKind] = useState<'like' | 'dislike' | 'idea'>('idea')
  return (
    <PbiModal
      title="Send feedback to Microsoft"
      onClose={onClose}
      footer={
        <>
          <PBtn primary disabled={!t.trim()} onClick={() => (onDone(), onClose())}>
            Submit
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <div className="flex gap-2 mb-3">
        {(
          [
            ['like', 'I like something'],
            ['dislike', 'I don’t like something'],
            ['idea', 'I have a suggestion'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} className={`h-8 px-3 rounded border text-[12.5px] ${kind === k ? 'border-[#0F6CBD] bg-[#EBF3FC]' : 'border-[#D1D1D1]'}`}>
            {l}
          </button>
        ))}
      </div>
      <textarea autoFocus className={`${field} h-28 py-1.5 resize-none`} value={t} onChange={(e) => setT(e.target.value)} placeholder="Tell us more" />
    </PbiModal>
  )
}

export function ItemSettingsDialog({ rec, onClose }: { rec: any; onClose: () => void }) {
  const [desc, setDesc] = useState(rec.description ?? '')
  const [sens, setSens] = useState(rec.sensitivity ?? 'General')
  return (
    <PbiModal
      title="Settings"
      sub={rec.name}
      onClose={onClose}
      footer={
        <>
          <PBtn primary onClick={() => (db.update('powerbi.reports', rec.id, { description: desc, sensitivity: sens }), onClose())}>
            Save
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <Lbl label="Name">
        <input className={`${field} bg-[#F3F2F1]`} value={rec.name} disabled />
      </Lbl>
      <Lbl label="Description">
        <textarea className={`${field} h-20 py-1.5 resize-none`} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Lbl>
      <Lbl label="Sensitivity label">
        <select className={field} value={sens} onChange={(e) => setSens(e.target.value)}>
          {['General', 'Confidential', 'Highly Confidential'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Lbl>
    </PbiModal>
  )
}

export function EmbedDialog({ rec, url, onClose, onCopy }: { rec: any; url: string; onClose: () => void; onCopy: (t: string) => void }) {
  const code = `<iframe title="${rec.name}" width="1140" height="541.25" src="${url.replace('?experience=power-bi', '')}?autoAuth=true&ctid=northwind" frameborder="0" allowFullScreen="true"></iframe>`
  return (
    <PbiModal title="Securely embed this report in a website or portal" sub={rec.name} onClose={onClose} width={560}>
      <Lbl label="Link you can use to embed this content">
        <div className="flex gap-2">
          <input readOnly className={field} value={url} />
          <PBtn onClick={() => onCopy(url)}>Copy</PBtn>
        </div>
      </Lbl>
      <Lbl label="HTML you can paste into a website">
        <textarea readOnly className={`${field} h-24 py-1.5 font-mono text-[11.5px] resize-none`} value={code} />
      </Lbl>
      <PBtn onClick={() => onCopy(code)}>Copy HTML</PBtn>
    </PbiModal>
  )
}

/** a deterministic QR-style matrix for the "Generate a QR code" dialog */
export function QrDialog({ rec, url, onClose }: { rec: any; url: string; onClose: () => void }) {
  const n = 25
  let seed = 0
  for (const c of url) seed = (seed * 33 + c.charCodeAt(0)) >>> 0
  const bit = (x: number, y: number) => {
    const finder = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7
    if (finder(0, 0) || finder(n - 7, 0) || finder(0, n - 7)) {
      const lx = x < 7 ? x : x - (n - 7)
      const ly = y < 7 ? y : y - (n - 7)
      return lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)
    }
    seed = (seed * 1103515245 + 12345) >>> 0
    return (seed >> 16) % 2 === 0
  }
  const cells: boolean[] = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells.push(bit(x, y))
  return (
    <PbiModal title="QR code" sub={rec.name} onClose={onClose} width={360} footer={<PBtn primary onClick={onClose}>Close</PBtn>}>
      <div className="flex justify-center">
        <svg width={220} height={220} viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="bg-white">
          {cells.map((on, i) => (on ? <rect key={i} x={i % n} y={Math.floor(i / n)} width={1} height={1} fill="#000" /> : null))}
        </svg>
      </div>
      <div className="text-[12px] text-[#605E5C] mt-3 text-center">Scan with the Power BI mobile app to open this report.</div>
    </PbiModal>
  )
}

export { Board20Regular }
