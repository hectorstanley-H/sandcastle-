/** Generic Fiori elements List Report + Object Page scaffolding. */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Search, Settings2, Download, ArrowUpDown, Check, ArrowUp, ArrowDown } from 'lucide-react'
import { useDesk } from '@/os/context'
import { Btn, Input, Label, Select, Dropdown, MenuItem, MenuSep } from './ui'

export interface Col<T> {
  label: string
  render: (r: T) => ReactNode
  align?: 'left' | 'right'
  w?: string
  /** value used by the sort dialog (column is not sortable without it) */
  sort?: (r: T) => string | number
}

type Variant = { name: string; q: string; f: Record<string, string> }
const loadVariants = (k: string): Variant[] => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? '[]')
  } catch {
    return []
  }
}

export function ListReport<T extends { id: string }>({
  title, rows, cols, filters, onOpen, agentPrefix, actions, searchKeys, tableTitle, flash, initialFilters,
}: {
  title: string
  rows: T[]
  cols: Col<T>[]
  filters: { label: string; key: string; options: string[] }[]
  onOpen: (r: T) => void
  agentPrefix: string
  /** toolbar actions; a function receives the selected rows */
  actions?: ReactNode | ((sel: T[], clear: () => void) => ReactNode)
  searchKeys: (r: T) => string
  tableTitle: string
  flash?: (r: T) => boolean
  /** filter values applied when the app opens (e.g. from a launchpad KPI tile) */
  initialFilters?: Record<string, string>
}) {
  const { toast } = useDesk()
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>(initialFilters ?? {})
  const [applied, setApplied] = useState<{ q: string; f: Record<string, string> }>({ q: '', f: initialFilters ?? {} })
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [shownFilters, setShownFilters] = useState<Set<string>>(new Set(filters.map((f) => f.key)))
  const vKey = `sap-variants-${agentPrefix}`
  const [variants, setVariants] = useState<Variant[]>(() => loadVariants(vKey))
  const [variant, setVariant] = useState('Standard')
  const [naming, setNaming] = useState<string | null>(null)

  const list = useMemo(() => {
    const q = applied.q.toLowerCase()
    const out = rows.filter((r: any) => (!q || searchKeys(r).toLowerCase().includes(q)) && Object.entries(applied.f).every(([k, v]) => !v || String(r[k]) === v))
    const c = sort && cols.find((x) => x.label === sort.col)
    if (c?.sort) {
      const key = c.sort
      out.sort((a, b) => {
        const x = key(a)
        const y = key(b)
        return (x < y ? -1 : x > y ? 1 : 0) * sort!.dir
      })
    }
    return out
  }, [rows, applied, sort])
  const go = () => setApplied({ q: search, f: draft })
  const visCols = cols.filter((c) => !hidden.has(c.label))
  const selected = list.filter((r) => sel.has(r.id))
  const clear = () => setSel(new Set())
  const allSel = list.length > 0 && selected.length === list.length

  const applyVariant = (v: Variant | null) => {
    const f = v?.f ?? {}
    setVariant(v?.name ?? 'Standard')
    setSearch(v?.q ?? '')
    setDraft(f)
    setApplied({ q: v?.q ?? '', f })
  }
  const saveVariant = () => {
    const name = (naming ?? '').trim()
    if (!name || name === 'Standard') return
    const next = [...variants.filter((v) => v.name !== name), { name, q: search, f: draft }]
    setVariants(next)
    try {
      localStorage.setItem(vKey, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
    setVariant(name)
    setNaming(null)
  }
  const exportRows = () =>
    toast({ appId: 'sap', title: 'Export to Spreadsheet', body: `${list.length} ${tableTitle.toLowerCase()} exported to ${tableTitle.replace(/\s+/g, '_')}.xlsx` })

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="bg-white shrink-0 px-8 pt-4 pb-4 shadow-[0_0.125rem_0.25rem_rgba(34,53,72,0.08)] relative z-10">
        <div className="text-[12px] text-[#556b82] mb-1">{title}</div>
        <Dropdown
          width={260}
          trigger={(_, toggle) => (
            <button onClick={toggle} className="flex items-center gap-1 text-[20px] font-bold text-[#1d2d3e]">{variant} <ChevronDown className="w-4 h-4 text-[#0064d9]" /></button>
          )}
        >
          {(close) => (
            <>
              <div className="px-3 pt-1 pb-1 text-[12px] font-semibold text-[#556b82] uppercase tracking-wide">My Views</div>
              <MenuItem active={variant === 'Standard'} icon={variant === 'Standard' ? <Check className="w-4 h-4" /> : null} onClick={() => { applyVariant(null); close() }}>Standard</MenuItem>
              {variants.map((v) => (
                <MenuItem key={v.name} active={variant === v.name} icon={variant === v.name ? <Check className="w-4 h-4" /> : null} onClick={() => { applyVariant(v); close() }}>{v.name}</MenuItem>
              ))}
              <MenuSep />
              {naming === null ? (
                <MenuItem onClick={() => setNaming('')}>Save As…</MenuItem>
              ) : (
                <div className="px-3 py-2 flex gap-2">
                  <Input autoFocus aria-label="View name" placeholder="View name" value={naming} onChange={(e) => setNaming(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (saveVariant(), close())} />
                  <Btn kind="emph" onClick={() => { saveVariant(); close() }}>Save</Btn>
                </div>
              )}
              {variants.length > 0 && (
                <MenuItem
                  onClick={() => {
                    setVariants([])
                    try {
                      localStorage.removeItem(vKey)
                    } catch {
                      /* storage unavailable */
                    }
                    applyVariant(null)
                    close()
                  }}
                >
                  Manage Views — delete all saved views
                </MenuItem>
              )}
            </>
          )}
        </Dropdown>
        <div className="flex items-end gap-4 mt-3 flex-wrap">
          <div className="w-[220px]">
            <Label>Search</Label>
            <div className="relative">
              <Input data-agent={`${agentPrefix}-search`} aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Search" />
              <Search className="w-4 h-4 absolute right-2 top-[5px] text-[#556b82]" />
            </div>
          </div>
          {filters.filter((f) => shownFilters.has(f.key)).map((f) => (
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
          <Dropdown
            align="right"
            width={260}
            trigger={(_, toggle) => <Btn kind="transparent" onClick={toggle}>Adapt Filters ({filters.length + 1})</Btn>}
          >
            {() => (
              <>
                <div className="px-3 pt-1 pb-1 text-[12px] font-semibold text-[#556b82] uppercase tracking-wide">Filters shown in the filter bar</div>
                <label className="flex items-center gap-2 px-3 h-9 opacity-60"><input type="checkbox" checked readOnly className="w-4 h-4 accent-[#0064d9]" /> Search</label>
                {filters.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 px-3 h-9 hover:bg-[#eaecee] cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[#0064d9]"
                      checked={shownFilters.has(f.key)}
                      onChange={(e) => {
                        const n = new Set(shownFilters)
                        if (e.target.checked) n.add(f.key)
                        else {
                          n.delete(f.key)
                          setDraft((d) => ({ ...d, [f.key]: '' }))
                        }
                        setShownFilters(n)
                      }}
                    />
                    {f.label}
                  </label>
                ))}
              </>
            )}
          </Dropdown>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-8 py-4">
        <div className="bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)]">
          <div className="h-12 px-4 flex items-center gap-2 border-b border-[#e5e5e5]">
            <div className="text-[16px] font-bold">{tableTitle} ({list.length})</div>
            {selected.length > 0 && <span className="text-[13px] text-[#556b82]">{selected.length} selected</span>}
            <div className="flex-1" />
            {typeof actions === 'function' ? actions(selected, clear) : actions}
            <Dropdown
              align="right"
              width={250}
              trigger={(_, toggle) => (
                <button onClick={toggle} aria-label="Sort" title="Sort" className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]"><ArrowUpDown className="w-4 h-4" /></button>
              )}
            >
              {(close) => (
                <>
                  <div className="px-3 pt-1 pb-1 text-[12px] font-semibold text-[#556b82] uppercase tracking-wide">Sort</div>
                  <MenuItem active={!sort} onClick={() => { setSort(null); close() }}>None</MenuItem>
                  {cols.filter((c) => c.sort).map((c) => (
                    <MenuItem
                      key={c.label}
                      active={sort?.col === c.label}
                      icon={sort?.col === c.label ? sort.dir === 1 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" /> : null}
                      onClick={() => setSort((s) => (s?.col === c.label ? { col: c.label, dir: s.dir === 1 ? -1 : 1 } : { col: c.label, dir: 1 }))}
                    >
                      {c.label}
                    </MenuItem>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown
              align="right"
              width={250}
              trigger={(_, toggle) => (
                <button onClick={toggle} aria-label="View Settings" title="View Settings" className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]"><Settings2 className="w-4 h-4" /></button>
              )}
            >
              {() => (
                <>
                  <div className="px-3 pt-1 pb-1 text-[12px] font-semibold text-[#556b82] uppercase tracking-wide">Columns</div>
                  {cols.map((c, i) => (
                    <label key={c.label} className={`flex items-center gap-2 px-3 h-9 hover:bg-[#eaecee] cursor-pointer ${i === 0 ? 'opacity-60 pointer-events-none' : ''}`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#0064d9]"
                        checked={!hidden.has(c.label)}
                        onChange={(e) => {
                          const n = new Set(hidden)
                          if (e.target.checked) n.delete(c.label)
                          else n.add(c.label)
                          setHidden(n)
                        }}
                      />
                      {c.label}
                    </label>
                  ))}
                </>
              )}
            </Dropdown>
            <button onClick={exportRows} aria-label="Export to Spreadsheet" title="Export to Spreadsheet" className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]"><Download className="w-4 h-4" /></button>
          </div>
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="h-[33px] border-b border-[#a8b2bd]">
                <th className="w-10 text-center">
                  <input type="checkbox" checked={allSel} onChange={(e) => setSel(e.target.checked ? new Set(list.map((r) => r.id)) : new Set())} className="w-4 h-4 accent-[#0064d9] align-middle" aria-label="Select all" />
                </th>
                {visCols.map((c) => (
                  <th key={c.label} className="px-2 font-semibold whitespace-nowrap" style={{ textAlign: c.align ?? 'left', width: c.w }}>
                    {c.label}
                    {sort?.col === c.label && (sort.dir === 1 ? <ArrowUp className="w-3.5 h-3.5 inline ml-1 text-[#556b82]" /> : <ArrowDown className="w-3.5 h-3.5 inline ml-1 text-[#556b82]" />)}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={visCols.length + 2} className="h-16 text-center text-[14px] text-[#556b82]">No data found. Try adjusting the search or filter parameters.</td></tr>
              )}
              {list.map((r) => (
                <tr key={r.id} role="row" data-agent={`${agentPrefix}-row-${r.id}`} aria-label={r.id} onClick={() => onOpen(r)} className={`h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] ${sel.has(r.id) ? 'bg-[#ebf8ff]' : ''} ${flash?.(r) ? 'flash-new bg-[#f1ecf9]' : ''}`}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={sel.has(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const n = new Set(sel)
                        if (e.target.checked) n.add(r.id)
                        else n.delete(r.id)
                        setSel(n)
                      }}
                      className="w-4 h-4 accent-[#0064d9]"
                      aria-label="Select"
                    />
                  </td>
                  {visCols.map((c) => (
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
  const scroller = useRef<HTMLDivElement>(null)
  const jump = (t: string) => {
    setSel(t)
    const el = scroller.current?.querySelector(`[data-section="${CSS.escape(t)}"]`) as HTMLElement | null
    if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' })
  }
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
            <button key={s.title} onClick={() => jump(s.title)} className={`relative h-11 px-3 text-[14px] ${sel === s.title ? 'text-[#0064d9] font-bold' : 'text-[#1d2d3e] hover:text-[#0064d9]'}`}>
              {s.title}
              {sel === s.title && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t bg-[#0064d9]" />}
            </button>
          ))}
        </div>
      </div>
      <div ref={scroller} className="flex-1 overflow-auto px-8 py-5 relative">
        {sections.map((s) => (
          <section key={s.title} data-section={s.title} className="mb-8">
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
