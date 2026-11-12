import { useEffect, useRef, useState } from 'react'
import {
  X, ChevronDown, Bold, Italic, Link2, ListOrdered, Paperclip, Smile, Code, MessageSquare, Mail, Globe, Phone, User, BookOpen, Puzzle, Zap, Clock, MoreHorizontal, Search, PhoneCall, ExternalLink, FileText,
} from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { logoUrl } from '@/os/registry'
import { type Ticket, type Macro, STATUS, HOURS, waiting, ago, when, Badge, HW, ReqAvatar, ZPop, ZItem, ZModal, zBtn, zPrimary, zDanger, zInput, useZFlash, RichText, AGENTS, GROUPS, nextNumber } from './shared'

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[14px] font-semibold text-[#2F3941] mb-1">{label}</div>
      {children}
    </div>
  )
}
const selCls = 'w-full h-9 px-2.5 rounded-[4px] border border-[#C2C8CC] bg-white text-[14px] text-[#2F3941] outline-none focus:border-[#1F73B7] focus:shadow-[0_0_0_3px_rgba(31,115,183,0.35)] capitalize'
const EMOJI = ['🙂', '😀', '🙏', '👍', '🎉', '✅', '⚠️', '📦', '💳', '🔒', '📧', '⏰']

type ZUser = { id: string; notes?: string; details?: string }

export function TicketPage({ id, onDone, onCustomer, onOpen }: { id: string; onDone: () => void; onCustomer?: (email: string) => void; onOpen?: (id: string) => void }) {
  const { isAgent } = useDesk()
  const desk = useDesk()
  const flash = useZFlash()
  const t = useRecord<Ticket>('zendesk.tickets', id)
  const macros = useCollection<Macro>('zendesk.macros')
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const articles = useCollection<any>('zendesk.articles')
  const jira = useCollection<any>('jira.issues')
  const userRec = useRecord<ZUser>('zendesk.users', t?.requester.email)
  const [mode, setMode] = useState<'public' | 'internal'>('public')
  const [text, setText] = useState('')
  const [nextStatus, setNextStatus] = useState<string>('')
  const [macroOpen, setMacroOpen] = useState(false)
  const [mq, setMq] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [applied, setApplied] = useState<string[]>([])
  const [modeOpen, setModeOpen] = useState(false)
  const [closeAfter, setCloseAfter] = useState(true)
  const [cc, setCc] = useState<string[] | null>(null)
  const [ccText, setCcText] = useState('')
  const [files, setFiles] = useState<{ name: string; size: number }[]>([])
  const [emoji, setEmoji] = useState(false)
  const [tagText, setTagText] = useState('')
  const [panel, setPanel] = useState<'user' | 'kb' | 'apps' | 'talk'>('user')
  const [kq, setKq] = useState('')
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState<null | 'merge' | 'delete' | 'jira'>(null)
  const [mergeTo, setMergeTo] = useState('')
  const [jiraKey, setJiraKey] = useState('')
  const [call, setCall] = useState<{ start: number; notes: string } | null>(null)
  const [, tick] = useState(0)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setText('')
    setNextStatus('')
    setApplied([])
    setMode('public')
    setCc(null)
    setFiles([])
    setPanel('user')
  }, [id])
  useEffect(() => {
    if (!call) return
    const i = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(i)
  }, [call])
  if (!t) return <div className="p-10 text-[#68737D]">Ticket not found</div>
  const first = t.requester.name.split(' ')[0]
  const status = nextStatus || (t.status === 'new' ? 'open' : t.status)
  const patchField = (p: Partial<Ticket>) => db.update('zendesk.tickets', t.id, p)

  const applyMacro = (m: Macro) => {
    setText((x) => (x ? x + '\n\n' : '') + m.body.replace(/\{\{first_name\}\}/g, first))
    if (m.status) setNextStatus(m.status)
    setApplied((a) => [...a, m.id])
    if (m.tags?.length) patchField({ tags: Array.from(new Set([...t.tags, ...m.tags])) })
    setMacroOpen(false)
    setMq('')
  }
  const submit = (st: string) => {
    const now = new Date().toISOString()
    const comments = text.trim() || files.length ? [...t.comments, { id: `c-${Date.now()}`, author: ME.id, public: mode === 'public', body: text.trim(), date: now, via: isAgent ? 'hworker' : undefined, ...(cc?.length && mode === 'public' ? { cc } : {}), ...(files.length ? { attachments: files } : {}) }] : t.comments
    db.update('zendesk.tickets', t.id, { status: st, comments, updated: now, assignee: t.assignee || ME.id, updatedBy: isAgent ? 'hworker' : t.updatedBy })
    setText('')
    setSubmitOpen(false)
    setFiles([])
    setCc(null)
    setNextStatus('')
    if (closeAfter) onDone()
    else flash(`Ticket #${t.number} updated — ${STATUS[st].label}`)
  }
  const wrapSel = (before: string, after = before, ph = 'text') => {
    const ta = taRef.current
    const s = ta?.selectionStart ?? text.length
    const e = ta?.selectionEnd ?? text.length
    const sel = text.slice(s, e) || ph
    setText(text.slice(0, s) + before + sel + after + text.slice(e))
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(s + before.length, s + before.length + sel.length) })
  }
  const insertText = (x: string) => {
    const ta = taRef.current
    const s = ta?.selectionStart ?? text.length
    setText(text.slice(0, s) + x + text.slice(s))
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(s + x.length, s + x.length) })
  }
  const others = tickets.filter((x) => x.requester.email === t.requester.email && x.id !== t.id)
  const fm = macros.filter((m) => !mq || m.title.toLowerCase().includes(mq.toLowerCase()))
  const problems = tickets.filter((x) => x.type === 'problem' && x.id !== t.id && !['closed'].includes(x.status))
  const followers = t.followers ?? []
  const following = followers.includes(ME.id)
  const kbHits = articles.filter((a) => {
    const q = (kq || t.subject).toLowerCase().split(/\W+/).filter((w) => w.length > 3)
    return !q.length || q.some((w) => (a.title + ' ' + a.body).toLowerCase().includes(w))
  })
  const linkedJira = jira.find((j) => j.key === t.jiraKey)
  const derivedArea = t.tags.includes('billing') ? 'Billing & invoices' : t.tags.some((x) => x.includes('password') || x === '2fa') ? 'Account & login' : 'Shipments'
  const callSecs = call ? Math.floor((Date.now() - call.start) / 1000) : 0

  const createJira = () => {
    const n = Math.max(0, ...jira.map((i: any) => Number(String(i.key).split('-')[1]) || 0)) + 1
    const key = `OPS-${n}`
    const now = new Date().toISOString()
    db.insert('jira.issues', { id: `ops-${n}`, key, type: t.type === 'incident' || t.type === 'problem' ? 'Bug' : 'Task', summary: `[Zendesk #${t.number}] ${t.subject}`, description: `Escalated from Zendesk ticket #${t.number} (${t.requester.name}, ${t.requester.org}).\n\n${t.comments[0]?.body ?? ''}`, status: 'To Do', priority: t.priority === 'urgent' ? 'Highest' : t.priority === 'high' ? 'High' : 'Medium', assignee: '', reporter: ME.id, labels: ['zendesk'], sprintId: null, created: now, updated: now, comments: [], createdBy: isAgent ? 'hworker' : undefined })
    db.update('zendesk.tickets', t.id, { jiraKey: key, updated: now, comments: [...t.comments, { id: `c-${Date.now()}j`, author: ME.id, public: false, body: `Escalated to engineering: Jira ${key} created.`, date: now }] })
    flash(`Jira issue ${key} created and linked`)
    setDialog(null)
  }

  return (
    <div className="flex-1 min-h-0 flex relative">
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { const f = e.target.files; if (f?.length) setFiles((x) => [...x, ...Array.from(f).map((y) => ({ name: y.name, size: y.size }))]); e.target.value = '' }} />
      {/* properties */}
      <div className="w-[290px] shrink-0 border-r border-[#D8DCDE] bg-[#F8F9F9] overflow-auto px-5 py-4">
        <Prop label="Requester">
          <button onClick={() => onCustomer?.(t.requester.email)} className={`${selCls} flex items-center gap-2 hover:border-[#1F73B7] text-left`} aria-label="Open requester profile"><ReqAvatar name={t.requester.name} size={22} /><span className="truncate normal-case">{t.requester.name}</span></button>
        </Prop>
        <Prop label="Assignee">
          <select data-agent="zd-field-assignee" aria-label="Assignee" value={t.assignee} onChange={(e) => patchField({ assignee: e.target.value })} className={selCls + ' normal-case'}>
            <option value="">-</option>
            {AGENTS.map((p) => <option key={p} value={p}>{t.group} / {person(p).name}</option>)}
          </select>
          {t.assignee !== ME.id && <button className="text-[13px] text-[#1F73B7] hover:underline mt-1" onClick={() => patchField({ assignee: ME.id })}>take it</button>}
        </Prop>
        <Prop label="Followers">
          <div className="flex flex-wrap gap-1 items-center">
            {followers.map((f) => <span key={f} className="h-6 pl-1 pr-1.5 rounded-full bg-[#E9EBED] text-[12px] flex items-center gap-1"><ReqAvatar name={f} size={18} />{person(f).first}</span>)}
            <button className="text-[14px] text-[#1F73B7] hover:underline" onClick={() => patchField({ followers: following ? followers.filter((f) => f !== ME.id) : [...followers, ME.id] })}>{following ? 'unfollow' : 'follow'}</button>
          </div>
        </Prop>
        <Prop label="Tags">
          <div className="min-h-9 p-1 rounded-[4px] border border-[#C2C8CC] bg-white flex flex-wrap gap-1 focus-within:border-[#1F73B7]">
            {t.tags.map((g) => <span key={g} className="h-6 pl-2 pr-1 rounded-[4px] bg-[#E9EBED] text-[12px] text-[#2F3941] flex items-center gap-1">{g} <button aria-label={`Remove tag ${g}`} onClick={() => patchField({ tags: t.tags.filter((x) => x !== g) })} className="hover:text-[#CC3340]"><X size={11} /></button></span>)}
            <input aria-label="Add tag" value={tagText} onChange={(e) => setTagText(e.target.value.replace(/\s/g, '_').toLowerCase())} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && tagText.trim()) { e.preventDefault(); patchField({ tags: Array.from(new Set([...t.tags, tagText.trim()])) }); setTagText('') } else if (e.key === 'Backspace' && !tagText && t.tags.length) patchField({ tags: t.tags.slice(0, -1) }) }} className="flex-1 min-w-[60px] h-6 px-1 text-[13px] outline-none" />
          </div>
        </Prop>
        <div className="grid grid-cols-2 gap-3">
          <Prop label="Type">
            <select data-agent="zd-field-type" value={t.type} onChange={(e) => patchField({ type: e.target.value })} className={selCls}>
              {['question', 'incident', 'problem', 'task'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Prop>
          <Prop label="Priority">
            <select data-agent="zd-field-priority" value={t.priority} onChange={(e) => patchField({ priority: e.target.value })} className={selCls}>
              {['low', 'normal', 'high', 'urgent'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Prop>
        </div>
        <Prop label="Group">
          <select value={t.group} onChange={(e) => patchField({ group: e.target.value })} className={selCls + ' normal-case'}>
            {GROUPS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Prop>
        <Prop label="Linked problem">
          <select aria-label="Linked problem" disabled={t.type !== 'incident'} title={t.type !== 'incident' ? 'Set Type to Incident to link a problem' : undefined} value={t.problemId ?? ''} onChange={(e) => patchField({ problemId: e.target.value || undefined })} className={selCls + ' normal-case disabled:bg-[#F8F9F9] disabled:text-[#87929D]'}>
            <option value="">-</option>
            {problems.map((p) => <option key={p.id} value={p.id}>#{p.number} {p.subject}</option>)}
          </select>
        </Prop>
        <Prop label="Product area">
          <select aria-label="Product area" value={t.productArea ?? derivedArea} onChange={(e) => patchField({ productArea: e.target.value })} className={selCls + ' normal-case'}>
            {['Billing & invoices', 'Account & login', 'Shipments', 'API & integrations', 'Other'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Prop>
      </div>

      {/* conversation */}
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <div className="px-6 pt-4 pb-3 border-b border-[#D8DCDE]">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 text-[22px] font-semibold text-[#2F3941]" data-agent="zd-ticket-subject">{t.subject}</div>
            <span className="relative">
              <button data-zd-trigger aria-label="Ticket options" onClick={() => setMenu((m) => !m)} className="w-8 h-8 rounded-[4px] hover:bg-[#F8F9F9] flex items-center justify-center text-[#68737D]"><MoreHorizontal size={18} /></button>
              {menu && (
                <ZPop onClose={() => setMenu(false)} className="right-0 top-9 w-[230px]" agent="zd-ticket-options">
                  <ZItem onClick={() => { setMenu(false); setDialog('merge') }}>Merge into another ticket</ZItem>
                  <ZItem onClick={() => { setMenu(false); setDialog('jira') }}>Link to Jira issue</ZItem>
                  <ZItem onClick={() => { setMenu(false); patchField({ status: 'closed', tags: Array.from(new Set([...t.tags, 'spam'])) }); flash(`#${t.number} marked as spam`); onDone() }}>Mark as spam</ZItem>
                  <ZItem onClick={() => { setMenu(false); flash(`Printing ticket #${t.number}…`) }}>Print ticket</ZItem>
                  <div className="h-px bg-[#E9EBED] my-1" />
                  <ZItem danger onClick={() => { setMenu(false); setDialog('delete') }}>Delete</ZItem>
                </ZPop>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[13px] text-[#68737D]">
            {t.channel === 'email' ? <Mail size={14} /> : t.channel === 'chat' ? <MessageSquare size={14} /> : t.channel === 'phone' ? <Phone size={14} /> : <Globe size={14} />}
            Via {t.channel === 'web' ? 'Web form' : t.channel === 'chat' ? 'Messaging' : t.channel === 'phone' ? 'Phone' : 'Email'} · <Badge s={t.status} small /> · #{t.number}
            {waiting(t) && <span className="ml-1 h-5 px-2 rounded-full bg-[#FFF0F1] text-[#CC3340] text-[12px] font-semibold flex items-center gap-1"><Clock size={12} /> First reply SLA breached · {Math.round(HOURS(t.created))}h</span>}
            {t.jiraKey && <button onClick={() => desk.open('jira', { issueKey: t.jiraKey })} className="ml-1 h-5 px-2 rounded-full bg-[#E9F2FE] text-[#1868DB] text-[12px] font-semibold flex items-center gap-1"><img src={logoUrl('jira')} className="w-3 h-3" alt="" />{t.jiraKey}</button>}
            {t.mergedInto && <button onClick={() => onOpen?.(t.mergedInto!)} className="ml-1 text-[12px] text-[#1F73B7] hover:underline">Merged into #{tickets.find((x) => x.id === t.mergedInto)?.number}</button>}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-6 py-4" data-agent="zd-conversation">
          {t.comments.map((c) => {
            const name = c.author === 'requester' ? t.requester.name : person(c.author).name
            return (
              <div key={c.id} className={`flex gap-3 mb-5 ${c.via === 'hworker' && HOURS(c.date) < 0.03 ? 'flash-new' : ''}`}>
                <ReqAvatar name={c.author === 'requester' ? t.requester.name : c.author} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-[#2F3941]">{name}</span>
                    {!c.public && <span className="text-[12px] text-[#AD5918] font-semibold">Internal note</span>}
                    {c.via === 'hworker' && <HW />}
                    <span className="text-[12px] text-[#68737D] ml-auto">{when(c.date)}</span>
                  </div>
                  {!!c.cc?.length && <div className="text-[12px] text-[#68737D]">CC: {c.cc.join(', ')}</div>}
                  <div className={`mt-1 text-[14px] leading-[1.55] text-[#2F3941] whitespace-pre-wrap ${!c.public ? 'bg-[#FFF7ED] border border-[#FCDBA9] rounded-[4px] px-3 py-2' : ''}`}><RichText text={c.body} /></div>
                  {!!c.attachments?.length && <div className="flex flex-wrap gap-2 mt-2">{c.attachments.map((a) => <span key={a.name} className="h-7 px-2 rounded-[4px] border border-[#D8DCDE] text-[12px] flex items-center gap-1.5"><FileText size={13} className="text-[#68737D]" />{a.name} <span className="text-[#87929D]">{Math.max(1, Math.round(a.size / 1024))} KB</span></span>)}</div>}
                </div>
              </div>
            )
          })}
        </div>
        {/* composer */}
        <div className={`mx-4 mb-3 rounded-[8px] border ${mode === 'internal' ? 'border-[#FCDBA9] bg-[#FFF7ED]' : 'border-[#C2C8CC] bg-white'}`}>
          <div className="flex items-center gap-2 px-3 h-10 border-b border-black/5 text-[14px]">
            <div className="relative">
              <button data-agent="zd-reply-mode" onClick={() => setModeOpen((o) => !o)} className="flex items-center gap-1 font-semibold text-[#2F3941] h-7 px-2 -ml-2 rounded hover:bg-black/5">
                {mode === 'public' ? <MessageSquare size={15} /> : <Zap size={15} className="text-[#AD5918]" />} {mode === 'public' ? 'Public reply' : 'Internal note'} <ChevronDown size={14} />
              </button>
              {modeOpen && (
                <div className="absolute bottom-8 left-0 z-30 w-[180px] bg-white rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-[#D8DCDE] py-1">
                  {(['public', 'internal'] as const).map((m) => (
                    <button key={m} data-agent={`zd-reply-mode-${m}`} onClick={() => { setMode(m); setModeOpen(false) }} className="w-full text-left px-3 py-1.5 hover:bg-[#EDF7FF] text-[14px]">{m === 'public' ? 'Public reply' : 'Internal note'}</button>
                  ))}
                </div>
              )}
            </div>
            {mode === 'public' && <span className="text-[#68737D]">To <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#E9EBED] text-[#2F3941] text-[13px]">{t.requester.name}</span></span>}
            {mode === 'public' && cc?.map((x) => <span key={x} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-[#E9EBED] text-[#2F3941] text-[13px]">{x}<button aria-label={`Remove ${x}`} onClick={() => setCc(cc.filter((y) => y !== x))}><X size={11} /></button></span>)}
            {mode === 'public' && cc !== null && <input autoFocus aria-label="CC" value={ccText} onChange={(e) => setCcText(e.target.value)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && /\S+@\S+\.\S+/.test(ccText.trim())) { e.preventDefault(); setCc([...(cc ?? []), ccText.trim()]); setCcText('') } }} placeholder="Add CC email" className="w-[160px] h-6 px-1 text-[13px] outline-none bg-transparent" />}
            <div className="flex-1" />
            {mode === 'public' && <button className="text-[13px] text-[#1F73B7] hover:underline" onClick={() => setCc(cc === null ? [] : null)}>CC</button>}
          </div>
          <textarea
            ref={taRef}
            data-agent="zd-composer"
            aria-label={mode === 'public' ? 'Public reply' : 'Internal note'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={mode === 'public' ? `Reply to ${t.requester.name}…` : 'Add an internal note visible only to agents…'}
            className="w-full resize-none outline-none px-3 py-2 text-[14px] leading-[1.55] bg-transparent text-[#2F3941]"
          />
          {files.length > 0 && <div className="flex flex-wrap gap-2 px-3 pb-2">{files.map((f, n) => <span key={n} className="h-7 pl-2 pr-1 rounded-[4px] border border-[#D8DCDE] bg-white text-[12px] flex items-center gap-1.5"><Paperclip size={12} />{f.name}<button aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, i) => i !== n))}><X size={11} /></button></span>)}</div>}
          <div className="flex items-center gap-0.5 px-2 pb-2 text-[#68737D] relative">
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Bold" onClick={() => wrapSel('**')}><Bold size={16} /></button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Italic" onClick={() => wrapSel('_')}><Italic size={16} /></button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Link" onClick={() => wrapSel('[', '](https://)', 'link text')}><Link2 size={16} /></button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Numbered list" onClick={() => insertText(`${text && !text.endsWith('\n') ? '\n' : ''}1. `)}><ListOrdered size={16} /></button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Code" onClick={() => wrapSel('`', '`', 'code')}><Code size={16} /></button>
            <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Attach file" onClick={() => fileRef.current?.click()}><Paperclip size={16} /></button>
            <span className="relative">
              <button data-zd-trigger className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5" aria-label="Emoji" onClick={() => setEmoji((x) => !x)}><Smile size={16} /></button>
              {emoji && (
                <ZPop onClose={() => setEmoji(false)} className="bottom-9 left-0 w-[216px] px-2 grid grid-cols-6 gap-1">
                  {EMOJI.map((e) => <button key={e} onClick={() => { insertText(e); setEmoji(false) }} className="w-8 h-8 rounded hover:bg-[#EDF7FF] text-[18px]">{e}</button>)}
                </ZPop>
              )}
            </span>
            {applied.length > 0 && <span className="ml-2 text-[12px] text-[#68737D]">Macro applied: {macros.find((m) => m.id === applied[applied.length - 1])?.title}</span>}
          </div>
        </div>
        <div className="h-[60px] shrink-0 border-t border-[#D8DCDE] flex items-center px-4 gap-3 bg-white">
          <div className="relative">
            <button data-agent="zd-macro-btn" onClick={() => setMacroOpen((o) => !o)} className="h-9 px-3 rounded-[4px] border border-[#C2C8CC] text-[14px] text-[#2F3941] flex items-center gap-2 hover:bg-[#F8F9F9]">
              <Zap size={15} /> Apply macro <ChevronDown size={14} />
            </button>
            {macroOpen && (
              <div className="absolute bottom-11 left-0 z-30 w-[380px] bg-white rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.2)] border border-[#D8DCDE] py-2" data-agent="zd-macro-menu">
                <div className="px-3 pb-2"><input data-agent="zd-macro-search" autoFocus value={mq} onChange={(e) => setMq(e.target.value)} placeholder="Search macros" className="w-full h-8 px-2.5 rounded-[4px] border border-[#C2C8CC] text-[14px] outline-none focus:border-[#1F73B7]" /></div>
                <div className="max-h-[320px] overflow-auto">
                  {fm.map((m) => (
                    <button key={m.id} data-agent={`zd-macro-${m.id}`} onClick={() => applyMacro(m)} className="w-full text-left px-4 py-2 hover:bg-[#EDF7FF] text-[14px] text-[#2F3941]">
                      {m.title.split('::').map((p, i, arr) => <span key={i} className={i < arr.length - 1 ? 'text-[#68737D]' : ''}>{p}{i < arr.length - 1 ? ' › ' : ''}</span>)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-[13px] text-[#68737D]"><input type="checkbox" checked={closeAfter} onChange={(e) => setCloseAfter(e.target.checked)} className="accent-[#1F73B7]" /> Close tab after submitting</label>
          <div className="relative flex">
            <button data-agent="zd-submit" onClick={() => submit(status)} className="h-9 pl-4 pr-3 rounded-l-[4px] bg-[#2F3941] hover:bg-[#1F262C] text-white text-[14px] font-semibold flex items-center gap-2">
              Submit as <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: STATUS[status].bg }} />{STATUS[status].label}</span>
            </button>
            <button data-agent="zd-submit-menu" aria-label="Submit options" onClick={() => setSubmitOpen((o) => !o)} className="h-9 w-9 rounded-r-[4px] bg-[#2F3941] hover:bg-[#1F262C] text-white border-l border-white/25 flex items-center justify-center"><ChevronDown size={16} /></button>
            {submitOpen && (
              <div className="absolute bottom-11 right-0 z-30 w-[220px] bg-white rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.2)] border border-[#D8DCDE] py-1">
                {['open', 'pending', 'hold', 'solved'].map((s) => (
                  <button key={s} data-agent={`zd-submit-as-${s}`} onClick={() => submit(s)} className="w-full text-left px-4 py-2 hover:bg-[#EDF7FF] text-[14px] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-[3px]" style={{ background: STATUS[s].bg }} /> Submit as <b>{STATUS[s].label}</b>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* context panel */}
      <div className="w-[320px] shrink-0 border-l border-[#D8DCDE] flex">
        <div className="flex-1 min-w-0 overflow-auto px-5 py-4">
          {panel === 'user' && (
            <>
              <div className="flex items-center gap-3">
                <ReqAvatar name={t.requester.name} size={48} />
                <div className="min-w-0">
                  <button onClick={() => onCustomer?.(t.requester.email)} className="text-[16px] font-semibold text-[#2F3941] hover:underline text-left">{t.requester.name}</button>
                  <div className="text-[13px] text-[#68737D] truncate">{t.requester.org}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-[13px]">
                {[['Email', t.requester.email], ['Phone', '+1 (206) 555-01' + (t.number % 90)], ['Local time', new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' PST'], ['Language', 'English (United States)'], ['Plan', t.tags.includes('billing') ? 'Business · billed monthly' : 'Enterprise']].map(([k, v]) => (
                  <div key={k} className="flex"><span className="w-[90px] shrink-0 text-[#68737D]">{k}</span><span className="text-[#2F3941] truncate">{v}</span></div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">{['vip' + (t.number % 3 === 0 ? '' : '_no'), t.requester.org.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')].filter((x) => !x.endsWith('_no')).map((g) => <span key={g} className="h-6 px-2 rounded-[4px] bg-[#E9EBED] text-[12px] flex items-center">{g}</span>)}</div>
              <div className="mt-4 text-[13px] font-semibold text-[#2F3941] mb-1">Notes</div>
              <textarea key={t.requester.email} defaultValue={userRec?.notes ?? ''} onBlur={(e) => e.target.value !== (userRec?.notes ?? '') && db.upsert('zendesk.users', { id: t.requester.email, notes: e.target.value })} rows={2} placeholder="Add user notes" className="w-full px-2 py-1.5 rounded-[4px] border border-[#C2C8CC] text-[13px] outline-none focus:border-[#1F73B7] resize-none" aria-label="User notes" />
              <div className="mt-5 text-[14px] font-semibold text-[#2F3941] mb-2">Interactions</div>
              <div className="relative pl-4 border-l-2 border-[#E9EBED] space-y-4">
                <div className="text-[13px]"><span className="absolute -left-[5px] w-2 h-2 rounded-full bg-[#1F73B7]" style={{ marginTop: 5 }} /><div className="font-semibold">{t.subject}</div><div className="text-[#68737D]">Created {ago(t.created)} · <Badge s={t.status} small /></div></div>
                {others.map((o) => (
                  <button key={o.id} onClick={() => onOpen?.(o.id)} className="block text-left text-[13px]"><div className="font-semibold text-[#1F73B7] hover:underline">{o.subject}</div><div className="text-[#68737D]">{ago(o.created)} · <Badge s={o.status} small /></div></button>
                ))}
              </div>
            </>
          )}
          {panel === 'kb' && (
            <div data-agent="zd-kb-panel">
              <div className="text-[16px] font-semibold mb-2">Knowledge</div>
              <div className="relative mb-3"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#68737D]" /><input value={kq} onChange={(e) => setKq(e.target.value)} placeholder="Search Help Center" aria-label="Search Help Center" className="w-full h-8 pl-8 pr-2 rounded-[4px] border border-[#C2C8CC] text-[13px] outline-none focus:border-[#1F73B7]" /></div>
              {!kq && <div className="text-[12px] text-[#68737D] mb-2">Suggested for this ticket</div>}
              {kbHits.slice(0, 8).map((a) => (
                <div key={a.id} className="py-2 border-b border-[#E9EBED]">
                  <div className="text-[14px] font-semibold text-[#2F3941]">{a.title}</div>
                  <div className="text-[12px] text-[#68737D] line-clamp-2">{a.body.replace(/\*\*/g, '')}</div>
                  <div className="flex gap-3 mt-1 text-[12px]">
                    <button className="text-[#1F73B7] hover:underline" onClick={() => { insertText(`${text && !text.endsWith('\n') ? '\n\n' : ''}${a.title}: https://support.northwind.com/hc/articles/${a.id}`); setMode('public') }}>Link in reply</button>
                    <button className="text-[#1F73B7] hover:underline" onClick={() => insertText(`${text && !text.endsWith('\n') ? '\n\n' : ''}${a.body}`)}>Quote in reply</button>
                  </div>
                </div>
              ))}
              {!kbHits.length && <div className="text-[13px] text-[#68737D]">No articles found.</div>}
            </div>
          )}
          {panel === 'apps' && (
            <div data-agent="zd-apps-panel">
              <div className="text-[16px] font-semibold mb-3">Apps</div>
              <div className="rounded-[6px] border border-[#D8DCDE] p-3">
                <div className="flex items-center gap-2 text-[14px] font-semibold"><img src={logoUrl('jira')} className="w-5 h-5" alt="" /> Jira</div>
                {linkedJira ? (
                  <div className="mt-2 text-[13px]">
                    <div className="text-[#68737D]">Linked issue</div>
                    <button onClick={() => desk.open('jira', { issueKey: linkedJira.key })} className="text-[#1F73B7] hover:underline font-semibold flex items-center gap-1">{linkedJira.key} <ExternalLink size={12} /></button>
                    <div>{linkedJira.summary}</div>
                    <div className="mt-1 text-[#68737D]">Status: <b className="text-[#2F3941]">{linkedJira.status}</b> · {linkedJira.assignee ? person(linkedJira.assignee).name : 'Unassigned'}</div>
                    <button className="mt-2 text-[12px] text-[#CC3340] hover:underline" onClick={() => patchField({ jiraKey: undefined })}>Unlink</button>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] text-[#68737D] mt-1">Escalate this ticket to engineering.</div>
                    <div className="flex gap-2 mt-2"><button className={zPrimary + ' !h-7 !px-3 text-[13px]'} onClick={() => setDialog('jira')}>Create / link issue</button></div>
                  </>
                )}
              </div>
              <div className="rounded-[6px] border border-[#D8DCDE] p-3 mt-3">
                <div className="flex items-center gap-2 text-[14px] font-semibold"><img src={logoUrl('slack')} className="w-5 h-5" alt="" /> Slack</div>
                <div className="text-[13px] text-[#68737D] mt-1">Discuss this ticket with your team in Slack.</div>
                <button className={zBtn + ' !h-7 mt-2 text-[13px]'} onClick={() => desk.open('slack')}>Open Slack</button>
              </div>
            </div>
          )}
          {panel === 'talk' && (
            <div data-agent="zd-talk-panel">
              <div className="text-[16px] font-semibold mb-3">Talk</div>
              {call ? (
                <>
                  <div className="rounded-[6px] bg-[#EDF7FF] p-3 text-[14px]"><div className="font-semibold flex items-center gap-2"><PhoneCall size={15} className="text-[#038153]" /> On call with {first}</div><div className="text-[24px] font-semibold mt-1 tabular-nums">{String(Math.floor(callSecs / 60)).padStart(2, '0')}:{String(callSecs % 60).padStart(2, '0')}</div></div>
                  <div className="text-[13px] font-semibold mt-3 mb-1">Call notes</div>
                  <textarea value={call.notes} onChange={(e) => setCall({ ...call, notes: e.target.value })} rows={4} className="w-full px-2 py-1.5 rounded-[4px] border border-[#C2C8CC] text-[13px] outline-none focus:border-[#1F73B7]" aria-label="Call notes" />
                  <button className={zDanger + ' w-full mt-2'} onClick={() => {
                    const m = Math.max(1, Math.round(callSecs / 60))
                    const now = new Date().toISOString()
                    db.update('zendesk.tickets', t.id, { updated: now, comments: [...t.comments, { id: `c-${Date.now()}call`, author: ME.id, public: false, body: `Outbound call to ${t.requester.name} (+1 (206) 555-01${t.number % 90}) · ${m} min${call.notes.trim() ? `\n\n${call.notes.trim()}` : ''}`, date: now, channel: 'voice' }] })
                    setCall(null)
                    flash('Call ended — summary added as an internal note')
                  }}>End call</button>
                </>
              ) : (
                <>
                  <div className="text-[13px] text-[#68737D]">{t.requester.name} · +1 (206) 555-01{t.number % 90}</div>
                  <button className={zPrimary + ' w-full mt-3 flex items-center justify-center gap-2'} onClick={() => setCall({ start: Date.now(), notes: '' })}><PhoneCall size={15} /> Call requester</button>
                  <div className="text-[12px] text-[#68737D] mt-2">A call summary is added to the ticket as an internal note when you hang up.</div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="w-[44px] shrink-0 border-l border-[#D8DCDE] flex flex-col items-center py-2 gap-1 text-[#68737D]">
          {([['user', User, 'Customer context'], ['kb', BookOpen, 'Knowledge'], ['apps', Puzzle, 'Apps'], ['talk', Phone, 'Talk']] as const).map(([k, I, l]) => (
            <button key={k} aria-label={l} title={l} onClick={() => setPanel(k)} className={`w-9 h-9 rounded flex items-center justify-center ${panel === k ? 'bg-[#EDF7FF] text-[#1F73B7]' : 'hover:bg-[#F8F9F9]'}`}><I size={18} /></button>
          ))}
        </div>
      </div>
      {dialog === 'merge' && (
        <ZModal title="Merge into another ticket" onClose={() => setDialog(null)} footer={<><button className={zBtn} onClick={() => setDialog(null)}>Cancel</button><button className={zPrimary} disabled={!mergeTo} onClick={() => {
          const target = tickets.find((x) => x.id === mergeTo)
          if (!target) return
          const now = new Date().toISOString()
          db.update('zendesk.tickets', t.id, { status: 'closed', mergedInto: target.id, updated: now, tags: Array.from(new Set([...t.tags, 'merged'])), comments: [...t.comments, { id: `c-${Date.now()}m`, author: ME.id, public: false, body: `This ticket was closed and merged into ticket #${target.number} “${target.subject}”.`, date: now }] })
          db.update('zendesk.tickets', target.id, { updated: now, comments: [...target.comments, { id: `c-${Date.now()}mt`, author: ME.id, public: false, body: `Ticket #${t.number} was merged into this ticket.\n\n${t.comments.filter((c) => c.public).map((c) => c.body).join('\n\n---\n\n')}`, date: now }] })
          flash(`#${t.number} merged into #${target.number}`)
          setDialog(null)
          onOpen?.(target.id)
        }}>Merge</button></>}>
          <div className="mb-2">Merge #{t.number} into:</div>
          <select value={mergeTo} onChange={(e) => setMergeTo(e.target.value)} className={zInput} aria-label="Merge into ticket">
            <option value="">Choose a ticket…</option>
            {[...others, ...tickets.filter((x) => x.requester.email !== t.requester.email && x.id !== t.id)].filter((x) => x.status !== 'closed').map((x) => <option key={x.id} value={x.id}>#{x.number} {x.subject} — {x.requester.name}</option>)}
          </select>
          <div className="text-[13px] text-[#68737D] mt-2">#{t.number} will be closed. Its public comments are copied into the target ticket as an internal note.</div>
        </ZModal>
      )}
      {dialog === 'delete' && (
        <ZModal title={`Delete ticket #${t.number}?`} onClose={() => setDialog(null)} footer={<><button className={zBtn} onClick={() => setDialog(null)}>Cancel</button><button className={zDanger} onClick={() => { db.remove('zendesk.tickets', t.id); flash(`Ticket #${t.number} deleted`); setDialog(null); onDone() }}>Delete</button></>}>
          “{t.subject}” and its {t.comments.length} comment{t.comments.length === 1 ? '' : 's'} will be deleted. This can’t be undone.
        </ZModal>
      )}
      {dialog === 'jira' && (
        <ZModal title="Link to Jira" onClose={() => setDialog(null)} footer={<><button className={zBtn} onClick={() => setDialog(null)}>Cancel</button><button className={zBtn} disabled={!jira.some((j: any) => j.key === jiraKey.trim().toUpperCase())} onClick={() => { patchField({ jiraKey: jiraKey.trim().toUpperCase() }); flash(`Linked to ${jiraKey.trim().toUpperCase()}`); setDialog(null) }}>Link existing</button><button className={zPrimary} onClick={createJira}>Create issue</button></>}>
          <div className="text-[13px] mb-3">Create a new Jira issue in <b>Operations Platform (OPS)</b> from this ticket, or link an existing one.</div>
          <div className="text-[12px] text-[#68737D] mb-1">Existing issue key</div>
          <input value={jiraKey} onChange={(e) => setJiraKey(e.target.value)} placeholder="OPS-123" className={zInput} list="zd-jira-keys" aria-label="Jira issue key" />
          <datalist id="zd-jira-keys">{jira.slice(-40).map((j: any) => <option key={j.key} value={j.key}>{j.summary}</option>)}</datalist>
        </ZModal>
      )}
    </div>
  )
}

/* ─────────────────────────── New ticket ─────────────────────────── */

export function NewTicket({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const { isAgent } = useDesk()
  const flash = useZFlash()
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const customers = Array.from(new Map(tickets.map((t) => [t.requester.email, t.requester])).values())
  const [f, setF] = useState({ name: '', email: '', org: '', subject: '', body: '', type: 'question', priority: 'normal', group: 'Support', assignee: '', tags: '', channel: 'phone' })
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const create = (status: string) => {
    if (!f.name.trim() || !/\S+@\S+\.\S+/.test(f.email)) return setErr('Requester name and a valid email are required')
    if (!f.subject.trim()) return setErr('Subject is required')
    if (!f.body.trim()) return setErr('Description is required')
    const now = new Date().toISOString()
    const number = nextNumber(tickets)
    const id = `zd-${number}`
    db.insert('zendesk.tickets', {
      id, number, subject: f.subject.trim(), requester: { name: f.name.trim(), email: f.email.trim(), org: f.org.trim() || '—' }, status, priority: f.priority, type: f.type, group: f.group, assignee: f.assignee, tags: f.tags.split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean), channel: f.channel, created: now, updated: now,
      comments: [{ id: `c-${Date.now()}`, author: f.channel === 'web' || f.channel === 'email' ? 'requester' : ME.id, public: true, body: f.body.trim(), date: now, via: isAgent ? 'hworker' : undefined }],
      createdBy: isAgent ? 'hworker' : undefined, updatedBy: isAgent ? 'hworker' : undefined,
    })
    flash(`Ticket #${number} created`)
    onCreated(id)
  }
  const sel = 'w-full h-9 px-2.5 rounded-[4px] border border-[#C2C8CC] bg-white text-[14px] outline-none focus:border-[#1F73B7] capitalize'
  return (
    <div className="flex-1 min-h-0 flex" data-agent="zd-new-ticket">
      <div className="w-[290px] shrink-0 border-r border-[#D8DCDE] bg-[#F8F9F9] overflow-auto px-5 py-4">
        <Prop label="Requester">
          <input data-agent="zd-new-requester" value={f.name} onChange={(e) => { set({ name: e.target.value }); setErr('') }} list="zd-customers" placeholder="Search or add a user" onBlur={() => { const c = customers.find((x) => x.name === f.name); if (c) set({ email: c.email, org: c.org }) }} className={zInput} aria-label="Requester name" />
          <datalist id="zd-customers">{customers.map((c) => <option key={c.email} value={c.name}>{c.email}</option>)}</datalist>
          <input value={f.email} onChange={(e) => { set({ email: e.target.value }); setErr('') }} placeholder="Email" className={zInput + ' mt-1.5'} aria-label="Requester email" />
          <input value={f.org} onChange={(e) => set({ org: e.target.value })} placeholder="Organization" className={zInput + ' mt-1.5'} aria-label="Organization" />
        </Prop>
        <Prop label="Assignee"><select value={f.assignee} onChange={(e) => set({ assignee: e.target.value })} className={sel + ' normal-case'} aria-label="Assignee"><option value="">-</option>{AGENTS.map((a) => <option key={a} value={a}>{person(a).name}</option>)}</select></Prop>
        <Prop label="Tags"><input value={f.tags} onChange={(e) => set({ tags: e.target.value })} className={zInput} aria-label="Tags" placeholder="billing refund" /></Prop>
        <div className="grid grid-cols-2 gap-3">
          <Prop label="Type"><select value={f.type} onChange={(e) => set({ type: e.target.value })} className={sel} aria-label="Type">{['question', 'incident', 'problem', 'task'].map((x) => <option key={x}>{x}</option>)}</select></Prop>
          <Prop label="Priority"><select value={f.priority} onChange={(e) => set({ priority: e.target.value })} className={sel} aria-label="Priority">{['low', 'normal', 'high', 'urgent'].map((x) => <option key={x}>{x}</option>)}</select></Prop>
        </div>
        <Prop label="Group"><select value={f.group} onChange={(e) => set({ group: e.target.value })} className={sel + ' normal-case'} aria-label="Group">{GROUPS.map((x) => <option key={x}>{x}</option>)}</select></Prop>
        <Prop label="Channel"><select value={f.channel} onChange={(e) => set({ channel: e.target.value })} className={sel} aria-label="Channel">{['phone', 'email', 'web', 'chat'].map((x) => <option key={x}>{x}</option>)}</select></Prop>
      </div>
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <div className="px-6 pt-5 pb-3 border-b border-[#D8DCDE]">
          <input data-agent="zd-new-subject" value={f.subject} onChange={(e) => { set({ subject: e.target.value }); setErr('') }} placeholder="Subject" className="w-full text-[22px] font-semibold outline-none placeholder:text-[#C2C8CC]" aria-label="Subject" />
          <div className="text-[13px] text-[#68737D] mt-1">New ticket</div>
        </div>
        {err && <div className="mx-6 mt-3 px-3 py-2 rounded-[4px] bg-[#FFF0F1] text-[#CC3340] text-[14px]">{err}</div>}
        <div className="flex-1 p-6">
          <textarea data-agent="zd-new-body" value={f.body} onChange={(e) => { set({ body: e.target.value }); setErr('') }} rows={12} placeholder="Describe the customer’s request…" className="w-full h-full min-h-[240px] rounded-[8px] border border-[#C2C8CC] px-3 py-2 text-[14px] outline-none focus:border-[#1F73B7] resize-none" aria-label="Description" />
        </div>
        <div className="h-[60px] shrink-0 border-t border-[#D8DCDE] flex items-center px-4 gap-3">
          <button className={zBtn} onClick={onCancel}>Cancel</button>
          <div className="flex-1" />
          <div className="relative flex">
            <button data-agent="zd-new-submit" onClick={() => create('new')} className="h-9 pl-4 pr-3 rounded-l-[4px] bg-[#2F3941] hover:bg-[#1F262C] text-white text-[14px] font-semibold flex items-center gap-2">Submit as <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: STATUS.new.bg }} />New</span></button>
            <button data-zd-trigger aria-label="Submit options" onClick={() => setOpen((o) => !o)} className="h-9 w-9 rounded-r-[4px] bg-[#2F3941] hover:bg-[#1F262C] text-white border-l border-white/25 flex items-center justify-center"><ChevronDown size={16} /></button>
            {open && (
              <ZPop onClose={() => setOpen(false)} className="bottom-11 right-0 w-[220px]">
                {['open', 'pending', 'hold', 'solved'].map((s) => <ZItem key={s} onClick={() => { setOpen(false); create(s) }}><span className="w-3 h-3 rounded-[3px]" style={{ background: STATUS[s].bg }} /> Submit as <b>{STATUS[s].label}</b></ZItem>)}
              </ZPop>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
