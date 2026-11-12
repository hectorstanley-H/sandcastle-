import { useMemo, useState } from 'react'
import {
  Calendar24Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  Video20Regular,
  CalendarAdd20Regular,
  Call20Regular,
  CallMissed16Regular,
  Dialpad20Regular,
  Folder20Regular,
  Document20Regular,
  Star20Regular,
  Star20Filled,
  Dismiss20Regular,
  Backspace20Regular,
  Chat20Regular,
} from '@fluentui/react-icons'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person, personByEmail } from '@/data/people'
import { fmtTime } from '@/data/time'
import { logoUrl } from '@/os/registry'
import { PURPLE, fmtDuration, useTeamsPrefs } from './ui'
import type { CallState } from './Call'

const listTime = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return fmtTime(iso)
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 6 && diff > 0) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

const idsFromEmails = (emails: string[]) => emails.map((e) => personByEmail(e)?.id).filter(Boolean) as string[]

export function meetingFromEvent(e: any): CallState {
  return { kind: 'meeting', title: e.title, participants: [ME.id, ...idsFromEmails([e.organizer, ...(e.attendees ?? [])]).filter((x) => x !== ME.id)], video: true }
}

/* ───────────────────────────── calendar ───────────────────────────── */

export function CalendarView({ onCall }: { onCall: (c: CallState) => void }) {
  const events = useCollection<any>('outlook.events')
  const { open } = useDesk()
  const [offset, setOffset] = useState(0)
  const [sel, setSel] = useState<any>(null)
  const start = new Date()
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7)
  start.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 5 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const hours = Array.from({ length: 10 }, (_, i) => 8 + i)
  const H = 52
  return (
    <div className="relative flex-1 min-w-0 flex flex-col bg-white">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-3 border-b border-[#E0E0E0]">
        <Calendar24Regular style={{ color: PURPLE }} />
        <span className="text-[18px] font-semibold">Calendar</span>
        <button data-agent="teams-cal-today" className="ml-4 h-8 px-3 rounded-md border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]" onClick={() => setOffset(0)}>Today</button>
        <button aria-label="Previous week" className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={() => setOffset((o) => o - 1)}><ChevronLeft20Regular /></button>
        <button aria-label="Next week" className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={() => setOffset((o) => o + 1)}><ChevronRight20Regular /></button>
        <span className="text-[14px] font-semibold">{start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <div className="flex-1" />
        <button data-agent="teams-cal-meetnow" className="h-8 px-3 rounded-md border border-[#D1D1D1] text-[13px] flex items-center gap-1.5 hover:bg-[#F5F5F5]" onClick={() => onCall({ kind: 'meeting', title: `Meeting with ${ME.name}`, participants: [ME.id], video: true })}>
          <Video20Regular /> Meet now
        </button>
        <button data-agent="teams-cal-new" className="h-8 px-3 rounded-md text-white text-[13px] font-semibold flex items-center gap-1.5" style={{ background: PURPLE }} onClick={() => open('outlook', { view: 'calendar', newEvent: { teams: true } })}>
          <CalendarAdd20Regular /> New meeting
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid sticky top-0 bg-white z-10 border-b border-[#E0E0E0]" style={{ gridTemplateColumns: `56px repeat(5, 1fr)` }}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className={`px-3 py-2 ${d.toDateString() === new Date().toDateString() ? 'text-[#5B5FC7]' : ''}`}>
              <div className="text-[22px] font-semibold leading-none">{d.getDate()}</div>
              <div className="text-[12px]">{d.toLocaleDateString('en-US', { weekday: 'long' })}</div>
            </div>
          ))}
        </div>
        <div className="grid relative" style={{ gridTemplateColumns: `56px repeat(5, 1fr)` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[11px] text-[#616161] text-right pr-2" style={{ height: H }}>
                {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className="relative border-l border-[#EDEBE9]">
              {hours.map((h) => (
                <div key={h} className="border-b border-[#F0F0F0]" style={{ height: H }} />
              ))}
              {events
                .filter((e: any) => new Date(e.start).toDateString() === d.toDateString() && !e.allDay)
                .map((e: any) => {
                  const s = new Date(e.start)
                  const top = (s.getHours() + s.getMinutes() / 60 - 8) * H
                  const h = Math.max(22, ((+new Date(e.end) - +s) / 3600000) * H - 2)
                  return (
                    <button key={e.id} data-agent={`teams-cal-event-${e.id}`} onClick={() => setSel(e)} className="absolute left-1 right-1 rounded-[3px] px-2 py-1 text-[11.5px] overflow-hidden border-l-[3px] text-left hover:brightness-95" style={{ top, height: h, background: '#E8EBFA', borderColor: PURPLE }}>
                      <div className="font-semibold truncate">{e.title}</div>
                      <div className="text-[#616161] truncate">{e.location ?? 'Microsoft Teams Meeting'}</div>
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
      {sel && (
        <div className="absolute inset-0 z-30" onMouseDown={() => setSel(null)}>
          <div className="absolute right-6 top-20 w-[360px] bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.24)] p-5" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="text-[17px] font-semibold">{sel.title}</div>
                <div className="text-[13px] text-[#616161] mt-0.5">{new Date(sel.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtTime(sel.start)} – {fmtTime(sel.end)}</div>
              </div>
              <button aria-label="Close" className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={() => setSel(null)}><Dismiss20Regular /></button>
            </div>
            <div className="mt-3 text-[13px]">{sel.teams ? 'Microsoft Teams Meeting' : sel.location || 'No location'}</div>
            <div className="mt-3 flex -space-x-1.5">
              {[sel.organizer, ...(sel.attendees ?? [])].slice(0, 8).map((a: string) => <span key={a} className="ring-2 ring-white rounded-full"><Avatar email={a} name={personByEmail(a)?.name ?? a} size={26} /></span>)}
            </div>
            <div className="mt-4 flex gap-2">
              {sel.teams && (
                <button data-agent="teams-cal-join" className="h-8 px-4 rounded text-white text-[13px] font-semibold flex items-center gap-1.5" style={{ background: PURPLE }} onClick={() => { onCall(meetingFromEvent(sel)); setSel(null) }}><Video20Regular /> Join</button>
              )}
              <button className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]" onClick={() => { open('outlook', { view: 'calendar', eventId: sel.id }); setSel(null) }}>Open in Outlook</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── calls ───────────────────────────── */

const STATIC_HIST = [
  ['rachel', 'Missed', 1],
  ['priya', 'Outgoing · 12m 40s', 1],
  ['ben', 'Incoming · 4m 12s', 2],
  ['elena', 'Outgoing · 31m 05s', 2],
  ['oliver', 'Incoming · 2m 51s', 3],
  ['maya', 'Outgoing · 7m 22s', 4],
] as const

export function CallsView({ onCall, onChat }: { onCall: (c: CallState) => void; onChat: (personId: string) => void }) {
  const calls = useCollection<any>('teams.calls')
  const [num, setNum] = useState('')
  const [tab, setTab] = useState<'all' | 'missed'>('all')
  const q = num.trim().toLowerCase()
  const matches = q && !/^[\d+*#\s()-]+$/.test(q) ? PEOPLE.filter((p) => p.id !== ME.id && p.name.toLowerCase().includes(q)).slice(0, 4) : []
  const hist = [
    ...[...calls].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map((c) => ({ id: c.with as string, label: `${c.direction} · ${fmtDuration(c.seconds)}`, date: new Date(c.date), missed: false, key: c.id as string })),
    ...STATIC_HIST.map(([id, t, d]) => ({ id: id as string, label: t as string, date: new Date(Date.now() - d * 86400000), missed: t === 'Missed', key: id + t })),
  ].filter((h) => tab === 'all' || h.missed)
  const dial = () => {
    if (!num.trim()) return
    const p = matches[0]
    onCall(p ? { kind: 'call', title: p.name, participants: [ME.id, p.id], video: false, conversationId: `chat-${p.id}` } : { kind: 'call', title: num.trim(), participants: [ME.id, num.trim()], video: false, number: num.trim() })
  }
  const nameOf = (id: string) => (id.startsWith('+') || /^\d/.test(id) ? id : person(id).name)
  return (
    <div className="flex-1 min-w-0 flex bg-white">
      <div className="w-[340px] border-r border-[#E0E0E0] p-5">
        <div className="text-[18px] font-semibold mb-4">Calls</div>
        <div className="relative">
          <div className="h-10 rounded-md border border-[#D1D1D1] focus-within:border-[#5B5FC7] flex items-center px-3 gap-2">
            <input data-agent="teams-dial-input" value={num} onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && dial()} placeholder="Type a name or number" aria-label="Type a name or number" className="flex-1 outline-none text-[14px]" />
            {num && <button aria-label="Delete" className="text-[#616161]" onClick={() => setNum((n) => n.slice(0, -1))}><Backspace20Regular /></button>}
          </div>
          {matches.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-11 bg-white rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] py-1">
              {matches.map((p) => (
                <button key={p.id} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F5F5F5] text-left" onClick={() => onCall({ kind: 'call', title: p.name, participants: [ME.id, p.id], video: false, conversationId: `chat-${p.id}` })}>
                  <Avatar id={p.id} size={26} />
                  <span className="text-[13.5px]">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
            <button key={k} className="h-12 rounded-md bg-[#F5F5F5] text-[18px] hover:bg-[#EBEBEB]" onClick={() => setNum((n) => n + k)}>
              {k}
            </button>
          ))}
        </div>
        <button data-agent="teams-dial-call" disabled={!num.trim()} onClick={dial} className="mt-4 w-full h-9 rounded-md text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: PURPLE }}>
          <Call20Regular /> Call
        </button>
        <div className="mt-6 flex items-center gap-2 text-[13px] text-[#616161]">
          <Dialpad20Regular /> Work number: +1 (617) 555-0142
        </div>
      </div>
      <div className="flex-1 p-5 overflow-auto">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-[15px] font-semibold">History</span>
          {(['all', 'missed'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`h-7 px-3 rounded-full text-[12.5px] border ${tab === t ? 'border-[#5B5FC7] text-[#5B5FC7] bg-[#E8EBFA]' : 'border-[#E0E0E0] hover:bg-[#F5F5F5]'}`}>{t === 'all' ? 'All' : 'Missed'}</button>
          ))}
        </div>
        {hist.map((h) => (
          <div key={h.key} className="flex items-center gap-3 h-14 border-b border-[#F0F0F0]">
            {h.id.startsWith('+') || /^\d/.test(h.id) ? <span className="w-9 h-9 rounded-full bg-[#F0F0F0] flex items-center justify-center">☎</span> : <Avatar id={h.id} size={36} />}
            <div className="flex-1">
              <div className={`text-[14px] ${h.missed ? 'text-[#C4314B] font-semibold' : ''}`}>{nameOf(h.id)}</div>
              <div className="text-[12px] text-[#616161] flex items-center gap-1">
                {h.missed && <CallMissed16Regular />} {h.label}
              </div>
            </div>
            <span className="text-[12px] text-[#616161]">{h.date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</span>
            {!(h.id.startsWith('+') || /^\d/.test(h.id)) && (
              <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label={`Chat with ${nameOf(h.id)}`} onClick={() => onChat(h.id)}>
                <Chat20Regular />
              </button>
            )}
            <button
              className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center"
              aria-label={`Call ${nameOf(h.id)}`}
              onClick={() => onCall({ kind: 'call', title: nameOf(h.id), participants: [ME.id, h.id], video: false, conversationId: h.id.startsWith('+') ? undefined : `chat-${h.id}` })}
            >
              <Call20Regular />
            </button>
          </div>
        ))}
        {!hist.length && <div className="text-[13px] text-[#616161] py-6">No missed calls.</div>}
      </div>
    </div>
  )
}

/* ───────────────────────────── OneDrive ───────────────────────────── */

export function OneDriveView() {
  const files = useCollection<any>('files')
  const msgs = useCollection<any>('teams.messages')
  const { open } = useDesk()
  const [prefs, setPrefs] = useTeamsPrefs()
  const [tab, setTab] = useState<'Home' | 'My files' | 'Shared' | 'Favorites'>('Home')
  const favs = prefs.favFiles ?? []
  const sharedNames = useMemo(() => new Set(msgs.flatMap((m) => (m.attachments ?? []).map((a: any) => a.name))), [msgs])
  const list = useMemo(() => {
    let l = [...files]
    if (tab === 'Home') l.sort((a, b) => +new Date(b.modified ?? 0) - +new Date(a.modified ?? 0))
    if (tab === 'My files') l.sort((a, b) => a.name.localeCompare(b.name))
    if (tab === 'Shared') l = l.filter((f) => f.folder === 'Documents' || sharedNames.has(f.name))
    if (tab === 'Favorites') l = l.filter((f) => favs.includes(f.id))
    return l
  }, [files, tab, favs, sharedNames])
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-white">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-3 border-b border-[#E0E0E0]">
        <img src={logoUrl('onedrive')} className="w-6 h-6" alt="" />
        <span className="text-[18px] font-semibold">OneDrive</span>
        <div className="flex gap-4 ml-6 text-[14px] h-full">
          {(['Home', 'My files', 'Shared', 'Favorites'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative h-full ${tab === t ? 'font-semibold' : 'text-[#424242] hover:text-[#242424]'}`}>
              {t}
              {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t" style={{ background: PURPLE }} />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-5 py-3">
        <div className="grid grid-cols-[32px_1fr_160px_160px_100px] text-[12px] text-[#616161] h-9 items-center border-b border-[#EDEBE9]">
          <span />
          <span>Name</span>
          <span>Opened</span>
          <span>Owner</span>
          <span>Size</span>
        </div>
        {list.length === 0 && <div className="py-10 text-center text-[13px] text-[#616161]">{tab === 'Favorites' ? 'Star files to add them to Favorites.' : 'Nothing here yet.'}</div>}
        {list.map((f: any) => (
          <div key={f.id} className="grid grid-cols-[32px_1fr_160px_160px_100px] items-center h-11 border-b border-[#F5F5F5] text-[13.5px] hover:bg-[#F5F5F5]">
            <button aria-label={favs.includes(f.id) ? 'Remove from favorites' : 'Add to favorites'} className="w-7 h-7 rounded flex items-center justify-center" style={{ color: favs.includes(f.id) ? PURPLE : '#9E9E9E' }} onClick={() => setPrefs({ favFiles: favs.includes(f.id) ? favs.filter((x) => x !== f.id) : [...favs, f.id] })}>
              {favs.includes(f.id) ? <Star20Filled /> : <Star20Regular />}
            </button>
            <button onClick={() => f.open && open(f.open.appId, f.open.params)} className="flex items-center gap-2.5 min-w-0 text-left">
              {['xlsx', 'docx', 'pptx'].includes(f.kind) ? <img src={logoUrl(f.kind === 'xlsx' ? 'excel' : f.kind === 'docx' ? 'word' : 'powerpoint')} className="w-5 h-5" alt="" /> : f.kind === 'zip' ? <Folder20Regular /> : <Document20Regular />}
              <span className="truncate hover:underline">{f.name}</span>
            </button>
            <span className="text-[12.5px] text-[#616161]">{listTime(f.modified)}</span>
            <span className="text-[12.5px] text-[#616161]">{ME.name}</span>
            <span className="text-[12.5px] text-[#616161]">{f.size}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────── apps ───────────────────────────── */

const APPS: [string, string, string, string?][] = [
  ['Planner', '#31752F', 'Tasks by Planner and To Do'],
  ['Approvals', '#0F6CBD', 'Approvals'],
  ['Viva Insights', '#8764B8', 'Wellbeing and productivity'],
  ['Power BI', 'powerbi', 'Dashboards and reports', 'powerbi'],
  ['Jira Cloud', 'jira', 'Atlassian', 'jira'],
  ['ServiceNow', 'servicenow', 'ITSM', 'servicenow'],
  ['Salesforce', 'salesforce', 'CRM', 'salesforce'],
  ['Workday', 'workday', 'HR', 'workday'],
  ['Polly', '#2D9CDB', 'Polls and surveys'],
  ['Forms', '#038387', 'Microsoft Forms'],
  ['Shifts', '#0078D4', 'Frontline scheduling'],
  ['H-Worker', 'hworker', 'AI coworkers for your apps', 'hworker'],
]

export function AppsView() {
  const { open, toast } = useDesk()
  const [prefs, setPrefs] = useTeamsPrefs()
  const [q, setQ] = useState('')
  const added = prefs.addedApps ?? []
  const list = APPS.filter(([n, , d]) => (n + ' ' + d).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex-1 min-w-0 overflow-auto bg-white p-6">
      <div className="flex items-center gap-4 mb-1">
        <div className="text-[20px] font-semibold flex-1">Apps</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" aria-label="Search apps" className="h-8 w-[260px] px-3 rounded-md border border-[#D1D1D1] text-[13px] outline-none focus:border-[#5B5FC7]" />
      </div>
      <div className="text-[13px] text-[#616161] mb-5">Built for your org · Popular in Northwind Global</div>
      <div className="grid grid-cols-4 gap-4 max-w-[1000px]">
        {list.map(([n, c, d, appId]) => {
          const isAdded = !!appId || added.includes(n)
          return (
            <div key={n} className="flex items-center gap-3 p-3 rounded-lg border border-[#E0E0E0] hover:shadow-md">
              {c.startsWith('#') ? (
                <span className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-semibold shrink-0" style={{ background: c }}>
                  {n[0]}
                </span>
              ) : (
                <img src={logoUrl(c)} className="w-11 h-11 rounded-lg p-1.5 bg-[#F5F5F5] shrink-0" alt="" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold truncate">{n}</div>
                <div className="text-[12px] text-[#616161] truncate">{d}</div>
              </div>
              <button
                data-agent={`teams-app-${n.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                className={`h-7 px-2.5 rounded-md text-[12.5px] font-semibold shrink-0 ${isAdded ? 'border border-[#D1D1D1] hover:bg-[#F5F5F5]' : 'text-white'}`}
                style={isAdded ? undefined : { background: PURPLE }}
                onClick={() => {
                  if (appId) return open(appId)
                  if (added.includes(n)) {
                    setPrefs({ addedApps: added.filter((x) => x !== n) })
                    toast({ appId: 'teams', title: `${n} removed`, body: 'The app was removed from Teams.' })
                  } else {
                    setPrefs({ addedApps: [...added, n] })
                    toast({ appId: 'teams', title: `${n} added`, body: `${n} is now available in your chats and channels.` })
                  }
                }}
              >
                {appId ? 'Open' : added.includes(n) ? 'Remove' : 'Add'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────────── search ───────────────────────────── */

export function SearchView({ query, onOpenConv, onChat }: { query: string; onOpenConv: (convId: string) => void; onChat: (personId: string) => void }) {
  const msgs = useCollection<any>('teams.messages')
  const teams = useCollection<any>('teams.teams')
  const chats = useCollection<any>('teams.chats')
  const [tab, setTab] = useState<'all' | 'messages' | 'people' | 'channels'>('all')
  const q = query.toLowerCase()
  const people = PEOPLE.filter((p) => p.id !== ME.id && (p.name + ' ' + p.email + ' ' + p.title).toLowerCase().includes(q))
  const channels = teams.flatMap((t: any) => t.channels.map((c: any) => ({ ...c, team: t }))).filter((c: any) => (c.name + ' ' + c.team.name).toLowerCase().includes(q))
  const found = msgs.filter((m) => !m.deleted && (m.text + ' ' + (m.subject ?? '')).toLowerCase().includes(q)).sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 40)
  const where = (convId: string) => {
    const c = chats.find((x: any) => x.id === convId)
    if (c) return c.title ?? (c.kind === 'oneOnOne' ? person(c.members.find((x: string) => x !== ME.id) ?? ME.id).name : 'Group chat')
    const t = teams.find((x: any) => x.channels.some((ch: any) => ch.id === convId))
    return t ? `${t.name} › ${t.channels.find((ch: any) => ch.id === convId)?.name}` : convId
  }
  const hl = (text: string) => {
    const i = text.toLowerCase().indexOf(q)
    if (i < 0) return text.slice(0, 160)
    const s = Math.max(0, i - 50)
    return (
      <>
        {s > 0 ? '…' : ''}
        {text.slice(s, i)}
        <mark className="bg-[#FFF100]">{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length, i + q.length + 110)}
      </>
    )
  }
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-white" data-agent="teams-search-results">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-4 border-b border-[#E0E0E0]">
        <span className="text-[18px] font-semibold">Results for “{query}”</span>
        {(['all', 'messages', 'people', 'channels'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-7 px-3 rounded-full text-[12.5px] border ${tab === t ? 'border-[#5B5FC7] text-[#5B5FC7] bg-[#E8EBFA]' : 'border-[#E0E0E0] hover:bg-[#F5F5F5]'}`}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-5 space-y-6">
        {(tab === 'all' || tab === 'people') && people.length > 0 && (
          <section>
            <div className="text-[13px] font-semibold text-[#616161] mb-2">People</div>
            <div className="flex flex-wrap gap-2">
              {people.slice(0, tab === 'all' ? 6 : 50).map((p) => (
                <button key={p.id} onClick={() => onChat(p.id)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[#E0E0E0] hover:bg-[#F5F5F5] w-[260px] text-left">
                  <Avatar id={p.id} size={32} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{p.name}</div>
                    <div className="text-[12px] text-[#616161] truncate">{p.title}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
        {(tab === 'all' || tab === 'channels') && channels.length > 0 && (
          <section>
            <div className="text-[13px] font-semibold text-[#616161] mb-2">Channels</div>
            {channels.map((c: any) => (
              <button key={c.id} onClick={() => onOpenConv(c.id)} className="w-full flex items-center gap-2.5 px-3 h-10 rounded-md hover:bg-[#F5F5F5] text-left">
                <span className="w-7 h-7 rounded-md text-white text-[10px] font-semibold flex items-center justify-center" style={{ background: c.team.color }}>{c.team.initials}</span>
                <span className="text-[13.5px]">{c.name}</span>
                <span className="text-[12px] text-[#616161]">{c.team.name}</span>
              </button>
            ))}
          </section>
        )}
        {(tab === 'all' || tab === 'messages') && (
          <section>
            <div className="text-[13px] font-semibold text-[#616161] mb-2">Messages</div>
            {found.length === 0 && <div className="text-[13px] text-[#616161]">No messages match “{query}”.</div>}
            {found.map((m) => (
              <button key={m.id} onClick={() => onOpenConv(m.conversationId)} className="w-full flex gap-3 px-3 py-2.5 rounded-md hover:bg-[#F5F5F5] text-left">
                <Avatar id={m.from} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-[#616161]">
                    <span className="font-semibold text-[#242424]">{person(m.from).name}</span> · {where(m.conversationId)} · {listTime(m.date)}
                  </div>
                  <div className="text-[13.5px] line-clamp-2">{hl(m.text)}</div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
