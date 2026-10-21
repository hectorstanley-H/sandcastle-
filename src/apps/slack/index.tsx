import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, Clock, Search, HelpCircle, Home, MessagesSquare, Bell, Bookmark, MoreHorizontal, Plus, ChevronDown,
  SquarePen, SlidersHorizontal, MessageSquareText, Headphones, SendHorizontal, Bold, Italic, Strikethrough, Link2, ListOrdered,
  List, Quote, Code, SquareCode, Smile, AtSign, Video, Mic, Hash, Lock, X, Forward, Layers, FileText, Pin, Users, Star,
  BellOff, Type, CheckCircle2, SmilePlus,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { db, uid, useCollection } from '@/db/db'
import { emoji } from './emoji'

export const SLACK_CHANNELS = [
  { id: 'general', name: 'general', topic: 'Company-wide announcements and work-based matters', members: 214 },
  { id: 'announcements', name: 'announcements', topic: 'Official announcements · posting restricted to team leads', members: 214 },
  { id: 'ops-team', name: 'ops-team', topic: 'Northwind Operations · stand-up 9:15 ET · ops review Thursdays', members: 18 },
  { id: 'it-help', name: 'it-help', topic: 'Ask IT anything · urgent? raise a ServiceNow ticket', members: 187 },
  { id: 'eng-bugs', name: 'eng-bugs', topic: 'Report bugs here with repro steps + impact · triaged daily into Jira OPS', members: 46 },
  { id: 'sales', name: 'sales', topic: 'Pipeline, wins and deal help', members: 39 },
  { id: 'finance', name: 'finance', topic: 'Finance ops · payment runs · close calendar', members: 22, private: true },
  { id: 'people-team', name: 'people-team', topic: 'HR, onboarding and people programs', members: 14, private: true },
  { id: 'new-hires', name: 'new-hires', topic: 'Say hi to the newest Northwinders 👋', members: 201 },
  { id: 'random', name: 'random', topic: 'Non-work banter and water cooler conversation', members: 198 },
]
const INTERNAL = PEOPLE.filter((p) => !p.external)

type Msg = { id: string; channelId: string; from: string; text: string; date: string; threadTs?: string; reactions?: { emoji: string; users: string[] }[]; createdBy?: string }

const presenceOf = (id: string) => (['david', 'marcus', 'nina', 'jordan'].includes(id) ? 'away' : 'available')
const STATUS: Record<string, string> = { priya: '📅', grace: '🏠', tom: '🎧', oliver: '🔥', chen: '💻', liam: '✈️' }

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** Lightweight Slack mrkdwn: *bold*, _italic_, `code`, :emoji:, @mentions, #channels, OPS-123 links, URLs, newlines */
function Mrkdwn({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const re = /(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|:[a-z0-9_+\-]+:|@[A-Z][a-z]+(?: [A-Z][a-z']+)?|#[a-z][a-z0-9-]+|\bOPS-\d+\b|https?:\/\/\S+)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const t = m[0]
    const k = i++
    if (t.startsWith('*')) parts.push(<b key={k}>{t.slice(1, -1)}</b>)
    else if (t.startsWith('_')) parts.push(<i key={k}>{t.slice(1, -1)}</i>)
    else if (t.startsWith('`')) parts.push(<code key={k} className="px-1 py-px rounded-[3px] border border-[#E8E8E8] bg-[#F6F6F6] text-[#C01343] text-[12.5px] font-mono">{t.slice(1, -1)}</code>)
    else if (t.startsWith(':')) parts.push(<span key={k} className="text-[18px] leading-none align-[-2px]">{emoji(t.slice(1, -1))}</span>)
    else if (t.startsWith('@')) parts.push(<span key={k} className="px-0.5 rounded-[3px] bg-[#E8F5FA] text-[#1264A3]">{t}</span>)
    else if (t.startsWith('#')) parts.push(<span key={k} className="px-0.5 rounded-[3px] bg-[#E8F5FA] text-[#1264A3]">{t}</span>)
    else if (t.startsWith('OPS-')) parts.push(<span key={k} className="text-[#1264A3] hover:underline cursor-pointer">{t}</span>)
    else parts.push(<span key={k} className="text-[#1264A3] hover:underline cursor-pointer">{t}</span>)
    last = m.index + t.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

function SlackAvatar({ id, size = 36 }: { id: string; size?: number }) {
  if (id === 'bot:jira')
    return <span className="shrink-0 flex items-center justify-center rounded-[6px] bg-[#1868DB]" style={{ width: size, height: size }}><img src={logoUrl('jira')} className="w-[60%] h-[60%] brightness-0 invert" alt="" /></span>
  return <Avatar id={id} size={size} square className="[&>span]:!rounded-[6px]" />
}

const nameOf = (from: string) => (from === 'bot:jira' ? 'Jira Cloud' : person(from).name)

/* ─────────────────────────── Composer ─────────────────────────── */

function Composer({ placeholder, agent, sendAgent, onSend, compact }: { placeholder: string; agent: string; sendAgent: string; onSend: (t: string) => void; compact?: boolean }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const send = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(220, el.scrollHeight) + 'px'
  }, [text])
  const fmt = [Bold, Italic, Strikethrough, Link2, ListOrdered, List, Quote, Code, SquareCode]
  return (
    <div className={`rounded-lg border border-[#BBBABB] focus-within:border-[#868686] focus-within:shadow-[0_0_0_1px_#868686] bg-white ${compact ? '' : ''}`}>
      <div className="flex items-center gap-0.5 px-1.5 pt-1.5 text-[#616061]">
        {fmt.map((I, i) => (
          <span key={i} className="contents">
            {(i === 4 || i === 7) && <span className="w-px h-4 bg-[#DDDDDD] mx-1" />}
            <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2] opacity-60" aria-label="format"><I size={15} strokeWidth={2.1} /></button>
          </span>
        ))}
      </div>
      <textarea
        ref={ref}
        data-agent={agent}
        aria-label={placeholder}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        placeholder={placeholder}
        className="w-full resize-none outline-none px-3 py-1.5 text-[15px] leading-[22px] text-[#1D1C1D] placeholder:text-[#868686] bg-transparent"
      />
      <div className="flex items-center gap-0.5 px-1.5 pb-1.5 text-[#616061]">
        <button className="w-7 h-7 rounded-full bg-[#F2F2F2] flex items-center justify-center hover:bg-[#E8E8E8]" aria-label="Attach"><Plus size={16} /></button>
        {[Type, Smile, AtSign].map((I, i) => (
          <button key={i} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2]"><I size={16} /></button>
        ))}
        <span className="w-px h-4 bg-[#DDDDDD] mx-1" />
        {[Video, Mic].map((I, i) => (
          <button key={i} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2]"><I size={16} /></button>
        ))}
        <span className="w-px h-4 bg-[#DDDDDD] mx-1" />
        <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[13px] font-bold">/</button>
        <div className="flex-1" />
        <div className={`flex items-center h-7 rounded overflow-hidden ${text.trim() ? 'bg-[#007A5A] text-white' : 'text-[#BBBABB]'}`}>
          <button data-agent={sendAgent} aria-label="Send now" onClick={send} className="h-7 px-2 flex items-center hover:bg-black/10"><SendHorizontal size={16} fill="currentColor" /></button>
          <span className={`w-px h-4 ${text.trim() ? 'bg-white/40' : 'bg-[#DDDDDD]'}`} />
          <button className="h-7 px-1 flex items-center"><ChevronDown size={14} /></button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Message ─────────────────────────── */

function Message({ m, compact, replies, onThread, onReact, inThread, hovered, onHover }: { m: Msg; compact: boolean; replies: Msg[]; onThread?: () => void; onReact: (e: string) => void; inThread?: boolean; hovered?: boolean; onHover?: (on: boolean) => void }) {
  const [hoverLocal, setHoverLocal] = useState(false)
  const hover = onHover ? !!hovered : hoverLocal
  const setHover = onHover ?? setHoverLocal
  const fresh = m.createdBy === 'hworker' && Date.now() - +new Date(m.date) < 60000
  return (
    <div
      data-agent={`slack-msg-${m.id}`}
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative flex gap-2 px-5 ${compact ? 'py-0.5' : 'pt-2 pb-1'} hover:bg-[#F8F8F8] group ${fresh ? 'flash-new' : ''}`}
    >
      <div className="w-9 shrink-0">
        {compact ? (
          <span className="hidden group-hover:block text-[11px] text-[#616061] pt-1 text-right pr-1 whitespace-nowrap">{timeOf(m.date).replace(/ [AP]M/, '')}</span>
        ) : (
          <SlackAvatar id={m.from} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-black text-[#1D1C1D] hover:underline cursor-pointer">{nameOf(m.from)}</span>
            {m.from.startsWith('bot:') && <span className="text-[10px] px-1 rounded-sm bg-[#E8E8E8] text-[#616061] font-bold">APP</span>}
            {STATUS[m.from] && <span className="text-[13px]">{STATUS[m.from]}</span>}
            <span className="text-[12px] text-[#616061] hover:underline cursor-pointer">{timeOf(m.date)}</span>
            {m.createdBy === 'hworker' && (
              <span className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded bg-[#430693]/10 text-[#430693] text-[11px] font-bold">
                <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" /> via H-Worker
              </span>
            )}
          </div>
        )}
        <div className="text-[15px] leading-[22px] text-[#1D1C1D] whitespace-pre-wrap break-words" data-agent={`slack-msg-text-${m.id}`}><Mrkdwn text={m.text} /></div>
        {!!m.reactions?.length && (
          <div className="flex flex-wrap gap-1 mt-1">
            {m.reactions.map((r) => {
              const mine = r.users.includes(ME.id)
              return (
                <button key={r.emoji} onClick={() => onReact(r.emoji)} className={`h-6 px-1.5 rounded-full flex items-center gap-1 text-[12px] border ${mine ? 'bg-[#E8F5FA] border-[#1D9BD1] text-[#1264A3]' : 'bg-[#F2F2F2] border-transparent text-[#1D1C1D] hover:border-[#BBBABB] hover:bg-white'}`}>
                  <span className="text-[15px] leading-none">{emoji(r.emoji)}</span>
                  <span className="font-bold">{r.users.length}</span>
                </button>
              )
            })}
            <button className="h-6 w-8 rounded-full bg-[#F2F2F2] flex items-center justify-center text-[#616061] opacity-0 group-hover:opacity-100"><SmilePlus size={14} /></button>
          </div>
        )}
        {!inThread && replies.length > 0 && (
          <button data-agent={`slack-replies-${m.id}`} onClick={onThread} className="mt-1 -ml-1 flex items-center gap-2 h-8 pr-3 pl-1 rounded-md border border-transparent hover:border-[#DDDDDD] hover:bg-white w-[420px] max-w-full group/r">
            <span className="flex">
              {Array.from(new Set(replies.map((r) => r.from))).slice(0, 4).map((u) => (
                <span key={u} className="mr-0.5"><SlackAvatar id={u} size={22} /></span>
              ))}
            </span>
            <span className="text-[13px] font-bold text-[#1264A3] hover:underline">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
            <span className="text-[13px] text-[#616061] group-hover/r:hidden">Last reply {relTime(replies[replies.length - 1].date)}</span>
            <span className="text-[13px] text-[#616061] hidden group-hover/r:inline">View thread</span>
          </button>
        )}
      </div>
      {/* hover toolbar (kept in DOM so the agent can click it) */}
      <div className={`absolute right-4 -top-4 flex items-center bg-white rounded-lg border border-[#DDDDDD] shadow-sm px-0.5 h-9 transition-opacity ${hover ? 'opacity-100' : 'opacity-0 pointer-events-none'} group-hover:opacity-100 group-hover:pointer-events-auto`}>
        {['white_check_mark', 'eyes', 'raised_hands'].map((e) => (
          <button key={e} onClick={() => onReact(e)} className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[16px]">{emoji(e)}</button>
        ))}
        <span className="w-px h-5 bg-[#DDDDDD] mx-0.5" />
        <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="Add reaction"><SmilePlus size={17} /></button>
        {!inThread && (
          <button data-agent={`slack-reply-${m.id}`} aria-label="Reply in thread" onClick={onThread} className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]"><MessageSquareText size={17} /></button>
        )}
        <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="Forward"><Forward size={17} /></button>
        <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="Save for later"><Bookmark size={17} /></button>
        <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="More actions"><MoreHorizontal size={17} /></button>
      </div>
    </div>
  )
}

const relTime = (iso: string) => {
  const s = (Date.now() - +new Date(iso)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} minutes ago`
  if (s < 86400) return Math.round(s / 3600) === 1 ? '1 hour ago' : `${Math.round(s / 3600)} hours ago`
  return `${Math.round(s / 86400)} days ago`
}

function MessageList({ msgs, all, onThread, onReact, intro }: { msgs: Msg[]; all: Msg[]; onThread: (id: string) => void; onReact: (m: Msg, e: string) => void; intro: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [msgs.length, msgs[0]?.channelId])
  let lastDay = ''
  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-auto pb-2" data-agent="slack-messages">
      <div className="px-5 pt-10 pb-4">{intro}</div>
      {msgs.map((m, i) => {
        const day = dayLabel(m.date)
        const showDay = day !== lastDay
        lastDay = day
        const prev = msgs[i - 1]
        const compact = !showDay && !!prev && prev.from === m.from && +new Date(m.date) - +new Date(prev.date) < 5 * 60000
        return (
          <div key={m.id}>
            {showDay && (
              <div className="relative flex justify-center my-2 sticky top-0 z-10">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-[#DDDDDD]" />
                <button className="relative h-7 px-4 rounded-full border border-[#DDDDDD] bg-white text-[13px] font-bold text-[#1D1C1D] flex items-center gap-1">
                  {day} <ChevronDown size={13} />
                </button>
              </div>
            )}
            <Message m={m} compact={compact} replies={all.filter((r) => r.threadTs === m.id)} onThread={() => onThread(m.id)} onReact={(e) => onReact(m, e)} hovered={hoverId === m.id} onHover={(on) => setHoverId((h) => (on ? m.id : h === m.id ? null : h))} />
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── App ─────────────────────────── */

type Tab = 'home' | 'dms' | 'activity' | 'later' | 'more'

export default function Slack({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const all = useCollection<Msg>('slack.messages')
  const [tab, setTab] = useState<Tab>('home')
  const [conv, setConv] = useState<string>('eng-bugs')
  const [thread, setThread] = useState<string | null>(null)
  const [visited, setVisited] = useState<Set<string>>(() => new Set(['eng-bugs']))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (params?.channelId) open(params.channelId)
    else if (params?.dmId) open(String(params.dmId).startsWith('dm-') ? params.dmId : `dm-${params.dmId}`)
    if (params?.threadTs) setThread(params.threadTs)
  }, [win.nonce])

  const open = (id: string) => {
    setConv(id)
    setThread(null)
    setTab('home')
    setVisited((v) => new Set(v).add(id))
  }

  const isDm = conv.startsWith('dm-')
  const dmPerson = isDm ? person(conv.slice(3)) : null
  const channel = SLACK_CHANNELS.find((c) => c.id === conv)
  const top = useMemo(() => all.filter((m) => m.channelId === conv && !m.threadTs).sort((a, b) => +new Date(a.date) - +new Date(b.date)), [all, conv])
  const threadParent = thread ? all.find((m) => m.id === thread) : undefined
  const threadReplies = thread ? all.filter((m) => m.threadTs === thread).sort((a, b) => +new Date(a.date) - +new Date(b.date)) : []

  const post = (text: string, threadTs?: string) => {
    db.insert('slack.messages', { id: uid('sm'), channelId: conv, from: ME.id, text, date: new Date().toISOString(), threadTs, createdBy: isAgent ? 'hworker' : undefined })
  }
  const react = (m: Msg, e: string) => {
    db.update('slack.messages', m.id, (r) => {
      const rs = [...(r.reactions ?? [])]
      const i = rs.findIndex((x: any) => x.emoji === e)
      if (i < 0) rs.push({ emoji: e, users: [ME.id] })
      else {
        const has = rs[i].users.includes(ME.id)
        const users = has ? rs[i].users.filter((u: string) => u !== ME.id) : [...rs[i].users, ME.id]
        if (users.length) rs[i] = { ...rs[i], users }
        else rs.splice(i, 1)
      }
      return { reactions: rs }
    })
  }

  const unread = (id: string) => !visited.has(id) && all.some((m) => m.channelId === id && m.from !== ME.id && Date.now() - +new Date(m.date) < 3 * 3600_000)
  const lastMsg = (id: string) => all.filter((m) => m.channelId === id).sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]
  const dmOrder = [...INTERNAL].sort((a, b) => {
    const la = lastMsg(`dm-${a.id}`)?.date ?? ''
    const lb = lastMsg(`dm-${b.id}`)?.date ?? ''
    if (a.id === ME.id) return 1
    if (b.id === ME.id) return -1
    return lb.localeCompare(la)
  })

  const title = channel ? `#${channel.name}` : dmPerson?.name ?? ''
  const rail: [Tab, any, string, number?][] = [
    ['home', Home, 'Home'],
    ['dms', MessagesSquare, 'DMs', 2],
    ['activity', Bell, 'Activity', 3],
    ['later', Bookmark, 'Later'],
    ['more', MoreHorizontal, 'More'],
  ]

  const SideItem = ({ id, agent, icon, label, bold, active, badge }: { id: string; agent: string; icon: ReactNode; label: ReactNode; bold?: boolean; active?: boolean; badge?: number }) => (
    <button
      data-agent={agent}
      aria-label={typeof label === 'string' ? label : id}
      onClick={() => open(id)}
      className={`w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] text-left ${active ? 'bg-white/90 text-[#39063A]' : bold ? 'text-white font-bold hover:bg-white/10' : 'text-[#E3D7E3]/80 hover:bg-white/10'}`}
    >
      <span className="w-5 flex justify-center shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {!!badge && <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-[#CD2553] text-white text-[11px] font-bold flex items-center justify-center">{badge}</span>}
    </button>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col text-[#1D1C1D] select-none" style={{ fontFamily: 'Lato, "Slack-Lato", Helvetica, Arial, sans-serif', background: 'linear-gradient(180deg,#481349 0%,#3F0E40 100%)' }}>
      {/* top bar */}
      <div data-drag-handle className="h-10 shrink-0 flex items-center text-white">
        <div className="w-[76px]" />
        <div className="flex items-center gap-1 text-white/80" data-no-drag>
          <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10" aria-label="Back"><ArrowLeft size={17} /></button>
          <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 opacity-50" aria-label="Forward"><ArrowRight size={17} /></button>
          <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10" aria-label="History"><Clock size={16} /></button>
        </div>
        <div className="flex-1 flex justify-center px-3" data-no-drag>
          <button className="w-full max-w-[680px] h-[26px] rounded-md bg-white/20 hover:bg-white/25 flex items-center gap-2 px-2.5 text-[13px] text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
            <Search size={14} /> Search Northwind Global
          </button>
        </div>
        <button className="w-8 h-7 rounded flex items-center justify-center hover:bg-white/10 text-white/80 mr-1" aria-label="Help" data-no-drag><HelpCircle size={17} /></button>
        <WindowControls dark height={40} />
      </div>
      <div className="flex-1 min-h-0 flex">
        {/* tab rail */}
        <div className="w-[70px] shrink-0 flex flex-col items-center pt-1 pb-3 gap-3">
          <button className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#3F0E40] font-black text-[17px] shadow mb-1" aria-label="Northwind Global">N</button>
          {rail.map(([id, I, label, badge]) => (
            <button key={id} data-agent={`slack-tab-${id}`} onClick={() => setTab(id)} className="flex flex-col items-center gap-0.5 group" aria-label={label}>
              <span className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-white ${tab === id ? 'bg-white/25' : 'group-hover:bg-white/15'}`}>
                <I size={19} strokeWidth={tab === id ? 2.4 : 1.9} />
                {badge && <span className="absolute -top-1 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#CD2553] text-[10px] font-bold flex items-center justify-center border-2 border-[#481349]">{badge}</span>}
              </span>
              <span className="text-[11px] font-bold text-white">{label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <button className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center" aria-label="Create new"><Plus size={20} /></button>
          <span className="relative">
            <SlackAvatar id={ME.id} size={36} />
            <span className="absolute -right-1 -bottom-1 w-3.5 h-3.5 rounded-full bg-[#2BAC76] border-[3px] border-[#3F0E40]" />
          </span>
        </div>

        {/* sidebar + main in one rounded container */}
        <div className="flex-1 min-w-0 flex mr-1 mb-1 rounded-lg overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.2)]">
          <div className="w-[262px] shrink-0 flex flex-col bg-white/[0.07] border-r border-white/10">
            {tab === 'home' && (
              <>
                <div className="h-[50px] shrink-0 flex items-center px-4 gap-1 text-white">
                  <button className="flex items-center gap-1 text-[18px] font-black hover:bg-white/10 rounded px-1 -ml-1 whitespace-nowrap">Northwind Global <ChevronDown size={16} /></button>
                  <div className="flex-1" />
                  <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/10" aria-label="Filter"><SlidersHorizontal size={16} /></button>
                  <button className="w-8 h-8 rounded-md flex items-center justify-center bg-white text-[#3F0E40] hover:bg-white/90" aria-label="New message"><SquarePen size={16} /></button>
                </div>
                <div className="flex-1 min-h-0 overflow-auto px-2 pb-3" data-agent="slack-sidebar">
                  {[[MessageSquareText, 'Threads'], [Headphones, 'Huddles'], [SendHorizontal, 'Drafts & sent'], [Layers, 'Directories']].map(([I, l]: any) => (
                    <button key={l} className="w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10">
                      <span className="w-5 flex justify-center"><I size={16} /></span>
                      {l}
                    </button>
                  ))}
                  <div className="mt-3">
                    <button onClick={() => setCollapsed((c) => ({ ...c, ch: !c.ch }))} className="flex items-center gap-1 h-7 pl-2 pr-2 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10 w-full">
                      <ChevronDown size={14} className={collapsed.ch ? '-rotate-90' : ''} /> Channels
                    </button>
                    {!collapsed.ch &&
                      SLACK_CHANNELS.map((c) => (
                        <SideItem key={c.id} id={c.id} agent={`slack-channel-${c.id}`} icon={c.private ? <Lock size={14} /> : <Hash size={15} />} label={c.name} bold={unread(c.id)} active={conv === c.id} badge={c.id === 'it-help' && unread(c.id) ? 1 : undefined} />
                      ))}
                    <button className="w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10">
                      <span className="w-5 h-5 rounded bg-white/15 flex items-center justify-center"><Plus size={13} /></span> Add channels
                    </button>
                  </div>
                  <div className="mt-3">
                    <button onClick={() => setCollapsed((c) => ({ ...c, dm: !c.dm }))} className="flex items-center gap-1 h-7 pl-2 pr-2 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10 w-full">
                      <ChevronDown size={14} className={collapsed.dm ? '-rotate-90' : ''} /> Direct messages
                    </button>
                    {!collapsed.dm &&
                      dmOrder.map((p) => {
                        const id = `dm-${p.id}`
                        const active = conv === id
                        return (
                          <SideItem
                            key={p.id}
                            id={id}
                            agent={`slack-dm-${p.id}`}
                            icon={
                              <span className="relative">
                                <SlackAvatar id={p.id} size={20} />
                                <span className={`absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full border-2 ${active ? 'border-white' : 'border-[#4F2350]'} ${presenceOf(p.id) === 'available' ? 'bg-[#2BAC76]' : 'bg-transparent shadow-[inset_0_0_0_1.5px_#C9B6C9]'}`} />
                              </span>
                            }
                            label={
                              <span className="flex items-center gap-1.5">
                                {p.name}
                                {p.id === ME.id && <span className={active ? 'text-[#616061]' : 'text-white/50'}>you</span>}
                                {STATUS[p.id] && <span className="text-[12px]">{STATUS[p.id]}</span>}
                              </span>
                            }
                            bold={unread(id)}
                            active={active}
                            badge={unread(id) ? all.filter((m) => m.channelId === id && m.from !== ME.id).length : undefined}
                          />
                        )
                      })}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-1 h-7 pl-2 text-[15px] text-[#E3D7E3]/80"><ChevronDown size={14} /> Apps</div>
                    {[['jira', 'Jira Cloud'], ['confluence', 'Confluence'], ['servicenow', 'ServiceNow'], ['zendesk', 'Zendesk']].map(([l, n]) => (
                      <button key={l} className="w-full h-7 flex items-center gap-2 pl-4 pr-3 rounded-md text-[15px] text-[#E3D7E3]/80 hover:bg-white/10">
                        <span className="w-5 h-5 rounded bg-white flex items-center justify-center"><img src={logoUrl(l)} className="w-3.5 h-3.5" alt="" /></span> {n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {tab !== 'home' && <SidePanel tab={tab} all={all} onOpen={open} />}
          </div>

          {/* main */}
          <div className="flex-1 min-w-0 flex bg-white select-text">
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="h-[49px] shrink-0 flex items-center px-4 gap-2 border-b border-[#DDDDDD]">
                <button className="flex items-center gap-1 h-8 px-1.5 -ml-1.5 rounded hover:bg-[#F2F2F2] text-[18px] font-black" data-agent="slack-channel-title">
                  {channel ? (channel.private ? <Lock size={16} /> : <Hash size={18} strokeWidth={2.5} />) : dmPerson && <SlackAvatar id={dmPerson.id} size={24} />}
                  <span>{channel ? channel.name : dmPerson?.name}</span>
                  <ChevronDown size={16} />
                </button>
                {channel && <span className="text-[13px] text-[#616061] truncate flex-1 min-w-0">{channel.topic}</span>}
                {!channel && <div className="flex-1" />}
                {channel && (
                  <button className="flex items-center h-7 pl-1 pr-2 rounded-md border border-[#DDDDDD] hover:bg-[#F8F8F8]">
                    <span className="flex -space-x-1.5">{['tom', 'chen', 'maya'].map((u) => <span key={u} className="ring-2 ring-white rounded-[5px]"><SlackAvatar id={u} size={20} /></span>)}</span>
                    <span className="ml-1.5 text-[13px] font-bold text-[#616061]">{channel.members}</span>
                  </button>
                )}
                <div className="flex items-center h-7 rounded-md border border-[#DDDDDD]">
                  <button className="h-full px-2 flex items-center gap-1 text-[13px] font-bold text-[#616061] hover:bg-[#F8F8F8] rounded-l-md"><Headphones size={15} /> Huddle</button>
                  <span className="w-px h-4 bg-[#DDDDDD]" />
                  <button className="h-full px-1 hover:bg-[#F8F8F8] rounded-r-md text-[#616061]"><ChevronDown size={14} /></button>
                </div>
                <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]"><MoreHorizontal size={17} /></button>
              </div>
              <div className="h-[38px] shrink-0 flex items-end px-4 gap-4 border-b border-[#DDDDDD] text-[13px]">
                {[[MessageSquareText, 'Messages', true], [FileText, isDm ? 'Add canvas' : 'Canvas'], [Layers, 'Files'], [Pin, 'Pins']].map(([I, l, a]: any) => (
                  <button key={l} className={`flex items-center gap-1.5 pb-2 border-b-2 ${a ? 'border-[#1D1C1D] font-bold' : 'border-transparent text-[#616061] hover:text-[#1D1C1D]'}`}><I size={14} /> {l}</button>
                ))}
                <button className="pb-2 text-[#616061]"><Plus size={15} /></button>
              </div>
              <MessageList
                msgs={top}
                all={all}
                onThread={(id) => setThread(id)}
                onReact={react}
                intro={
                  channel ? (
                    <div>
                      <div className="text-[26px] font-black flex items-center gap-1"><Hash size={26} strokeWidth={2.6} /> {channel.name}</div>
                      <div className="text-[15px] text-[#616061] mt-1">{channel.topic}. This is the very beginning of the <span className="px-0.5 rounded bg-[#E8F5FA] text-[#1264A3]">#{channel.name}</span> channel.</div>
                      <div className="flex gap-2 mt-3">
                        <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#F8F8F8]"><Users size={14} /> Add coworkers</button>
                        <button className="h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#F8F8F8]"><BellOff size={14} /> Edit notifications</button>
                      </div>
                    </div>
                  ) : (
                    dmPerson && (
                      <div>
                        <SlackAvatar id={dmPerson.id} size={72} />
                        <div className="text-[22px] font-black mt-3">{dmPerson.name} {dmPerson.id === ME.id && <span className="font-normal text-[#616061] text-[18px]">(you)</span>}</div>
                        <div className="text-[15px] text-[#616061]">{dmPerson.title}</div>
                        <div className="text-[15px] text-[#616061] mt-2">This conversation is just between you and <span className="px-0.5 rounded bg-[#E8F5FA] text-[#1264A3]">@{dmPerson.name}</span>. Check out their profile to learn more about them.</div>
                        <button className="mt-3 h-8 px-3 rounded-lg border border-[#BBBABB] text-[13px] font-bold hover:bg-[#F8F8F8]">View profile</button>
                      </div>
                    )
                  )
                }
              />
              <div className="px-5 pb-5 pt-1 shrink-0">
                <Composer key={conv} placeholder={`Message ${title}`} agent="slack-compose" sendAgent="slack-send" onSend={(t) => post(t)} />
              </div>
            </div>
            {threadParent && (
              <div className="w-[400px] shrink-0 border-l border-[#DDDDDD] flex flex-col" data-agent="slack-thread">
                <div className="h-[49px] shrink-0 flex items-center px-4 border-b border-[#DDDDDD]">
                  <div className="text-[18px] font-black">Thread</div>
                  <div className="ml-2 text-[13px] text-[#616061] flex items-center gap-0.5">{channel ? <><Hash size={12} />{channel.name}</> : dmPerson?.name}</div>
                  <div className="flex-1" />
                  <button className="w-8 h-8 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061]"><MoreHorizontal size={17} /></button>
                  <button data-agent="slack-thread-close" aria-label="Close thread" onClick={() => setThread(null)} className="w-8 h-8 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061]"><X size={18} /></button>
                </div>
                <div className="flex-1 min-h-0 overflow-auto py-3">
                  <Message m={threadParent} compact={false} replies={[]} onReact={(e) => react(threadParent, e)} inThread />
                  <div className="flex items-center gap-3 px-5 my-2 text-[13px] text-[#616061]">
                    {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'} <span className="flex-1 h-px bg-[#DDDDDD]" />
                  </div>
                  {threadReplies.map((m) => (
                    <Message key={m.id} m={m} compact={false} replies={[]} onReact={(e) => react(m, e)} inThread />
                  ))}
                </div>
                <div className="px-4 pb-4 shrink-0">
                  <Composer key={thread} placeholder="Reply…" agent="slack-thread-compose" sendAgent="slack-thread-send" onSend={(t) => post(t, thread!)} compact />
                  <label className="flex items-center gap-2 mt-2 text-[13px] text-[#616061]"><input type="checkbox" className="accent-[#007A5A]" /> Also send to {channel ? `#${channel.name}` : dmPerson?.name}</label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SidePanel({ tab, all, onOpen }: { tab: Tab; all: Msg[]; onOpen: (id: string) => void }) {
  const titles: Record<string, string> = { dms: 'Direct messages', activity: 'Activity', later: 'Later', more: 'More' }
  const dms = INTERNAL.filter((p) => p.id !== ME.id)
    .map((p) => ({ p, last: all.filter((m) => m.channelId === `dm-${p.id}`).sort((a, b) => +new Date(b.date) - +new Date(a.date))[0] }))
    .filter((x) => x.last)
  const mentions = all.filter((m) => /@Alex|Alex/.test(m.text) && m.from !== ME.id).slice(-8).reverse()
  return (
    <div className="flex-1 min-h-0 flex flex-col text-white">
      <div className="h-[50px] shrink-0 flex items-center px-4 text-[18px] font-black">
        {titles[tab]}
        <div className="flex-1" />
        {tab === 'dms' && <button className="w-8 h-8 rounded-md flex items-center justify-center bg-white text-[#3F0E40]"><SquarePen size={16} /></button>}
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-2">
        {tab === 'dms' &&
          dms.map(({ p, last }) => (
            <button key={p.id} onClick={() => onOpen(`dm-${p.id}`)} className="w-full flex gap-2.5 p-2 rounded-md hover:bg-white/10 text-left">
              <SlackAvatar id={p.id} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline"><span className="font-bold text-[15px] flex-1 truncate">{p.name}</span><span className="text-[12px] text-white/60">{timeOf(last!.date)}</span></div>
                <div className="text-[13px] text-white/70 truncate">{last!.from === ME.id ? 'You: ' : ''}{last!.text}</div>
              </div>
            </button>
          ))}
        {tab === 'activity' &&
          mentions.map((m) => (
            <button key={m.id} onClick={() => onOpen(m.channelId)} className="w-full flex gap-2.5 p-2 rounded-md hover:bg-white/10 text-left">
              <SlackAvatar id={m.from} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-white/60">Mention in {m.channelId.startsWith('dm-') ? 'DM' : `#${m.channelId}`}</div>
                <div className="font-bold text-[14px]">{nameOf(m.from)}</div>
                <div className="text-[13px] text-white/75 line-clamp-2">{m.text}</div>
              </div>
            </button>
          ))}
        {tab === 'later' && (
          <div className="p-3 text-[13px] text-white/75">
            <div className="flex items-center gap-2 font-bold text-white mb-2"><Star size={14} /> In progress · 2</div>
            {all.filter((m) => m.channelId === 'eng-bugs' && !m.threadTs).slice(-2).map((m) => (
              <button key={m.id} onClick={() => onOpen(m.channelId)} className="w-full text-left p-2 rounded-md hover:bg-white/10 mb-1">
                <div className="text-[12px] text-white/60">#{m.channelId} · {nameOf(m.from)}</div>
                <div className="line-clamp-2">{m.text}</div>
              </button>
            ))}
            <div className="flex items-center gap-2 font-bold text-white mt-4"><CheckCircle2 size={14} /> Completed · 5</div>
          </div>
        )}
        {tab === 'more' && (
          <div className="p-1">
            {['Templates', 'Workflows', 'Canvases', 'Lists', 'Files', 'Channels', 'People', 'External connections', 'Apps'].map((l) => (
              <div key={l} className="h-9 flex items-center px-3 rounded-md hover:bg-white/10 text-[15px]">{l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
