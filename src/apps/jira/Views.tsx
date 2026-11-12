import { useMemo, useState, type ReactNode } from 'react'
import { Search, Star, ChevronDown, ChevronRight, ChevronLeft, Save, Trash2 } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { Lozenge, HWBadge, btnDefault, btnPrimary, btnSubtle, inputAtl, Dialog } from './atlassian'
import { type Issue, type Sprint, type SavedFilter, COLS, STATUS_TONE, PRIORITIES, TypeIcon, PriorityIcon, UserAv, fmtD, ago, runJql, useFilters, usePrefs, useJiraFlash, updateIssue } from './shared'

/* ─────────────────────────── issue table (List view + filter results) ─────────────────────────── */

const COLS_LIST = ['Type', 'Key', 'Summary', 'Status', 'Assignee', 'Priority', 'Labels', 'Sprint', 'Created', 'Updated'] as const
type LCol = (typeof COLS_LIST)[number]

export function IssueTable({ rows, sprints, onOpen, sortable = true, editableStatus }: { rows: Issue[]; sprints: Sprint[]; onOpen: (k: string) => void; sortable?: boolean; editableStatus?: boolean }) {
  const [sort, setSort] = useState<{ col: LCol; desc: boolean } | null>(null)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const v = (i: Issue): any =>
      sort.col === 'Key' ? Number(i.key.split('-')[1]) : sort.col === 'Status' ? COLS.indexOf(i.status) : sort.col === 'Priority' ? PRIORITIES.indexOf(i.priority) : sort.col === 'Assignee' ? (i.assignee ? person(i.assignee).name : '~') : sort.col === 'Created' ? +new Date(i.created) : sort.col === 'Updated' ? +new Date(i.updated) : sort.col === 'Sprint' ? sprints.find((s) => s.id === i.sprintId)?.name ?? '~' : sort.col === 'Labels' ? i.labels.join(',') : sort.col === 'Type' ? i.type : i.summary.toLowerCase()
    return [...rows].sort((a, b) => {
      const x = v(a)
      const y = v(b)
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.desc ? -1 : 1)
    })
  }, [rows, sort, sprints])
  return (
    <table className="w-full text-[14px] border border-[#0B120E24]">
      <thead>
        <tr className="h-9 bg-[#F8F8F8] text-left text-[12px] text-[#505258] font-semibold">
          {COLS_LIST.map((h) => (
            <th key={h} className={`px-2 font-semibold whitespace-nowrap ${sortable ? 'cursor-pointer select-none hover:bg-[#0515240F]' : ''}`} onClick={() => sortable && setSort((s) => (s?.col === h ? { col: h, desc: !s.desc } : { col: h, desc: false }))}>
              {h} {sort?.col === h && (sort.desc ? '↓' : '↑')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((i) => (
          <tr key={i.id} onClick={() => onOpen(i.key)} className="h-10 border-t border-[#0B120E14] hover:bg-[#F8F8F8] cursor-pointer" data-agent={`jira-list-row-${i.key}`}>
            <td className="px-2"><TypeIcon type={i.type} /></td>
            <td className="px-2 text-[#1868DB] whitespace-nowrap">{i.key}</td>
            <td className="px-2 max-w-[380px] truncate">{i.summary} {i.createdBy === 'hworker' && <HWBadge />}</td>
            <td className="px-2" onClick={(e) => editableStatus && e.stopPropagation()}>
              {editableStatus ? (
                <select value={i.status} onChange={(e) => updateIssue(i, { status: e.target.value })} aria-label={`Status of ${i.key}`} className="h-6 px-1 rounded-[3px] text-[11px] font-semibold uppercase bg-[#0515240F] outline-none">{COLS.map((c) => <option key={c}>{c}</option>)}</select>
              ) : <Lozenge tone={STATUS_TONE[i.status]}>{i.status}</Lozenge>}
            </td>
            <td className="px-2 whitespace-nowrap"><span className="flex items-center gap-2"><UserAv id={i.assignee} size={22} />{i.assignee ? person(i.assignee).name : 'Unassigned'}</span></td>
            <td className="px-2"><span className="flex items-center gap-1"><PriorityIcon p={i.priority} />{i.priority}</span></td>
            <td className="px-2">{i.labels.map((l) => <span key={l} className="mr-1 px-1 rounded-[3px] bg-[#0515240F] text-[12px]">{l}</span>)}</td>
            <td className="px-2 text-[13px] whitespace-nowrap">{sprints.find((s) => s.id === i.sprintId)?.name ?? ''}</td>
            <td className="px-2 text-[13px] text-[#505258] whitespace-nowrap">{fmtD(i.created)}</td>
            <td className="px-2 text-[13px] text-[#505258] whitespace-nowrap">{fmtD(i.updated)}</td>
          </tr>
        ))}
        {!sorted.length && <tr><td colSpan={COLS_LIST.length} className="py-12 text-center text-[#505258]">No work items were found to match your search</td></tr>}
      </tbody>
    </table>
  )
}

export function ListView({ issues, onOpen, sprints }: { issues: Issue[]; onOpen: (k: string) => void; sprints: Sprint[] }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [assignee, setAssignee] = useState('')
  const rows = [...issues]
    .sort((a, b) => +new Date(b.created) - +new Date(a.created))
    .filter((i) => (!q || (i.key + ' ' + i.summary).toLowerCase().includes(q.toLowerCase())) && (!status || i.status === status) && (!type || i.type === type) && (!assignee || (assignee === '__none' ? !i.assignee : i.assignee === assignee)))
  const sel = 'h-8 px-2 rounded-[4px] border border-[#8C8F97] text-[14px] bg-white outline-none'
  return (
    <div className="flex-1 min-h-0 flex flex-col px-6 py-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#505258]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search list" aria-label="Search list" className="h-8 w-[200px] pl-7 pr-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB]" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel} aria-label="Status filter"><option value="">Status: All</option>{COLS.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel} aria-label="Type filter"><option value="">Type: All</option>{['Story', 'Task', 'Bug', 'Subtask'].map((c) => <option key={c}>{c}</option>)}</select>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={sel} aria-label="Assignee filter"><option value="">Assignee: All</option><option value="__none">Unassigned</option>{PEOPLE.filter((p) => !p.external && issues.some((i) => i.assignee === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <div className="flex-1" />
        <span className="text-[13px] text-[#505258]">{rows.length} work items</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <IssueTable rows={rows} sprints={sprints} onOpen={onOpen} editableStatus />
      </div>
    </div>
  )
}

/* ─────────────────────────── Filters (JQL) ─────────────────────────── */

export function FiltersPage({ issues, sprints, onOpen, initial }: { issues: Issue[]; sprints: Sprint[]; onOpen: (k: string) => void; initial?: { jql?: string; filterId?: string } }) {
  const flash = useJiraFlash()
  const filters = useFilters()
  const { prefs, toggleFilter } = usePrefs()
  const startFilter = filters.find((f) => f.id === initial?.filterId)
  const [cur, setCur] = useState<SavedFilter | null>(startFilter ?? (initial?.jql ? null : filters[0]))
  const [jql, setJql] = useState(initial?.jql ?? startFilter?.jql ?? filters[0].jql)
  const [applied, setApplied] = useState(jql)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const res = runJql(applied, issues, sprints)
  const run = () => setApplied(jql)
  const pick = (f: SavedFilter) => {
    setCur(f)
    setJql(f.jql)
    setApplied(f.jql)
  }
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="w-[240px] shrink-0 border-r border-[#0B120E24] px-2 py-4 overflow-auto">
        <div className="px-2 text-[12px] font-semibold text-[#6B6E76] uppercase mb-1">Starred filters</div>
        {filters.filter((f) => prefs.starredFilters.includes(f.id)).map((f) => <button key={f.id} onClick={() => pick(f)} className={`w-full text-left h-8 px-2 rounded-[4px] text-[14px] truncate ${cur?.id === f.id ? 'bg-[#E9F2FE] text-[#1868DB] font-medium' : 'hover:bg-[#0515240F]'}`}>{f.name}</button>)}
        <div className="px-2 text-[12px] font-semibold text-[#6B6E76] uppercase mt-4 mb-1">All filters</div>
        {filters.map((f) => (
          <div key={f.id} className={`group flex items-center h-8 rounded-[4px] ${cur?.id === f.id ? 'bg-[#E9F2FE] text-[#1868DB] font-medium' : 'hover:bg-[#0515240F]'}`}>
            <button data-agent={`jira-filter-${f.id}`} onClick={() => pick(f)} className="flex-1 min-w-0 text-left px-2 text-[14px] truncate">{f.name}</button>
            <button aria-label={prefs.starredFilters.includes(f.id) ? `Unstar ${f.name}` : `Star ${f.name}`} onClick={() => toggleFilter(f.id)} className={`w-6 h-6 flex items-center justify-center ${prefs.starredFilters.includes(f.id) ? 'text-[#E2B203]' : 'text-[#B7B9BE] opacity-0 group-hover:opacity-100'}`}><Star size={13} fill={prefs.starredFilters.includes(f.id) ? '#E2B203' : 'none'} /></button>
            {!f.builtIn && <button aria-label={`Delete ${f.name}`} onClick={() => { db.remove('jira.filters', f.id); if (cur?.id === f.id) setCur(null); flash(`Filter “${f.name}” deleted`) }} className="w-6 h-6 flex items-center justify-center text-[#B7B9BE] opacity-0 group-hover:opacity-100 hover:text-[#AE2E24]"><Trash2 size={13} /></button>}
          </div>
        ))}
      </div>
      <div className="flex-1 min-w-0 flex flex-col px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[20px] font-semibold">{cur?.name ?? 'Search work items'}</h2>
          {cur && jql !== cur.jql && <span className="text-[12px] text-[#7F5F01] bg-[#F8E6A0] rounded px-1.5">Edited</span>}
          <div className="flex-1" />
          <button className={btnDefault + ' flex items-center gap-1.5'} onClick={() => { setName(cur && !cur.builtIn ? cur.name : ''); setSaving(true) }}><Save size={14} /> {cur && !cur.builtIn ? 'Save changes' : 'Save as'}</button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="h-9 px-2 rounded-[4px] bg-[#0515240F] text-[12px] font-bold flex items-center">JQL</span>
          <input data-agent="jira-jql" aria-label="JQL query" value={jql} onChange={(e) => setJql(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} className={inputAtl + ' font-mono text-[13px]'} placeholder='e.g. assignee = currentUser() AND status != Done' />
          <button data-agent="jira-jql-search" className={btnPrimary} onClick={run}>Search</button>
        </div>
        <div className="text-[12px] text-[#6B6E76] mt-1">Fields: project, type, status, priority, assignee, reporter, labels, sprint, epic, text, summary, created, updated, points · Operators: =, !=, ~, in (…), not in (…), is EMPTY, &gt;=, &lt;= · ORDER BY field ASC|DESC</div>
        {!res.ok ? (
          <div className="mt-4 px-3 py-2 rounded-[4px] bg-[#FFECEB] text-[#AE2E24] text-[14px]">{res.error}</div>
        ) : (
          <>
            <div className="text-[13px] text-[#505258] mt-4 mb-2">{res.rows.length} work item{res.rows.length === 1 ? '' : 's'}</div>
            <div className="flex-1 min-h-0 overflow-auto"><IssueTable rows={res.rows} sprints={sprints} onOpen={onOpen} sortable={!/order by/i.test(applied)} /></div>
          </>
        )}
      </div>
      {saving && (
        <Dialog
          title="Save filter"
          onClose={() => setSaving(false)}
          footer={<><button className={btnSubtle} onClick={() => setSaving(false)}>Cancel</button><button className={btnPrimary} disabled={!name.trim()} onClick={() => {
            if (cur && !cur.builtIn) {
              db.update('jira.filters', cur.id, { name: name.trim(), jql })
              setCur({ ...cur, name: name.trim(), jql })
            } else {
              const f = { id: `flt-${Date.now().toString(36)}`, name: name.trim(), jql, owner: ME.id }
              db.insert('jira.filters', f)
              setCur(f)
            }
            setSaving(false)
            flash(`Filter “${name.trim()}” saved`)
          }}>Save</button></>}
        >
          <div className="text-[12px] font-semibold text-[#505258] mb-1">Name <span className="text-[#C9372C]">*</span></div>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputAtl} aria-label="Filter name" />
          <div className="text-[12px] text-[#6B6E76] mt-2 font-mono break-all">{jql}</div>
        </Dialog>
      )}
    </div>
  )
}

/* ─────────────────────────── Summary ─────────────────────────── */

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <div className={`rounded-[8px] border border-[#0B120E24] p-4 ${className}`}><div className="text-[16px] font-semibold mb-3">{title}</div>{children}</div>
}

export function SummaryView({ issues, sprints, onOpen, onFilter }: { issues: Issue[]; sprints: Sprint[]; onOpen: (k: string) => void; onFilter: (jql: string) => void }) {
  const active = sprints.find((s) => s.state === 'active')
  const work = issues.filter((i) => i.type !== 'Epic')
  const week = 7 * 864e5
  const tiles: [string, number, string, string][] = [
    ['completed', work.filter((i) => i.status === 'Done' && Date.now() - +new Date(i.resolvedAt ?? i.updated) < week).length, 'in the last 7 days', 'status = Done AND updated >= -7d'],
    ['updated', work.filter((i) => Date.now() - +new Date(i.updated) < week).length, 'in the last 7 days', 'updated >= -7d ORDER BY updated DESC'],
    ['created', work.filter((i) => Date.now() - +new Date(i.created) < week).length, 'in the last 7 days', 'created >= -7d ORDER BY created DESC'],
    ['due soon', work.filter((i) => i.status !== 'Done' && i.due && +new Date(i.due) - Date.now() < week).length, 'in the next 7 days', 'status != Done ORDER BY updated DESC'],
  ]
  const total = work.length || 1
  const byStatus = COLS.map((c) => [c, work.filter((i) => i.status === c).length] as const)
  const colors: Record<string, string> = { 'To Do': '#8C8F97', 'In Progress': '#669DF1', 'In Review': '#9F8FEF', Done: '#4BCE97' }
  let acc = 0
  const conic = byStatus.map(([c, n]) => { const s = acc; acc += (n / total) * 360; return `${colors[c]} ${s}deg ${acc}deg` }).join(', ')
  const types = ['Story', 'Task', 'Bug', 'Subtask'].map((t) => [t, work.filter((i) => i.type === t).length] as const).filter(([, n]) => n)
  const load = Array.from(new Set(work.filter((i) => i.status !== 'Done').map((i) => i.assignee))).map((a) => [a, work.filter((i) => i.status !== 'Done' && i.assignee === a).length] as const).sort((a, b) => b[1] - a[1])
  const recent = [...issues].sort((a, b) => +new Date(b.updated) - +new Date(a.updated)).slice(0, 8)
  const epics = issues.filter((i) => i.type === 'Epic')
  return (
    <div className="flex-1 overflow-auto px-6 py-5">
      <div className="grid grid-cols-4 gap-4">
        {tiles.map(([a, b, c, q]) => (
          <button key={a} onClick={() => onFilter(q)} className="text-left rounded-[8px] border border-[#0B120E24] p-4 hover:bg-[#F8F8F8]"><div className="text-[24px] font-semibold">{b} {a}</div><div className="text-[13px] text-[#505258]">{c}</div></button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Card title="Status overview">
          <div className="flex items-center gap-8">
            <div className="w-[150px] h-[150px] rounded-full relative" style={{ background: `conic-gradient(${conic})` }}>
              <div className="absolute inset-[22px] rounded-full bg-white flex flex-col items-center justify-center"><div className="text-[24px] font-semibold">{work.length}</div><div className="text-[12px] text-[#505258]">Total work items</div></div>
            </div>
            <div className="space-y-2">
              {byStatus.map(([c, n]) => <button key={c} onClick={() => onFilter(`status = "${c}"`)} className="flex items-center gap-2 text-[14px] hover:underline"><span className="w-3 h-3 rounded-sm" style={{ background: colors[c] }} />{c}: {n}</button>)}
            </div>
          </div>
        </Card>
        <Card title="Recent activity">
          <div className="space-y-2.5">
            {recent.map((i) => (
              <button key={i.id} onClick={() => onOpen(i.key)} className="w-full flex items-center gap-2 text-left text-[14px] hover:bg-[#F8F8F8] rounded px-1">
                <UserAv id={i.assignee || i.reporter} size={24} />
                <span className="flex-1 min-w-0 truncate"><span className="text-[#1868DB]">{i.key}</span> {i.summary}</span>
                <Lozenge tone={STATUS_TONE[i.status]}>{i.status}</Lozenge>
                <span className="text-[12px] text-[#6B6E76] w-[90px] text-right">{ago(i.updated)}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Types of work">
          {types.map(([t, n]) => <div key={t} className="flex items-center gap-3 mb-2 text-[14px]"><span className="w-[90px] flex items-center gap-2"><TypeIcon type={t} />{t}</span><div className="flex-1 h-3 rounded bg-[#0515240F]"><div className="h-full rounded bg-[#669DF1]" style={{ width: `${(n / total) * 100}%` }} /></div><span className="w-10 text-right text-[13px]">{Math.round((n / total) * 100)}%</span></div>)}
        </Card>
        <Card title="Team workload">
          {load.map(([a, n]) => <button key={a || 'none'} onClick={() => onFilter(a ? `assignee = ${a} AND status != Done` : 'assignee is EMPTY AND status != Done')} className="w-full flex items-center gap-3 mb-2 text-[14px] text-left"><span className="w-[160px] flex items-center gap-2 truncate"><UserAv id={a} size={22} />{a ? person(a).name : 'Unassigned'}</span><div className="flex-1 h-3 rounded bg-[#0515240F]"><div className="h-full rounded bg-[#1868DB]" style={{ width: `${(n / Math.max(1, load[0]?.[1] ?? 1)) * 100}%` }} /></div><span className="w-6 text-right text-[13px]">{n}</span></button>)}
        </Card>
        <Card title="Epic progress" className="col-span-2">
          {epics.map((e) => {
            const kids = work.filter((i) => i.epic === e.summary)
            const d = kids.filter((i) => i.status === 'Done').length
            const p = kids.filter((i) => ['In Progress', 'In Review'].includes(i.status)).length
            return (
              <button key={e.id} onClick={() => onOpen(e.key)} className="w-full flex items-center gap-3 mb-2.5 text-[14px] text-left">
                <span className="w-[260px] flex items-center gap-2 truncate"><TypeIcon type="Epic" />{e.summary}</span>
                <div className="flex-1 h-3 rounded bg-[#0515240F] overflow-hidden flex"><div className="h-full bg-[#4BCE97]" style={{ width: `${(d / Math.max(1, kids.length)) * 100}%` }} /><div className="h-full bg-[#669DF1]" style={{ width: `${(p / Math.max(1, kids.length)) * 100}%` }} /></div>
                <span className="w-[110px] text-right text-[13px] text-[#505258]">{d}/{kids.length} done</span>
              </button>
            )
          })}
        </Card>
      </div>
      {active && <div className="text-[12px] text-[#6B6E76] mt-3">Active sprint: {active.name} · ends {fmtD(active.end)}</div>}
    </div>
  )
}

/* ─────────────────────────── Timeline ─────────────────────────── */

export function TimelineView({ issues, sprints, onOpen }: { issues: Issue[]; sprints: Sprint[]; onOpen: (k: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [scale, setScale] = useState<'weeks' | 'months'>('weeks')
  const epics = issues.filter((i) => i.type === 'Epic')
  const span = (rows: Issue[], e?: Issue) => {
    const sp = rows.map((r) => sprints.find((s) => s.id === r.sprintId)).filter(Boolean) as Sprint[]
    const start = Math.min(+new Date(e?.created ?? Date.now()), ...rows.map((r) => +new Date(r.created)), ...sp.map((s) => +new Date(s.start)))
    const end = Math.max(Date.now() + 7 * 864e5, ...sp.map((s) => +new Date(s.end)), ...rows.map((r) => (r.due ? +new Date(r.due) : 0)))
    return [start, end]
  }
  const all = epics.map((e) => span(issues.filter((i) => i.epic === e.summary), e))
  const t0 = Math.min(...all.map((a) => a[0]), ...sprints.map((s) => +new Date(s.start))) - 3 * 864e5
  const t1 = Math.max(...all.map((a) => a[1]), ...sprints.map((s) => +new Date(s.end))) + 7 * 864e5
  const dayW = scale === 'weeks' ? 18 : 7
  const W = ((t1 - t0) / 864e5) * dayW
  const x = (t: number) => ((t - t0) / 864e5) * dayW
  const ticks: Date[] = []
  const d = new Date(t0)
  d.setHours(0, 0, 0, 0)
  if (scale === 'weeks') d.setDate(d.getDate() - d.getDay() + 1)
  else d.setDate(1)
  while (+d < t1) {
    ticks.push(new Date(d))
    if (scale === 'weeks') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
  }
  const colors = ['#904EE2', '#1868DB', '#E06C00', '#22A06B']
  return (
    <div className="flex-1 min-h-0 flex flex-col px-6 py-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 text-[13px] text-[#505258]">Epics are scheduled from their first work item to the end of the last sprint that contains their work.</div>
        <div className="flex rounded-[4px] border border-[#0B120E24] overflow-hidden text-[13px]">
          {(['weeks', 'months'] as const).map((s) => <button key={s} onClick={() => setScale(s)} className={`h-7 px-3 capitalize ${scale === s ? 'bg-[#E9F2FE] text-[#1868DB] font-medium' : 'hover:bg-[#0515240F]'}`}>{s}</button>)}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto border border-[#0B120E24] rounded-[6px]" data-agent="jira-timeline">
        <div className="flex min-w-max">
          <div className="w-[300px] shrink-0 sticky left-0 z-10 bg-white border-r border-[#0B120E24]">
            <div className="h-[52px] border-b border-[#0B120E24] px-3 flex items-end pb-2 text-[12px] font-semibold text-[#505258]">Work</div>
            {epics.map((e) => {
              const kids = issues.filter((i) => i.epic === e.summary && i.type !== 'Subtask')
              return (
                <div key={e.id}>
                  <div className="h-10 flex items-center gap-1.5 px-2 border-b border-[#0B120E14] text-[14px]">
                    <button aria-label={open.has(e.id) ? 'Collapse' : 'Expand'} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n })} className="w-5 h-5 rounded hover:bg-[#0515240F] flex items-center justify-center">{open.has(e.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                    <TypeIcon type="Epic" />
                    <button onClick={() => onOpen(e.key)} className="truncate hover:underline text-left">{e.key} {e.summary}</button>
                  </div>
                  {open.has(e.id) && kids.map((k) => <div key={k.id} className="h-9 flex items-center gap-1.5 pl-9 pr-2 border-b border-[#0B120E14] text-[13px]"><TypeIcon type={k.type} size={14} /><button onClick={() => onOpen(k.key)} className="truncate hover:underline text-left">{k.key} {k.summary}</button></div>)}
                </div>
              )
            })}
          </div>
          <div className="relative" style={{ width: W }}>
            <div className="h-[26px] border-b border-[#0B120E14] relative">
              {sprints.map((s) => <div key={s.id} className={`absolute top-1 h-[18px] rounded-[3px] text-[11px] px-1.5 truncate ${s.state === 'active' ? 'bg-[#CFE1FD] text-[#09326C]' : s.state === 'closed' ? 'bg-[#DDDEE1] text-[#505258]' : 'bg-[#F8F8F8] text-[#505258] border border-[#0B120E24]'}`} style={{ left: x(+new Date(s.start)), width: Math.max(20, x(+new Date(s.end)) - x(+new Date(s.start)) - 2) }} title={s.name}>{s.name}</div>)}
            </div>
            <div className="h-[26px] border-b border-[#0B120E24] relative text-[11px] text-[#505258]">
              {ticks.map((t) => <span key={+t} className="absolute top-1.5 pl-1 border-l border-[#0B120E24] h-full" style={{ left: x(+t) }}>{scale === 'weeks' ? fmtD(t.toISOString()) : t.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>)}
            </div>
            <div className="absolute top-[52px] bottom-0 w-[2px] bg-[#E2483D] z-[1]" style={{ left: x(Date.now()) }} title="Today" />
            {epics.map((e, n) => {
              const [s, en] = all[n]
              const kids = issues.filter((i) => i.epic === e.summary && i.type !== 'Subtask')
              const done = kids.filter((k) => k.status === 'Done').length
              return (
                <div key={e.id}>
                  <div className="h-10 border-b border-[#0B120E14] relative">
                    <button onClick={() => onOpen(e.key)} className="absolute top-2 h-6 rounded-[4px] text-white text-[12px] px-2 truncate text-left overflow-hidden" style={{ left: x(s), width: Math.max(30, x(en) - x(s)), background: colors[n % colors.length] }} title={`${e.summary}: ${done}/${kids.length} done`}>
                      <span className="absolute left-0 top-0 bottom-0 bg-white/25" style={{ width: `${(done / Math.max(1, kids.length)) * 100}%` }} />
                      <span className="relative">{e.summary}</span>
                    </button>
                  </div>
                  {open.has(e.id) &&
                    kids.map((k) => {
                      const sp = sprints.find((x2) => x2.id === k.sprintId)
                      const ks = sp ? +new Date(sp.start) : +new Date(k.created)
                      const ke = k.due ? +new Date(k.due) : sp ? +new Date(sp.end) : +new Date(k.created) + 5 * 864e5
                      return (
                        <div key={k.id} className="h-9 border-b border-[#0B120E14] relative">
                          <button onClick={() => onOpen(k.key)} className={`absolute top-2 h-5 rounded-[3px] text-[11px] px-1.5 truncate ${k.status === 'Done' ? 'bg-[#BAF3DB] text-[#164B35]' : k.status === 'To Do' ? 'bg-[#DDDEE1]' : 'bg-[#CFE1FD] text-[#09326C]'}`} style={{ left: x(ks), width: Math.max(24, x(ke) - x(ks)) }}>{k.key}</button>
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Calendar ─────────────────────────── */

export function CalendarView({ issues, sprints, onOpen }: { issues: Issue[]; sprints: Sprint[]; onOpen: (k: string) => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })
  const first = new Date(month)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, n) => { const d = new Date(start); d.setDate(start.getDate() + n); return d })
  const dueOf = (i: Issue) => {
    if (i.due) return new Date(i.due)
    const s = sprints.find((x) => x.id === i.sprintId && x.state !== 'closed')
    return s && i.status !== 'Done' ? new Date(s.end) : null
  }
  const work = issues.filter((i) => i.type !== 'Epic')
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const shift = (n: number) => setMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() + n); return d })
  return (
    <div className="flex-1 min-h-0 flex flex-col px-6 py-3">
      <div className="flex items-center gap-2 mb-3">
        <button className={btnDefault} onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setMonth(d) }}>Today</button>
        <button aria-label="Previous month" onClick={() => shift(-1)} className="w-8 h-8 rounded hover:bg-[#0515240F] flex items-center justify-center"><ChevronLeft size={16} /></button>
        <button aria-label="Next month" onClick={() => shift(1)} className="w-8 h-8 rounded hover:bg-[#0515240F] flex items-center justify-center"><ChevronRight size={16} /></button>
        <h2 className="text-[18px] font-semibold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex-1" />
        <span className="text-[12px] text-[#6B6E76]">Showing due dates (sprint end date when no due date is set)</span>
      </div>
      <div className="grid grid-cols-7 text-[12px] font-semibold text-[#505258] border-b border-[#0B120E24]">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}</div>
      <div className="flex-1 min-h-0 overflow-auto grid grid-cols-7 auto-rows-[minmax(110px,1fr)] border-l border-[#0B120E14]" data-agent="jira-calendar">
        {days.map((d) => {
          const items = work.filter((i) => { const due = dueOf(i); return due && same(due, d) })
          const sp = sprints.filter((s) => same(new Date(s.start), d) || same(new Date(s.end), d))
          const out = d.getMonth() !== month.getMonth()
          return (
            <div key={+d} className={`border-r border-b border-[#0B120E14] p-1 min-w-0 ${out ? 'bg-[#F8F8F8]' : ''}`}>
              <div className={`text-[12px] w-6 h-6 rounded-full flex items-center justify-center ${same(d, new Date()) ? 'bg-[#1868DB] text-white font-semibold' : out ? 'text-[#B7B9BE]' : 'text-[#505258]'}`}>{d.getDate()}</div>
              {sp.map((s) => <div key={s.id} className="text-[11px] px-1 rounded bg-[#F3F0FF] text-[#5E4DB2] truncate mb-0.5">{same(new Date(s.start), d) ? '▶ ' : '■ '}{s.name}</div>)}
              {items.slice(0, 3).map((i) => (
                <button key={i.id} onClick={() => onOpen(i.key)} className={`w-full text-left text-[12px] px-1 py-0.5 rounded mb-0.5 truncate flex items-center gap-1 ${i.status === 'Done' ? 'bg-[#DCFFF1]' : 'bg-[#E9F2FE]'} hover:brightness-95`}>
                  <TypeIcon type={i.type} size={12} /><span className={i.status === 'Done' ? 'line-through' : ''}>{i.key}</span> <span className="truncate">{i.summary}</span>
                </button>
              ))}
              {items.length > 3 && <div className="text-[11px] text-[#505258] px-1">+{items.length - 3} more</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────── Reports ─────────────────────────── */

export function ReportsPage({ issues, sprints }: { issues: Issue[]; sprints: Sprint[] }) {
  const active = sprints.find((s) => s.state === 'active')
  const [sid, setSid] = useState(active?.id ?? sprints[0]?.id)
  const sprint = sprints.find((s) => s.id === sid)
  const closed = sprints.filter((s) => s.state === 'closed')
  // burndown
  const items = sprint ? issues.filter((i) => i.sprintId === sprint.id && i.type !== 'Epic' && i.type !== 'Subtask') : []
  const total = items.reduce((a, i) => a + (i.points ?? 0), 0)
  const s0 = sprint ? +new Date(sprint.start) : Date.now()
  const s1 = sprint ? +new Date(sprint.end) : Date.now()
  const nDays = Math.max(1, Math.round((s1 - s0) / 864e5))
  const pts = Array.from({ length: nDays + 1 }, (_, n) => {
    const t = s0 + n * 864e5
    if (t > Date.now() + 864e5) return null
    const done = items.filter((i) => i.status === 'Done' && +new Date(i.resolvedAt ?? i.updated) <= t).reduce((a, i) => a + (i.points ?? 0), 0)
    return total - done
  })
  const H = 200
  const Wd = 640
  const px = (n: number) => (n / nDays) * Wd
  const py = (v: number) => H - (v / Math.max(1, total)) * H
  const path = pts.map((v, n) => (v === null ? '' : `${n === 0 || pts[n - 1] === null ? 'M' : 'L'}${px(n)},${py(v)}`)).join(' ')
  // velocity
  const vel = [...closed, ...(active ? [active] : [])].map((s) => {
    const its = issues.filter((i) => i.sprintId === s.id && i.type !== 'Epic')
    return { s, committed: s.committed ?? its.reduce((a, i) => a + (i.points ?? 0), 0), done: s.completedPoints ?? its.filter((i) => i.status === 'Done').reduce((a, i) => a + (i.points ?? 0), 0) }
  })
  const vmax = Math.max(1, ...vel.map((v) => Math.max(v.committed, v.done)))
  return (
    <div className="flex-1 overflow-auto px-6 py-5" data-agent="jira-reports">
      <h2 className="text-[20px] font-semibold mb-4">Reports</h2>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Burndown chart">
          <select value={sid} onChange={(e) => setSid(e.target.value)} className="h-8 px-2 rounded-[4px] border border-[#8C8F97] text-[14px] mb-3" aria-label="Sprint">{sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <svg viewBox={`-30 -10 ${Wd + 40} ${H + 30}`} className="w-full">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={0} x2={Wd} y1={py(total * f)} y2={py(total * f)} stroke="#0B120E14" /><text x={-6} y={py(total * f) + 4} fontSize="10" textAnchor="end" fill="#6B6E76">{Math.round(total * f)}</text></g>)}
            <line x1={0} y1={py(total)} x2={Wd} y2={py(0)} stroke="#8C8F97" strokeDasharray="4 4" />
            <path d={path} fill="none" stroke="#E2483D" strokeWidth={2.5} />
            <text x={0} y={H + 18} fontSize="10" fill="#6B6E76">{sprint ? fmtD(sprint.start) : ''}</text>
            <text x={Wd} y={H + 18} fontSize="10" textAnchor="end" fill="#6B6E76">{sprint ? fmtD(sprint.end) : ''}</text>
          </svg>
          <div className="flex gap-4 text-[12px] text-[#505258]"><span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-[#E2483D]" /> Remaining story points</span><span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-[#8C8F97]" /> Guideline</span></div>
        </Card>
        <Card title="Velocity report">
          <div className="flex items-end gap-6 h-[220px] px-2 border-b border-[#0B120E24]">
            {vel.map((v) => (
              <div key={v.s.id} className="flex-1 flex flex-col items-center">
                <div className="flex items-end gap-1 h-[190px]">
                  <div className="w-7 bg-[#C1C7D0] rounded-t" style={{ height: `${(v.committed / vmax) * 100}%` }} title={`Commitment: ${v.committed}`} />
                  <div className="w-7 bg-[#4BCE97] rounded-t" style={{ height: `${(v.done / vmax) * 100}%` }} title={`Completed: ${v.done}`} />
                </div>
                <div className="text-[11px] text-[#505258] mt-1 truncate max-w-[110px]">{v.s.name}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-[12px] text-[#505258] mt-2"><span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#C1C7D0]" /> Commitment</span><span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#4BCE97]" /> Completed</span></div>
        </Card>
        <Card title="Created vs resolved (last 30 days)" className="col-span-2">
          {(() => {
            const days = Array.from({ length: 30 }, (_, n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 29 + n); return d })
            const c = days.map((d) => issues.filter((i) => new Date(i.created).toDateString() === d.toDateString()).length)
            const r = days.map((d) => issues.filter((i) => i.status === 'Done' && new Date(i.resolvedAt ?? i.updated).toDateString() === d.toDateString()).length)
            const m = Math.max(1, ...c, ...r)
            return (
              <div className="flex items-end gap-1 h-[120px]">
                {days.map((d, n) => (
                  <div key={n} className="flex-1 flex items-end justify-center gap-[1px] h-full" title={`${fmtD(d.toISOString())}: ${c[n]} created, ${r[n]} resolved`}>
                    <span className="w-[45%] bg-[#E2483D] rounded-t-[2px]" style={{ height: `${(c[n] / m) * 100}%` }} />
                    <span className="w-[45%] bg-[#22A06B] rounded-t-[2px]" style={{ height: `${(r[n] / m) * 100}%` }} />
                  </div>
                ))}
              </div>
            )
          })()}
          <div className="flex gap-4 text-[12px] text-[#505258] mt-2"><span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#E2483D]" /> Created</span><span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#22A06B]" /> Resolved</span></div>
        </Card>
      </div>
    </div>
  )
}

/* ─────────────────────────── For you / Recent / Starred / Teams / Dashboards ─────────────────────────── */

function MiniList({ rows, onOpen, empty }: { rows: Issue[]; onOpen: (k: string) => void; empty: string }) {
  return (
    <div className="divide-y divide-[#0B120E14] border-y border-[#0B120E14]">
      {rows.map((i) => (
        <button key={i.id} onClick={() => onOpen(i.key)} className="w-full h-11 flex items-center gap-3 px-2 text-left hover:bg-[#F8F8F8] text-[14px]">
          <TypeIcon type={i.type} />
          <span className="flex-1 min-w-0 truncate"><span className="font-medium">{i.summary}</span><span className="text-[12px] text-[#6B6E76] ml-2">{i.key} · Operations Platform</span></span>
          <Lozenge tone={STATUS_TONE[i.status]}>{i.status}</Lozenge>
          <span className="text-[12px] text-[#6B6E76] w-[110px] text-right">{ago(i.updated)}</span>
          <UserAv id={i.assignee} size={22} />
        </button>
      ))}
      {!rows.length && <div className="py-10 text-center text-[14px] text-[#505258]">{empty}</div>}
    </div>
  )
}

export function ForYouPage({ issues, recent, onOpen }: { issues: Issue[]; recent: string[]; onOpen: (k: string) => void }) {
  const { prefs } = usePrefs()
  const [tab, setTab] = useState<'worked' | 'viewed' | 'assigned' | 'starred'>('assigned')
  const rows =
    tab === 'assigned' ? issues.filter((i) => i.assignee === ME.id && i.status !== 'Done')
    : tab === 'worked' ? issues.filter((i) => i.reporter === ME.id || i.comments.some((c) => c.author === ME.id) || (i.history ?? []).some((h) => h.author === ME.id)).sort((a, b) => +new Date(b.updated) - +new Date(a.updated))
    : tab === 'viewed' ? (recent.map((k) => issues.find((i) => i.key === k)).filter(Boolean) as Issue[])
    : issues.filter((i) => prefs.starredIssues.includes(i.key))
  return (
    <div className="flex-1 overflow-auto px-8 py-6" data-agent="jira-for-you">
      <h1 className="text-[24px] font-semibold">For you</h1>
      <div className="flex gap-1 mt-4 border-b-2 border-[#0B120E14]">
        {([['worked', 'Worked on'], ['viewed', 'Viewed'], ['assigned', `Assigned to me (${issues.filter((i) => i.assignee === ME.id && i.status !== 'Done').length})`], ['starred', 'Starred']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`h-10 px-3 text-[14px] font-medium -mb-[2px] border-b-2 ${tab === k ? 'border-[#1868DB] text-[#1868DB]' : 'border-transparent text-[#505258]'}`}>{l}</button>
        ))}
      </div>
      <div className="mt-3"><MiniList rows={rows} onOpen={onOpen} empty={tab === 'starred' ? 'Star work items from the ••• menu to find them here.' : 'Nothing here yet.'} /></div>
    </div>
  )
}

export function TeamsPage({ issues, onFilter }: { issues: Issue[]; onFilter: (jql: string) => void }) {
  const people = PEOPLE.filter((p) => !p.external && issues.some((i) => i.assignee === p.id || i.reporter === p.id))
  return (
    <div className="flex-1 overflow-auto px-8 py-6">
      <h1 className="text-[24px] font-semibold mb-1">Operations Platform team</h1>
      <div className="text-[14px] text-[#505258] mb-5">{people.length} members</div>
      <div className="grid grid-cols-3 gap-4">
        {people.map((p) => {
          const open = issues.filter((i) => i.assignee === p.id && i.status !== 'Done')
          return (
            <div key={p.id} className="rounded-[8px] border border-[#0B120E24] p-4 flex gap-3">
              <Avatar id={p.id} size={48} />
              <div className="min-w-0">
                <div className="font-semibold">{p.name}</div>
                <div className="text-[13px] text-[#505258]">{p.title}</div>
                <button onClick={() => onFilter(`assignee = ${p.id} AND status != Done`)} className="text-[13px] text-[#1868DB] hover:underline mt-1">{open.length} open work item{open.length === 1 ? '' : 's'}</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardPage({ issues, sprints, onOpen, onFilter }: { issues: Issue[]; sprints: Sprint[]; onOpen: (k: string) => void; onFilter: (jql: string) => void }) {
  const mine = issues.filter((i) => i.assignee === ME.id && i.status !== 'Done')
  const active = sprints.find((s) => s.state === 'active')
  const sprintItems = issues.filter((i) => i.sprintId === active?.id && i.type !== 'Epic')
  const activity = issues.flatMap((i) => [...i.comments.map((c) => ({ id: c.id, who: c.author, what: <>commented on <button className="text-[#1868DB] hover:underline" onClick={() => onOpen(i.key)}>{i.key}</button></>, when: c.date })), ...(i.history ?? []).map((h) => ({ id: h.id, who: h.author, what: <>changed {h.field} of <button className="text-[#1868DB] hover:underline" onClick={() => onOpen(i.key)}>{i.key}</button> to {h.to}</>, when: h.date })), { id: i.id + 'c', who: i.reporter, what: <>created <button className="text-[#1868DB] hover:underline" onClick={() => onOpen(i.key)}>{i.key}</button></>, when: i.created }])
    .sort((a, b) => +new Date(b.when) - +new Date(a.when))
    .slice(0, 12)
  return (
    <div className="flex-1 overflow-auto px-6 py-5">
      <h1 className="text-[24px] font-semibold mb-4">Default dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Assigned to me"><MiniList rows={mine} onOpen={onOpen} empty="You have no open work items." /></Card>
        <Card title="Activity stream">
          {activity.map((a) => <div key={a.id} className="flex gap-2 text-[13px] mb-2"><Avatar id={a.who} size={22} /><div><b className="font-semibold">{person(a.who).name}</b> {a.what}<div className="text-[11px] text-[#6B6E76]">{ago(a.when)}</div></div></div>)}
        </Card>
        <Card title={`Sprint health — ${active?.name ?? 'no active sprint'}`}>
          {COLS.map((c) => {
            const n = sprintItems.filter((i) => i.status === c).length
            return <button key={c} onClick={() => onFilter(`sprint in openSprints() AND status = "${c}"`)} className="w-full flex items-center gap-3 mb-2 text-[14px] text-left"><span className="w-[100px]">{c}</span><div className="flex-1 h-3 rounded bg-[#0515240F]"><div className="h-full rounded" style={{ width: `${(n / Math.max(1, sprintItems.length)) * 100}%`, background: c === 'Done' ? '#4BCE97' : c === 'To Do' ? '#8C8F97' : '#669DF1' }} /></div><span className="w-6 text-right">{n}</span></button>
          })}
        </Card>
        <Card title="Open bugs by priority">
          {PRIORITIES.map((p) => {
            const n = issues.filter((i) => i.type === 'Bug' && i.status !== 'Done' && i.priority === p).length
            return <button key={p} onClick={() => onFilter(`type = Bug AND status != Done AND priority = ${p}`)} className="w-full flex items-center gap-3 mb-2 text-[14px] text-left"><span className="w-[100px] flex items-center gap-1.5"><PriorityIcon p={p} />{p}</span><div className="flex-1 h-3 rounded bg-[#0515240F]"><div className="h-full rounded bg-[#E2483D]" style={{ width: `${n * 20}%` }} /></div><span className="w-6 text-right">{n}</span></button>
          })}
        </Card>
      </div>
    </div>
  )
}

export function PlaceholderSpace({ name, color, abbr }: { name: string; color: string; abbr: string }) {
  const [requested, setRequested] = useState(false)
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <span className="w-14 h-14 rounded-[8px] text-white text-[20px] font-bold flex items-center justify-center" style={{ background: color }}>{abbr}</span>
      <div className="text-[20px] font-semibold mt-4">{name}</div>
      <div className="text-[14px] text-[#505258] mt-1 max-w-[420px]">You don’t have permission to browse work items in this space. Ask a space admin for access.</div>
      <button className={(requested ? btnDefault : btnPrimary) + ' mt-4'} disabled={requested} onClick={() => setRequested(true)}>{requested ? 'Access requested' : 'Request access'}</button>
    </div>
  )
}

