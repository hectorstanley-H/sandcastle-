import { useEffect, useMemo, useState } from 'react'
import {
  Home, List, Users, Building2, BarChart3, Settings, LayoutGrid, Search, Plus, X, ChevronDown, Bell, HelpCircle, RefreshCw,
  Bold, Italic, Link2, ListOrdered, Paperclip, Smile, Code, MessageSquare, Mail, Globe, Phone, User, BookOpen, Puzzle, Zap, Clock, MoreHorizontal, Star,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection, useRecord } from '@/db/db'
import { ME, person, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'

type Comment = { id: string; author: string; public: boolean; body: string; date: string; via?: string }
type Ticket = {
  id: string; number: number; subject: string; requester: { name: string; email: string; org: string }; status: string; priority: string; type: string
  group: string; assignee: string; tags: string[]; channel: string; created: string; updated: string; comments: Comment[]; updatedBy?: string
}
type Macro = { id: string; title: string; body: string; status?: string; tags?: string[]; category: string }

const STATUS: Record<string, { label: string; bg: string; fg: string; letter: string }> = {
  new: { label: 'New', bg: '#FFB648', fg: '#703B15', letter: 'N' },
  open: { label: 'Open', bg: '#E34F32', fg: '#fff', letter: 'O' },
  pending: { label: 'Pending', bg: '#3091EC', fg: '#fff', letter: 'P' },
  hold: { label: 'On-hold', bg: '#2F3941', fg: '#fff', letter: 'H' },
  solved: { label: 'Solved', bg: '#87929D', fg: '#fff', letter: 'S' },
  closed: { label: 'Closed', bg: '#D8DCDE', fg: '#49545C', letter: 'C' },
}
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Inter, Roboto, 'Helvetica Neue', Arial, sans-serif"
const HOURS = (iso: string) => (Date.now() - +new Date(iso)) / 3600_000
const waiting = (t: Ticket) => ['new', 'open'].includes(t.status) && HOURS(t.created) > 24 && !t.comments.some((c) => c.author !== 'requester' && c.public)

const VIEWS: { id: string; name: string; pred: (t: Ticket) => boolean }[] = [
  { id: 'your-unsolved', name: 'Your unsolved tickets', pred: (t) => t.assignee === ME.id && !['solved', 'closed'].includes(t.status) },
  { id: 'unassigned', name: 'Unassigned tickets', pred: (t) => !t.assignee && ['new', 'open'].includes(t.status) },
  { id: 'all-unsolved', name: 'All unsolved tickets', pred: (t) => !['solved', 'closed'].includes(t.status) },
  { id: 'waiting', name: 'SLA: First reply > 24h', pred: waiting },
  { id: 'recent', name: 'Recently updated tickets', pred: (t) => HOURS(t.updated) < 72 },
  { id: 'pending', name: 'Pending tickets', pred: (t) => t.status === 'pending' },
  { id: 'solved', name: 'Recently solved tickets', pred: (t) => t.status === 'solved' },
  { id: 'billing', name: 'Billing queue', pred: (t) => t.group === 'Billing' && !['solved', 'closed'].includes(t.status) },
]

const ago = (iso: string) => {
  const h = HOURS(iso)
  if (h < 1) return Math.round(h * 60) <= 1 ? '1 minute ago' : `${Math.round(h * 60)} minutes ago`
  if (h < 24) return Math.round(h) === 1 ? '1 hour ago' : `${Math.round(h)} hours ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'Yesterday' : `${d} days ago`
}
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function Badge({ s, small }: { s: string; small?: boolean }) {
  const st = STATUS[s] ?? STATUS.open
  return <span className={`inline-flex items-center justify-center rounded-[4px] font-semibold whitespace-nowrap ${small ? 'h-[18px] px-1.5 text-[11px]' : 'h-5 px-2 text-[12px]'}`} style={{ background: st.bg, color: st.fg }}>{st.label}</span>
}
function HW() {
  return <span className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-full bg-[#430693] text-white text-[10.5px] font-semibold"><img src={logoUrl('hworker')} className="w-2.5 h-2.5" alt="" />H-Worker</span>
}

function ReqAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const internal = PEOPLE.find((p) => p.id === name)
  return internal ? <Avatar id={name} size={size} /> : <Avatar name={name} size={size} />
}

/* ─────────────────────────── Views ─────────────────────────── */

function ViewsPage({ view, setView, onOpen }: { view: string; setView: (v: string) => void; onOpen: (id: string) => void }) {
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const v = VIEWS.find((x) => x.id === view) ?? VIEWS[1]
  const rows = tickets.filter(v.pred).sort((a, b) => (v.id === 'recent' || v.id === 'solved' ? +new Date(b.updated) - +new Date(a.updated) : +new Date(a.created) - +new Date(b.created)))
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="w-[280px] shrink-0 border-r border-[#D8DCDE] bg-[#F8F9F9] flex flex-col">
        <div className="h-[60px] flex items-center px-5 gap-2">
          <h2 className="text-[22px] font-semibold text-[#2F3941]">Views</h2>
          <div className="flex-1" />
          <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#E9EBED] text-[#68737D]" aria-label="Refresh"><RefreshCw size={16} /></button>
        </div>
        <div className="flex-1 overflow-auto px-2">
          {VIEWS.map((x) => {
            const n = tickets.filter(x.pred).length
            return (
              <button key={x.id} data-agent={`zd-view-${x.id}`} onClick={() => setView(x.id)} className={`w-full h-9 flex items-center px-3 rounded-[4px] text-[14px] text-left ${view === x.id ? 'bg-[#D8DCDE]/70 font-semibold text-[#2F3941]' : 'text-[#2F3941] hover:bg-[#E9EBED]'}`}>
                <span className="flex-1 truncate">{x.name}</span>
                <span className={`text-[13px] ${x.id === 'waiting' && n ? 'text-[#CC3340] font-semibold' : 'text-[#68737D]'}`}>{n}</span>
              </button>
            )
          })}
          <div className="h-px bg-[#D8DCDE] my-3 mx-2" />
          <button className="w-full h-9 flex items-center px-3 text-[14px] text-[#1F73B7] hover:underline">Manage views</button>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <div className="px-6 pt-5 pb-3 flex items-end gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-[#2F3941] flex items-center gap-2" data-agent="zd-view-title">{v.name} <Star size={16} className="text-[#87929D]" /></h1>
            <div className="text-[14px] text-[#68737D] mt-0.5">{rows.length} tickets</div>
          </div>
          <div className="flex-1" />
          <button className="h-8 px-3 rounded-[4px] border border-[#C2C8CC] text-[14px] text-[#2F3941] hover:bg-[#F8F9F9] flex items-center gap-1">Actions <ChevronDown size={14} /></button>
          <button className="h-8 px-4 rounded-[4px] bg-[#1F73B7] text-white text-[14px] font-semibold hover:bg-[#144A75]">Play</button>
        </div>
        <div className="flex-1 overflow-auto px-6" data-agent="zd-ticket-table">
          <table className="w-full text-[14px] text-[#2F3941] [&_td]:px-2 [&_th]:px-2">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]">
                <th className="w-8"><input type="checkbox" className="w-4 h-4 accent-[#1F73B7]" /></th>
                <th className="w-[80px] font-semibold">Status</th>
                <th className="w-[80px] font-semibold">ID</th>
                <th className="font-semibold">Subject</th>
                <th className="font-semibold">Requester</th>
                <th className="font-semibold">Requested ↑</th>
                <th className="font-semibold">Priority</th>
                <th className="font-semibold">Group</th>
                <th className="font-semibold">Assignee</th>
                <th className="font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} data-agent={`zd-ticket-row-${t.id}`} onClick={() => onOpen(t.id)} className={`h-[44px] border-b border-[#E9EBED] hover:bg-[#EDF7FF] cursor-pointer ${t.updatedBy === 'hworker' && HOURS(t.updated) < 0.03 ? 'flash-new' : ''}`}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="w-4 h-4 accent-[#1F73B7]" /></td>
                  <td><Badge s={t.status} small /></td>
                  <td className="text-[#68737D]">#{t.number}</td>
                  <td className="max-w-[300px]">
                    <span className="truncate block font-semibold">{t.subject}</span>
                  </td>
                  <td className="whitespace-nowrap">{t.requester.name}</td>
                  <td className={`whitespace-nowrap ${waiting(t) ? 'text-[#CC3340] font-semibold' : ''}`}>{ago(t.created)}</td>
                  <td className="capitalize">{t.priority || '-'}</td>
                  <td className="whitespace-nowrap">{t.group}</td>
                  <td className="whitespace-nowrap">{t.assignee ? person(t.assignee).name : <span className="text-[#87929D]">-</span>}</td>
                  <td className="whitespace-nowrap text-[13px]"><span className="inline-flex items-center gap-1.5">{ago(t.updated)} {t.updatedBy === 'hworker' && <HW />}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} className="py-16 text-center text-[#68737D]">No tickets in this view. Nice work!</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Ticket ─────────────────────────── */

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[14px] font-semibold text-[#2F3941] mb-1">{label}</div>
      {children}
    </div>
  )
}
const selCls = 'w-full h-9 px-2.5 rounded-[4px] border border-[#C2C8CC] bg-white text-[14px] text-[#2F3941] outline-none focus:border-[#1F73B7] focus:shadow-[0_0_0_3px_rgba(31,115,183,0.35)] capitalize'

function TicketPage({ id, onDone }: { id: string; onDone: () => void }) {
  const { isAgent } = useDesk()
  const t = useRecord<Ticket>('zendesk.tickets', id)
  const macros = useCollection<Macro>('zendesk.macros')
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const [mode, setMode] = useState<'public' | 'internal'>('public')
  const [text, setText] = useState('')
  const [nextStatus, setNextStatus] = useState<string>('')
  const [macroOpen, setMacroOpen] = useState(false)
  const [mq, setMq] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [applied, setApplied] = useState<string[]>([])
  const [modeOpen, setModeOpen] = useState(false)
  useEffect(() => {
    setText('')
    setNextStatus('')
    setApplied([])
    setMode('public')
  }, [id])
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
    const comments = text.trim() ? [...t.comments, { id: `c-${Date.now()}`, author: ME.id, public: mode === 'public', body: text.trim(), date: now, via: isAgent ? 'hworker' : undefined }] : t.comments
    db.update('zendesk.tickets', t.id, { status: st, comments, updated: now, assignee: t.assignee || ME.id, updatedBy: isAgent ? 'hworker' : t.updatedBy })
    setText('')
    setSubmitOpen(false)
    onDone()
  }
  const others = tickets.filter((x) => x.requester.email === t.requester.email && x.id !== t.id)
  const fm = macros.filter((m) => !mq || m.title.toLowerCase().includes(mq.toLowerCase()))

  return (
    <div className="flex-1 min-h-0 flex">
      {/* properties */}
      <div className="w-[290px] shrink-0 border-r border-[#D8DCDE] bg-[#F8F9F9] overflow-auto px-5 py-4">
        <Prop label="Requester">
          <div className={`${selCls} flex items-center gap-2`}><ReqAvatar name={t.requester.name} size={22} /><span className="truncate normal-case">{t.requester.name}</span></div>
        </Prop>
        <Prop label="Assignee">
          <select data-agent="zd-field-assignee" aria-label="Assignee" value={t.assignee} onChange={(e) => patchField({ assignee: e.target.value })} className={selCls + ' normal-case'}>
            <option value="">-</option>
            {['alex', 'aisha', 'ryan', 'oliver'].map((p) => <option key={p} value={p}>{t.group} / {person(p).name}</option>)}
          </select>
        </Prop>
        <Prop label="Followers"><div className="text-[14px] text-[#1F73B7]">follow</div></Prop>
        <Prop label="Tags">
          <div className="min-h-9 p-1 rounded-[4px] border border-[#C2C8CC] bg-white flex flex-wrap gap-1">
            {t.tags.map((g) => <span key={g} className="h-6 px-2 rounded-[4px] bg-[#E9EBED] text-[12px] text-[#2F3941] flex items-center gap-1">{g} <X size={11} /></span>)}
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
            {['Support', 'Billing', 'Tier 2'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Prop>
        <Prop label="Linked problem"><div className={`${selCls} text-[#87929D] flex items-center normal-case`}>-</div></Prop>
        <Prop label="Product area"><div className={`${selCls} flex items-center normal-case`}>{t.tags.includes('billing') ? 'Billing & invoices' : t.tags.some((x) => x.includes('password') || x === '2fa') ? 'Account & login' : 'Shipments'}</div></Prop>
      </div>

      {/* conversation */}
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <div className="px-6 pt-4 pb-3 border-b border-[#D8DCDE]">
          <div className="text-[22px] font-semibold text-[#2F3941]" data-agent="zd-ticket-subject">{t.subject}</div>
          <div className="flex items-center gap-2 mt-1 text-[13px] text-[#68737D]">
            {t.channel === 'email' ? <Mail size={14} /> : t.channel === 'chat' ? <MessageSquare size={14} /> : <Globe size={14} />}
            Via {t.channel === 'web' ? 'Web form' : t.channel === 'chat' ? 'Messaging' : 'Email'} · <Badge s={t.status} small /> · #{t.number}
            {waiting(t) && <span className="ml-1 h-5 px-2 rounded-full bg-[#FFF0F1] text-[#CC3340] text-[12px] font-semibold flex items-center gap-1"><Clock size={12} /> First reply SLA breached · {Math.round(HOURS(t.created))}h</span>}
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
                  <div className={`mt-1 text-[14px] leading-[1.55] text-[#2F3941] whitespace-pre-wrap ${!c.public ? 'bg-[#FFF7ED] border border-[#FCDBA9] rounded-[4px] px-3 py-2' : ''}`}>{c.body}</div>
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
            <div className="flex-1" />
            <span className="text-[13px] text-[#1F73B7]">CC</span>
          </div>
          <textarea
            data-agent="zd-composer"
            aria-label={mode === 'public' ? 'Public reply' : 'Internal note'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={mode === 'public' ? `Reply to ${t.requester.name}…` : 'Add an internal note visible only to agents…'}
            className="w-full resize-none outline-none px-3 py-2 text-[14px] leading-[1.55] bg-transparent text-[#2F3941]"
          />
          <div className="flex items-center gap-0.5 px-2 pb-2 text-[#68737D]">
            {[Bold, Italic, Link2, ListOrdered, Code, Paperclip, Smile].map((I, i) => <button key={i} className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5"><I size={16} /></button>)}
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
          <label className="flex items-center gap-2 text-[13px] text-[#68737D]"><input type="checkbox" defaultChecked className="accent-[#1F73B7]" /> Close tab after submitting</label>
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
        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <ReqAvatar name={t.requester.name} size={48} />
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-[#2F3941]">{t.requester.name}</div>
              <div className="text-[13px] text-[#68737D] truncate">{t.requester.org}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-[13px]">
            {[['Email', t.requester.email], ['Phone', '+1 (206) 555-01' + (t.number % 90)], ['Local time', new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' PST'], ['Language', 'English (United States)'], ['Plan', t.tags.includes('billing') ? 'Business · billed monthly' : 'Enterprise']].map(([k, v]) => (
              <div key={k} className="flex"><span className="w-[90px] shrink-0 text-[#68737D]">{k}</span><span className="text-[#2F3941] truncate">{v}</span></div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1">{['vip' + (t.number % 3 === 0 ? '' : '_no'), t.requester.org.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')].filter((x) => !x.endsWith('_no')).map((g) => <span key={g} className="h-6 px-2 rounded-[4px] bg-[#E9EBED] text-[12px] flex items-center">{g}</span>)}</div>
          <div className="mt-6 text-[14px] font-semibold text-[#2F3941] mb-2">Interactions</div>
          <div className="relative pl-4 border-l-2 border-[#E9EBED] space-y-4">
            <div className="text-[13px]"><span className="absolute -left-[5px] w-2 h-2 rounded-full bg-[#1F73B7]" style={{ marginTop: 5 }} /><div className="font-semibold">{t.subject}</div><div className="text-[#68737D]">Created {ago(t.created)} · <Badge s={t.status} small /></div></div>
            {others.map((o) => (
              <div key={o.id} className="text-[13px]"><div className="font-semibold text-[#1F73B7]">{o.subject}</div><div className="text-[#68737D]">{ago(o.created)} · <Badge s={o.status} small /></div></div>
            ))}
          </div>
        </div>
        <div className="w-[44px] shrink-0 border-l border-[#D8DCDE] flex flex-col items-center py-2 gap-1 text-[#68737D]">
          {[User, BookOpen, Puzzle, Sparkles2].map((I, i) => <button key={i} className={`w-9 h-9 rounded flex items-center justify-center ${i === 0 ? 'bg-[#EDF7FF] text-[#1F73B7]' : 'hover:bg-[#F8F9F9]'}`}><I size={18} /></button>)}
        </div>
      </div>
    </div>
  )
}
function Sparkles2(p: any) {
  return <Phone {...p} />
}

/* ─────────────────────────── Home ─────────────────────────── */

function HomePage({ onOpen }: { onOpen: (id: string) => void }) {
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const mine = tickets.filter((t) => !['solved', 'closed'].includes(t.status))
  const stats = [['Open tickets (current)', mine.length], ['Waiting > 24h', tickets.filter(waiting).length], ['Solved this week', tickets.filter((t) => t.status === 'solved').length], ['Good / bad rating', '94%']]
  return (
    <div className="flex-1 overflow-auto bg-white px-8 py-6">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(([k, v]) => (
          <div key={k as string} className="rounded-[8px] border border-[#D8DCDE] p-4"><div className="text-[13px] text-[#68737D]">{k}</div><div className="text-[30px] font-semibold text-[#2F3941]">{v}</div></div>
        ))}
      </div>
      <h2 className="text-[18px] font-semibold mb-2">Updates to your tickets</h2>
      {tickets.slice(0, 8).map((t) => (
        <button key={t.id} onClick={() => onOpen(t.id)} className="w-full text-left flex items-center gap-3 py-2.5 border-b border-[#E9EBED] text-[14px] hover:bg-[#F8F9F9]">
          <Badge s={t.status} small /><span className="font-semibold">{t.subject}</span><span className="text-[#68737D] ml-auto">{ago(t.updated)}</span>
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────── App ─────────────────────────── */

export default function Zendesk({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const tickets = useCollection<Ticket>('zendesk.tickets')
  const [nav, setNav] = useState<'home' | 'views' | 'customers' | 'orgs' | 'reporting' | 'admin'>('views')
  const [view, setView] = useState('unassigned')
  const [ticket, setTicket] = useState<string | null>(null)
  const [tabs, setTabs] = useState<string[]>([])

  const openTicket = (id: string) => {
    setTicket(id)
    setTabs((t) => (t.includes(id) ? t : [...t, id].slice(-5)))
  }
  useEffect(() => {
    if (params?.ticketId) {
      const t = tickets.find((x) => x.id === params.ticketId || String(x.number) === String(params.ticketId))
      if (t) openTicket(t.id)
    } else if (params?.view) {
      setNav('views')
      setView(params.view)
      setTicket(null)
    }
  }, [win.nonce])

  const cur = ticket ? tickets.find((t) => t.id === ticket) : undefined
  useEffect(() => {
    if (cur) {
      setUrl(`https://northwind.zendesk.com/agent/tickets/${cur.number}`)
      setTitle(`${cur.subject} – Ticket #${cur.number} – Northwind Support – Zendesk`)
    } else if (nav === 'views') {
      setUrl(`https://northwind.zendesk.com/agent/filters/${360000 + VIEWS.findIndex((v) => v.id === view) * 137}`)
      setTitle(`${VIEWS.find((v) => v.id === view)?.name} – Northwind Support – Zendesk`)
    } else {
      setUrl('https://northwind.zendesk.com/agent/dashboard')
      setTitle('Dashboard – Northwind Support – Zendesk')
    }
  }, [cur?.id, nav, view])

  const closeTab = (id: string) => {
    setTabs((t) => t.filter((x) => x !== id))
    if (ticket === id) setTicket(null)
  }
  const rail: [typeof nav, any, string][] = [['home', Home, 'Home'], ['views', List, 'Views'], ['customers', Users, 'Customers'], ['orgs', Building2, 'Organizations'], ['reporting', BarChart3, 'Reporting'], ['admin', Settings, 'Admin']]
  const allMine = useMemo(() => tickets.filter((t) => t.assignee === ME.id && !['solved', 'closed'].includes(t.status)).length, [tickets])

  return (
    <div className="flex-1 min-h-0 flex" style={{ fontFamily: FONT }}>
      <div className="w-[60px] shrink-0 bg-[#03363D] flex flex-col items-center py-3 gap-1">
        <img src={logoUrl('zendesk')} className="w-8 h-6 brightness-0 invert mb-4" alt="Zendesk" />
        {rail.map(([id, I, l]) => (
          <button key={id} data-agent={`zd-nav-${id}`} aria-label={l} title={l} onClick={() => { setNav(id); setTicket(null) }} className={`relative w-10 h-10 rounded-[6px] flex items-center justify-center ${nav === id && !ticket ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
            {nav === id && !ticket && <span className="absolute -left-[10px] top-2 bottom-2 w-1 rounded-r bg-white" />}
            <I size={20} />
          </button>
        ))}
        <div className="flex-1" />
        <button className="w-10 h-10 rounded-[6px] flex items-center justify-center text-white/70 hover:bg-white/10"><LayoutGrid size={20} /></button>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-[50px] shrink-0 flex items-center border-b border-[#D8DCDE] bg-white pl-3 pr-3 gap-2">
          <button className="h-8 px-3 rounded-[4px] text-[14px] text-[#2F3941] flex items-center gap-1 hover:bg-[#F8F9F9] font-semibold border border-[#C2C8CC]"><Plus size={15} /> Add</button>
          <div className="flex items-stretch h-full overflow-hidden">
            {tabs.map((id) => {
              const t = tickets.find((x) => x.id === id)
              if (!t) return null
              return (
                <div key={id} className={`flex items-center gap-2 px-3 min-w-[160px] max-w-[220px] border-r border-[#E9EBED] cursor-pointer ${ticket === id ? 'bg-[#F8F9F9] shadow-[inset_0_-3px_0_#1F73B7]' : 'hover:bg-[#F8F9F9]'}`} onClick={() => setTicket(id)}>
                  <span className="w-5 h-5 rounded-[3px] text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: STATUS[t.status].bg, color: STATUS[t.status].fg }}>{STATUS[t.status].letter}</span>
                  <div className="min-w-0 leading-tight">
                    <div className="text-[13px] font-semibold truncate">{t.subject}</div>
                    <div className="text-[11px] text-[#68737D]">#{t.number}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); closeTab(id) }} className="ml-auto text-[#68737D] hover:text-[#2F3941]" aria-label="Close tab"><X size={14} /></button>
                </div>
              )
            })}
          </div>
          <div className="flex-1" />
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8F9F9] text-[#68737D]"><Search size={18} /></button>
          <button className="h-8 px-3 rounded-full border border-[#C2C8CC] text-[13px] flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#038153]" /> Online <ChevronDown size={13} /></button>
          {[MoreHorizontal, Bell, HelpCircle, LayoutGrid].map((I, i) => <button key={i} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F8F9F9] text-[#68737D]"><I size={18} /></button>)}
          <span className="relative"><Avatar id={ME.id} size={32} /><span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-[#038153] border-2 border-white" /></span>
        </div>
        {cur ? (
          <TicketPage id={cur.id} onDone={() => { closeTab(cur.id); setNav('views') }} />
        ) : nav === 'views' ? (
          <ViewsPage view={view} setView={setView} onOpen={openTicket} />
        ) : nav === 'home' ? (
          <HomePage onOpen={openTicket} />
        ) : nav === 'customers' || nav === 'orgs' ? (
          <div className="flex-1 overflow-auto bg-white px-8 py-6">
            <h1 className="text-[22px] font-semibold text-[#2F3941] mb-4">{nav === 'customers' ? 'Customers' : 'Organizations'}</h1>
            <table className="w-full text-[14px] text-[#2F3941]">
              <thead><tr className="h-10 border-b border-[#D8DCDE] text-left text-[13px] text-[#68737D]"><th>Name</th><th>Email</th><th>Organization</th><th>Tickets</th><th>Last updated</th></tr></thead>
              <tbody>
                {Array.from(new Map(tickets.map((t) => [nav === 'orgs' ? t.requester.org : t.requester.email, t])).values()).map((t) => (
                  <tr key={t.id} className="h-11 border-b border-[#E9EBED]">
                    <td><span className="inline-flex items-center gap-2"><ReqAvatar name={t.requester.name} size={24} />{nav === 'orgs' ? t.requester.org : t.requester.name}</span></td>
                    <td className="text-[#1F73B7]">{nav === 'orgs' ? t.requester.email.split('@')[1] : t.requester.email}</td>
                    <td>{t.requester.org}</td>
                    <td>{tickets.filter((x) => (nav === 'orgs' ? x.requester.org === t.requester.org : x.requester.email === t.requester.email)).length}</td>
                    <td className="text-[#68737D]">{ago(t.updated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[13px] text-[#68737D] mt-3">{allMine} tickets assigned to you</div>
          </div>
        ) : (
          <HomePage onOpen={openTicket} />
        )}
      </div>
    </div>
  )
}
