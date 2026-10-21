import { useEffect, useMemo, useState } from 'react'
import {
  AtSign,
  Bell,
  Calendar,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock,
  Copy,
  FileText,
  Hash,
  House,
  LayoutGrid,
  Mail,
  MessageCircle,
  MonitorUp,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Smile,
  Sparkles,
  Star,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk } from '@/os/context'
import { db, uid, useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, person, personByEmail } from '@/data/people'
import { isoDate } from '@/data/time'

type Tab = 'home' | 'chat' | 'meetings' | 'calendar' | 'docs' | 'contacts'
const BLUE = '#0B5CFF'

const fmtT = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const t = new Date()
  const tm = new Date(Date.now() + 86400000)
  if (d.toDateString() === t.toDateString()) return 'Today'
  if (d.toDateString() === tm.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function HWBadge({ text = 'Scheduled by H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full text-[10.5px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> {text}
    </span>
  )
}

export default function Zoom({ win, params }: AppProps) {
  const [tab, setTab] = useState<Tab>('home')
  const [sched, setSched] = useState(false)
  const [selMeeting, setSelMeeting] = useState<string | null>(null)
  const [mtab, setMtab] = useState<'upcoming' | 'recorded'>('upcoming')
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!params) return
    if (params.meetingId) {
      setTab('meetings')
      setMtab('upcoming')
      setSelMeeting(params.meetingId)
    } else if (params.recordingId) {
      setTab('meetings')
      setMtab('recorded')
      setSelMeeting(params.recordingId)
    } else if (params.tab) setTab(params.tab)
  }, [win.nonce])

  const tabs: [Tab, any, string][] = [
    ['home', House, 'Home'],
    ['chat', MessageCircle, 'Team Chat'],
    ['meetings', Video, 'Meetings'],
    ['calendar', Calendar, 'Calendar'],
    ['docs', FileText, 'Docs'],
    ['contacts', Users, 'Contacts'],
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white text-[#131619] relative" style={{ fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif" }}>
      {/* title / nav bar */}
      <div data-drag-handle className="h-[58px] shrink-0 flex items-center bg-[#F7F7FA] border-b border-[#E4E4ED]">
        <div className="w-[300px] flex items-center gap-2 pl-3" data-no-drag>
          <img src={logoUrl('zoom-wordmark')} className="h-[13px] mr-2" alt="Zoom" />
          <div className="flex items-center h-8 flex-1 max-w-[200px] rounded-[8px] bg-white border border-[#E4E4ED] px-2 gap-1.5 text-[#6E7680]">
            <Search size={14} />
            <span className="text-[12.5px]">Search</span>
            <span className="ml-auto text-[11px]">Ctrl+F</span>
          </div>
        </div>
        <div className="flex-1 flex justify-center gap-1" data-no-drag>
          {tabs.map(([id, I, l]) => (
            <button key={id} data-agent={`zoom-tab-${id}`} aria-label={l} onClick={() => setTab(id)} className={`w-[72px] h-[50px] rounded-[8px] flex flex-col items-center justify-center gap-0.5 ${tab === id ? 'text-[#0B5CFF]' : 'text-[#3F4752] hover:bg-[#ECECF2]'}`}>
              <I size={20} strokeWidth={tab === id ? 2.3 : 1.8} />
              <span className="text-[11px] font-medium">{l}</span>
            </button>
          ))}
          <button className="w-[60px] h-[50px] rounded-[8px] flex flex-col items-center justify-center gap-0.5 text-[#3F4752] hover:bg-[#ECECF2]">
            <MoreHorizontal size={20} />
            <span className="text-[11px] font-medium">More</span>
          </button>
        </div>
        <div className="w-[300px] flex items-center justify-end gap-2 pr-1" data-no-drag>
          <button className="flex items-center gap-1 h-8 px-2.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#0B5CFF] to-[#7B61FF] text-white text-[12px] font-semibold"><Sparkles size={13} /> AI Companion</button>
          <button className="relative">
            <Avatar id={ME.id} size={30} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00A35C] border-2 border-[#F7F7FA]" />
          </button>
          <WindowControls height={58} />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        {tab === 'home' && <HomeTab now={now} onSchedule={() => setSched(true)} openMeeting={(id) => { setTab('meetings'); setMtab('upcoming'); setSelMeeting(id) }} />}
        {tab === 'chat' && <ChatTab />}
        {tab === 'meetings' && <MeetingsTab mtab={mtab} setMtab={setMtab} sel={selMeeting} setSel={setSelMeeting} onSchedule={() => setSched(true)} />}
        {(tab === 'calendar' || tab === 'docs' || tab === 'contacts') && <SimpleTab tab={tab} />}
      </div>
      {sched && (
        <ScheduleModal
          onClose={() => setSched(false)}
          onSaved={(id) => {
            setSched(false)
            setTab('meetings')
            setMtab('upcoming')
            setSelMeeting(id)
          }}
        />
      )}
    </div>
  )
}

/* ───────────────────────── Home ───────────────────────── */
function HomeTab({ now, onSchedule, openMeeting }: { now: Date; onSchedule: () => void; openMeeting: (id: string) => void }) {
  const meetings = useCollection<any>('zoom.meetings')
  const upcoming = meetings.filter((m) => +new Date(m.start) + m.durationMins * 60000 > Date.now()).sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const todays = upcoming.filter((m) => new Date(m.start).toDateString() === now.toDateString())
  const big: [string, any, string, string, (() => void) | undefined][] = [
    ['New meeting', Video, '#FF742E', 'zoom-new-meeting', undefined],
    ['Join', Plus, BLUE, 'zoom-join', undefined],
    ['Schedule', CalendarPlus, BLUE, 'zoom-schedule', onSchedule],
    ['Share screen', MonitorUp, BLUE, 'zoom-share', undefined],
  ]
  return (
    <div className="flex-1 flex items-center justify-center gap-16 bg-white px-10">
      <div className="grid grid-cols-2 gap-x-12 gap-y-8">
        {big.map(([l, I, c, a, fn]) => (
          <div key={l} className="flex flex-col items-center gap-2">
            <button data-agent={a} aria-label={l} onClick={fn} className="w-[76px] h-[76px] rounded-[22px] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(11,92,255,0.22)] hover:brightness-110" style={{ background: c }}>
              <I size={34} strokeWidth={2} />
            </button>
            <span className="text-[13px] text-[#3F4752] flex items-center gap-0.5">{l}{l === 'New meeting' && <ChevronDown size={12} />}</span>
          </div>
        ))}
      </div>
      <div className="w-[460px] rounded-[14px] border border-[#E4E4ED] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="h-[150px] relative text-white px-6 flex flex-col justify-center" style={{ background: 'linear-gradient(135deg,#1E3C72 0%, #2A5298 45%, #5B8DEF 100%)' }}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0, transparent 35%), radial-gradient(circle at 20% 90%, #9fd3ff 0, transparent 40%)' }} />
          <div className="relative text-[44px] font-semibold leading-none">{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
          <div className="relative text-[15px] mt-2 opacity-90">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        <div className="max-h-[300px] overflow-auto">
          {todays.length === 0 && <div className="p-8 text-center text-[13px] text-[#6E7680]">No upcoming meetings today</div>}
          {todays.map((m) => (
            <button key={m.id} onClick={() => openMeeting(m.id)} className="w-full text-left px-5 py-3 border-b border-[#F0F0F5] hover:bg-[#F7F7FA] flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[#6E7680]">{fmtT(m.start)} - {fmtT(new Date(+new Date(m.start) + m.durationMins * 60000).toISOString())}</div>
                <div className="text-[14px] font-semibold truncate">{m.topic}</div>
                <div className="text-[12px] text-[#6E7680]">Meeting ID: {m.meetingNumber}</div>
              </div>
              <span className="h-8 px-4 rounded-[8px] bg-[#0B5CFF] text-white text-[13px] font-semibold flex items-center">Start</span>
            </button>
          ))}
          {upcoming
            .filter((m) => !todays.includes(m))
            .slice(0, 3)
            .map((m) => (
              <button key={m.id} onClick={() => openMeeting(m.id)} className="w-full text-left px-5 py-3 border-b border-[#F0F0F5] hover:bg-[#F7F7FA]">
                <div className="text-[12px] text-[#6E7680]">{dayLabel(m.start)} · {fmtT(m.start)}</div>
                <div className="text-[14px] font-semibold truncate flex items-center gap-2">{m.topic} {m.createdBy === 'hworker' && <HWBadge text="H-Worker" />}</div>
              </button>
            ))}
        </div>
        <div className="h-11 flex items-center justify-center border-t border-[#E4E4ED] text-[13px] text-[#0B5CFF] font-medium">Open Calendar</div>
      </div>
    </div>
  )
}

/* ───────────────────────── Team Chat ───────────────────────── */
function ChatTab() {
  const chats = useCollection<any>('zoom.chats')
  const [sel, setSel] = useState(chats[0]?.id)
  const [text, setText] = useState('')
  const { isAgent } = useDesk()
  const c = chats.find((x) => x.id === sel)
  const send = () => {
    if (!text.trim() || !c) return
    db.update('zoom.chats', c.id, (r) => ({ messages: [...r.messages, { from: ME.id, text, at: new Date().toISOString(), by: isAgent ? 'hworker' : undefined }] }))
    setText('')
  }
  return (
    <>
      <div className="w-[270px] shrink-0 bg-[#F7F7FA] border-r border-[#E4E4ED] flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between">
          <span className="text-[16px] font-bold">Team Chat</span>
          <button className="w-7 h-7 rounded-full bg-[#0B5CFF] text-white flex items-center justify-center"><Plus size={15} /></button>
        </div>
        <div className="overflow-auto flex-1 text-[13.5px]">
          {[['Mentions', AtSign], ['Starred', Star], ['Bookmarks', Paperclip]].map(([l, I]: any) => <div key={l} className="px-4 h-8 flex items-center gap-2 text-[#3F4752]"><I size={14} /> {l}</div>)}
          {(['channel', 'dm'] as const).map((k) => (
            <div key={k} className="mt-2">
              <div className="px-4 h-7 flex items-center gap-1 text-[12px] font-semibold text-[#6E7680] uppercase"><ChevronDown size={12} /> {k === 'channel' ? 'Channels' : 'Chats'}</div>
              {chats.filter((x) => x.kind === k).map((x) => (
                <button key={x.id} data-agent={`zoom-chat-${x.id}`} onClick={() => setSel(x.id)} className={`w-full px-4 h-9 flex items-center gap-2 text-left ${sel === x.id ? 'bg-[#DCE8FF] text-[#0B5CFF] font-semibold' : 'hover:bg-[#ECECF2]'}`}>
                  {k === 'channel' ? <Hash size={14} /> : <Avatar id={x.channel} size={22} />}
                  <span className="truncate">{x.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-12 px-5 flex items-center gap-2 border-b border-[#E4E4ED]">
          <span className="text-[15px] font-bold">{c?.kind === 'channel' ? '# ' : ''}{c?.name}</span>
          <Star size={14} className="text-[#6E7680]" />
          <div className="flex-1" />
          <Video size={18} className="text-[#3F4752]" />
          <Users size={18} className="text-[#3F4752] ml-3" />
        </div>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {c?.messages.map((m: any, i: number) => (
            <div key={i} className={`flex gap-3 ${m.by ? 'flash-new' : ''}`}>
              <Avatar id={m.from} size={34} />
              <div>
                <div className="text-[13px]"><b>{person(m.from).name}</b> <span className="text-[#6E7680] text-[12px] ml-1">{fmtT(m.at)}</span> {m.by === 'hworker' && <HWBadge text="H-Worker" />}</div>
                <div className="text-[14px] leading-[1.5] whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="m-4 rounded-[10px] border border-[#D5D7E0]">
          <textarea data-agent="zoom-chat-input" aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={2} placeholder={`Message ${c?.name ?? ''}`} className="w-full px-3 pt-2 outline-none resize-none text-[14px]" />
          <div className="flex items-center gap-3 px-3 pb-2 text-[#6E7680]">
            <Smile size={16} /><Paperclip size={16} /><AtSign size={16} />
            <div className="flex-1" />
            <button data-agent="zoom-chat-send" onClick={send} className="w-8 h-8 rounded-[8px] bg-[#0B5CFF] text-white flex items-center justify-center"><Send size={15} /></button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ───────────────────────── Meetings ───────────────────────── */
function MeetingsTab({ mtab, setMtab, sel, setSel, onSchedule }: { mtab: 'upcoming' | 'recorded'; setMtab: (t: any) => void; sel: string | null; setSel: (s: string | null) => void; onSchedule: () => void }) {
  const meetings = useCollection<any>('zoom.meetings')
  const recs = useCollection<any>('zoom.recordings')
  const up = meetings.filter((m) => +new Date(m.start) + m.durationMins * 60000 > Date.now()).sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const groups = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const m of up) (g[dayLabel(m.start)] ??= []).push(m)
    return g
  }, [up])
  const m = meetings.find((x) => x.id === sel) ?? (mtab === 'upcoming' ? up[0] : undefined)
  const r = recs.find((x) => x.id === sel) ?? (mtab === 'recorded' ? recs[0] : undefined)
  return (
    <>
      <div className="w-[330px] shrink-0 border-r border-[#E4E4ED] flex flex-col bg-white">
        <div className="h-12 px-4 flex items-center gap-2">
          <span className="text-[16px] font-bold flex-1">Meetings</span>
          <button data-agent="zoom-meetings-schedule" onClick={onSchedule} aria-label="Schedule a meeting" className="w-7 h-7 rounded-full hover:bg-[#ECECF2] flex items-center justify-center"><CalendarPlus size={16} /></button>
        </div>
        <div className="mx-4 mb-2 flex p-0.5 rounded-[8px] bg-[#ECECF2] text-[13px] font-medium">
          {(['upcoming', 'recorded'] as const).map((t) => (
            <button key={t} data-agent={`zoom-meetings-${t}`} onClick={() => { setMtab(t); setSel(null) }} className={`flex-1 h-8 rounded-[7px] ${mtab === t ? 'bg-white shadow-sm' : 'text-[#6E7680]'}`}>{t === 'upcoming' ? 'Upcoming' : 'Recorded'}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {mtab === 'upcoming' &&
            Object.entries(groups).map(([d, list]) => (
              <div key={d}>
                <div className="px-4 pt-3 pb-1 text-[12px] font-semibold text-[#6E7680]">{d}</div>
                {list.map((x) => (
                  <button key={x.id} data-agent={`zoom-meeting-${x.id}`} onClick={() => setSel(x.id)} className={`w-full text-left px-4 py-2.5 ${m?.id === x.id ? 'bg-[#DCE8FF]' : 'hover:bg-[#F7F7FA]'} ${x.createdBy ? 'flash-new' : ''}`}>
                    <div className="text-[14px] font-semibold truncate">{x.topic}</div>
                    <div className="text-[12px] text-[#6E7680]">{fmtT(x.start)} - {fmtT(new Date(+new Date(x.start) + x.durationMins * 60000).toISOString())}{x.recurring ? ' · Recurring' : ''}</div>
                  </button>
                ))}
              </div>
            ))}
          {mtab === 'recorded' &&
            recs.map((x) => (
              <button key={x.id} data-agent={`zoom-recording-${x.id}`} onClick={() => setSel(x.id)} className={`w-full text-left px-4 py-2.5 flex gap-3 ${r?.id === x.id ? 'bg-[#DCE8FF]' : 'hover:bg-[#F7F7FA]'}`}>
                <div className="w-16 h-10 rounded-[6px] bg-[#1F2937] flex items-center justify-center text-white shrink-0"><CirclePlay size={18} /></div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold truncate">{x.topic}</div>
                  <div className="text-[12px] text-[#6E7680]">{new Date(x.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {x.duration}</div>
                </div>
              </button>
            ))}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-auto bg-white">
        {mtab === 'upcoming' && m && <MeetingDetail m={m} />}
        {mtab === 'recorded' && r && <RecordingDetail r={r} />}
      </div>
    </>
  )
}

function MeetingDetail({ m }: { m: any }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="p-8 max-w-[760px]" data-agent="zoom-meeting-detail">
      <div className="flex items-start gap-3">
        <h1 className="text-[24px] font-bold flex-1">{m.topic}</h1>
        {m.createdBy === 'hworker' && <HWBadge />}
      </div>
      <div className="text-[14px] text-[#3F4752] mt-2 flex items-center gap-2"><Clock size={15} /> {new Date(m.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtT(m.start)} - {fmtT(new Date(+new Date(m.start) + m.durationMins * 60000).toISOString())} (Eastern Time)</div>
      <div className="flex gap-2 mt-5">
        <button className="h-9 px-5 rounded-[8px] bg-[#0B5CFF] text-white text-[14px] font-semibold">Start</button>
        <button onClick={() => setCopied(true)} className="h-9 px-4 rounded-[8px] border border-[#D5D7E0] text-[14px] font-medium flex items-center gap-1.5"><Copy size={14} /> {copied ? 'Copied!' : 'Copy invitation'}</button>
        <button className="h-9 px-4 rounded-[8px] border border-[#D5D7E0] text-[14px] font-medium flex items-center gap-1.5"><Pencil size={14} /> Edit</button>
        <button className="h-9 w-9 rounded-[8px] border border-[#D5D7E0] flex items-center justify-center"><Trash2 size={14} /></button>
      </div>
      <div className="mt-6 rounded-[12px] border border-[#E4E4ED] divide-y divide-[#E4E4ED] text-[14px]">
        {[
          ['Meeting ID', m.meetingNumber],
          ['Passcode', m.passcode || '—'],
          ['Security', `${m.waitingRoom ? 'Waiting room enabled' : 'Waiting room off'} · Passcode ${m.passcode ? 'on' : 'off'}`],
          ['Invite link', `https://northwind.zoom.us/j/${m.meetingNumber.replace(/\s/g, '')}?pwd=${m.passcode}`],
          ['Host', person('alex').name],
          ['Attendees', (m.attendees ?? []).map((e: string) => personByEmail(e)?.name ?? e).join(', ') || '—'],
        ].map(([k, v]) => (
          <div key={k} className="flex px-5 py-3">
            <div className="w-[130px] text-[#6E7680] shrink-0">{k}</div>
            <div className="break-all">{v}</div>
          </div>
        ))}
      </div>
      {m.agenda && (
        <div className="mt-5">
          <div className="text-[14px] font-semibold mb-1">Description</div>
          <div className="text-[14px] text-[#3F4752] whitespace-pre-wrap leading-[1.55]">{m.agenda}</div>
        </div>
      )}
    </div>
  )
}

function RecordingDetail({ r }: { r: any }) {
  const [t, setT] = useState<'summary' | 'transcript'>('summary')
  return (
    <div className="p-6" data-agent="zoom-recording-detail">
      <div className="flex gap-6">
        <div className="w-[420px] h-[236px] rounded-[12px] bg-gradient-to-br from-[#111827] to-[#1F3A6B] relative flex items-center justify-center text-white shrink-0">
          <div className="absolute inset-3 grid grid-cols-2 gap-2 opacity-90">
            {r.participants.slice(0, 4).map((p: string) => (
              <div key={p} className="rounded-[8px] bg-[#2B3445] flex items-center justify-center relative">
                <Avatar name={p} size={44} />
                <span className="absolute bottom-1 left-2 text-[10px]">{p}</span>
              </div>
            ))}
          </div>
          <CirclePlay size={54} className="relative drop-shadow-lg" />
          <span className="absolute bottom-2 right-3 text-[12px] bg-black/60 px-1.5 rounded">{r.duration}</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold">{r.topic}</h1>
          <div className="text-[13px] text-[#6E7680] mt-1">{new Date(r.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {r.duration} · {r.size}</div>
          <div className="text-[13px] mt-3"><b>Participants:</b> {r.participants.join(', ')}</div>
          <div className="flex gap-2 mt-4">
            <button className="h-8 px-4 rounded-[8px] bg-[#0B5CFF] text-white text-[13px] font-semibold">Share</button>
            <button className="h-8 px-4 rounded-[8px] border border-[#D5D7E0] text-[13px] font-medium">Download</button>
          </div>
        </div>
      </div>
      <div className="flex gap-1 mt-6 border-b border-[#E4E4ED]">
        {(['summary', 'transcript'] as const).map((x) => (
          <button key={x} data-agent={`zoom-rec-tab-${x}`} onClick={() => setT(x)} className={`h-10 px-3 text-[14px] font-medium relative ${t === x ? 'text-[#0B5CFF]' : 'text-[#6E7680]'}`}>
            {x === 'summary' ? <span className="flex items-center gap-1.5"><Sparkles size={14} /> Meeting summary</span> : 'Transcript'}
            {t === x && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#0B5CFF]" />}
          </button>
        ))}
      </div>
      {t === 'summary' ? (
        <div className="mt-4 rounded-[12px] border border-[#D9E3FF] bg-gradient-to-b from-[#F4F7FF] to-white p-5 max-w-[860px]" data-agent="zoom-ai-summary">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0B5CFF]"><Sparkles size={15} /> Meeting summary with AI Companion</div>
          <div className="text-[15px] font-bold mt-3">Quick recap</div>
          <p className="text-[14px] leading-[1.6] mt-1">{r.summary.quick}</p>
          <div className="text-[15px] font-bold mt-4">Next steps</div>
          <ul className="list-disc pl-5 text-[14px] leading-[1.7] mt-1">{r.summary.nextSteps.map((s: string) => <li key={s}>{s}</li>)}</ul>
          <div className="text-[15px] font-bold mt-4">Summary</div>
          {r.summary.sections.map(([h, b]: [string, string]) => (
            <div key={h} className="mt-2"><div className="text-[14px] font-semibold">{h}</div><div className="text-[14px] text-[#3F4752] leading-[1.6]">{b}</div></div>
          ))}
          <div className="text-[11.5px] text-[#6E7680] mt-4">AI-generated content may be inaccurate or misleading. Always check for accuracy.</div>
        </div>
      ) : (
        <div className="mt-4 space-y-3 max-w-[860px]">
          {r.transcript.map(([s, ts, txt]: string[], i: number) => (
            <div key={i} className="flex gap-3"><Avatar name={s} size={30} /><div><div className="text-[13px]"><b>{s}</b> <span className="text-[#6E7680]">{ts}</span></div><div className="text-[14px]">{txt}</div></div></div>
          ))}
        </div>
      )}
    </div>
  )
}

function SimpleTab({ tab }: { tab: string }) {
  const events = useCollection<any>('outlook.events')
  if (tab === 'calendar') {
    const todays = events.filter((e) => new Date(e.start).toDateString() === new Date().toDateString()).sort((a, b) => +new Date(a.start) - +new Date(b.start))
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center gap-3 mb-4"><span className="text-[20px] font-bold">Today</span><ChevronLeft size={16} /><ChevronRight size={16} /><span className="text-[14px] text-[#6E7680]">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
        {todays.map((e) => <div key={e.id} className="flex gap-4 py-3 border-b border-[#F0F0F5]"><div className="w-20 text-[13px] text-[#6E7680]">{fmtT(e.start)}</div><div className="border-l-4 border-[#0B5CFF] pl-3"><div className="text-[14px] font-semibold">{e.title}</div><div className="text-[12px] text-[#6E7680]">{e.location ?? 'Microsoft Teams Meeting'}</div></div></div>)}
      </div>
    )
  }
  return (
    <div className="flex-1 flex items-center justify-center text-[#6E7680] gap-3 flex-col">
      {tab === 'docs' ? <FileText size={40} /> : <Users size={40} />}
      <div className="text-[15px] font-semibold text-[#131619]">{tab === 'docs' ? 'Zoom Docs' : 'Contacts'}</div>
      <div className="text-[13px]">{tab === 'docs' ? '12 docs · 3 shared with you this week' : 'Northwind Global directory · 24 contacts'}</div>
      <div className="flex gap-2 mt-2">{[Mail, LayoutGrid, Bell].map((I, i) => <I key={i} size={16} />)}</div>
    </div>
  )
}

/* ───────────────────────── Schedule modal ───────────────────────── */
function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const { isAgent } = useDesk()
  const tomorrow = new Date(Date.now() + 86400000)
  const [topic, setTopic] = useState(`${ME.first} ${ME.last}'s Zoom Meeting`)
  const [date, setDate] = useState(isoDate(tomorrow))
  const [time, setTime] = useState('10:00')
  const [dur, setDur] = useState('30')
  const [attendees, setAttendees] = useState('')
  const [passcode, setPasscode] = useState(String(100000 + Math.floor(Math.random() * 899999)))
  const [waiting, setWaiting] = useState(true)
  const [agenda, setAgenda] = useState('')
  const [recurring, setRecurring] = useState(false)
  const times = Array.from({ length: 48 }).map((_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
  const save = () => {
    const id = uid('zm')
    const start = new Date(`${date}T${time}:00`).toISOString()
    const n = Math.floor(80000000000 + Math.random() * 9999999999).toString()
    db.insert('zoom.meetings', {
      id,
      topic,
      start,
      durationMins: Number(dur),
      attendees: attendees.split(/[,;]\s*/).filter(Boolean),
      host: ME.email,
      meetingNumber: `${n.slice(0, 3)} ${n.slice(3, 7)} ${n.slice(7, 11)}`,
      passcode,
      waitingRoom: waiting,
      recurring,
      agenda,
      createdBy: isAgent ? 'hworker' : undefined,
    })
    onSaved(id)
  }
  const field = 'h-9 px-3 rounded-[8px] border border-[#D5D7E0] text-[14px] outline-none focus:border-[#0B5CFF] bg-white'
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center" data-agent="zoom-schedule-modal">
      <div className="w-[640px] max-h-[92%] overflow-auto bg-white rounded-[14px] shadow-2xl">
        <div className="h-14 px-6 flex items-center border-b border-[#E4E4ED]">
          <span className="text-[17px] font-bold flex-1">Schedule meeting</span>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 text-[14px]">
          <input data-agent="zoom-schedule-topic" aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full h-11 text-[18px] font-semibold outline-none border-b border-[#D5D7E0] focus:border-[#0B5CFF]" />
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#6E7680]" />
            <input data-agent="zoom-schedule-date" aria-label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            <select data-agent="zoom-schedule-time" aria-label="Start time" value={time} onChange={(e) => setTime(e.target.value)} className={field}>
              {times.map((t) => <option key={t} value={t}>{new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</option>)}
            </select>
            <select data-agent="zoom-schedule-duration" aria-label="Duration" value={dur} onChange={(e) => setDur(e.target.value)} className={field}>
              {['15', '30', '45', '60', '90'].map((d) => <option key={d} value={d}>{Number(d) >= 60 ? `${Math.floor(Number(d) / 60)} hr${Number(d) % 60 ? ' 30 min' : ''}` : `${d} min`}</option>)}
            </select>
          </div>
          <div className="text-[13px] text-[#6E7680] pl-6">(GMT-4:00) Eastern Time (US and Canada) · <label className="inline-flex items-center gap-1"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Recurring meeting</label></div>
          <div className="flex items-start gap-2">
            <Users size={16} className="text-[#6E7680] mt-2.5" />
            <input data-agent="zoom-schedule-attendees" aria-label="Attendees" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Add attendees (email, comma separated)" className={`${field} flex-1`} />
          </div>
          <div className="flex items-start gap-2">
            <FileText size={16} className="text-[#6E7680] mt-2.5" />
            <textarea data-agent="zoom-schedule-agenda" aria-label="Description" value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={4} placeholder="Add description" className="flex-1 px-3 py-2 rounded-[8px] border border-[#D5D7E0] outline-none focus:border-[#0B5CFF] resize-none" />
          </div>
          <div className="rounded-[10px] bg-[#F7F7FA] p-4 space-y-3">
            <div className="font-semibold">Meeting ID</div>
            <label className="flex items-center gap-2"><input type="radio" defaultChecked name="mid" /> Generate automatically</label>
            <label className="flex items-center gap-2 text-[#6E7680]"><input type="radio" name="mid" /> Personal Meeting ID 482 019 3375</label>
            <div className="font-semibold pt-1">Security</div>
            <label className="flex items-center gap-2"><input type="checkbox" checked readOnly /> Passcode <input data-agent="zoom-schedule-passcode" aria-label="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} className={`${field} h-8 w-[120px] ml-2`} /></label>
            <label className="flex items-center gap-2"><input data-agent="zoom-schedule-waiting" type="checkbox" checked={waiting} onChange={(e) => setWaiting(e.target.checked)} /> Waiting Room</label>
            <div className="font-semibold pt-1">Calendar</div>
            <div className="flex gap-4"><label className="flex items-center gap-2"><input type="radio" defaultChecked name="cal" /> Outlook</label><label className="flex items-center gap-2"><input type="radio" name="cal" /> Google Calendar</label><label className="flex items-center gap-2"><input type="radio" name="cal" /> Other calendars</label></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E4E4ED] flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-5 rounded-[8px] border border-[#D5D7E0] font-medium">Cancel</button>
          <button data-agent="zoom-schedule-save" onClick={save} className="h-9 px-6 rounded-[8px] bg-[#0B5CFF] text-white font-semibold">Save</button>
        </div>
      </div>
    </div>
  )
}
