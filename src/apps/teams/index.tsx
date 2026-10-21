import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Chat24Regular,
  Chat24Filled,
  PeopleTeam24Regular,
  PeopleTeam24Filled,
  Alert24Regular,
  Alert24Filled,
  Calendar24Regular,
  Calendar24Filled,
  Call24Regular,
  Call24Filled,
  Cloud24Regular,
  Cloud24Filled,
  Apps24Regular,
  Apps24Filled,
  MoreHorizontal20Regular,
  Search20Regular,
  ArrowLeft20Regular,
  ArrowRight20Regular,
  Filter20Regular,
  Compose20Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Video20Regular,
  Call20Regular,
  People20Regular,
  Info20Regular,
  TextEditStyle20Regular,
  Emoji20Regular,
  Gif20Regular,
  Sticker20Regular,
  Attach20Regular,
  Add20Regular,
  Send20Filled,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextStrikethrough20Regular,
  Highlight20Regular,
  TextColor20Regular,
  TextFontSize20Regular,
  TextBulletListLtr20Regular,
  TextNumberListLtr20Regular,
  TextQuote20Regular,
  Link20Regular,
  Code20Regular,
  Table20Regular,
  ArrowReply20Regular,
  Important16Filled,
  Pin16Regular,
  Mention16Regular,
  ArrowReply16Regular,
  PersonAdd20Regular,
  Folder20Regular,
  Document20Regular,
  Dialpad20Regular,
  CalendarAdd20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  Sparkle20Regular,
  ArrowSync20Regular,
  CallMissed16Regular,
  CheckmarkCircle16Filled,
  Note20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { fmtTime } from '@/data/time'
import { TEAMS_PRESENCE } from './seed'

const PURPLE = '#5B5FC7'
const FONT = 'var(--font-win)'

type View = 'activity' | 'chat' | 'teams' | 'calendar' | 'calls' | 'onedrive' | 'apps'
interface Msg {
  id: string
  conversationId: string
  from: string
  text: string
  date: string
  createdBy?: string
  subject?: string
  parentId?: string
  reactions?: { emoji: string; count: number }[]
  important?: boolean
}
interface ChatRec {
  id: string
  kind: 'oneOnOne' | 'group' | 'meeting'
  members: string[]
  title?: string
  pinned?: boolean
  unread?: boolean
}
interface TeamRec {
  id: string
  name: string
  color: string
  initials: string
  description: string
  channels: { id: string; name: string; pinned?: boolean }[]
}

const presence = (id: string) => TEAMS_PRESENCE[id] ?? 'offline'
const firstName = (id: string) => (id === ME.id ? 'You' : person(id).first)

function chatTitle(c: ChatRec) {
  if (c.title) return c.title
  if (c.kind === 'oneOnOne') {
    const other = c.members.find((x) => x !== ME.id)
    return other ? person(other).name : `${ME.name} (You)`
  }
  return c.members.filter((x) => x !== ME.id).map((x) => person(x).first).join(', ')
}

function listTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return fmtTime(iso)
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 6) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}
function dayLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** light markdown: **bold**, @Mentions, bullet lines */
function RichText({ text }: { text: string }) {
  const names = PEOPLE.map((p) => p.name).concat(PEOPLE.map((p) => p.first))
  const inline = (s: string, k: number) => {
    const parts = s.split(/(\*\*[^*]+\*\*|@[A-Z][a-zA-Z'’]+(?: [A-Z][a-zA-Z'’]+)?)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${k}-${i}`}>{p.slice(2, -2)}</strong>
      if (p.startsWith('@') && names.some((n) => p.slice(1).startsWith(n))) return <span key={`${k}-${i}`} className="font-semibold" style={{ color: PURPLE }}>{p.slice(1)}</span>
      return <Fragment key={`${k}-${i}`}>{p}</Fragment>
    })
  }
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => {
    if (list.length) out.push(<ul key={`ul-${out.length}`} className="list-disc pl-5 my-0.5 space-y-0.5">{list}</ul>)
    list = []
  }
  lines.forEach((l, i) => {
    const b = /^\s*[•\-*]\s+(.*)$/.exec(l)
    if (b) list.push(<li key={i}>{inline(b[1], i)}</li>)
    else {
      flush()
      out.push(<div key={i} className={l.trim() ? '' : 'h-2'}>{inline(l, i)}</div>)
    }
  })
  flush()
  return <div className="leading-[1.45]">{out}</div>
}

function HWHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#616161]">
      <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" /> via H-Worker
    </span>
  )
}

/* ───────────────────────────── compose ───────────────────────────── */

function Compose({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const [format, setFormat] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(220, Math.max(22, el.scrollHeight)) + 'px'
  }, [text])
  const send = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  const icon = 'w-8 h-8 rounded flex items-center justify-center text-[#424242] hover:bg-[#F0F0F0] hover:text-[#5B5FC7]'
  return (
    <div className="px-5 pb-4 pt-1 shrink-0">
      <div className="rounded-md bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] border-b-2 border-transparent focus-within:border-[#5B5FC7] overflow-hidden">
        {format && (
          <div className="flex items-center gap-0.5 px-2 h-10 border-b border-[#EDEBE9]">
            {[TextBold20Regular, TextItalic20Regular, TextUnderline20Regular, TextStrikethrough20Regular].map((I, i) => (
              <button key={i} className={icon} aria-label={['Bold', 'Italic', 'Underline', 'Strikethrough'][i]}>
                <I />
              </button>
            ))}
            <span className="w-px h-5 bg-[#E0E0E0] mx-1" />
            {[Highlight20Regular, TextColor20Regular, TextFontSize20Regular].map((I, i) => (
              <button key={i} className={icon}>
                <I />
              </button>
            ))}
            <span className="w-px h-5 bg-[#E0E0E0] mx-1" />
            {[TextBulletListLtr20Regular, TextNumberListLtr20Regular, TextQuote20Regular, Link20Regular, Code20Regular, Table20Regular].map((I, i) => (
              <button key={i} className={icon}>
                <I />
              </button>
            ))}
            <span className="text-[12.5px] text-[#616161] ml-2">Paragraph ▾</span>
          </div>
        )}
        <div className="flex items-end gap-1 pl-3 pr-1.5 py-1.5">
          <textarea
            ref={ref}
            data-agent="teams-compose"
            aria-label="Type a message"
            value={text}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={placeholder}
            className="flex-1 resize-none outline-none text-[14px] leading-[22px] py-[5px] bg-transparent placeholder:text-[#616161]"
            style={{ fontFamily: FONT }}
          />
          <div className="flex items-center shrink-0">
            <button className={icon} aria-label="Format" onClick={() => setFormat((f) => !f)} style={format ? { color: PURPLE } : undefined}>
              <TextEditStyle20Regular />
            </button>
            <button className={icon} aria-label="Emoji">
              <Emoji20Regular />
            </button>
            <button className={icon} aria-label="GIF">
              <Gif20Regular />
            </button>
            <button className={icon} aria-label="Sticker">
              <Sticker20Regular />
            </button>
            <button className={icon} aria-label="Attach file">
              <Attach20Regular />
            </button>
            <button className={icon} aria-label="Loop component">
              <ArrowSync20Regular />
            </button>
            <button className={icon} aria-label="Actions and apps">
              <Add20Regular />
            </button>
            <span className="w-px h-5 bg-[#E0E0E0] mx-1" />
            <button data-agent="teams-send" aria-label="Send" onClick={send} className={`w-8 h-8 rounded flex items-center justify-center ${text.trim() ? 'text-[#5B5FC7] hover:bg-[#F0F0F0]' : 'text-[#BDBDBD]'}`}>
              <Send20Filled />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────── chat pane ───────────────────────────── */

function ChatPane({ chat, messages, onSend }: { chat: ChatRec; messages: Msg[]; onSend: (t: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, chat.id])
  const other = chat.kind === 'oneOnOne' ? chat.members.find((x) => x !== ME.id) : undefined
  const title = chatTitle(chat)
  let lastDay = ''
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#F5F5F5]">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-3 bg-white border-b border-[#E0E0E0]">
        {chat.kind === 'oneOnOne' ? (
          <Avatar id={other ?? ME.id} size={32} presence={presence(other ?? ME.id)} />
        ) : (
          <span className="w-8 h-8 rounded-full bg-[#E8EBFA] flex items-center justify-center" style={{ color: PURPLE }}>
            {chat.kind === 'meeting' ? <Calendar24Regular className="w-4 h-4" /> : <People20Regular className="w-4 h-4" />}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[15.5px] font-semibold truncate" data-agent="teams-conversation-title">{title}</div>
        </div>
        <div className="flex items-center gap-4 ml-4 text-[14px] h-full">
          {['Chat', 'Shared', chat.kind === 'meeting' ? 'Recap' : 'Notes'].map((t, i) => (
            <span key={t} className={`relative h-full flex items-center ${i === 0 ? 'font-semibold' : 'text-[#424242]'}`}>
              {t}
              {i === 0 && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t" style={{ background: PURPLE }} />}
            </span>
          ))}
          <Add20Regular className="w-4 h-4 text-[#616161]" />
        </div>
        <div className="flex-1" />
        <div className="flex items-center rounded-md border border-[#D1D1D1] overflow-hidden">
          <button className="h-8 px-2.5 flex items-center gap-1.5 text-[13px] hover:bg-[#F5F5F5]" aria-label="Video call">
            <Video20Regular />
          </button>
          <span className="w-px h-5 bg-[#D1D1D1]" />
          <button className="h-8 px-2.5 flex items-center gap-1.5 text-[13px] hover:bg-[#F5F5F5]" aria-label="Audio call">
            <Call20Regular />
          </button>
        </div>
        {chat.kind !== 'oneOnOne' && (
          <button className="h-8 px-2 flex items-center gap-1 rounded hover:bg-[#F0F0F0] text-[13px]">
            <People20Regular /> {chat.members.length}
          </button>
        )}
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F0F0F0]" aria-label="More options">
          <MoreHorizontal20Regular />
        </button>
      </div>
      <div ref={scroller} className="flex-1 overflow-auto px-6 py-4" data-agent="teams-messages">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#616161]">
            <Avatar id={other ?? ME.id} size={72} />
            <div className="mt-3 text-[16px] font-semibold text-[#242424]">{title}</div>
            <div className="text-[13px]">Start your conversation</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const day = new Date(msg.date).toDateString()
          const showDay = day !== lastDay
          lastDay = day
          const grouped = !showDay && prev && prev.from === msg.from && +new Date(msg.date) - +new Date(prev.date) < 5 * 60000
          const mine = msg.from === ME.id
          const fresh = msg.createdBy === 'hworker' && Date.now() - +new Date(msg.date) < 60000
          return (
            <Fragment key={msg.id}>
              {showDay && (
                <div className="flex items-center gap-3 my-4 text-[12px] text-[#616161]">
                  <span className="flex-1 h-px bg-[#E0E0E0]" />
                  {dayLabel(msg.date)}
                  <span className="flex-1 h-px bg-[#E0E0E0]" />
                </div>
              )}
              {mine ? (
                <div className={`flex flex-col items-end ${grouped ? 'mt-0.5' : 'mt-3'}`} data-agent={`teams-message-${msg.id}`}>
                  {!grouped && <div className="text-[12px] text-[#616161] mb-1">{fmtTime(msg.date)}</div>}
                  <div className={`max-w-[640px] rounded-md px-3 py-2 text-[14px] text-[#242424] ${fresh ? 'flash-new' : ''}`} style={{ background: '#E8EBFA' }}>
                    <RichText text={msg.text} />
                  </div>
                  {msg.createdBy === 'hworker' && <div className="mt-0.5"><HWHint /></div>}
                </div>
              ) : (
                <div className={`flex gap-2.5 ${grouped ? 'mt-0.5' : 'mt-3'}`} data-agent={`teams-message-${msg.id}`}>
                  <div className="w-8 shrink-0">{!grouped && <Avatar id={msg.from} size={32} />}</div>
                  <div className="min-w-0">
                    {!grouped && (
                      <div className="text-[12px] text-[#616161] mb-1">
                        {chat.kind !== 'oneOnOne' && <span className="font-semibold text-[#424242] mr-2">{person(msg.from).name}</span>}
                        {fmtTime(msg.date)}
                      </div>
                    )}
                    <div className="inline-block max-w-[640px] rounded-md px-3 py-2 text-[14px] text-[#242424] bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]">
                      <RichText text={msg.text} />
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          )
        })}
      </div>
      <Compose placeholder="Type a message" onSend={onSend} />
    </div>
  )
}

/* ───────────────────────────── channel pane ───────────────────────────── */

function ChannelPane({ team, channelId, messages, onSend }: { team: TeamRec; channelId: string; messages: Msg[]; onSend: (t: string, parentId?: string) => void }) {
  const ch = team.channels.find((c) => c.id === channelId)!
  const scroller = useRef<HTMLDivElement>(null)
  const posts = messages.filter((m) => !m.parentId)
  const replies = (id: string) => messages.filter((m) => m.parentId === id)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, channelId])
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#F5F5F5]">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-3 bg-white border-b border-[#E0E0E0]">
        <span className="w-8 h-8 rounded-md flex items-center justify-center text-white text-[12px] font-semibold" style={{ background: team.color }}>
          {team.initials}
        </span>
        <div className="min-w-0">
          <div className="text-[15.5px] font-semibold truncate leading-tight" data-agent="teams-conversation-title">{ch.name}</div>
          <div className="text-[11.5px] text-[#616161] truncate">{team.name}</div>
        </div>
        <div className="flex items-center gap-4 ml-4 text-[14px] h-full">
          {['Posts', 'Files', 'Notes'].map((t, i) => (
            <span key={t} className={`relative h-full flex items-center ${i === 0 ? 'font-semibold' : 'text-[#424242]'}`}>
              {t}
              {i === 0 && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t" style={{ background: PURPLE }} />}
            </span>
          ))}
          <Add20Regular className="w-4 h-4 text-[#616161]" />
        </div>
        <div className="flex-1" />
        <button className="h-8 px-3 flex items-center gap-1.5 rounded-md border border-[#D1D1D1] text-[13px] font-semibold hover:bg-[#F5F5F5]">
          <Video20Regular /> Meet <ChevronDown16Regular />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F0F0F0]" aria-label="Channel info">
          <Info20Regular />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F0F0F0]" aria-label="More options">
          <MoreHorizontal20Regular />
        </button>
      </div>
      <div ref={scroller} className="flex-1 overflow-auto px-6 py-4 space-y-4" data-agent="teams-posts">
        <div className="text-center text-[12.5px] text-[#616161] py-2">
          Welcome to {ch.name}! {team.description}
        </div>
        {posts.map((p) => {
          const rs = replies(p.id)
          const fresh = p.createdBy === 'hworker' && Date.now() - +new Date(p.date) < 60000
          return (
            <div key={p.id} className={`bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] max-w-[860px] ${fresh ? 'flash-new' : ''}`} data-agent={`teams-post-${p.id}`}>
              {p.important && <div className="h-1 rounded-t-lg bg-[#C4314B]" />}
              <div className="flex gap-3 px-4 pt-3 pb-2">
                <Avatar id={p.from} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-[#616161] flex items-center gap-2">
                    <span className="font-semibold text-[#242424]">{person(p.from).name}</span>
                    {new Date(p.date).toDateString() === new Date().toDateString() ? fmtTime(p.date) : `${new Date(p.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })} ${fmtTime(p.date)}`}
                    {p.important && (
                      <span className="flex items-center gap-0.5 text-[#C4314B] font-semibold text-[11.5px]">
                        <Important16Filled className="w-3.5 h-3.5" /> IMPORTANT!
                      </span>
                    )}
                    {p.createdBy === 'hworker' && <HWHint />}
                  </div>
                  {p.subject && <div className="text-[16px] font-semibold text-[#242424] mt-1">{p.subject}</div>}
                  <div className="text-[14px] text-[#242424] mt-1">
                    <RichText text={p.text} />
                  </div>
                  {p.reactions && (
                    <div className="flex gap-1.5 mt-2">
                      {p.reactions.map((r) => (
                        <span key={r.emoji} className="h-6 px-2 rounded-full border border-[#E0E0E0] bg-[#FAFAFA] text-[12px] flex items-center gap-1">
                          {r.emoji} {r.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {rs.length > 0 && (
                <div className="border-t border-[#F0F0F0] px-4 py-2 space-y-2 bg-[#FAFAFA]">
                  <div className="text-[12px] font-semibold" style={{ color: PURPLE }}>
                    {rs.length} {rs.length === 1 ? 'reply' : 'replies'} from {Array.from(new Set(rs.map((r) => firstName(r.from)))).join(', ')}
                  </div>
                  {rs.map((r) => (
                    <div key={r.id} className="flex gap-2.5">
                      <Avatar id={r.from} size={24} />
                      <div className="min-w-0">
                        <div className="text-[12px] text-[#616161]">
                          <span className="font-semibold text-[#242424] mr-1.5">{person(r.from).name}</span>
                          {fmtTime(r.date)} {r.createdBy === 'hworker' && <HWHint />}
                        </div>
                        <div className="text-[13.5px]">
                          <RichText text={r.text} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-[#F0F0F0] px-4 py-1.5">
                {replyTo === p.id ? (
                  <input
                    autoFocus
                    data-agent={`teams-reply-input-${p.id}`}
                    aria-label="Reply"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && replyText.trim()) {
                        onSend(replyText.trim(), p.id)
                        setReplyText('')
                        setReplyTo(null)
                      }
                      if (e.key === 'Escape') setReplyTo(null)
                    }}
                    placeholder="Reply"
                    className="w-full h-8 outline-none text-[13.5px] border-b-2 border-[#5B5FC7]"
                  />
                ) : (
                  <button data-agent={`teams-reply-${p.id}`} onClick={() => setReplyTo(p.id)} className="flex items-center gap-1.5 h-7 text-[13px] text-[#424242] hover:text-[#5B5FC7]">
                    <ArrowReply20Regular className="w-4 h-4" /> Reply
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <Compose placeholder={`Post in ${ch.name}`} onSend={(t) => onSend(t)} />
    </div>
  )
}

/* ───────────────────────────── secondary views ───────────────────────────── */

function CalendarView() {
  const events = useCollection<any>('outlook.events')
  const start = new Date()
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  start.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 5 }, (_, i) => new Date(start.getTime() + i * 86400000))
  const hours = Array.from({ length: 10 }, (_, i) => 8 + i)
  const H = 52
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-white">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-3 border-b border-[#E0E0E0]">
        <Calendar24Regular style={{ color: PURPLE }} />
        <span className="text-[18px] font-semibold">Calendar</span>
        <button className="ml-4 h-8 px-3 rounded-md border border-[#D1D1D1] text-[13px]">Today</button>
        <ChevronLeft20Regular />
        <ChevronRight20Regular />
        <span className="text-[14px] font-semibold">{start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <div className="flex-1" />
        <button className="h-8 px-3 rounded-md border border-[#D1D1D1] text-[13px] flex items-center gap-1.5">
          <Video20Regular /> Meet now
        </button>
        <button className="h-8 px-3 rounded-md text-white text-[13px] font-semibold flex items-center gap-1.5" style={{ background: PURPLE }}>
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
                    <div key={e.id} className="absolute left-1 right-1 rounded-[3px] px-2 py-1 text-[11.5px] overflow-hidden border-l-[3px]" style={{ top, height: h, background: '#E8EBFA', borderColor: PURPLE }}>
                      <div className="font-semibold truncate">{e.title}</div>
                      <div className="text-[#616161] truncate">{e.location ?? 'Microsoft Teams Meeting'}</div>
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CallsView() {
  const hist = [
    ['rachel', 'Missed', 1],
    ['priya', 'Outgoing · 12m 40s', 1],
    ['ben', 'Incoming · 4m 12s', 2],
    ['elena', 'Outgoing · 31m 05s', 2],
    ['oliver', 'Incoming · 2m 51s', 3],
    ['maya', 'Outgoing · 7m 22s', 4],
  ] as const
  return (
    <div className="flex-1 min-w-0 flex bg-white">
      <div className="w-[340px] border-r border-[#E0E0E0] p-5">
        <div className="text-[18px] font-semibold mb-4">Calls</div>
        <div className="h-10 rounded-md border border-[#D1D1D1] flex items-center px-3 text-[14px] text-[#616161]">Type a name or number</div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
            <button key={k} className="h-12 rounded-md bg-[#F5F5F5] text-[18px] hover:bg-[#EBEBEB]">
              {k}
            </button>
          ))}
        </div>
        <button className="mt-4 w-full h-9 rounded-md text-white text-[14px] font-semibold flex items-center justify-center gap-2" style={{ background: PURPLE }}>
          <Call20Regular /> Call
        </button>
        <div className="mt-6 flex items-center gap-2 text-[13px] text-[#616161]">
          <Dialpad20Regular /> Work number: +1 (617) 555-0142
        </div>
      </div>
      <div className="flex-1 p-5">
        <div className="text-[15px] font-semibold mb-3">History</div>
        {hist.map(([id, t, d]) => (
          <div key={id + t} className="flex items-center gap-3 h-14 border-b border-[#F0F0F0]">
            <Avatar id={id} size={36} />
            <div className="flex-1">
              <div className={`text-[14px] ${t === 'Missed' ? 'text-[#C4314B] font-semibold' : ''}`}>{person(id).name}</div>
              <div className="text-[12px] text-[#616161] flex items-center gap-1">
                {t === 'Missed' && <CallMissed16Regular />} {t}
              </div>
            </div>
            <span className="text-[12px] text-[#616161]">{new Date(Date.now() - d * 86400000).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</span>
            <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center">
              <Call20Regular />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function OneDriveView() {
  const files = useCollection<any>('files')
  const { open } = useDesk()
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-white">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-3 border-b border-[#E0E0E0]">
        <img src={logoUrl('onedrive')} className="w-6 h-6" alt="" />
        <span className="text-[18px] font-semibold">OneDrive</span>
        <div className="flex gap-4 ml-6 text-[14px]">
          {['Home', 'My files', 'Shared', 'Favorites'].map((t, i) => (
            <span key={t} className={i === 0 ? 'font-semibold' : 'text-[#424242]'}>{t}</span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-5 py-3">
        <div className="grid grid-cols-[1fr_160px_160px_100px] text-[12px] text-[#616161] h-9 items-center border-b border-[#EDEBE9]">
          <span>Name</span>
          <span>Opened</span>
          <span>Owner</span>
          <span>Size</span>
        </div>
        {files.map((f: any) => (
          <button key={f.id} onClick={() => f.open && open(f.open.appId, f.open.params)} className="w-full grid grid-cols-[1fr_160px_160px_100px] items-center h-11 border-b border-[#F5F5F5] text-[13.5px] text-left hover:bg-[#F5F5F5]">
            <span className="flex items-center gap-2.5 min-w-0">
              {['xlsx', 'docx', 'pptx'].includes(f.kind) ? <img src={logoUrl(f.kind === 'xlsx' ? 'excel' : f.kind === 'docx' ? 'word' : 'powerpoint')} className="w-5 h-5" alt="" /> : f.kind === 'zip' ? <Folder20Regular /> : <Document20Regular />}
              <span className="truncate">{f.name}</span>
            </span>
            <span className="text-[12.5px] text-[#616161]">{listTime(f.modified)}</span>
            <span className="text-[12.5px] text-[#616161]">{ME.name}</span>
            <span className="text-[12.5px] text-[#616161]">{f.size}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AppsView() {
  const apps = [
    ['Planner', '#31752F', 'Tasks by Planner and To Do'],
    ['Approvals', '#0F6CBD', 'Approvals'],
    ['Viva Insights', '#8764B8', 'Wellbeing and productivity'],
    ['Power BI', 'powerbi', 'Dashboards and reports'],
    ['Jira Cloud', 'jira', 'Atlassian'],
    ['ServiceNow', 'servicenow', 'ITSM'],
    ['Salesforce', 'salesforce', 'CRM'],
    ['Workday', 'workday', 'HR'],
    ['Polly', '#2D9CDB', 'Polls and surveys'],
    ['Forms', '#038387', 'Microsoft Forms'],
    ['Shifts', '#0078D4', 'Frontline scheduling'],
    ['H-Worker', 'hworker', 'AI coworkers for your apps'],
  ]
  return (
    <div className="flex-1 min-w-0 overflow-auto bg-white p-6">
      <div className="text-[20px] font-semibold mb-1">Apps</div>
      <div className="text-[13px] text-[#616161] mb-5">Built for your org · Popular in Northwind Global</div>
      <div className="grid grid-cols-4 gap-4 max-w-[1000px]">
        {apps.map(([n, c, d]) => (
          <div key={n} className="flex items-center gap-3 p-3 rounded-lg border border-[#E0E0E0] hover:shadow-md">
            {c.startsWith('#') ? (
              <span className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-semibold" style={{ background: c }}>
                {n[0]}
              </span>
            ) : (
              <img src={logoUrl(c)} className="w-11 h-11 rounded-lg p-1.5 bg-[#F5F5F5]" alt="" />
            )}
            <div className="min-w-0">
              <div className="text-[14px] font-semibold truncate">{n}</div>
              <div className="text-[12px] text-[#616161] truncate">{d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────── app ───────────────────────────── */

export default function Teams({ win, params }: AppProps) {
  const { isAgent } = useDesk()
  const { setTitle } = useWin()
  const chats = useCollection<ChatRec>('teams.chats')
  const teams = useCollection<TeamRec>('teams.teams')
  const messages = useCollection<Msg>('teams.messages')
  const activity = useCollection<any>('teams.activity')
  const [view, setView] = useState<View>('chat')
  const [chatId, setChatId] = useState('chat-priya')
  const [channelId, setChannelId] = useState('operations-team')
  const [actSel, setActSel] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [sec, setSec] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const p = params ?? {}
    if (p.chatId) {
      const id = db.find('teams.chats', p.chatId) ? p.chatId : `chat-${p.chatId}`
      setChatId(id)
      setView('chat')
    } else if (p.channelId) {
      setChannelId(p.channelId)
      setView('teams')
    } else if (p.view) setView(p.view)
  }, [win.nonce])

  const byConv = useMemo(() => {
    const m = new Map<string, Msg[]>()
    for (const x of messages) {
      const l = m.get(x.conversationId) ?? []
      l.push(x)
      m.set(x.conversationId, l)
    }
    for (const l of m.values()) l.sort((a, b) => +new Date(a.date) - +new Date(b.date))
    return m
  }, [messages])

  const send = (conversationId: string, text: string, parentId?: string) => {
    db.insert('teams.messages', {
      id: uid('tm'),
      conversationId,
      from: ME.id,
      text,
      date: new Date().toISOString(),
      ...(parentId ? { parentId } : {}),
      ...(isAgent ? { createdBy: 'hworker' } : {}),
    })
  }

  const openChat = (id: string) => {
    setChatId(id)
    setView('chat')
    if (db.find<ChatRec>('teams.chats', id)?.unread) db.update('teams.chats', id, { unread: false })
  }
  const openChannel = (id: string) => {
    setChannelId(id)
    setView('teams')
  }

  const chat = chats.find((c) => c.id === chatId)
  const team = teams.find((t) => t.channels.some((c) => c.id === channelId))
  const channelName = team?.channels.find((c) => c.id === channelId)?.name

  useEffect(() => {
    if (view === 'chat' && chat) setTitle(`Chat | ${chatTitle(chat)} | Microsoft Teams`)
    else if (view === 'teams' && channelName) setTitle(`${channelName} (${team?.name}) | Microsoft Teams`)
    else setTitle('Microsoft Teams')
  }, [view, chatId, channelId])

  const sortedChats = useMemo(() => {
    const last = (c: ChatRec) => byConv.get(c.id)?.at(-1)?.date ?? '1970-01-01'
    return [...chats].sort((a, b) => +new Date(last(b)) - +new Date(last(a)))
  }, [chats, byConv])

  const unreadChats = chats.filter((c) => c.unread).length
  const unreadAct = activity.filter((a) => !a.read).length

  const rail: [View, string, any, any, number?][] = [
    ['activity', 'Activity', Alert24Regular, Alert24Filled, unreadAct],
    ['chat', 'Chat', Chat24Regular, Chat24Filled, unreadChats],
    ['teams', 'Teams', PeopleTeam24Regular, PeopleTeam24Filled],
    ['calendar', 'Calendar', Calendar24Regular, Calendar24Filled],
    ['calls', 'Calls', Call24Regular, Call24Filled],
    ['onedrive', 'OneDrive', Cloud24Regular, Cloud24Filled],
  ]

  const chatRow = (c: ChatRec) => {
    const last = byConv.get(c.id)?.at(-1)
    const other = c.kind === 'oneOnOne' ? c.members.find((x) => x !== ME.id) ?? ME.id : undefined
    const agentId = c.kind === 'oneOnOne' ? `teams-chat-${other}` : `teams-chat-${c.id}`
    const on = view === 'chat' && chatId === c.id
    return (
      <button
        key={c.id}
        data-agent={agentId}
        aria-label={chatTitle(c)}
        onClick={() => openChat(c.id)}
        className={`w-full flex items-center gap-2.5 px-2.5 h-[52px] rounded-md text-left ${on ? 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]' : 'hover:bg-[#EBEBEB]'}`}
      >
        {other ? (
          <Avatar id={other} size={32} presence={presence(other)} />
        ) : (
          <span className="w-8 h-8 shrink-0 rounded-full bg-[#E8EBFA] flex items-center justify-center" style={{ color: PURPLE }}>
            {c.kind === 'meeting' ? <Calendar24Regular className="w-4 h-4" /> : <People20Regular className="w-4 h-4" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`flex-1 truncate text-[14px] ${c.unread ? 'font-semibold' : ''}`}>{chatTitle(c)}</span>
            <span className="text-[11.5px] text-[#616161] shrink-0">{listTime(last?.date)}</span>
          </div>
          <div className={`truncate text-[12.5px] ${c.unread ? 'text-[#242424] font-semibold' : 'text-[#616161]'}`}>
            {last ? `${last.from === ME.id ? 'You: ' : c.kind !== 'oneOnOne' ? `${person(last.from).first}: ` : ''}${last.text.replace(/\n/g, ' ')}` : 'No messages yet'}
          </div>
        </div>
      </button>
    )
  }

  const section = (id: string, title: string, children: ReactNode) => (
    <div className="mb-1" key={id}>
      <button onClick={() => setSec((s) => ({ ...s, [id]: !s[id] }))} className="flex items-center gap-1 h-8 px-2 text-[12.5px] text-[#424242] font-semibold w-full">
        {sec[id] ? <ChevronRight16Regular /> : <ChevronDown16Regular />} {title}
      </button>
      {!sec[id] && children}
    </div>
  )

  const actItem = activity.find((x) => x.id === actSel)

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#EBEBEB] text-[#242424]" style={{ fontFamily: FONT }}>
      {/* title bar */}
      <div data-drag-handle className="h-12 shrink-0 flex items-center" style={{ background: 'linear-gradient(90deg,#E9E8F5,#EBEBEB 40%)' }}>
        <div className="w-[68px] flex items-center justify-center">
          <img src={logoUrl('teams')} className="w-6 h-6" alt="Microsoft Teams" />
        </div>
        <div className="flex items-center gap-1 text-[#616161]" data-no-drag>
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Back">
            <ArrowLeft20Regular />
          </button>
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Forward">
            <ArrowRight20Regular />
          </button>
        </div>
        <div className="flex-1 flex justify-center px-6" data-no-drag>
          <div className="flex items-center gap-2 w-full max-w-[600px] h-8 rounded-md bg-white px-3 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            <Search20Regular className="w-4 h-4 text-[#616161]" />
            <input data-agent="teams-search" aria-label="Search" placeholder="Search (Ctrl+Alt+E)" className="flex-1 outline-none text-[13px] bg-transparent placeholder:text-[#616161]" />
          </div>
        </div>
        <div className="flex items-center gap-1" data-no-drag>
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Settings and more">
            <MoreHorizontal20Regular />
          </button>
          <button className="flex items-center gap-2 h-10 px-2 rounded hover:bg-black/5">
            <span className="text-[12.5px] text-[#424242]">Northwind Global</span>
            <Avatar id={ME.id} size={30} presence="available" />
          </button>
        </div>
        <WindowControls height={48} />
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* app bar */}
        <div className="w-[68px] shrink-0 flex flex-col items-center gap-0.5 pt-1">
          {rail.map(([id, label, I, IF, badge]) => {
            const on = view === id
            return (
              <button
                key={id}
                data-agent={`teams-nav-${id}`}
                aria-label={label}
                onClick={() => setView(id)}
                className={`relative w-[60px] h-[54px] rounded-md flex flex-col items-center justify-center gap-0.5 ${on ? '' : 'hover:bg-[#E0E0E0]'}`}
                style={{ color: on ? PURPLE : '#424242' }}
              >
                {on && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: PURPLE }} />}
                <span className="relative">
                  {on ? <IF /> : <I />}
                  {!!badge && <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#C4314B] text-white text-[10px] font-semibold flex items-center justify-center">{badge}</span>}
                </span>
                <span className={`text-[10.5px] ${on ? 'font-semibold' : ''}`}>{label}</span>
              </button>
            )
          })}
          <button data-agent="teams-nav-apps" aria-label="Apps" onClick={() => setView('apps')} className="relative w-[60px] h-[54px] rounded-md flex flex-col items-center justify-center gap-0.5 hover:bg-[#E0E0E0]" style={{ color: view === 'apps' ? PURPLE : '#424242' }}>
            {view === 'apps' ? <Apps24Filled /> : <Apps24Regular />}
            <span className="text-[10.5px]">Apps</span>
          </button>
        </div>

        {/* main surface */}
        <div className="flex-1 min-w-0 flex rounded-tl-lg overflow-hidden bg-[#F5F5F5] shadow-[0_0_2px_rgba(0,0,0,0.12)]">
          {view === 'chat' && (
            <>
              <div className="w-[320px] shrink-0 flex flex-col border-r border-[#E0E0E0] bg-[#F5F5F5]">
                <div className="h-[60px] shrink-0 flex items-center px-4 gap-1">
                  <span className="text-[18px] font-semibold flex-1">Chat</span>
                  <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="More options">
                    <MoreHorizontal20Regular />
                  </button>
                  <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="Filter">
                    <Filter20Regular />
                  </button>
                  <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="Video">
                    <Video20Regular />
                  </button>
                  <button data-agent="teams-new-chat" className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="New chat">
                    <Compose20Regular />
                  </button>
                </div>
                <div className="flex gap-1.5 px-4 pb-2">
                  {['Unread', 'Chats', 'Channels', 'Meetings'].map((f) => (
                    <span key={f} className="h-6 px-2.5 rounded-full bg-white border border-[#E0E0E0] text-[12px] flex items-center">{f}</span>
                  ))}
                </div>
                <div className="flex-1 overflow-auto px-2 pb-3" data-agent="teams-chat-list">
                  {section('pinned', 'Pinned', sortedChats.filter((c) => c.pinned).map(chatRow))}
                  {section('recent', 'Recent', sortedChats.filter((c) => !c.pinned).map(chatRow))}
                </div>
              </div>
              {chat ? <ChatPane chat={chat} messages={byConv.get(chat.id) ?? []} onSend={(t) => send(chat.id, t)} /> : <div className="flex-1" />}
            </>
          )}

          {view === 'teams' && (
            <>
              <div className="w-[320px] shrink-0 flex flex-col border-r border-[#E0E0E0] bg-[#F5F5F5]">
                <div className="h-[60px] shrink-0 flex items-center px-4 gap-1">
                  <span className="text-[18px] font-semibold flex-1">Teams</span>
                  <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="Filter">
                    <Filter20Regular />
                  </button>
                  <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="Join or create a team">
                    <PersonAdd20Regular />
                  </button>
                </div>
                <div className="flex-1 overflow-auto px-2 pb-3" data-agent="teams-team-list">
                  {teams.map((t) => {
                    const open = !collapsed.includes(t.id)
                    return (
                      <div key={t.id} className="mb-1">
                        <button onClick={() => setCollapsed((c) => (open ? [...c, t.id] : c.filter((x) => x !== t.id)))} className="w-full flex items-center gap-2 h-10 px-2 rounded-md hover:bg-[#EBEBEB] text-left">
                          {open ? <ChevronDown16Regular className="text-[#616161]" /> : <ChevronRight16Regular className="text-[#616161]" />}
                          <span className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: t.color }}>
                            {t.initials}
                          </span>
                          <span className="flex-1 truncate text-[14px] font-semibold">{t.name}</span>
                          <MoreHorizontal20Regular className="text-[#9E9E9E]" />
                        </button>
                        {open &&
                          t.channels.map((c) => {
                            const on = channelId === c.id
                            const recent = (byConv.get(c.id) ?? []).some((m) => Date.now() - +new Date(m.date) < 4 * 3600000 && m.from !== ME.id)
                            return (
                              <button
                                key={c.id}
                                data-agent={`teams-channel-${c.id}`}
                                aria-label={`${c.name} channel`}
                                onClick={() => openChannel(c.id)}
                                className={`w-full flex items-center gap-2 h-8 pl-[46px] pr-2 rounded-md text-left text-[13.5px] ${on ? 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]' : 'hover:bg-[#EBEBEB]'} ${recent && !on ? 'font-semibold' : ''}`}
                              >
                                <span className="flex-1 truncate">{c.name}</span>
                                {c.pinned && <Pin16Regular className="text-[#9E9E9E]" />}
                              </button>
                            )
                          })}
                      </div>
                    )
                  })}
                </div>
              </div>
              {team ? (
                <ChannelPane team={team} channelId={channelId} messages={byConv.get(channelId) ?? []} onSend={(t, parentId) => send(channelId, t, parentId)} />
              ) : (
                <div className="flex-1" />
              )}
            </>
          )}

          {view === 'activity' && (
            <>
              <div className="w-[360px] shrink-0 flex flex-col border-r border-[#E0E0E0] bg-[#F5F5F5]">
                <div className="h-[60px] shrink-0 flex items-center px-4 gap-1">
                  <span className="text-[18px] font-semibold flex-1">Activity</span>
                  <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="Filter">
                    <Filter20Regular />
                  </button>
                </div>
                <div className="flex gap-1.5 px-4 pb-2">
                  {['Unread', '@Mentions', 'Replies', 'Reactions'].map((f) => (
                    <span key={f} className="h-6 px-2.5 rounded-full bg-white border border-[#E0E0E0] text-[12px] flex items-center">{f}</span>
                  ))}
                </div>
                <div className="flex-1 overflow-auto px-2 pb-3" data-agent="teams-activity-list">
                  {[...activity]
                    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                    .map((a) => {
                      const Icon = a.kind === 'mention' ? Mention16Regular : a.kind === 'reply' ? ArrowReply16Regular : a.kind === 'missed' ? CallMissed16Regular : a.kind === 'reaction' ? CheckmarkCircle16Filled : a.kind === 'assigned' ? Note20Regular : Chat24Regular
                      return (
                        <button
                          key={a.id}
                          data-agent={`teams-activity-${a.id}`}
                          onClick={() => {
                            setActSel(a.id)
                            if (!a.read) db.update('teams.activity', a.id, { read: true })
                          }}
                          className={`w-full flex gap-2.5 px-2.5 py-2.5 rounded-md text-left ${actSel === a.id ? 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]' : 'hover:bg-[#EBEBEB]'}`}
                        >
                          <span className="relative">
                            <Avatar id={a.from} size={32} />
                            <span className="absolute -right-1 -bottom-1 w-[18px] h-[18px] rounded-full bg-white flex items-center justify-center shadow" style={{ color: a.kind === 'missed' ? '#C4314B' : PURPLE }}>
                              <Icon className="w-3 h-3" />
                            </span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`flex-1 truncate text-[13.5px] ${a.read ? '' : 'font-semibold'}`}>
                                {person(a.from).name} <span className="font-normal text-[#616161]">{a.text}</span>
                              </span>
                              <span className="text-[11.5px] text-[#616161]">{listTime(a.date)}</span>
                            </div>
                            <div className="text-[12.5px] text-[#616161] line-clamp-2">{a.preview}</div>
                          </div>
                          {!a.read && <span className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ background: PURPLE }} />}
                        </button>
                      )
                    })}
                </div>
              </div>
              {actItem ? (
                actItem.conversationId.startsWith('chat-') ? (
                  (() => {
                    const c = chats.find((x) => x.id === actItem.conversationId)
                    return c ? <ChatPane chat={c} messages={byConv.get(c.id) ?? []} onSend={(t) => send(c.id, t)} /> : null
                  })()
                ) : (
                  (() => {
                    const t = teams.find((x) => x.channels.some((ch) => ch.id === actItem.conversationId))
                    return t ? <ChannelPane team={t} channelId={actItem.conversationId} messages={byConv.get(actItem.conversationId) ?? []} onSend={(tx, p) => send(actItem.conversationId, tx, p)} /> : null
                  })()
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#616161] bg-white">
                  <Sparkle20Regular className="w-10 h-10 mb-3" style={{ color: PURPLE }} />
                  <div className="text-[15px] font-semibold text-[#242424]">You’re all caught up</div>
                  <div className="text-[13px]">Select an item to see the conversation</div>
                </div>
              )}
            </>
          )}

          {view === 'calendar' && <CalendarView />}
          {view === 'calls' && <CallsView />}
          {view === 'onedrive' && <OneDriveView />}
          {view === 'apps' && <AppsView />}
        </div>
      </div>
    </div>
  )
}
