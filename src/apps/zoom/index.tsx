import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  Calendar,
  CalendarPlus,
  ChevronDown,
  FileText,
  Hash,
  House,
  LayoutGrid,
  MessageCircle,
  MonitorUp,
  MoreHorizontal,
  PenTool,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  StickyNote,
  Users,
  Video,
  X,
  CirclePlay,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk } from '@/os/context'
import { useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE } from '@/data/people'
import { BLUE, HWBadge, STATUS, ZCtx, ZModal, btnPrimary, dayLabel, fmtT, usePrefs, useZoom as useZoomCtx, type LiveMeeting, type Tab, type ZoomCtx } from './shared'
import { MeetingsTab, ScheduleModal } from './Meetings'
import { ChatTab, ensureDm } from './Chat'
import { InMeeting, JoinModal } from './InMeeting'
import { CalendarTab } from './Calendar'
import { DocsTab } from './Docs'
import { ContactsTab } from './Contacts'
import { AppsTab, NotesTab, WhiteboardsTab } from './Extras'

type SchedState = null | { initial?: { attendees?: string; topic?: string; date?: string }; meeting?: any }

export default function Zoom({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const [tab, setTab] = useState<Tab>('home')
  const [sched, setSched] = useState<SchedState>(null)
  const [selMeeting, setSelMeeting] = useState<string | null>(null)
  const [mtab, setMtab] = useState<'upcoming' | 'recorded'>('upcoming')
  const [chatSel, setChatSel] = useState<string | null>(null)
  const [live, setLive] = useState<LiveMeeting | null>(null)
  const [join, setJoin] = useState<null | 'join' | 'share'>(null)
  const [ai, setAi] = useState(false)
  const [menu, setMenu] = useState<null | 'more' | 'profile'>(null)
  const [settings, setSettings] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [prefs, setPrefs] = usePrefs()
  const searchRef = useRef<HTMLInputElement>(null)
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

  const toast = (m: string) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg((x) => (x === m ? null : x)), 3500)
  }
  const ctx: ZoomCtx = {
    toast,
    setTab: (t) => setTab(t),
    startMeeting: (m) => setLive(m),
    openMeeting: (id) => {
      setTab('meetings')
      setMtab('upcoming')
      setSelMeeting(id)
    },
    openRecording: (id) => {
      setTab('meetings')
      setMtab('recorded')
      setSelMeeting(id)
    },
    openChat: (personId) => {
      setChatSel(ensureDm(personId, isAgent))
      setTab('chat')
    },
    selectChat: (id) => {
      setChatSel(id)
      setTab('chat')
    },
    schedule: (initial) => setSched({ initial }),
  }

  const tabs: [Tab, any, string][] = [
    ['home', House, 'Home'],
    ['chat', MessageCircle, 'Team Chat'],
    ['meetings', Video, 'Meetings'],
    ['calendar', Calendar, 'Calendar'],
    ['docs', FileText, 'Docs'],
    ['contacts', Users, 'Contacts'],
  ]
  const more: [Tab, any, string][] = [
    ['whiteboards', PenTool, 'Whiteboards'],
    ['notes', StickyNote, 'Notes'],
    ['apps', LayoutGrid, 'Apps'],
  ]
  const moreActive = more.some(([id]) => id === tab)
  const status = prefs.status ?? 'available'

  return (
    <ZCtx.Provider value={ctx}>
      <div
        className="flex-1 min-h-0 flex flex-col bg-white text-[#131619] relative"
        style={{ fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif" }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault()
            searchRef.current?.focus()
          }
        }}
      >
        {/* title / nav bar */}
        <div data-drag-handle className="h-[58px] shrink-0 flex items-center bg-[#F7F7FA] border-b border-[#E4E4ED]">
          <div className="w-[300px] flex items-center gap-2 pl-3" data-no-drag>
            <img src={logoUrl('zoom-wordmark')} className="h-[13px] mr-2" alt="Zoom" />
            <GlobalSearch inputRef={searchRef} />
          </div>
          <div className="flex-1 flex justify-center gap-1" data-no-drag>
            {tabs.map(([id, I, l]) => (
              <button key={id} data-agent={`zoom-tab-${id}`} aria-label={l} onClick={() => setTab(id)} className={`w-[72px] h-[50px] rounded-[8px] flex flex-col items-center justify-center gap-0.5 ${tab === id ? 'text-[#0B5CFF]' : 'text-[#3F4752] hover:bg-[#ECECF2]'}`}>
                <I size={20} strokeWidth={tab === id ? 2.3 : 1.8} />
                <span className="text-[11px] font-medium">{l}</span>
              </button>
            ))}
            <div className="relative">
              <button data-agent="zoom-tab-more" aria-label="More" onClick={() => setMenu(menu === 'more' ? null : 'more')} className={`w-[60px] h-[50px] rounded-[8px] flex flex-col items-center justify-center gap-0.5 ${moreActive ? 'text-[#0B5CFF]' : 'text-[#3F4752] hover:bg-[#ECECF2]'}`}>
                <MoreHorizontal size={20} />
                <span className="text-[11px] font-medium">More</span>
              </button>
              {menu === 'more' && (
                <div className="absolute top-[54px] left-1/2 -translate-x-1/2 z-50 w-[200px] bg-white rounded-[10px] border border-[#E4E4ED] shadow-xl py-1.5" data-agent="zoom-more-menu">
                  {more.map(([id, I, l]) => (
                    <button key={id} data-agent={`zoom-more-${id}`} onClick={() => { setTab(id); setMenu(null) }} className={`w-full h-9 px-3 flex items-center gap-2.5 text-[13.5px] text-left ${tab === id ? 'text-[#0B5CFF] font-semibold' : 'hover:bg-[#F7F7FA]'}`}>
                      <I size={16} /> {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-[300px] flex items-center justify-end gap-2 pr-1" data-no-drag>
            <button data-agent="zoom-ai-companion" onClick={() => setAi(!ai)} className={`flex items-center gap-1 h-8 px-2.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#0B5CFF] to-[#7B61FF] text-white text-[12px] font-semibold ${ai ? 'ring-2 ring-offset-1 ring-[#7B61FF]' : ''}`}><Sparkles size={13} /> AI Companion</button>
            <div className="relative">
              <button data-agent="zoom-profile" aria-label="Profile" onClick={() => setMenu(menu === 'profile' ? null : 'profile')} className="relative">
                <Avatar id={ME.id} size={30} />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#F7F7FA]" style={{ background: STATUS[status][1] }} />
              </button>
              {menu === 'profile' && (
                <div className="absolute top-10 right-0 z-50 w-[260px] bg-white rounded-[10px] border border-[#E4E4ED] shadow-xl py-2" data-agent="zoom-profile-menu">
                  <div className="px-4 pb-2 flex items-center gap-3 border-b border-[#F0F0F5]">
                    <Avatar id={ME.id} size={40} />
                    <div className="min-w-0"><div className="text-[14px] font-semibold">{ME.name}</div><div className="text-[12px] text-[#6E7680] truncate">{ME.email}</div><div className="text-[11px] text-[#0B5CFF] font-semibold">LICENSED</div></div>
                  </div>
                  {Object.entries(STATUS).map(([k, [l, c]]) => (
                    <button key={k} data-agent={`zoom-status-${k}`} onClick={() => { setPrefs({ status: k as any }); setMenu(null) }} className="w-full h-8 px-4 flex items-center gap-2.5 text-[13px] text-left hover:bg-[#F7F7FA]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} /> {l}
                      {status === k && <span className="ml-auto text-[#0B5CFF]">✓</span>}
                    </button>
                  ))}
                  <div className="h-px bg-[#F0F0F5] my-1" />
                  <button data-agent="zoom-settings" onClick={() => { setSettings(true); setMenu(null) }} className="w-full h-8 px-4 flex items-center gap-2.5 text-[13px] text-left hover:bg-[#F7F7FA]"><Settings size={14} /> Settings</button>
                  <button onClick={() => { setMenu(null); toast('You’re up to date — Zoom Workplace 6.4.0') }} className="w-full h-8 px-4 flex items-center gap-2.5 text-[13px] text-left hover:bg-[#F7F7FA]"><CirclePlay size={14} /> Check for updates</button>
                </div>
              )}
            </div>
            <WindowControls height={58} />
          </div>
        </div>
        {menu && <div className="absolute inset-0 top-[58px] z-40" onClick={() => setMenu(null)} />}
        <div className="flex-1 min-h-0 flex">
          {tab === 'home' && <HomeTab now={now} onSchedule={() => setSched({})} openMeeting={ctx.openMeeting} onJoin={() => setJoin('join')} onShare={() => setJoin('share')} />}
          {tab === 'chat' && <ChatTab sel={chatSel} setSel={setChatSel} />}
          {tab === 'meetings' && <MeetingsTab mtab={mtab} setMtab={setMtab} sel={selMeeting} setSel={setSelMeeting} onSchedule={() => setSched({})} onEdit={(m) => setSched({ meeting: m })} />}
          {tab === 'calendar' && <CalendarTab />}
          {tab === 'docs' && <DocsTab />}
          {tab === 'contacts' && <ContactsTab />}
          {tab === 'whiteboards' && <WhiteboardsTab />}
          {tab === 'notes' && <NotesTab />}
          {tab === 'apps' && <AppsTab />}
          {ai && <AiPanel onClose={() => setAi(false)} />}
        </div>
        {sched && (
          <ScheduleModal
            key={sched.meeting?.id ?? 'new'}
            meeting={sched.meeting}
            initial={sched.initial}
            onClose={() => setSched(null)}
            onSaved={(id) => {
              const wasEdit = !!sched.meeting
              setSched(null)
              setTab('meetings')
              setMtab('upcoming')
              setSelMeeting(id)
              if (wasEdit) toast('Meeting updated')
            }}
          />
        )}
        {join && <JoinModal shareOnly={join === 'share'} onClose={() => setJoin(null)} />}
        {live && <InMeeting m={live} onLeave={() => setLive(null)} />}
        {settings && (
          <ZModal title="Settings" onClose={() => setSettings(false)} width={460} agent="zoom-settings-modal" footer={<button onClick={() => setSettings(false)} className={btnPrimary}>Done</button>}>
            <div className="space-y-3">
              <div className="font-semibold">Audio & video</div>
              <label className="flex items-center gap-2"><input data-agent="zoom-setting-mute" type="checkbox" checked={prefs.muteOnJoin ?? true} onChange={(e) => setPrefs({ muteOnJoin: e.target.checked })} /> Mute my microphone when joining a meeting</label>
              <label className="flex items-center gap-2"><input data-agent="zoom-setting-video" type="checkbox" checked={prefs.videoOffOnJoin ?? false} onChange={(e) => setPrefs({ videoOffOnJoin: e.target.checked })} /> Turn off my video when joining a meeting</label>
              <div className="font-semibold pt-2">Presence</div>
              <select aria-label="Status" value={status} onChange={(e) => setPrefs({ status: e.target.value as any })} className="h-9 px-3 rounded-[8px] border border-[#D5D7E0] w-full">
                {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </ZModal>
        )}
        {toastMsg && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-[10px] bg-[#131619] text-white text-[13px] shadow-lg" data-agent="zoom-toast">{toastMsg}</div>}
      </div>
    </ZCtx.Provider>
  )
}

/* ───────────────────────── global search ───────────────────────── */
function GlobalSearch({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const z = useZoomCtx()
  const meetings = useCollection<any>('zoom.meetings')
  const recs = useCollection<any>('zoom.recordings')
  const chats = useCollection<any>('zoom.chats')
  const docs = useCollection<any>('zoom.docs')
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const res = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return []
    const has = (s?: string) => (s ?? '').toLowerCase().includes(n)
    return [
      ...meetings.filter((m) => has(m.topic)).slice(0, 4).map((m) => ({ k: 'Meeting', t: m.topic, s: `${dayLabel(m.start)} · ${fmtT(m.start)}`, I: Video, go: () => z.openMeeting(m.id) })),
      ...recs.filter((r) => has(r.topic) || has(r.summary?.quick)).slice(0, 3).map((r) => ({ k: 'Recording', t: r.topic, s: r.duration, I: CirclePlay, go: () => z.openRecording(r.id) })),
      ...chats.filter((c) => has(c.name) || c.messages.some((m: any) => has(m.text))).slice(0, 3).map((c) => ({ k: c.kind === 'channel' ? 'Channel' : 'Chat', t: c.name, s: has(c.name) ? '' : 'Message match', I: Hash, go: () => (c.kind === 'dm' ? z.openChat(c.channel) : z.selectChat(c.id)) })),
      ...PEOPLE.filter((p) => p.id !== ME.id && (has(p.name) || has(p.email))).slice(0, 4).map((p) => ({ k: 'Contact', t: p.name, s: p.external ? p.company : p.title, I: Users, go: () => z.openChat(p.id) })),
      ...docs.filter((d) => has(d.title)).slice(0, 2).map((d) => ({ k: 'Doc', t: d.title, s: '', I: FileText, go: () => z.setTab('docs') })),
    ]
  }, [q, meetings, recs, chats, docs])
  return (
    <div className="relative flex-1 max-w-[200px]">
      <div className={`flex items-center h-8 rounded-[8px] bg-white border px-2 gap-1.5 text-[#6E7680] ${focus ? 'border-[#0B5CFF]' : 'border-[#E4E4ED]'}`}>
        <Search size={14} />
        <input ref={inputRef} data-agent="zoom-search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur() } if (e.key === 'Enter' && res[0]) { res[0].go(); setQ('') } }} placeholder="Search" className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px] text-[#131619] placeholder:text-[#6E7680]" />
        {!q && <span className="ml-auto text-[11px]">Ctrl+F</span>}
      </div>
      {focus && q && (
        <div className="absolute top-9 left-0 w-[380px] bg-white rounded-[10px] border border-[#E4E4ED] shadow-xl z-50 py-1 max-h-[380px] overflow-auto" data-agent="zoom-search-results">
          {res.map((r, i) => (
            <button key={i} onMouseDown={() => { r.go(); setQ('') }} className="w-full flex items-center gap-3 px-3 h-11 hover:bg-[#F7F7FA] text-left">
              <r.I size={15} className="text-[#6E7680] shrink-0" />
              <span className="flex-1 min-w-0"><span className="block text-[13px] font-medium truncate">{r.t}</span>{r.s && <span className="block text-[11.5px] text-[#6E7680] truncate">{r.s}</span>}</span>
              <span className="text-[10.5px] font-semibold uppercase text-[#6E7680]">{r.k}</span>
            </button>
          ))}
          {!res.length && <div className="px-3 py-4 text-[13px] text-[#6E7680]">No results for “{q}”.</div>}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Home ───────────────────────── */
function HomeTab({ now, onSchedule, openMeeting, onJoin, onShare }: { now: Date; onSchedule: () => void; openMeeting: (id: string) => void; onJoin: () => void; onShare: () => void }) {
  const z = useZoomCtx()
  const meetings = useCollection<any>('zoom.meetings')
  const upcoming = meetings.filter((m) => +new Date(m.start) + m.durationMins * 60000 > Date.now()).sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const todays = upcoming.filter((m) => new Date(m.start).toDateString() === now.toDateString())
  const big: [string, any, string, string, (() => void) | undefined][] = [
    ['New meeting', Video, '#FF742E', 'zoom-new-meeting', () => z.startMeeting({ topic: `${ME.name}'s Zoom Meeting`, participants: [] })],
    ['Join', Plus, BLUE, 'zoom-join', onJoin],
    ['Schedule', CalendarPlus, BLUE, 'zoom-schedule', onSchedule],
    ['Share screen', MonitorUp, BLUE, 'zoom-share', onShare],
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
              <span
                data-agent={`zoom-home-start-${m.id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  z.startMeeting({ topic: m.topic, meetingId: m.id, participants: m.attendees ?? [] })
                }}
                className="h-8 px-4 rounded-[8px] bg-[#0B5CFF] text-white text-[13px] font-semibold flex items-center hover:bg-[#0A4FE0]"
              >
                Start
              </span>
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
        <button data-agent="zoom-open-calendar" onClick={() => z.setTab('calendar')} className="w-full h-11 flex items-center justify-center border-t border-[#E4E4ED] text-[13px] text-[#0B5CFF] font-medium hover:bg-[#F7F7FA]">Open Calendar</button>
      </div>
    </div>
  )
}

/* ───────────────────────── AI Companion panel ───────────────────────── */
type Msg = { who: 'me' | 'ai'; text: string }
const PROMPTS = ['Summarize my last recorded meeting', 'What are my action items?', 'What meetings do I have today?', 'Catch me up on Team Chat']

function AiPanel({ onClose }: { onClose: () => void }) {
  const recs = useCollection<any>('zoom.recordings')
  const meetings = useCollection<any>('zoom.meetings')
  const chats = useCollection<any>('zoom.chats')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs])
  const answer = (raw: string): string => {
    const s = raw.toLowerCase()
    const sorted = [...recs].sort((a, b) => +new Date(b.date) - +new Date(a.date))
    const hit = sorted.find((r) => r.topic.toLowerCase().split(/[^a-z0-9]+/).filter((w: string) => w.length > 3 && !['meeting', 'webinar', 'summit'].includes(w)).some((w: string) => s.includes(w)))
    if (hit) return `${hit.topic} (${new Date(hit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}):\n${hit.summary.quick}\n\nNext steps:\n${hit.summary.nextSteps.map((x: string) => `• ${x}`).join('\n')}`
    if (/action|next step|to-?do|follow/.test(s)) {
      const items = sorted.slice(0, 3).flatMap((r) => r.summary.nextSteps.filter((x: string) => /alex/i.test(x)).map((x: string) => `• ${x} — ${r.topic}`))
      return items.length ? `Your action items from recent meetings:\n${items.join('\n')}` : `No action items assigned to you in your recent recordings.`
    }
    if (/today|calendar|schedule|upcoming|meetings? do i/.test(s)) {
      const up = meetings.filter((m) => +new Date(m.start) + m.durationMins * 60000 > Date.now()).sort((a, b) => +new Date(a.start) - +new Date(b.start))
      const t = up.filter((m) => new Date(m.start).toDateString() === new Date().toDateString())
      const list = (t.length ? t : up.slice(0, 3)).map((m) => `• ${fmtT(m.start)} — ${m.topic}${t.length ? '' : ` (${dayLabel(m.start)})`}`)
      return list.length ? `${t.length ? `You have ${t.length} meeting${t.length > 1 ? 's' : ''} today` : 'Nothing else today. Coming up next'}:\n${list.join('\n')}` : 'You have no upcoming meetings.'
    }
    if (/chat|message|unread|catch/.test(s)) {
      return `Here’s what’s new in Team Chat:\n${chats.filter((c) => c.messages.length).slice(0, 5).map((c) => { const m = c.messages[c.messages.length - 1]; return `• ${c.kind === 'channel' ? '#' : ''}${c.name}: ${PEOPLE.find((p) => p.id === m.from)?.first ?? 'Someone'} — “${String(m.text).slice(0, 90)}${String(m.text).length > 90 ? '…' : ''}”` }).join('\n')}`
    }
    if (/summar|recap|last/.test(s) && sorted[0]) return `${sorted[0].topic}:\n${sorted[0].summary.quick}`
    return 'I can summarize your recorded meetings, list your action items, check today’s meetings, or catch you up on Team Chat. Try mentioning a meeting by name, e.g. “Contoso QBR”.'
  }
  const ask = (text: string) => {
    if (!text.trim()) return
    setMsgs((m) => [...m, { who: 'me', text }, { who: 'ai', text: answer(text) }])
    setQ('')
  }
  return (
    <div className="w-[340px] shrink-0 border-l border-[#E4E4ED] flex flex-col bg-gradient-to-b from-[#F4F7FF] to-white" data-agent="zoom-ai-panel">
      <div className="h-12 px-4 flex items-center gap-2 border-b border-[#E4E4ED]">
        <Sparkles size={16} className="text-[#7B61FF]" />
        <span className="font-bold text-[14px] flex-1">AI Companion</span>
        <button aria-label="Close AI Companion" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3 text-[13px]">
        {!msgs.length && (
          <>
            <div className="text-[14px] font-semibold">Hi {ME.first}, how can I help?</div>
            {PROMPTS.map((p) => <button key={p} onClick={() => ask(p)} className="w-full text-left rounded-[10px] border border-[#D9E3FF] bg-white px-3 py-2 hover:border-[#0B5CFF]">{p}</button>)}
          </>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.who === 'me' ? 'flex justify-end' : ''}>
            <div className={`rounded-[10px] px-3 py-2 whitespace-pre-wrap leading-[1.5] max-w-[92%] ${m.who === 'me' ? 'bg-[#0B5CFF] text-white' : 'bg-white border border-[#E4E4ED]'}`}>{m.text}</div>
          </div>
        ))}
        {msgs.length > 0 && <div className="text-[11px] text-[#6E7680]">AI-generated content may be inaccurate. Always check for accuracy.</div>}
        <div ref={end} />
      </div>
      <div className="m-3 rounded-[10px] border border-[#D5D7E0] bg-white flex items-center pr-2">
        <input data-agent="zoom-ai-input" aria-label="Ask AI Companion" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(q)} placeholder="Ask AI Companion" className="flex-1 h-10 px-3 outline-none text-[13px] bg-transparent" />
        <button data-agent="zoom-ai-send" aria-label="Send question" onClick={() => ask(q)} className="text-[#0B5CFF]"><Send size={15} /></button>
      </div>
    </div>
  )
}

