import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Circle, XCircle, ArrowRight, Search, Star, Copy, Undo2, Pencil, Trash2, MessageSquare, PackageCheck, Ban, Lock, ExternalLink, ShoppingCart, Mail, Phone, MapPin, FileCheck2, Bell } from 'lucide-react'
import { db, useCollection, useRecord, uid } from '@/db/db'
import { ME, person } from '@/data/people'
import { BLUE, $, fd, fdt, Btn, StatusPill, HW, Card, Chips, Modal, Th, Empty, inputCls, Row, ProductImg } from './ui'
import {
  type Go, awaitingMe, pendingApprover, decideReq, withdrawReq, commentReq, buildPOs, receivePo, setPoState, decideInvoiceStatus, commentInvoice,
  SUPPLIERS, supplierInfo, FORMS, PREFS_ID, usePrefsDefaults, patchPrefs, type PO,
} from './data'

type Flash = (t: string) => void

/* ───────────────────────── approval chain ───────────────────────── */

export function Chain({ steps, submitter }: { steps: any[]; submitter?: string }) {
  const all = [{ name: submitter ?? ME.name, role: 'Requester', status: 'done' }, ...steps]
  return (
    <div className="flex items-start flex-wrap" data-agent="coupa-approval-chain">
      {all.map((s, i) => (
        <div key={i} className="flex items-start">
          <div className="w-[150px] flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-semibold" style={{ background: ['#1a6ebd', '#7a4fbf', '#0f8a6b', '#c0571a', '#a0303a'][i % 5] }}>
                {s.name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}
              </div>
              <span className="absolute -right-1 -bottom-1 bg-white rounded-full">
                {s.status === 'done' || s.status === 'approved' ? <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" /> : s.status === 'pending' ? <Clock className="w-5 h-5 text-[#b45f06]" /> : s.status === 'rejected' ? <XCircle className="w-5 h-5 text-[#c8102e]" /> : <Circle className="w-5 h-5 text-[#b8c2cc]" />}
              </span>
            </div>
            <div className="text-[13px] font-semibold mt-2">{s.name}</div>
            <div className="text-[12px] text-[#5f6b7a] leading-tight">{s.role}</div>
            <div className="text-[11px] mt-0.5" style={{ color: s.status === 'pending' ? '#b45f06' : '#5f6b7a' }}>{s.status === 'done' ? 'Submitted' : s.status === 'approved' ? 'Approved' : s.status === 'pending' ? 'Pending approval' : s.status === 'rejected' ? 'Rejected' : 'Not yet notified'}</div>
          </div>
          {i < all.length - 1 && <ArrowRight className="w-5 h-5 text-[#b8c2cc] mt-3.5 -mx-3" />}
        </div>
      ))}
    </div>
  )
}

function Comments({ items, onPost, agent }: { items: any[]; onPost: (t: string) => void; agent: string }) {
  const [t, setT] = useState('')
  return (
    <Card title={<span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments ({items.length})</span>} className="mt-5">
      <div className="p-5 space-y-3">
        {items.map((c) => (
          <div key={c.id} className="flex gap-3">
            <span className="w-8 h-8 rounded-full bg-[#eef5fc] text-[#1a6ebd] text-[12px] font-bold flex items-center justify-center shrink-0">{c.who.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</span>
            <div><div className="text-[13px]"><b>{c.who}</b> <span className="text-[#5f6b7a]">{fdt(c.at)}</span></div><div className="text-[14px] whitespace-pre-wrap">{c.text}</div></div>
          </div>
        ))}
        <div className="flex gap-2">
          <input data-agent={`${agent}-comment`} aria-label="Add a comment" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && t.trim()) { onPost(t.trim()); setT('') } }} placeholder="Add a comment… use @ to mention" className={inputCls} />
          <Btn data-agent={`${agent}-comment-post`} disabled={!t.trim()} onClick={() => { onPost(t.trim()); setT('') }}>Post</Btn>
        </div>
      </div>
    </Card>
  )
}

function History({ items }: { items?: any[] }) {
  if (!items?.length) return null
  return (
    <Card title="History" className="mt-5">
      <div className="px-5 py-3">
        {[...items].reverse().map((h, i) => (
          <div key={i} className="flex gap-3 py-1.5 text-[13.5px]"><span className="w-[130px] text-[#5f6b7a] shrink-0">{fdt(h.at)}</span><span><b>{h.who}</b> — {h.text}</span></div>
        ))}
      </div>
    </Card>
  )
}

function RejectDialog({ title, onCancel, onConfirm, label = 'Reject', reasons }: { title: string; onCancel: () => void; onConfirm: (reason: string) => void; label?: string; reasons?: string[] }) {
  const [reason, setReason] = useState(reasons?.[0] ?? '')
  const [note, setNote] = useState('')
  const text = reasons ? `${reason}${note ? ` — ${note}` : ''}` : note
  return (
    <Modal title={title} onClose={onCancel} agent="coupa-reject-dialog" footer={<><Btn onClick={onCancel}>Cancel</Btn><Btn primary data-agent="coupa-reject-confirm" disabled={!text.trim()} onClick={() => onConfirm(text.trim())}>{label}</Btn></>}>
      {reasons && (
        <div className="mb-3">
          <div className="text-[13px] text-[#5f6b7a] mb-1">Reason</div>
          <select aria-label="Reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
      )}
      <div className="text-[13px] text-[#5f6b7a] mb-1">{reasons ? 'Comment (optional)' : 'Reason (required — sent to the requester)'}</div>
      <textarea data-agent="coupa-reject-reason" aria-label="Reason" value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} h-24 py-2`} />
    </Modal>
  )
}

/* ───────────────────────── requisition detail ───────────────────────── */

export function ReqView({ id, go, flash, copyToCart, editReq }: { id: string; go: Go; flash: Flash; copyToCart: (lines: any[]) => void; editReq: (r: any) => void }) {
  const r = useRecord<any>('coupa.requisitions', id)
  const [rejecting, setRejecting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  if (!r) return <div className="p-10">Requisition not found.</div>
  const mine = r.requestedBy === ME.name
  const canApprove = awaitingMe(r)
  const canEdit = mine && ['Draft', 'Withdrawn', 'Rejected'].includes(r.status)
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="text-[22px] font-semibold" data-agent="coupa-req-header">Requisition #{r.number}</div>
        <StatusPill s={r.status} />
        {r.createdBy === 'hworker' && <HW />}
        <div className="flex-1" />
        {canApprove && (
          <>
            <Btn primary data-agent="coupa-req-approve" onClick={() => { decideReq(r.id, 'approved'); flash(`Requisition #${r.number} approved`) }}><CheckCircle2 className="w-4 h-4" /> Approve</Btn>
            <Btn danger data-agent="coupa-req-reject" onClick={() => setRejecting(true)}><XCircle className="w-4 h-4" /> Reject</Btn>
          </>
        )}
        {mine && r.status === 'Pending Approval' && <Btn data-agent="coupa-req-withdraw" onClick={() => { withdrawReq(r.id); flash(`Requisition #${r.number} withdrawn`) }}><Undo2 className="w-4 h-4" /> Withdraw</Btn>}
        {canEdit && <Btn data-agent="coupa-req-edit" onClick={() => editReq(r)}><Pencil className="w-4 h-4" /> Edit</Btn>}
        {mine && r.status === 'Draft' && <Btn danger data-agent="coupa-req-delete" onClick={() => setConfirmDel(true)}><Trash2 className="w-4 h-4" /> Delete</Btn>}
        <Btn data-agent="coupa-req-copy" onClick={() => copyToCart(r.lines)}><Copy className="w-4 h-4" /> Copy to Cart</Btn>
      </div>
      <div className="text-[14px] text-[#5f6b7a] mb-5">
        {r.title} · {r.status === 'Draft' ? 'Draft — not submitted' : `Submitted ${new Date(r.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
        {r.poNumber ? <> · <button className="text-[#1a6ebd] hover:underline" data-agent="coupa-req-po-link" onClick={() => go({ v: 'po', id: r.poNumber })}>{r.poNumber}</button></> : ''}
      </div>
      {r.approvals?.length > 0 && (
        <div className={`bg-white rounded-lg border border-[#d8dee6] p-5 mb-5 ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
          <div className="text-[16px] font-bold mb-4">Approval Chain</div>
          <Chain steps={r.approvals} submitter={r.requestedBy} />
          {r.approvals.filter((a: any) => a.comment).map((a: any, i: number) => <div key={i} className="mt-3 text-[13.5px] rounded bg-[#fdf0f2] border border-[#f3c4cc] px-3 py-2"><b>{a.name}:</b> {a.comment}</div>)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-lg border border-[#d8dee6] p-5 text-[14px]">
          <div className="text-[16px] font-bold mb-3">General Info</div>
          {[['Requested by', r.requestedBy], ['On behalf of', r.onBehalfOf || '—'], ['Ship-to', r.shipTo], ['Need-by date', fd(r.needBy + 'T12:00:00')], ['Commodity', r.commodity], ['Cost center', r.costCenter]].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] py-1.5"><span className="text-[#5f6b7a]">{k}</span><span>{v}</span></div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-[#d8dee6] p-5 text-[14px]">
          <div className="text-[16px] font-bold mb-3">Justification</div>
          <div className="whitespace-pre-wrap leading-relaxed">{r.justification || '—'}</div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#d8dee6] mt-5">
        <div className="px-5 h-12 flex items-center text-[16px] font-bold border-b border-[#eef1f4]">Lines</div>
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-9 text-left text-[#5f6b7a] border-b border-[#eef1f4]"><th className="pl-5 font-semibold">#</th><th className="px-2 font-semibold">Item</th><th className="px-2 font-semibold">Supplier</th><th className="px-2 font-semibold text-right">Qty</th><th className="px-2 font-semibold text-right">Price</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
          <tbody>
            {r.lines.map((l: any, i: number) => (
              <tr key={i} className="h-11 border-b border-[#f3f5f8]"><td className="pl-5">{i + 1}</td><td className="px-2"><button className="text-left hover:underline hover:text-[#1a6ebd]" onClick={() => go({ v: 'item', id: l.itemId })}>{l.name}</button></td><td className="px-2"><button className="hover:underline hover:text-[#1a6ebd]" onClick={() => go({ v: 'supplier', name: l.supplier })}>{l.supplier}</button></td><td className="px-2 text-right">{l.qty}</td><td className="px-2 text-right">{$(l.price)}</td><td className="px-2 pr-5 text-right font-semibold">{$(l.qty * l.price)}</td></tr>
            ))}
            <tr className="h-11"><td colSpan={5} className="text-right font-semibold pr-2">Total</td><td className="pr-5 text-right font-bold text-[15px]" data-agent="coupa-req-total">{$(r.total)}</td></tr>
          </tbody>
        </table>
      </div>
      <Comments agent="coupa-req" items={r.comments ?? []} onPost={(t) => commentReq(r.id, t)} />
      <History items={r.history} />
      {rejecting && <RejectDialog title={`Reject requisition #${r.number}`} onCancel={() => setRejecting(false)} onConfirm={(c) => { decideReq(r.id, 'rejected', c); setRejecting(false); flash(`Requisition #${r.number} rejected`) }} />}
      {confirmDel && (
        <Modal title="Delete draft?" onClose={() => setConfirmDel(false)} footer={<><Btn onClick={() => setConfirmDel(false)}>Cancel</Btn><Btn primary data-agent="coupa-req-delete-confirm" onClick={() => { db.remove('coupa.requisitions', r.id); flash(`Draft #${r.number} deleted`); go({ v: 'reqs' }) }}>Delete</Btn></>}>
          Draft requisition #{r.number} “{r.title}” will be deleted.
        </Modal>
      )}
    </div>
  )
}

/* ───────────────────────── requisitions list ───────────────────────── */

export function ReqList({ go }: { go: Go }) {
  const reqs = useCollection<any>('coupa.requisitions')
  const [f, setF] = useState<'All' | 'Mine' | 'Pending Approval' | 'Draft' | 'Ordered' | 'Rejected'>('All')
  const [q, setQ] = useState('')
  const count = (k: string) => reqs.filter((r) => (k === 'All' ? true : k === 'Mine' ? r.requestedBy === ME.name : r.status === k)).length
  const rows = reqs.filter((r) => (f === 'All' || (f === 'Mine' ? r.requestedBy === ME.name : r.status === f)) && (!q || `${r.number} ${r.title} ${r.requestedBy} ${r.poNumber ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="flex items-center mb-4 gap-3">
        <div className="text-[22px] font-semibold flex-1">Requisitions</div>
        <div className="relative w-[280px]"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#5f6b7a]" /><input data-agent="coupa-reqs-search" aria-label="Search requisitions" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requisitions" className={inputCls + ' pl-8'} /></div>
        <Btn primary data-agent="coupa-reqs-new" onClick={() => go({ v: 'search', q: '' })}><ShoppingCart className="w-4 h-4" /> New Requisition</Btn>
      </div>
      <div className="mb-4"><Chips agent="coupa-reqs-filter" value={f} onChange={setF} options={(['All', 'Mine', 'Pending Approval', 'Draft', 'Ordered', 'Rejected'] as const).map((k) => [k, k === 'Mine' ? 'My requisitions' : k, count(k)])} /></div>
      <div className="bg-white rounded-lg border border-[#d8dee6]">
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-10 text-left text-[#5f6b7a] border-b border-[#e6ebf0]"><th className="pl-5 font-semibold">Req #</th><th className="px-2 font-semibold">Title</th><th className="px-2 font-semibold">Requested By</th><th className="px-2 font-semibold">Submitted</th><th className="px-2 font-semibold">Need By</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-agent={`coupa-req-row-${r.id}`} onClick={() => go({ v: 'req', id: r.id })} className={`h-11 border-b border-[#f3f5f8] hover:bg-[#f7f9fb] cursor-pointer ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                <td className="pl-5 text-[#1a6ebd] font-semibold">{r.number}</td><td className="px-2">{r.title} {r.createdBy === 'hworker' && <HW />}</td><td className="px-2">{r.requestedBy}</td><td className="px-2">{r.status === 'Draft' ? '—' : fd(r.submittedAt)}</td><td className="px-2">{fd(r.needBy + 'T12:00:00')}</td><td className="px-2"><StatusPill s={r.status} /></td><td className="px-2 pr-5 text-right font-semibold">{$(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No requisitions match.</Empty>}
      </div>
    </div>
  )
}

/* ───────────────────────── approvals ───────────────────────── */

export function Approvals({ go, flash }: { go: Go; flash: Flash }) {
  const reqs = useCollection<any>('coupa.requisitions')
  const invoices = useCollection<any>('coupa.invoices')
  const [rejecting, setRejecting] = useState<any>(null)
  const mine = reqs.filter(awaitingMe)
  const others = reqs.filter((r) => r.status === 'Pending Approval' && !awaitingMe(r))
  const invPending = invoices.filter((i) => i.status === 'Pending Approval')
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="text-[22px] font-semibold mb-4">Approvals</div>
      <Card title={`Waiting for my approval (${mine.length + invPending.length})`} className="mb-5">
        {mine.length + invPending.length === 0 && <Empty>You’re all caught up — nothing is waiting for your approval.</Empty>}
        {mine.map((r) => (
          <div key={r.id} data-agent={`coupa-approval-${r.id}`} className="flex items-center gap-4 px-5 py-3 border-b border-[#f3f5f8]">
            <button onClick={() => go({ v: 'req', id: r.id })} className="text-[#1a6ebd] font-semibold text-[14px] whitespace-nowrap">Requisition #{r.number}</button>
            <span className="text-[14px] flex-1 min-w-0 truncate">{r.title} · {r.requestedBy}</span>
            <span className="text-[13px] text-[#5f6b7a]">{fd(r.submittedAt)}</span>
            <b className="w-[110px] text-right">{$(r.total)}</b>
            <Btn primary className="h-8" data-agent={`coupa-approve-${r.id}`} onClick={() => { decideReq(r.id, 'approved'); flash(`Requisition #${r.number} approved`) }}>Approve</Btn>
            <Btn danger className="h-8" data-agent={`coupa-reject-${r.id}`} onClick={() => setRejecting(r)}>Reject</Btn>
          </div>
        ))}
        {invPending.map((i) => (
          <div key={i.id} data-agent={`coupa-approval-${i.id}`} className="flex items-center gap-4 px-5 py-3 border-b border-[#f3f5f8]">
            <button onClick={() => go({ v: 'invoice', id: i.id })} className="text-[#1a6ebd] font-semibold text-[14px] whitespace-nowrap">Invoice {i.number}</button>
            <span className="text-[14px] flex-1">{i.supplier} · {i.poNumber}</span>
            <span className="text-[13px] text-[#5f6b7a]">{fd(i.date)}</span>
            <b className="w-[110px] text-right">{$(i.total)}</b>
            <Btn primary className="h-8" data-agent={`coupa-approve-${i.id}`} onClick={() => { decideInvoiceStatus(i.id, 'Approved', 'Approved for payment'); flash(`Invoice ${i.number} approved`) }}>Approve</Btn>
            <Btn className="h-8" onClick={() => go({ v: 'invoice', id: i.id })}>Review</Btn>
          </div>
        ))}
      </Card>
      <Card title={`Pending with other approvers (${others.length})`}>
        {others.map((r) => (
          <div key={r.id} className="flex items-center gap-4 px-5 py-3 border-b border-[#f3f5f8]">
            <button onClick={() => go({ v: 'req', id: r.id })} className="text-[#1a6ebd] font-semibold text-[14px]">Requisition #{r.number}</button>
            <span className="text-[14px] flex-1">{r.title} · {r.requestedBy}</span>
            <span className="text-[13px] text-[#5f6b7a]">Waiting on {pendingApprover(r)?.name}</span>
            <b className="w-[110px] text-right">{$(r.total)}</b>
            <button title="Send reminder" aria-label="Send reminder" onClick={() => flash(`Reminder emailed to ${pendingApprover(r)?.name}`)} className="w-8 h-8 rounded-full hover:bg-[#eef5fc] text-[#1a6ebd] flex items-center justify-center"><Bell className="w-4 h-4" /></button>
          </div>
        ))}
        {others.length === 0 && <Empty>No other pending approvals.</Empty>}
      </Card>
      {rejecting && <RejectDialog title={`Reject requisition #${rejecting.number}`} onCancel={() => setRejecting(null)} onConfirm={(c) => { decideReq(rejecting.id, 'rejected', c); flash(`Requisition #${rejecting.number} rejected`); setRejecting(null) }} />}
    </div>
  )
}

/* ───────────────────────── invoices ───────────────────────── */

export function Invoices({ go }: { go: Go }) {
  const inv = useCollection<any>('coupa.invoices')
  const [f, setF] = useState('All')
  const [q, setQ] = useState('')
  const statuses = ['All', 'Pending Approval', 'Pending Receipt', 'Disputed', 'Approved', 'Paid']
  const rows = inv.filter((r) => (f === 'All' || r.status === f) && (!q || `${r.number} ${r.supplier} ${r.poNumber}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="flex items-center mb-4 gap-3">
        <div className="text-[22px] font-semibold flex-1">Invoices</div>
        <div className="relative w-[280px]"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#5f6b7a]" /><input data-agent="coupa-inv-search" aria-label="Search invoices" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoices" className={inputCls + ' pl-8'} /></div>
      </div>
      <div className="mb-4"><Chips agent="coupa-inv-filter" value={f} onChange={setF} options={statuses.map((s) => [s, s, s === 'All' ? inv.length : inv.filter((i) => i.status === s).length])} /></div>
      <div className="bg-white rounded-lg border border-[#d8dee6]">
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-10 text-left text-[#5f6b7a] border-b border-[#e6ebf0]"><th className="pl-5 font-semibold">Invoice #</th><th className="px-2 font-semibold">Supplier</th><th className="px-2 font-semibold">Invoice Date</th><th className="px-2 font-semibold">PO #</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-agent={`coupa-inv-row-${r.id}`} onClick={() => go({ v: 'invoice', id: r.id })} className="h-11 border-b border-[#f3f5f8] hover:bg-[#f7f9fb] cursor-pointer"><td className="pl-5 text-[#1a6ebd] font-semibold">{r.number}</td><td className="px-2">{r.supplier}</td><td className="px-2">{fd(r.date)}</td><td className="px-2">{r.poNumber}</td><td className="px-2"><StatusPill s={r.status} /></td><td className="px-2 pr-5 text-right font-semibold">{$(r.total)}</td></tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No invoices match.</Empty>}
      </div>
    </div>
  )
}

const DISPUTE_REASONS = ['Price does not match PO', 'Quantity does not match receipt', 'Goods not received', 'Duplicate invoice', 'Missing tax / incorrect tax', 'Other']

export function InvoiceView({ id, go, flash }: { id: string; go: Go; flash: Flash }) {
  const i = useRecord<any>('coupa.invoices', id)
  const reqs = useCollection<any>('coupa.requisitions')
  const [disputing, setDisputing] = useState(false)
  if (!i) return <div className="p-10">Invoice not found.</div>
  const req = reqs.find((r) => r.poNumber === i.poNumber)
  const sup = supplierInfo(i.supplier)
  const days = Number(String(sup.terms).replace(/\D/g, '')) || 30
  const due = new Date(new Date(i.date).getTime() + days * 86400000).toISOString()
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <button onClick={() => go({ v: 'invoices' })} className="text-[13px] text-[#1a6ebd] hover:underline mb-3">← Back to invoices</button>
      <div className="flex items-center gap-3 mb-1">
        <div className="text-[22px] font-semibold" data-agent="coupa-invoice-header">Invoice {i.number}</div>
        <StatusPill s={i.status} />
        <div className="flex-1" />
        {i.status === 'Pending Approval' && <Btn primary data-agent="coupa-inv-approve" onClick={() => { decideInvoiceStatus(i.id, 'Approved', 'Approved for payment'); flash(`Invoice ${i.number} approved`) }}><CheckCircle2 className="w-4 h-4" /> Approve</Btn>}
        {i.status === 'Pending Receipt' && req && <Btn primary data-agent="coupa-inv-receive" onClick={() => go({ v: 'po', id: i.poNumber })}><PackageCheck className="w-4 h-4" /> Receive on PO</Btn>}
        {i.status === 'Disputed' && <Btn primary data-agent="coupa-inv-resolve" onClick={() => { decideInvoiceStatus(i.id, 'Pending Approval', 'Dispute resolved — supplier issued a corrected invoice', { dispute: undefined }); flash(`Dispute on ${i.number} resolved`) }}><CheckCircle2 className="w-4 h-4" /> Resolve Dispute</Btn>}
        {['Pending Approval', 'Pending Receipt', 'Approved'].includes(i.status) && <Btn danger data-agent="coupa-inv-dispute" onClick={() => setDisputing(true)}><Ban className="w-4 h-4" /> Dispute</Btn>}
      </div>
      <div className="text-[14px] text-[#5f6b7a] mb-5">{i.supplier} · Invoice date {fd(i.date)} · {i.poNumber}</div>
      {i.status === 'Disputed' && (
        <div className="mb-5 rounded-lg border border-[#f3c4cc] bg-[#fdf0f2] px-4 py-3 text-[14px]"><b className="text-[#c8102e]">Disputed:</b> {i.dispute ?? 'Price variance against the PO — waiting on a credit note from the supplier.'}</div>
      )}
      <div className="grid grid-cols-3 gap-5">
        <Card title="Summary" className="col-span-2">
          <div className="p-5 grid grid-cols-2 gap-y-2 text-[14px]">
            <span className="text-[#5f6b7a]">Supplier</span><button className="text-left text-[#1a6ebd] hover:underline" onClick={() => go({ v: 'supplier', name: i.supplier })}>{i.supplier}</button>
            <span className="text-[#5f6b7a]">Purchase order</span>{req ? <button className="text-left text-[#1a6ebd] hover:underline" onClick={() => go({ v: 'po', id: i.poNumber })}>{i.poNumber}</button> : <span>{i.poNumber}</span>}
            <span className="text-[#5f6b7a]">Payment terms</span><span>{sup.terms}</span>
            <span className="text-[#5f6b7a]">Due date</span><span>{fd(due)}</span>
            <span className="text-[#5f6b7a]">Remit-to</span><span>{sup.name} · {sup.city}</span>
            <span className="text-[#5f6b7a]">Requester</span><span>{req?.requestedBy ?? '—'}</span>
          </div>
        </Card>
        <Card title="Totals">
          <div className="p-5 text-[14px] space-y-2">
            <div className="flex"><span className="flex-1 text-[#5f6b7a]">Lines net total</span><span>{$(i.total)}</span></div>
            <div className="flex"><span className="flex-1 text-[#5f6b7a]">Tax</span><span>{$(0)}</span></div>
            <div className="flex"><span className="flex-1 text-[#5f6b7a]">Shipping</span><span>{$(0)}</span></div>
            <div className="flex border-t border-[#eef1f4] pt-2 font-bold text-[16px]"><span className="flex-1">Total</span><span data-agent="coupa-invoice-total">{$(i.total)}</span></div>
            {i.status === 'Approved' && <div className="text-[12.5px] text-[#2e7d32]">Scheduled for payment on {fd(due)}</div>}
            {i.status === 'Paid' && <div className="text-[12.5px] text-[#2e7d32]">Paid by ACH</div>}
          </div>
        </Card>
      </div>
      <Card title="Lines" className="mt-5">
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-9 text-left text-[#5f6b7a] border-b border-[#eef1f4]"><th className="pl-5 font-semibold">#</th><th className="px-2 font-semibold">Description</th><th className="px-2 font-semibold text-right">Qty</th><th className="px-2 font-semibold text-right">Price</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
          <tbody>
            {(i.lines ?? [{ name: `Goods & services per ${i.poNumber}`, qty: 1, price: i.total }]).map((l: any, n: number) => (
              <tr key={n} className="h-11 border-b border-[#f3f5f8]"><td className="pl-5">{n + 1}</td><td className="px-2">{l.name}</td><td className="px-2 text-right">{l.qty}</td><td className="px-2 text-right">{$(l.price)}</td><td className="px-2 pr-5 text-right font-semibold">{$(l.qty * l.price)}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Comments agent="coupa-inv" items={i.comments ?? []} onPost={(t) => commentInvoice(i.id, t)} />
      <History items={i.history} />
      {disputing && <RejectDialog title={`Dispute invoice ${i.number}`} label="Dispute" reasons={DISPUTE_REASONS} onCancel={() => setDisputing(false)} onConfirm={(c) => { decideInvoiceStatus(i.id, 'Disputed', `Disputed: ${c}`, { dispute: c }); setDisputing(false); flash(`Invoice ${i.number} disputed — ${i.supplier} notified`) }} />}
    </div>
  )
}

/* ───────────────────────── purchase orders ───────────────────────── */

function usePOs() {
  const reqs = useCollection<any>('coupa.requisitions')
  const state = useCollection<any>('coupa.orders')
  return useMemo(() => buildPOs(reqs, state), [reqs, state])
}

export function Orders({ go }: { go: Go }) {
  const pos = usePOs()
  const [f, setF] = useState('All')
  const [q, setQ] = useState('')
  const rows = pos.filter((p) => (f === 'All' || p.status === f) && (!q || `${p.id} ${p.supplier} ${p.requester} ${p.reqNumber}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="flex items-center mb-4 gap-3">
        <div className="text-[22px] font-semibold flex-1">Purchase Orders</div>
        <div className="relative w-[280px]"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#5f6b7a]" /><input data-agent="coupa-po-search" aria-label="Search purchase orders" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders" className={inputCls + ' pl-8'} /></div>
      </div>
      <div className="mb-4"><Chips agent="coupa-po-filter" value={f} onChange={setF} options={['All', 'Issued', 'Received', 'Closed', 'Cancelled'].map((s) => [s, s, s === 'All' ? pos.length : pos.filter((p) => p.status === s).length])} /></div>
      <div className="bg-white rounded-lg border border-[#d8dee6]">
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-10 text-left text-[#5f6b7a] border-b border-[#e6ebf0]"><Th first>PO #</Th><Th>Supplier</Th><Th>Requisition</Th><Th>Requester</Th><Th>Created</Th><Th>Status</Th><Th right>Total</Th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} data-agent={`coupa-po-row-${p.id}`} onClick={() => go({ v: 'po', id: p.id })} className="h-11 border-b border-[#f3f5f8] hover:bg-[#f7f9fb] cursor-pointer"><td className="pl-5 text-[#1a6ebd] font-semibold">{p.id}</td><td className="px-2">{p.supplier}</td><td className="px-2">#{p.reqNumber}</td><td className="px-2">{p.requester}</td><td className="px-2">{fd(p.createdAt)}</td><td className="px-2"><StatusPill s={p.status} /></td><td className="px-2 pr-5 text-right font-semibold">{$(p.total)}</td></tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No purchase orders match.</Empty>}
      </div>
    </div>
  )
}

export function POView({ id, go, flash }: { id: string; go: Go; flash: Flash }) {
  const pos = usePOs()
  const invoices = useCollection<any>('coupa.invoices').filter((i) => i.poNumber === id)
  const [confirm, setConfirm] = useState<null | 'cancel' | 'close'>(null)
  const p = pos.find((x) => x.id === id) as PO | undefined
  if (!p) return <div className="p-10">Purchase order {id} not found.</div>
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <button onClick={() => go({ v: 'orders' })} className="text-[13px] text-[#1a6ebd] hover:underline mb-3">← Back to orders</button>
      <div className="flex items-center gap-3 mb-1">
        <div className="text-[22px] font-semibold" data-agent="coupa-po-header">Purchase Order {p.id}</div>
        <StatusPill s={p.status} />
        <div className="flex-1" />
        {p.status === 'Issued' && <Btn primary data-agent="coupa-po-receive" onClick={() => { receivePo(p); flash(`Receipt recorded on ${p.id}`) }}><PackageCheck className="w-4 h-4" /> Receive</Btn>}
        {p.status === 'Received' && <Btn data-agent="coupa-po-close" onClick={() => setConfirm('close')}><Lock className="w-4 h-4" /> Close</Btn>}
        {p.status === 'Issued' && <Btn danger data-agent="coupa-po-cancel" onClick={() => setConfirm('cancel')}><Ban className="w-4 h-4" /> Cancel PO</Btn>}
        <Btn onClick={() => go({ v: 'req', id: p.reqId })}>View Requisition</Btn>
      </div>
      <div className="text-[14px] text-[#5f6b7a] mb-5">{p.supplier} · Created {fd(p.createdAt)} · Requisition #{p.reqNumber}</div>
      <div className="grid grid-cols-2 gap-5">
        <Card title="General Info">
          <div className="p-5 text-[14px]">
            {[['Supplier', <button key="s" className="text-[#1a6ebd] hover:underline" onClick={() => go({ v: 'supplier', name: p.supplier })}>{p.supplier}</button>], ['Requester', p.requester], ['Ship-to', p.shipTo], ['Need-by', fd(p.needBy + 'T12:00:00')], ['Cost center', p.costCenter], ['Transmission', 'cXML to supplier — acknowledged']].map(([k, v]) => (
              <div key={String(k)} className="grid grid-cols-[140px_1fr] py-1.5"><span className="text-[#5f6b7a]">{k}</span><span>{v}</span></div>
            ))}
          </div>
        </Card>
        <Card title={`Invoices (${invoices.length})`}>
          {invoices.map((i) => (
            <button key={i.id} onClick={() => go({ v: 'invoice', id: i.id })} className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-[#f3f5f8] text-left hover:bg-[#f7f9fb]"><span className="text-[#1a6ebd] font-semibold text-[13.5px] flex-1">{i.number}</span><StatusPill s={i.status} /><b className="w-[100px] text-right text-[13.5px]">{$(i.total)}</b></button>
          ))}
          {invoices.length === 0 && <Empty>No invoices received yet.</Empty>}
          {p.receipts.length > 0 && <div className="px-5 py-3 text-[13px] text-[#2e7d32] border-t border-[#eef1f4]">Received {fdt(p.receipts[p.receipts.length - 1].at)} by {p.receipts[p.receipts.length - 1].who}</div>}
        </Card>
      </div>
      <Card title="Lines" className="mt-5">
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-9 text-left text-[#5f6b7a] border-b border-[#eef1f4]"><Th first>#</Th><Th>Item</Th><Th>Qty</Th><Th>Received</Th><Th>Price</Th><Th right>Total</Th></tr></thead>
          <tbody>
            {p.lines.map((l, n) => (
              <tr key={n} className="h-11 border-b border-[#f3f5f8]"><td className="pl-5">{n + 1}</td><td className="px-2">{l.name}</td><td className="px-2">{l.qty} {l.unit}</td><td className="px-2">{p.receipts.length ? l.qty : 0}</td><td className="px-2">{$(l.price)}</td><td className="px-2 pr-5 text-right font-semibold">{$(l.qty * l.price)}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <History items={p.history} />
      {confirm && (
        <Modal title={confirm === 'cancel' ? `Cancel ${p.id}?` : `Close ${p.id}?`} onClose={() => setConfirm(null)} footer={<><Btn onClick={() => setConfirm(null)}>Back</Btn><Btn primary data-agent="coupa-po-confirm" onClick={() => { setPoState(p, { status: confirm === 'cancel' ? 'Cancelled' : 'Closed' }, confirm === 'cancel' ? 'Purchase order cancelled — supplier notified' : 'Purchase order closed'); flash(`${p.id} ${confirm === 'cancel' ? 'cancelled' : 'closed'}`); setConfirm(null) }}>{confirm === 'cancel' ? 'Cancel PO' : 'Close PO'}</Btn></>}>
          {confirm === 'cancel' ? `A cancellation will be sent to ${p.supplier}. Invoices can no longer be matched to this order.` : 'Closing the order stops further receipts and invoices against it.'}
        </Modal>
      )}
    </div>
  )
}

/* ───────────────────────── suppliers ───────────────────────── */

export function Suppliers({ go }: { go: Go }) {
  const catalog = useCollection<any>('coupa.catalog')
  const invoices = useCollection<any>('coupa.invoices')
  const requested = useCollection<any>('coupa.supplierRequests')
  const [q, setQ] = useState('')
  const names = [...new Set([...SUPPLIERS.map((s) => s.name), ...catalog.map((c) => c.supplier), ...invoices.map((i) => i.supplier)])]
  const rows = names.map(supplierInfo).filter((s) => !q || `${s.name} ${s.category} ${s.city}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="flex items-center mb-4 gap-3">
        <div className="text-[22px] font-semibold flex-1">Suppliers</div>
        <div className="relative w-[280px]"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#5f6b7a]" /><input data-agent="coupa-sup-search" aria-label="Search suppliers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search suppliers" className={inputCls + ' pl-8'} /></div>
        <Btn primary data-agent="coupa-sup-request" onClick={() => go({ v: 'form', form: 'new-supplier' })}>Request New Supplier</Btn>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {rows.map((s) => (
          <button key={s.name} data-agent={`coupa-sup-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} onClick={() => go({ v: 'supplier', name: s.name })} className="bg-white rounded-lg border border-[#d8dee6] p-4 text-left hover:shadow-md">
            <div className="flex items-center gap-2"><span className="text-[15px] font-semibold text-[#1a6ebd] flex-1">{s.name}</span>{s.contract && <Star className="w-4 h-4 text-[#2e7d32] fill-[#2e7d32]" />}</div>
            <div className="text-[13px] text-[#5f6b7a] mt-1">{s.category} · {s.city}</div>
            <div className="text-[12.5px] text-[#5f6b7a] mt-2">{catalog.filter((c) => c.supplier === s.name).length} catalog items · {s.punchout ? 'Punchout enabled' : 'Catalog supplier'}</div>
          </button>
        ))}
      </div>
      {requested.length > 0 && (
        <Card title="Supplier requests" className="mt-6">
          {requested.map((r) => <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#f3f5f8] text-[14px]"><span className="flex-1">{r.name} <span className="text-[#5f6b7a]">· {r.category}</span></span><span className="text-[13px] text-[#5f6b7a]">{fd(r.at)}</span><StatusPill s={r.status} /></div>)}
        </Card>
      )}
    </div>
  )
}

export function SupplierView({ name, go, add }: { name: string; go: Go; add: (id: string, n?: number) => void }) {
  const catalog = useCollection<any>('coupa.catalog').filter((c) => c.supplier === name)
  const invoices = useCollection<any>('coupa.invoices').filter((i) => i.supplier === name)
  const pos = usePOs().filter((p) => p.supplier === name)
  const s = supplierInfo(name)
  const spend = pos.reduce((t, p) => t + p.total, 0)
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <button onClick={() => go({ v: 'suppliers' })} className="text-[13px] text-[#1a6ebd] hover:underline mb-3">← Back to suppliers</button>
      <div className="flex items-center gap-3 mb-1">
        <div className="text-[22px] font-semibold" data-agent="coupa-supplier-header">{s.name}</div>
        <StatusPill s="Active" />
        {s.contract && <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2e7d32]"><Star className="w-4 h-4 fill-[#2e7d32]" /> Preferred</span>}
        <div className="flex-1" />
        {(s.punchout || catalog.length > 0) && <Btn primary data-agent="coupa-supplier-shop" onClick={() => go({ v: 'search', q: '', supplier: name })}><ShoppingCart className="w-4 h-4" /> Shop {s.punchout ? 'punchout' : 'catalog'}</Btn>}
      </div>
      <div className="text-[14px] text-[#5f6b7a] mb-5">Supplier # {s.number} · {s.category} · Supplier since {s.since}</div>
      <div className="grid grid-cols-3 gap-5">
        <Card title="Contact">
          <div className="p-5 text-[14px] space-y-2">
            <div className="font-semibold">{s.contact}</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#5f6b7a]" /> <span className="text-[#1a6ebd]">{s.email}</span></div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#5f6b7a]" /> {s.phone}</div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#5f6b7a]" /> {s.city}</div>
          </div>
        </Card>
        <Card title="Commercials">
          <div className="p-5 text-[14px] grid grid-cols-2 gap-y-2">
            <span className="text-[#5f6b7a]">Payment terms</span><span>{s.terms}</span>
            <span className="text-[#5f6b7a]">Contract</span><span>{s.contract ?? '—'}</span>
            <span className="text-[#5f6b7a]">Diversity</span><span>{s.diversity ?? '—'}</span>
            <span className="text-[#5f6b7a]">Risk (CSP)</span><span className="text-[#2e7d32] font-semibold">Low</span>
          </div>
        </Card>
        <Card title="Performance">
          <div className="p-5 text-[14px] grid grid-cols-2 gap-y-2">
            <span className="text-[#5f6b7a]">Rating</span><span>{s.rating ? `${s.rating.toFixed(1)} / 5` : '—'}</span>
            <span className="text-[#5f6b7a]">PO spend (YTD)</span><span className="font-semibold">{$(spend)}</span>
            <span className="text-[#5f6b7a]">Orders</span><span>{pos.length}</span>
            <span className="text-[#5f6b7a]">Invoices</span><span>{invoices.length}</span>
          </div>
        </Card>
      </div>
      {catalog.length > 0 && (
        <Card title={`Catalog items (${catalog.length})`} className="mt-5">
          {catalog.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-2.5 border-b border-[#f3f5f8]">
              <ProductImg kind={c.img} size={48} />
              <button onClick={() => go({ v: 'item', id: c.id })} className="flex-1 text-left text-[14px] text-[#1a6ebd] hover:underline">{c.name}</button>
              <span className="font-semibold text-[14px]">{$(c.price)}</span>
              <button onClick={() => add(c.id, 1)} className="h-7 px-3 rounded-full text-[12px] font-semibold text-white" style={{ background: BLUE }}>Add</button>
            </div>
          ))}
        </Card>
      )}
      <div className="grid grid-cols-2 gap-5 mt-5">
        <Card title={`Purchase orders (${pos.length})`}>
          {pos.map((p) => <button key={p.id} onClick={() => go({ v: 'po', id: p.id })} className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-[#f3f5f8] text-left hover:bg-[#f7f9fb] text-[13.5px]"><span className="text-[#1a6ebd] font-semibold flex-1">{p.id}</span><StatusPill s={p.status} /><b className="w-[100px] text-right">{$(p.total)}</b></button>)}
          {pos.length === 0 && <Empty>No purchase orders.</Empty>}
        </Card>
        <Card title={`Invoices (${invoices.length})`}>
          {invoices.map((i) => <button key={i.id} onClick={() => go({ v: 'invoice', id: i.id })} className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-[#f3f5f8] text-left hover:bg-[#f7f9fb] text-[13.5px]"><span className="text-[#1a6ebd] font-semibold flex-1">{i.number}</span><StatusPill s={i.status} /><b className="w-[100px] text-right">{$(i.total)}</b></button>)}
          {invoices.length === 0 && <Empty>No invoices.</Empty>}
        </Card>
      </div>
    </div>
  )
}

/* ───────────────────────── request forms ───────────────────────── */

export function FormView({ form, go, flash }: { form: string; go: Go; flash: Flash }) {
  const def = FORMS.find((f) => f.id === form)
  const [vals, setVals] = useState<Record<string, string>>({})
  if (!def) return <div className="p-10">Form not found.</div>
  const ok = def.fields.every(([k, , t]) => (t === 'select' ? true : (vals[k] ?? '').trim()))
  const submit = () => {
    const values = Object.fromEntries(def.fields.map(([k, , t, opts]) => [k, vals[k] ?? (t === 'select' ? opts?.[0] ?? '' : '')]))
    const reqId = uid('cfr')
    db.insert('coupa.requests', { id: reqId, form: def.id, title: def.title, values, status: 'Submitted', submittedAt: new Date().toISOString(), requestedBy: ME.name }, { prepend: true })
    if (def.id === 'new-supplier') db.insert('coupa.supplierRequests', { id: uid('csr'), name: values.name, email: values.email, category: values.category, contact: values.email, number: 'Pending', phone: '—', city: '—', terms: 'Net 30', rating: 0, since: 'New', status: 'In Review', at: new Date().toISOString() }, { prepend: true })
    flash(`${def.title} submitted to Procurement (${person('lucas').name})`)
    go({ v: 'home' })
  }
  return (
    <div className="max-w-[900px] mx-auto px-6 py-6">
      <button onClick={() => go({ v: 'home' })} className="text-[13px] text-[#1a6ebd] hover:underline mb-3">← Back</button>
      <div className="text-[22px] font-semibold flex items-center gap-2"><FileCheck2 className="w-6 h-6 text-[#1a6ebd]" /> {def.title}</div>
      <div className="text-[14px] text-[#5f6b7a] mb-5">{def.desc}</div>
      <Card>
        <div className="p-5">
          {def.fields.map(([k, label, t, opts]) => (
            <Row key={k} label={label} required={t !== 'select'}>
              {t === 'textarea' ? <textarea data-agent={`coupa-form-${k}`} aria-label={label} className={`${inputCls} h-24 py-2`} value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
                : t === 'select' ? <select data-agent={`coupa-form-${k}`} aria-label={label} className={inputCls} value={vals[k] ?? opts?.[0]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })}>{opts?.map((o) => <option key={o}>{o}</option>)}</select>
                : <input data-agent={`coupa-form-${k}`} aria-label={label} type={t} className={inputCls + (t === 'text' ? '' : ' max-w-[240px]')} value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />}
            </Row>
          ))}
          <div className="flex justify-end gap-2 mt-3"><Btn onClick={() => go({ v: 'home' })}>Cancel</Btn><Btn primary data-agent="coupa-form-submit" disabled={!ok} onClick={submit}>Submit</Btn></div>
        </div>
      </Card>
    </div>
  )
}

/* ───────────────────────── profile & settings ───────────────────────── */

export function Profile({ flash }: { flash: Flash }) {
  const prefs = { ...usePrefsDefaults, ...useRecord<any>('coupa.prefs', PREFS_ID) }
  const requests = useCollection<any>('coupa.requests').filter((r) => r.requestedBy === ME.name)
  const [delegate, setDelegate] = useState(prefs.delegate)
  const Toggle = ({ k, label }: { k: 'emailApprovals' | 'emailOrders' | 'emailInvoices'; label: string }) => (
    <label className="flex items-center gap-3 py-2 text-[14px]">
      <input type="checkbox" data-agent={`coupa-pref-${k}`} checked={!!prefs[k]} onChange={(e) => patchPrefs({ [k]: e.target.checked })} className="w-4 h-4 accent-[#1a6ebd]" /> {label}
    </label>
  )
  return (
    <div className="max-w-[1000px] mx-auto px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <span className="w-16 h-16 rounded-full text-white text-[22px] font-bold flex items-center justify-center" style={{ background: BLUE }}>AM</span>
        <div><div className="text-[22px] font-semibold">{ME.name}</div><div className="text-[14px] text-[#5f6b7a]">{ME.title} · {ME.email} · Default cost center 6105 — Operations</div></div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Card title="Email notifications">
          <div className="px-5 py-3">
            <Toggle k="emailApprovals" label="Approval requests assigned to me" />
            <Toggle k="emailOrders" label="My requisitions are approved, rejected or ordered" />
            <Toggle k="emailInvoices" label="Invoices on my orders are disputed" />
          </div>
        </Card>
        <Card title="Approval delegation">
          <div className="p-5">
            <div className="text-[13px] text-[#5f6b7a] mb-2">While you’re out, route your approvals to:</div>
            <select data-agent="coupa-pref-delegate" aria-label="Delegate" className={inputCls} value={delegate} onChange={(e) => setDelegate(e.target.value)}>
              <option value="">No delegate</option>
              {['priya', 'ben', 'maya', 'sofia'].map((p) => <option key={p} value={person(p).name}>{person(p).name}</option>)}
            </select>
            <div className="flex justify-end mt-3"><Btn primary data-agent="coupa-pref-save" onClick={() => { patchPrefs({ delegate }); flash(delegate ? `Approvals delegated to ${delegate}` : 'Delegation removed') }}>Save</Btn></div>
            {prefs.delegate && <div className="text-[13px] text-[#2e7d32] mt-2">Currently delegating to {prefs.delegate}</div>}
          </div>
        </Card>
      </div>
      <Card title={`My form requests (${requests.length})`} className="mt-5">
        {requests.map((r) => <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#f3f5f8] text-[14px]"><span className="flex-1">{r.title}</span><span className="text-[13px] text-[#5f6b7a]">{fd(r.submittedAt)}</span><StatusPill s={r.status} /></div>)}
        {requests.length === 0 && <Empty>No form requests yet.</Empty>}
      </Card>
      <div className="text-[12px] text-[#5f6b7a] mt-4 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Profile details are synced from Workday.</div>
    </div>
  )
}
