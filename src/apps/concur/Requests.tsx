/** Concur Request — travel / spend pre-approval requests. */
import { useState } from 'react'
import { Plus, Trash2, Plane, CheckCircle2, Clock, Circle, Search } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { ME } from '@/data/people'
import { isoDate } from '@/data/time'
import { $, d, r2, ALL_TYPES, Btn, Field, inputCls, Status, Modal, Confirm, Banner, logHistory, PageTitle, Tabs } from './ui'

const mine = (r: any) => !r.ownerId || r.ownerId === ME.id
const total = (r: any) => r2((r.lines ?? []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0))

export function RequestsView({ openRequest }: { openRequest: (id: string) => void }) {
  const all = useCollection<any>('concur.requests').filter(mine)
  const [tab, setTab] = useState('active')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const rows = all
    .filter((r) => (tab === 'active' ? !['Canceled', 'Closed'].includes(r.status) && !(r.status === 'Approved' && r.reportId) : tab === 'approved' ? r.status === 'Approved' : true))
    .filter((r) => !q || `${r.name} ${r.destination} ${r.number}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0))
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <PageTitle right={<Btn primary data-agent="concur-req-create" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> Create New Request</Btn>}>Manage Requests</PageTitle>
      <div className="bg-white rounded-lg border border-[#d9d9d9]">
        <div className="px-5 flex items-end gap-4">
          <div className="flex-1"><Tabs prefix="concur-req-tab" value={tab} onChange={setTab} tabs={[['active', 'Active Requests'], ['approved', 'Approved'], ['all', 'All Requests']]} /></div>
          <div className="relative w-[260px] mb-1.5">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6a6d70]" />
            <input aria-label="Search requests" data-agent="concur-req-search" className={`${inputCls} pl-9`} placeholder="Search requests" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <table className="w-full text-[14px] text-[#32363a]">
          <thead>
            <tr className="h-10 text-left text-[13px] text-[#6a6d70] border-y border-[#e5e5e5]">
              <th className="pl-5 font-semibold">Request Name</th><th className="px-2 font-semibold">Request ID</th><th className="px-2 font-semibold">Destination</th><th className="px-2 font-semibold">Dates</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="h-24 text-center text-[#6a6d70]">No requests. Select Create New Request to request approval for a trip or purchase.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} data-agent={`concur-req-row-${r.id}`} onClick={() => openRequest(r.id)} className="h-[52px] border-b border-[#eeeeee] hover:bg-[#f7f7f7] cursor-pointer">
                <td className="pl-5 font-semibold text-[#0a6ed1]">{r.name}<div className="text-[12px] font-normal text-[#6a6d70] truncate max-w-[320px]">{r.purpose}</div></td>
                <td className="px-2">{r.number}</td>
                <td className="px-2">{r.destination}</td>
                <td className="px-2">{d(r.start)} – {d(r.end)}</td>
                <td className="px-2"><Status s={r.status} /></td>
                <td className="px-2 pr-5 text-right font-semibold">{$(total(r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <RequestForm onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); openRequest(id) }} />}
    </div>
  )
}

function RequestForm({ req, onClose, onSaved }: { req?: any; onClose: () => void; onSaved: (id: string) => void }) {
  const [f, setF] = useState({
    name: req?.name ?? '', purpose: req?.purpose ?? '', destination: req?.destination ?? '', start: req?.start ?? isoDate(new Date(Date.now() + 14 * 86400000)), end: req?.end ?? isoDate(new Date(Date.now() + 16 * 86400000)), comment: req?.comment ?? '',
    air: '', hotel: '', car: '', meals: '',
  })
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const ok = f.name.trim() && f.purpose.trim() && f.destination.trim() && f.start && f.end && f.end >= f.start
  const save = () => {
    if (!ok) return
    if (req) {
      db.update('concur.requests', req.id, { name: f.name, purpose: f.purpose, destination: f.destination, start: f.start, end: f.end, comment: f.comment })
      logHistory('concur.requests', req.id, 'Request header edited')
      return onSaved(req.id)
    }
    const lines = ([['Airfare', f.air], ['Hotel', f.hotel], ['Car Rental', f.car], ['Business Meals', f.meals]] as const)
      .filter(([, a]) => Number(a) > 0)
      .map(([type, a]) => ({ id: uid('rl'), type, amount: r2(Number(a)) }))
    const id = uid('creq')
    db.insert('concur.requests', {
      id, ownerId: ME.id, owner: ME.name, name: f.name, number: Math.random().toString(36).slice(2, 6).toUpperCase(), purpose: f.purpose, destination: f.destination,
      start: f.start, end: f.end, comment: f.comment, status: 'Not Submitted', approver: 'Priya Raman', lines, createdAt: new Date().toISOString(), history: [],
    }, { prepend: true })
    onSaved(id)
  }
  return (
    <Modal title={req ? 'Edit Request Header' : 'Create New Request'} width={720} onClose={onClose} agent="concur-req-modal" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-req-save" disabled={!ok} onClick={save}>{req ? 'Save' : 'Create Request'}</Btn></>}>
      <div className="p-6 grid grid-cols-2 gap-5">
        <Field label="Request Name" required><input data-agent="concur-req-name" aria-label="Request Name" className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Destination City" required><input data-agent="concur-req-destination" aria-label="Destination City" className={inputCls} value={f.destination} onChange={(e) => set('destination', e.target.value)} placeholder="e.g. Chicago, Illinois" /></Field>
        <div className="col-span-2"><Field label="Business Purpose" required><input data-agent="concur-req-purpose" aria-label="Business Purpose" className={inputCls} value={f.purpose} onChange={(e) => set('purpose', e.target.value)} /></Field></div>
        <Field label="Start Date" required><input type="date" aria-label="Start Date" className={inputCls} value={f.start} onChange={(e) => set('start', e.target.value)} /></Field>
        <Field label="End Date" required><input type="date" aria-label="End Date" className={inputCls} value={f.end} onChange={(e) => set('end', e.target.value)} /></Field>
        {!req && (
          <div className="col-span-2">
            <div className="text-[15px] font-semibold mb-2">Expected Expenses</div>
            <div className="grid grid-cols-4 gap-3">
              {([['air', 'Airfare'], ['hotel', 'Hotel'], ['car', 'Car Rental'], ['meals', 'Meals']] as const).map(([k, l]) => (
                <Field key={k} label={l}><input aria-label={`${l} estimate`} className={`${inputCls} text-right`} placeholder="0.00" value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} /></Field>
              ))}
            </div>
          </div>
        )}
        <div className="col-span-2"><Field label="Comment"><textarea aria-label="Comment" className={`${inputCls} h-16 py-2`} value={f.comment} onChange={(e) => set('comment', e.target.value)} /></Field></div>
      </div>
    </Modal>
  )
}

export function RequestPage({ id, back, openReport, bookTravel }: { id: string; back: () => void; openReport: (id: string) => void; bookTravel: (p: any) => void }) {
  const r = useRecord<any>('concur.requests', id)
  const trips = useCollection<any>('concur.trips').filter((t) => t.requestId === id)
  const [dlg, setDlg] = useState<null | 'edit' | 'delete' | 'recall' | 'cancel' | 'submit'>(null)
  const [line, setLine] = useState({ type: 'Airfare', amount: '' })
  const [note, setNote] = useState<string | null>(null)
  if (!r) return <div className="p-10">Request not found.</div>
  const editable = r.status === 'Not Submitted' || r.status === 'Sent Back'
  const t = total(r)
  const addLine = () => {
    const a = Number(line.amount)
    if (!(a > 0)) return
    db.update('concur.requests', id, (x) => ({ lines: [...(x.lines ?? []), { id: uid('rl'), type: line.type, amount: r2(a) }] }))
    setLine({ ...line, amount: '' })
  }
  const submit = () => {
    db.update('concur.requests', id, { status: 'Submitted & Pending Approval', submittedAt: new Date().toISOString() })
    logHistory('concur.requests', id, 'Submitted')
    setNote(`Request submitted to ${r.approver} for approval.`)
  }
  const recall = () => {
    db.update('concur.requests', id, { status: 'Not Submitted' })
    logHistory('concur.requests', id, 'Recalled by employee')
    setNote('Request recalled. You can edit and resubmit it.')
  }
  const cancel = () => {
    db.update('concur.requests', id, { status: 'Canceled' })
    logHistory('concur.requests', id, 'Canceled by employee')
    setNote('Request canceled.')
  }
  const createReport = () => {
    const rid = uid('crp')
    db.insert('concur.reports', {
      id: rid, name: r.name, number: Math.random().toString(36).slice(2, 9).toUpperCase(), purpose: r.purpose, comment: `Linked to request ${r.number}`, reportDate: new Date().toISOString(),
      policy: 'Northwind US Travel & Expense Policy', status: 'Not Submitted', total: 0, createdAt: new Date().toISOString(), approver: 'Priya Raman', approvalFlow: [], requestId: id,
    })
    db.update('concur.requests', id, { reportId: rid })
    logHistory('concur.requests', id, 'Expense report created from request')
    openReport(rid)
  }
  const flow = [
    { name: r.owner ?? ME.name, role: 'Submitted', status: r.status === 'Not Submitted' ? 'waiting' : 'done' },
    { name: r.approver, role: 'Manager Approval', status: r.status === 'Approved' ? 'done' : r.status === 'Submitted & Pending Approval' ? 'pending' : 'waiting' },
  ]
  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-[#d9d9d9] px-8 pt-4 pb-4">
        <button onClick={back} className="text-[13px] text-[#0a6ed1] hover:underline mb-2">‹ Manage Requests</button>
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3"><div className="text-[26px] font-light truncate" data-agent="concur-req-title">{r.name}</div><Status s={r.status} /></div>
            <div className="text-[13px] text-[#6a6d70] mt-1">Request ID {r.number} · {r.destination} · {d(r.start)} – {d(r.end)}</div>
          </div>
          <div className="flex-1" />
          {editable && <Btn data-agent="concur-req-edit" onClick={() => setDlg('edit')}>Edit</Btn>}
          {editable && <Btn data-agent="concur-req-delete" onClick={() => setDlg('delete')}><Trash2 className="w-4 h-4" /> Delete Request</Btn>}
          {editable && <Btn primary data-agent="concur-req-submit" disabled={!r.lines?.length} onClick={() => setDlg('submit')}>Submit Request</Btn>}
          {r.status === 'Submitted & Pending Approval' && <Btn data-agent="concur-req-recall" onClick={() => setDlg('recall')}>Recall</Btn>}
          {r.status === 'Approved' && <Btn data-agent="concur-req-book" onClick={() => bookTravel({ destination: r.destination, start: r.start, end: r.end, requestId: id, name: r.name })}><Plane className="w-4 h-4" /> Book Travel</Btn>}
          {r.status === 'Approved' && !r.reportId && <Btn primary data-agent="concur-req-expense" onClick={createReport}>Create Expense Report</Btn>}
          {r.status === 'Approved' && r.reportId && <Btn primary data-agent="concur-req-open-report" onClick={() => openReport(r.reportId)}>Open Expense Report</Btn>}
          {r.status === 'Approved' && !r.reportId && <Btn data-agent="concur-req-cancel" onClick={() => setDlg('cancel')}>Cancel Request</Btn>}
        </div>
      </div>
      <div className="p-8 grid grid-cols-[1fr_340px] gap-6">
        <div>
          {note && <Banner onClose={() => setNote(null)}>{note}</Banner>}
          {r.status === 'Sent Back' && r.sendBackComment && <Banner type="error">Sent back by {r.approver}: {r.sendBackComment}</Banner>}
          <div className="bg-white rounded-lg border border-[#d9d9d9] mb-5">
            <div className="h-12 px-5 flex items-center border-b border-[#e5e5e5] text-[16px] font-semibold">Expected Expenses<div className="flex-1" /><span className="text-[14px] font-normal text-[#6a6d70] mr-2">Total</span><span className="text-[18px] font-light" data-agent="concur-req-total">{$(t)}</span></div>
            <table className="w-full text-[14px]">
              <thead><tr className="h-9 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]"><th className="pl-5 font-semibold">Expense Type</th><th className="px-2 pr-5 font-semibold text-right">Estimated Amount</th><th className="w-12" /></tr></thead>
              <tbody>
                {!r.lines?.length && <tr><td colSpan={3} className="h-16 text-center text-[#6a6d70]">Add the expenses you expect to incur.</td></tr>}
                {(r.lines ?? []).map((l: any) => (
                  <tr key={l.id} className="h-11 border-b border-[#eeeeee]">
                    <td className="pl-5">{l.type}</td><td className="px-2 pr-5 text-right">{$(l.amount)}</td>
                    <td className="text-center">{editable && <button aria-label={`Remove ${l.type}`} onClick={() => db.update('concur.requests', id, (x) => ({ lines: x.lines.filter((y: any) => y.id !== l.id) }))} className="w-7 h-7 rounded hover:bg-[#f2f2f2] inline-flex items-center justify-center text-[#6a6d70]"><Trash2 className="w-4 h-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && (
              <div className="p-4 flex items-end gap-3">
                <div className="w-[260px]"><Field label="Expense Type"><select aria-label="Expected expense type" className={inputCls} value={line.type} onChange={(e) => setLine({ ...line, type: e.target.value })}>{ALL_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field></div>
                <div className="w-[160px]"><Field label="Amount"><input aria-label="Expected amount" className={`${inputCls} text-right`} placeholder="0.00" value={line.amount} onChange={(e) => setLine({ ...line, amount: e.target.value })} /></Field></div>
                <Btn data-agent="concur-req-line-add" disabled={!(Number(line.amount) > 0)} onClick={addLine}><Plus className="w-4 h-4" /> Add</Btn>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg border border-[#d9d9d9]">
            <div className="h-12 px-5 flex items-center border-b border-[#e5e5e5] text-[16px] font-semibold">Trips & Bookings ({trips.length})</div>
            {trips.length === 0 ? <div className="h-16 flex items-center justify-center text-[14px] text-[#6a6d70]">No bookings linked to this request yet.</div> : trips.map((x) => (
              <div key={x.id} className="h-12 px-5 flex items-center gap-3 border-b border-[#eeeeee] text-[14px]"><Plane className="w-4 h-4 text-[#0a6ed1]" /><div className="flex-1">{x.detail}</div><span className="text-[#6a6d70]">{x.conf}</span><Status s={x.status} /><b>{$(x.amount)}</b></div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-[#d9d9d9] p-5 text-[14px] space-y-2">
            <div className="text-[16px] font-semibold mb-1">Request Header</div>
            <div><span className="text-[#6a6d70]">Business Purpose:</span> {r.purpose}</div>
            <div><span className="text-[#6a6d70]">Employee:</span> {r.owner ?? ME.name}</div>
            <div><span className="text-[#6a6d70]">Approver:</span> {r.approver}</div>
            {r.comment && <div><span className="text-[#6a6d70]">Comment:</span> {r.comment}</div>}
          </div>
          <div className="bg-white rounded-lg border border-[#d9d9d9] p-5">
            <div className="text-[16px] font-semibold mb-3">Approval Flow</div>
            {flow.map((s, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                {s.status === 'done' ? <CheckCircle2 className="w-6 h-6 text-[#107e3e]" /> : s.status === 'pending' ? <Clock className="w-6 h-6 text-[#e9730c]" /> : <Circle className="w-6 h-6 text-[#bfbfbf]" />}
                <div><div className="text-[14px] font-semibold">{s.name}</div><div className="text-[12px] text-[#6a6d70]">{s.role}</div></div>
              </div>
            ))}
            {(r.history ?? []).length > 0 && <div className="text-[13px] font-semibold text-[#6a6d70] uppercase mt-4 mb-2">History</div>}
            {(r.history ?? []).map((h: any, i: number) => (
              <div key={i} className="text-[12px] text-[#6a6d70] mb-1"><b className="text-[#32363a]">{h.text}</b> · {h.by} · {new Date(h.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
            ))}
          </div>
        </div>
      </div>
      {dlg === 'edit' && <RequestForm req={r} onClose={() => setDlg(null)} onSaved={() => setDlg(null)} />}
      {dlg === 'delete' && <Confirm title="Delete Request" danger ok="Delete" onClose={() => setDlg(null)} onOk={() => { db.remove('concur.requests', id); back() }} text={<>Delete request “{r.name}”? This can’t be undone.</>} />}
      {dlg === 'submit' && <Confirm title="Submit Request" ok="Submit" onClose={() => setDlg(null)} onOk={submit} text={<>Submit “{r.name}” ({$(t)}) to {r.approver} for approval?</>} />}
      {dlg === 'recall' && <Confirm title="Recall Request" ok="Recall" onClose={() => setDlg(null)} onOk={recall} text={<>Recall “{r.name}” from {r.approver}’s approval queue?</>} />}
      {dlg === 'cancel' && <Confirm title="Cancel Request" danger ok="Cancel Request" onClose={() => setDlg(null)} onOk={cancel} text={<>Cancel the approved request “{r.name}”? Linked bookings are not canceled automatically.</>} />}
    </div>
  )
}
