/** Payables, purchasing, relationships and activities records. */
import { useMemo, useState } from 'react'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useDesk } from '@/os/context'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { isoDate } from '@/data/time'
import { Btn, Banner, Card, F, HW, PageHead, StatusPill, TH, inp, n2, fd, NS_ACCOUNTS, DEPTS, mergeVendors, slug, type Go } from './ui'

const TERMS_DAYS: Record<string, number> = { 'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60, 'Due on receipt': 0 }
const toggleIn = (s: Set<string>, id: string) => {
  const n = new Set(s)
  n.has(id) ? n.delete(id) : n.add(id)
  return n
}

/* ───────────── Bills ───────────── */

export function BillForm({ go, vendor }: { go: Go; vendor?: string }) {
  const { isAgent } = useDesk()
  const [f, setF] = useState({ vendor: vendor ?? '', refNo: '', date: isoDate(new Date()), amount: '', memo: '', account: '6120 Facilities Maintenance', terms: 'Net 30', department: 'Operations' })
  const [err, setErr] = useState<string | null>(null)
  const vendors = useMemo(() => mergeVendors(db.get<any>('netsuite.vendors'), db.get<any>('netsuite.bills')).map((v) => v.name), [])
  const save = () => {
    if (!f.vendor || !Number(f.amount)) return setErr('Please enter value(s) for: Vendor, Amount')
    const bills = db.get<any>('netsuite.bills')
    const num = bills.reduce((m, b) => Math.max(m, Number(b.number.replace('BILL', ''))), 10500) + 1
    const id = `nsb-${num}`
    const date = new Date(f.date + 'T12:00:00').toISOString()
    const days = TERMS_DAYS[f.terms] ?? 30
    db.insert('netsuite.bills', { id, number: `BILL${num}`, vendor: f.vendor, date, dueDate: new Date(+new Date(date) + days * 86400000).toISOString(), amount: Number(f.amount), memo: f.memo, status: 'Pending Approval', approvalStatus: 'Pending Approval', account: '2000 Accounts Payable', refNo: f.refNo, terms: f.terms, lines: [{ account: f.account, amount: Number(f.amount), memo: f.memo, department: f.department }], createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    go({ v: 'bill', id })
  }
  return (
    <div>
      <PageHead kind="Bill" title="" go={go} list={{ v: 'txns', type: 'Bill' }}><Btn primary data-agent="ns-bill-save" onClick={save}>Save</Btn><Btn onClick={() => go({ v: 'home' })}>Cancel</Btn></PageHead>
      {err && <div className="mx-6 mt-3 px-3 py-2 rounded-[3px] border bg-[#fdf0ee] border-[#efb3a9] text-[#8a2a1c] text-[13px]">{err}</div>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-x-8 gap-y-3">
        <F label="Vendor" req><select data-agent="ns-bill-vendor" className={inp} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} aria-label="Vendor"><option value="" />{vendors.map((v) => <option key={v}>{v}</option>)}</select></F>
        <F label="Reference No."><input data-agent="ns-bill-ref" className={inp} value={f.refNo} onChange={(e) => setF({ ...f, refNo: e.target.value })} aria-label="Reference No." /></F>
        <F label="Date" req><input type="date" className={inp} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Date" /></F>
        <F label="Amount" req><input data-agent="ns-bill-amount" className={inp} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-label="Amount" /></F>
        <F label="Account"><select className={inp} aria-label="AP Account"><option>2000 Accounts Payable</option></select></F>
        <F label="Terms"><select className={inp} aria-label="Terms" value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })}>{Object.keys(TERMS_DAYS).map((t) => <option key={t}>{t}</option>)}</select></F>
        <div className="col-span-2"><F label="Memo"><input data-agent="ns-bill-memo" className={inp} value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} aria-label="Memo" /></F></div>
        <div className="col-span-2"><F label="Expense Account"><select className={inp} value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })} aria-label="Expense Account">{NS_ACCOUNTS.filter((a) => a[0] === '6').map((a) => <option key={a}>{a}</option>)}</select></F></div>
        <F label="Department"><select className={inp} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} aria-label="Department">{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></F>
      </div>
    </div>
  )
}

export function payBills(ids: string[], isAgent: boolean) {
  const bills = db.get<any>('netsuite.bills').filter((b) => ids.includes(b.id))
  const total = bills.reduce((t, b) => t + b.amount, 0)
  const n = db.get<any>('netsuite.payments').length
  const number = `BP-${3340 + n + 1}`
  db.insert('netsuite.payments', { id: uid('nspay'), number, date: new Date().toISOString(), billIds: ids, vendors: [...new Set(bills.map((b) => b.vendor))], amount: total, account: '1010 Woodgrove Operating Checking', method: 'ACH', createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
  for (const b of bills) db.update('netsuite.bills', b.id, { status: 'Paid In Full', paidAt: new Date().toISOString(), paymentNumber: number })
  return { number, total }
}

export function BillView({ id, go }: { id: string; go: Go }) {
  const { isAgent } = useDesk()
  const b = useRecord<any>('netsuite.bills', id)
  const [edit, setEdit] = useState<any>(null)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  if (!b) return <div className="p-6">Record not found.</div>
  const pending = b.approvalStatus === 'Pending Approval'
  const save = () => {
    if (!Number(edit.amount)) return setMsg({ ok: false, t: 'Please enter a value for: Amount' })
    db.update('netsuite.bills', b.id, { refNo: edit.refNo, memo: edit.memo, amount: Number(edit.amount), dueDate: new Date(edit.dueDate + 'T12:00:00').toISOString(), lines: (b.lines ?? []).map((l: any, i: number) => (i === 0 ? { ...l, amount: Number(edit.amount), memo: edit.memo } : l)) })
    setEdit(null)
    setMsg({ ok: true, t: 'Transaction successfully saved.' })
  }
  const setApproval = (approved: boolean) => {
    db.update('netsuite.bills', b.id, approved ? { approvalStatus: 'Approved', status: 'Open' } : { approvalStatus: 'Rejected', status: 'Rejected' })
    setMsg({ ok: approved, t: approved ? `Bill #${b.number} approved.` : `Bill #${b.number} rejected.` })
  }
  const pay = () => {
    const r = payBills([b.id], isAgent)
    setMsg({ ok: true, t: `Bill payment ${r.number} for $${n2(r.total)} created from 1010 Woodgrove Operating Checking.` })
  }
  return (
    <div>
      <PageHead kind="Bill" title={`#${b.number} · ${b.vendor}`} status={<StatusPill s={b.status} />} go={go} list={{ v: 'txns', type: 'Bill' }}>
        {edit ? (
          <><Btn primary onClick={save}>Save</Btn><Btn onClick={() => setEdit(null)}>Cancel</Btn></>
        ) : (
          <>
            <Btn primary disabled={b.status === 'Paid In Full'} onClick={() => setEdit({ refNo: b.refNo ?? '', memo: b.memo ?? '', amount: String(b.amount), dueDate: isoDate(b.dueDate) })}>Edit</Btn>
            <Btn disabled={b.status !== 'Open'} onClick={pay}>Make Payment</Btn>
            {pending && <><Btn onClick={() => setApproval(true)}>Approve</Btn><Btn onClick={() => setApproval(false)}>Reject</Btn></>}
            <Btn onClick={() => go({ v: 'vendor', id: `nsv-${slug(b.vendor)}` })}>Vendor</Btn>
          </>
        )}
        {b.createdBy === 'hworker' && <HW />}
      </PageHead>
      {msg && <Banner ok={msg.ok} onClose={() => setMsg(null)}>{msg.t}</Banner>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-4 text-[13px]">
        {edit ? (
          <>
            <F label="Vendor"><div className="h-[26px] flex items-center">{b.vendor}</div></F>
            <F label="Reference No."><input className={inp} value={edit.refNo} onChange={(e) => setEdit({ ...edit, refNo: e.target.value })} aria-label="Reference No." /></F>
            <F label="Due Date"><input type="date" className={inp} value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} aria-label="Due Date" /></F>
            <F label="Amount" req><input className={inp} value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} aria-label="Amount" /></F>
            <div className="col-span-4"><F label="Memo"><input className={inp} value={edit.memo} onChange={(e) => setEdit({ ...edit, memo: e.target.value })} aria-label="Memo" /></F></div>
          </>
        ) : (
          [['Vendor', b.vendor], ['Reference No.', b.refNo], ['Date', fd(b.date)], ['Due Date', fd(b.dueDate)], ['Amount', '$' + n2(b.amount)], ['Account', b.account], ['Approval Status', b.approvalStatus], ['Memo', b.memo], ...(b.paymentNumber ? [['Paid By', `${b.paymentNumber} · ${fd(b.paidAt)}`]] : [])].map(([k, v]) => (
            <div key={k}><div className="text-[11px] font-semibold uppercase text-[#777]">{k}</div><div>{v}</div></div>
          ))
        )}
      </div>
      <Card className="!mt-0">
        <div className="px-4 pt-3 pb-2 text-[13px] font-bold text-[#24385b] uppercase">Expenses</div>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Account</th><th className="px-2">Memo</th><th className="px-2">Department</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {(b.lines ?? []).map((l: any, i: number) => <tr key={i} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3">{l.account}</td><td className="px-2">{l.memo}</td><td className="px-2">{l.department}</td><td className="px-3 text-right">{n2(l.amount)}</td></tr>)}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function ApproveBills({ go }: { go: Go }) {
  const bills = useCollection<any>('netsuite.bills').filter((b) => b.approvalStatus === 'Pending Approval')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const approve = () => {
    sel.forEach((id) => db.update('netsuite.bills', id, { approvalStatus: 'Approved', status: 'Open' }))
    setMsg(`${sel.size} bill(s) approved.`)
    setSel(new Set())
  }
  const reject = () => {
    sel.forEach((id) => db.update('netsuite.bills', id, { approvalStatus: 'Rejected', status: 'Rejected' }))
    setMsg(`${sel.size} bill(s) rejected and returned to the requester.`)
    setSel(new Set())
  }
  const all = bills.length > 0 && bills.every((b) => sel.has(b.id))
  return (
    <div>
      <PageHead kind="Approve Bills" title="Bills pending your approval" go={go} list={{ v: 'txns', type: 'Bill' }}><Btn primary data-agent="ns-bills-approve" disabled={!sel.size} onClick={approve}>Approve</Btn><Btn disabled={!sel.size} onClick={reject}>Reject</Btn><Btn onClick={() => go({ v: 'bill' })}>Enter Bill</Btn></PageHead>
      {msg && <Banner ok onClose={() => setMsg(null)}>{msg}</Banner>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="w-8 text-center"><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(bills.map((b) => b.id)))} className="accent-[#3a75c4]" /></th><th className="px-2 py-1.5">Date</th><th className="px-2">Number</th><th className="px-2">Vendor</th><th className="px-2">Memo</th><th className="px-2">Due</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} data-agent={`ns-bill-row-${b.id}`} onClick={() => setSel((s) => toggleIn(s, b.id))} className={`h-[32px] border-b border-[#f0f0f0] ${sel.has(b.id) ? 'bg-[#dfeafa]' : 'hover:bg-[#f5f8fc]'}`}>
                <td className="text-center"><input type="checkbox" readOnly checked={sel.has(b.id)} className="accent-[#3a75c4]" /></td><td className="px-2">{fd(b.date)}</td>
                <td className="px-2"><button className="text-[#3a75c4] hover:underline" onClick={(e) => { e.stopPropagation(); go({ v: 'bill', id: b.id }) }}>{b.number}</button></td>
                <td className="px-2">{b.vendor}</td><td className="px-2">{b.memo}</td><td className="px-2">{fd(b.dueDate)}</td><td className="px-3 text-right font-semibold">{n2(b.amount)}</td>
              </tr>
            ))}
            {bills.length === 0 && <tr><td colSpan={7} className="h-14 text-center text-[#888]">No bills pending approval.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PayBills({ go }: { go: Go }) {
  const { isAgent } = useDesk()
  const bills = useCollection<any>('netsuite.bills').filter((b) => b.status === 'Open')
  const payments = useCollection<any>('netsuite.payments')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const total = bills.filter((b) => sel.has(b.id)).reduce((t, b) => t + b.amount, 0)
  const pay = () => {
    const r = payBills([...sel], isAgent)
    setMsg(`Bill payment ${r.number} created: ${sel.size} bill(s), $${n2(r.total)} by ACH from 1010 Woodgrove Operating Checking.`)
    setSel(new Set())
  }
  return (
    <div>
      <PageHead kind="Pay Bills" title="Account: 1010 Woodgrove Operating Checking · Payment method: ACH" go={go} list={{ v: 'txns', type: 'Bill Payment' }}>
        <Btn primary disabled={!sel.size} onClick={pay}>Submit ({sel.size})</Btn><Btn disabled={!sel.size} onClick={() => setSel(new Set())}>Unmark All</Btn><Btn onClick={() => setSel(new Set(bills.filter((b) => +new Date(b.dueDate) <= Date.now() + 7 * 86400000).map((b) => b.id)))}>Mark Due This Week</Btn>
      </PageHead>
      {msg && <Banner ok onClose={() => setMsg(null)}>{msg}</Banner>}
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="w-8" /><th className="px-2 py-1.5">Due Date</th><th className="px-2">Number</th><th className="px-2">Vendor</th><th className="px-2">Memo</th><th className="px-3 text-right">Amount Due</th></tr></thead>
          <tbody>
            {[...bills].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).map((b) => (
              <tr key={b.id} onClick={() => setSel((s) => toggleIn(s, b.id))} className={`h-[32px] border-b border-[#f0f0f0] ${sel.has(b.id) ? 'bg-[#dfeafa]' : 'hover:bg-[#f5f8fc]'}`}>
                <td className="text-center"><input type="checkbox" readOnly checked={sel.has(b.id)} className="accent-[#3a75c4]" aria-label="Select" /></td>
                <td className={`px-2 ${+new Date(b.dueDate) < Date.now() ? 'text-[#c0392b] font-semibold' : ''}`}>{fd(b.dueDate)}</td>
                <td className="px-2"><button className="text-[#3a75c4] hover:underline" onClick={(e) => { e.stopPropagation(); go({ v: 'bill', id: b.id }) }}>{b.number}</button></td>
                <td className="px-2">{b.vendor}</td><td className="px-2">{b.memo}</td><td className="px-3 text-right font-semibold">{n2(b.amount)}</td>
              </tr>
            ))}
            {bills.length === 0 && <tr><td colSpan={6} className="h-14 text-center text-[#888]">No open bills.</td></tr>}
            <tr className="h-[32px] font-bold bg-[#f7f7f7]"><td colSpan={5} className="px-3">Payment Total</td><td className="px-3 text-right">{n2(total)}</td></tr>
          </tbody>
        </table>
      </Card>
      {payments.length > 0 && (
        <Card className="!mt-0">
          <div className="px-4 pt-3 pb-2 text-[13px] font-bold text-[#24385b] uppercase">Recent Bill Payments</div>
          <table className="w-full text-[13px]"><tbody>
            {payments.slice(0, 8).map((p) => <tr key={p.id} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3 text-[#3a75c4]">{p.number}</td><td className="px-2">{fd(p.date)}</td><td className="px-2">{p.vendors.join(', ')} {p.createdBy === 'hworker' && <HW />}</td><td className="px-3 text-right">{n2(p.amount)}</td></tr>)}
          </tbody></table>
        </Card>
      )}
    </div>
  )
}

/* ───────────── Vendors / customers ───────────── */

export function VendorList({ go }: { go: Go }) {
  const vendors = mergeVendors(useCollection<any>('netsuite.vendors'), useCollection<any>('netsuite.bills'))
  const bills = useCollection<any>('netsuite.bills')
  const [q, setQ] = useState('')
  const rows = vendors.filter((v) => !q || `${v.name} ${v.category} ${v.email}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHead kind="Vendors" title="Lists › Relationships › Vendors" go={go}><Btn primary onClick={() => go({ v: 'entity', kind: 'vendor' })}>New Vendor</Btn><input className={`${inp} !w-[240px]`} placeholder="Filter by name, category, email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter vendors" /></PageHead>
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Name</th><th className="px-2">Category</th><th className="px-2">Terms</th><th className="px-2">Email</th><th className="px-2">Phone</th><th className="px-3 text-right">Balance</th></tr></thead>
          <tbody>
            {rows.map((v) => {
              const bal = bills.filter((b) => b.vendor === v.name && b.status !== 'Paid In Full' && b.status !== 'Rejected').reduce((t, b) => t + b.amount, 0)
              return (
                <tr key={v.id} onClick={() => go({ v: 'vendor', id: v.id })} className="h-[30px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc] cursor-default">
                  <td className="px-3 text-[#3a75c4]">{v.name}</td><td className="px-2">{v.category}</td><td className="px-2">{v.terms}</td><td className="px-2">{v.email}</td><td className="px-2">{v.phone}</td><td className="px-3 text-right">{n2(bal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function VendorView({ id, go }: { id: string; go: Go }) {
  const vendors = mergeVendors(useCollection<any>('netsuite.vendors'), useCollection<any>('netsuite.bills'))
  const bills = useCollection<any>('netsuite.bills')
  const v = vendors.find((x) => x.id === id)
  const [edit, setEdit] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  if (!v) return <div className="p-6">Record not found.</div>
  const vb = bills.filter((b) => b.vendor === v.name)
  const bal = vb.filter((b) => b.status !== 'Paid In Full' && b.status !== 'Rejected').reduce((t, b) => t + b.amount, 0)
  const save = () => {
    const { derived: _d, ...rest } = v
    db.upsert('netsuite.vendors', { ...rest, ...edit })
    setEdit(null)
    setSaved(true)
  }
  const fields: [string, string][] = [['category', 'Category'], ['terms', 'Terms'], ['email', 'Email'], ['phone', 'Phone'], ['contact', 'Primary Contact'], ['taxId', 'Tax ID'], ['address', 'Address']]
  return (
    <div>
      <PageHead kind="Vendor" title={v.name} go={go} list={{ v: 'vendors' }}>
        {edit ? <><Btn primary onClick={save}>Save</Btn><Btn onClick={() => setEdit(null)}>Cancel</Btn></> : <><Btn primary onClick={() => setEdit(Object.fromEntries(fields.map(([k]) => [k, v[k] ?? ''])))}>Edit</Btn><Btn onClick={() => go({ v: 'bill', vendor: v.name })}>Enter Bill</Btn><Btn onClick={() => go({ v: 'pay' })}>Pay Bills</Btn></>}
      </PageHead>
      {saved && <Banner ok onClose={() => setSaved(false)}>Vendor record saved.</Banner>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-4 text-[13px]">
        {fields.map(([k, l]) => (
          <div key={k} className={k === 'address' ? 'col-span-2' : ''}>
            <div className="text-[11px] font-semibold uppercase text-[#777]">{l}</div>
            {edit ? <input className={inp} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} aria-label={l} /> : <div>{v[k] || '—'}</div>}
          </div>
        ))}
        <div><div className="text-[11px] font-semibold uppercase text-[#777]">Balance</div><div className="font-semibold">${n2(bal)}</div></div>
      </div>
      <Card className="!mt-0">
        <div className="px-4 pt-3 pb-2 text-[13px] font-bold text-[#24385b] uppercase">Transactions ({vb.length})</div>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Date</th><th className="px-2">Number</th><th className="px-2">Memo</th><th className="px-2">Status</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>{vb.map((b) => <tr key={b.id} onClick={() => go({ v: 'bill', id: b.id })} className="h-[30px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]"><td className="px-3">{fd(b.date)}</td><td className="px-2 text-[#3a75c4]">{b.number}</td><td className="px-2">{b.memo}</td><td className="px-2">{b.status}</td><td className="px-3 text-right">{n2(b.amount)}</td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  )
}

export function EntityForm({ kind, go }: { kind: 'vendor' | 'customer'; go: Go }) {
  const [f, setF] = useState({ name: '', category: kind === 'vendor' ? 'Supplier' : '', terms: 'Net 30', email: '', phone: '', contact: '', salesRep: 'Liam Carter', creditLimit: '' })
  const [err, setErr] = useState<string | null>(null)
  const save = () => {
    if (!f.name.trim()) return setErr(`Please enter a value for: ${kind === 'vendor' ? 'Company Name' : 'Customer Name'}`)
    if (kind === 'vendor') {
      const id = `nsv-${slug(f.name)}`
      db.upsert('netsuite.vendors', { id, name: f.name.trim(), category: f.category, terms: f.terms, email: f.email, phone: f.phone, contact: f.contact })
      go({ v: 'vendor', id })
    } else {
      db.upsert('netsuite.customers', { id: `nsc-${slug(f.name)}`, name: f.name.trim(), terms: f.terms, email: f.email, phone: f.phone, salesRep: f.salesRep, creditLimit: Number(f.creditLimit) || 0 })
      go({ v: 'customers' })
    }
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return (
    <div>
      <PageHead kind={kind === 'vendor' ? 'Vendor' : 'Customer'} title="" go={go} list={kind === 'vendor' ? { v: 'vendors' } : { v: 'customers' }}><Btn primary onClick={save}>Save</Btn><Btn onClick={() => go({ v: 'home' })}>Cancel</Btn></PageHead>
      {err && <Banner ok={false} onClose={() => setErr(null)}>{err}</Banner>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-x-8 gap-y-3">
        <div className="col-span-2"><F label={kind === 'vendor' ? 'Company Name' : 'Customer Name'} req><input className={inp} value={f.name} onChange={set('name')} aria-label="Name" /></F></div>
        <F label="Terms"><select className={inp} value={f.terms} onChange={set('terms')} aria-label="Terms">{Object.keys(TERMS_DAYS).map((t) => <option key={t}>{t}</option>)}</select></F>
        {kind === 'vendor' ? <F label="Category"><input className={inp} value={f.category} onChange={set('category')} aria-label="Category" /></F> : <F label="Sales Rep"><input className={inp} value={f.salesRep} onChange={set('salesRep')} aria-label="Sales Rep" /></F>}
        <F label="Email"><input className={inp} value={f.email} onChange={set('email')} aria-label="Email" /></F>
        <F label="Phone"><input className={inp} value={f.phone} onChange={set('phone')} aria-label="Phone" /></F>
        {kind === 'vendor' ? <F label="Primary Contact"><input className={inp} value={f.contact} onChange={set('contact')} aria-label="Primary Contact" /></F> : <F label="Credit Limit"><input className={inp} value={f.creditLimit} onChange={set('creditLimit')} aria-label="Credit Limit" /></F>}
      </div>
    </div>
  )
}

export function CustomerList({ go }: { go: Go }) {
  const customers = useCollection<any>('netsuite.customers')
  const invoices = useCollection<any>('netsuite.invoices')
  return (
    <div>
      <PageHead kind="Customers" title="Lists › Relationships › Customers" go={go}><Btn primary onClick={() => go({ v: 'entity', kind: 'customer' })}>New Customer</Btn><Btn onClick={() => go({ v: 'invoices' })}>Invoices</Btn></PageHead>
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Name</th><th className="px-2">Sales Rep</th><th className="px-2">Terms</th><th className="px-2">Email</th><th className="px-2 text-right">Credit Limit</th><th className="px-3 text-right">Open Balance</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} onClick={() => go({ v: 'invoices' })} className="h-[30px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]">
                <td className="px-3 text-[#3a75c4]">{c.name}</td><td className="px-2">{c.salesRep}</td><td className="px-2">{c.terms}</td><td className="px-2">{c.email}</td><td className="px-2 text-right">{n2(c.creditLimit ?? 0)}</td>
                <td className="px-3 text-right">{n2(invoices.filter((i) => i.customer === c.name && i.status === 'Open').reduce((t, i) => t + i.amount, 0))}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={6} className="h-14 text-center text-[#888]">No customers. Reset the demo data to load the sample customers.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ───────────── A/R invoices ───────────── */

export function InvoiceList({ go, overdue: initial }: { go: Go; overdue?: boolean }) {
  const invoices = useCollection<any>('netsuite.invoices')
  const [overdue, setOverdue] = useState(!!initial)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const isOver = (i: any) => i.status === 'Open' && +new Date(i.dueDate) < Date.now()
  const rows = invoices.filter((i) => (overdue ? isOver(i) : true))
  const accept = () => {
    const total = invoices.filter((i) => sel.has(i.id)).reduce((t, i) => t + i.amount, 0)
    sel.forEach((id) => db.update('netsuite.invoices', id, { status: 'Paid In Full', paidAt: new Date().toISOString() }))
    setMsg(`Customer payment recorded for ${sel.size} invoice(s) — $${n2(total)}.`)
    setSel(new Set())
  }
  const remind = () => {
    sel.forEach((id) => db.update('netsuite.invoices', id, { lastReminder: new Date().toISOString() }))
    setMsg(`Payment reminder emailed for ${sel.size} invoice(s).`)
    setSel(new Set())
  }
  return (
    <div>
      <PageHead kind={overdue ? 'Overdue Invoices' : 'Invoices'} title="Transactions › Sales › Invoices" go={go} list={{ v: 'invoices' }}>
        <Btn primary disabled={!sel.size} onClick={accept}>Accept Payment</Btn><Btn disabled={!sel.size} onClick={remind}>Send Reminder</Btn>
        <label className="ml-3 flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} className="accent-[#3a75c4]" /> Overdue only</label>
      </PageHead>
      {msg && <Banner ok onClose={() => setMsg(null)}>{msg}</Banner>}
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="w-8" /><th className="px-2 py-1.5">Date</th><th className="px-2">Number</th><th className="px-2">Customer</th><th className="px-2">Due Date</th><th className="px-2">Days Overdue</th><th className="px-2">Status</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((i) => {
              const days = Math.floor((Date.now() - +new Date(i.dueDate)) / 86400000)
              return (
                <tr key={i.id} onClick={() => i.status === 'Open' && setSel((s) => toggleIn(s, i.id))} className={`h-[30px] border-b border-[#f0f0f0] ${sel.has(i.id) ? 'bg-[#dfeafa]' : 'hover:bg-[#f5f8fc]'}`}>
                  <td className="text-center"><input type="checkbox" readOnly disabled={i.status !== 'Open'} checked={sel.has(i.id)} className="accent-[#3a75c4]" aria-label="Select" /></td>
                  <td className="px-2">{fd(i.date)}</td><td className="px-2 text-[#3a75c4]">{i.number}</td><td className="px-2">{i.customer}</td><td className="px-2">{fd(i.dueDate)}</td>
                  <td className={`px-2 ${isOver(i) ? 'text-[#c0392b] font-semibold' : ''}`}>{isOver(i) ? days : '—'}</td>
                  <td className="px-2">{i.status}{i.lastReminder ? <span className="text-[#888]"> · reminded {fd(i.lastReminder)}</span> : ''}</td><td className="px-3 text-right">{n2(i.amount)}</td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="h-14 text-center text-[#888]">No invoices to show.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ───────────── Purchase orders & vendor returns ───────────── */

function ApprovalList({ go, col, kind, title, pendingStatus, approvedStatus }: { go: Go; col: string; kind: string; title: string; pendingStatus: string; approvedStatus: string }) {
  const rows = useCollection<any>(col)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [all, setAll] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const list = rows.filter((r) => all || r.status === pendingStatus)
  const act = (status: string, verb: string) => {
    sel.forEach((id) => db.update(col, id, { status, decidedAt: new Date().toISOString(), decidedBy: 'Alex Morgan' }))
    setMsg(`${sel.size} ${kind.toLowerCase()}(s) ${verb}.`)
    setSel(new Set())
  }
  return (
    <div>
      <PageHead kind={title} title={`Transactions › Purchases › ${title}`} go={go}>
        <Btn primary disabled={!sel.size} onClick={() => act(approvedStatus, 'approved')}>Approve</Btn><Btn disabled={!sel.size} onClick={() => act('Rejected', 'rejected')}>Reject</Btn>
        <label className="ml-3 flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-[#3a75c4]" /> Show all statuses</label>
      </PageHead>
      {msg && <Banner ok onClose={() => setMsg(null)}>{msg}</Banner>}
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="w-8" /><th className="px-2 py-1.5">Date</th><th className="px-2">Number</th><th className="px-2">Vendor</th><th className="px-2">Memo</th>{col === 'netsuite.purchaseOrders' && <th className="px-2">Requestor</th>}<th className="px-2">Status</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} onClick={() => r.status === pendingStatus && setSel((s) => toggleIn(s, r.id))} className={`h-[30px] border-b border-[#f0f0f0] ${sel.has(r.id) ? 'bg-[#dfeafa]' : 'hover:bg-[#f5f8fc]'}`}>
                <td className="text-center"><input type="checkbox" readOnly disabled={r.status !== pendingStatus} checked={sel.has(r.id)} className="accent-[#3a75c4]" aria-label="Select" /></td>
                <td className="px-2">{fd(r.date)}</td><td className="px-2 text-[#3a75c4]">{r.number}</td><td className="px-2">{r.vendor}</td><td className="px-2">{r.memo}</td>{col === 'netsuite.purchaseOrders' && <td className="px-2">{r.requestor}</td>}<td className="px-2">{r.status}</td><td className="px-3 text-right">{n2(r.amount)}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="h-14 text-center text-[#888]">No {kind.toLowerCase()}s pending approval.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
export const PurchaseOrders = ({ go }: { go: Go }) => <ApprovalList go={go} col="netsuite.purchaseOrders" kind="Purchase order" title="Approve Purchase Orders" pendingStatus="Pending Supervisor Approval" approvedStatus="Pending Receipt" />
export const VendorReturns = ({ go }: { go: Go }) => <ApprovalList go={go} col="netsuite.vendorReturns" kind="Vendor return" title="Approve Vendor Returns" pendingStatus="Pending Approval" approvedStatus="Pending Return" />

/* ───────────── Tasks ───────────── */

export function Tasks({ go }: { go: Go }) {
  const tasks = useCollection<any>('netsuite.tasks')
  const [showDone, setShowDone] = useState(false)
  const [nt, setNt] = useState({ title: '', due: isoDate(new Date(Date.now() + 2 * 86400000)), priority: 'Medium' })
  const add = () => {
    if (!nt.title.trim()) return
    db.insert('netsuite.tasks', { id: uid('nst'), title: nt.title.trim(), due: new Date(nt.due + 'T12:00:00').toISOString(), priority: nt.priority, status: 'Not Started', assignedTo: 'Alex Morgan' }, { prepend: true })
    setNt({ ...nt, title: '' })
  }
  const rows = [...tasks].filter((t) => showDone || t.status !== 'Completed').sort((a, b) => +new Date(a.due) - +new Date(b.due))
  return (
    <div>
      <PageHead kind="Tasks" title="Activities › Scheduling › Tasks" go={go}>
        <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-[#3a75c4]" /> Show completed</label>
      </PageHead>
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="w-10 px-3 py-1.5">Done</th><th className="px-2">Title</th><th className="px-2">Due Date</th><th className="px-2">Priority</th><th className="px-2">Status</th><th className="px-2">Assigned To</th><th className="w-10" /></tr></thead>
          <tbody>
            <tr className="bg-[#fffbe6] border-b border-[#e4e4e4]">
              <td className="px-3"><Plus className="w-4 h-4 text-[#888]" /></td>
              <td className="px-2 py-1.5"><input className={inp} placeholder="New task title" value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="New task title" /></td>
              <td className="px-2"><input type="date" className={inp} value={nt.due} onChange={(e) => setNt({ ...nt, due: e.target.value })} aria-label="Due date" /></td>
              <td className="px-2"><select className={inp} value={nt.priority} onChange={(e) => setNt({ ...nt, priority: e.target.value })} aria-label="Priority"><option>High</option><option>Medium</option><option>Low</option></select></td>
              <td className="px-2" colSpan={3}><Btn onClick={add} disabled={!nt.title.trim()}>Add</Btn></td>
            </tr>
            {rows.map((t) => (
              <tr key={t.id} className={`h-[32px] border-b border-[#f0f0f0] ${t.status === 'Completed' ? 'text-[#999]' : ''}`}>
                <td className="px-3"><input type="checkbox" checked={t.status === 'Completed'} onChange={(e) => db.update('netsuite.tasks', t.id, { status: e.target.checked ? 'Completed' : 'Not Started' })} className="accent-[#3a75c4]" aria-label={`Complete ${t.title}`} /></td>
                <td className={`px-2 ${t.status === 'Completed' ? 'line-through' : ''}`}>{t.title}</td>
                <td className={`px-2 ${t.status !== 'Completed' && +new Date(t.due) < Date.now() ? 'text-[#c0392b] font-semibold' : ''}`}>{fd(t.due)}</td>
                <td className="px-2">{t.priority}</td>
                <td className="px-2"><select className={`${inp} !w-[130px]`} value={t.status} onChange={(e) => db.update('netsuite.tasks', t.id, { status: e.target.value })} aria-label="Status"><option>Not Started</option><option>In Progress</option><option>Completed</option></select></td>
                <td className="px-2">{t.assignedTo}</td>
                <td className="px-2"><button aria-label="Delete task" className="text-[#999] hover:text-[#c0392b]" onClick={() => db.remove('netsuite.tasks', t.id)}><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="h-14 text-center text-[#888]"><CheckCircle2 className="w-4 h-4 inline text-[#1e7b34]" /> No open tasks.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
