/** Approvals portal — Alex approves his direct reports' expense reports and travel requests. */
import { useState } from 'react'
import { AlertTriangle, ArrowLeft, Receipt, CheckCircle2, Users } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { $, d, Btn, Field, inputCls, Status, Modal, Banner, logHistory, PageTitle, Tabs, initials } from './ui'

const PENDING = 'Submitted & Pending Approval'

export function ApprovalsView() {
  const reports = useCollection<any>('concur.teamReports')
  const requests = useCollection<any>('concur.requests').filter((r) => r.approver === ME.name && r.ownerId !== ME.id)
  const [tab, setTab] = useState('reports')
  const [show, setShow] = useState<'pending' | 'all'>('pending')
  const [openId, setOpenId] = useState<string | null>(null)
  const [act, setAct] = useState<null | { kind: 'approve' | 'sendback'; ids: string[] }>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [note, setNote] = useState<string | null>(null)
  const col = tab === 'reports' ? 'concur.teamReports' : 'concur.requests'
  const list = (tab === 'reports' ? reports : requests).filter((r) => show === 'all' || r.status === PENDING)
  const cur = (tab === 'reports' ? reports : requests).find((r) => r.id === openId)
  const pendR = reports.filter((r) => r.status === PENDING).length
  const pendQ = requests.filter((r) => r.status === PENDING).length

  const doAct = (kind: 'approve' | 'sendback', ids: string[], comment: string) => {
    for (const id of ids) {
      db.update(col, id, kind === 'approve' ? { status: 'Approved', approvedAt: new Date().toISOString(), approverComment: comment || undefined } : { status: 'Sent Back', sendBackComment: comment })
      logHistory(col, id, kind === 'approve' ? `Approved${comment ? ` — “${comment}”` : ''}` : `Sent back — “${comment}”`, ME.name)
    }
    setNote(`${ids.length} ${tab === 'reports' ? 'report' : 'request'}${ids.length === 1 ? '' : 's'} ${kind === 'approve' ? 'approved' : 'sent back to the employee'}.`)
    setSel(new Set())
    setOpenId(null)
  }

  if (cur) {
    const isReport = tab === 'reports'
    const amount = isReport ? cur.total : (cur.lines ?? []).reduce((s: number, l: any) => s + l.amount, 0)
    return (
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#d9d9d9] px-8 pt-4 pb-4">
          <button onClick={() => setOpenId(null)} className="text-[13px] text-[#0a6ed1] hover:underline flex items-center gap-1 mb-2"><ArrowLeft className="w-3.5 h-3.5" /> Approvals</button>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-[#ebf5fe] text-[#0a6ed1] flex items-center justify-center font-semibold">{initials(isReport ? cur.employee : cur.owner)}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-3"><div className="text-[24px] font-light" data-agent="concur-appr-title">{cur.name}</div><Status s={cur.status} /></div>
              <div className="text-[13px] text-[#6a6d70] mt-1">{isReport ? cur.employee : cur.owner} · {isReport ? `Report ${cur.number} · submitted ${d(cur.submittedAt)}` : `Request ${cur.number} · ${cur.destination} · ${d(cur.start)} – ${d(cur.end)}`}</div>
            </div>
            <div className="flex-1" />
            <div className="text-right mr-4"><div className="text-[12px] text-[#6a6d70]">{isReport ? 'Report Total' : 'Request Total'}</div><div className="text-[22px] font-light">{$(amount)}</div></div>
            {cur.status === PENDING && <Btn data-agent="concur-appr-sendback" onClick={() => setAct({ kind: 'sendback', ids: [cur.id] })}>Send Back to Employee</Btn>}
            {cur.status === PENDING && <Btn primary data-agent="concur-appr-approve" onClick={() => setAct({ kind: 'approve', ids: [cur.id] })}>Approve</Btn>}
          </div>
        </div>
        <div className="p-8">
          <div className="text-[14px] mb-4"><span className="text-[#6a6d70]">Business Purpose:</span> {cur.purpose}</div>
          {cur.exceptions?.length > 0 && (
            <div className="rounded border border-[#e9730c] bg-[#fef7f1] p-3 text-[13px] mb-4">
              {cur.exceptions.map((e: string) => <div key={e} className="flex gap-2"><AlertTriangle className="w-4 h-4 text-[#e9730c] shrink-0 mt-0.5" /> {e}</div>)}
            </div>
          )}
          {cur.sendBackComment && cur.status === 'Sent Back' && <Banner type="error">You sent this back: {cur.sendBackComment}</Banner>}
          <div className="bg-white rounded-lg border border-[#d9d9d9]">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="h-10 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]">
                  {isReport ? <><th className="pl-5 font-semibold">Receipt</th><th className="px-2 font-semibold">Expense Type</th><th className="px-2 font-semibold">Vendor</th><th className="px-2 font-semibold">Date</th></> : <th className="pl-5 font-semibold">Expected Expense</th>}
                  <th className="px-2 pr-5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(isReport ? cur.expenses : cur.lines ?? []).map((e: any) => (
                  <tr key={e.id} className="h-12 border-b border-[#eeeeee]">
                    {isReport ? (
                      <>
                        <td className="pl-5">{e.receipt ? <Receipt className="w-4 h-4 text-[#107e3e]" /> : <AlertTriangle className="w-4 h-4 text-[#e9730c]" />}</td>
                        <td className="px-2 font-semibold">{e.type}{e.attendees ? <span className="ml-1 text-[12px] font-normal text-[#6a6d70]"><Users className="w-3 h-3 inline" /> {e.attendees}</span> : null}</td>
                        <td className="px-2">{e.vendor}<div className="text-[12px] text-[#6a6d70]">{e.city}</div></td>
                        <td className="px-2">{d(e.date)}</td>
                      </>
                    ) : <td className="pl-5">{e.type}</td>}
                    <td className="px-2 pr-5 text-right font-semibold">{$(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(cur.history ?? []).length > 0 && (
            <div className="mt-5">
              <div className="text-[13px] font-semibold text-[#6a6d70] uppercase mb-2">History</div>
              {cur.history.map((h: any, i: number) => <div key={i} className="text-[13px] text-[#6a6d70] mb-1"><b className="text-[#32363a]">{h.text}</b> · {h.by} · {new Date(h.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>)}
            </div>
          )}
        </div>
        {act && <ActDialog act={act} onClose={() => setAct(null)} onDone={doAct} />}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <PageTitle>Approvals</PageTitle>
      {note && <Banner onClose={() => setNote(null)}>{note}</Banner>}
      <div className="flex gap-4 mb-5">
        {[['reports', 'Expense Reports', pendR], ['requests', 'Requests', pendQ]].map(([k, l, n]) => (
          <button key={k as string} data-agent={`concur-appr-tile-${k}`} onClick={() => { setTab(k as string); setSel(new Set()) }} className={`w-[220px] h-[96px] rounded-lg bg-white border text-left p-4 ${tab === k ? 'border-[#0a6ed1] shadow-[0_0_0_1px_#0a6ed1]' : 'border-[#d9d9d9] hover:shadow-md'}`}>
            <div className="text-[14px] text-[#6a6d70]">{l as string}</div>
            <div className="text-[30px] font-light">{n as number}</div>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[#d9d9d9]">
        <div className="px-5 flex items-end gap-3">
          <div className="flex-1"><Tabs prefix="concur-appr-tab" value={tab} onChange={(k) => { setTab(k); setSel(new Set()) }} tabs={[['reports', `Expense Reports (${pendR})`], ['requests', `Requests (${pendQ})`]]} /></div>
          <select aria-label="View" data-agent="concur-appr-show" className={`${inputCls} w-[180px] mb-1.5`} value={show} onChange={(e) => setShow(e.target.value as any)}><option value="pending">Pending approval</option><option value="all">All (last 90 days)</option></select>
          <Btn className="mb-1.5" data-agent="concur-appr-bulk-approve" primary disabled={!sel.size} onClick={() => setAct({ kind: 'approve', ids: [...sel] })}><CheckCircle2 className="w-4 h-4" /> Approve ({sel.size})</Btn>
        </div>
        <table className="w-full text-[14px]">
          <thead>
            <tr className="h-10 text-left text-[13px] text-[#6a6d70] border-y border-[#e5e5e5]">
              <th className="w-10 pl-5" /><th className="px-2 font-semibold">Employee</th><th className="px-2 font-semibold">{tab === 'reports' ? 'Report Name' : 'Request Name'}</th><th className="px-2 font-semibold">{tab === 'reports' ? 'Submitted' : 'Trip Dates'}</th><th className="px-2 font-semibold">Exceptions</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="h-24 text-center text-[#6a6d70]">{show === 'pending' ? 'Nothing waiting for your approval. Nice work!' : 'No items.'}</td></tr>}
            {list.map((r) => (
              <tr key={r.id} data-agent={`concur-appr-row-${r.id}`} onClick={() => setOpenId(r.id)} className="h-[52px] border-b border-[#eeeeee] hover:bg-[#f7f7f7] cursor-pointer">
                <td className="pl-5" onClick={(e) => { e.stopPropagation(); if (r.status !== PENDING) return; setSel((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n }) }}>
                  <input type="checkbox" readOnly disabled={r.status !== PENDING} checked={sel.has(r.id)} className="w-4 h-4 accent-[#0a6ed1]" aria-label="Select" />
                </td>
                <td className="px-2"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-[#ebf5fe] text-[#0a6ed1] text-[11px] font-semibold flex items-center justify-center">{initials(r.employee ?? r.owner)}</span>{r.employee ?? r.owner}</div></td>
                <td className="px-2 font-semibold text-[#0a6ed1]">{r.name}</td>
                <td className="px-2">{tab === 'reports' ? d(r.submittedAt) : `${d(r.start)} – ${d(r.end)}`}</td>
                <td className="px-2">{r.exceptions?.length ? <span className="inline-flex items-center gap-1 text-[#e9730c]"><AlertTriangle className="w-4 h-4" /> {r.exceptions.length}</span> : <span className="text-[#6a6d70]">—</span>}</td>
                <td className="px-2"><Status s={r.status} /></td>
                <td className="px-2 pr-5 text-right font-semibold">{$(tab === 'reports' ? r.total : (r.lines ?? []).reduce((s: number, l: any) => s + l.amount, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {act && <ActDialog act={act} onClose={() => setAct(null)} onDone={doAct} />}
    </div>
  )
}

function ActDialog({ act, onClose, onDone }: { act: { kind: 'approve' | 'sendback'; ids: string[] }; onClose: () => void; onDone: (k: 'approve' | 'sendback', ids: string[], c: string) => void }) {
  const [c, setC] = useState('')
  const sb = act.kind === 'sendback'
  return (
    <Modal
      title={sb ? 'Send Back to Employee' : 'Approve'}
      width={520}
      onClose={onClose}
      agent="concur-appr-dialog"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-appr-confirm" disabled={sb && !c.trim()} onClick={() => { onDone(act.kind, act.ids, c.trim()); onClose() }}>{sb ? 'Send Back' : 'Approve'}</Btn></>}
    >
      <div className="p-6 space-y-3">
        <div className="text-[14px]">{sb ? 'Tell the employee what needs to change. The comment is required.' : `Approve ${act.ids.length} item${act.ids.length === 1 ? '' : 's'}? You can add an optional comment.`}</div>
        <Field label="Comment" required={sb}><textarea data-agent="concur-appr-comment" aria-label="Comment" className={`${inputCls} h-24 py-2`} value={c} onChange={(e) => setC(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
