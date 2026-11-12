import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import {
  Archive20Regular,
  ArrowForward20Regular,
  ArrowReply20Regular,
  ArrowReplyAll20Regular,
  Attach16Regular,
  Attach20Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Delete20Regular,
  DocumentPdf24Regular,
  Drafts20Regular,
  Filter20Regular,
  Flag16Filled,
  Flag20Regular,
  Folder20Regular,
  FolderMail20Regular,
  Important16Filled,
  MailInbox20Regular,
  MailRead20Regular,
  MailUnread20Regular,
  MoreHorizontal20Regular,
  Pin20Regular,
  Send20Regular,
  Tag20Regular,
  TextBold20Regular,
  TextItalic20Regular,
  TextUnderline20Regular,
  TextBulletList20Regular,
  Image20Regular,
  Emoji20Regular,
  Dismiss20Regular,
  Star20Regular,
  Star20Filled,
  Note20Regular,
  Clock20Regular,
  ShieldError20Regular,
  History20Regular,
  ArrowSync20Regular,
  DocumentTable24Regular,
  Document24Regular,
  Important20Regular,
  Save20Regular,
  Delete16Regular,
  Flag16Regular,
  Pin16Regular,
  Mail16Regular,
  MailRead16Regular,
  MailAllRead20Regular,
  Print20Regular,
  FolderAdd20Regular,
  Copy20Regular,
  CalendarLtr20Regular,
  QuestionCircle20Regular,
  PersonFeedback20Regular,
  Lightbulb20Regular,
  Settings20Regular,
  Pin16Filled,
} from '@fluentui/react-icons'
import { db, uid, useCollection, type Rec } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, personByEmail } from '@/data/people'
import { fmtSmart } from '@/data/time'
import { logoUrl } from '@/os/registry'
import { RecipientInput } from './RecipientInput'
import { EMAIL_SIGNATURE } from '@/db/seeds/core'
import { EMOJIS, MenuHeader, MenuItem, MenuPanel, MenuSep, copyText, snoozeTimes, useMenu, usePrefs } from './ui'

export const CATEGORY_COLORS: Record<string, [string, string]> = {
  Receipts: ['#DFF6DD', '#107C10'],
  'Follow up': ['#FDE7E9', '#C50F1F'],
  Finance: ['#FFF4CE', '#8A5A00'],
  Vendors: ['#FED9CC', '#CA5010'],
  Customers: ['#E8EBFA', '#4F6BED'],
  FYI: ['#EBF3FC', '#0F6CBD'],
  Newsletters: ['#F3F2F1', '#605E5C'],
  'HR': ['#F1E4F6', '#8764B8'],
  'IT': ['#DEECF9', '#004E8C'],
}

export interface Email extends Rec {
  folder: string
  from: { name: string; email: string }
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  date: string
  read: boolean
  flagged?: boolean
  pinned?: boolean
  important?: boolean
  category?: string
  focused?: boolean
  attachments?: { name: string; size: string; kind: string; open?: { appId: string; params?: any } }[]
  sentBy?: string
  replyTo?: string
  snoozedUntil?: string
  style?: { b?: boolean; i?: boolean; u?: boolean }
}

export interface ComposeState {
  /** identity of this draft (so a delayed "sent" close never closes a newer draft) */
  key?: string
  mode: 'new' | 'reply' | 'replyAll' | 'forward'
  to: string[]
  cc: string[]
  bcc?: string[]
  subject: string
  body: string
  replyTo?: string
  attachments: Email['attachments']
  /** id of the saved draft this compose was opened from */
  draftId?: string
  important?: boolean
  style?: { b?: boolean; i?: boolean; u?: boolean }
}

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: MailInbox20Regular },
  { id: 'drafts', name: 'Drafts', icon: Drafts20Regular },
  { id: 'sent', name: 'Sent Items', icon: Send20Regular },
  { id: 'scheduled', name: 'Scheduled', icon: Clock20Regular },
  { id: 'deleted', name: 'Deleted Items', icon: Delete20Regular },
  { id: 'junk', name: 'Junk Email', icon: ShieldError20Regular },
  { id: 'archive', name: 'Archive', icon: Archive20Regular },
  { id: 'notes', name: 'Notes', icon: Note20Regular },
  { id: 'history', name: 'Conversation History', icon: History20Regular },
]
const DEFAULT_FOLDERS = ['Expenses', 'Vendors', 'Customers', 'Leadership']
const DEFAULT_FAVS = ['inbox', 'sent', 'drafts']
const folderName = (id: string) => FOLDERS.find((f) => f.id === id)?.name ?? id

type QuickFilter = 'all' | 'unread' | 'flagged' | 'tome' | 'files' | 'mentions'
type SortKey = 'date' | 'from' | 'subject'
const FILTER_LABEL: Record<QuickFilter, string> = { all: 'All', unread: 'Unread', flagged: 'Flagged', tome: 'To me', files: 'Has files', mentions: 'Mentions me' }

const isSnoozed = (e: Email, now: number) => !!e.snoozedUntil && +new Date(e.snoozedUntil) > now

function groupLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= startOfDay) return 'Today'
  if (t >= startOfDay - 86400000) return 'Yesterday'
  const dow = now.getDay() || 7
  if (t >= startOfDay - (dow - 1) * 86400000) return 'This week'
  if (t >= startOfDay - (dow + 6) * 86400000) return 'Last week'
  return 'Older'
}

export function FileIcon({ kind }: { kind: string }) {
  if (kind === 'pdf') return <DocumentPdf24Regular className="text-[#C50F1F]" />
  if (kind === 'xlsx') return <img src={logoUrl('excel')} className="w-6 h-6" alt="" />
  if (kind === 'docx') return <img src={logoUrl('word')} className="w-6 h-6" alt="" />
  if (kind === 'pptx') return <img src={logoUrl('powerpoint')} className="w-6 h-6" alt="" />
  if (kind === 'csv') return <DocumentTable24Regular className="text-[#107C10]" />
  return <Document24Regular className="text-[#616161]" />
}

const kindOf = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'img'
  if (['xls', 'xlsx'].includes(ext)) return 'xlsx'
  if (['doc', 'docx'].includes(ext)) return 'docx'
  if (['ppt', 'pptx'].includes(ext)) return 'pptx'
  return ext || 'file'
}
const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export function HWorkerBadge() {
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[11px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> Sent by H-Worker
    </span>
  )
}

/* ─────────────────────────── Ribbon ─────────────────────────── */

function RibbonButton({ icon: Icon, label, onClick, agent, disabled, primary, chevron, menu, title }: { icon: any; label: string; onClick?: () => void; agent?: string; disabled?: boolean; primary?: boolean; chevron?: boolean; menu?: (close: () => void) => ReactNode; title?: string }) {
  const m = useMenu()
  if (primary)
    return (
      <div ref={m.ref} className="relative flex items-center h-8 rounded bg-[#0F6CBD] text-white mr-1.5">
        <button data-agent={agent} onClick={onClick} className="flex items-center gap-1.5 h-full pl-2.5 pr-3 rounded-l hover:bg-[#115EA3] text-[13px] font-semibold">
          <Icon /> {label}
        </button>
        <span className="w-px h-5 bg-white/30" />
        <button className="h-full px-1.5 rounded-r hover:bg-[#115EA3]" aria-label={`${label} options`} onClick={m.toggle}>
          <ChevronDown16Regular />
        </button>
        {menu && m.open && <MenuPanel className="left-0 top-9 w-[220px]">{menu(m.close)}</MenuPanel>}
      </div>
    )
  return (
    <div ref={m.ref} className="relative">
      <button
        data-agent={agent}
        onClick={menu ? m.toggle : onClick}
        disabled={disabled}
        title={title}
        aria-label={label ? undefined : title}
        className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px] text-[#242424] disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Icon className="text-[#0F6CBD]" />
        {label && <span>{label}</span>}
        {chevron && <ChevronDown16Regular className="text-[#616161]" />}
      </button>
      {menu && m.open && !disabled && <MenuPanel className="left-0 top-9 w-[240px]">{menu(m.close)}</MenuPanel>}
    </div>
  )
}

/* ─────────────────────────── Compose ─────────────────────────── */

function AddressBook({ label, onPick, exclude }: { label: string; onPick: (email: string) => void; exclude: string[] }) {
  const m = useMenu()
  const [q, setQ] = useState('')
  const list = PEOPLE.filter((p) => p.id !== ME.id && !exclude.includes(p.email) && (p.name + ' ' + p.email + ' ' + (p.company ?? '')).toLowerCase().includes(q.toLowerCase()))
  return (
    <div ref={m.ref} className="relative">
      <button onClick={m.toggle} className="h-7 px-2.5 mt-0.5 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]">{label}</button>
      {m.open && (
        <MenuPanel className="left-0 top-9 w-[320px]">
          <div className="px-2 pb-1">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" className="w-full h-8 px-2 rounded border border-[#D1D1D1] text-[13px] outline-none focus:border-[#0F6CBD]" />
          </div>
          <div className="max-h-[260px] overflow-auto">
            {list.map((p) => (
              <button key={p.id} onClick={() => onPick(p.email)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F5F5F5] text-left">
                <Avatar id={p.id} size={26} />
                <div className="min-w-0">
                  <div className="text-[13px] truncate">{p.name}</div>
                  <div className="text-[11.5px] text-[#616161] truncate">{p.email}</div>
                </div>
              </button>
            ))}
            {!list.length && <div className="px-3 py-2 text-[12.5px] text-[#616161]">No matching contacts</div>}
          </div>
        </MenuPanel>
      )}
    </div>
  )
}

function Compose({ state, onChange, onClose: close }: { state: ComposeState; onChange: (s: ComposeState) => void; onClose: (key?: string) => void }) {
  const onClose = () => close(state.key)
  const { isAgent, toast } = useDesk()
  const files = useCollection('files')
  const [showCc, setShowCc] = useState(state.cc.length > 0)
  const [showBcc, setShowBcc] = useState((state.bcc ?? []).length > 0)
  const [attachMenu, setAttachMenu] = useState(false)
  const [sending, setSending] = useState(false)
  const attachRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const emojiMenu = useMenu()
  const style = state.style ?? {}

  useEffect(() => {
    if (!attachMenu) return
    const onDown = (e: MouseEvent) => attachRef.current && !attachRef.current.contains(e.target as Node) && setAttachMenu(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [attachMenu])

  const send = () => {
    if (!state.to.length) return
    setSending(true)
    setTimeout(() => {
      db.insert(
        'outlook.emails',
        {
          id: uid('em'),
          folder: 'sent',
          from: { name: ME.name, email: ME.email },
          to: state.to,
          cc: state.cc,
          ...(state.bcc?.length ? { bcc: state.bcc } : {}),
          subject: state.subject || '(No subject)',
          body: state.body,
          date: new Date().toISOString(),
          read: true,
          attachments: state.attachments,
          replyTo: state.replyTo,
          sentBy: isAgent ? 'hworker' : undefined,
          ...(state.important ? { important: true } : {}),
          ...(state.style && (state.style.b || state.style.i || state.style.u) ? { style: state.style } : {}),
        },
        { prepend: true },
      )
      if (state.draftId) db.remove('outlook.emails', state.draftId)
      onClose()
    }, 450)
  }

  const saveDraft = () => {
    const rec = {
      folder: 'drafts',
      from: { name: ME.name, email: ME.email },
      to: state.to,
      cc: state.cc,
      bcc: state.bcc ?? [],
      subject: state.subject,
      body: state.body,
      date: new Date().toISOString(),
      read: true,
      attachments: state.attachments,
      replyTo: state.replyTo,
      important: !!state.important,
      style: state.style,
    }
    if (state.draftId && db.find('outlook.emails', state.draftId)) db.update('outlook.emails', state.draftId, rec)
    else db.insert('outlook.emails', { id: uid('em'), ...rec }, { prepend: true })
    toast({ appId: 'outlook', title: 'Draft saved', body: state.subject || '(No subject)' })
    onClose()
  }

  const discard = () => {
    if (state.draftId) db.remove('outlook.emails', state.draftId)
    onClose()
  }

  const insertAtCursor = (text: string) => {
    const el = bodyRef.current
    const pos = el ? el.selectionStart : 0
    const body = state.body.slice(0, pos) + text + state.body.slice(pos)
    onChange({ ...state, body })
    requestAnimationFrame(() => {
      if (el) {
        el.focus()
        el.selectionStart = el.selectionEnd = pos + text.length
      }
    })
  }

  const bullets = () => {
    const el = bodyRef.current
    const s = el?.selectionStart ?? 0
    const e = el?.selectionEnd ?? 0
    const lineStart = state.body.lastIndexOf('\n', s - 1) + 1
    const block = state.body.slice(lineStart, Math.max(e, s))
    const out = block
      .split('\n')
      .map((l) => (l.startsWith('• ') ? l.slice(2) : '• ' + l))
      .join('\n')
    onChange({ ...state, body: state.body.slice(0, lineStart) + out + state.body.slice(Math.max(e, s)) })
  }

  const addLocalFiles = (list: FileList | null) => {
    if (!list?.length) return
    const add = Array.from(list).map((f) => ({ name: f.name, size: fmtSize(f.size), kind: kindOf(f.name) }))
    onChange({ ...state, attachments: [...(state.attachments ?? []), ...add] })
    setAttachMenu(false)
  }

  const fmtBtn = (on: boolean | undefined) => `w-8 h-8 rounded flex items-center justify-center ${on ? 'bg-[#EBF3FC] text-[#0F6CBD]' : 'text-[#424242] hover:bg-[#F0F0F0]'}`

  return (
    <div className="flex-1 flex flex-col m-2 ml-0 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] overflow-hidden" data-agent="outlook-compose">
      <div className="flex items-center gap-1 px-3 h-11 border-b border-[#EDEBE9]">
        <button
          data-agent="outlook-send"
          onClick={send}
          disabled={!state.to.length || sending}
          className="flex items-center gap-1.5 h-8 pl-3 pr-3 rounded bg-[#0F6CBD] hover:bg-[#115EA3] disabled:bg-[#C8C6C4] text-white text-[13px] font-semibold"
        >
          <Send20Regular /> {sending ? 'Sending…' : 'Send'}
        </button>
        <div className="relative" ref={attachRef}>
          <button data-agent="outlook-attach" onClick={() => setAttachMenu((m) => !m)} className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]">
            <Attach20Regular className="text-[#0F6CBD]" /> Attach file <ChevronDown16Regular className="text-[#616161]" />
          </button>
          {attachMenu && (
            <div className="absolute z-50 left-0 top-9 w-[320px] bg-white rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black/5 py-1">
              <div className="px-3 py-1.5 text-[11.5px] font-semibold text-[#616161]">Suggested files</div>
              <div className="max-h-[320px] overflow-auto">
              {[...files].sort((x: any, y: any) => +new Date(y.modified ?? 0) - +new Date(x.modified ?? 0)).slice(0, 40).map((f: any) => (
                <button
                  key={f.id}
                  data-agent={`outlook-attach-file-${f.id}`}
                  onClick={() => {
                    onChange({ ...state, attachments: [...(state.attachments ?? []), { name: f.name, size: f.size, kind: f.kind, open: f.open }] })
                    setAttachMenu(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F5F5F5] text-left"
                >
                  <FileIcon kind={f.kind} />
                  <div className="min-w-0">
                    <div className="text-[13px] truncate">{f.name}</div>
                    <div className="text-[11px] text-[#616161]">{f.folder} · {f.size}</div>
                  </div>
                </button>
              ))}
              </div>
              <div className="h-px bg-[#EDEBE9] my-1" />
              <button className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#F5F5F5]" onClick={() => fileInput.current?.click()}>Browse this computer</button>
              <button className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#F5F5F5]" onClick={() => fileInput.current?.click()}>Upload and share</button>
            </div>
          )}
          <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { addLocalFiles(e.target.files); e.target.value = '' }} />
        </div>
        <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
        <button className={fmtBtn(style.b)} aria-pressed={!!style.b} title="Bold" onClick={() => onChange({ ...state, style: { ...style, b: !style.b } })}><TextBold20Regular /></button>
        <button className={fmtBtn(style.i)} aria-pressed={!!style.i} title="Italic" onClick={() => onChange({ ...state, style: { ...style, i: !style.i } })}><TextItalic20Regular /></button>
        <button className={fmtBtn(style.u)} aria-pressed={!!style.u} title="Underline" onClick={() => onChange({ ...state, style: { ...style, u: !style.u } })}><TextUnderline20Regular /></button>
        <button className={fmtBtn(false)} title="Bullets" onClick={bullets}><TextBulletList20Regular /></button>
        <button className={fmtBtn(false)} title="Insert pictures" onClick={() => setAttachMenu(true)}><Image20Regular /></button>
        <div className="relative" ref={emojiMenu.ref}>
          <button className={fmtBtn(emojiMenu.open)} title="Emoji" onClick={emojiMenu.toggle}><Emoji20Regular /></button>
          {emojiMenu.open && (
            <MenuPanel className="left-0 top-9 w-[220px] p-2">
              <div className="grid grid-cols-5 gap-1">
                {EMOJIS.map((em) => (
                  <button key={em} className="h-9 rounded hover:bg-[#F5F5F5] text-[18px]" onClick={() => { insertAtCursor(em); emojiMenu.close() }}>{em}</button>
                ))}
              </div>
            </MenuPanel>
          )}
        </div>
        <button className={fmtBtn(state.important)} aria-pressed={!!state.important} title="High importance" data-agent="outlook-compose-importance" onClick={() => onChange({ ...state, important: !state.important })}><Important20Regular /></button>
        <div className="flex-1" />
        <button data-agent="outlook-save-draft" onClick={saveDraft} title="Save draft" className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]">
          <Save20Regular /> Save draft
        </button>
        <button data-agent="outlook-discard" onClick={discard} className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]" aria-label="Discard">
          <Delete20Regular /> Discard
        </button>
      </div>
      <div className="px-4">
        <div className="flex items-start gap-2 border-b border-[#EDEBE9] py-1.5">
          <AddressBook label="To" exclude={state.to} onPick={(email) => onChange({ ...state, to: [...state.to, email] })} />
          <RecipientInput value={state.to} onChange={(to) => onChange({ ...state, to })} agent="outlook-compose-to" placeholder="To" />
          {!showCc && (
            <button className="text-[13px] text-[#242424] hover:underline mt-1.5" onClick={() => setShowCc(true)} data-agent="outlook-show-cc">
              Cc
            </button>
          )}
          {!showBcc && (
            <button className="text-[13px] text-[#242424] hover:underline mt-1.5" onClick={() => setShowBcc(true)} data-agent="outlook-show-bcc">
              Bcc
            </button>
          )}
        </div>
        {showCc && (
          <div className="flex items-start gap-2 border-b border-[#EDEBE9] py-1.5">
            <AddressBook label="Cc" exclude={state.cc} onPick={(email) => onChange({ ...state, cc: [...state.cc, email] })} />
            <RecipientInput value={state.cc} onChange={(cc) => onChange({ ...state, cc })} agent="outlook-compose-cc" placeholder="Cc" />
          </div>
        )}
        {showBcc && (
          <div className="flex items-start gap-2 border-b border-[#EDEBE9] py-1.5">
            <AddressBook label="Bcc" exclude={state.bcc ?? []} onPick={(email) => onChange({ ...state, bcc: [...(state.bcc ?? []), email] })} />
            <RecipientInput value={state.bcc ?? []} onChange={(bcc) => onChange({ ...state, bcc })} agent="outlook-compose-bcc" placeholder="Bcc" />
          </div>
        )}
        <input
          data-agent="outlook-compose-subject"
          aria-label="Subject"
          value={state.subject}
          onChange={(e) => onChange({ ...state, subject: e.target.value })}
          placeholder="Add a subject"
          className="w-full h-10 outline-none text-[14px] border-b border-[#EDEBE9]"
        />
      </div>
      {state.important && (
        <div className="mx-4 mt-2 px-2 py-1 rounded bg-[#FDE7E9] text-[12px] text-[#C50F1F] flex items-center gap-1.5"><Important16Filled /> This message will be sent with High importance.</div>
      )}
      {state.attachments && state.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {state.attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 h-11 pl-2 pr-1 rounded border border-[#E1DFDD] bg-white w-[230px]">
              <FileIcon kind={a.kind} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] truncate">{a.name}</div>
                <div className="text-[11px] text-[#616161]">{a.size}</div>
              </div>
              <button className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center" aria-label={`Remove ${a.name}`} onClick={() => onChange({ ...state, attachments: state.attachments!.filter((_, j) => j !== i) })}>
                <Dismiss20Regular className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={bodyRef}
        data-agent="outlook-compose-body"
        data-agent-insert="start"
        aria-label="Message body"
        value={state.body}
        onChange={(e) => onChange({ ...state, body: e.target.value })}
        className="flex-1 w-full resize-none outline-none px-4 py-3 text-[14px] leading-[1.55] text-[#242424]"
        style={{ fontFamily: 'Aptos, Calibri, var(--font-win)', fontWeight: style.b ? 600 : undefined, fontStyle: style.i ? 'italic' : undefined, textDecoration: style.u ? 'underline' : undefined }}
        placeholder="Type / to insert files and more"
      />
      <div className="px-4 py-1.5 text-[11.5px] text-[#616161] border-t border-[#EDEBE9]">Draft saved at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
    </div>
  )
}

/* ─────────────────────────── Reading pane ─────────────────────────── */

interface MailActions {
  toggleRead: (e: Email) => void
  toggleFlag: (e: Email) => void
  togglePin: (e: Email) => void
  move: (e: Email, folder: string) => void
  snooze: (e: Email, when: Date) => void
  setCategory: (e: Email, c?: string) => void
}

function ReadingPane({ email, onReply, deskOpen, actions }: { email?: Email; onReply: (mode: ComposeState['mode']) => void; deskOpen: (appId: string, params?: any) => void; actions: MailActions }) {
  const more = useMenu()
  const { toast } = useDesk()
  if (!email)
    return (
      <div className="flex-1 flex flex-col items-center justify-center m-2 ml-0 bg-white rounded-lg text-[#616161]">
        <svg width="120" height="90" viewBox="0 0 120 90" className="mb-4 opacity-80"><rect x="10" y="20" width="100" height="62" rx="6" fill="#EBF3FC" /><path d="M10 26l50 32 50-32" fill="none" stroke="#0F6CBD" strokeWidth="2" /><circle cx="94" cy="20" r="12" fill="#0F6CBD" /><path d="M89 20l3.5 3.5L99 17" stroke="#fff" strokeWidth="2" fill="none" /></svg>
        <div className="text-[15px] font-semibold text-[#242424]">Select an item to read</div>
        <div className="text-[13px] mt-1">Nothing is selected</div>
      </div>
    )
  const p = personByEmail(email.from.email)
  const st = email.style ?? {}
  return (
    <div className="flex-1 min-w-0 flex flex-col m-2 ml-0 overflow-hidden">
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)]" data-agent="outlook-reading-pane">
        <div className="px-6 pt-5 pb-2 flex items-start gap-2">
          <h1 className="text-[20px] font-semibold text-[#242424] leading-tight flex-1" data-agent="outlook-reading-subject">
            {email.subject}
          </h1>
          {email.important && <Important16Filled className="text-[#C50F1F] mt-1.5 shrink-0" />}
          {email.category && (
            <span className="inline-flex items-center h-5 mt-0.5 px-1.5 rounded text-[11px] shrink-0" style={{ background: CATEGORY_COLORS[email.category]?.[0] ?? '#F3F2F1', color: CATEGORY_COLORS[email.category]?.[1] ?? '#605E5C' }}>
              {email.category}
            </span>
          )}
          {email.flagged && <span className="inline-flex items-center gap-1 h-5 mt-0.5 px-1.5 rounded text-[11px] bg-[#FDE7E9] text-[#C50F1F] shrink-0"><Flag16Filled className="w-3 h-3" /> Flagged</span>}
          {email.sentBy === 'hworker' && <HWorkerBadge />}
        </div>
        <div className="mx-4 mb-3 p-3 rounded-lg flex items-start gap-3">
          <Avatar email={email.from.email} name={email.from.name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#242424]">{email.from.name}</span>
              <span className="text-[12.5px] text-[#616161] truncate">&lt;{email.from.email}&gt;</span>
            </div>
            <div className="text-[12.5px] text-[#616161] truncate">
              To: {email.to.map((t) => personByEmail(t)?.name ?? t).join('; ')}
              {email.cc?.length ? <span>  Cc: {email.cc.map((t) => personByEmail(t)?.name ?? t).join('; ')}</span> : null}
              {email.bcc?.length ? <span>  Bcc: {email.bcc.map((t) => personByEmail(t)?.name ?? t).join('; ')}</span> : null}
            </div>
            {p?.title && !p.external && <div className="text-[11.5px] text-[#8A8886]">{p.title} · {p.dept}</div>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center">
              <button data-agent="outlook-reply" aria-label="Reply" onClick={() => onReply('reply')} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]"><ArrowReply20Regular /></button>
              <button data-agent="outlook-reply-all" aria-label="Reply all" onClick={() => onReply('replyAll')} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]"><ArrowReplyAll20Regular /></button>
              <button data-agent="outlook-forward" aria-label="Forward" onClick={() => onReply('forward')} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]"><ArrowForward20Regular /></button>
              <div className="relative" ref={more.ref}>
                <button data-agent="outlook-reading-more" aria-label="More actions" onClick={more.toggle} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]"><MoreHorizontal20Regular /></button>
                {more.open && (
                  <MenuPanel className="right-0 top-9 w-[230px]">
                    <MenuItem icon={email.read ? <MailUnread20Regular /> : <MailRead20Regular />} label={email.read ? 'Mark as unread' : 'Mark as read'} onClick={() => { actions.toggleRead(email); more.close() }} />
                    <MenuItem icon={<Flag20Regular />} label={email.flagged ? 'Clear flag' : 'Flag'} onClick={() => { actions.toggleFlag(email); more.close() }} />
                    <MenuItem icon={<Pin20Regular />} label={email.pinned ? 'Unpin' : 'Pin'} onClick={() => { actions.togglePin(email); more.close() }} />
                    <MenuSep />
                    <MenuItem icon={<Archive20Regular />} label="Archive" onClick={() => { actions.move(email, 'archive'); more.close() }} />
                    <MenuItem icon={<Delete20Regular />} label="Delete" onClick={() => { actions.move(email, 'deleted'); more.close() }} />
                    <MenuItem icon={<ShieldError20Regular />} label={email.folder === 'junk' ? 'Not junk' : 'Move to Junk'} onClick={() => { actions.move(email, email.folder === 'junk' ? 'inbox' : 'junk'); more.close() }} />
                    <MenuSep />
                    <MenuItem icon={<Copy20Regular />} label="Copy subject" onClick={() => { copyText(email.subject); toast({ appId: 'outlook', title: 'Copied to clipboard', body: email.subject }); more.close() }} />
                    <MenuItem icon={<Print20Regular />} label="Print" onClick={() => { toast({ appId: 'outlook', title: 'Sent to printer', body: `${email.subject} — Microsoft Print to PDF` }); more.close() }} />
                  </MenuPanel>
                )}
              </div>
            </div>
            <span className="text-[12px] text-[#616161]">{new Date(email.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>
        {email.attachments && email.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-7 pb-3">
            {email.attachments.map((a, i) => (
              <button
                key={i}
                data-agent={`outlook-attachment-${email.id}-${i}`}
                onClick={() => (a.open ? deskOpen(a.open.appId, a.open.params) : toast({ appId: 'outlook', title: `${a.name}`, body: 'Preview isn’t available for this file type. Download to view it.' }))}
                className="flex items-center gap-2.5 h-12 pl-2.5 pr-3 rounded-md border border-[#E1DFDD] hover:bg-[#FAF9F8] w-[240px] text-left"
              >
                <FileIcon kind={a.kind} />
                <div className="min-w-0">
                  <div className="text-[12.5px] truncate text-[#242424]">{a.name}</div>
                  <div className="text-[11px] text-[#616161]">{a.size}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div
          className="px-7 pb-8 text-[14px] leading-[1.6] text-[#242424] whitespace-pre-wrap"
          style={{ fontFamily: 'Aptos, Calibri, var(--font-win)', fontWeight: st.b ? 600 : undefined, fontStyle: st.i ? 'italic' : undefined, textDecoration: st.u ? 'underline' : undefined }}
          data-agent="outlook-reading-body"
        >
          {email.body}
        </div>
        {email.folder !== 'sent' && email.folder !== 'drafts' && (
          <div className="px-7 pb-6 flex gap-2">
            <button onClick={() => onReply('reply')} className="flex items-center gap-1.5 h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]"><ArrowReply20Regular className="text-[#0F6CBD]" /> Reply</button>
            <button onClick={() => onReply('replyAll')} className="flex items-center gap-1.5 h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]"><ArrowReplyAll20Regular className="text-[#0F6CBD]" /> Reply all</button>
            <button onClick={() => onReply('forward')} className="flex items-center gap-1.5 h-8 px-3 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]"><ArrowForward20Regular className="text-[#0F6CBD]" /> Forward</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── Mail view ─────────────────────────── */

export function MailView({ params, nonce, search, onNav }: { params: any; nonce: number; search: string; onNav?: (view: string, extra?: any) => void }) {
  const emails = useCollection<Email>('outlook.emails')
  const customFolders = useCollection<{ id: string; name: string }>('outlook.folders')
  const groups = useCollection<any>('teams.teams')
  const { open, toast, isAgent } = useDesk()
  const [prefs, setPrefs] = usePrefs()
  const [folder, setFolder] = useState<string>('inbox')
  const [folderSrc, setFolderSrc] = useState<'fav' | 'acct'>('fav')
  const [selected, setSelected] = useState<string | null>(null)
  const [compose, setComposeRaw] = useState<ComposeState | null>(null)
  const setCompose = (c: ComposeState | null) => setComposeRaw(c ? { ...c, key: c.key ?? uid('draft') } : null)
  const closeCompose = (key?: string) => setComposeRaw((c) => (!c || !key || c.key === key ? null : c))
  const [pivot, setPivot] = useState<'focused' | 'other'>('focused')
  const catMenu = useMenu()
  const [collapsed, setCollapsed] = useState(false)
  const [acctOpen, setAcctOpen] = useState(true)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [ribbonTab, setRibbonTab] = useState<'Home' | 'View' | 'Help'>('Home')
  const [qf, setQf] = useState<QuickFilter>('all')
  const [sort, setSort] = useState<SortKey>('date')
  const [newFolder, setNewFolder] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [tick, setTick] = useState(0)
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const filterMenu = useMenu()
  const listRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!ctx) return
    const onDown = (e: MouseEvent) => ctxRef.current && !ctxRef.current.contains(e.target as Node) && setCtx(null)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [ctx])

  // deep links
  useEffect(() => {
    if (!params) return
    if (params.folder) setFolder(params.folder)
    if (params.emailId) {
      setSelected(params.emailId)
      const e = db.find<Email>('outlook.emails', params.emailId)
      if (e) {
        setFolder(e.folder)
        if (e.focused === false) setPivot('other')
        else setPivot('focused')
      }
    }
    if (params.compose) setCompose({ mode: 'new', to: [], cc: [], subject: '', body: '', attachments: [], ...params.compose })
  }, [nonce])

  const extraFolders = [...DEFAULT_FOLDERS, ...customFolders.map((f) => f.name).filter((n) => !DEFAULT_FOLDERS.includes(n))]
  const favs = [...DEFAULT_FAVS, ...(prefs.favorites ?? []).filter((f) => !DEFAULT_FAVS.includes(f))]

  const list = useMemo(() => {
    const now = Date.now()
    let l: Email[]
    if (search) {
      const q = search.toLowerCase()
      l = emails.filter((e) => e.folder !== 'deleted' && (e.subject + ' ' + e.from.name + ' ' + e.body + ' ' + e.from.email).toLowerCase().includes(q))
    } else if (folder === 'scheduled') {
      l = emails.filter((e) => isSnoozed(e, now))
    } else {
      l = emails.filter((e) => e.folder === folder)
      if (folder === 'inbox') l = l.filter((e) => (pivot === 'focused' ? e.focused !== false : e.focused === false) && !isSnoozed(e, now))
    }
    if (qf === 'unread') l = l.filter((e) => !e.read)
    if (qf === 'flagged') l = l.filter((e) => e.flagged)
    if (qf === 'tome') l = l.filter((e) => e.to.includes(ME.email))
    if (qf === 'files') l = l.filter((e) => e.attachments?.length)
    if (qf === 'mentions') l = l.filter((e) => /@alex|alex/i.test(e.body))
    const cmp = (a: Email, b: Email) =>
      sort === 'from' ? a.from.name.localeCompare(b.from.name) : sort === 'subject' ? a.subject.localeCompare(b.subject) : +new Date(b.date) - +new Date(a.date)
    return l.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || cmp(a, b))
  }, [emails, folder, pivot, search, qf, sort, tick])

  const sel = emails.find((e) => e.id === selected)
  const unread = (f: string) => emails.filter((e) => e.folder === f && !e.read).length
  const countFor = (id: string) => (id === 'drafts' ? emails.filter((e) => e.folder === 'drafts').length : id === 'scheduled' ? emails.filter((e) => isSnoozed(e, Date.now())).length : unread(id))

  const select = (id: string) => {
    setCompose(null)
    setSelected(id)
    const e = emails.find((x) => x.id === id)
    if (e && e.folder === 'drafts') {
      setCompose({ mode: 'new', to: e.to ?? [], cc: e.cc ?? [], bcc: e.bcc ?? [], subject: e.subject ?? '', body: e.body ?? '', attachments: e.attachments ?? [], replyTo: e.replyTo, draftId: e.id, important: e.important, style: e.style })
      return
    }
    if (e && !e.read) setTimeout(() => db.update('outlook.emails', id, { read: true }), 400)
  }

  const reply = (mode: ComposeState['mode']) => {
    if (!sel) return
    const quoted = `\n\n________________________________\nFrom: ${sel.from.name} <${sel.from.email}>\nSent: ${new Date(sel.date).toLocaleString('en-US')}\nTo: ${sel.to.join('; ')}\nSubject: ${sel.subject}\n\n${sel.body}`
    const isFwd = mode === 'forward'
    setCompose({
      mode,
      to: isFwd ? [] : [sel.from.email].filter((e) => e !== ME.email),
      cc: mode === 'replyAll' ? [...sel.to, ...(sel.cc ?? [])].filter((e) => e !== ME.email && e !== sel.from.email) : [],
      subject: (isFwd ? 'FW: ' : 'RE: ') + sel.subject.replace(/^(RE|FW):\s*/i, ''),
      body: EMAIL_SIGNATURE + quoted,
      replyTo: sel.id,
      attachments: isFwd ? sel.attachments ?? [] : [],
    })
  }

  const actions: MailActions = {
    toggleRead: (e) => db.update('outlook.emails', e.id, { read: !e.read }),
    toggleFlag: (e) => db.update('outlook.emails', e.id, { flagged: !e.flagged }),
    togglePin: (e) => db.update('outlook.emails', e.id, { pinned: !e.pinned }),
    move: (e, f) => {
      if (e.folder === f) return
      db.update('outlook.emails', e.id, { folder: f, snoozedUntil: undefined })
      if (selected === e.id) setSelected(null)
      if (!isAgent) toast({ appId: 'outlook', title: `Moved to ${folderName(f)}`, body: e.subject })
    },
    snooze: (e, when) => {
      db.update('outlook.emails', e.id, { snoozedUntil: when.toISOString() })
      if (selected === e.id) setSelected(null)
      toast({ appId: 'outlook', title: 'Snoozed', body: `“${e.subject}” will return ${when.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` })
    },
    setCategory: (e, c) => db.update('outlook.emails', e.id, { category: c }),
  }

  const pickFolder = (id: string, src: 'fav' | 'acct') => {
    setFolder(id)
    setFolderSrc(src)
    setSelected(null)
    setCompose(null)
  }

  const createFolder = (name: string) => {
    const n = name.trim()
    setNewFolder(null)
    if (!n || extraFolders.includes(n) || FOLDERS.some((f) => f.name.toLowerCase() === n.toLowerCase())) return
    db.insert('outlook.folders', { id: uid('fld'), name: n })
  }

  const toggleFav = () => {
    if (DEFAULT_FAVS.includes(folder)) return
    const cur = prefs.favorites ?? []
    setPrefs({ favorites: cur.includes(folder) ? cur.filter((f) => f !== folder) : [...cur, folder] })
  }

  const markAllRead = () => {
    for (const e of list) if (!e.read) db.update('outlook.emails', e.id, { read: true })
  }
  const emptyFolder = () => {
    for (const e of emails.filter((x) => x.folder === folder)) db.remove('outlook.emails', e.id)
    setSelected(null)
  }

  const onDropTo = (f: string) => (ev: DragEvent) => {
    ev.preventDefault()
    setDropTarget(null)
    const id = ev.dataTransfer.getData('text/x-outlook-email')
    const e = id && db.find<Email>('outlook.emails', id)
    if (e) actions.move(e, f)
  }
  const dropProps = (f: string) => ({
    onDragOver: (ev: DragEvent) => {
      if (ev.dataTransfer.types.includes('text/x-outlook-email')) {
        ev.preventDefault()
        setDropTarget(f)
      }
    },
    onDragLeave: () => setDropTarget((d) => (d === f ? null : d)),
    onDrop: onDropTo(f),
    dropping: dropTarget === f,
  })

  const moveMenuItems = (e: Email | undefined, close: () => void) => (
    <>
      <MenuHeader>Move to</MenuHeader>
      {['inbox', 'archive', 'deleted', 'junk'].map((f) => (
        <MenuItem key={f} icon={<Folder20Regular />} label={folderName(f)} disabled={!e || e.folder === f} agent={`outlook-moveto-${f}`} onClick={() => { e && actions.move(e, f); close() }} />
      ))}
      <MenuSep />
      {extraFolders.map((f) => (
        <MenuItem key={f} icon={<Folder20Regular />} label={f} disabled={!e || e.folder === f} onClick={() => { e && actions.move(e, f); close() }} />
      ))}
      <MenuSep />
      <MenuItem icon={<FolderAdd20Regular />} label="Create new folder" onClick={() => { setAcctOpen(true); setCollapsed(false); setNewFolder(''); close() }} />
    </>
  )

  const density = prefs.density === 'compact'
  let lastGroup = ''
  const ctxEmail = ctx ? emails.find((e) => e.id === ctx.id) : undefined
  const headerTitle = folder === 'scheduled' ? 'Scheduled' : FOLDERS.find((f) => f.id === folder)?.name ?? folder

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ribbon */}
      <div className="shrink-0 mx-2 mt-1 mb-1 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-4 px-3 h-9 text-[13px]">
          {(['Home', 'View', 'Help'] as const).map((t) => (
            <button key={t} onClick={() => setRibbonTab(t)} className={`h-full relative ${ribbonTab === t ? 'font-semibold text-[#242424]' : 'text-[#424242] hover:text-[#242424]'}`}>
              {t}
              {ribbonTab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full bg-[#0F6CBD]" />}
            </button>
          ))}
          {prefs.autoReply && <span className="ml-auto text-[12px] text-[#8A5A00] bg-[#FFF4CE] px-2 h-6 rounded flex items-center">Automatic replies are on</span>}
        </div>
        {ribbonTab === 'Home' && (
          <div className="flex items-center px-2 h-11 border-t border-[#F0F0F0]">
            <RibbonButton
              primary
              icon={MailUnread20Regular}
              label="New mail"
              agent="outlook-new-mail"
              onClick={() => setCompose({ mode: 'new', to: [], cc: [], subject: '', body: EMAIL_SIGNATURE, attachments: [] })}
              menu={(close) => (
                <>
                  <MenuItem icon={<MailUnread20Regular />} label="Mail" onClick={() => { setCompose({ mode: 'new', to: [], cc: [], subject: '', body: EMAIL_SIGNATURE, attachments: [] }); close() }} />
                  <MenuItem icon={<CalendarLtr20Regular />} label="Event" onClick={() => { onNav?.('calendar', { newEvent: {} }); close() }} />
                  <MenuItem icon={<FolderAdd20Regular />} label="Folder" onClick={() => { setAcctOpen(true); setCollapsed(false); setNewFolder(''); close() }} />
                </>
              )}
            />
            <RibbonButton icon={Delete20Regular} label="Delete" agent="outlook-delete" disabled={!sel} onClick={() => sel && (db.update('outlook.emails', sel.id, { folder: 'deleted' }), setSelected(null))} />
            <RibbonButton icon={Archive20Regular} label="Archive" agent="outlook-archive" disabled={!sel} onClick={() => sel && (db.update('outlook.emails', sel.id, { folder: 'archive' }), setSelected(null))} />
            <RibbonButton
              icon={ShieldError20Regular}
              label="Report"
              chevron
              agent="outlook-report"
              disabled={!sel}
              menu={(close) => (
                <>
                  <MenuItem icon={<ShieldError20Regular />} label="Report phishing" onClick={() => { if (sel) { db.update('outlook.emails', sel.id, { folder: 'deleted' }); setSelected(null); toast({ appId: 'outlook', title: 'Reported as phishing', body: 'Thanks — the message was sent to Microsoft and moved to Deleted Items.' }) } close() }} />
                  <MenuItem icon={<ShieldError20Regular />} label={sel?.folder === 'junk' ? 'Not junk' : 'Report junk'} onClick={() => { sel && actions.move(sel, sel.folder === 'junk' ? 'inbox' : 'junk'); close() }} />
                </>
              )}
            />
            <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
            <RibbonButton icon={FolderMail20Regular} label="Move to" chevron agent="outlook-move" disabled={!sel} menu={(close) => moveMenuItems(sel, close)} />
            <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
            <RibbonButton icon={ArrowReply20Regular} label="Reply" disabled={!sel} onClick={() => reply('reply')} />
            <RibbonButton icon={ArrowReplyAll20Regular} label="Reply all" disabled={!sel} onClick={() => reply('replyAll')} />
            <RibbonButton icon={ArrowForward20Regular} label="Forward" disabled={!sel} onClick={() => reply('forward')} />
            <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
            <RibbonButton icon={sel?.read ? MailUnread20Regular : MailRead20Regular} label={sel?.read === false ? 'Read' : 'Unread'} agent="outlook-mark-read" disabled={!sel} onClick={() => sel && db.update('outlook.emails', sel.id, { read: !sel.read })} />
            <div className="relative" ref={catMenu.ref}>
              <RibbonButton icon={Tag20Regular} label="Categorize" chevron agent="outlook-categorize" disabled={!sel} onClick={catMenu.toggle} />
              {catMenu.open && sel && (
                <div className="absolute z-50 top-9 left-0 w-[200px] bg-white rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black/5 py-1">
                  {Object.entries(CATEGORY_COLORS).map(([c, [bg, fg]]) => (
                    <button
                      key={c}
                      data-agent={`outlook-category-${c.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => {
                        db.update('outlook.emails', sel.id, { category: sel.category === c ? undefined : c })
                        catMenu.close()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-[#F5F5F5]"
                    >
                      <Tag20Regular style={{ color: fg, background: bg }} className="rounded" /> {c}
                      {sel.category === c && <span className="ml-auto text-[#0F6CBD]">✓</span>}
                    </button>
                  ))}
                  {sel.category && (
                    <>
                      <div className="h-px bg-[#EDEBE9] my-1" />
                      <button onClick={() => { db.update('outlook.emails', sel.id, { category: undefined }); catMenu.close() }} className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#F5F5F5]">Clear categories</button>
                    </>
                  )}
                </div>
              )}
            </div>
            <RibbonButton icon={Flag20Regular} label="Flag" agent="outlook-flag" disabled={!sel} onClick={() => sel && db.update('outlook.emails', sel.id, { flagged: !sel.flagged })} />
            <RibbonButton icon={Pin20Regular} label="Pin" agent="outlook-pin" disabled={!sel} onClick={() => sel && db.update('outlook.emails', sel.id, { pinned: !sel.pinned })} />
            <RibbonButton
              icon={Clock20Regular}
              label="Snooze"
              chevron
              agent="outlook-snooze"
              disabled={!sel}
              menu={(close) => (
                <>
                  <MenuHeader>Snooze until</MenuHeader>
                  {snoozeTimes().map((s) => (
                    <MenuItem key={s.id} label={s.label} hint={s.hint} agent={`outlook-snooze-${s.id}`} onClick={() => { sel && actions.snooze(sel, s.when); close() }} />
                  ))}
                  {sel?.snoozedUntil && (
                    <>
                      <MenuSep />
                      <MenuItem label="Unsnooze" onClick={() => { sel && db.update('outlook.emails', sel.id, { snoozedUntil: undefined }); close() }} />
                    </>
                  )}
                </>
              )}
            />
            <RibbonButton
              icon={ArrowSync20Regular}
              label=""
              title={syncing ? 'Syncing…' : 'Sync'}
              agent="outlook-sync"
              onClick={() => {
                setSyncing(true)
                setTimeout(() => {
                  setSyncing(false)
                  setTick((x) => x + 1)
                }, 900)
              }}
            />
            <RibbonButton
              icon={MoreHorizontal20Regular}
              label=""
              title="More options"
              agent="outlook-ribbon-more"
              menu={(close) => (
                <>
                  <MenuItem icon={<MailAllRead20Regular />} label="Mark all as read" onClick={() => { markAllRead(); close() }} />
                  {(folder === 'deleted' || folder === 'junk') && <MenuItem icon={<Delete20Regular />} label={`Empty ${folderName(folder)}`} danger onClick={() => { emptyFolder(); close() }} />}
                  <MenuItem icon={<Print20Regular />} label="Print" disabled={!sel} onClick={() => { sel && toast({ appId: 'outlook', title: 'Sent to printer', body: sel.subject }); close() }} />
                  <MenuSep />
                  <MenuItem icon={<Settings20Regular />} label="Settings" onClick={() => { onNav?.('settings'); close() }} />
                </>
              )}
            />
            {syncing && <span className="ml-1 text-[12px] text-[#616161]">Syncing…</span>}
          </div>
        )}
        {ribbonTab === 'View' && (
          <div className="flex items-center gap-1 px-2 h-11 border-t border-[#F0F0F0] text-[13px]">
            <span className="px-2 text-[#616161]">Density</span>
            {(['roomy', 'compact'] as const).map((d) => (
              <button key={d} data-agent={`outlook-density-${d}`} onClick={() => setPrefs({ density: d })} className={`h-8 px-2.5 rounded ${prefs.density === d ? 'bg-[#EBF3FC] text-[#0F6CBD] font-semibold' : 'hover:bg-[#F0F0F0]'}`}>
                {d === 'roomy' ? 'Roomy' : 'Compact'}
              </button>
            ))}
            <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
            <button onClick={() => setPrefs({ preview: !prefs.preview })} className={`h-8 px-2.5 rounded ${prefs.preview ? 'bg-[#EBF3FC] text-[#0F6CBD]' : 'hover:bg-[#F0F0F0]'}`}>Message preview</button>
            <button onClick={() => setPrefs({ senderImages: !prefs.senderImages })} className={`h-8 px-2.5 rounded ${prefs.senderImages ? 'bg-[#EBF3FC] text-[#0F6CBD]' : 'hover:bg-[#F0F0F0]'}`}>Sender images</button>
            <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
            <span className="px-2 text-[#616161]">Sort</span>
            {(['date', 'from', 'subject'] as const).map((s) => (
              <button key={s} onClick={() => setSort(s)} className={`h-8 px-2.5 rounded ${sort === s ? 'bg-[#EBF3FC] text-[#0F6CBD] font-semibold' : 'hover:bg-[#F0F0F0]'}`}>
                {s === 'date' ? 'Date' : s === 'from' ? 'From' : 'Subject'}
              </button>
            ))}
            <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
            <button onClick={() => setCollapsed((c) => !c)} className="h-8 px-2.5 rounded hover:bg-[#F0F0F0]">{collapsed ? 'Show folder pane' : 'Hide folder pane'}</button>
            <button onClick={() => onNav?.('settings')} className="h-8 px-2.5 rounded hover:bg-[#F0F0F0] flex items-center gap-1"><Settings20Regular className="text-[#0F6CBD]" /> View settings</button>
          </div>
        )}
        {ribbonTab === 'Help' && (
          <div className="flex items-center gap-1 px-2 h-11 border-t border-[#F0F0F0] text-[13px]">
            <button onClick={() => open('edge', { q: 'Outlook on the web help' })} className="h-8 px-2.5 rounded hover:bg-[#F0F0F0] flex items-center gap-1.5"><QuestionCircle20Regular className="text-[#0F6CBD]" /> Help</button>
            <button onClick={() => onNav?.('tips')} className="h-8 px-2.5 rounded hover:bg-[#F0F0F0] flex items-center gap-1.5"><Lightbulb20Regular className="text-[#0F6CBD]" /> What’s new</button>
            <button onClick={() => toast({ appId: 'outlook', title: 'Thanks for your feedback', body: 'Your feedback was sent to Microsoft.' })} className="h-8 px-2.5 rounded hover:bg-[#F0F0F0] flex items-center gap-1.5"><PersonFeedback20Regular className="text-[#0F6CBD]" /> Feedback</button>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 flex">
        {/* folder pane */}
        {!collapsed && (
          <div className="w-[220px] shrink-0 overflow-auto py-1 text-[13px]">
            <button className="flex items-center gap-1 px-3 h-8 font-semibold w-full hover:bg-[#E9E9E9] rounded" onClick={() => setCollapsed(true)}>
              <ChevronDown16Regular /> Favorites
            </button>
            {[
              ['inbox', 'Inbox', MailInbox20Regular],
              ['sent', 'Sent Items', Send20Regular],
              ['drafts', 'Drafts', Drafts20Regular],
            ].map(([id, name, Icon]: any) => (
              <FolderRow key={'fav-' + id} id={id} name={name} Icon={Icon} active={folder === id && !search && folderSrc === 'fav'} count={id === 'drafts' ? emails.filter((e) => e.folder === 'drafts').length : unread(id)} onClick={() => pickFolder(id, 'fav')} agent={`outlook-folder-${id}`} {...dropProps(id)} />
            ))}
            {favs
              .filter((f) => !DEFAULT_FAVS.includes(f))
              .map((f) => {
                const def = FOLDERS.find((x) => x.id === f)
                return <FolderRow key={'fav-' + f} id={f} name={def?.name ?? f} Icon={def?.icon ?? Folder20Regular} active={folder === f && !search && folderSrc === 'fav'} count={countFor(f)} onClick={() => pickFolder(f, 'fav')} {...dropProps(f)} />
              })}
            <button className="flex items-center gap-1 px-3 h-8 font-semibold mt-2 w-full hover:bg-[#E9E9E9] rounded" onClick={() => setAcctOpen((o) => !o)}>
              {acctOpen ? <ChevronDown16Regular /> : <ChevronRight16Regular />} <span className="truncate">{ME.email}</span>
            </button>
            {acctOpen && (
              <>
                {FOLDERS.map((f) => (
                  <FolderRow key={f.id} id={f.id} name={f.name} Icon={f.icon} active={folder === f.id && !search && folderSrc === 'acct'} count={f.id === 'drafts' ? emails.filter((e) => e.folder === 'drafts').length : f.id === 'inbox' ? unread('inbox') : f.id === 'scheduled' ? countFor('scheduled') : 0} onClick={() => pickFolder(f.id, 'acct')} {...dropProps(f.id)} />
                ))}
                {extraFolders.map((n) => (
                  <FolderRow key={n} id={n} name={n} Icon={Folder20Regular} active={folder === n && !search && folderSrc === 'acct'} count={unread(n)} onClick={() => pickFolder(n, 'acct')} {...dropProps(n)} />
                ))}
                {newFolder !== null ? (
                  <div className="pl-8 pr-3 py-1">
                    <input
                      autoFocus
                      data-agent="outlook-new-folder-name"
                      aria-label="New folder name"
                      value={newFolder}
                      onChange={(e) => setNewFolder(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createFolder(newFolder)
                        if (e.key === 'Escape') setNewFolder(null)
                      }}
                      onBlur={() => createFolder(newFolder)}
                      placeholder="Folder name"
                      className="w-full h-7 px-2 rounded border border-[#0F6CBD] outline-none text-[13px] bg-white"
                    />
                  </div>
                ) : (
                  <button className="px-9 h-8 text-[#0F6CBD] hover:underline" data-agent="outlook-create-folder" onClick={() => setNewFolder('')}>Create new folder</button>
                )}
              </>
            )}
            <button className="flex items-center gap-1 px-3 h-8 font-semibold mt-2 text-[#424242] w-full hover:bg-[#E9E9E9] rounded" onClick={() => setGroupsOpen((o) => !o)}>
              {groupsOpen ? <ChevronDown16Regular /> : <ChevronRight16Regular />} Groups
            </button>
            {groupsOpen &&
              groups.map((g) => (
                <button key={g.id} onClick={() => onNav?.('groups', { groupId: g.id })} className="w-full flex items-center gap-2.5 pl-8 pr-3 h-8 rounded text-left hover:bg-[#E9E9E9]">
                  <span className="w-5 h-5 rounded text-white text-[9px] font-semibold flex items-center justify-center shrink-0" style={{ background: g.color }}>{g.initials}</span>
                  <span className="flex-1 truncate">{g.name}</span>
                </button>
              ))}
          </div>
        )}
        {collapsed && (
          <button className="w-8 shrink-0 hover:bg-[#E9E9E9]" aria-label="Expand folder pane" onClick={() => setCollapsed(false)}>
            <ChevronRight16Regular />
          </button>
        )}
        {/* message list */}
        <div ref={listRef} className="relative w-[370px] shrink-0 flex flex-col m-2 mx-2 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] overflow-hidden">
          <div className="flex items-center gap-1 px-3 h-11 border-b border-[#F0F0F0] shrink-0">
            {search ? (
              <span className="text-[14px] font-semibold">Results for “{search}”</span>
            ) : folder === 'inbox' ? (
              <>
                {(['focused', 'other'] as const).map((p) => (
                  <button key={p} data-agent={`outlook-pivot-${p}`} onClick={() => setPivot(p)} className={`relative h-full px-2 text-[14px] ${pivot === p ? 'font-semibold' : 'text-[#424242]'}`}>
                    {p === 'focused' ? 'Focused' : 'Other'}
                    {pivot === p && <span className="absolute left-2 right-2 bottom-1.5 h-[3px] rounded-full bg-[#0F6CBD]" />}
                  </button>
                ))}
              </>
            ) : (
              <span className="text-[14px] font-semibold">{headerTitle}</span>
            )}
            {qf !== 'all' && (
              <button onClick={() => setQf('all')} className="ml-1 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#EBF3FC] text-[#0F6CBD] text-[12px]" aria-label="Clear filter">
                {FILTER_LABEL[qf]} <Dismiss20Regular className="w-3 h-3" />
              </button>
            )}
            <div className="flex-1" />
            <button
              data-agent="outlook-folder-favorite"
              onClick={toggleFav}
              title={favs.includes(folder) ? (DEFAULT_FAVS.includes(folder) ? 'In Favorites' : 'Remove from Favorites') : 'Add to Favorites'}
              aria-label="Favorite folder"
              className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]"
            >
              {favs.includes(folder) && !search ? <Star20Filled className="text-[#0F6CBD]" /> : <Star20Regular />}
            </button>
            <div className="relative" ref={filterMenu.ref}>
              <button data-agent="outlook-list-filter" aria-label="Filter" onClick={filterMenu.toggle} className={`w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center ${qf !== 'all' ? 'text-[#0F6CBD]' : 'text-[#424242]'}`}><Filter20Regular /></button>
              {filterMenu.open && (
                <MenuPanel className="right-0 top-9 w-[200px]">
                  <MenuHeader>Filter</MenuHeader>
                  {(Object.keys(FILTER_LABEL) as QuickFilter[]).map((f) => (
                    <MenuItem key={f} label={FILTER_LABEL[f]} checked={qf === f} agent={`outlook-filter-${f}`} onClick={() => { setQf(f); filterMenu.close() }} />
                  ))}
                  <MenuSep />
                  <MenuHeader>Sort by</MenuHeader>
                  {(['date', 'from', 'subject'] as const).map((s) => (
                    <MenuItem key={s} label={s === 'date' ? 'Date' : s === 'from' ? 'From' : 'Subject'} checked={sort === s} onClick={() => { setSort(s); filterMenu.close() }} />
                  ))}
                </MenuPanel>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto" data-agent="outlook-message-list">
            {list.length === 0 && <div className="p-8 text-center text-[13px] text-[#616161]">{search ? 'We didn’t find anything.' : qf !== 'all' ? `No ${FILTER_LABEL[qf].toLowerCase()} items here.` : 'All caught up! Nothing in this folder.'}</div>}
            {list.map((e) => {
              const g = e.pinned ? 'Pinned' : sort === 'date' ? groupLabel(e.date) : ''
              const header = g && g !== lastGroup ? ((lastGroup = g), g) : null
              const isSel = selected === e.id && !compose
              const fromLabel = folder === 'sent' || folder === 'drafts' ? 'To: ' + e.to.map((t) => personByEmail(t)?.name ?? t).join('; ') : e.from.name
              const hoverBtn = 'w-6 h-6 rounded flex items-center justify-center text-[#424242] hover:bg-[#E1E1E1] hover:text-[#0F6CBD]'
              return (
                <div key={e.id}>
                  {header && <div className="px-4 pt-3 pb-1 text-[12px] font-semibold text-[#424242] flex items-center gap-1"><ChevronDown16Regular className="w-3 h-3" />{header}</div>}
                  <div
                    role="row"
                    data-agent={`outlook-email-${e.id}`}
                    aria-label={`${fromLabel} — ${e.subject}`}
                    onClick={() => select(e.id)}
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.setData('text/x-outlook-email', e.id)
                      ev.dataTransfer.effectAllowed = 'move'
                    }}
                    onContextMenu={(ev) => {
                      ev.preventDefault()
                      const r = listRef.current!.getBoundingClientRect()
                      const scale = r.width / (listRef.current!.offsetWidth || 1) || 1
                      setCtx({ id: e.id, x: Math.min((ev.clientX - r.left) / scale, 370 - 230), y: (ev.clientY - r.top) / scale })
                    }}
                    className={`group relative flex gap-3 px-3 ${density ? 'py-1.5' : 'py-2.5'} border-b border-[#F5F5F5] ${isSel ? 'bg-[#EBF3FC]' : 'hover:bg-[#F5F5F5]'} ${e.sentBy === 'hworker' && Date.now() - +new Date(e.date) < 60000 ? 'flash-new' : ''}`}
                  >
                    {!e.read && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0F6CBD]" />}
                    {isSel && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0F6CBD]" />}
                    {prefs.senderImages !== false && <Avatar email={folder === 'sent' ? e.to[0] : e.from.email} name={folder === 'sent' ? personByEmail(e.to[0])?.name ?? e.to[0] : e.from.name} size={density ? 24 : 32} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-[14px] truncate ${!e.read ? 'font-semibold text-[#242424]' : 'text-[#242424]'}`}>{fromLabel}</span>
                        <div className="flex-1" />
                        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                          <button className={hoverBtn} title="Delete" data-agent={`outlook-row-delete-${e.id}`} onClick={() => actions.move(e, 'deleted')}><Delete16Regular /></button>
                          <button className={hoverBtn} title={e.read ? 'Mark as unread' : 'Mark as read'} data-agent={`outlook-row-read-${e.id}`} onClick={() => actions.toggleRead(e)}>{e.read ? <Mail16Regular /> : <MailRead16Regular />}</button>
                          <button className={hoverBtn} title={e.flagged ? 'Clear flag' : 'Flag this message'} data-agent={`outlook-row-flag-${e.id}`} onClick={() => actions.toggleFlag(e)}>{e.flagged ? <Flag16Filled className="text-[#C50F1F]" /> : <Flag16Regular />}</button>
                          <button className={hoverBtn} title={e.pinned ? 'Unpin' : 'Pin'} data-agent={`outlook-row-pin-${e.id}`} onClick={() => actions.togglePin(e)}>{e.pinned ? <Pin16Filled className="text-[#0F6CBD]" /> : <Pin16Regular />}</button>
                        </span>
                        <span className="flex items-center gap-1 group-hover:hidden">
                          {e.important && <Important16Filled className="text-[#C50F1F] shrink-0" />}
                          {e.attachments?.length ? <Attach16Regular className="text-[#616161] shrink-0" /> : null}
                          {e.flagged && <Flag16Filled className="text-[#C50F1F] shrink-0" />}
                          {e.pinned && <Pin16Filled className="text-[#616161] shrink-0" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] truncate flex-1 ${!e.read ? 'font-semibold text-[#0F6CBD]' : 'text-[#242424]'}`}>{e.subject}</span>
                        <span className={`text-[12px] shrink-0 ${!e.read ? 'text-[#0F6CBD] font-semibold' : 'text-[#616161]'}`}>{folder === 'scheduled' && e.snoozedUntil ? `⏰ ${fmtSmart(e.snoozedUntil)}` : fmtSmart(e.date)}</span>
                      </div>
                      {prefs.preview !== false && !density && <div className="text-[12.5px] text-[#616161] truncate">{e.body.replace(/\s+/g, ' ').slice(0, 110)}</div>}
                      {(e.category || e.sentBy === 'hworker') && (
                        <div className="flex gap-1 mt-1">
                          {e.category && (
                            <span className="inline-flex items-center h-[18px] px-1.5 rounded text-[11px]" style={{ background: CATEGORY_COLORS[e.category]?.[0] ?? '#F3F2F1', color: CATEGORY_COLORS[e.category]?.[1] ?? '#605E5C' }}>
                              {e.category}
                            </span>
                          )}
                          {e.sentBy === 'hworker' && (
                            <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded text-[11px] text-white" style={{ background: '#430693' }}>
                              <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-sm" alt="" /> H-Worker
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {ctx && ctxEmail && (
            <div ref={ctxRef} className="absolute z-50 w-[230px]" style={{ left: ctx.x, top: ctx.y }}>
              <MenuPanel className="relative w-full">
                <MenuItem icon={<ArrowReply20Regular />} label="Reply" onClick={() => { setSelected(ctxEmail.id); setCtx(null); setTimeout(() => replyTo(ctxEmail, 'reply'), 0) }} />
                <MenuItem icon={<ArrowReplyAll20Regular />} label="Reply all" onClick={() => { setSelected(ctxEmail.id); setCtx(null); setTimeout(() => replyTo(ctxEmail, 'replyAll'), 0) }} />
                <MenuItem icon={<ArrowForward20Regular />} label="Forward" onClick={() => { setSelected(ctxEmail.id); setCtx(null); setTimeout(() => replyTo(ctxEmail, 'forward'), 0) }} />
                <MenuSep />
                <MenuItem icon={<Delete20Regular />} label="Delete" onClick={() => { actions.move(ctxEmail, 'deleted'); setCtx(null) }} />
                <MenuItem icon={<Archive20Regular />} label="Archive" onClick={() => { actions.move(ctxEmail, 'archive'); setCtx(null) }} />
                <MenuItem icon={ctxEmail.read ? <MailUnread20Regular /> : <MailRead20Regular />} label={ctxEmail.read ? 'Mark as unread' : 'Mark as read'} onClick={() => { actions.toggleRead(ctxEmail); setCtx(null) }} />
                <MenuItem icon={<Flag20Regular />} label={ctxEmail.flagged ? 'Clear flag' : 'Flag'} onClick={() => { actions.toggleFlag(ctxEmail); setCtx(null) }} />
                <MenuItem icon={<Pin20Regular />} label={ctxEmail.pinned ? 'Unpin' : 'Pin'} onClick={() => { actions.togglePin(ctxEmail); setCtx(null) }} />
                <MenuSep />
                {Object.keys(CATEGORY_COLORS).slice(0, 5).map((c) => (
                  <MenuItem key={c} icon={<Tag20Regular style={{ color: CATEGORY_COLORS[c][1] }} />} label={c} checked={ctxEmail.category === c} onClick={() => { actions.setCategory(ctxEmail, ctxEmail.category === c ? undefined : c); setCtx(null) }} />
                ))}
              </MenuPanel>
            </div>
          )}
        </div>
        {compose ? (
          <Compose state={compose} onChange={setCompose} onClose={(key) => closeCompose(key)} />
        ) : (
          <ReadingPane email={sel} onReply={reply} deskOpen={open} actions={actions} />
        )}
      </div>
    </div>
  )

  function replyTo(e: Email, mode: ComposeState['mode']) {
    const quoted = `\n\n________________________________\nFrom: ${e.from.name} <${e.from.email}>\nSent: ${new Date(e.date).toLocaleString('en-US')}\nTo: ${e.to.join('; ')}\nSubject: ${e.subject}\n\n${e.body}`
    const isFwd = mode === 'forward'
    setCompose({
      mode,
      to: isFwd ? [] : [e.from.email].filter((x) => x !== ME.email),
      cc: mode === 'replyAll' ? [...e.to, ...(e.cc ?? [])].filter((x) => x !== ME.email && x !== e.from.email) : [],
      subject: (isFwd ? 'FW: ' : 'RE: ') + e.subject.replace(/^(RE|FW):\s*/i, ''),
      body: EMAIL_SIGNATURE + quoted,
      replyTo: e.id,
      attachments: isFwd ? e.attachments ?? [] : [],
    })
  }
}

function FolderRow({ name, Icon, active, count, onClick, agent, onDragOver, onDragLeave, onDrop, dropping }: any) {
  return (
    <button
      data-agent={agent}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative w-full flex items-center gap-2.5 pl-8 pr-3 h-8 rounded text-left ${dropping ? 'bg-[#CFE4FA] ring-1 ring-[#0F6CBD]' : active ? 'bg-[#E1E1E1] font-semibold' : 'hover:bg-[#E9E9E9]'}`}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#0F6CBD]" />}
      <Icon className={active ? 'text-[#0F6CBD]' : 'text-[#424242]'} />
      <span className="flex-1 truncate">{name}</span>
      {count > 0 && <span className={`text-[12px] ${active ? 'text-[#0F6CBD]' : 'text-[#0F6CBD] font-semibold'}`}>{count}</span>}
    </button>
  )
}

