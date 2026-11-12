import { useMemo, useState } from 'react'
import {
  Add20Regular,
  CheckmarkCircle20Filled,
  Circle20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Flag20Regular,
  Mail20Regular,
  Open20Regular,
  Search16Regular,
  Star20Filled,
  Star20Regular,
  Copy20Regular,
  Chat20Regular,
  Call20Regular,
  Video20Regular,
} from '@fluentui/react-icons'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, personByEmail } from '@/data/people'
import { fmtSmart } from '@/data/time'
import { logoUrl } from '@/os/registry'
import { FileIcon, type Email } from './Mail'
import { Toggle, copyText, usePrefs } from './ui'

const CARD = 'bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)]'

/* ─────────────────────────── People ─────────────────────────── */

export function PeopleView({ initial }: { initial?: string }) {
  const { open, toast } = useDesk()
  const [sel, setSel] = useState(initial ?? PEOPLE[1].id)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'internal' | 'external'>('all')
  const list = PEOPLE.filter((x) => (tab === 'all' ? true : tab === 'internal' ? !x.external : x.external) && (x.name + ' ' + x.email + ' ' + x.company + ' ' + x.title).toLowerCase().includes(q.toLowerCase()))
  const p = PEOPLE.find((x) => x.id === sel) ?? PEOPLE[1]
  const actions: [any, string, () => void][] = [
    [Mail20Regular, 'Send email', () => open('outlook', { view: 'mail', compose: { to: [p.email] } })],
    [Chat20Regular, 'Chat in Teams', () => open('teams', { chatId: p.id })],
    [Call20Regular, 'Call in Teams', () => open('teams', { call: p.id })],
    [Video20Regular, 'Video call in Teams', () => open('teams', { call: p.id, video: true })],
  ]
  return (
    <div className="flex-1 min-h-0 flex">
      <div className={`w-[320px] shrink-0 m-2 ${CARD} flex flex-col overflow-hidden`}>
        <div className="px-4 h-11 flex items-center text-[14px] font-semibold border-b border-[#F0F0F0]">Contacts · {list.length}</div>
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-1.5 h-8 px-2 rounded border border-[#D1D1D1] focus-within:border-[#0F6CBD]">
            <Search16Regular className="text-[#616161]" />
            <input data-agent="outlook-people-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" aria-label="Search contacts" className="flex-1 outline-none text-[13px]" />
          </div>
          <div className="flex gap-1 mt-2">
            {(['all', 'internal', 'external'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`h-6 px-2.5 rounded-full text-[12px] border ${tab === t ? 'bg-[#EBF3FC] border-[#0F6CBD] text-[#0F6CBD]' : 'border-[#E1DFDD] hover:bg-[#F5F5F5]'}`}>
                {t === 'all' ? 'All' : t === 'internal' ? 'My organization' : 'External'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {list.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`w-full flex items-center gap-3 px-4 py-2 text-left ${sel === x.id ? 'bg-[#EBF3FC]' : 'hover:bg-[#F5F5F5]'}`}>
              <Avatar id={x.id} size={32} />
              <div className="min-w-0">
                <div className="text-[13.5px] truncate">{x.name}{x.id === ME.id ? ' (you)' : ''}</div>
                <div className="text-[12px] text-[#616161] truncate">{x.title} · {x.company}</div>
              </div>
            </button>
          ))}
          {!list.length && <div className="p-6 text-center text-[13px] text-[#616161]">No contacts found</div>}
        </div>
      </div>
      <div className={`flex-1 m-2 ml-0 ${CARD} p-8 overflow-auto`}>
        <div className="flex items-center gap-5">
          <Avatar id={p.id} size={88} />
          <div>
            <div className="text-[24px] font-semibold">{p.name}</div>
            <div className="text-[14px] text-[#616161]">{p.title} · {p.dept}</div>
            <div className="text-[14px] text-[#616161]">{p.company}</div>
            <div className="flex gap-2 mt-3">
              {actions.map(([I, label, fn], i) => (
                <button key={i} title={label} aria-label={label} onClick={fn} className="w-9 h-9 rounded-full bg-[#EBF3FC] text-[#0F6CBD] flex items-center justify-center hover:bg-[#CFE4FA]"><I /></button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-6 max-w-[640px] text-[13.5px]">
          {[['Email', p.email], ['Work phone', p.phone], ['Office location', p.location], ['Department', p.dept]].map(([k, v]) => (
            <div key={k}>
              <div className="text-[12px] text-[#616161]">{k}</div>
              {k === 'Email' ? (
                <div className="flex items-center gap-1">
                  <button className="text-[#0F6CBD] hover:underline" onClick={() => open('outlook', { view: 'mail', compose: { to: [p.email] } })}>{v}</button>
                  <button className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#616161]" title="Copy email" aria-label="Copy email" onClick={() => { copyText(String(v)); toast({ appId: 'outlook', title: 'Copied to clipboard', body: String(v) }) }}><Copy20Regular className="w-4 h-4" /></button>
                </div>
              ) : (
                <div>{v}</div>
              )}
            </div>
          ))}
        </div>
        {p.managerId && (
          <div className="mt-8 max-w-[640px]">
            <div className="text-[12px] text-[#616161] mb-2">Reports to</div>
            {(() => {
              const m = PEOPLE.find((x) => x.id === p.managerId)
              return m ? (
                <button onClick={() => setSel(m.id)} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#F5F5F5]">
                  <Avatar id={m.id} size={28} />
                  <span className="text-[13.5px]">{m.name}</span>
                  <span className="text-[12px] text-[#616161]">{m.title}</span>
                </button>
              ) : null
            })()}
            {PEOPLE.filter((x) => x.managerId === p.id).length > 0 && (
              <>
                <div className="text-[12px] text-[#616161] mb-2 mt-4">Direct reports</div>
                <div className="flex flex-wrap gap-1">
                  {PEOPLE.filter((x) => x.managerId === p.id).map((r) => (
                    <button key={r.id} onClick={() => setSel(r.id)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F5F5F5]">
                      <Avatar id={r.id} size={24} />
                      <span className="text-[13px]">{r.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── Files ─────────────────────────── */

export function FilesView() {
  const emails = useCollection<Email>('outlook.emails')
  const { open, toast } = useDesk()
  const [kind, setKind] = useState<'all' | 'docx' | 'xlsx' | 'pptx' | 'pdf'>('all')
  const [q, setQ] = useState('')
  const rows = useMemo(
    () =>
      emails
        .filter((e) => e.folder !== 'deleted' && e.attachments?.length)
        .flatMap((e) => (e.attachments ?? []).map((a, i) => ({ a, e, key: `${e.id}-${i}` })))
        .filter(({ a }) => (kind === 'all' || a.kind === kind) && a.name.toLowerCase().includes(q.toLowerCase()))
        .sort((x, y) => +new Date(y.e.date) - +new Date(x.e.date)),
    [emails, kind, q],
  )
  return (
    <div className={`flex-1 min-h-0 m-2 ${CARD} flex flex-col overflow-hidden`}>
      <div className="flex items-center gap-3 px-5 h-14 border-b border-[#F0F0F0] shrink-0">
        <span className="text-[18px] font-semibold">Files</span>
        <div className="flex gap-1 ml-3">
          {(['all', 'docx', 'xlsx', 'pptx', 'pdf'] as const).map((k) => (
            <button key={k} data-agent={`outlook-files-${k}`} onClick={() => setKind(k)} className={`h-7 px-3 rounded-full text-[12.5px] border ${kind === k ? 'bg-[#EBF3FC] border-[#0F6CBD] text-[#0F6CBD]' : 'border-[#E1DFDD] hover:bg-[#F5F5F5]'}`}>
              {k === 'all' ? 'All' : k === 'docx' ? 'Word' : k === 'xlsx' ? 'Excel' : k === 'pptx' ? 'PowerPoint' : 'PDF'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 h-8 w-[240px] px-2 rounded border border-[#D1D1D1] focus-within:border-[#0F6CBD]">
          <Search16Regular className="text-[#616161]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files" aria-label="Search files" className="flex-1 outline-none text-[13px]" />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_200px_140px_90px_90px] px-5 h-9 items-center text-[12px] text-[#616161] border-b border-[#F0F0F0] shrink-0">
        <span>Name</span>
        <span>From</span>
        <span>Date</span>
        <span>Size</span>
        <span />
      </div>
      <div className="flex-1 overflow-auto">
        {rows.length === 0 && <div className="p-10 text-center text-[13px] text-[#616161]">No attachments match.</div>}
        {rows.map(({ a, e, key }) => (
          <div key={key} className="grid grid-cols-[1fr_200px_140px_90px_90px] px-5 h-12 items-center text-[13px] border-b border-[#F7F7F7] hover:bg-[#FAFAFA]">
            <button className="flex items-center gap-2.5 min-w-0 text-left" onClick={() => (a.open ? open(a.open.appId, a.open.params) : toast({ appId: 'outlook', title: a.name, body: 'Preview isn’t available for this file type.' }))}>
              <FileIcon kind={a.kind} />
              <div className="min-w-0">
                <div className="truncate hover:underline">{a.name}</div>
                <div className="text-[11.5px] text-[#616161] truncate">{e.subject}</div>
              </div>
            </button>
            <span className="truncate">{e.folder === 'sent' ? 'You' : e.from.name}</span>
            <span className="text-[#616161]">{fmtSmart(e.date)}</span>
            <span className="text-[#616161]">{a.size}</span>
            <span className="flex gap-1">
              <button title="Go to message" aria-label="Go to message" className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]" onClick={() => open('outlook', { view: 'mail', emailId: e.id })}><Mail20Regular className="w-4 h-4" /></button>
              {a.open && <button title="Open" aria-label="Open" className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]" onClick={() => open(a.open!.appId, a.open!.params)}><Open20Regular className="w-4 h-4" /></button>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── To Do ─────────────────────────── */

interface Task {
  id: string
  title: string
  done?: boolean
  important?: boolean
  createdAt: string
  list?: string
}

export function TodoView() {
  const tasks = useCollection<Task>('outlook.tasks')
  const emails = useCollection<Email>('outlook.emails')
  const { open } = useDesk()
  const [list, setList] = useState<'myday' | 'important' | 'flagged' | 'tasks'>('tasks')
  const [text, setText] = useState('')
  const [showDone, setShowDone] = useState(false)
  const flagged = emails.filter((e) => e.flagged && e.folder !== 'deleted')
  const add = () => {
    const t = text.trim()
    if (!t) return
    db.insert('outlook.tasks', { id: uid('task'), title: t, createdAt: new Date().toISOString(), important: list === 'important', list: list === 'myday' ? 'myday' : undefined })
    setText('')
  }
  const visible = tasks.filter((t) => (list === 'important' ? t.important : list === 'myday' ? t.list === 'myday' : true))
  const open_ = visible.filter((t) => !t.done)
  const done = visible.filter((t) => t.done)
  const lists: [typeof list, string, number][] = [
    ['myday', 'My Day', tasks.filter((t) => t.list === 'myday' && !t.done).length],
    ['important', 'Important', tasks.filter((t) => t.important && !t.done).length],
    ['flagged', 'Flagged email', flagged.length],
    ['tasks', 'Tasks', tasks.filter((t) => !t.done).length],
  ]
  const TaskRow = ({ t }: { t: Task }) => (
    <div className="group flex items-center gap-3 px-4 h-12 bg-white rounded-md shadow-[0_0_1px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.08)] mb-1.5">
      <button aria-label={t.done ? 'Mark as not completed' : 'Mark as completed'} onClick={() => db.update('outlook.tasks', t.id, { done: !t.done })} className="text-[#0F6CBD]">
        {t.done ? <CheckmarkCircle20Filled /> : <Circle20Regular />}
      </button>
      <span className={`flex-1 text-[14px] truncate ${t.done ? 'line-through text-[#616161]' : ''}`}>{t.title}</span>
      <button aria-label="Delete task" className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#616161]" onClick={() => db.remove('outlook.tasks', t.id)}><Delete20Regular className="w-4 h-4" /></button>
      <button aria-label={t.important ? 'Remove importance' : 'Mark as important'} onClick={() => db.update('outlook.tasks', t.id, { important: !t.important })} className="text-[#0F6CBD]">
        {t.important ? <Star20Filled /> : <Star20Regular />}
      </button>
    </div>
  )
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="w-[220px] shrink-0 py-2 pr-1 text-[13.5px]">
        {lists.map(([id, label, n]) => (
          <button key={id} data-agent={`outlook-todo-${id}`} onClick={() => setList(id)} className={`relative w-full flex items-center gap-2 h-9 px-4 rounded text-left ${list === id ? 'bg-[#E1E1E1] font-semibold' : 'hover:bg-[#E9E9E9]'}`}>
            {list === id && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#0F6CBD]" />}
            <span className="flex-1">{label}</span>
            {n > 0 && <span className="text-[12px] text-[#616161]">{n}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0 m-2 ml-0 rounded-lg p-6 overflow-auto" style={{ background: 'linear-gradient(180deg,#EBF3FC,#F5F5F5)' }}>
        <div className="text-[24px] font-semibold text-[#0F6CBD]">{lists.find((l) => l[0] === list)?.[1]}</div>
        {list === 'myday' && <div className="text-[13px] text-[#616161]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>}
        {list === 'flagged' ? (
          <div className="mt-5">
            {flagged.length === 0 && <div className="text-[13px] text-[#616161]">Flag emails in Outlook to see them here.</div>}
            {flagged.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 h-14 bg-white rounded-md shadow-[0_0_1px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.08)] mb-1.5">
                <button aria-label="Mark as completed" title="Mark as completed" onClick={() => db.update('outlook.emails', e.id, { flagged: false })} className="text-[#0F6CBD]"><Circle20Regular /></button>
                <button className="flex-1 min-w-0 text-left" onClick={() => open('outlook', { view: 'mail', emailId: e.id })}>
                  <div className="text-[14px] truncate">{e.subject}</div>
                  <div className="text-[12px] text-[#616161] truncate flex items-center gap-1"><Flag20Regular className="w-3.5 h-3.5 text-[#C50F1F]" /> {e.from.name} · {fmtSmart(e.date)}</div>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-3 px-4 h-12 bg-white rounded-md shadow-[0_0_1px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.08)]">
              <Add20Regular className="text-[#0F6CBD]" />
              <input data-agent="outlook-todo-add" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add a task" aria-label="Add a task" className="flex-1 outline-none text-[14px]" />
              {text.trim() && <button onClick={add} className="h-7 px-3 rounded bg-[#0F6CBD] text-white text-[12.5px] font-semibold">Add</button>}
            </div>
            <div className="mt-3">
              {open_.map((t) => <TaskRow key={t.id} t={t} />)}
              {!open_.length && !done.length && <div className="text-[13px] text-[#616161] mt-2">No tasks yet. Add one above.</div>}
            </div>
            {done.length > 0 && (
              <div className="mt-4">
                <button className="text-[13px] font-semibold text-[#424242] mb-2" onClick={() => setShowDone((s) => !s)}>{showDone ? '▾' : '▸'} Completed {done.length}</button>
                {showDone && done.map((t) => <TaskRow key={t.id} t={t} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── Groups ─────────────────────────── */

export function GroupsView({ initial }: { initial?: string }) {
  const groups = useCollection<any>('teams.teams')
  const msgs = useCollection<any>('teams.messages')
  const { open } = useDesk()
  const [sel, setSel] = useState<string | undefined>(initial)
  const g = groups.find((x) => x.id === sel) ?? groups[0]
  const members = useMemo(() => {
    if (!g) return []
    const ids = new Set<string>([ME.id])
    for (const m of msgs) if (g.channels.some((c: any) => c.id === m.conversationId)) ids.add(m.from)
    return [...ids].map((id) => PEOPLE.find((p) => p.id === id)).filter(Boolean) as typeof PEOPLE
  }, [g, msgs])
  if (!g) return <div className="flex-1 flex items-center justify-center text-[#616161] text-[13px]">You’re not a member of any groups yet.</div>
  const groupEmail = `${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}@northwind.com`
  return (
    <div className="flex-1 min-h-0 flex">
      <div className={`w-[280px] shrink-0 m-2 ${CARD} overflow-auto`}>
        <div className="px-4 h-11 flex items-center text-[14px] font-semibold border-b border-[#F0F0F0]">Groups · {groups.length}</div>
        {groups.map((x) => (
          <button key={x.id} data-agent={`outlook-group-${x.id}`} onClick={() => setSel(x.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${g.id === x.id ? 'bg-[#EBF3FC]' : 'hover:bg-[#F5F5F5]'}`}>
            <span className="w-8 h-8 rounded-md text-white text-[11px] font-semibold flex items-center justify-center shrink-0" style={{ background: x.color }}>{x.initials}</span>
            <div className="min-w-0">
              <div className="text-[13.5px] truncate">{x.name}</div>
              <div className="text-[12px] text-[#616161] truncate">{x.channels.length} channels</div>
            </div>
          </button>
        ))}
      </div>
      <div className={`flex-1 m-2 ml-0 ${CARD} p-8 overflow-auto`}>
        <div className="flex items-center gap-4">
          <span className="w-16 h-16 rounded-lg text-white text-[20px] font-semibold flex items-center justify-center" style={{ background: g.color }}>{g.initials}</span>
          <div>
            <div className="text-[22px] font-semibold">{g.name}</div>
            <div className="text-[13px] text-[#616161]">{groupEmail} · {members.length} members</div>
          </div>
        </div>
        <div className="mt-3 text-[14px] text-[#424242] max-w-[640px]">{g.description}</div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => open('outlook', { view: 'mail', compose: { to: [groupEmail], subject: '' } })} className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5] flex items-center gap-1.5"><Mail20Regular className="text-[#0F6CBD]" /> Send email</button>
          <button onClick={() => open('teams', { channelId: g.channels[0]?.id })} className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5] flex items-center gap-1.5"><img src={logoUrl('teams')} className="w-4 h-4" alt="" /> Open in Teams</button>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-8 max-w-[760px]">
          <div>
            <div className="text-[12px] font-semibold text-[#616161] mb-2">Channels</div>
            {g.channels.map((c: any) => (
              <button key={c.id} onClick={() => open('teams', { channelId: c.id })} className="w-full flex items-center gap-2 h-8 px-2 rounded hover:bg-[#F5F5F5] text-[13.5px] text-left">
                <span className="text-[#616161]">#</span> {c.name}
              </button>
            ))}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#616161] mb-2">Members</div>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 h-9 px-2">
                <Avatar id={m.id} size={26} />
                <span className="text-[13.5px] flex-1 truncate">{m.name}{m.id === ME.id ? ' (you)' : ''}</span>
                <span className="text-[11.5px] text-[#616161]">{m.id === ME.id ? 'Owner' : 'Member'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Settings flyout ─────────────────────────── */

export function SettingsFlyout({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = usePrefs()
  const [draft, setDraft] = useState(prefs.autoReplyText || 'Thanks for your message. I’m currently out of the office with limited access to email and will respond when I’m back.')
  return (
    <div className="absolute right-2 top-14 bottom-2 z-40 w-[380px] bg-white rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.28)] flex flex-col" data-agent="outlook-settings">
      <div className="flex items-center px-5 h-14 border-b border-[#EDEBE9] shrink-0">
        <span className="text-[18px] font-semibold flex-1">Settings</span>
        <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label="Close settings" onClick={onClose}><Dismiss20Regular /></button>
      </div>
      <div className="flex-1 overflow-auto p-5 space-y-6 text-[13.5px]">
        <section>
          <div className="font-semibold mb-2">Automatic replies</div>
          <div className="flex items-center gap-3">
            <Toggle on={!!prefs.autoReply} onChange={(v) => setPrefs({ autoReply: v, autoReplyText: draft })} agent="outlook-autoreply-toggle" label="Turn on automatic replies" />
            <span>Turn on automatic replies</span>
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setPrefs({ autoReplyText: draft })} aria-label="Automatic reply message" className="mt-3 w-full h-24 resize-none rounded border border-[#D1D1D1] p-2 text-[13px] outline-none focus:border-[#0F6CBD]" />
          <div className="text-[12px] text-[#616161] mt-1">Sent once to each sender while automatic replies are on.</div>
        </section>
        <section>
          <div className="font-semibold mb-2">Layout</div>
          <div className="text-[12.5px] text-[#616161] mb-1">Message list density</div>
          <div className="flex gap-2">
            {(['roomy', 'compact'] as const).map((d) => (
              <label key={d} className="flex items-center gap-2 h-8 px-3 rounded border border-[#D1D1D1] cursor-pointer">
                <input type="radio" name="density" checked={prefs.density === d} onChange={() => setPrefs({ density: d })} className="accent-[#0F6CBD]" /> {d === 'roomy' ? 'Roomy' : 'Compact'}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Toggle on={prefs.preview !== false} onChange={(v) => setPrefs({ preview: v })} label="Show message preview text" />
            <span>Show message preview text</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Toggle on={prefs.senderImages !== false} onChange={(v) => setPrefs({ senderImages: v })} label="Show sender images" />
            <span>Show sender images</span>
          </div>
        </section>
        <section>
          <div className="font-semibold mb-2">Account</div>
          <div className="flex items-center gap-3">
            <Avatar id={ME.id} size={40} />
            <div>
              <div>{ME.name}</div>
              <div className="text-[12.5px] text-[#616161]">{ME.email}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ─────────────────────────── Notifications ─────────────────────────── */

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const events = useCollection<any>('outlook.events')
  const emails = useCollection<Email>('outlook.emails')
  const { open } = useDesk()
  const now = Date.now()
  const upcoming = events
    .filter((e) => !e.allDay && +new Date(e.end) > now && +new Date(e.start) < now + 2 * 86400000)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .slice(0, 5)
  const unreadImportant = emails.filter((e) => e.folder === 'inbox' && !e.read && (e.important || e.flagged)).slice(0, 4)
  return (
    <div className="absolute right-0 top-12 z-50 w-[360px] bg-white text-[#242424] rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.22)] border border-black/5" data-agent="outlook-notifications">
      <div className="flex items-center px-4 h-11 border-b border-[#EDEBE9]">
        <span className="font-semibold text-[14px] flex-1">Notifications</span>
        <button className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label="Close notifications" onClick={onClose}><Dismiss20Regular className="w-4 h-4" /></button>
      </div>
      <div className="max-h-[420px] overflow-auto py-1">
        <div className="px-4 pt-2 pb-1 text-[11.5px] font-semibold text-[#616161]">Upcoming events</div>
        {upcoming.length === 0 && <div className="px-4 py-2 text-[13px] text-[#616161]">Nothing in the next 48 hours.</div>}
        {upcoming.map((e) => {
          const s = new Date(e.start)
          const mins = Math.round((+s - now) / 60000)
          return (
            <div key={e.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[#F5F5F5]">
              <button className="flex-1 min-w-0 text-left" onClick={() => { open('outlook', { view: 'calendar', eventId: e.id }); onClose() }}>
                <div className="text-[13px] font-semibold truncate">{e.title}</div>
                <div className="text-[12px] text-[#616161]">{mins <= 0 ? 'Now' : mins < 60 ? `In ${mins} min` : s.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · {e.teams ? 'Microsoft Teams Meeting' : e.location || 'No location'}</div>
              </button>
              {e.teams && <button onClick={() => { open('teams', { meetingId: e.id }); onClose() }} className="h-7 px-2.5 rounded bg-[#5B5FC7] text-white text-[12px] font-semibold">Join</button>}
            </div>
          )
        })}
        <div className="px-4 pt-3 pb-1 text-[11.5px] font-semibold text-[#616161]">Needs your attention</div>
        {unreadImportant.length === 0 && <div className="px-4 py-2 text-[13px] text-[#616161]">You’re all caught up.</div>}
        {unreadImportant.map((e) => (
          <button key={e.id} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#F5F5F5] text-left" onClick={() => { open('outlook', { view: 'mail', emailId: e.id }); onClose() }}>
            <Avatar email={e.from.email} name={e.from.name} size={28} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold truncate">{e.subject}</div>
              <div className="text-[12px] text-[#616161] truncate">{personByEmail(e.from.email)?.name ?? e.from.name} · {fmtSmart(e.date)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export const TIPS = [
  ['Snooze messages', 'Use Snooze on the Home tab to make an email disappear until you’re ready for it.'],
  ['Drag to file', 'Drag a message from the list onto any folder to move it.'],
  ['Pin what matters', 'Pinned messages stay at the top of your inbox.'],
  ['Right-click for more', 'Right-click any message for quick actions like Categorize, Flag and Archive.'],
  ['Share your calendar', 'Use Share on the Calendar ribbon so teammates can see when you’re free.'],
]
