import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  SendHorizontal, Bold, Italic, Strikethrough, Link2, ListOrdered, List, Quote, Code, SquareCode, Smile, AtSign, Video, Mic, Plus, ChevronDown,
  Type, MessageSquareText, Forward, Bookmark, BookmarkCheck, MoreHorizontal, SmilePlus, Pin, Copy, Pencil, Trash2, Upload, FileText, Clock, Mail,
} from 'lucide-react'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { logoUrl } from '@/os/registry'
import { emoji } from './emoji'
import { EMOJI_PICK, MItem, MSep, Pop, fmtSize, kindOf, useMenu, type Msg, type SlackFile } from './ui'

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
export const relTime = (iso: string) => {
  const s = (Date.now() - +new Date(iso)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} minutes ago`
  if (s < 86400) return Math.round(s / 3600) === 1 ? '1 hour ago' : `${Math.round(s / 3600)} hours ago`
  return `${Math.round(s / 86400)} days ago`
}

export const STATUS: Record<string, string> = { priya: '📅', grace: '🏠', tom: '🎧', oliver: '🔥', chen: '💻', liam: '✈️' }

/** Lightweight Slack mrkdwn: *bold*, _italic_, ~strike~, `code`, :emoji:, @mentions, #channels, OPS-123 links, URLs, newlines */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`|:[a-z0-9_+\-]+:|@[A-Z][a-z]+(?: [A-Z][a-z']+)?|#[a-z][a-z0-9-]+|\bOPS-\d+\b|https?:\/\/\S+)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const t = m[0]
    const k = i++
    if (t.startsWith('*')) parts.push(<b key={k}>{t.slice(1, -1)}</b>)
    else if (t.startsWith('_')) parts.push(<i key={k}>{t.slice(1, -1)}</i>)
    else if (t.startsWith('~')) parts.push(<s key={k}>{t.slice(1, -1)}</s>)
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

/** block-level: ``` code blocks and > quotes; everything else is inline mrkdwn */
export function Mrkdwn({ text }: { text: string }) {
  if (!text.includes('```') && !/^>/m.test(text)) return <Inline text={text} />
  const out: ReactNode[] = []
  const chunks = text.split(/```/)
  chunks.forEach((c, ci) => {
    if (ci % 2 === 1) {
      out.push(<pre key={`c${ci}`} className="my-1 p-2 rounded border border-[#DDDDDD] bg-[#F8F8F8] text-[12.5px] font-mono whitespace-pre-wrap">{c.replace(/^\n|\n$/g, '')}</pre>)
      return
    }
    const lines = c.split('\n')
    lines.forEach((l, li) => {
      const q = /^>\s?(.*)$/.exec(l)
      if (q) out.push(<div key={`q${ci}-${li}`} className="border-l-4 border-[#DDDDDD] pl-3 text-[#1D1C1D]"><Inline text={q[1]} /></div>)
      else out.push(<Fragment key={`l${ci}-${li}`}><Inline text={l} />{li < lines.length - 1 ? '\n' : ''}</Fragment>)
    })
  })
  return <>{out}</>
}

export function SlackAvatar({ id, size = 36 }: { id: string; size?: number }) {
  if (id === 'bot:jira')
    return <span className="shrink-0 flex items-center justify-center rounded-[6px] bg-[#1868DB]" style={{ width: size, height: size }}><img src={logoUrl('jira')} className="w-[60%] h-[60%] brightness-0 invert" alt="" /></span>
  return <Avatar id={id} size={size} square className="[&>span]:!rounded-[6px]" />
}

export const nameOf = (from: string) => (from === 'bot:jira' ? 'Jira Cloud' : person(from).name)

export function FileChip({ f, onRemove }: { f: SlackFile; onRemove?: () => void }) {
  const { open, toast } = useDesk()
  const color = f.kind === 'pdf' ? '#E01E5A' : f.kind === 'xlsx' ? '#2BAC76' : f.kind === 'docx' ? '#1264A3' : f.kind === 'pptx' ? '#E8912D' : '#616061'
  return (
    <div className="flex items-center gap-2.5 h-14 pl-2.5 pr-2 rounded-lg border border-[#DDDDDD] bg-white w-[300px] max-w-full">
      <button className="flex items-center gap-2.5 min-w-0 flex-1 text-left" onClick={() => (f.open ? open(f.open.appId, f.open.params) : toast({ appId: 'slack', title: f.name, body: 'Preview isn’t available for this file type.' }))}>
        <span className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0" style={{ background: color }}><FileText size={18} /></span>
        <div className="min-w-0">
          <div className="text-[14px] font-bold truncate hover:underline">{f.name}</div>
          <div className="text-[12px] text-[#616061]">{f.kind.toUpperCase()} · {f.size}</div>
        </div>
      </button>
      {onRemove && <button aria-label={`Remove ${f.name}`} className="w-6 h-6 rounded hover:bg-[#F2F2F2] text-[#616061]" onClick={onRemove}>×</button>}
    </div>
  )
}

/* ─────────────────────────── Emoji picker ─────────────────────────── */

export function EmojiGrid({ onPick }: { onPick: (code: string) => void }) {
  const [q, setQ] = useState('')
  const list = EMOJI_PICK.filter((c) => c.includes(q.toLowerCase().replace(/:/g, '')))
  return (
    <div className="p-2 w-[290px]">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all emoji" aria-label="Search all emoji" className="w-full h-8 px-2 rounded-md border border-[#BBBABB] text-[13px] outline-none focus:border-[#1264A3] mb-2" />
      <div className="grid grid-cols-8 gap-0.5">
        {list.map((c) => (
          <button key={c} title={`:${c}:`} className="h-8 rounded hover:bg-[#F2F2F2] text-[19px]" onClick={() => onPick(c)}>{emoji(c)}</button>
        ))}
      </div>
      {!list.length && <div className="text-[12.5px] text-[#616061] px-1 py-2">No emoji found</div>}
    </div>
  )
}

/* ─────────────────────────── Composer ─────────────────────────── */

const SLASH: [string, string][] = [
  ['/shrug', 'Append ¯\\_(ツ)_/¯ to your message'],
  ['/status', 'Set your status, e.g. /status :calendar: In a meeting'],
  ['/away', 'Toggle your away status'],
  ['/topic', 'Set the channel topic'],
  ['/remind', 'Save this message to Later as a reminder'],
]

export function Composer({ placeholder, agent, sendAgent, onSend, compact, onSchedule }: { placeholder: string; agent: string; sendAgent: string; onSend: (t: string, files?: SlackFile[]) => void; compact?: boolean; onSchedule?: (t: string, at: Date, files?: SlackFile[]) => void }) {
  const { isAgent, toast } = useDesk()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<SlackFile[]>([])
  const [showFmt, setShowFmt] = useState(true)
  const [mention, setMention] = useState(false)
  const [slash, setSlash] = useState(false)
  const recent = useCollection<any>('files')
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const attach = useMenu()
  const emo = useMenu()
  const sched = useMenu()
  const send = () => {
    const t = text.trim()
    if (!t && !files.length) return
    onSend(t, files.length ? files : undefined)
    setText('')
    setFiles([])
    setMention(false)
    setSlash(false)
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(220, el.scrollHeight) + 'px'
  }, [text])
  const sel = () => ({ s: ref.current?.selectionStart ?? text.length, e: ref.current?.selectionEnd ?? text.length })
  const restore = (a: number, b = a) =>
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.selectionStart = a
      el.selectionEnd = b
    })
  const wrap = (pre: string, post = pre, ph = 'text') => {
    const { s, e } = sel()
    const inner = text.slice(s, e) || ph
    setText(text.slice(0, s) + pre + inner + post + text.slice(e))
    restore(s + pre.length, s + pre.length + inner.length)
  }
  const insert = (str: string) => {
    const { s, e } = sel()
    setText(text.slice(0, s) + str + text.slice(e))
    restore(s + str.length)
  }
  const prefix = (fn: (i: number) => string) => {
    const { s, e } = sel()
    const ls = text.lastIndexOf('\n', s - 1) + 1
    const block = text.slice(ls, Math.max(s, e))
    const out = block.split('\n').map((l, i) => fn(i) + l).join('\n')
    setText(text.slice(0, ls) + out + text.slice(Math.max(s, e)))
    restore(ls + out.length)
  }
  const fmt: [any, string, () => void][] = [
    [Bold, 'Bold', () => wrap('*')],
    [Italic, 'Italic', () => wrap('_')],
    [Strikethrough, 'Strikethrough', () => wrap('~')],
    [Link2, 'Link', () => insert('https://')],
    [ListOrdered, 'Ordered list', () => prefix((i) => `${i + 1}. `)],
    [List, 'Bulleted list', () => prefix(() => '• ')],
    [Quote, 'Blockquote', () => prefix(() => '> ')],
    [Code, 'Code', () => wrap('`')],
    [SquareCode, 'Code block', () => wrap('```\n', '\n```', 'code')],
  ]
  const mentionQ = /(^|\s)@(\w*)$/.exec(text.slice(0, sel().s))?.[2] ?? null
  const people = mention && mentionQ !== null ? PEOPLE.filter((p) => !p.external && p.name.toLowerCase().includes(mentionQ.toLowerCase())).slice(0, 6) : []
  const pickMention = (name: string) => {
    const { s } = sel()
    const before = text.slice(0, s).replace(/@(\w*)$/, `@${name} `)
    setText(before + text.slice(s))
    setMention(false)
    restore(before.length)
  }
  const tomorrow9 = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  }
  const monday9 = () => {
    const d = new Date()
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
    d.setHours(9, 0, 0, 0)
    return d
  }
  const schedule = (at: Date) => {
    const t = text.trim()
    if (!t || !onSchedule) return
    onSchedule(t, at, files.length ? files : undefined)
    setText('')
    setFiles([])
    sched.close()
  }
  const has = !!text.trim() || files.length > 0
  return (
    <div className={`relative rounded-lg border border-[#BBBABB] focus-within:border-[#868686] focus-within:shadow-[0_0_0_1px_#868686] bg-white ${compact ? '' : ''}`}>
      {showFmt && (
        <div className="flex items-center gap-0.5 px-1.5 pt-1.5 text-[#616061]">
          {fmt.map(([I, l, fn], i) => (
            <span key={i} className="contents">
              {(i === 4 || i === 7) && <span className="w-px h-4 bg-[#DDDDDD] mx-1" />}
              <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2] opacity-60 hover:opacity-100" aria-label="format" title={l} onClick={fn}><I size={15} strokeWidth={2.1} /></button>
            </span>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2">
          {files.map((f, i) => <FileChip key={i} f={f} onRemove={() => setFiles((x) => x.filter((_, j) => j !== i))} />)}
        </div>
      )}
      <textarea
        ref={ref}
        data-agent={agent}
        aria-label={placeholder}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (/(^|\s)@\w*$/.test(e.target.value)) setMention(true)
          if (!e.target.value.startsWith('/')) setSlash(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
          if (e.key === 'Escape') {
            setMention(false)
            setSlash(false)
          }
        }}
        placeholder={placeholder}
        className="w-full resize-none outline-none px-3 py-1.5 text-[15px] leading-[22px] text-[#1D1C1D] placeholder:text-[#868686] bg-transparent"
      />
      {!isAgent && people.length > 0 && (
        <Pop className="left-2 bottom-full mb-1 w-[300px]">
          <div className="px-4 pb-1 text-[12px] text-[#616061]">People</div>
          {people.map((p) => (
            <button key={p.id} className="w-full flex items-center gap-2 px-4 h-8 hover:bg-[#1264A3] hover:text-white text-[14px] text-left" onClick={() => pickMention(p.name)}>
              <SlackAvatar id={p.id} size={20} /> <b>{p.name}</b> <span className="opacity-70 truncate">{p.title}</span>
            </button>
          ))}
        </Pop>
      )}
      {!isAgent && slash && text.startsWith('/') && !text.includes(' ') && (
        <Pop className="left-2 bottom-full mb-1 w-[380px]">
          {SLASH.filter(([c]) => c.startsWith(text.trim() || '/')).map(([c, d]) => (
            <button key={c} className="w-full flex items-baseline gap-2 px-4 py-1.5 hover:bg-[#1264A3] hover:text-white text-left" onClick={() => { setText(c + ' '); setSlash(false); restore(c.length + 1) }}>
              <b className="text-[14px]">{c}</b> <span className="text-[12.5px] opacity-75 truncate">{d}</span>
            </button>
          ))}
        </Pop>
      )}
      <div className="flex items-center gap-0.5 px-1.5 pb-1.5 text-[#616061]">
        <div className="relative" ref={attach.ref}>
          <button className="w-7 h-7 rounded-full bg-[#F2F2F2] flex items-center justify-center hover:bg-[#E8E8E8]" aria-label="Attach" onClick={attach.toggle}><Plus size={16} /></button>
          {attach.open && (
            <Pop className="left-0 bottom-9 w-[300px]">
              <MItem icon={<Upload size={15} />} label="Upload from your computer" onClick={() => fileInput.current?.click()} />
              <MSep />
              <div className="px-4 pb-1 text-[12px] text-[#616061]">Recent files</div>
              <div className="max-h-[220px] overflow-auto">
                {[...recent].sort((x, y) => +new Date(y.modified ?? 0) - +new Date(x.modified ?? 0)).slice(0, 12).map((f) => (
                  <MItem key={f.id} icon={<FileText size={15} />} label={f.name} hint={f.size} onClick={() => { setFiles((x) => [...x, { name: f.name, size: f.size, kind: f.kind, open: f.open }]); attach.close() }} />
                ))}
              </div>
            </Pop>
          )}
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const l = e.target.files
              if (l?.length) setFiles((x) => [...x, ...Array.from(l).map((f) => ({ name: f.name, size: fmtSize(f.size), kind: kindOf(f.name) }))])
              e.target.value = ''
              attach.close()
            }}
          />
        </div>
        <button className={`w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2] ${showFmt ? '' : 'text-[#1264A3]'}`} title={showFmt ? 'Hide formatting' : 'Show formatting'} onClick={() => setShowFmt((v) => !v)}><Type size={16} /></button>
        <div className="relative" ref={emo.ref}>
          <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2]" title="Emoji" onClick={emo.toggle}><Smile size={16} /></button>
          {emo.open && (
            <Pop className="left-0 bottom-9">
              <EmojiGrid onPick={(c) => { insert(`:${c}: `); emo.close() }} />
            </Pop>
          )}
        </div>
        <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2]" title="Mention someone" onClick={() => { insert(text && !/\s$/.test(text) ? ' @' : '@'); setMention(true) }}><AtSign size={16} /></button>
        <span className="w-px h-4 bg-[#DDDDDD] mx-1" />
        <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2]" title="Record video clip" onClick={() => toast({ appId: 'slack', title: 'Camera access needed', body: 'Allow camera access in your browser to record a video clip.' })}><Video size={16} /></button>
        <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2]" title="Record audio clip" onClick={() => toast({ appId: 'slack', title: 'Microphone access needed', body: 'Allow microphone access in your browser to record an audio clip.' })}><Mic size={16} /></button>
        <span className="w-px h-4 bg-[#DDDDDD] mx-1" />
        <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[13px] font-bold" title="Run a shortcut" onClick={() => { if (!text.startsWith('/')) { setText('/' + text); restore(1) } setSlash(true) }}>/</button>
        <div className="flex-1" />
        <div ref={sched.ref} className={`relative flex items-center h-7 rounded ${has ? 'bg-[#007A5A] text-white' : 'text-[#BBBABB]'}`}>
          <button data-agent={sendAgent} aria-label="Send now" onClick={send} className="h-7 px-2 flex items-center hover:bg-black/10 rounded-l"><SendHorizontal size={16} fill="currentColor" /></button>
          <span className={`w-px h-4 ${has ? 'bg-white/40' : 'bg-[#DDDDDD]'}`} />
          <button className="h-7 px-1 flex items-center hover:bg-black/10 rounded-r" aria-label="Schedule for later" onClick={() => has && onSchedule && sched.toggle()}><ChevronDown size={14} /></button>
          {sched.open && (
            <Pop className="right-0 bottom-9 w-[260px]">
              <div className="px-4 pb-1 text-[12px] font-bold text-[#616061]">Schedule message</div>
              <MItem icon={<Clock size={14} />} label="Tomorrow at 9:00 AM" onClick={() => schedule(tomorrow9())} />
              <MItem icon={<Clock size={14} />} label={`${monday9().toLocaleDateString('en-US', { weekday: 'long' })} at 9:00 AM`} onClick={() => schedule(monday9())} />
              <MItem icon={<Clock size={14} />} label="In 1 hour" onClick={() => schedule(new Date(Date.now() + 3600000))} />
            </Pop>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Message ─────────────────────────── */

export interface MsgActions {
  onReact: (m: Msg, e: string) => void
  onThread?: (m: Msg) => void
  onProfile?: (id: string) => void
  onForward?: (m: Msg) => void
  onSave?: (m: Msg) => void
  onPin?: (m: Msg) => void
  onEdit?: (m: Msg, text: string) => void
  onDelete?: (m: Msg) => void
  onMarkUnread?: (m: Msg) => void
  onCopyLink?: (m: Msg) => void
}

export function Message({ m, compact, replies, inThread, hovered, onHover, actions }: { m: Msg; compact: boolean; replies: Msg[]; inThread?: boolean; hovered?: boolean; onHover?: (on: boolean) => void; actions: MsgActions }) {
  const [hoverLocal, setHoverLocal] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const pick = useMenu()
  const pick2 = useMenu()
  const more = useMenu()
  const hover = (onHover ? !!hovered : hoverLocal) || pick.open || more.open
  const setHover = onHover ?? setHoverLocal
  const fresh = m.createdBy === 'hworker' && Date.now() - +new Date(m.date) < 60000
  const mine = m.from === ME.id
  const onThread = () => actions.onThread?.(m)
  if (m.system)
    return (
      <div data-agent={`slack-msg-${m.id}`} className="flex gap-2 px-5 py-1 text-[14px] text-[#616061]">
        <div className="w-9 shrink-0 flex justify-end"><SlackAvatar id={m.from} size={20} /></div>
        <div><Mrkdwn text={m.text} /> <span className="text-[12px]">{timeOf(m.date)}</span></div>
      </div>
    )
  return (
    <div
      data-agent={`slack-msg-${m.id}`}
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative flex gap-2 px-5 ${compact ? 'py-0.5' : 'pt-2 pb-1'} hover:bg-[#F8F8F8] group ${fresh ? 'flash-new' : ''} ${m.pinned ? 'bg-[#FEF9EC]' : ''} ${m.saved && !m.savedDone ? 'bg-[#FFF8E6]' : ''}`}
    >
      <div className="w-9 shrink-0">
        {compact ? (
          <span className="hidden group-hover:block text-[11px] text-[#616061] pt-1 text-right pr-1 whitespace-nowrap">{timeOf(m.date).replace(/ [AP]M/, '')}</span>
        ) : (
          <button onClick={() => actions.onProfile?.(m.from)} aria-label={`View ${nameOf(m.from)}’s profile`}><SlackAvatar id={m.from} /></button>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {(m.pinned || (m.saved && !m.savedDone)) && (
          <div className="text-[12px] text-[#616061] flex items-center gap-1 mb-0.5">
            {m.pinned && <><Pin size={11} /> Pinned</>}
            {m.pinned && m.saved && !m.savedDone && ' · '}
            {m.saved && !m.savedDone && <><Bookmark size={11} className="text-[#E01E5A]" /> Saved for later</>}
          </div>
        )}
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-black text-[#1D1C1D] hover:underline cursor-pointer" onClick={() => actions.onProfile?.(m.from)}>{nameOf(m.from)}</span>
            {m.from.startsWith('bot:') && <span className="text-[10px] px-1 rounded-sm bg-[#E8E8E8] text-[#616061] font-bold">APP</span>}
            {STATUS[m.from] && <span className="text-[13px]">{STATUS[m.from]}</span>}
            <span className="text-[12px] text-[#616061] hover:underline cursor-pointer" onClick={() => actions.onCopyLink?.(m)} title="Copy link">{timeOf(m.date)}</span>
            {m.createdBy === 'hworker' && (
              <span className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded bg-[#430693]/10 text-[#430693] text-[11px] font-bold">
                <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" /> via H-Worker
              </span>
            )}
          </div>
        )}
        {m.broadcast && <div className="text-[12.5px] text-[#616061]">replied to a thread</div>}
        {editing !== null ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (editing.trim()) actions.onEdit?.(m, editing.trim())
                  setEditing(null)
                }
                if (e.key === 'Escape') setEditing(null)
              }}
              aria-label="Edit message"
              className="w-full min-h-[64px] resize-none rounded-lg border border-[#868686] p-2 text-[15px] outline-none"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button className="h-7 px-3 rounded-md border border-[#BBBABB] text-[13px] font-bold" onClick={() => setEditing(null)}>Cancel</button>
              <button className="h-7 px-3 rounded-md bg-[#007A5A] text-white text-[13px] font-bold" onClick={() => { if (editing.trim()) actions.onEdit?.(m, editing.trim()); setEditing(null) }}>Save</button>
            </div>
          </div>
        ) : m.deleted ? (
          <div className="text-[15px] leading-[22px] text-[#616061] italic">This message was deleted.</div>
        ) : (
          <div className="text-[15px] leading-[22px] text-[#1D1C1D] whitespace-pre-wrap break-words" data-agent={`slack-msg-text-${m.id}`}>
            <Mrkdwn text={m.text} />
            {m.edited && <span className="text-[12px] text-[#616061]"> (edited)</span>}
          </div>
        )}
        {m.forwardedFrom && (
          <div className="mt-1 border-l-4 border-[#DDDDDD] pl-3 py-0.5">
            <div className="flex items-center gap-1.5 text-[13px]">
              <SlackAvatar id={m.forwardedFrom.from} size={16} />
              <b>{nameOf(m.forwardedFrom.from)}</b>
              <span className="text-[12px] text-[#616061]">{m.forwardedFrom.channelId.startsWith('dm-') ? 'Direct message' : `#${m.forwardedFrom.channelId}`} · {dayLabel(m.forwardedFrom.date)}</span>
            </div>
            <div className="text-[14.5px] whitespace-pre-wrap break-words"><Mrkdwn text={m.forwardedFrom.text} /></div>
          </div>
        )}
        {!!m.files?.length && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {m.files.map((f, i) => <FileChip key={i} f={f} />)}
          </div>
        )}
        {!!m.reactions?.length && (
          <div className="flex flex-wrap gap-1 mt-1">
            {m.reactions.map((r) => {
              const mine = r.users.includes(ME.id)
              return (
                <button key={r.emoji} title={`${r.users.map((u) => (u === ME.id ? 'You' : nameOf(u))).join(', ')} reacted with :${r.emoji}:`} onClick={() => actions.onReact(m, r.emoji)} className={`h-6 px-1.5 rounded-full flex items-center gap-1 text-[12px] border ${mine ? 'bg-[#E8F5FA] border-[#1D9BD1] text-[#1264A3]' : 'bg-[#F2F2F2] border-transparent text-[#1D1C1D] hover:border-[#BBBABB] hover:bg-white'}`}>
                  <span className="text-[15px] leading-none">{emoji(r.emoji)}</span>
                  <span className="font-bold">{r.users.length}</span>
                </button>
              )
            })}
            <div className="relative" ref={pick2.ref}>
              <button aria-label="Add reaction" onClick={pick2.toggle} className={`h-6 w-8 rounded-full bg-[#F2F2F2] flex items-center justify-center text-[#616061] ${pick2.open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><SmilePlus size={14} /></button>
              {pick2.open && (
                <Pop className="left-0 top-7">
                  <EmojiGrid onPick={(c) => { actions.onReact(m, c); pick2.close() }} />
                </Pop>
              )}
            </div>
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
      {!m.deleted && (
        <div className={`absolute right-4 -top-4 z-10 flex items-center bg-white rounded-lg border border-[#DDDDDD] shadow-sm px-0.5 h-9 transition-opacity ${hover ? 'opacity-100' : 'opacity-0 pointer-events-none'} group-hover:opacity-100 group-hover:pointer-events-auto`}>
          {['white_check_mark', 'eyes', 'raised_hands'].map((e) => (
            <button key={e} onClick={() => actions.onReact(m, e)} className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[16px]">{emoji(e)}</button>
          ))}
          <span className="w-px h-5 bg-[#DDDDDD] mx-0.5" />
          <div className="relative" ref={pick.ref}>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="Add reaction" onClick={pick.toggle}><SmilePlus size={17} /></button>
            {pick.open && (
              <Pop className="right-0 top-9">
                <EmojiGrid onPick={(c) => { actions.onReact(m, c); pick.close() }} />
              </Pop>
            )}
          </div>
          {!inThread && (
            <button data-agent={`slack-reply-${m.id}`} aria-label="Reply in thread" onClick={onThread} className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]"><MessageSquareText size={17} /></button>
          )}
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="Forward" onClick={() => actions.onForward?.(m)}><Forward size={17} /></button>
          <button className={`w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] ${m.saved && !m.savedDone ? 'text-[#E01E5A]' : 'text-[#616061]'}`} aria-label="Save for later" onClick={() => actions.onSave?.(m)}>{m.saved && !m.savedDone ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
          <div className="relative" ref={more.ref}>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#F2F2F2] text-[#616061]" aria-label="More actions" onClick={more.toggle}><MoreHorizontal size={17} /></button>
            {more.open && (
              <Pop className="right-0 top-9 w-[240px]">
                <MItem icon={<Mail size={14} />} label="Mark unread" onClick={() => { actions.onMarkUnread?.(m); more.close() }} />
                <MItem icon={<Clock size={14} />} label="Remind me about this" onClick={() => { if (!m.saved || m.savedDone) actions.onSave?.(m); more.close() }} />
                <MSep />
                <MItem icon={<Copy size={14} />} label="Copy link" onClick={() => { actions.onCopyLink?.(m); more.close() }} />
                <MItem icon={<Pin size={14} />} label={m.pinned ? 'Un-pin from channel' : 'Pin to channel'} onClick={() => { actions.onPin?.(m); more.close() }} />
                {mine && (
                  <>
                    <MSep />
                    <MItem icon={<Pencil size={14} />} label="Edit message" onClick={() => { setEditing(m.text); more.close() }} />
                    <MItem icon={<Trash2 size={14} />} label="Delete message…" danger onClick={() => { actions.onDelete?.(m); more.close() }} />
                  </>
                )}
              </Pop>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function MessageList({ msgs, all, actions, intro }: { msgs: Msg[]; all: Msg[]; actions: MsgActions; intro: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [jump, setJump] = useState<string | null>(null)
  const jumpRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [msgs.length, msgs[0]?.channelId])
  useEffect(() => {
    if (!jump) return
    const onDown = (e: MouseEvent) => !jumpRef.current?.contains(e.target as Node) && setJump(null)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [jump])
  let lastDay = ''
  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-auto pb-2" data-agent="slack-messages">
      <div className="px-5 pt-10 pb-4">{intro}</div>
      {msgs.map((m, i) => {
        const day = dayLabel(m.date)
        const showDay = day !== lastDay
        lastDay = day
        const prev = msgs[i - 1]
        const compact = !showDay && !!prev && prev.from === m.from && !prev.system && !m.system && +new Date(m.date) - +new Date(prev.date) < 5 * 60000
        return (
          <div key={m.id}>
            {showDay && (
              <div className="relative flex justify-center my-2 sticky top-0 z-20">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-[#DDDDDD]" />
                <div className="relative" ref={jump === m.id ? jumpRef : undefined}>
                <button className="relative h-7 px-4 rounded-full border border-[#DDDDDD] bg-white text-[13px] font-bold text-[#1D1C1D] flex items-center gap-1 hover:bg-[#F8F8F8]" onClick={() => setJump((j) => (j === m.id ? null : m.id))}>
                  {day} <ChevronDown size={13} />
                </button>
                {jump === m.id && (
                  <Pop className="top-8 left-1/2 -translate-x-1/2 w-[220px]">
                    <div className="px-4 pb-1 text-[12px] font-bold text-[#616061]">Jump to…</div>
                    <MItem label="Most recent" onClick={() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); setJump(null) }} />
                    <MItem label="The very beginning" onClick={() => { ref.current?.scrollTo({ top: 0, behavior: 'smooth' }); setJump(null) }} />
                  </Pop>
                )}
                </div>
              </div>
            )}
            <Message m={m} compact={compact} replies={all.filter((r) => r.threadTs === m.id)} actions={actions} hovered={hoverId === m.id} onHover={(on) => setHoverId((h) => (on ? m.id : h === m.id ? null : h))} />
          </div>
        )
      })}
    </div>
  )
}

