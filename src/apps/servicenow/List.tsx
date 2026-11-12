import { useMemo, useState } from 'react'
import { Menu, ChevronDown, Filter, Search, Settings, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Info, ArrowDownNarrowWide, ArrowUpNarrowWide, MoreVertical, Plus, X, RefreshCw } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { type Incident, PriorityCell, fmtSN, HWChip, Popover, MenuItem, Modal, btnCls, primaryCls, useFlash, inputCls, PRIORITY_LABEL } from './shared'

export const FILTERS: Record<string, { title: string; crumbs: string[]; pred: (i: Incident) => boolean }> = {
  all: { title: 'Incidents', crumbs: [], pred: () => true },
  open: { title: 'Incidents', crumbs: ['Active = true'], pred: (i) => !['Resolved', 'Closed', 'Canceled'].includes(i.state) },
  unassigned: { title: 'Incidents', crumbs: ['Active = true', 'Assignment group is empty'], pred: (i) => !['Resolved', 'Closed', 'Canceled'].includes(i.state) && !i.assignmentGroup },
  new: { title: 'Incidents', crumbs: ['Active = true', 'State = New'], pred: (i) => i.state === 'New' },
  mine: { title: 'Incidents', crumbs: ['Active = true', 'Assigned to = Alex Morgan'], pred: (i) => i.assignedTo === 'Alex Morgan' && !['Resolved', 'Closed', 'Canceled'].includes(i.state) },
  resolved: { title: 'Incidents', crumbs: ['State = Resolved'], pred: (i) => i.state === 'Resolved' },
  triaged: { title: 'Incidents', crumbs: ['Updated by = H-Worker (Alex Morgan)'], pred: (i) => i.updatedBy === 'hworker' },
  following: { title: 'Incidents', crumbs: ['Followed by = Alex Morgan'], pred: (i) => !!i.followers?.includes(ME.id) },
  p1p2: { title: 'Incidents', crumbs: ['Active = true', 'Priority <= 2 - High'], pred: (i) => !['Resolved', 'Closed', 'Canceled'].includes(i.state) && i.priority <= 2 },
}

const PAGE = 20

/* ─────────── columns ─────────── */

const COLS = ['Number', 'Opened', 'Short description', 'Caller', 'Priority', 'State', 'Category', 'Assignment group', 'Assigned to', 'Updated'] as const
type Col = (typeof COLS)[number]
const STATE_ORDER = ['New', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Canceled']
const sortVal = (r: Incident, c: Col): string | number => {
  switch (c) {
    case 'Number': return r.number
    case 'Opened': return +new Date(r.opened)
    case 'Short description': return r.shortDescription.toLowerCase()
    case 'Caller': return person(r.callerId).name
    case 'Priority': return r.priority
    case 'State': return STATE_ORDER.indexOf(r.state)
    case 'Category': return r.category
    case 'Assignment group': return r.assignmentGroup || '~'
    case 'Assigned to': return r.assignedTo || '~'
    case 'Updated': return +new Date(r.updated)
  }
}

/* ─────────── condition builder ─────────── */

type Cond = { field: string; op: string; value: string }
const FIELDS: Record<string, { label: string; get: (i: Incident) => string; options?: string[] }> = {
  state: { label: 'State', get: (i) => i.state, options: STATE_ORDER },
  priority: { label: 'Priority', get: (i) => PRIORITY_LABEL[i.priority], options: Object.values(PRIORITY_LABEL) },
  category: { label: 'Category', get: (i) => i.category, options: ['Inquiry / Help', 'Software', 'Hardware', 'Network', 'Database'] },
  assignmentGroup: { label: 'Assignment group', get: (i) => i.assignmentGroup },
  assignedTo: { label: 'Assigned to', get: (i) => i.assignedTo },
  caller: { label: 'Caller', get: (i) => person(i.callerId).name },
  shortDescription: { label: 'Short description', get: (i) => i.shortDescription },
  ci: { label: 'Configuration item', get: (i) => i.ci },
  channel: { label: 'Channel', get: (i) => i.channel, options: ['Chat', 'Email', 'Phone', 'Self-service', 'Virtual Agent', 'Walk-in'] },
}
const OPS: Record<string, { label: string; test: (v: string, x: string) => boolean; noValue?: boolean }> = {
  is: { label: 'is', test: (v, x) => v.toLowerCase() === x.toLowerCase() },
  isnot: { label: 'is not', test: (v, x) => v.toLowerCase() !== x.toLowerCase() },
  contains: { label: 'contains', test: (v, x) => v.toLowerCase().includes(x.toLowerCase()) },
  notcontains: { label: 'does not contain', test: (v, x) => !v.toLowerCase().includes(x.toLowerCase()) },
  empty: { label: 'is empty', test: (v) => !v, noValue: true },
  notempty: { label: 'is not empty', test: (v) => !!v, noValue: true },
}
const condText = (c: Cond) => `${FIELDS[c.field].label} ${OPS[c.op].noValue ? OPS[c.op].label : OPS[c.op].label === 'is' ? '=' : OPS[c.op].label === 'is not' ? '!=' : OPS[c.op].label} ${OPS[c.op].noValue ? '' : c.value}`.trim()

function ConditionBuilder({ initial, onRun, onClose }: { initial: Cond[]; onRun: (c: Cond[]) => void; onClose: () => void }) {
  const [rows, setRows] = useState<Cond[]>(initial.length ? initial : [{ field: 'state', op: 'is', value: 'New' }])
  const set = (n: number, p: Partial<Cond>) => setRows((r) => r.map((x, i) => (i === n ? { ...x, ...p } : x)))
  return (
    <div className="shrink-0 border-b border-[#DADDE2] bg-[#F6F7F8] px-4 py-3" data-agent="sn-condition-builder">
      <div className="flex items-center gap-2 mb-2">
        <button className={primaryCls} data-agent="sn-cond-run" onClick={() => onRun(rows.filter((r) => OPS[r.op].noValue || r.value.trim()))}>Run</button>
        <button className={btnCls} onClick={() => setRows((r) => [...r, { field: 'priority', op: 'is', value: '1 - Critical' }])}>AND</button>
        <button className={btnCls} onClick={() => { setRows([]); onRun([]) }}>Clear all</button>
        <div className="flex-1" />
        <button className="w-8 h-8 rounded hover:bg-[#E4E7EB] flex items-center justify-center" aria-label="Close filter" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="text-[13px] text-[#5B616B] mb-1">All of these conditions must be met</div>
      {rows.map((r, n) => {
        const f = FIELDS[r.field]
        return (
          <div key={n} className="flex items-center gap-2 mb-1.5">
            <select value={r.field} onChange={(e) => set(n, { field: e.target.value, value: FIELDS[e.target.value].options?.[0] ?? '' })} className={inputCls + ' !w-[200px]'} aria-label="Field">
              {Object.entries(FIELDS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
            </select>
            <select value={r.op} onChange={(e) => set(n, { op: e.target.value })} className={inputCls + ' !w-[160px]'} aria-label="Operator">
              {Object.entries(OPS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
            </select>
            {!OPS[r.op].noValue &&
              (f.options && (r.op === 'is' || r.op === 'isnot') ? (
                <select value={r.value} onChange={(e) => set(n, { value: e.target.value })} className={inputCls + ' !w-[240px]'} aria-label="Value">
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input value={r.value} onChange={(e) => set(n, { value: e.target.value })} className={inputCls + ' !w-[240px]'} aria-label="Value" />
              ))}
            <button className="w-7 h-7 rounded hover:bg-[#E4E7EB] flex items-center justify-center text-[#5B616B]" aria-label="Remove condition" onClick={() => setRows((x) => x.filter((_, i) => i !== n))}><X size={14} /></button>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────── list ─────────── */

export function IncidentList({ filter, onFilter, onOpen, onNew, onUpdateSelected, initialQuery = '' }: { filter: string; onFilter: (f: string) => void; onOpen: (id: string) => void; onNew: () => void; onUpdateSelected: (ids: string[]) => void; initialQuery?: string }) {
  const all = useCollection<Incident>('servicenow.incidents')
  const flash = useFlash()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const [searchCol, setSearchCol] = useState('for text')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ col: Col; dir: 'asc' | 'desc' }>({ col: 'Opened', dir: 'desc' })
  const [conds, setConds] = useState<Cond[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const [hidden, setHidden] = useState<Set<Col>>(new Set())
  const [menu, setMenu] = useState<null | 'title' | 'controls' | 'actions' | 'personalize' | { preview: string }>(null)
  const [dialog, setDialog] = useState<null | 'tag' | 'delete'>(null)
  const [tag, setTag] = useState('')
  const f = FILTERS[filter] ?? FILTERS.all
  const rows = useMemo(() => {
    const ql = query.toLowerCase()
    const hay = (i: Incident) => (searchCol === 'Number' ? i.number : searchCol === 'Short description' ? i.shortDescription : i.number + ' ' + i.shortDescription + ' ' + person(i.callerId).name + ' ' + i.description + ' ' + i.ci)
    const v = all
      .filter(f.pred)
      .filter((i) => conds.every((c) => OPS[c.op].test(FIELDS[c.field].get(i) ?? '', c.value)))
      .filter((i) => !query || hay(i).toLowerCase().includes(ql))
    const m = sort.dir === 'asc' ? 1 : -1
    return v.sort((a, b) => {
      const x = sortVal(a, sort.col)
      const y = sortVal(b, sort.col)
      return (x < y ? -1 : x > y ? 1 : 0) * m || +new Date(b.opened) - +new Date(a.opened)
    })
  }, [all, filter, query, searchCol, conds, sort])
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE)
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const allChecked = pageRows.length > 0 && pageRows.every((r) => sel.has(r.id))
  const crumbs: { text: string; go: () => void }[] = [
    ...f.crumbs.map((c) => ({ text: c, go: () => { setConds([]); setQuery(''); setQ(''); setPage(0) } })),
    ...conds.map((c, n) => ({ text: condText(c), go: () => { setConds((x) => x.slice(0, n + 1)); setQuery(''); setQ(''); setPage(0) } })),
    ...(query ? [{ text: `Keywords = ${query}`, go: () => {} }] : []),
  ]
  const cols = COLS.filter((c) => !hidden.has(c))
  const selected = all.filter((i) => sel.has(i.id))
  const clickSort = (c: Col) => {
    setSort((s) => (s.col === c ? { col: c, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: c, dir: 'asc' }))
    setPage(0)
  }

  const follow = (ids: string[]) => {
    for (const id of ids) db.update('servicenow.incidents', id, (r) => ({ followers: Array.from(new Set([...(r.followers ?? []), ME.id])) }))
    flash(`You are now following ${ids.length} record${ids.length === 1 ? '' : 's'}`)
  }
  const assignToMe = (ids: string[]) => {
    const now = new Date().toISOString()
    for (const id of ids)
      db.update('servicenow.incidents', id, (r) => ({
        assignedTo: ME.name,
        state: r.state === 'New' ? 'In Progress' : r.state,
        updated: now,
        activity: [{ id: `a-${Date.now()}${id}`, author: ME.name, date: now, kind: 'field', text: `Assigned to: ${ME.name}${r.state === 'New' ? '\nState: In Progress' : ''}` }, ...r.activity],
      }))
    flash(`${ids.length} record${ids.length === 1 ? '' : 's'} assigned to ${ME.name}`)
  }
  const exportCsv = (ids: string[]) => {
    flash(`Export of ${ids.length} incident${ids.length === 1 ? '' : 's'} (CSV) has been sent to your email`)
  }

  const Pager = () => (
    <div className="flex items-center gap-1 text-[13px] text-[#2E3238]">
      <button className="w-7 h-7 flex items-center justify-center rounded text-[#8A9099] hover:bg-[#EDEFF2]" onClick={() => setPage(0)} aria-label="First page"><ChevronsLeft size={16} /></button>
      <button className="w-7 h-7 flex items-center justify-center rounded text-[#8A9099] hover:bg-[#EDEFF2]" onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous page"><ChevronLeft size={16} /></button>
      <span className="px-1"><input readOnly value={rows.length ? page * PAGE + 1 : 0} className="w-9 h-6 border border-[#8790A1] rounded text-center text-[13px]" /> to {Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}</span>
      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#EDEFF2]" onClick={() => setPage((p) => ((p + 1) * PAGE < rows.length ? p + 1 : p))} aria-label="Next page"><ChevronRight size={16} /></button>
      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#EDEFF2]" onClick={() => setPage(Math.max(0, Math.ceil(rows.length / PAGE) - 1))} aria-label="Last page"><ChevronsRight size={16} /></button>
    </div>
  )

  const cell = (r: Incident, c: Col) => {
    switch (c) {
      case 'Number':
        return <td key={c} className="px-2 whitespace-nowrap"><button data-agent={`sn-inc-${r.id}`} aria-label={`Open record ${r.number}`} onClick={() => onOpen(r.id)} className="text-[#1F6FB2] underline-offset-2 hover:underline font-normal">{r.number}</button></td>
      case 'Opened':
        return <td key={c} className="px-2 whitespace-nowrap text-[13px]">{fmtSN(r.opened)}</td>
      case 'Short description':
        return <td key={c} className="px-2 max-w-[300px] truncate" title={r.shortDescription}>{r.shortDescription}</td>
      case 'Caller':
        return <td key={c} className="px-2 whitespace-nowrap"><span className="text-[#1F6FB2]">{person(r.callerId).name}</span></td>
      case 'Priority':
        return <td key={c} className="px-2"><PriorityCell p={r.priority} /></td>
      case 'State':
        return <td key={c} className="px-2 whitespace-nowrap">{r.state}{r.closeCode === 'Duplicate' && <span className="ml-1 text-[12px] text-[#5B616B]">(Duplicate)</span>}</td>
      case 'Category':
        return <td key={c} className="px-2 whitespace-nowrap">{r.category}</td>
      case 'Assignment group':
        return <td key={c} className="px-2 whitespace-nowrap">{r.assignmentGroup ? <span className="text-[#1F6FB2]">{r.assignmentGroup}</span> : <span className="text-[#8A9099]">(empty)</span>}</td>
      case 'Assigned to':
        return <td key={c} className="px-2 whitespace-nowrap">{r.assignedTo ? <span className="text-[#1F6FB2]">{r.assignedTo}</span> : <span className="text-[#8A9099]">(empty)</span>}</td>
      case 'Updated':
        return <td key={c} className="px-2 whitespace-nowrap text-[13px]"><span className="inline-flex items-center gap-1.5">{fmtSN(r.updated)} {r.updatedBy === 'hworker' && <HWChip small />}</span></td>
    }
  }

  const previewId = menu && typeof menu === 'object' ? menu.preview : null
  const pv = previewId ? all.find((x) => x.id === previewId) : undefined

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white relative">
      {/* list title bar */}
      <div className="h-[52px] shrink-0 flex items-center gap-2 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <span className="relative">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB] text-[#2E3238]" aria-label="List controls" onClick={() => setMenu(menu === 'controls' ? null : 'controls')}><Menu size={18} /></button>
          {menu === 'controls' && (
            <Popover onClose={() => setMenu(null)} className="left-0 top-9 w-[240px]" agent="sn-list-controls-menu">
              <MenuItem onClick={() => { setShowFilter((s) => !s); setMenu(null) }}>{showFilter ? 'Hide filter' : 'Show filter'}</MenuItem>
              <MenuItem onClick={() => { setMenu('personalize') }}>Personalize list columns…</MenuItem>
              <MenuItem onClick={() => { setSort({ col: 'Opened', dir: 'desc' }); setHidden(new Set()); setMenu(null); flash('List layout reset to default') }}>Reset to column defaults</MenuItem>
              <div className="h-px bg-[#DADDE2] my-1" />
              <MenuItem onClick={() => { exportCsv(rows.map((r) => r.id)); setMenu(null) }}>Export › CSV</MenuItem>
              <MenuItem onClick={() => { setPage(0); setMenu(null); flash('List refreshed') }}>Refresh List</MenuItem>
            </Popover>
          )}
        </span>
        <span className="relative">
          <button className="flex items-center gap-1 text-[18px] font-bold text-[#1B1D21] px-1 rounded hover:bg-[#E4E7EB]" data-agent="sn-list-title" onClick={() => setMenu(menu === 'title' ? null : 'title')}>
            {f.title} <ChevronDown size={16} />
          </button>
          {menu === 'title' && (
            <Popover onClose={() => setMenu(null)} className="left-0 top-9 w-[260px]">
              <div className="px-4 pt-1 pb-1 text-[12px] font-bold text-[#5B616B] uppercase">Filters</div>
              {[['all', 'All'], ['open', 'Active'], ['unassigned', 'Open - Unassigned'], ['mine', 'Assigned to me'], ['p1p2', 'Active P1 / P2'], ['following', 'Followed by me'], ['resolved', 'Resolved'], ['triaged', 'Updated by H-Worker']].map(([id, l]) => (
                <MenuItem key={id} onClick={() => { onFilter(id); setMenu(null) }}><span className={filter === id ? 'font-bold' : ''}>{l}</span></MenuItem>
              ))}
              <div className="h-px bg-[#DADDE2] my-1" />
              <MenuItem onClick={() => { onNew(); setMenu(null) }}>New incident</MenuItem>
            </Popover>
          )}
        </span>
        <div className="flex items-center ml-3">
          <select className="h-8 px-2 rounded-l-[4px] border border-[#8790A1] bg-white text-[13px]" aria-label="Search column" value={searchCol} onChange={(e) => setSearchCol(e.target.value)}>
            <option>for text</option>
            <option>Number</option>
            <option>Short description</option>
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#5B616B]" />
            <input
              data-agent="sn-list-search"
              aria-label="Search incidents"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setQuery(q)
                  setPage(0)
                }
              }}
              placeholder="Search"
              className="h-8 w-[230px] pl-7 pr-2 border border-l-0 border-[#8790A1] rounded-r-[4px] text-[13px] outline-none focus:border-[#0C66E4]"
            />
          </div>
        </div>
        <div className="flex-1" />
        <Pager />
        <span className="w-px h-6 bg-[#DADDE2] mx-1" />
        <span className="relative">
          <button className="h-8 px-3 rounded-[4px] border border-[#8790A1] bg-white text-[14px] font-bold text-[#1B1D21] hover:bg-[#F1F3F5]" onClick={() => setMenu(menu === 'actions' ? null : 'actions')}>Actions <ChevronDown size={13} className="inline -mt-0.5" /></button>
          {menu === 'actions' && (
            <Popover onClose={() => setMenu(null)} className="right-0 top-9 w-[250px]" agent="sn-list-actions-menu">
              <div className="px-4 pt-1 pb-1 text-[12px] text-[#5B616B]">{sel.size ? `${sel.size} selected` : 'Select rows to enable bulk actions'}</div>
              <MenuItem disabled={!sel.size} onClick={() => { onUpdateSelected(Array.from(sel)); setSel(new Set()); setMenu(null) }}>Update Selected</MenuItem>
              <MenuItem disabled={!sel.size} onClick={() => { assignToMe(Array.from(sel)); setSel(new Set()); setMenu(null) }}>Assign to me</MenuItem>
              <MenuItem disabled={!sel.size} onClick={() => { follow(Array.from(sel)); setSel(new Set()); setMenu(null) }}>Follow</MenuItem>
              <MenuItem disabled={!sel.size} onClick={() => { setDialog('tag'); setMenu(null) }}>Assign Tag…</MenuItem>
              <div className="h-px bg-[#DADDE2] my-1" />
              <MenuItem onClick={() => { exportCsv(sel.size ? Array.from(sel) : rows.map((r) => r.id)); setMenu(null) }}>Export › CSV</MenuItem>
              <MenuItem disabled={!sel.size} danger onClick={() => { setDialog('delete'); setMenu(null) }}>Delete</MenuItem>
            </Popover>
          )}
        </span>
        <button data-agent="sn-list-new" onClick={onNew} className="h-8 px-4 rounded-[4px] bg-[#032D42] hover:bg-[#0B3F59] text-white text-[14px] font-bold">New</button>
      </div>
      {showFilter && <ConditionBuilder initial={conds} onClose={() => setShowFilter(false)} onRun={(c) => { setConds(c); setPage(0); setSel(new Set()) }} />}
      {/* breadcrumb */}
      <div className="h-[38px] shrink-0 flex items-center gap-2 px-3 border-b border-[#DADDE2] text-[13px]">
        <button className={`w-7 h-7 flex items-center justify-center rounded hover:bg-[#EDEFF2] ${showFilter ? 'bg-[#E1EDFA] text-[#0B4FA6]' : 'text-[#2E3238]'}`} aria-label="Show / hide filter" onClick={() => setShowFilter((s) => !s)}><Filter size={15} /></button>
        <span className="text-[#5B616B]">
          <button className="text-[#1F6FB2] hover:underline" onClick={() => { onFilter('all'); setQuery(''); setQ(''); setConds([]) }} data-agent="sn-crumb-all">All</button>
          {crumbs.map((c, i) => (
            <span key={c.text + i}>
              <span className="mx-1.5 text-[#8A9099]">&gt;</span>
              {i === crumbs.length - 1 ? <span className="text-[#1B1D21]">{c.text}</span> : <button onClick={c.go} className="text-[#1F6FB2] hover:underline">{c.text}</button>}
            </span>
          ))}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1" data-agent="sn-quick-filters">
          {[['open', 'Active'], ['unassigned', 'Open - Unassigned'], ['new', 'New'], ['resolved', 'Resolved']].map(([id, l]) => (
            <button key={id} data-agent={`sn-filter-${id}`} onClick={() => { onFilter(id); setPage(0); setSel(new Set()) }} className={`h-6 px-2.5 rounded-full text-[12px] border ${filter === id ? 'bg-[#E1EDFA] border-[#0C66E4] text-[#0B4FA6] font-bold' : 'border-[#C5CAD3] text-[#2E3238] hover:bg-[#F1F3F5]'}`}>{l}</button>
          ))}
        </div>
      </div>
      {/* table */}
      <div className="flex-1 min-h-0 overflow-auto" data-agent="sn-list">
        <table className="w-full text-[14px] text-[#1B1D21] border-collapse">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="h-[40px] border-b-2 border-[#C5CAD3]">
              <th className="w-[38px] pl-3"><input type="checkbox" data-agent="sn-check-all" aria-label="Select all" checked={allChecked} onChange={() => setSel(allChecked ? new Set() : new Set(pageRows.map((r) => r.id)))} className="w-4 h-4 accent-[#032D42] align-middle" /></th>
              <th className="w-[30px] relative">
                <button className="text-[#5B616B] align-middle hover:text-[#0C66E4]" aria-label="Personalize list" onClick={() => setMenu(menu === 'personalize' ? null : 'personalize')}><Settings size={15} /></button>
                {menu === 'personalize' && (
                  <Popover onClose={() => setMenu(null)} className="left-0 top-8 w-[240px] text-left font-normal" agent="sn-personalize">
                    <div className="px-4 pt-1 pb-1.5 text-[13px] font-bold">Personalize List Columns</div>
                    {COLS.map((c) => (
                      <label key={c} className="flex items-center gap-2 px-4 py-1 hover:bg-[#EEF4FB] cursor-pointer">
                        <input type="checkbox" disabled={c === 'Number'} checked={!hidden.has(c)} onChange={() => setHidden((h) => { const n = new Set(h); if (n.has(c)) n.delete(c); else n.add(c); return n })} className="accent-[#032D42]" />
                        {c}
                      </label>
                    ))}
                  </Popover>
                )}
              </th>
              <th className="w-[26px]"><button aria-label="Show filter" onClick={() => setShowFilter((s) => !s)} className="text-[#5B616B] hover:text-[#0C66E4] align-middle"><Search size={14} /></button></th>
              {cols.map((c) => (
                <th key={c} className="text-left font-bold px-2 whitespace-nowrap cursor-pointer select-none hover:bg-[#F6F7F8]" onClick={() => clickSort(c)} aria-sort={sort.col === c ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  <span className="inline-flex items-center gap-1 group">
                    {c}
                    {sort.col === c && (sort.dir === 'desc' ? <ArrowDownNarrowWide size={13} className="text-[#5B616B]" /> : <ArrowUpNarrowWide size={13} className="text-[#5B616B]" />)}
                    <MoreVertical size={13} className="text-[#8A9099] opacity-0 group-hover:opacity-100" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => {
              const fresh = r.updatedBy === 'hworker' && Date.now() - +new Date(r.updated) < 90000
              return (
                <tr key={r.id} data-agent={`sn-row-${r.id}`} className={`h-[38px] border-b border-[#E4E7EB] hover:bg-[#EEF4FB] ${sel.has(r.id) ? 'bg-[#E1EDFA]' : i % 2 ? 'bg-[#FAFBFB]' : ''} ${fresh ? 'flash-new' : ''}`}>
                  <td className="pl-3"><input type="checkbox" data-agent={`sn-row-check-${r.id}`} aria-label={`Select ${r.number}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="w-4 h-4 accent-[#032D42] align-middle" /></td>
                  <td />
                  <td className="relative">
                    <button className="text-[#5B616B] align-middle hover:text-[#0C66E4]" aria-label="Preview" onClick={() => setMenu(previewId === r.id ? null : { preview: r.id })}><Info size={15} /></button>
                    {previewId === r.id && pv && (
                      <Popover onClose={() => setMenu(null)} className="left-6 top-0 w-[420px] !py-0" agent="sn-preview">
                        <div className="px-4 py-2.5 border-b border-[#DADDE2] flex items-center gap-2">
                          <span className="font-bold">Incident {pv.number}</span>
                          <div className="flex-1" />
                          <button className={btnCls} onClick={() => { setMenu(null); onOpen(pv.id) }}>Open Record</button>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-[130px_1fr] gap-y-1.5 text-[13px]">
                          {[['Caller', person(pv.callerId).name], ['Short description', pv.shortDescription], ['Priority', PRIORITY_LABEL[pv.priority]], ['State', pv.state], ['Category', `${pv.category}${pv.subcategory ? ' / ' + pv.subcategory : ''}`], ['Configuration item', pv.ci], ['Assignment group', pv.assignmentGroup || '(empty)'], ['Assigned to', pv.assignedTo || '(empty)'], ['Opened', fmtSN(pv.opened)]].map(([k, v]) => (
                            <div key={k} className="contents"><span className="text-[#5B616B]">{k}</span><span className="whitespace-normal">{v}</span></div>
                          ))}
                        </div>
                      </Popover>
                    )}
                  </td>
                  {cols.map((c) => cell(r, c))}
                </tr>
              )
            })}
            {!pageRows.length && (
              <tr>
                <td colSpan={13} className="py-10 text-center text-[#5B616B]">No records to display</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="h-[46px] shrink-0 flex items-center gap-3 px-3 border-t border-[#DADDE2] bg-[#F6F7F8]">
        <select
          data-agent="sn-list-actions"
          aria-label="Actions on selected rows"
          value=""
          disabled={!sel.size}
          onChange={(e) => {
            const ids = Array.from(sel)
            const v = e.target.value
            if (v === 'update') onUpdateSelected(ids)
            else if (v === 'assign') return setDialog('tag')
            else if (v === 'follow') follow(ids)
            else if (v === 'export') exportCsv(ids)
            else if (v === 'delete') return setDialog('delete')
            setSel(new Set())
          }}
          className="h-8 px-2 rounded-[4px] border border-[#8790A1] bg-white text-[13px] disabled:text-[#8A9099]"
        >
          <option value="">Actions on selected rows...</option>
          <option value="update">Update Selected</option>
          <option value="assign">Assign Tag</option>
          <option value="follow">Follow</option>
          <option value="export">Export</option>
          <option value="delete">Delete</option>
        </select>
        {sel.size > 0 && <span className="text-[13px] text-[#2E3238]">{sel.size} selected</span>}
        {sel.size > 0 && <button className="text-[13px] text-[#1F6FB2] hover:underline" onClick={() => setSel(new Set())}>Clear selection</button>}
        <div className="flex-1" />
        <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#EDEFF2] text-[#5B616B]" aria-label="Refresh list" onClick={() => { setPage(0); flash('List refreshed') }}><RefreshCw size={14} /></button>
        <Pager />
      </div>

      {dialog === 'tag' && (
        <Modal
          title="Assign Tag"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button className={btnCls} onClick={() => setDialog(null)}>Cancel</button>
              <button
                className={primaryCls}
                disabled={!tag.trim()}
                onClick={() => {
                  for (const r of selected) db.update('servicenow.incidents', r.id, (x) => ({ tags: Array.from(new Set([...(x.tags ?? []), tag.trim()])) }))
                  flash(`Tag "${tag.trim()}" added to ${selected.length} record${selected.length === 1 ? '' : 's'}`)
                  setTag('')
                  setSel(new Set())
                  setDialog(null)
                }}
              >
                <Plus size={13} className="inline -mt-0.5" /> Add tag
              </button>
            </>
          }
        >
          <div className="mb-2">Tag {selected.length} selected record{selected.length === 1 ? '' : 's'}:</div>
          <input autoFocus value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. boston-vpn-outage" className={inputCls} aria-label="Tag name" />
          {Array.from(new Set(all.flatMap((i) => i.tags ?? []))).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">{Array.from(new Set(all.flatMap((i) => i.tags ?? []))).map((t) => <button key={t} onClick={() => setTag(t)} className="h-6 px-2 rounded-full bg-[#E1EDFA] text-[12px] text-[#0B4FA6]">{t}</button>)}</div>
          )}
        </Modal>
      )}
      {dialog === 'delete' && (
        <Modal
          title="Delete"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button className={btnCls} onClick={() => setDialog(null)}>Cancel</button>
              <button className="h-8 px-4 rounded-[4px] bg-[#C9302C] hover:bg-[#A52A2A] text-white text-[14px] font-bold" onClick={() => { for (const r of selected) db.remove('servicenow.incidents', r.id); flash(`${selected.length} record${selected.length === 1 ? '' : 's'} deleted`); setSel(new Set()); setDialog(null) }}>Delete</button>
            </>
          }
        >
          Delete {selected.length} record{selected.length === 1 ? '' : 's'}? <span className="text-[#5B616B]">({selected.map((s) => s.number).join(', ')})</span>
          <div className="mt-2 text-[13px] text-[#A52A2A]">This action cannot be undone.</div>
        </Modal>
      )}
    </div>
  )
}
