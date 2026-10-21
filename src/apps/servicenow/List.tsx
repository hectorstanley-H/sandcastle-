import { useMemo, useState } from 'react'
import { Menu, ChevronDown, Filter, Search, Settings, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Info, ArrowDownNarrowWide, MoreVertical } from 'lucide-react'
import { useCollection } from '@/db/db'
import { person } from '@/data/people'
import { type Incident, PriorityCell, fmtSN, HWChip } from './shared'

export const FILTERS: Record<string, { title: string; crumbs: string[]; pred: (i: Incident) => boolean }> = {
  all: { title: 'Incidents', crumbs: [], pred: () => true },
  open: { title: 'Incidents', crumbs: ['Active = true'], pred: (i) => !['Resolved', 'Closed', 'Canceled'].includes(i.state) },
  unassigned: { title: 'Incidents', crumbs: ['Active = true', 'Assignment group is empty'], pred: (i) => !['Resolved', 'Closed', 'Canceled'].includes(i.state) && !i.assignmentGroup },
  new: { title: 'Incidents', crumbs: ['Active = true', 'State = New'], pred: (i) => i.state === 'New' },
  mine: { title: 'Incidents', crumbs: ['Active = true', 'Assigned to = Alex Morgan'], pred: (i) => i.assignedTo === 'Alex Morgan' && !['Resolved', 'Closed', 'Canceled'].includes(i.state) },
  resolved: { title: 'Incidents', crumbs: ['State = Resolved'], pred: (i) => i.state === 'Resolved' },
  triaged: { title: 'Incidents', crumbs: ['Updated by = H-Worker (Alex Morgan)'], pred: (i) => i.updatedBy === 'hworker' },
}

const PAGE = 20

export function IncidentList({ filter, onFilter, onOpen, onNew, onUpdateSelected }: { filter: string; onFilter: (f: string) => void; onOpen: (id: string) => void; onNew: () => void; onUpdateSelected: (ids: string[]) => void }) {
  const all = useCollection<Incident>('servicenow.incidents')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const f = FILTERS[filter] ?? FILTERS.all
  const rows = useMemo(
    () =>
      all
        .filter(f.pred)
        .filter((i) => !query || (i.number + ' ' + i.shortDescription + ' ' + person(i.callerId).name).toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => +new Date(b.opened) - +new Date(a.opened)),
    [all, filter, query],
  )
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE)
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const allChecked = pageRows.length > 0 && pageRows.every((r) => sel.has(r.id))
  const crumbs = [...f.crumbs, ...(query ? [`Keywords = ${query}`] : [])]

  const cols = ['Number', 'Opened', 'Short description', 'Caller', 'Priority', 'State', 'Category', 'Assignment group', 'Assigned to', 'Updated']
  const Pager = () => (
    <div className="flex items-center gap-1 text-[13px] text-[#2E3238]">
      <button className="w-7 h-7 flex items-center justify-center rounded text-[#8A9099]" onClick={() => setPage(0)} aria-label="First page"><ChevronsLeft size={16} /></button>
      <button className="w-7 h-7 flex items-center justify-center rounded text-[#8A9099]" onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous page"><ChevronLeft size={16} /></button>
      <span className="px-1"><input readOnly value={rows.length ? page * PAGE + 1 : 0} className="w-9 h-6 border border-[#8790A1] rounded text-center text-[13px]" /> to {Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}</span>
      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#EDEFF2]" onClick={() => setPage((p) => ((p + 1) * PAGE < rows.length ? p + 1 : p))} aria-label="Next page"><ChevronRight size={16} /></button>
      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#EDEFF2]" onClick={() => setPage(Math.max(0, Math.ceil(rows.length / PAGE) - 1))} aria-label="Last page"><ChevronsRight size={16} /></button>
    </div>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* list title bar */}
      <div className="h-[52px] shrink-0 flex items-center gap-2 px-3 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E4E7EB] text-[#2E3238]" aria-label="List controls"><Menu size={18} /></button>
        <button className="flex items-center gap-1 text-[18px] font-bold text-[#1B1D21] px-1 rounded hover:bg-[#E4E7EB]" data-agent="sn-list-title">
          {f.title} <ChevronDown size={16} />
        </button>
        <div className="flex items-center ml-3">
          <select className="h-8 px-2 rounded-l-[4px] border border-[#8790A1] bg-white text-[13px]" aria-label="Search column">
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
        <button className="h-8 px-3 rounded-[4px] border border-[#8790A1] bg-white text-[14px] font-bold text-[#1B1D21] hover:bg-[#F1F3F5]">Actions <ChevronDown size={13} className="inline -mt-0.5" /></button>
        <button data-agent="sn-list-new" onClick={onNew} className="h-8 px-4 rounded-[4px] bg-[#032D42] hover:bg-[#0B3F59] text-white text-[14px] font-bold">New</button>
      </div>
      {/* breadcrumb */}
      <div className="h-[38px] shrink-0 flex items-center gap-2 px-3 border-b border-[#DADDE2] text-[13px]">
        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#EDEFF2] text-[#2E3238]" aria-label="Show / hide filter"><Filter size={15} /></button>
        <span className="text-[#5B616B]">
          <button className="text-[#1F6FB2] hover:underline" onClick={() => { onFilter('all'); setQuery(''); setQ('') }} data-agent="sn-crumb-all">All</button>
          {crumbs.map((c, i) => (
            <span key={c}>
              <span className="mx-1.5 text-[#8A9099]">&gt;</span>
              <span className={i === crumbs.length - 1 ? 'text-[#1B1D21]' : 'text-[#1F6FB2]'}>{c}</span>
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
              <th className="w-[30px]"><button className="text-[#5B616B] align-middle" aria-label="Personalize list"><Settings size={15} /></button></th>
              <th className="w-[26px]"><Search size={14} className="text-[#5B616B]" /></th>
              {cols.map((c) => (
                <th key={c} className="text-left font-bold px-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 group">
                    {c}
                    {c === 'Opened' && <ArrowDownNarrowWide size={13} className="text-[#5B616B]" />}
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
                  <td><button className="text-[#5B616B] align-middle hover:text-[#0C66E4]" aria-label="Preview"><Info size={15} /></button></td>
                  <td className="px-2 whitespace-nowrap">
                    <button data-agent={`sn-inc-${r.id}`} aria-label={`Open record ${r.number}`} onClick={() => onOpen(r.id)} className="text-[#1F6FB2] underline-offset-2 hover:underline font-normal">{r.number}</button>
                  </td>
                  <td className="px-2 whitespace-nowrap text-[13px]">{fmtSN(r.opened)}</td>
                  <td className="px-2 max-w-[300px] truncate" title={r.shortDescription}>{r.shortDescription}</td>
                  <td className="px-2 whitespace-nowrap"><span className="text-[#1F6FB2]">{person(r.callerId).name}</span></td>
                  <td className="px-2"><PriorityCell p={r.priority} /></td>
                  <td className="px-2 whitespace-nowrap">{r.state}{r.closeCode === 'Duplicate' && <span className="ml-1 text-[12px] text-[#5B616B]">(Duplicate)</span>}</td>
                  <td className="px-2 whitespace-nowrap">{r.category}</td>
                  <td className="px-2 whitespace-nowrap">{r.assignmentGroup ? <span className="text-[#1F6FB2]">{r.assignmentGroup}</span> : <span className="text-[#8A9099]">(empty)</span>}</td>
                  <td className="px-2 whitespace-nowrap">{r.assignedTo ? <span className="text-[#1F6FB2]">{r.assignedTo}</span> : <span className="text-[#8A9099]">(empty)</span>}</td>
                  <td className="px-2 whitespace-nowrap text-[13px]">
                    <span className="inline-flex items-center gap-1.5">{fmtSN(r.updated)} {r.updatedBy === 'hworker' && <HWChip small />}</span>
                  </td>
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
            if (e.target.value === 'update') onUpdateSelected(Array.from(sel))
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
        <div className="flex-1" />
        <Pager />
      </div>
    </div>
  )
}
