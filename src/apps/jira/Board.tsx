import { useState, type ReactNode } from 'react'
import { Clock, ChevronDown, ChevronRight, MoreHorizontal, Search, Plus, Check, Pencil, Trash2, GripVertical } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { Lozenge, HWBadge, Pop, PopItem, PopHeading, Dialog, btnDefault, btnPrimary, btnSubtle, inputAtl, copyText } from './atlassian'
import { type Issue, type Sprint, COLS, STATUS_TONE, TypeIcon, PriorityIcon, UserAv, updateIssue, nextKey, useJiraFlash, daysLeft, fmtD, sortIssues } from './shared'

/* ─────────────────────────── Board ─────────────────────────── */

function Card({ i, onOpen, subCount }: { i: Issue; onOpen: () => void; subCount?: [number, number] }) {
  const fresh = i.createdBy === 'hworker' && Date.now() - +new Date(i.created) < 90000
  return (
    <button
      data-agent={`jira-card-${i.key}`}
      aria-label={`${i.key} ${i.summary}`}
      onClick={onOpen}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/jira-key', i.key)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`w-full text-left bg-white rounded-[8px] p-3 shadow-[0_1px_1px_#1E1F2140,0_0_1px_#1E1F214F] hover:bg-[#F8F8F8] cursor-grab active:cursor-grabbing ${fresh ? 'flash-new' : ''}`}
    >
      <div className="text-[14px] text-[#292A2E] leading-[20px]">{i.summary}</div>
      {(i.epic || i.labels.length > 0 || i.createdBy === 'hworker') && (
        <div className="flex flex-wrap gap-1 mt-2">
          {i.epic && <Lozenge tone="purple">{i.epic}</Lozenge>}
          {i.createdBy === 'hworker' && <HWBadge />}
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-2.5">
        <TypeIcon type={i.type} />
        <span className={`text-[12px] font-medium text-[#505258] ${i.status === 'Done' ? 'line-through' : ''}`}>{i.key}</span>
        {subCount && subCount[1] > 0 && <span className="text-[11px] text-[#505258] ml-1" title="Child work items done">{subCount[0]}/{subCount[1]}</span>}
        <div className="flex-1" />
        {i.points !== undefined && <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#DDDEE1] text-[12px] text-[#292A2E] flex items-center justify-center">{i.points}</span>}
        <PriorityIcon p={i.priority} />
        <UserAv id={i.assignee} size={24} />
      </div>
    </button>
  )
}

function MultiFilter({ label, options, value, onChange }: { label: string; options: { id: string; label: ReactNode }[]; value: Set<string>; onChange: (v: Set<string>) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <button data-atl-trigger onClick={() => setOpen((o) => !o)} className={`h-8 px-2.5 rounded-[4px] text-[14px] hover:bg-[#0515240F] flex items-center gap-1 font-medium ${value.size ? 'bg-[#E9F2FE] text-[#1868DB]' : 'text-[#505258]'}`}>
        {label}{value.size ? ` (${value.size})` : ''} <ChevronDown size={14} />
      </button>
      {open && (
        <Pop onClose={() => setOpen(false)} className="left-0 top-9 w-[260px] max-h-[320px] overflow-auto">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#0515240F] cursor-pointer text-[14px]">
              <input type="checkbox" checked={value.has(o.id)} onChange={() => { const n = new Set(value); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); onChange(n) }} className="w-4 h-4 accent-[#1868DB]" />
              {o.label}
            </label>
          ))}
          {!options.length && <div className="px-3 py-2 text-[13px] text-[#6B6E76]">No options</div>}
        </Pop>
      )}
    </span>
  )
}

export function CompleteSprintDialog({ sprint, onClose }: { sprint: Sprint; onClose: () => void }) {
  const flash = useJiraFlash()
  const issues = useCollection<Issue>('jira.issues')
  const sprints = useCollection<Sprint>('jira.sprints')
  const items = issues.filter((i) => i.sprintId === sprint.id && i.type !== 'Epic')
  const done = items.filter((i) => i.status === 'Done')
  const open = items.filter((i) => i.status !== 'Done')
  const futures = sprints.filter((s) => s.state === 'future')
  const [dest, setDest] = useState(futures[0]?.id ?? '__new')
  const complete = () => {
    const now = new Date().toISOString()
    let target: string | null = dest === 'backlog' ? null : dest
    if (dest === '__new') {
      const n = Math.max(...sprints.map((s) => Number(s.name.match(/\d+$/)?.[0] ?? 0))) + 1
      target = `spr-${n}`
      db.insert('jira.sprints', { id: target, name: `OPS Sprint ${n}`, state: 'future', start: sprint.end, end: new Date(+new Date(sprint.end) + 14 * 864e5).toISOString(), goal: '' })
    }
    for (const i of open) updateIssue(i, { sprintId: target })
    db.update('jira.sprints', sprint.id, { state: 'closed', completedAt: now, committed: items.reduce((a, i) => a + (i.points ?? 0), 0), completedPoints: done.reduce((a, i) => a + (i.points ?? 0), 0) })
    flash(`${sprint.name} completed: ${done.length} work items done${open.length ? `, ${open.length} moved` : ''}`)
    onClose()
  }
  return (
    <Dialog
      title={`Complete ${sprint.name}`}
      onClose={onClose}
      agent="jira-complete-sprint-dialog"
      footer={<><button className={btnSubtle} onClick={onClose}>Cancel</button><button data-agent="jira-complete-sprint-confirm" className={btnPrimary} onClick={complete}>Complete sprint</button></>}
    >
      <div className="flex gap-6 my-2">
        <div><div className="text-[24px] font-semibold text-[#216E4E]">{done.length}</div><div className="text-[13px] text-[#505258]">completed work items</div></div>
        <div><div className="text-[24px] font-semibold">{open.length}</div><div className="text-[13px] text-[#505258]">open work items</div></div>
      </div>
      {open.length > 0 ? (
        <>
          <div className="text-[12px] font-semibold text-[#505258] mt-3 mb-1">Move open work items to</div>
          <select value={dest} onChange={(e) => setDest(e.target.value)} className={inputAtl} aria-label="Move open work items to">
            {futures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="__new">New sprint</option>
            <option value="backlog">Backlog</option>
          </select>
        </>
      ) : (
        <div className="text-[14px] text-[#216E4E] mt-2">All work items in this sprint are done. 🎉</div>
      )}
    </Dialog>
  )
}

type Group = 'none' | 'assignee' | 'epic' | 'priority'

export function Board({ sprint, issues, onOpen, onBacklog, onCreate }: { sprint?: Sprint; issues: Issue[]; onOpen: (k: string) => void; onBacklog: () => void; onCreate?: () => void }) {
  const { isAgent } = useDesk()
  const flash = useJiraFlash()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Set<string>>(new Set())
  const [epics, setEpics] = useState<Set<string>>(new Set())
  const [types, setTypes] = useState<Set<string>>(new Set())
  const [labels, setLabels] = useState<Set<string>>(new Set())
  const [group, setGroup] = useState<Group>('none')
  const [menu, setMenu] = useState<null | 'group' | 'more'>(null)
  const [completing, setCompleting] = useState(false)
  const [quick, setQuick] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const inSprint = issues.filter((i) => i.sprintId === sprint?.id && i.type !== 'Epic' && i.type !== 'Subtask')
  const items = inSprint.filter(
    (i) =>
      (!q || (i.summary + ' ' + i.key).toLowerCase().includes(q.toLowerCase())) &&
      (!people.size || people.has(i.assignee || '__none')) &&
      (!epics.size || epics.has(i.epic ?? '__none')) &&
      (!types.size || types.has(i.type)) &&
      (!labels.size || i.labels.some((l) => labels.has(l))),
  )
  const assignees = Array.from(new Set(inSprint.map((i) => i.assignee).filter(Boolean)))
  const filtered = !!(q || people.size || epics.size || types.size || labels.size)
  const subCount = (k: string): [number, number] => {
    const s = issues.filter((x) => x.parent === k)
    return [s.filter((x) => x.status === 'Done').length, s.length]
  }
  const drop = (key: string, status: string) => {
    const i = issues.find((x) => x.key === key)
    if (i && i.status !== status) updateIssue(i, { status })
  }
  const quickCreate = () => {
    if (!quick?.trim() || !sprint) return
    const { key, id } = nextKey(issues)
    const now = new Date().toISOString()
    db.insert('jira.issues', { id, key, type: 'Task', summary: quick.trim(), description: '', status: 'To Do', priority: 'Medium', assignee: '', reporter: ME.id, labels: [], sprintId: sprint.id, created: now, updated: now, comments: [], createdBy: isAgent ? 'hworker' : undefined })
    setQuick('')
    flash(`${key} has been created`)
  }

  if (!sprint)
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6" data-agent="jira-board-empty">
        <div className="text-[20px] font-semibold">Get started in the backlog</div>
        <div className="text-[14px] text-[#505258] mt-1 max-w-[420px]">Plan and start a sprint to see work items here. You can drag work items from the backlog into a sprint.</div>
        <button className={btnPrimary + ' mt-4'} onClick={onBacklog}>Go to backlog</button>
      </div>
    )

  const lanes: { id: string; label: ReactNode; rows: Issue[] }[] =
    group === 'none'
      ? [{ id: 'all', label: null, rows: items }]
      : group === 'assignee'
        ? [...assignees.map((a) => ({ id: a, label: <span className="flex items-center gap-2"><Avatar id={a} size={20} />{person(a).name}</span>, rows: items.filter((i) => i.assignee === a) })), { id: '', label: <span className="flex items-center gap-2"><UserAv id="" size={20} />Unassigned</span>, rows: items.filter((i) => !i.assignee) }]
        : group === 'epic'
          ? [...Array.from(new Set(items.map((i) => i.epic).filter(Boolean) as string[])).map((e) => ({ id: e, label: <span className="flex items-center gap-2"><TypeIcon type="Epic" size={14} />{e}</span>, rows: items.filter((i) => i.epic === e) })), { id: '', label: 'No parent', rows: items.filter((i) => !i.epic) }]
          : ['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((p) => ({ id: p, label: <span className="flex items-center gap-2"><PriorityIcon p={p} />{p}</span>, rows: items.filter((i) => i.priority === p) }))
  const visibleLanes = lanes.filter((l) => group === 'none' || l.rows.length)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#505258]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search board" className="h-8 w-[180px] pl-7 pr-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB]" />
        </div>
        <div className="flex -space-x-1 ml-1">
          {assignees.map((a) => (
            <button key={a} title={person(a).name} aria-pressed={people.has(a)} onClick={() => { const n = new Set(people); if (n.has(a)) n.delete(a); else n.add(a); setPeople(n) }} className={`rounded-full ring-2 ${people.has(a) ? 'ring-[#1868DB] z-10' : 'ring-white'} hover:-translate-y-0.5 transition-transform`}>
              <Avatar id={a} size={28} />
            </button>
          ))}
        </div>
        <MultiFilter label="Epic" value={epics} onChange={setEpics} options={[...Array.from(new Set(inSprint.map((i) => i.epic).filter(Boolean) as string[])).map((e) => ({ id: e, label: e })), { id: '__none', label: 'No epic' }]} />
        <MultiFilter label="Type" value={types} onChange={setTypes} options={Array.from(new Set(inSprint.map((i) => i.type))).map((t) => ({ id: t, label: <span className="flex items-center gap-2"><TypeIcon type={t} />{t}</span> }))} />
        <MultiFilter label="Label" value={labels} onChange={setLabels} options={Array.from(new Set(inSprint.flatMap((i) => i.labels))).sort().map((l) => ({ id: l, label: l }))} />
        {filtered && <button className="h-8 px-2 text-[14px] text-[#1868DB] hover:underline" onClick={() => { setQ(''); setPeople(new Set()); setEpics(new Set()); setTypes(new Set()); setLabels(new Set()) }}>Clear filters</button>}
        <div className="flex-1" />
        <span className="text-[13px] text-[#505258] flex items-center gap-1"><Clock size={14} /> {daysLeft(sprint.end)} days remaining</span>
        <button data-agent="jira-complete-sprint" onClick={() => setCompleting(true)} className="h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium text-[#292A2E]">Complete sprint</button>
        <span className="relative">
          <button data-atl-trigger onClick={() => setMenu(menu === 'group' ? null : 'group')} className="h-8 px-3 rounded-[4px] text-[14px] text-[#292A2E] hover:bg-[#0515240F] font-medium flex items-center gap-1">Group: {group === 'none' ? 'None' : group[0].toUpperCase() + group.slice(1)} <ChevronDown size={14} /></button>
          {menu === 'group' && (
            <Pop onClose={() => setMenu(null)} className="right-0 top-9 w-[200px]">
              {(['none', 'assignee', 'epic', 'priority'] as Group[]).map((g) => <PopItem key={g} active={group === g} onClick={() => { setGroup(g); setMenu(null) }}>{g === 'none' ? 'None' : g[0].toUpperCase() + g.slice(1)}</PopItem>)}
            </Pop>
          )}
        </span>
        <span className="relative">
          <button data-atl-trigger aria-label="Board actions" onClick={() => setMenu(menu === 'more' ? null : 'more')} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
          {menu === 'more' && (
            <Pop onClose={() => setMenu(null)} className="right-0 top-9 w-[220px]">
              <PopItem onClick={() => { setMenu(null); onCreate?.() }}>Create work item</PopItem>
              <PopItem onClick={() => { setMenu(null); onBacklog() }}>Go to backlog</PopItem>
              <PopItem onClick={() => { setMenu(null); copyText('https://northwind.atlassian.net/jira/software/projects/OPS/boards/12'); flash('Board link copied') }}>Copy link to board</PopItem>
              <PopItem onClick={() => { setMenu(null); setCollapsed(collapsed.size ? new Set() : new Set(COLS)) }}>{collapsed.size ? 'Expand all columns' : 'Collapse all columns'}</PopItem>
            </Pop>
          )}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-4">
        {visibleLanes.map((lane, li) => (
          <div key={lane.id || '_'} className={group === 'none' ? 'min-h-full' : 'mb-4'}>
            {group !== 'none' && <div className="h-8 flex items-center gap-2 text-[14px] font-semibold text-[#292A2E] mb-1">{lane.label}<span className="text-[12px] font-normal text-[#505258]">({lane.rows.length} work items)</span></div>}
            <div className="flex gap-2 items-start">
              {COLS.map((c) => {
                const col = lane.rows.filter((i) => i.status === c)
                const colId = `${lane.id}|${c}`
                const shut = collapsed.has(c)
                return (
                  <div
                    key={c}
                    className={`${shut ? 'w-[52px]' : 'w-[272px]'} shrink-0 rounded-[8px] p-2 ${group === 'none' ? 'min-h-[400px]' : 'min-h-[80px]'} transition-colors ${over === colId ? 'bg-[#E9F2FE] outline outline-2 outline-[#1868DB]/40' : 'bg-[#F8F8F8]'}`}
                    data-agent={li === 0 ? `jira-col-${c.toLowerCase().replace(/\s/g, '-')}` : undefined}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== colId) setOver(colId) }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null) }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setOver(null)
                      const key = e.dataTransfer.getData('text/jira-key')
                      if (!key) return
                      drop(key, c)
                      if (group === 'assignee') {
                        const i = issues.find((x) => x.key === key)
                        if (i && i.assignee !== lane.id) updateIssue({ ...i, status: c }, { assignee: lane.id })
                      }
                    }}
                  >
                    <button onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n })} className={`h-8 px-1.5 w-full flex items-center gap-2 text-[12px] font-semibold text-[#505258] uppercase rounded hover:bg-[#0515240F] ${shut ? '[writing-mode:vertical-rl] h-auto py-2' : ''}`}>
                      {c} <span className="font-normal">{col.length}</span>
                      {c === 'Done' && <span className="text-[#6A9A23]">✓</span>}
                    </button>
                    {!shut && (
                      <>
                        <div className="space-y-1.5">{col.map((i) => <Card key={i.id} i={i} onOpen={() => onOpen(i.key)} subCount={subCount(i.key)} />)}</div>
                        {c === 'To Do' && li === 0 && (
                          quick !== null ? (
                            <div className="mt-1.5 bg-white rounded-[8px] p-2 shadow-[0_1px_1px_#1E1F2140,0_0_1px_#1E1F214F]">
                              <textarea autoFocus aria-label="What needs to be done?" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickCreate() } if (e.key === 'Escape') setQuick(null) }} placeholder="What needs to be done?" rows={2} className="w-full text-[14px] outline-none resize-none" />
                              <div className="flex items-center gap-1 mt-1"><TypeIcon type="Task" /><span className="text-[12px] text-[#6B6E76]">Task</span><div className="flex-1" /><button className={btnSubtle + ' !h-7'} onClick={() => setQuick(null)}>Cancel</button><button className={btnPrimary + ' !h-7'} disabled={!quick.trim()} onClick={quickCreate}>Create</button></div>
                            </div>
                          ) : (
                            <button data-agent="jira-board-quick-create" onClick={() => setQuick('')} className="w-full h-8 mt-1 rounded-[4px] text-[14px] text-[#505258] hover:bg-[#0515240F] flex items-center gap-1.5 px-2 font-medium"><Plus size={15} /> Create</button>
                          )
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {completing && <CompleteSprintDialog sprint={sprint} onClose={() => setCompleting(false)} />}
    </div>
  )
}

/* ─────────────────────────── Backlog ─────────────────────────── */

function SprintDialog({ sprint, onClose, start }: { sprint: Sprint; onClose: () => void; start?: boolean }) {
  const flash = useJiraFlash()
  const issues = useCollection<Issue>('jira.issues')
  const toLocal = (iso: string) => iso.slice(0, 10)
  const [f, setF] = useState({ name: sprint.name, goal: sprint.goal, start: toLocal(start ? new Date().toISOString() : sprint.start), weeks: '2', end: toLocal(sprint.end) })
  const count = issues.filter((i) => i.sprintId === sprint.id && i.type !== 'Epic').length
  const endIso = f.weeks === 'custom' ? new Date(f.end + 'T17:00:00').toISOString() : new Date(+new Date(f.start + 'T09:00:00') + Number(f.weeks) * 7 * 864e5).toISOString()
  const save = () => {
    db.update('jira.sprints', sprint.id, { name: f.name.trim() || sprint.name, goal: f.goal, start: new Date(f.start + 'T09:00:00').toISOString(), end: endIso, ...(start ? { state: 'active' } : {}) })
    flash(start ? `${f.name} started` : 'Sprint updated')
    onClose()
  }
  return (
    <Dialog
      title={start ? `Start sprint` : 'Edit sprint'}
      onClose={onClose}
      agent="jira-sprint-dialog"
      footer={<><button className={btnSubtle} onClick={onClose}>Cancel</button><button data-agent="jira-sprint-dialog-save" className={btnPrimary} onClick={save}>{start ? 'Start' : 'Update'}</button></>}
    >
      {start && <div className="text-[14px] text-[#505258] mb-2"><b>{count}</b> work item{count === 1 ? '' : 's'} will be included in this sprint.</div>}
      <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-2">Sprint name <span className="text-[#C9372C]">*</span></div>
      <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputAtl} aria-label="Sprint name" />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-3">Duration</div>
          <select value={f.weeks} onChange={(e) => setF({ ...f, weeks: e.target.value })} className={inputAtl} aria-label="Duration">{['1', '2', '3', '4'].map((w) => <option key={w} value={w}>{w} week{w === '1' ? '' : 's'}</option>)}<option value="custom">Custom</option></select>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-3">Start date</div>
          <input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} className={inputAtl} aria-label="Start date" />
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-3">End date</div>
          <input type="date" disabled={f.weeks !== 'custom'} value={f.weeks === 'custom' ? f.end : endIso.slice(0, 10)} onChange={(e) => setF({ ...f, end: e.target.value })} className={inputAtl + ' disabled:bg-[#F8F8F8]'} aria-label="End date" />
        </div>
      </div>
      <div className="text-[12px] font-semibold text-[#505258] mb-1 mt-3">Sprint goal</div>
      <textarea value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} rows={3} className={inputAtl + ' h-auto py-2'} aria-label="Sprint goal" />
    </Dialog>
  )
}

export function Backlog({ sprints, issues, onOpen }: { sprints: Sprint[]; issues: Issue[]; onOpen: (k: string) => void }) {
  const { isAgent } = useDesk()
  const flash = useJiraFlash()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [over, setOver] = useState<string | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [dialog, setDialog] = useState<null | { kind: 'start' | 'edit' | 'complete'; sprint: Sprint }>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const active = sprints.find((s) => s.state === 'active')
  const groups: [string, Sprint | null][] = [...sprints.filter((s) => s.state !== 'closed').sort((a, b) => (a.state === 'active' ? -1 : b.state === 'active' ? 1 : +new Date(a.start) - +new Date(b.start))).map((s) => [s.id, s] as [string, Sprint]), ['backlog', null]]
  const move = (key: string, sprintId: string | null) => {
    const i = issues.find((x) => x.key === key)
    if (i && i.sprintId !== sprintId) {
      updateIssue(i, { sprintId })
      for (const s of issues.filter((x) => x.parent === key)) updateIssue(s, { sprintId })
    }
  }
  const create = (sprintId: string | null) => {
    if (!text.trim()) return
    const { key, id } = nextKey(issues)
    const now = new Date().toISOString()
    db.insert('jira.issues', { id, key, type: 'Task', summary: text.trim(), description: '', status: 'To Do', priority: 'Medium', assignee: '', reporter: ME.id, labels: [], sprintId, created: now, updated: now, comments: [], createdBy: isAgent ? 'hworker' : undefined })
    setText('')
    flash(`${key} has been created`)
  }
  const createSprint = () => {
    const n = Math.max(...sprints.map((s) => Number(s.name.match(/\d+$/)?.[0] ?? 0))) + 1
    const last = [...sprints].sort((a, b) => +new Date(b.end) - +new Date(a.end))[0]
    const start = last ? last.end : new Date().toISOString()
    db.insert('jira.sprints', { id: `spr-${n}-${Date.now().toString(36)}`, name: `OPS Sprint ${n}`, state: 'future', start, end: new Date(+new Date(start) + 14 * 864e5).toISOString(), goal: '' })
    flash(`OPS Sprint ${n} created`)
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-6 pt-3">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#505258]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search backlog" aria-label="Search backlog" className="h-8 w-[200px] pl-7 pr-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB]" />
        </div>
        <span className="text-[13px] text-[#6B6E76]">Drag work items between sprints and the backlog to plan.</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-6 py-3 space-y-4">
        {groups.map(([id, s]) => {
          const rows = sortIssues(issues.filter((i) => i.type !== 'Epic' && i.type !== 'Subtask' && (s ? i.sprintId === s.id : !i.sprintId) && (!q || (i.key + ' ' + i.summary).toLowerCase().includes(q.toLowerCase()))))
          const shut = collapsed.has(id)
          const pts = (st: string) => rows.filter((r) => (st === 'In Progress' ? ['In Progress', 'In Review'].includes(r.status) : r.status === st)).reduce((a, r) => a + (r.points ?? 0), 0)
          return (
            <div
              key={id}
              className={`rounded-[8px] p-2 transition-colors ${over === id ? 'bg-[#E9F2FE] outline outline-2 outline-[#1868DB]/40' : 'bg-[#F8F8F8]'}`}
              data-agent={`jira-backlog-${id}`}
              onDragOver={(e) => { e.preventDefault(); if (over !== id) setOver(id) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null) }}
              onDrop={(e) => { e.preventDefault(); setOver(null); const k = e.dataTransfer.getData('text/jira-key'); if (k) move(k, s ? s.id : null) }}
            >
              <div className="flex items-center gap-2 h-9 px-2">
                <button aria-label={shut ? 'Expand' : 'Collapse'} onClick={() => setCollapsed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n })} className="w-6 h-6 rounded hover:bg-[#0515240F] flex items-center justify-center">{shut ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</button>
                <span className="text-[14px] font-semibold">{s ? s.name : 'Backlog'}</span>
                {s?.state === 'active' && <Lozenge tone="blue">Active</Lozenge>}
                {s && <span className="text-[13px] text-[#505258]">{fmtD(s.start)} – {fmtD(s.end)}</span>}
                <span className="text-[13px] text-[#505258]">({rows.length} work items)</span>
                {s?.goal && <span className="text-[13px] text-[#505258] truncate max-w-[320px]" title={s.goal}>· {s.goal}</span>}
                <div className="flex-1" />
                <span className="flex gap-1">
                  {(['To Do', 'In Progress', 'Done'] as const).map((st) => <span key={st} title={`${st}: ${pts(st)} points`} className={`h-5 min-w-6 px-1.5 rounded-full text-[12px] flex items-center justify-center ${st === 'Done' ? 'bg-[#BAF3DB] text-[#216E4E]' : st === 'In Progress' ? 'bg-[#CFE1FD] text-[#1558BC]' : 'bg-[#DDDEE1]'}`}>{pts(st)}</span>)}
                </span>
                {s?.state === 'active' ? (
                  <button className="h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium" onClick={() => setDialog({ kind: 'complete', sprint: s })}>Complete sprint</button>
                ) : s ? (
                  <button className="h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium disabled:opacity-50" disabled={!!active} title={active ? `${active.name} is still active. Complete it before starting another sprint.` : undefined} onClick={() => setDialog({ kind: 'start', sprint: s })}>Start sprint</button>
                ) : (
                  <button data-agent="jira-backlog-create-sprint" className="h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium" onClick={createSprint}>Create sprint</button>
                )}
                {s && (
                  <span className="relative">
                    <button data-atl-trigger aria-label={`${s.name} actions`} onClick={() => setMenu(menu === s.id ? null : s.id)} className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><MoreHorizontal size={16} /></button>
                    {menu === s.id && (
                      <Pop onClose={() => setMenu(null)} className="right-0 top-9 w-[200px]">
                        <PopItem onClick={() => { setMenu(null); setDialog({ kind: 'edit', sprint: s }) }}><Pencil size={14} /> Edit sprint</PopItem>
                        <PopItem danger disabled={s.state === 'active'} onClick={() => { setMenu(null); for (const i of issues.filter((x) => x.sprintId === s.id)) updateIssue(i, { sprintId: null }); db.remove('jira.sprints', s.id); flash(`${s.name} deleted — its work items moved to the backlog`) }}><Trash2 size={14} /> Delete sprint</PopItem>
                      </Pop>
                    )}
                  </span>
                )}
              </div>
              {!shut && (
                <div className="bg-white rounded-[4px] border border-[#0B120E24]">
                  {rows.map((i) => (
                    <div
                      key={i.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/jira-key', i.key); e.dataTransfer.effectAllowed = 'move' }}
                      className="group h-10 flex items-center border-b last:border-b-0 border-[#0B120E14] hover:bg-[#F8F8F8]"
                    >
                      <span className="w-5 pl-1 text-[#B7B9BE] opacity-0 group-hover:opacity-100 cursor-grab"><GripVertical size={14} /></span>
                      <button data-agent={`jira-row-${i.key}`} onClick={() => onOpen(i.key)} className="flex-1 min-w-0 h-10 flex items-center gap-2.5 pl-1 pr-2 text-left text-[14px]">
                        <TypeIcon type={i.type} />
                        <span className={`text-[#505258] text-[13px] w-[64px] ${i.status === 'Done' ? 'line-through' : ''}`}>{i.key}</span>
                        <span className="flex-1 truncate">{i.summary}</span>
                        {i.createdBy === 'hworker' && <HWBadge />}
                        {i.epic && <Lozenge tone="purple">{i.epic}</Lozenge>}
                        <Lozenge tone={STATUS_TONE[i.status]}>{i.status}</Lozenge>
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#DDDEE1] text-[12px] flex items-center justify-center">{i.points ?? '-'}</span>
                        <PriorityIcon p={i.priority} />
                        <UserAv id={i.assignee} size={24} />
                      </button>
                      <span className="relative pr-1">
                        <button data-atl-trigger aria-label={`Move ${i.key}`} onClick={() => setMenu(menu === i.id ? null : i.id)} className="w-7 h-7 rounded hover:bg-[#0B120E24] items-center justify-center hidden group-hover:flex"><MoreHorizontal size={14} /></button>
                        {menu === i.id && (
                          <Pop onClose={() => setMenu(null)} className="right-0 top-8 w-[220px]">
                            <PopHeading>Move to</PopHeading>
                            {sprints.filter((x) => x.state !== 'closed' && x.id !== i.sprintId).map((x) => <PopItem key={x.id} onClick={() => { setMenu(null); move(i.key, x.id) }}>{x.name}</PopItem>)}
                            {i.sprintId && <PopItem onClick={() => { setMenu(null); move(i.key, null) }}>Backlog</PopItem>}
                            <div className="h-px bg-[#0B120E24] my-1" />
                            {i.status !== 'Done' && <PopItem onClick={() => { setMenu(null); updateIssue(i, { status: 'Done' }) }}><Check size={14} /> Mark as done</PopItem>}
                            <PopItem onClick={() => { setMenu(null); onOpen(i.key) }}>Open work item</PopItem>
                          </Pop>
                        )}
                      </span>
                    </div>
                  ))}
                  {!rows.length && <div className="h-12 flex items-center justify-center text-[13px] text-[#6B6E76] border-b border-[#0B120E14]">{s ? 'Plan a sprint by dragging work items here.' : 'Your backlog is empty.'}</div>}
                  {creating === id ? (
                    <div className="flex items-center gap-2 p-1.5">
                      <TypeIcon type="Task" />
                      <input autoFocus aria-label="What needs to be done?" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(s ? s.id : null); if (e.key === 'Escape') setCreating(null) }} placeholder="What needs to be done?" className="flex-1 h-8 px-2 rounded-[4px] border border-[#1868DB] text-[14px] outline-none" />
                      <button className={btnPrimary} disabled={!text.trim()} onClick={() => create(s ? s.id : null)}>Create</button>
                      <button className={btnSubtle} onClick={() => setCreating(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setCreating(id); setText('') }} className="w-full h-9 px-3 flex items-center gap-1.5 text-[14px] text-[#505258] hover:bg-[#F8F8F8]"><Plus size={15} /> Create</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {dialog?.kind === 'complete' && <CompleteSprintDialog sprint={dialog.sprint} onClose={() => setDialog(null)} />}
      {dialog && dialog.kind !== 'complete' && <SprintDialog sprint={dialog.sprint} start={dialog.kind === 'start'} onClose={() => setDialog(null)} />}
    </div>
  )
}

void btnDefault
