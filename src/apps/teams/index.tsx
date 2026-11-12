import { Fragment, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  MoreHorizontal16Regular,
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
  Add20Regular,
  ArrowReply20Regular,
  Important16Filled,
  Pin16Regular,
  Mention16Regular,
  ArrowReply16Regular,
  PersonAdd20Regular,
  Sparkle20Regular,
  CallMissed16Regular,
  CheckmarkCircle16Filled,
  Note20Regular,
  Copy20Regular,
  Edit20Regular,
  Delete20Regular,
  Pin20Regular,
  AlertOff20Regular,
  Alert20Regular,
  MailUnread20Regular,
  MailRead20Regular,
  Dismiss20Regular,
  CalendarAdd20Regular,
  Link16Regular,
  Settings20Regular,
  QuestionCircle20Regular,
  ArrowSync20Regular,
  Dismiss16Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk, useWin } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { fmtTime } from '@/data/time'
import { Compose, FileCard, RichText, type SendExtra } from './Compose'
import { CallStage, type CallState } from './Call'
import { AppsView, CalendarView, CallsView, OneDriveView, SearchView, meetingFromEvent } from './Views'
import {
  Item,
  MyPresence,
  PRESENCE_COLOR,
  PRESENCE_LABEL,
  PURPLE,
  Panel,
  QUICK_REACTIONS,
  Sep,
  copyText,
  fmtDuration,
  presenceOf,
  toggleReaction,
  useMenu,
  useTeamsPrefs,
  type Attachment,
  type Presence,
} from './ui'

const FONT = 'var(--font-win)'

type View = 'activity' | 'chat' | 'teams' | 'calendar' | 'calls' | 'onedrive' | 'apps' | 'search'
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
  myReactions?: string[]
  important?: boolean
  attachments?: Attachment[]
  edited?: boolean
  deleted?: boolean
  system?: boolean
  sticker?: string
  caption?: string
}
interface ChatRec {
  id: string
  kind: 'oneOnOne' | 'group' | 'meeting'
  members: string[]
  title?: string
  pinned?: boolean
  unread?: boolean
  muted?: boolean
}
interface TeamRec {
  id: string
  name: string
  color: string
  initials: string
  description: string
  channels: { id: string; name: string; pinned?: boolean }[]
}

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

function HWHint() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#616161]">
      <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" /> via H-Worker
    </span>
  )
}

/* ───────────────────────────── message pieces ───────────────────────────── */

function MsgBody({ msg }: { msg: Msg }) {
  if (msg.deleted) return <span className="italic text-[#616161]">This message has been deleted.</span>
  return (
    <>
      {msg.sticker && (
        <div className="flex flex-col items-start">
          <span className="text-[64px] leading-none">{msg.sticker}</span>
          {msg.caption && <span className="text-[11.5px] text-[#616161] mt-1">{msg.caption}</span>}
        </div>
      )}
      {msg.text && <RichText text={msg.text} />}
      {!!msg.attachments?.length && (
        <div className="flex flex-wrap gap-2 mt-1.5">
          {msg.attachments.map((a, i) => <FileCard key={i} a={a} />)}
        </div>
      )}
      {msg.edited && <span className="text-[11px] text-[#8A8886] ml-1">Edited</span>}
    </>
  )
}

function ReactionRow({ msg, className = '' }: { msg: Msg; className?: string }) {
  if (!msg.reactions?.length || msg.deleted) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {msg.reactions.map((r) => {
        const mine = msg.myReactions?.includes(r.emoji)
        return (
          <button
            key={r.emoji}
            onClick={() => toggleReaction(msg.id, r.emoji)}
            title={mine ? 'Remove your reaction' : 'React'}
            className={`h-6 px-2 rounded-full border text-[12px] flex items-center gap-1 ${mine ? 'border-[#5B5FC7] bg-[#E8EBFA]' : 'border-[#E0E0E0] bg-[#FAFAFA] hover:border-[#BDBDBD]'}`}
          >
            {r.emoji} {r.count}
          </button>
        )
      })}
    </div>
  )
}

/** hover toolbar shared by chat messages and channel posts */
function MsgToolbar({ msg, mine, onReply, onEdit, className = '' }: { msg: Msg; mine: boolean; onReply?: () => void; onEdit?: () => void; className?: string }) {
  const more = useMenu()
  const { toast } = useDesk()
  if (msg.deleted || msg.system) return null
  return (
    <div ref={more.ref} className={`absolute z-20 items-center gap-0.5 bg-white rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.16)] px-1 h-9 ${more.open ? 'flex' : 'hidden group-hover:flex'} ${className}`}>
      {QUICK_REACTIONS.map((e) => (
        <button key={e} className="w-7 h-7 rounded hover:bg-[#F0F0F0] text-[16px] hover:scale-110 transition-transform" title={`React ${e}`} onClick={() => toggleReaction(msg.id, e)}>{e}</button>
      ))}
      <span className="w-px h-5 bg-[#E0E0E0] mx-0.5" />
      <button className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]" aria-label="More message options" onClick={more.toggle}><MoreHorizontal16Regular /></button>
      {more.open && (
        <Panel className="right-0 top-10 w-[200px]">
          {onReply && <Item icon={<ArrowReply20Regular />} label="Reply" onClick={() => { onReply(); more.close() }} />}
          <Item icon={<Copy20Regular />} label="Copy text" onClick={() => { copyText(msg.text); toast({ appId: 'teams', title: 'Copied', body: 'Message text copied to clipboard.' }); more.close() }} />
          {mine && onEdit && <Item icon={<Edit20Regular />} label="Edit" onClick={() => { onEdit(); more.close() }} />}
          {mine && <Item icon={<Delete20Regular />} label="Delete" danger onClick={() => { db.update('teams.messages', msg.id, { deleted: true }); more.close() }} />}
        </Panel>
      )}
    </div>
  )
}

function EditBox({ msg, onDone }: { msg: Msg; onDone: () => void }) {
  const [t, setT] = useState(msg.text)
  const save = () => {
    if (t.trim() && t.trim() !== msg.text) db.update('teams.messages', msg.id, { text: t.trim(), edited: true })
    onDone()
  }
  return (
    <div className="w-[480px] max-w-full">
      <textarea
        autoFocus
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            save()
          }
          if (e.key === 'Escape') onDone()
        }}
        aria-label="Edit message"
        className="w-full min-h-[60px] resize-none rounded-md border border-[#5B5FC7] p-2 text-[14px] outline-none bg-white"
      />
      <div className="flex justify-end gap-2 mt-1">
        <button className="h-7 px-3 rounded border border-[#D1D1D1] text-[12.5px] bg-white" onClick={onDone}>Cancel</button>
        <button className="h-7 px-3 rounded text-white text-[12.5px] font-semibold" style={{ background: PURPLE }} onClick={save}>Done</button>
      </div>
    </div>
  )
}

function NotesTab({ convId, title }: { convId: string; title: string }) {
  const rec = useRecord<{ id: string; text: string; updated?: string }>('teams.notes', `note-${convId}`)
  const [t, setT] = useState(rec?.text ?? '')
  useEffect(() => setT(rec?.text ?? ''), [convId])
  const save = (v: string) => db.upsert('teams.notes', { id: `note-${convId}`, text: v, updated: new Date().toISOString() })
  return (
    <div className="flex-1 overflow-auto p-6 bg-white">
      <div className="max-w-[760px] mx-auto">
        <div className="text-[20px] font-semibold mb-1">Notes</div>
        <div className="text-[12.5px] text-[#616161] mb-4">Shared with everyone in {title}{rec?.updated ? ` · Last edited ${listTime(rec.updated)}` : ''}</div>
        <textarea
          data-agent="teams-notes-editor"
          value={t}
          onChange={(e) => {
            setT(e.target.value)
            save(e.target.value)
          }}
          placeholder="Start taking notes… agendas, decisions and action items are saved automatically."
          aria-label="Notes"
          className="w-full min-h-[360px] resize-none outline-none rounded-md border border-[#E0E0E0] focus:border-[#5B5FC7] p-4 text-[14px] leading-relaxed"
        />
      </div>
    </div>
  )
}

function SharedTab({ messages }: { messages: Msg[] }) {
  const files = useCollection<any>('files')
  const shared = useMemo(() => {
    const out: { a: Attachment; m: Msg }[] = []
    for (const m of messages) {
      if (m.deleted) continue
      for (const a of m.attachments ?? []) out.push({ a, m })
      for (const f of files) if (m.text.includes(f.name) && !out.some((o) => o.a.name === f.name)) out.push({ a: { name: f.name, size: f.size, kind: f.kind, open: f.open }, m })
    }
    return out.reverse()
  }, [messages, files])
  const links = useMemo(() => messages.filter((m) => !m.deleted).flatMap((m) => (m.text.match(/https?:\/\/[^\s)]+/g) ?? []).map((u) => ({ u, m }))).reverse(), [messages])
  return (
    <div className="flex-1 overflow-auto p-6 bg-white">
      <div className="text-[15px] font-semibold mb-3">Files</div>
      {shared.length === 0 && <div className="text-[13px] text-[#616161] mb-6">No files have been shared yet. Use Attach in the compose box to share one.</div>}
      <div className="flex flex-wrap gap-2 mb-6">
        {shared.map(({ a, m }, i) => (
          <div key={i}>
            <FileCard a={a} />
            <div className="text-[11px] text-[#616161] mt-0.5 pl-1">Shared by {firstName(m.from)} · {listTime(m.date)}</div>
          </div>
        ))}
      </div>
      <div className="text-[15px] font-semibold mb-3">Links</div>
      {links.length === 0 && <div className="text-[13px] text-[#616161]">No links yet.</div>}
      {links.map(({ u, m }, i) => (
        <div key={i} className="flex items-center gap-2 h-9 text-[13px]">
          <Link16Regular className="text-[#616161]" />
          <span className="underline truncate" style={{ color: PURPLE }}>{u}</span>
          <span className="text-[12px] text-[#616161] shrink-0">{firstName(m.from)} · {listTime(m.date)}</span>
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────────── chat pane ───────────────────────────── */

function ChatPane({ chat, messages, onSend, onCall, onOpenChat }: { chat: ChatRec; messages: Msg[]; onSend: (t: string, extra?: SendExtra) => void; onCall?: (c: CallState) => void; onOpenChat?: (members: string[]) => void }) {
  const myP = useContext(MyPresence)
  const { toast } = useDesk()
  const scroller = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'chat' | 'shared' | 'notes'>('chat')
  const [prefill, setPrefill] = useState<{ text: string; n: number }>({ text: '', n: 0 })
  const [editing, setEditing] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const membersMenu = useMenu()
  const more = useMenu()
  const [addQ, setAddQ] = useState('')
  useEffect(() => {
    setTab('chat')
    setEditing(null)
    setRenaming(null)
  }, [chat.id])
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, chat.id, tab])
  const other = chat.kind === 'oneOnOne' ? chat.members.find((x) => x !== ME.id) : undefined
  const title = chatTitle(chat)
  const startCall = (video: boolean) => onCall?.({ kind: 'call', title, participants: chat.members.length > 1 ? chat.members : [ME.id], video, conversationId: chat.id })
  const addCandidates = PEOPLE.filter((p) => !chat.members.includes(p.id) && !p.external && p.name.toLowerCase().includes(addQ.toLowerCase())).slice(0, 6)
  const addPerson = (id: string) => {
    if (chat.kind === 'oneOnOne') onOpenChat?.([...chat.members.filter((x) => x !== ME.id), id])
    else {
      db.update('teams.chats', chat.id, { members: [...chat.members, id] })
      db.insert('teams.messages', { id: uid('tm'), conversationId: chat.id, from: ME.id, text: `${ME.name} added ${person(id).name} to the chat.`, date: new Date().toISOString(), system: true })
    }
    setAddQ('')
    membersMenu.close()
  }
  let lastDay = ''
  const tabs: [typeof tab, string][] = [['chat', 'Chat'], ['shared', 'Shared'], ['notes', chat.kind === 'meeting' ? 'Recap' : 'Notes']]
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#F5F5F5]">
      <div className="h-[60px] shrink-0 flex items-center px-5 gap-3 bg-white border-b border-[#E0E0E0]">
        {chat.kind === 'oneOnOne' ? (
          <Avatar id={other ?? ME.id} size={32} presence={presenceOf(other ?? ME.id, myP)} />
        ) : (
          <span className="w-8 h-8 rounded-full bg-[#E8EBFA] flex items-center justify-center" style={{ color: PURPLE }}>
            {chat.kind === 'meeting' ? <Calendar24Regular className="w-4 h-4" /> : <People20Regular className="w-4 h-4" />}
          </span>
        )}
        <div className="min-w-0">
          {renaming !== null ? (
            <input
              autoFocus
              value={renaming}
              onChange={(e) => setRenaming(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  db.update('teams.chats', chat.id, { title: renaming.trim() || undefined })
                  setRenaming(null)
                }
                if (e.key === 'Escape') setRenaming(null)
              }}
              onBlur={() => setRenaming(null)}
              aria-label="Chat name"
              className="h-8 px-2 rounded border border-[#5B5FC7] text-[14px] outline-none"
            />
          ) : (
            <div className="text-[15.5px] font-semibold truncate" data-agent="teams-conversation-title">{title}</div>
          )}
        </div>
        <div className="flex items-center gap-4 ml-4 text-[14px] h-full">
          {tabs.map(([id, t]) => (
            <button key={t} onClick={() => setTab(id)} className={`relative h-full flex items-center ${tab === id ? 'font-semibold' : 'text-[#424242] hover:text-[#242424]'}`}>
              {t}
              {tab === id && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t" style={{ background: PURPLE }} />}
            </button>
          ))}
          <Add20Regular className="w-4 h-4 text-[#616161]" />
        </div>
        <div className="flex-1" />
        {chat.muted && <AlertOff20Regular className="text-[#616161]" />}
        <div className="flex items-center rounded-md border border-[#D1D1D1] overflow-hidden">
          <button className="h-8 px-2.5 flex items-center gap-1.5 text-[13px] hover:bg-[#F5F5F5]" aria-label="Video call" onClick={() => startCall(true)}>
            <Video20Regular />
          </button>
          <span className="w-px h-5 bg-[#D1D1D1]" />
          <button className="h-8 px-2.5 flex items-center gap-1.5 text-[13px] hover:bg-[#F5F5F5]" aria-label="Audio call" onClick={() => startCall(false)}>
            <Call20Regular />
          </button>
        </div>
        <div className="relative" ref={membersMenu.ref}>
          {chat.kind !== 'oneOnOne' ? (
            <button className="h-8 px-2 flex items-center gap-1 rounded hover:bg-[#F0F0F0] text-[13px]" onClick={membersMenu.toggle}>
              <People20Regular /> {chat.members.length}
            </button>
          ) : (
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F0F0F0]" aria-label="Add people" title="Add people" onClick={membersMenu.toggle}>
              <PersonAdd20Regular />
            </button>
          )}
          {membersMenu.open && (
            <Panel className="right-0 top-10 w-[280px]">
              {chat.kind !== 'oneOnOne' && (
                <>
                  <div className="px-3 pt-1.5 pb-1 text-[12px] font-semibold text-[#616161]">People ({chat.members.length})</div>
                  <div className="max-h-[180px] overflow-auto">
                    {chat.members.map((m) => (
                      <div key={m} className="flex items-center gap-2 px-3 h-9">
                        <Avatar id={m} size={24} presence={presenceOf(m, myP)} />
                        <span className="text-[13px] flex-1 truncate">{m === ME.id ? `${ME.name} (You)` : person(m).name}</span>
                      </div>
                    ))}
                  </div>
                  <Sep />
                </>
              )}
              <div className="px-3 pt-1 pb-1 text-[12px] font-semibold text-[#616161]">Add people</div>
              <div className="px-3 pb-1">
                <input autoFocus value={addQ} onChange={(e) => setAddQ(e.target.value)} placeholder="Enter a name" aria-label="Enter a name" className="w-full h-8 px-2 rounded border border-[#D1D1D1] text-[13px] outline-none focus:border-[#5B5FC7]" />
              </div>
              {addCandidates.map((p) => (
                <button key={p.id} className="w-full flex items-center gap-2 px-3 h-9 hover:bg-[#F5F5F5] text-left" onClick={() => addPerson(p.id)}>
                  <Avatar id={p.id} size={24} />
                  <span className="text-[13px]">{p.name}</span>
                </button>
              ))}
            </Panel>
          )}
        </div>
        <div className="relative" ref={more.ref}>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F0F0F0]" aria-label="More options" onClick={more.toggle}>
            <MoreHorizontal20Regular />
          </button>
          {more.open && (
            <Panel className="right-0 top-10 w-[220px]">
              <Item icon={<Pin20Regular />} label={chat.pinned ? 'Unpin' : 'Pin'} onClick={() => { db.update('teams.chats', chat.id, { pinned: !chat.pinned }); more.close() }} />
              <Item icon={<MailUnread20Regular />} label="Mark as unread" onClick={() => { db.update('teams.chats', chat.id, { unread: true }); more.close() }} />
              <Item icon={chat.muted ? <Alert20Regular /> : <AlertOff20Regular />} label={chat.muted ? 'Unmute' : 'Mute'} onClick={() => { db.update('teams.chats', chat.id, { muted: !chat.muted }); more.close() }} />
              {chat.kind === 'group' && <Item icon={<Edit20Regular />} label="Rename" onClick={() => { setRenaming(chat.title ?? ''); more.close() }} />}
              <Sep />
              <Item icon={<Link16Regular />} label="Copy link" onClick={() => { copyText(`https://teams.microsoft.com/l/chat/${chat.id}`); toast({ appId: 'teams', title: 'Link copied', body: title }); more.close() }} />
            </Panel>
          )}
        </div>
      </div>
      {tab === 'shared' && <SharedTab messages={messages} />}
      {tab === 'notes' &&
        (chat.kind === 'meeting' ? (
          <div className="flex-1 overflow-auto p-6 bg-white">
            <div className="text-[20px] font-semibold">{title}</div>
            <div className="text-[13px] text-[#616161] mt-1">{chat.members.length} participants · {messages.length} messages in the meeting chat</div>
            <div className="mt-5 grid grid-cols-2 gap-4 max-w-[760px]">
              <div className="rounded-lg border border-[#E0E0E0] p-4">
                <div className="text-[13px] font-semibold mb-2">Attendees</div>
                {chat.members.map((m) => (
                  <div key={m} className="flex items-center gap-2 h-8">
                    <Avatar id={m} size={22} />
                    <span className="text-[13px]">{person(m).name}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-[#E0E0E0] p-4">
                <div className="text-[13px] font-semibold mb-2">Highlights from chat</div>
                {messages.filter((m) => !m.system && !m.deleted).slice(-4).map((m) => (
                  <div key={m.id} className="text-[12.5px] mb-1.5"><span className="font-semibold">{firstName(m.from)}:</span> {m.text.slice(0, 120)}</div>
                ))}
                {!messages.length && <div className="text-[12.5px] text-[#616161]">No messages yet.</div>}
              </div>
            </div>
            <div className="mt-6 max-w-[760px]">
              <NotesTab convId={chat.id} title={title} />
            </div>
          </div>
        ) : (
          <NotesTab convId={chat.id} title={title} />
        ))}
      {tab === 'chat' && (
        <>
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
              const grouped = !showDay && prev && prev.from === msg.from && !prev.system && +new Date(msg.date) - +new Date(prev.date) < 5 * 60000
              const mine = msg.from === ME.id
              const fresh = msg.createdBy === 'hworker' && Date.now() - +new Date(msg.date) < 60000
              const reply = () => setPrefill((p) => ({ text: `> ${person(msg.from).name}: ${msg.text.split('\n')[0].slice(0, 120)}\n`, n: p.n + 1 }))
              return (
                <Fragment key={msg.id}>
                  {showDay && (
                    <div className="flex items-center gap-3 my-4 text-[12px] text-[#616161]">
                      <span className="flex-1 h-px bg-[#E0E0E0]" />
                      {dayLabel(msg.date)}
                      <span className="flex-1 h-px bg-[#E0E0E0]" />
                    </div>
                  )}
                  {msg.system ? (
                    <div className="flex items-center justify-center gap-2 my-3 text-[12.5px] text-[#616161]" data-agent={`teams-message-${msg.id}`}>
                      <Call20Regular className="w-4 h-4" /> {msg.text} · {fmtTime(msg.date)}
                    </div>
                  ) : mine ? (
                    <div className={`group relative flex flex-col items-end ${grouped ? 'mt-0.5' : 'mt-3'}`} data-agent={`teams-message-${msg.id}`}>
                      {!grouped && <div className="text-[12px] text-[#616161] mb-1">{fmtTime(msg.date)}</div>}
                      {editing === msg.id ? (
                        <EditBox msg={msg} onDone={() => setEditing(null)} />
                      ) : (
                        <div className={`relative max-w-[640px] rounded-md px-3 py-2 text-[14px] text-[#242424] ${fresh ? 'flash-new' : ''}`} style={{ background: '#E8EBFA' }}>
                          <MsgBody msg={msg} />
                          <MsgToolbar msg={msg} mine onReply={reply} onEdit={() => setEditing(msg.id)} className="-top-5 right-0" />
                        </div>
                      )}
                      <ReactionRow msg={msg} className="mt-1 justify-end" />
                      {msg.createdBy === 'hworker' && <div className="mt-0.5"><HWHint /></div>}
                    </div>
                  ) : (
                    <div className={`flex gap-2.5 ${grouped ? 'mt-0.5' : 'mt-3'}`} data-agent={`teams-message-${msg.id}`}>
                      <div className="w-8 shrink-0">{!grouped && <Avatar id={msg.from} size={32} />}</div>
                      <div className="min-w-0 group relative">
                        {!grouped && (
                          <div className="text-[12px] text-[#616161] mb-1">
                            {chat.kind !== 'oneOnOne' && <span className="font-semibold text-[#424242] mr-2">{person(msg.from).name}</span>}
                            {fmtTime(msg.date)}
                          </div>
                        )}
                        <div className="relative inline-block max-w-[640px] rounded-md px-3 py-2 text-[14px] text-[#242424] bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]">
                          <MsgBody msg={msg} />
                          <MsgToolbar msg={msg} mine={false} onReply={reply} className="-top-5 left-2" />
                        </div>
                        <ReactionRow msg={msg} className="mt-1" />
                      </div>
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
          <Compose placeholder="Type a message" onSend={onSend} prefill={prefill} />
        </>
      )}
    </div>
  )
}

function ChatRowMenu({ c }: { c: ChatRec }) {
  const m = useMenu()
  return (
    <div ref={m.ref} className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${m.open ? 'block' : 'hidden group-hover:block'}`}>
      <button className="w-7 h-7 rounded hover:bg-[#E0E0E0] flex items-center justify-center bg-inherit" aria-label={`More options for ${chatTitle(c)}`} onClick={m.toggle}><MoreHorizontal16Regular /></button>
      {m.open && (
        <Panel className="right-0 top-8 w-[200px]">
          <Item icon={<Pin20Regular />} label={c.pinned ? 'Unpin' : 'Pin'} onClick={() => { db.update('teams.chats', c.id, { pinned: !c.pinned }); m.close() }} />
          <Item icon={c.unread ? <MailRead20Regular /> : <MailUnread20Regular />} label={c.unread ? 'Mark as read' : 'Mark as unread'} onClick={() => { db.update('teams.chats', c.id, { unread: !c.unread }); m.close() }} />
          <Item icon={c.muted ? <Alert20Regular /> : <AlertOff20Regular />} label={c.muted ? 'Unmute' : 'Mute'} onClick={() => { db.update('teams.chats', c.id, { muted: !c.muted }); m.close() }} />
        </Panel>
      )}
    </div>
  )
}

/* ───────────────────────────── new chat ───────────────────────────── */

function NewChatPane({ members, onChange, onSend, onClose }: { members: string[]; onChange: (m: string[]) => void; onSend: (t: string, extra?: SendExtra) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const cands = q.trim() ? PEOPLE.filter((p) => p.id !== ME.id && !p.external && !members.includes(p.id) && (p.name + ' ' + p.email).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#F5F5F5]">
      <div className="shrink-0 bg-white border-b border-[#E0E0E0] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[15.5px] font-semibold flex-1">New chat</span>
          <button aria-label="Close new chat" className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={onClose}><Dismiss20Regular /></button>
        </div>
        <div className="relative mt-2 flex flex-wrap items-center gap-1.5 min-h-[36px] px-2 rounded-md border border-[#D1D1D1] focus-within:border-[#5B5FC7] bg-white">
          <span className="text-[13px] text-[#616161] mr-1">To:</span>
          {members.map((m) => (
            <span key={m} className="inline-flex items-center gap-1 h-7 pl-0.5 pr-1.5 rounded-full bg-[#E8EBFA] text-[13px]">
              <Avatar id={m} size={22} /> {person(m).name}
              <button aria-label={`Remove ${person(m).name}`} className="w-4 h-4 flex items-center justify-center" onClick={() => onChange(members.filter((x) => x !== m))}><Dismiss16Regular className="w-3 h-3" /></button>
            </span>
          ))}
          <input
            autoFocus
            data-agent="teams-newchat-to"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && cands[0]) {
                onChange([...members, cands[0].id])
                setQ('')
              }
              if (e.key === 'Backspace' && !q && members.length) onChange(members.slice(0, -1))
            }}
            placeholder={members.length ? '' : 'Enter name, email or group'}
            aria-label="Enter name, email or group"
            className="flex-1 min-w-[160px] h-8 outline-none text-[13.5px]"
          />
          {cands.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-30 w-[320px] bg-white rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] py-1">
              {cands.map((p) => (
                <button key={p.id} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F5F5F5] text-left" onClick={() => { onChange([...members, p.id]); setQ('') }}>
                  <Avatar id={p.id} size={28} />
                  <div className="min-w-0">
                    <div className="text-[13px] truncate">{p.name}</div>
                    <div className="text-[11.5px] text-[#616161] truncate">{p.title}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-[#616161] text-center px-8">
        {members.length ? (
          <>
            <div className="flex -space-x-2">{members.slice(0, 4).map((m) => <span key={m} className="ring-2 ring-[#F5F5F5] rounded-full"><Avatar id={m} size={56} /></span>)}</div>
            <div className="mt-3 text-[15px] font-semibold text-[#242424]">{members.map((m) => person(m).first).join(', ')}</div>
            <div className="text-[13px]">You’re starting a new conversation</div>
          </>
        ) : (
          <div className="text-[13px]">Add people to start a chat</div>
        )}
      </div>
      {members.length > 0 && <Compose placeholder="Type a message" onSend={onSend} />}
    </div>
  )
}

/* ───────────────────────────── channel pane ───────────────────────────── */

function ChannelPane({ team, channelId, messages, onSend, onCall }: { team: TeamRec; channelId: string; messages: Msg[]; onSend: (t: string, parentId?: string, extra?: SendExtra) => void; onCall?: (c: CallState) => void }) {
  const ch = team.channels.find((c) => c.id === channelId)!
  const { open, toast } = useDesk()
  const [prefs, setPrefs] = useTeamsPrefs()
  const scroller = useRef<HTMLDivElement>(null)
  const posts = messages.filter((m) => !m.parentId)
  const replies = (id: string) => messages.filter((m) => m.parentId === id)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [tab, setTab] = useState<'posts' | 'files' | 'notes'>('posts')
  const [info, setInfo] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const meet = useMenu()
  const more = useMenu()
  const muted = (prefs.mutedChannels ?? []).includes(channelId)
  useEffect(() => {
    setTab('posts')
    setEditing(null)
  }, [channelId])
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, channelId, tab])
  const members = useMemo(() => Array.from(new Set([ME.id, ...messages.map((m) => m.from)])), [messages])
  const meetNow = () => onCall?.({ kind: 'meeting', title: `Meeting in ${ch.name}`, participants: [ME.id], video: true, conversationId: channelId })
  const togglePin = () => db.update('teams.teams', team.id, { channels: team.channels.map((c) => (c.id === channelId ? { ...c, pinned: !c.pinned } : c)) })
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
          {([['posts', 'Posts'], ['files', 'Files'], ['notes', 'Notes']] as const).map(([id, t]) => (
            <button key={t} onClick={() => setTab(id)} className={`relative h-full flex items-center ${tab === id ? 'font-semibold' : 'text-[#424242] hover:text-[#242424]'}`}>
              {t}
              {tab === id && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t" style={{ background: PURPLE }} />}
            </button>
          ))}
          <Add20Regular className="w-4 h-4 text-[#616161]" />
        </div>
        <div className="flex-1" />
        {muted && <AlertOff20Regular className="text-[#616161]" />}
        <div className="relative flex items-center rounded-md border border-[#D1D1D1]" ref={meet.ref}>
          <button className="h-8 pl-3 pr-1.5 flex items-center gap-1.5 rounded-l-md text-[13px] font-semibold hover:bg-[#F5F5F5]" onClick={meetNow}>
            <Video20Regular /> Meet
          </button>
          <button className="h-8 px-1 rounded-r-md hover:bg-[#F5F5F5]" aria-label="Meeting options" onClick={meet.toggle}><ChevronDown16Regular /></button>
          {meet.open && (
            <Panel className="right-0 top-10 w-[220px]">
              <Item icon={<Video20Regular />} label="Meet now" onClick={() => { meetNow(); meet.close() }} />
              <Item icon={<CalendarAdd20Regular />} label="Schedule a meeting" onClick={() => { open('outlook', { view: 'calendar', newEvent: { title: `${ch.name} sync`, teams: true } }); meet.close() }} />
            </Panel>
          )}
        </div>
        <button className={`w-8 h-8 flex items-center justify-center rounded hover:bg-[#F0F0F0] ${info ? 'bg-[#F0F0F0]' : ''}`} aria-label="Channel info" onClick={() => setInfo((v) => !v)}>
          <Info20Regular />
        </button>
        <div className="relative" ref={more.ref}>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F0F0F0]" aria-label="More options" onClick={more.toggle}>
            <MoreHorizontal20Regular />
          </button>
          {more.open && (
            <Panel className="right-0 top-10 w-[230px]">
              <Item icon={<Pin20Regular />} label={ch.pinned ? 'Unpin' : 'Pin'} onClick={() => { togglePin(); more.close() }} />
              <Item icon={muted ? <Alert20Regular /> : <AlertOff20Regular />} label={muted ? 'Turn on notifications' : 'Mute channel'} onClick={() => { setPrefs({ mutedChannels: muted ? (prefs.mutedChannels ?? []).filter((x) => x !== channelId) : [...(prefs.mutedChannels ?? []), channelId] }); more.close() }} />
              <Item icon={<Link16Regular />} label="Copy link to channel" onClick={() => { copyText(`https://teams.microsoft.com/l/channel/${channelId}`); toast({ appId: 'teams', title: 'Link copied', body: `${ch.name} · ${team.name}` }); more.close() }} />
              <Item icon={<Info20Regular />} label="Manage channel" onClick={() => { setInfo(true); more.close() }} />
            </Panel>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          {tab === 'files' && <SharedTab messages={messages} />}
          {tab === 'notes' && <NotesTab convId={channelId} title={`${ch.name} (${team.name})`} />}
          {tab === 'posts' && (
            <>
              <div ref={scroller} className="flex-1 overflow-auto px-6 py-4 space-y-4" data-agent="teams-posts">
                <div className="text-center text-[12.5px] text-[#616161] py-2">
                  Welcome to {ch.name}! {team.description}
                </div>
                {posts.map((p) => {
                  const rs = replies(p.id)
                  const fresh = p.createdBy === 'hworker' && Date.now() - +new Date(p.date) < 60000
                  return (
                    <div key={p.id} className={`group relative bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] max-w-[860px] ${fresh ? 'flash-new' : ''}`} data-agent={`teams-post-${p.id}`}>
                      {p.important && <div className="h-1 rounded-t-lg bg-[#C4314B]" />}
                      <MsgToolbar msg={p} mine={p.from === ME.id} onReply={() => setReplyTo(p.id)} onEdit={() => setEditing(p.id)} className="-top-4 right-4" />
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
                          <div className="text-[14px] text-[#242424] mt-1">{editing === p.id ? <EditBox msg={p} onDone={() => setEditing(null)} /> : <MsgBody msg={p} />}</div>
                          <ReactionRow msg={p} className="mt-2" />
                        </div>
                      </div>
                      {rs.length > 0 && (
                        <div className="border-t border-[#F0F0F0] px-4 py-2 space-y-2 bg-[#FAFAFA]">
                          <div className="text-[12px] font-semibold" style={{ color: PURPLE }}>
                            {rs.length} {rs.length === 1 ? 'reply' : 'replies'} from {Array.from(new Set(rs.map((r) => firstName(r.from)))).join(', ')}
                          </div>
                          {rs.map((r) => (
                            <div key={r.id} className="group/r relative flex gap-2.5">
                              <Avatar id={r.from} size={24} />
                              <div className="min-w-0">
                                <div className="text-[12px] text-[#616161]">
                                  <span className="font-semibold text-[#242424] mr-1.5">{person(r.from).name}</span>
                                  {fmtTime(r.date)} {r.createdBy === 'hworker' && <HWHint />}
                                </div>
                                <div className="text-[13.5px]">
                                  <MsgBody msg={r} />
                                </div>
                                <ReactionRow msg={r} className="mt-1" />
                              </div>
                              {!r.deleted && (
                                <span className="hidden group-hover/r:flex absolute right-0 top-0 gap-0.5">
                                  {QUICK_REACTIONS.slice(0, 3).map((e) => (
                                    <button key={e} className="w-6 h-6 rounded hover:bg-[#EBEBEB] text-[13px]" onClick={() => toggleReaction(r.id, e)}>{e}</button>
                                  ))}
                                  {r.from === ME.id && <button className="w-6 h-6 rounded hover:bg-[#EBEBEB] flex items-center justify-center text-[#616161]" aria-label="Delete reply" onClick={() => db.update('teams.messages', r.id, { deleted: true })}><Delete20Regular className="w-3.5 h-3.5" /></button>}
                                </span>
                              )}
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
              <Compose placeholder={`Post in ${ch.name}`} onSend={(t, extra) => onSend(t, undefined, extra)} allowSubject />
            </>
          )}
        </div>
        {info && (
          <div className="w-[300px] shrink-0 bg-white border-l border-[#E0E0E0] overflow-auto" data-agent="teams-channel-info">
            <div className="flex items-center h-12 px-4 border-b border-[#F0F0F0]">
              <span className="text-[14px] font-semibold flex-1">Channel info</span>
              <button aria-label="Close channel info" className="w-7 h-7 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={() => setInfo(false)}><Dismiss20Regular className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-5">
              <div>
                <div className="text-[12px] font-semibold text-[#616161] mb-1">About</div>
                <div className="text-[13px]">{team.description}</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[#616161] mb-1">Channel</div>
                <div className="text-[13px]">{ch.name} · {team.name}</div>
                <div className="text-[12px] text-[#616161]">{posts.length} posts · {messages.length - posts.length} replies</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[#616161] mb-1">Members ({members.length})</div>
                {members.map((m) => (
                  <div key={m} className="flex items-center gap-2 h-8">
                    <Avatar id={m} size={24} />
                    <span className="text-[13px] truncate">{m === ME.id ? `${ME.name} (You)` : person(m).name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────────── dialogs ───────────────────────────── */

function CreateDialog({ teams, initialTeam, onClose, onCreated }: { teams: TeamRec[]; initialTeam?: string; onClose: () => void; onCreated: (channelId: string) => void }) {
  const [mode, setMode] = useState<'channel' | 'team'>(initialTeam ? 'channel' : 'team')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [teamId, setTeamId] = useState(initialTeam ?? teams[0]?.id ?? '')
  const COLORS = ['#107C10', '#8764B8', '#CA5010', '#4F6BED', '#D13438', '#0F6CBD', '#038387']
  const create = () => {
    const n = name.trim()
    if (!n) return
    if (mode === 'team') {
      const chId = uid('ch')
      db.insert('teams.teams', {
        id: uid('t'),
        name: n,
        color: COLORS[n.length % COLORS.length],
        initials: n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
        description: desc.trim() || `Team for ${n}.`,
        channels: [{ id: chId, name: 'General' }],
      })
      onCreated(chId)
    } else {
      const t = teams.find((x) => x.id === teamId)
      if (!t) return
      const chId = uid('ch')
      db.update('teams.teams', t.id, { channels: [...t.channels, { id: chId, name: n }] })
      if (desc.trim()) db.insert('teams.messages', { id: uid('tm'), conversationId: chId, from: ME.id, text: desc.trim(), subject: `Welcome to ${n}`, date: new Date().toISOString() })
      onCreated(chId)
    }
    onClose()
  }
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-start justify-center pt-20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[480px] bg-white rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.28)] p-6" data-agent="teams-create-dialog">
        <div className="flex items-center mb-4">
          <div className="text-[18px] font-semibold flex-1">{mode === 'team' ? 'Create a team' : 'Create a channel'}</div>
          <button aria-label="Close" className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={onClose}><Dismiss20Regular /></button>
        </div>
        <div className="flex gap-1 mb-4">
          {(['team', 'channel'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`h-7 px-3 rounded-full text-[12.5px] border ${mode === m ? 'border-[#5B5FC7] text-[#5B5FC7] bg-[#E8EBFA]' : 'border-[#E0E0E0] hover:bg-[#F5F5F5]'}`}>{m === 'team' ? 'New team' : 'New channel'}</button>
          ))}
        </div>
        {mode === 'channel' && (
          <label className="block text-[13px] mb-3">
            <span className="text-[12px] font-semibold text-[#616161]">Team</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="mt-1 w-full h-9 px-2 rounded border border-[#D1D1D1] bg-white">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <label className="block text-[13px] mb-3">
          <span className="text-[12px] font-semibold text-[#616161]">{mode === 'team' ? 'Team name' : 'Channel name'}</span>
          <input autoFocus data-agent="teams-create-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} className="mt-1 w-full h-9 px-2 rounded border border-[#D1D1D1] outline-none focus:border-[#5B5FC7]" />
        </label>
        <label className="block text-[13px] mb-5">
          <span className="text-[12px] font-semibold text-[#616161]">Description (optional)</span>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 w-full h-20 resize-none p-2 rounded border border-[#D1D1D1] outline-none focus:border-[#5B5FC7]" />
        </label>
        <div className="flex justify-end gap-2">
          <button className="h-8 px-4 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]" onClick={onClose}>Cancel</button>
          <button data-agent="teams-create-submit" disabled={!name.trim()} className="h-8 px-4 rounded text-white text-[13px] font-semibold disabled:opacity-50" style={{ background: PURPLE }} onClick={create}>Create</button>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────── app ───────────────────────────── */

export default function Teams({ win, params }: AppProps) {
  const { isAgent, open, toast } = useDesk()
  const { setTitle } = useWin()
  const chats = useCollection<ChatRec>('teams.chats')
  const teams = useCollection<TeamRec>('teams.teams')
  const messages = useCollection<Msg>('teams.messages')
  const activity = useCollection<any>('teams.activity')
  const [prefs, setPrefs] = useTeamsPrefs()
  const myP: Presence = prefs.presence ?? 'available'
  const [view, setView] = useState<View>('chat')
  const [chatId, setChatId] = useState('chat-priya')
  const [channelId, setChannelId] = useState('operations-team')
  const [actSel, setActSel] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [sec, setSec] = useState<Record<string, boolean>>({})
  const [call, setCall] = useState<CallState | null>(null)
  const [newChat, setNewChat] = useState<string[] | null>(null)
  const [chatFilter, setChatFilter] = useState<string | null>(null)
  const [chatQuery, setChatQuery] = useState<string | null>(null)
  const [teamQuery, setTeamQuery] = useState<string | null>(null)
  const [actFilter, setActFilter] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [creating, setCreating] = useState<{ team?: string } | null>(null)
  const [shortcuts, setShortcuts] = useState(false)
  const [statusDraft, setStatusDraft] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const settingsMenu = useMenu()
  const profileMenu = useMenu()
  const chatMore = useMenu()
  const actMenu = useMenu()

  /* back / forward history */
  const hist = useRef<{ stack: { view: View; chatId: string; channelId: string }[]; i: number }>({ stack: [], i: -1 })
  const skipHist = useRef(false)
  const [, setHistTick] = useState(0)
  useEffect(() => {
    if (skipHist.current) {
      skipHist.current = false
      return
    }
    const h = hist.current
    const cur = { view, chatId, channelId }
    const last = h.stack[h.i]
    if (last && last.view === cur.view && last.chatId === cur.chatId && last.channelId === cur.channelId) return
    h.stack = [...h.stack.slice(0, h.i + 1), cur].slice(-50)
    h.i = h.stack.length - 1
    setHistTick((t) => t + 1)
  }, [view, chatId, channelId])
  const goHist = (dir: number) => {
    const h = hist.current
    const n = h.i + dir
    if (n < 0 || n >= h.stack.length) return
    h.i = n
    const e = h.stack[n]
    skipHist.current = true
    setView(e.view)
    setChatId(e.chatId)
    setChannelId(e.channelId)
    setNewChat(null)
    setHistTick((t) => t + 1)
  }

  const ensureChat = (pid: string) => {
    const id = `chat-${pid}`
    if (!db.find('teams.chats', id) && PEOPLE.some((p) => p.id === pid)) db.insert('teams.chats', { id, kind: 'oneOnOne', members: pid === ME.id ? [ME.id] : [ME.id, pid] })
    return id
  }

  useEffect(() => {
    const p = params ?? {}
    if (p.chatId) {
      const id = db.find('teams.chats', p.chatId) ? p.chatId : String(p.chatId).startsWith('chat-') ? p.chatId : ensureChat(p.chatId)
      setChatId(id)
      setView('chat')
      setNewChat(null)
    } else if (p.channelId) {
      setChannelId(p.channelId)
      setView('teams')
    } else if (p.view) setView(p.view)
    if (p.meetingId) {
      const ev = db.find<any>('outlook.events', p.meetingId)
      if (ev) setCall(meetingFromEvent(ev))
    } else if (p.meetNow) setCall({ kind: 'meeting', title: `Meeting with ${ME.name}`, participants: [ME.id], video: true })
    else if (p.call && PEOPLE.some((x) => x.id === p.call)) setCall({ kind: 'call', title: person(p.call).name, participants: [ME.id, p.call], video: !!p.video, conversationId: ensureChat(p.call) })
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

  const send = (conversationId: string, text: string, parentId?: string, extra?: SendExtra) => {
    db.insert('teams.messages', {
      id: uid('tm'),
      conversationId,
      from: ME.id,
      text,
      date: new Date().toISOString(),
      ...(parentId ? { parentId } : {}),
      ...(isAgent ? { createdBy: 'hworker' } : {}),
      ...(extra?.subject ? { subject: extra.subject } : {}),
      ...(extra?.important ? { important: true } : {}),
      ...(extra?.attachments?.length ? { attachments: extra.attachments } : {}),
      ...(extra?.sticker ? { sticker: extra.sticker, caption: extra.caption } : {}),
    })
  }

  const openChat = (id: string) => {
    setChatId(id)
    setView('chat')
    setNewChat(null)
    if (db.find<ChatRec>('teams.chats', id)?.unread) db.update('teams.chats', id, { unread: false })
  }
  const openChannel = (id: string) => {
    setChannelId(id)
    setView('teams')
  }
  const openConv = (convId: string) => (convId.startsWith('chat-') ? openChat(convId) : openChannel(convId))
  const chatWith = (members: string[]): string => {
    const others = members.filter((m) => m !== ME.id)
    let id: string
    if (others.length === 1) id = ensureChat(others[0])
    else {
      const set = [ME.id, ...others].sort().join(',')
      const ex = db.get<ChatRec>('teams.chats').find((c) => c.kind === 'group' && [...c.members].sort().join(',') === set)
      if (ex) id = ex.id
      else {
        id = `chat-g-${uid('c')}`
        db.insert('teams.chats', { id, kind: 'group', members: [ME.id, ...others] })
      }
    }
    openChat(id)
    return id
  }

  const endCall = (secs: number, joined: boolean) => {
    const c = call
    setCall(null)
    if (!c || !joined) return
    if (c.conversationId) db.insert('teams.messages', { id: uid('tm'), conversationId: c.conversationId, from: ME.id, text: `${c.kind === 'meeting' ? 'Meeting' : 'Call'} ended · ${fmtDuration(secs)}`, date: new Date().toISOString(), system: true })
    const other = c.participants.find((p) => p !== ME.id)
    if (c.kind === 'call' && other) db.insert('teams.calls', { id: uid('call'), with: other, direction: 'Outgoing', seconds: secs, date: new Date().toISOString() })
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
    const on = view === 'chat' && chatId === c.id && !newChat
    return (
      <div key={c.id} className="group relative">
        <button
          data-agent={agentId}
          aria-label={chatTitle(c)}
          onClick={() => openChat(c.id)}
          className={`w-full flex items-center gap-2.5 px-2.5 h-[52px] rounded-md text-left ${on ? 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]' : 'hover:bg-[#EBEBEB]'}`}
        >
          {other ? (
            <Avatar id={other} size={32} presence={presenceOf(other, myP)} />
          ) : (
            <span className="w-8 h-8 shrink-0 rounded-full bg-[#E8EBFA] flex items-center justify-center" style={{ color: PURPLE }}>
              {c.kind === 'meeting' ? <Calendar24Regular className="w-4 h-4" /> : <People20Regular className="w-4 h-4" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`flex-1 truncate text-[14px] ${c.unread ? 'font-semibold' : ''}`}>{chatTitle(c)}</span>
              {c.muted && <AlertOff20Regular className="w-3.5 h-3.5 text-[#9E9E9E] shrink-0" />}
              <span className="text-[11.5px] text-[#616161] shrink-0">{listTime(last?.date)}</span>
            </div>
            <div className={`truncate text-[12.5px] ${c.unread ? 'text-[#242424] font-semibold' : 'text-[#616161]'}`}>
              {last ? `${last.from === ME.id ? 'You: ' : c.kind !== 'oneOnOne' ? `${person(last.from).first}: ` : ''}${last.deleted ? 'This message has been deleted.' : last.sticker && !last.text ? `${last.sticker} ${last.caption ?? 'Sticker'}` : last.text.replace(/\n/g, ' ') || (last.attachments?.length ? `📎 ${last.attachments[0].name}` : '')}` : 'No messages yet'}
            </div>
          </div>
        </button>
        <ChatRowMenu c={c} />
      </div>
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

  const filteredChats = sortedChats.filter((c) => {
    if (chatQuery && !chatTitle(c).toLowerCase().includes(chatQuery.toLowerCase())) return false
    if (chatFilter === 'Unread') return !!c.unread
    if (chatFilter === 'Chats') return c.kind !== 'meeting'
    if (chatFilter === 'Meetings') return c.kind === 'meeting'
    return true
  })

  const actItem = activity.find((x) => x.id === actSel)
  const actList = [...activity]
    .filter((a) => {
      if (actFilter === 'Unread') return !a.read
      if (actFilter === '@Mentions') return a.kind === 'mention'
      if (actFilter === 'Replies') return a.kind === 'reply'
      if (actFilter === 'Reactions') return a.kind === 'reaction'
      if (actFilter === 'Missed calls') return a.kind === 'missed'
      return true
    })
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))

  const markAllRead = () => {
    for (const c of chats) if (c.unread) db.update('teams.chats', c.id, { unread: false })
    for (const a of activity) if (!a.read) db.update('teams.activity', a.id, { read: true })
  }

  const pill = (label: string, on: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} className={`h-6 px-2.5 rounded-full border text-[12px] flex items-center ${on ? 'bg-[#E8EBFA] border-[#5B5FC7] text-[#5B5FC7] font-semibold' : 'bg-white border-[#E0E0E0] hover:bg-[#F5F5F5]'}`}>
      {label}
    </button>
  )

  return (
    <MyPresence.Provider value={myP}>
      <div
        className="relative flex-1 min-h-0 flex flex-col bg-[#EBEBEB] text-[#242424]"
        style={{ fontFamily: FONT }}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'e') {
            e.preventDefault()
            searchRef.current?.focus()
          }
        }}
      >
        {/* title bar */}
        <div data-drag-handle className="h-12 shrink-0 flex items-center" style={{ background: 'linear-gradient(90deg,#E9E8F5,#EBEBEB 40%)' }}>
          <div className="w-[68px] flex items-center justify-center">
            <img src={logoUrl('teams')} className="w-6 h-6" alt="Microsoft Teams" />
          </div>
          <div className="flex items-center gap-1 text-[#616161]" data-no-drag>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5 disabled:opacity-40" aria-label="Back" disabled={hist.current.i <= 0} onClick={() => goHist(-1)}>
              <ArrowLeft20Regular />
            </button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5 disabled:opacity-40" aria-label="Forward" disabled={hist.current.i >= hist.current.stack.length - 1} onClick={() => goHist(1)}>
              <ArrowRight20Regular />
            </button>
          </div>
          <div className="flex-1 flex justify-center px-6" data-no-drag>
            <div className="flex items-center gap-2 w-full max-w-[600px] h-8 rounded-md bg-white px-3 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
              <Search20Regular className="w-4 h-4 text-[#616161]" />
              <input
                ref={searchRef}
                data-agent="teams-search"
                aria-label="Search"
                placeholder="Search (Ctrl+Alt+E)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchText.trim()) {
                    setSearchQ(searchText.trim())
                    setView('search')
                  }
                  if (e.key === 'Escape') {
                    setSearchText('')
                    if (view === 'search') setView('chat')
                  }
                }}
                className="flex-1 outline-none text-[13px] bg-transparent placeholder:text-[#616161]"
              />
              {searchText && (
                <button aria-label="Clear search" className="text-[#616161]" onClick={() => { setSearchText(''); if (view === 'search') setView('chat') }}><Dismiss16Regular /></button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1" data-no-drag>
            <div className="relative" ref={settingsMenu.ref}>
              <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Settings and more" onClick={settingsMenu.toggle}>
                <MoreHorizontal20Regular />
              </button>
              {settingsMenu.open && (
                <Panel className="right-0 top-10 w-[240px]">
                  <Item icon={<MailRead20Regular />} label="Mark all as read" onClick={() => { markAllRead(); settingsMenu.close() }} />
                  <Item icon={<Settings20Regular />} label="Keyboard shortcuts" onClick={() => { setShortcuts(true); settingsMenu.close() }} />
                  <Item icon={<ArrowSync20Regular />} label="Check for updates" onClick={() => { toast({ appId: 'teams', title: 'You’re up to date', body: 'You have the latest version of Microsoft Teams.' }); settingsMenu.close() }} />
                  <Sep />
                  <Item icon={<QuestionCircle20Regular />} label="Help" onClick={() => { open('edge', { q: 'Microsoft Teams help' }); settingsMenu.close() }} />
                </Panel>
              )}
            </div>
            <div className="relative" ref={profileMenu.ref}>
              <button className="flex items-center gap-2 h-10 px-2 rounded hover:bg-black/5" aria-label="Your profile, status" onClick={() => { setStatusDraft(prefs.statusMessage ?? ''); profileMenu.toggle() }}>
                <span className="text-[12.5px] text-[#424242]">Northwind Global</span>
                <Avatar id={ME.id} size={30} presence={myP} />
              </button>
              {profileMenu.open && (
                <Panel className="right-0 top-11 w-[300px]">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar id={ME.id} size={48} presence={myP} />
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate">{ME.name}</div>
                      <div className="text-[12.5px] text-[#616161] truncate">{ME.email}</div>
                      {prefs.statusMessage && <div className="text-[12px] text-[#424242] truncate mt-0.5">💬 {prefs.statusMessage}</div>}
                    </div>
                  </div>
                  <Sep />
                  {(Object.keys(PRESENCE_LABEL) as Presence[]).map((p) => (
                    <Item key={p} agent={`teams-presence-${p}`} icon={<span className="w-2.5 h-2.5 rounded-full" style={{ background: PRESENCE_COLOR[p] }} />} label={PRESENCE_LABEL[p]} checked={myP === p} onClick={() => setPrefs({ presence: p })} />
                  ))}
                  <Sep />
                  <div className="px-3 py-1.5">
                    <input
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setPrefs({ statusMessage: statusDraft.trim() || undefined })
                          profileMenu.close()
                        }
                      }}
                      placeholder="Set status message"
                      aria-label="Set status message"
                      className="w-full h-8 px-2 rounded border border-[#D1D1D1] text-[13px] outline-none focus:border-[#5B5FC7]"
                    />
                    {prefs.statusMessage && (
                      <button className="mt-1 text-[12px] hover:underline" style={{ color: PURPLE }} onClick={() => { setPrefs({ statusMessage: undefined }); setStatusDraft('') }}>Clear status message</button>
                    )}
                  </div>
                </Panel>
              )}
            </div>
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
          <div className="relative flex-1 min-w-0 flex rounded-tl-lg overflow-hidden bg-[#F5F5F5] shadow-[0_0_2px_rgba(0,0,0,0.12)]">
            {view === 'chat' && (
              <>
                <div className="w-[320px] shrink-0 flex flex-col border-r border-[#E0E0E0] bg-[#F5F5F5]">
                  <div className="h-[60px] shrink-0 flex items-center px-4 gap-1">
                    <span className="text-[18px] font-semibold flex-1">Chat</span>
                    <div className="relative" ref={chatMore.ref}>
                      <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="More options" onClick={chatMore.toggle}>
                        <MoreHorizontal20Regular />
                      </button>
                      {chatMore.open && (
                        <Panel className="right-0 top-9 w-[220px]">
                          <Item icon={<MailRead20Regular />} label="Mark all as read" onClick={() => { for (const c of chats) if (c.unread) db.update('teams.chats', c.id, { unread: false }); chatMore.close() }} />
                          <Item icon={<ChevronRight16Regular />} label={sec.pinned && sec.recent ? 'Expand all sections' : 'Collapse all sections'} onClick={() => { setSec(sec.pinned && sec.recent ? {} : { pinned: true, recent: true }); chatMore.close() }} />
                        </Panel>
                      )}
                    </div>
                    <button className={`w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center ${chatQuery !== null ? 'text-[#5B5FC7]' : ''}`} aria-label="Filter" onClick={() => setChatQuery((q) => (q === null ? '' : null))}>
                      <Filter20Regular />
                    </button>
                    <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="Video" onClick={() => setCall({ kind: 'meeting', title: `Meeting with ${ME.name}`, participants: [ME.id], video: true })}>
                      <Video20Regular />
                    </button>
                    <button data-agent="teams-new-chat" className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="New chat" onClick={() => setNewChat([])}>
                      <Compose20Regular />
                    </button>
                  </div>
                  {chatQuery !== null && (
                    <div className="px-4 pb-2">
                      <input autoFocus value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setChatQuery(null)} placeholder="Filter by name" aria-label="Filter by name" className="w-full h-8 px-2 rounded-md border border-[#D1D1D1] bg-white text-[13px] outline-none focus:border-[#5B5FC7]" />
                    </div>
                  )}
                  <div className="flex gap-1.5 px-4 pb-2">
                    {['Unread', 'Chats', 'Channels', 'Meetings'].map((f) => pill(f, chatFilter === f, () => setChatFilter((x) => (x === f ? null : f))))}
                  </div>
                  <div className="flex-1 overflow-auto px-2 pb-3" data-agent="teams-chat-list">
                    {chatFilter === 'Channels' ? (
                      teams.flatMap((t) =>
                        t.channels
                          .filter((c) => !chatQuery || c.name.toLowerCase().includes(chatQuery.toLowerCase()))
                          .map((c) => {
                            const last = byConv.get(c.id)?.at(-1)
                            return (
                              <button key={c.id} onClick={() => openChannel(c.id)} className="w-full flex items-center gap-2.5 px-2.5 h-[52px] rounded-md text-left hover:bg-[#EBEBEB]">
                                <span className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: t.color }}>{t.initials}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="flex-1 truncate text-[14px]">{c.name}</span>
                                    <span className="text-[11.5px] text-[#616161] shrink-0">{listTime(last?.date)}</span>
                                  </div>
                                  <div className="truncate text-[12.5px] text-[#616161]">{t.name}</div>
                                </div>
                              </button>
                            )
                          }),
                      )
                    ) : (
                      <>
                        {section('pinned', 'Pinned', filteredChats.filter((c) => c.pinned).map(chatRow))}
                        {section('recent', 'Recent', filteredChats.filter((c) => !c.pinned).map(chatRow))}
                        {filteredChats.length === 0 && <div className="px-3 py-6 text-center text-[13px] text-[#616161]">No chats match this filter.</div>}
                      </>
                    )}
                  </div>
                </div>
                {newChat ? (
                  <NewChatPane
                    members={newChat}
                    onChange={setNewChat}
                    onClose={() => setNewChat(null)}
                    onSend={(t, extra) => send(chatWith(newChat), t, undefined, extra)}
                  />
                ) : chat ? (
                  <ChatPane chat={chat} messages={byConv.get(chat.id) ?? []} onSend={(t, extra) => send(chat.id, t, undefined, extra)} onCall={setCall} onOpenChat={chatWith} />
                ) : (
                  <div className="flex-1" />
                )}
              </>
            )}

            {view === 'teams' && (
              <>
                <div className="w-[320px] shrink-0 flex flex-col border-r border-[#E0E0E0] bg-[#F5F5F5]">
                  <div className="h-[60px] shrink-0 flex items-center px-4 gap-1">
                    <span className="text-[18px] font-semibold flex-1">Teams</span>
                    <button className={`w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center ${teamQuery !== null ? 'text-[#5B5FC7]' : ''}`} aria-label="Filter" onClick={() => setTeamQuery((q) => (q === null ? '' : null))}>
                      <Filter20Regular />
                    </button>
                    <button className="w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center" aria-label="Join or create a team" onClick={() => setCreating({})}>
                      <PersonAdd20Regular />
                    </button>
                  </div>
                  {teamQuery !== null && (
                    <div className="px-4 pb-2">
                      <input autoFocus value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setTeamQuery(null)} placeholder="Filter teams and channels" aria-label="Filter teams and channels" className="w-full h-8 px-2 rounded-md border border-[#D1D1D1] bg-white text-[13px] outline-none focus:border-[#5B5FC7]" />
                    </div>
                  )}
                  <div className="flex-1 overflow-auto px-2 pb-3" data-agent="teams-team-list">
                    {teams.map((t) => {
                      const q = (teamQuery ?? '').toLowerCase()
                      const teamHit = !q || t.name.toLowerCase().includes(q)
                      const chans = teamHit ? t.channels : t.channels.filter((c) => c.name.toLowerCase().includes(q))
                      if (!teamHit && !chans.length) return null
                      const isOpen = !collapsed.includes(t.id)
                      return (
                        <div key={t.id} className="mb-1 group/t relative">
                          <button onClick={() => setCollapsed((c) => (isOpen ? [...c, t.id] : c.filter((x) => x !== t.id)))} className="w-full flex items-center gap-2 h-10 px-2 rounded-md hover:bg-[#EBEBEB] text-left">
                            {isOpen ? <ChevronDown16Regular className="text-[#616161]" /> : <ChevronRight16Regular className="text-[#616161]" />}
                            <span className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: t.color }}>
                              {t.initials}
                            </span>
                            <span className="flex-1 truncate text-[14px] font-semibold">{t.name}</span>
                            <MoreHorizontal20Regular className="text-[#9E9E9E] group-hover/t:invisible" />
                          </button>
                          <button
                            className="hidden group-hover/t:flex absolute right-2 top-1.5 w-7 h-7 rounded hover:bg-[#E0E0E0] items-center justify-center text-[#424242]"
                            aria-label={`Add a channel to ${t.name}`}
                            title="Add channel"
                            onClick={() => setCreating({ team: t.id })}
                          >
                            <Add20Regular className="w-4 h-4" />
                          </button>
                          {isOpen &&
                            chans.map((c) => {
                              const on = channelId === c.id
                              const recent = (byConv.get(c.id) ?? []).some((m) => Date.now() - +new Date(m.date) < 4 * 3600000 && m.from !== ME.id)
                              const muted = (prefs.mutedChannels ?? []).includes(c.id)
                              return (
                                <button
                                  key={c.id}
                                  data-agent={`teams-channel-${c.id}`}
                                  aria-label={`${c.name} channel`}
                                  onClick={() => openChannel(c.id)}
                                  className={`w-full flex items-center gap-2 h-8 pl-[46px] pr-2 rounded-md text-left text-[13.5px] ${on ? 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]' : 'hover:bg-[#EBEBEB]'} ${recent && !on && !muted ? 'font-semibold' : ''}`}
                                >
                                  <span className="flex-1 truncate">{c.name}</span>
                                  {muted && <AlertOff20Regular className="w-3.5 h-3.5 text-[#9E9E9E]" />}
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
                  <ChannelPane team={team} channelId={channelId} messages={byConv.get(channelId) ?? []} onSend={(t, parentId, extra) => send(channelId, t, parentId, extra)} onCall={setCall} />
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
                    <div className="relative" ref={actMenu.ref}>
                      <button className={`w-8 h-8 rounded hover:bg-[#EBEBEB] flex items-center justify-center ${actFilter ? 'text-[#5B5FC7]' : ''}`} aria-label="Filter" onClick={actMenu.toggle}>
                        <Filter20Regular />
                      </button>
                      {actMenu.open && (
                        <Panel className="right-0 top-9 w-[220px]">
                          {['All', 'Unread', '@Mentions', 'Replies', 'Reactions', 'Missed calls'].map((f) => (
                            <Item key={f} label={f} checked={(actFilter ?? 'All') === f} onClick={() => { setActFilter(f === 'All' ? null : f); actMenu.close() }} />
                          ))}
                          <Sep />
                          <Item icon={<MailRead20Regular />} label="Mark all as read" onClick={() => { for (const a of activity) if (!a.read) db.update('teams.activity', a.id, { read: true }); actMenu.close() }} />
                        </Panel>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 px-4 pb-2">
                    {['Unread', '@Mentions', 'Replies', 'Reactions'].map((f) => pill(f, actFilter === f, () => setActFilter((x) => (x === f ? null : f))))}
                  </div>
                  <div className="flex-1 overflow-auto px-2 pb-3" data-agent="teams-activity-list">
                    {actList.length === 0 && <div className="px-3 py-6 text-center text-[13px] text-[#616161]">Nothing here.</div>}
                    {actList.map((a) => {
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
                      return c ? <ChatPane chat={c} messages={byConv.get(c.id) ?? []} onSend={(t, extra) => send(c.id, t, undefined, extra)} onCall={setCall} onOpenChat={chatWith} /> : null
                    })()
                  ) : (
                    (() => {
                      const t = teams.find((x) => x.channels.some((ch) => ch.id === actItem.conversationId))
                      return t ? <ChannelPane team={t} channelId={actItem.conversationId} messages={byConv.get(actItem.conversationId) ?? []} onSend={(tx, p, extra) => send(actItem.conversationId, tx, p, extra)} onCall={setCall} /> : null
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

            {view === 'calendar' && <CalendarView onCall={setCall} />}
            {view === 'calls' && <CallsView onCall={setCall} onChat={(pid) => openChat(ensureChat(pid))} />}
            {view === 'onedrive' && <OneDriveView />}
            {view === 'apps' && <AppsView />}
            {view === 'search' && <SearchView query={searchQ} onOpenConv={openConv} onChat={(pid) => openChat(ensureChat(pid))} />}
            {call && <CallStage key={call.title + call.participants.join()} call={call} onLeave={endCall} />}
          </div>
        </div>
        {creating && <CreateDialog teams={teams} initialTeam={creating.team} onClose={() => setCreating(null)} onCreated={(id) => openChannel(id)} />}
        {shortcuts && (
          <div className="absolute inset-0 z-50 bg-black/30 flex items-start justify-center pt-20" onMouseDown={(e) => e.target === e.currentTarget && setShortcuts(false)}>
            <div className="w-[440px] bg-white rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.28)] p-6">
              <div className="flex items-center mb-4">
                <div className="text-[18px] font-semibold flex-1">Keyboard shortcuts</div>
                <button aria-label="Close" className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={() => setShortcuts(false)}><Dismiss20Regular /></button>
              </div>
              {[['Ctrl+Alt+E', 'Go to search'], ['Enter', 'Send a message'], ['Shift+Enter', 'Start a new line'], ['Esc', 'Close a menu or cancel editing']].map(([k, d]) => (
                <div key={k} className="flex items-center h-9 text-[13.5px] border-b border-[#F0F0F0]">
                  <span className="flex-1">{d}</span>
                  <kbd className="px-2 h-6 rounded border border-[#D1D1D1] bg-[#FAFAFA] text-[12px] flex items-center">{k}</kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MyPresence.Provider>
  )
}
