import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, ListChecks, Mail, Phone, Settings, X } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { Btn, HWChip, Link, inputCls, labelCls, sfDate, useNav } from './ui'

const TYPE_META: Record<string, { color: string; icon: any; verb: string }> = {
  call: { color: '#48C3CC', icon: Phone, verb: 'logged a call' },
  task: { color: '#3BA755', icon: ListChecks, verb: 'had a task' },
  event: { color: '#CB65FF', icon: CalendarDays, verb: 'had an event' },
  email: { color: '#939393', icon: Mail, verb: 'sent an email' },
}

export function TypeDot({ type, size = 24 }: { type: string; size?: number }) {
  const m = TYPE_META[type] ?? TYPE_META.task
  const I = m.icon
  return (
    <span className="inline-flex items-center justify-center rounded-full shrink-0" style={{ width: size, height: size, background: m.color }}>
      <I size={size * 0.55} color="#fff" strokeWidth={2.2} />
    </span>
  )
}

type Mode = 'call' | 'task' | 'event' | 'email'

export function ActivityPanel({
  whatId,
  whatName,
  whatObject,
  contacts,
  mode,
  setMode,
  onToast,
}: {
  whatId: string
  whatName: string
  whatObject: string
  contacts: any[]
  mode: Mode | null
  setMode: (m: Mode | null) => void
  onToast: (t: string) => void
}) {
  const { isAgent } = useDesk()
  const acts = useCollection<any>('salesforce.activities')
  const tasks = useCollection<any>('salesforce.tasks')
  const [subject, setSubject] = useState('')
  const [comments, setComments] = useState('')
  const [who, setWho] = useState(contacts[0]?.id ?? '')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState('Normal')
  const [status, setStatus] = useState('Not Started')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [expandAll, setExpandAll] = useState(false)

  const reset = () => {
    setSubject('')
    setComments('')
    setDue('')
    setPriority('Normal')
    setStatus('Not Started')
  }
  const choose = (m: Mode) => {
    reset()
    setMode(mode === m ? null : m)
    if (m === 'call') setSubject('Call')
    if (m === 'email') setSubject('')
  }

  const save = () => {
    const by = isAgent ? { createdBy: 'hworker' } : {}
    if (mode === 'task') {
      db.insert('salesforce.tasks', { id: uid('00T'), subject: subject || 'Task', whatId, whoId: who, dueDate: due || isoDate(new Date()), status, priority, ownerId: ME.id, description: comments, createdDate: new Date().toISOString(), ...by }, { prepend: true })
      onToast(`Task "${subject || 'Task'}" was created.`)
    } else {
      db.insert(
        'salesforce.activities',
        { id: uid('00T'), type: mode, whatId, whoId: who, subject: mode === 'email' ? `Email: ${subject}` : subject || 'Call', description: comments, date: mode === 'event' && due ? new Date(due + 'T10:00:00').toISOString() : new Date().toISOString(), ownerId: ME.id, ...by },
        { prepend: true },
      )
      onToast(mode === 'call' ? `Call "${subject || 'Call'}" was saved.` : mode === 'email' ? 'Email was sent.' : `Event "${subject}" was created.`)
    }
    reset()
    setMode(null)
  }

  const items = useMemo(() => {
    const a = acts.filter((x) => x.whatId === whatId).map((x) => ({ ...x, kind: x.type, when: x.date }))
    const t = tasks.filter((x) => x.whatId === whatId).map((x) => ({ ...x, kind: 'task', when: x.dueDate + 'T12:00:00' }))
    return [...a, ...t].sort((x, y) => +new Date(y.when) - +new Date(x.when))
  }, [acts, tasks, whatId])
  const now = Date.now()
  const upcoming = items.filter((i) => (i.kind === 'task' && i.status !== 'Completed') || (i.kind === 'event' && +new Date(i.when) > now))
  const past = items.filter((i) => !upcoming.includes(i))
  const groups: Record<string, any[]> = {}
  for (const i of past) {
    const dt = new Date(i.when)
    const k = dt.toLocaleDateString('en-US', { month: 'long' }) + ' • ' + dt.getFullYear()
    ;(groups[k] ??= []).push(i)
  }
  const thisMonth = new Date().toLocaleDateString('en-US', { month: 'long' }) + ' • ' + new Date().getFullYear()

  const tabs: [Mode, string][] = [
    ['call', 'Log a Call'],
    ['task', 'New Task'],
    ['event', 'New Event'],
    ['email', 'Email'],
  ]

  return (
    <div>
      {/* composer */}
      <div className="px-4 pt-3">
        <div className="flex items-stretch border-b border-[#E5E5E5]">
          {tabs.map(([m, l]) => (
            <button
              key={m}
              data-agent={`sf-activity-${m}`}
              aria-label={l}
              onClick={() => choose(m)}
              className={`relative flex items-center gap-2 h-10 px-3 text-[13px] ${mode === m ? 'text-[#181818] font-bold' : 'text-[#181818] hover:text-[#0176D3]'}`}
            >
              <TypeDot type={m} size={20} /> {l}
              {mode === m && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-[#0176D3]" />}
            </button>
          ))}
          <div className="flex-1" />
          <button className="self-center w-8 h-8 border border-[#C9C9C9] rounded-[4px] flex items-center justify-center text-[#747474]">
            <ChevronDown size={14} />
          </button>
        </div>
        {!mode && (
          <div className="flex gap-2 py-3">
            <input readOnly onClick={() => choose('call')} placeholder="Recap your call..." className={`${inputCls} cursor-text`} />
            <Btn variant="brand" onClick={() => choose('call')}>Add</Btn>
          </div>
        )}
        {mode && (
          <div className="py-3 border-b border-[#E5E5E5]" data-agent={`sf-composer-${mode}`}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {mode === 'email' ? (
                <>
                  <div className="col-span-2">
                    <label className={labelCls}>To</label>
                    <div className={`${inputCls} flex items-center`}>
                      <span className="inline-flex items-center gap-1 h-6 px-2 rounded bg-[#F3F3F3] border border-[#E5E5E5] text-[12px]">
                        {contacts.find((c) => c.id === who)?.name ?? 'Select'} <X size={11} />
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
              <div className={mode === 'call' || mode === 'email' ? 'col-span-2' : ''}>
                <label className={labelCls}>
                  <abbr className="text-[#BA0517] no-underline mr-0.5">*</abbr>Subject
                </label>
                <input data-agent={`sf-${mode}-subject`} aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
              </div>
              {(mode === 'task' || mode === 'event') && (
                <div>
                  <label className={labelCls}>{mode === 'task' ? 'Due Date' : 'Start Date'}</label>
                  <input data-agent={`sf-${mode}-due`} aria-label={mode === 'task' ? 'Due Date' : 'Start Date'} type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
                </div>
              )}
              {mode !== 'email' && (
                <div>
                  <label className={labelCls}>Name</label>
                  <select data-agent={`sf-${mode}-name`} aria-label="Name" value={who} onChange={(e) => setWho(e.target.value)} className={inputCls}>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {mode !== 'email' && (
                <div>
                  <label className={labelCls}>Related To</label>
                  <div className={`${inputCls} flex items-center`}>
                    <span className="inline-flex items-center gap-1.5 h-6 pl-1 pr-2 rounded bg-[#F3F3F3] border border-[#E5E5E5] text-[12px] max-w-full truncate">
                      <span className="w-4 h-4 rounded-[2px]" style={{ background: whatObject === 'Opportunity' ? '#FF5D2D' : '#5867E8' }} /> {whatName}
                    </span>
                  </div>
                </div>
              )}
              {mode === 'task' && (
                <>
                  <div>
                    <label className={labelCls}>Assigned To</label>
                    <div className={`${inputCls} flex items-center`}>
                      <span className="inline-flex items-center gap-1 h-6 px-2 rounded bg-[#F3F3F3] border border-[#E5E5E5] text-[12px]">{ME.name}</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Status</label>
                    <select data-agent="sf-task-status" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                      {['Not Started', 'In Progress', 'Completed', 'Waiting on someone else', 'Deferred'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Priority</label>
                    <select data-agent="sf-task-priority" aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                      {['High', 'Normal', 'Low'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className={labelCls}>{mode === 'email' ? 'Body' : 'Comments'}</label>
                <textarea data-agent={`sf-${mode}-comments`} aria-label={mode === 'email' ? 'Body' : 'Comments'} value={comments} onChange={(e) => setComments(e.target.value)} rows={mode === 'call' ? 6 : 3} className={`${inputCls} h-auto py-2 leading-[1.45] resize-y`} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Btn onClick={() => setMode(null)}>Cancel</Btn>
              <Btn variant="brand" agent={`sf-${mode}-save`} label={mode === 'email' ? 'Send' : 'Save'} onClick={save}>
                {mode === 'email' ? 'Send' : 'Save'}
              </Btn>
            </div>
          </div>
        )}
      </div>
      {/* timeline */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-3 text-[12px] text-[#444]">
          <span>Filters: All time • All activities • All types</span>
          <button className="w-7 h-7 border border-[#C9C9C9] rounded-[4px] flex items-center justify-center text-[#747474]">
            <Settings size={13} />
          </button>
        </div>
        <div className="flex justify-end gap-1 text-[12px] -mt-1 mb-2">
          <Link>Refresh</Link> <span className="text-[#747474]">•</span> <Link onClick={() => setExpandAll((x) => !x)}>{expandAll ? 'Collapse All' : 'Expand All'}</Link> <span className="text-[#747474]">•</span> <Link>View All</Link>
        </div>
        <Section title="Upcoming & Overdue" items={upcoming} expanded={expanded} setExpanded={setExpanded} expandAll={expandAll} />
        {!upcoming.length && <div className="text-[13px] text-[#444] text-center py-3 bg-[#F3F3F3] rounded mb-2">No activities to show. Get started by sending an email, scheduling a task, and more.</div>}
        {Object.entries(groups).map(([k, list]) => (
          <Section key={k} title={k} right={k === thisMonth ? 'This Month' : undefined} items={list} expanded={expanded} setExpanded={setExpanded} expandAll={expandAll} />
        ))}
        <div className="text-center text-[12px] text-[#444] pt-3">No more past activities to load.</div>
      </div>
    </div>
  )
}

function Section({ title, right, items, expanded, setExpanded, expandAll }: { title: string; right?: string; items: any[]; expanded: Record<string, boolean>; setExpanded: (f: any) => void; expandAll: boolean }) {
  const [open, setOpen] = useState(true)
  if (!items.length) return null
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 h-8 px-2 rounded bg-[#F3F3F3] text-[14px] font-bold text-[#181818]">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} <span className="flex-1 text-left">{title}</span>
        {right && <span className="text-[12px] font-normal text-[#444]">{right}</span>}
      </button>
      {open && (
        <ul className="pt-2">
          {items.map((i, idx) => (
            <TimelineItem key={i.id} item={i} last={idx === items.length - 1} open={expandAll || expanded[i.id] || (!!i.createdBy && i.kind !== 'task') || idx === 0} toggle={() => setExpanded((e: any) => ({ ...e, [i.id]: !e[i.id] }))} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TimelineItem({ item, open, toggle, last }: { item: any; open: boolean; toggle: () => void; last: boolean }) {
  const contacts = useCollection<any>('salesforce.contacts')
  const { go } = useNav()
  const m = TYPE_META[item.kind] ?? TYPE_META.task
  const who = contacts.find((c) => c.id === item.whoId)
  const dt = new Date(item.when)
  const isToday = dt.toDateString() === new Date().toDateString()
  const overdue = item.kind === 'task' && item.status !== 'Completed' && +dt < Date.now() - 86400000
  const dateLabel = item.kind === 'task' ? (isToday ? 'Today' : sfDate(item.dueDate)) : isToday ? `${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} | Today` : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const owner = item.ownerId === ME.id ? 'You' : person(item.ownerId).name
  return (
    <li className={`relative flex items-start gap-2 pb-3 ${item.createdBy ? 'flash-new' : ''}`} data-agent={`sf-timeline-${item.id}`}>
      <button onClick={toggle} className="mt-1 text-[#747474] shrink-0 self-start">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      <div className="relative flex flex-col items-center shrink-0 self-stretch">
        <TypeDot type={item.kind} />
        {!last && <span className="flex-1 w-[2px] mt-1" style={{ background: m.color, opacity: 0.6 }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {item.kind === 'task' && <input type="checkbox" readOnly checked={item.status === 'Completed'} className="mt-1 accent-[#0176D3]" />}
          <Link className={`text-[13px] font-normal truncate ${item.kind === 'task' && item.status === 'Completed' ? 'line-through' : ''}`}>{item.subject}</Link>
          {item.createdBy === 'hworker' && <HWChip />}
          <div className="flex-1" />
          <span className={`text-[12px] whitespace-nowrap ${overdue ? 'text-[#BA0517]' : 'text-[#444]'}`}>{dateLabel}</span>
          <button className="w-5 h-5 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474]">
            <ChevronDown size={11} />
          </button>
        </div>
        <div className="text-[12px] text-[#444]">
          {owner} {m.verb}
          {who && (
            <>
              {' '}
              with{' '}
              <Link className="text-[12px]" onClick={() => go({ page: 'record', object: 'Contact', id: who.id })}>
                {who.name}
              </Link>
            </>
          )}
        </div>
        {open && (item.description || item.kind === 'task') && (
          <div className="mt-2 rounded border border-[#E5E5E5] p-3 text-[12.5px] bg-white">
            {item.kind === 'task' && (
              <div className="grid grid-cols-3 gap-2 mb-1">
                <div>
                  <div className="text-[11px] text-[#444]">Due Date</div>
                  <div>{sfDate(item.dueDate)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#444]">Priority</div>
                  <div>{item.priority}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#444]">Status</div>
                  <div>{item.status}</div>
                </div>
              </div>
            )}
            {item.description && (
              <>
                <div className="text-[11px] text-[#444]">{item.kind === 'email' ? 'Text Body' : 'Description'}</div>
                <div className="whitespace-pre-wrap leading-[1.5] text-[#181818]">{item.description}</div>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
