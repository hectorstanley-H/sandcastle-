/** Generic Fiori elements List Report + Object Page scaffolding. */
import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Search, Settings2, Download, ArrowUpDown } from 'lucide-react'
import { Btn, Input, Label, Select } from './ui'

export interface Col<T> {
  label: string
  render: (r: T) => ReactNode
  align?: 'left' | 'right'
  w?: string
}

export function ListReport<T extends { id: string }>({
  title, rows, cols, filters, onOpen, agentPrefix, actions, searchKeys, tableTitle, flash,
}: {
  title: string
  rows: T[]
  cols: Col<T>[]
  filters: { label: string; key: string; options: string[] }[]
  onOpen: (r: T) => void
  agentPrefix: string
  actions?: ReactNode
  searchKeys: (r: T) => string
  tableTitle: string
  flash?: (r: T) => boolean
}) {
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<{ q: string; f: Record<string, string> }>({ q: '', f: {} })
  const list = useMemo(() => {
    const q = applied.q.toLowerCase()
    return rows.filter((r: any) => (!q || searchKeys(r).toLowerCase().includes(q)) && Object.entries(applied.f).every(([k, v]) => !v || String(r[k]) === v))
  }, [rows, applied])
  const go = () => setApplied({ q: search, f: draft })
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-white shrink-0 px-8 pt-4 pb-4 shadow-[0_0.125rem_0.25rem_rgba(34,53,72,0.08)] relative z-10">
        <div className="text-[12px] text-[#556b82] mb-1">{title}</div>
        <button className="flex items-center gap-1 text-[20px] font-bold text-[#1d2d3e]">Standard <ChevronDown className="w-4 h-4 text-[#0064d9]" /></button>
        <div className="flex items-end gap-4 mt-3 flex-wrap">
          <div className="w-[220px]">
            <Label>Search</Label>
            <div className="relative">
              <Input data-agent={`${agentPrefix}-search`} aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Search" />
              <Search className="w-4 h-4 absolute right-2 top-[5px] text-[#556b82]" />
            </div>
          </div>
          {filters.map((f) => (
            <div key={f.key} className="w-[200px]">
              <Label>{f.label}</Label>
              <Select aria-label={f.label} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                <option value="" />
                {f.options.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
          ))}
          <div className="flex-1" />
          <Btn data-agent={`${agentPrefix}-go`} kind="emph" onClick={go}>Go</Btn>
          <Btn kind="transparent">Adapt Filters ({filters.length + 1})</Btn>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-8 py-4">
        <div className="bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)]">
          <div className="h-12 px-4 flex items-center gap-2 border-b border-[#e5e5e5]">
            <div className="text-[16px] font-bold">{tableTitle} ({list.length})</div>
            <div className="flex-1" />
            {actions}
            <button className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]"><ArrowUpDown className="w-4 h-4" /></button>
            <button className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]"><Settings2 className="w-4 h-4" /></button>
            <button className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]"><Download className="w-4 h-4" /></button>
          </div>
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="h-[33px] border-b border-[#a8b2bd]">
                <th className="w-10" />
                {cols.map((c) => (
                  <th key={c.label} className="px-2 font-semibold whitespace-nowrap" style={{ textAlign: c.align ?? 'left', width: c.w }}>{c.label}</th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} role="row" data-agent={`${agentPrefix}-row-${r.id}`} aria-label={r.id} onClick={() => onOpen(r)} className={`h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] ${flash?.(r) ? 'flash-new bg-[#f1ecf9]' : ''}`}>
                  <td className="text-center"><input type="checkbox" onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-[#0064d9]" aria-label="Select" /></td>
                  {cols.map((c) => (
                    <td key={c.label} className="px-2 whitespace-nowrap" style={{ textAlign: c.align ?? 'left' }}>{c.render(r)}</td>
                  ))}
                  <td className="text-[#556b82]"><ChevronRight className="w-4 h-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function ObjectPage({ crumbs, title, subtitle, status, facets, sections, actions, badge }: {
  crumbs: { label: string; onClick: () => void }[]
  title: ReactNode
  subtitle?: ReactNode
  status?: ReactNode
  facets: { label: string; value: ReactNode }[]
  sections: { title: string; body: ReactNode }[]
  actions?: ReactNode
  badge?: ReactNode
}) {
  const [sel, setSel] = useState(sections[0]?.title)
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-white shrink-0 px-8 pt-3 shadow-[0_0.125rem_0.25rem_rgba(34,53,72,0.08)] relative z-10">
        <div className="text-[12px] mb-1 flex gap-1">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <button onClick={c.onClick} className="text-[#0064d9] hover:underline">{c.label}</button>
              <span className="text-[#556b82]">/</span>
            </span>
          ))}
        </div>
        <div className="flex items-start gap-3">
          <div>
            <div className="text-[20px] font-bold leading-tight flex items-center gap-2">{title} {badge}</div>
            {subtitle && <div className="text-[14px] text-[#556b82] mt-0.5">{subtitle}</div>}
          </div>
          <div className="flex-1" />
          <div className="flex gap-2">{actions}</div>
        </div>
        <div className="flex gap-12 mt-4">
          {status && (
            <div>
              <div className="text-[14px] text-[#556b82] mb-1">Status</div>
              {status}
            </div>
          )}
          {facets.map((f) => (
            <div key={f.label}>
              <div className="text-[14px] text-[#556b82] mb-1">{f.label}</div>
              <div className="text-[14px]">{f.value}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-3 -mx-3">
          {sections.map((s) => (
            <button key={s.title} onClick={() => setSel(s.title)} className={`relative h-11 px-3 text-[14px] ${sel === s.title ? 'text-[#0064d9] font-bold' : 'text-[#1d2d3e] hover:text-[#0064d9]'}`}>
              {s.title}
              {sel === s.title && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t bg-[#0064d9]" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-8 py-5">
        {sections.map((s) => (
          <section key={s.title} className="mb-8">
            <div className="text-[16px] font-bold mb-3">{s.title}</div>
            {s.body}
          </section>
        ))}
      </div>
    </div>
  )
}

export function Panel({ children }: { children: ReactNode }) {
  return <div className="bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] overflow-hidden">{children}</div>
}

export function FormGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="grid grid-cols-3 gap-x-10 gap-y-4">
      {items.map(([k, v]) => (
        <div key={k}>
          <div className="text-[14px] text-[#556b82] mb-0.5">{k}:</div>
          <div className="text-[14px]">{v}</div>
        </div>
      ))}
    </div>
  )
}
