import { useEffect, useMemo, useState } from 'react'
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
  Note20Regular,
  Clock20Regular,
  ShieldError20Regular,
  History20Regular,
  ArrowSync20Regular,
  DocumentTable24Regular,
  Document24Regular,
} from '@fluentui/react-icons'
import { db, uid, useCollection, type Rec } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, personByEmail } from '@/data/people'
import { fmtSmart } from '@/data/time'
import { logoUrl } from '@/os/registry'
import { RecipientInput } from './RecipientInput'
import { EMAIL_SIGNATURE } from '@/db/seeds/core'

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
}

export interface ComposeState {
  /** identity of this draft (so a delayed "sent" close never closes a newer draft) */
  key?: string
  mode: 'new' | 'reply' | 'replyAll' | 'forward'
  to: string[]
  cc: string[]
  subject: string
  body: string
  replyTo?: string
  attachments: Email['attachments']
}

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: MailInbox20Regular },
  { id: 'drafts', name: 'Drafts', icon: Drafts20Regular },
  { id: 'sent', name: 'Sent Items', icon: Send20Regular },
  { id: 'deleted', name: 'Deleted Items', icon: Delete20Regular },
  { id: 'junk', name: 'Junk Email', icon: ShieldError20Regular },
  { id: 'archive', name: 'Archive', icon: Archive20Regular },
  { id: 'notes', name: 'Notes', icon: Note20Regular },
  { id: 'history', name: 'Conversation History', icon: History20Regular },
]

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

function FileIcon({ kind }: { kind: string }) {
  if (kind === 'pdf') return <DocumentPdf24Regular className="text-[#C50F1F]" />
  if (kind === 'xlsx') return <img src={logoUrl('excel')} className="w-6 h-6" alt="" />
  if (kind === 'docx') return <img src={logoUrl('word')} className="w-6 h-6" alt="" />
  if (kind === 'pptx') return <img src={logoUrl('powerpoint')} className="w-6 h-6" alt="" />
  if (kind === 'csv') return <DocumentTable24Regular className="text-[#107C10]" />
  return <Document24Regular className="text-[#616161]" />
}

export function HWorkerBadge() {
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[11px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> Sent by H-Worker
    </span>
  )
}

/* ─────────────────────────── Ribbon ─────────────────────────── */

function RibbonButton({ icon: Icon, label, onClick, agent, disabled, primary, chevron }: any) {
  if (primary)
    return (
      <div className="flex items-center h-8 rounded bg-[#0F6CBD] text-white mr-1.5 overflow-hidden">
        <button data-agent={agent} onClick={onClick} className="flex items-center gap-1.5 h-full pl-2.5 pr-3 hover:bg-[#115EA3] text-[13px] font-semibold">
          <Icon /> {label}
        </button>
        <span className="w-px h-5 bg-white/30" />
        <button className="h-full px-1.5 hover:bg-[#115EA3]">
          <ChevronDown16Regular />
        </button>
      </div>
    )
  return (
    <button
      data-agent={agent}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px] text-[#242424] disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon className="text-[#0F6CBD]" />
      {label && <span>{label}</span>}
      {chevron && <ChevronDown16Regular className="text-[#616161]" />}
    </button>
  )
}

/* ─────────────────────────── Compose ─────────────────────────── */

function Compose({ state, onChange, onClose: close }: { state: ComposeState; onChange: (s: ComposeState) => void; onClose: (key?: string) => void }) {
  const onClose = () => close(state.key)
  const { isAgent } = useDesk()
  const files = useCollection('files')
  const [showCc, setShowCc] = useState(state.cc.length > 0)
  const [attachMenu, setAttachMenu] = useState(false)
  const [sending, setSending] = useState(false)

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
          subject: state.subject || '(No subject)',
          body: state.body,
          date: new Date().toISOString(),
          read: true,
          attachments: state.attachments,
          replyTo: state.replyTo,
          sentBy: isAgent ? 'hworker' : undefined,
        },
        { prepend: true },
      )
      onClose()
    }, 450)
  }


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
        <div className="relative">
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
              <button className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#F5F5F5]">Browse this computer</button>
              <button className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#F5F5F5]">Upload and share</button>
            </div>
          )}
        </div>
        <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
        {[TextBold20Regular, TextItalic20Regular, TextUnderline20Regular, TextBulletList20Regular, Image20Regular, Emoji20Regular].map((I, i) => (
          <button key={i} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]">
            <I />
          </button>
        ))}
        <div className="flex-1" />
        <button data-agent="outlook-discard" onClick={onClose} className="flex items-center gap-1 h-8 px-2 rounded hover:bg-[#F0F0F0] text-[13px]" aria-label="Discard">
          <Delete20Regular /> Discard
        </button>
      </div>
      <div className="px-4">
        <div className="flex items-start gap-2 border-b border-[#EDEBE9] py-1.5">
          <button className="h-7 px-2.5 mt-0.5 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]">To</button>
          <RecipientInput value={state.to} onChange={(to) => onChange({ ...state, to })} agent="outlook-compose-to" placeholder="To" />
          {!showCc && (
            <button className="text-[13px] text-[#242424] hover:underline mt-1.5" onClick={() => setShowCc(true)} data-agent="outlook-show-cc">
              Cc
            </button>
          )}
        </div>
        {showCc && (
          <div className="flex items-start gap-2 border-b border-[#EDEBE9] py-1.5">
            <button className="h-7 px-2.5 mt-0.5 rounded border border-[#D1D1D1] text-[13px] hover:bg-[#F5F5F5]">Cc</button>
            <RecipientInput value={state.cc} onChange={(cc) => onChange({ ...state, cc })} agent="outlook-compose-cc" placeholder="Cc" />
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
      {state.attachments && state.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {state.attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 h-11 pl-2 pr-1 rounded border border-[#E1DFDD] bg-white w-[230px]">
              <FileIcon kind={a.kind} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] truncate">{a.name}</div>
                <div className="text-[11px] text-[#616161]">{a.size}</div>
              </div>
              <button className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center" onClick={() => onChange({ ...state, attachments: state.attachments!.filter((_, j) => j !== i) })}>
                <Dismiss20Regular className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        data-agent="outlook-compose-body"
        data-agent-insert="start"
        aria-label="Message body"
        value={state.body}
        onChange={(e) => onChange({ ...state, body: e.target.value })}
        className="flex-1 w-full resize-none outline-none px-4 py-3 text-[14px] leading-[1.55] text-[#242424]"
        style={{ fontFamily: 'Aptos, Calibri, var(--font-win)' }}
        placeholder="Type / to insert files and more"
      />
      <div className="px-4 py-1.5 text-[11.5px] text-[#616161] border-t border-[#EDEBE9]">Draft saved at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
    </div>
  )
}

/* ─────────────────────────── Reading pane ─────────────────────────── */

function ReadingPane({ email, onReply, deskOpen }: { email?: Email; onReply: (mode: ComposeState['mode']) => void; deskOpen: (appId: string, params?: any) => void }) {
  if (!email)
    return (
      <div className="flex-1 flex flex-col items-center justify-center m-2 ml-0 bg-white rounded-lg text-[#616161]">
        <svg width="120" height="90" viewBox="0 0 120 90" className="mb-4 opacity-80"><rect x="10" y="20" width="100" height="62" rx="6" fill="#EBF3FC" /><path d="M10 26l50 32 50-32" fill="none" stroke="#0F6CBD" strokeWidth="2" /><circle cx="94" cy="20" r="12" fill="#0F6CBD" /><path d="M89 20l3.5 3.5L99 17" stroke="#fff" strokeWidth="2" fill="none" /></svg>
        <div className="text-[15px] font-semibold text-[#242424]">Select an item to read</div>
        <div className="text-[13px] mt-1">Nothing is selected</div>
      </div>
    )
  const p = personByEmail(email.from.email)
  return (
    <div className="flex-1 min-w-0 flex flex-col m-2 ml-0 overflow-hidden">
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)]" data-agent="outlook-reading-pane">
        <div className="px-6 pt-5 pb-2 flex items-start gap-2">
          <h1 className="text-[20px] font-semibold text-[#242424] leading-tight flex-1" data-agent="outlook-reading-subject">
            {email.subject}
          </h1>
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
            </div>
            {p?.title && !p.external && <div className="text-[11.5px] text-[#8A8886]">{p.title} · {p.dept}</div>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center">
              <button data-agent="outlook-reply" aria-label="Reply" onClick={() => onReply('reply')} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]"><ArrowReply20Regular /></button>
              <button data-agent="outlook-reply-all" aria-label="Reply all" onClick={() => onReply('replyAll')} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]"><ArrowReplyAll20Regular /></button>
              <button data-agent="outlook-forward" aria-label="Forward" onClick={() => onReply('forward')} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#0F6CBD]"><ArrowForward20Regular /></button>
              <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]"><MoreHorizontal20Regular /></button>
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
                onClick={() => a.open && deskOpen(a.open.appId, a.open.params)}
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
        <div className="px-7 pb-8 text-[14px] leading-[1.6] text-[#242424] whitespace-pre-wrap" style={{ fontFamily: 'Aptos, Calibri, var(--font-win)' }} data-agent="outlook-reading-body">
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

export function MailView({ params, nonce, search }: { params: any; nonce: number; search: string }) {
  const emails = useCollection<Email>('outlook.emails')
  const { open } = useDesk()
  const [folder, setFolder] = useState<string>('inbox')
  const [selected, setSelected] = useState<string | null>(null)
  const [compose, setComposeRaw] = useState<ComposeState | null>(null)
  const setCompose = (c: ComposeState | null) => setComposeRaw(c ? { ...c, key: c.key ?? uid('draft') } : null)
  const closeCompose = (key?: string) => setComposeRaw((c) => (!c || !key || c.key === key ? null : c))
  const [pivot, setPivot] = useState<'focused' | 'other'>('focused')
  const [catMenu, setCatMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

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

  const list = useMemo(() => {
    let l = emails.filter((e) => e.folder === folder)
    if (folder === 'inbox' && !search) l = l.filter((e) => (pivot === 'focused' ? e.focused !== false : e.focused === false))
    if (search) {
      const q = search.toLowerCase()
      l = emails.filter((e) => e.folder !== 'deleted' && (e.subject + ' ' + e.from.name + ' ' + e.body + ' ' + e.from.email).toLowerCase().includes(q))
    }
    return l.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || +new Date(b.date) - +new Date(a.date))
  }, [emails, folder, pivot, search])

  const sel = emails.find((e) => e.id === selected)
  const unread = (f: string) => emails.filter((e) => e.folder === f && !e.read).length

  const select = (id: string) => {
    setCompose(null)
    setSelected(id)
    const e = emails.find((x) => x.id === id)
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

  // put the caret-ready blank line at the top of replies
  const composeBodyFix = (c: ComposeState) => c

  let lastGroup = ''

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ribbon */}
      <div className="shrink-0 mx-2 mt-1 mb-1 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-4 px-3 h-9 text-[13px]">
          {['Home', 'View', 'Help'].map((t, i) => (
            <button key={t} className={`h-full relative ${i === 0 ? 'font-semibold text-[#242424]' : 'text-[#424242] hover:text-[#242424]'}`}>
              {t}
              {i === 0 && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full bg-[#0F6CBD]" />}
            </button>
          ))}
        </div>
        <div className="flex items-center px-2 h-11 border-t border-[#F0F0F0] overflow-hidden">
          <RibbonButton primary icon={MailUnread20Regular} label="New mail" agent="outlook-new-mail" onClick={() => setCompose({ mode: 'new', to: [], cc: [], subject: '', body: EMAIL_SIGNATURE, attachments: [] })} />
          <RibbonButton icon={Delete20Regular} label="Delete" agent="outlook-delete" disabled={!sel} onClick={() => sel && (db.update('outlook.emails', sel.id, { folder: 'deleted' }), setSelected(null))} />
          <RibbonButton icon={Archive20Regular} label="Archive" agent="outlook-archive" disabled={!sel} onClick={() => sel && (db.update('outlook.emails', sel.id, { folder: 'archive' }), setSelected(null))} />
          <RibbonButton icon={ShieldError20Regular} label="Report" chevron />
          <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
          <RibbonButton icon={FolderMail20Regular} label="Move to" chevron />
          <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
          <RibbonButton icon={ArrowReply20Regular} label="Reply" disabled={!sel} onClick={() => reply('reply')} />
          <RibbonButton icon={ArrowReplyAll20Regular} label="Reply all" disabled={!sel} onClick={() => reply('replyAll')} />
          <RibbonButton icon={ArrowForward20Regular} label="Forward" disabled={!sel} onClick={() => reply('forward')} />
          <span className="w-px h-5 bg-[#E1DFDD] mx-1" />
          <RibbonButton icon={sel?.read ? MailUnread20Regular : MailRead20Regular} label={sel?.read === false ? 'Read' : 'Unread'} agent="outlook-mark-read" disabled={!sel} onClick={() => sel && db.update('outlook.emails', sel.id, { read: !sel.read })} />
          <div className="relative">
            <RibbonButton icon={Tag20Regular} label="Categorize" chevron agent="outlook-categorize" disabled={!sel} onClick={() => setCatMenu((m) => !m)} />
            {catMenu && sel && (
              <div className="absolute z-50 top-9 left-0 w-[200px] bg-white rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black/5 py-1">
                {Object.entries(CATEGORY_COLORS).map(([c, [bg, fg]]) => (
                  <button
                    key={c}
                    data-agent={`outlook-category-${c.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => {
                      db.update('outlook.emails', sel.id, { category: sel.category === c ? undefined : c })
                      setCatMenu(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] hover:bg-[#F5F5F5]"
                  >
                    <Tag20Regular style={{ color: fg, background: bg }} className="rounded" /> {c}
                    {sel.category === c && <span className="ml-auto text-[#0F6CBD]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <RibbonButton icon={Flag20Regular} label="Flag" agent="outlook-flag" disabled={!sel} onClick={() => sel && db.update('outlook.emails', sel.id, { flagged: !sel.flagged })} />
          <RibbonButton icon={Pin20Regular} label="Pin" agent="outlook-pin" disabled={!sel} onClick={() => sel && db.update('outlook.emails', sel.id, { pinned: !sel.pinned })} />
          <RibbonButton icon={Clock20Regular} label="Snooze" chevron disabled={!sel} />
          <RibbonButton icon={ArrowSync20Regular} label="" />
          <RibbonButton icon={MoreHorizontal20Regular} label="" />
        </div>
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
              <FolderRow key={'fav-' + id} id={id} name={name} Icon={Icon} active={folder === id && !search} count={id === 'drafts' ? emails.filter((e) => e.folder === 'drafts').length : unread(id)} onClick={() => { setFolder(id); setSelected(null); setCompose(null) }} agent={`outlook-folder-${id}`} />
            ))}
            <div className="flex items-center gap-1 px-3 h-8 font-semibold mt-2">
              <ChevronDown16Regular /> <span className="truncate">{ME.email}</span>
            </div>
            {FOLDERS.map((f) => (
              <FolderRow key={f.id} id={f.id} name={f.name} Icon={f.icon} active={false} count={f.id === 'drafts' ? emails.filter((e) => e.folder === 'drafts').length : f.id === 'inbox' ? unread('inbox') : 0} onClick={() => { setFolder(f.id); setSelected(null); setCompose(null) }} />
            ))}
            {['Expenses', 'Vendors', 'Customers', 'Leadership'].map((n) => (
              <FolderRow key={n} id={n} name={n} Icon={Folder20Regular} active={false} count={0} onClick={() => {}} />
            ))}
            <button className="px-9 h-8 text-[#0F6CBD] hover:underline">Create new folder</button>
            <div className="flex items-center gap-1 px-3 h-8 font-semibold mt-2 text-[#424242]">
              <ChevronRight16Regular /> Groups
            </div>
          </div>
        )}
        {collapsed && (
          <button className="w-8 shrink-0 hover:bg-[#E9E9E9]" onClick={() => setCollapsed(false)}>
            <ChevronRight16Regular />
          </button>
        )}
        {/* message list */}
        <div className="w-[370px] shrink-0 flex flex-col m-2 mx-2 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] overflow-hidden">
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
              <span className="text-[14px] font-semibold">{FOLDERS.find((f) => f.id === folder)?.name ?? folder}</span>
            )}
            <div className="flex-1" />
            <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]"><Star20Regular /></button>
            <button className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#424242]"><Filter20Regular /></button>
          </div>
          <div className="flex-1 overflow-auto" data-agent="outlook-message-list">
            {list.length === 0 && <div className="p-8 text-center text-[13px] text-[#616161]">{search ? 'We didn’t find anything.' : 'All caught up! Nothing in this folder.'}</div>}
            {list.map((e) => {
              const g = e.pinned ? 'Pinned' : groupLabel(e.date)
              const header = g !== lastGroup ? ((lastGroup = g), g) : null
              const isSel = selected === e.id && !compose
              const fromLabel = folder === 'sent' || folder === 'drafts' ? 'To: ' + e.to.map((t) => personByEmail(t)?.name ?? t).join('; ') : e.from.name
              return (
                <div key={e.id}>
                  {header && <div className="px-4 pt-3 pb-1 text-[12px] font-semibold text-[#424242] flex items-center gap-1"><ChevronDown16Regular className="w-3 h-3" />{header}</div>}
                  <div
                    role="row"
                    data-agent={`outlook-email-${e.id}`}
                    aria-label={`${fromLabel} — ${e.subject}`}
                    onClick={() => select(e.id)}
                    className={`group relative flex gap-3 px-3 py-2.5 border-b border-[#F5F5F5] ${isSel ? 'bg-[#EBF3FC]' : 'hover:bg-[#F5F5F5]'} ${e.sentBy === 'hworker' && Date.now() - +new Date(e.date) < 60000 ? 'flash-new' : ''}`}
                  >
                    {!e.read && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0F6CBD]" />}
                    {isSel && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0F6CBD]" />}
                    <Avatar email={folder === 'sent' ? e.to[0] : e.from.email} name={folder === 'sent' ? personByEmail(e.to[0])?.name ?? e.to[0] : e.from.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-[14px] truncate ${!e.read ? 'font-semibold text-[#242424]' : 'text-[#242424]'}`}>{fromLabel}</span>
                        <div className="flex-1" />
                        {e.important && <Important16Filled className="text-[#C50F1F] shrink-0" />}
                        {e.attachments?.length ? <Attach16Regular className="text-[#616161] shrink-0" /> : null}
                        {e.flagged && <Flag16Filled className="text-[#C50F1F] shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] truncate flex-1 ${!e.read ? 'font-semibold text-[#0F6CBD]' : 'text-[#242424]'}`}>{e.subject}</span>
                        <span className={`text-[12px] shrink-0 ${!e.read ? 'text-[#0F6CBD] font-semibold' : 'text-[#616161]'}`}>{fmtSmart(e.date)}</span>
                      </div>
                      <div className="text-[12.5px] text-[#616161] truncate">{e.body.replace(/\s+/g, ' ').slice(0, 110)}</div>
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
        </div>
        {compose ? (
          <Compose state={composeBodyFix(compose)} onChange={setCompose} onClose={(key) => closeCompose(key)} />
        ) : (
          <ReadingPane email={sel} onReply={reply} deskOpen={open} />
        )}
      </div>
    </div>
  )
}

function FolderRow({ name, Icon, active, count, onClick, agent }: any) {
  return (
    <button data-agent={agent} onClick={onClick} className={`relative w-full flex items-center gap-2.5 pl-8 pr-3 h-8 rounded text-left ${active ? 'bg-[#E1E1E1] font-semibold' : 'hover:bg-[#E9E9E9]'}`}>
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#0F6CBD]" />}
      <Icon className={active ? 'text-[#0F6CBD]' : 'text-[#424242]'} />
      <span className="flex-1 truncate">{name}</span>
      {count > 0 && <span className={`text-[12px] ${active ? 'text-[#0F6CBD]' : 'text-[#0F6CBD] font-semibold'}`}>{count}</span>}
    </button>
  )
}
