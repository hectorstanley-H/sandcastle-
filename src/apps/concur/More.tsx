/** Reports library, delegates, profile settings, App Center and help dialogs. */
import { useState } from 'react'
import { Search, Plus, Trash2, ChevronRight } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { ME, PEOPLE } from '@/data/people'
import { $, d, Btn, Field, inputCls, Status, HW, Modal, Banner, PageTitle, Tabs, initials } from './ui'

/* ─────────────── Reports Library ─────────────── */

export function ReportsLibrary({ openReport }: { openReport: (id: string) => void }) {
  const reports = useCollection<any>('concur.reports')
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'date' | 'amount' | 'name'>('date')
  const match: Record<string, (r: any) => boolean> = {
    all: () => true,
    active: (r) => r.status === 'Not Submitted' || r.status === 'Sent Back',
    submitted: (r) => r.status === 'Submitted & Pending Approval',
    approved: (r) => r.status === 'Approved' || r.status === 'Paid',
  }
  const rows = reports
    .filter(match[tab])
    .filter((r) => !q || `${r.name} ${r.number} ${r.purpose}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === 'amount' ? b.total - a.total : sort === 'name' ? a.name.localeCompare(b.name) : +new Date(b.reportDate) - +new Date(a.reportDate)))
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <PageTitle>Reports Library</PageTitle>
      <div className="bg-white rounded-lg border border-[#d9d9d9]">
        <div className="px-5 flex items-end gap-3">
          <div className="flex-1"><Tabs prefix="concur-lib-tab" value={tab} onChange={setTab} tabs={[['all', 'All Reports'], ['active', 'Not Submitted'], ['submitted', 'Pending Approval'], ['approved', 'Approved & Paid']]} /></div>
          <select aria-label="Sort by" data-agent="concur-lib-sort" className={`${inputCls} w-[160px] mb-1.5`} value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="date">Newest first</option><option value="amount">Highest amount</option><option value="name">Name A–Z</option></select>
          <div className="relative w-[260px] mb-1.5">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6a6d70]" />
            <input aria-label="Search reports" data-agent="concur-lib-search" className={`${inputCls} pl-9`} placeholder="Search reports" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <table className="w-full text-[14px] text-[#32363a]">
          <thead><tr className="h-10 text-left text-[13px] text-[#6a6d70] border-y border-[#e5e5e5]"><th className="pl-5 font-semibold">Report Name</th><th className="px-2 font-semibold">Report Number</th><th className="px-2 font-semibold">Report Date</th><th className="px-2 font-semibold">Submitted</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="h-20 text-center text-[#6a6d70]">No reports match.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} data-agent={`concur-lib-row-${r.id}`} onClick={() => openReport(r.id)} className="h-12 border-b border-[#eeeeee] hover:bg-[#f7f7f7] cursor-pointer">
                <td className="pl-5 font-semibold text-[#0a6ed1]"><span className="inline-flex items-center gap-2">{r.name}{r.createdBy === 'hworker' && <HW />}</span></td>
                <td className="px-2">{r.number}</td><td className="px-2">{d(r.reportDate)}</td><td className="px-2">{r.submittedAt ? d(r.submittedAt) : '—'}</td>
                <td className="px-2"><Status s={r.status} /></td><td className="px-2 pr-5 text-right font-semibold">{$(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="h-11 px-5 flex items-center justify-end text-[13px] text-[#6a6d70] border-t border-[#e5e5e5]">{rows.length} report{rows.length === 1 ? '' : 's'} · {$(rows.reduce((s, r) => s + r.total, 0))}</div>
      </div>
    </div>
  )
}

/* ─────────────── Expense Delegates ─────────────── */

const PERMS: [string, string][] = [['canPrepare', 'Can Prepare'], ['canSubmit', 'Can Submit'], ['canViewReceipts', 'Can View Receipts'], ['canApprove', 'Can Approve']]

export function Delegates() {
  const rows = useCollection<any>('concur.delegates')
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const candidates = q.trim().length >= 2 ? PEOPLE.filter((p) => !p.external && p.id !== ME.id && p.name.toLowerCase().includes(q.toLowerCase()) && !rows.some((r) => r.personId === p.id)).slice(0, 5) : []
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <PageTitle right={<Btn primary data-agent="concur-del-add" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Delegate</Btn>}>Expense Delegates</PageTitle>
      <div className="text-[14px] text-[#6a6d70] mb-4 max-w-[760px]">Delegates can prepare expense reports on your behalf. Permissions are saved as soon as you change them.</div>
      {note && <Banner onClose={() => setNote(null)}>{note}</Banner>}
      <div className="bg-white rounded-lg border border-[#d9d9d9]">
        <table className="w-full text-[14px]">
          <thead><tr className="h-10 text-left text-[13px] text-[#6a6d70] border-b border-[#e5e5e5]"><th className="pl-5 font-semibold">Delegate</th>{PERMS.map(([, l]) => <th key={l} className="px-2 font-semibold text-center">{l}</th>)}<th className="w-14" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="h-20 text-center text-[#6a6d70]">You have no delegates.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} data-agent={`concur-del-row-${r.personId}`} className="h-14 border-b border-[#eeeeee]">
                <td className="pl-5"><div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-[#ebf5fe] text-[#0a6ed1] text-[12px] font-semibold flex items-center justify-center">{initials(r.name)}</span><div><div className="font-semibold">{r.name}</div><div className="text-[12px] text-[#6a6d70]">{r.email}</div></div></div></td>
                {PERMS.map(([k, l]) => <td key={k} className="text-center"><input type="checkbox" aria-label={`${r.name} ${l}`} checked={!!r[k]} onChange={(e) => db.update('concur.delegates', r.id, { [k]: e.target.checked })} className="w-4 h-4 accent-[#0a6ed1]" /></td>)}
                <td className="text-center"><button aria-label={`Remove ${r.name}`} data-agent={`concur-del-remove-${r.personId}`} onClick={() => { db.remove('concur.delegates', r.id); setNote(`${r.name} removed as a delegate.`) }} className="w-8 h-8 rounded hover:bg-[#f2f2f2] inline-flex items-center justify-center text-[#6a6d70]"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && (
        <Modal title="Add Delegate" width={520} onClose={() => setAdding(false)} footer={<Btn onClick={() => setAdding(false)}>Cancel</Btn>}>
          <div className="p-6">
            <Field label="Search employees"><input data-agent="concur-del-search" aria-label="Search employees" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 characters" autoFocus /></Field>
            <div className="mt-3">
              {candidates.map((p) => (
                <button key={p.id} data-agent={`concur-del-opt-${p.id}`} onClick={() => { db.insert('concur.delegates', { id: uid('cdl'), personId: p.id, name: p.name, email: p.email, canPrepare: true, canSubmit: false, canViewReceipts: true, canApprove: false }); setAdding(false); setQ(''); setNote(`${p.name} added as a delegate.`) }} className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-[#ebf5fe] text-left">
                  <span className="w-8 h-8 rounded-full bg-[#ebf5fe] text-[#0a6ed1] text-[12px] font-semibold flex items-center justify-center">{initials(p.name)}</span>
                  <div className="flex-1"><div className="text-[14px]">{p.name}</div><div className="text-[12px] text-[#6a6d70]">{p.title} · {p.dept}</div></div>
                  <ChevronRight className="w-4 h-4 text-[#6a6d70]" />
                </button>
              ))}
              {q.trim().length >= 2 && candidates.length === 0 && <div className="text-[13px] text-[#6a6d70] py-2">No matching employees.</div>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─────────────── Profile Settings ─────────────── */

export function ProfileSettings() {
  const s = useRecord<any>('concur.settings', 'me')
  const [f, setF] = useState<any>(() => s ?? { defaultPayment: 'American Express Corporate', notifyApprover: true, notifyStatus: true, notifyReceipts: true, homeAirport: 'BOS — Boston Logan', seat: 'Aisle', mileageVehicle: '' })
  const [saved, setSaved] = useState(false)
  const set = (k: string, v: any) => { setF((x: any) => ({ ...x, [k]: v })); setSaved(false) }
  const save = () => {
    if (s) db.update('concur.settings', 'me', f)
    else db.insert('concur.settings', { ...f, id: 'me' })
    setSaved(true)
  }
  const toggles: [string, string][] = [['notifyApprover', 'Email me when a report is approved or sent back'], ['notifyStatus', 'Email me when reports are paid'], ['notifyReceipts', 'Email me when new e-receipts or card charges arrive']]
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <PageTitle right={<Btn primary data-agent="concur-profile-save" onClick={save}>Save</Btn>}>Profile Settings</PageTitle>
      {saved && <Banner onClose={() => setSaved(false)}>Your profile settings were saved.</Banner>}
      <div className="grid grid-cols-2 gap-6 max-w-[1100px]">
        <div className="bg-white rounded-lg border border-[#d9d9d9] p-5 space-y-4">
          <div className="text-[16px] font-semibold">Personal Information</div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><input readOnly className={inputCls} value={ME.name} /></Field>
            <Field label="Employee ID"><input readOnly className={inputCls} value={ME.employeeId} /></Field>
            <Field label="Email"><input readOnly className={inputCls} value={ME.email} /></Field>
            <Field label="Title"><input readOnly className={inputCls} value={ME.title} /></Field>
            <Field label="Expense Approver"><input readOnly className={inputCls} value="Priya Raman" /></Field>
            <Field label="Cost Center"><input readOnly className={inputCls} value="10101301 — Ops Boston" /></Field>
          </div>
          <div className="text-[12px] text-[#6a6d70]">Personal information is synced from Workday and can’t be edited here.</div>
        </div>
        <div className="bg-white rounded-lg border border-[#d9d9d9] p-5 space-y-4">
          <div className="text-[16px] font-semibold">Expense Preferences</div>
          <Field label="Default payment type for new expenses"><select aria-label="Default payment type" className={inputCls} value={f.defaultPayment} onChange={(e) => set('defaultPayment', e.target.value)}><option>American Express Corporate</option><option>Cash</option><option>Personal Card</option></select></Field>
          <Field label="Mileage vehicle"><input aria-label="Mileage vehicle" className={inputCls} value={f.mileageVehicle ?? ''} onChange={(e) => set('mileageVehicle', e.target.value)} /></Field>
          {toggles.map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-[14px]"><input type="checkbox" data-agent={`concur-pref-${k}`} checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="w-4 h-4 accent-[#0a6ed1]" /> {l}</label>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-[#d9d9d9] p-5 space-y-4">
          <div className="text-[16px] font-semibold">Travel Preferences</div>
          <Field label="Home airport"><input aria-label="Home airport" className={inputCls} value={f.homeAirport ?? ''} onChange={(e) => set('homeAirport', e.target.value)} /></Field>
          <Field label="Seat preference"><select aria-label="Seat preference" className={inputCls} value={f.seat ?? 'Aisle'} onChange={(e) => set('seat', e.target.value)}><option>Aisle</option><option>Window</option><option>No preference</option></select></Field>
        </div>
        <div className="bg-white rounded-lg border border-[#d9d9d9] p-5 space-y-2 text-[14px]">
          <div className="text-[16px] font-semibold mb-2">Corporate Card</div>
          <div>American Express Corporate ••••1007</div>
          <div className="text-[#6a6d70]">Card feed active · e-receipts enabled</div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── App Center ─────────────── */

const APPS = [
  { id: 'uber', name: 'Uber for Business', cat: 'Ground Transportation', desc: 'Business rides and Uber Eats receipts flow straight into Concur as e-receipts.', color: '#000000' },
  { id: 'lyft', name: 'Lyft', cat: 'Ground Transportation', desc: 'Send Lyft business-profile ride receipts to Concur automatically.', color: '#ff00bf' },
  { id: 'tripit', name: 'TripIt', cat: 'Itinerary', desc: 'Keep all your travel plans in one itinerary, synced with Concur Travel.', color: '#1e6fd9' },
  { id: 'marriott', name: 'Marriott Bonvoy', cat: 'Hotel', desc: 'Get folio e-receipts from Marriott properties after checkout.', color: '#8b1e3f' },
  { id: 'hertz', name: 'Hertz', cat: 'Car Rental', desc: 'Rental agreement e-receipts delivered to Available Expenses.', color: '#ffd100' },
  { id: 'expenseit', name: 'ExpenseIt', cat: 'Receipts', desc: 'Snap a photo of a receipt and let ExpenseIt create the expense.', color: '#0a6ed1' },
  { id: 'amtrak', name: 'Amtrak', cat: 'Rail', desc: 'Amtrak e-tickets appear as e-receipts in Concur.', color: '#005f86' },
  { id: 'airbnb', name: 'Airbnb for Work', cat: 'Lodging', desc: 'Business stays sync as itemized lodging e-receipts.', color: '#ff5a5f' },
]

export function AppCenter() {
  const s = useRecord<any>('concur.settings', 'appcenter')
  const connected: string[] = s?.connected ?? []
  const [cat, setCat] = useState('all')
  const [note, setNote] = useState<string | null>(null)
  const toggle = (a: (typeof APPS)[number]) => {
    const on = connected.includes(a.id)
    const next = on ? connected.filter((x) => x !== a.id) : [...connected, a.id]
    if (s) db.update('concur.settings', 'appcenter', { connected: next })
    else db.insert('concur.settings', { id: 'appcenter', connected: next })
    setNote(on ? `${a.name} disconnected.` : `${a.name} connected. New receipts will appear in Available Expenses.`)
  }
  const cats = ['all', ...new Set(APPS.map((a) => a.cat))]
  const list = APPS.filter((a) => cat === 'all' || (cat === 'connected' ? connected.includes(a.id) : a.cat === cat))
  return (
    <div className="flex-1 overflow-auto px-10 py-6">
      <PageTitle>App Center</PageTitle>
      {note && <Banner onClose={() => setNote(null)}>{note}</Banner>}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[...cats, 'connected'].map((c) => (
          <button key={c} data-agent={`concur-appc-cat-${c.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => setCat(c)} className={`h-8 px-3 rounded-full text-[13px] border ${cat === c ? 'bg-[#0a6ed1] border-[#0a6ed1] text-white' : 'bg-white border-[#d9d9d9] text-[#32363a] hover:bg-[#ebf5fe]'}`}>
            {c === 'all' ? 'All Apps' : c === 'connected' ? `My Apps (${connected.length})` : c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {list.map((a) => {
          const on = connected.includes(a.id)
          return (
            <div key={a.id} className="bg-white rounded-lg border border-[#d9d9d9] p-4 flex flex-col">
              <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-[14px] font-bold" style={{ background: a.color, color: a.id === 'hertz' ? '#000' : '#fff' }}>{a.name[0]}</span><div><div className="text-[14px] font-semibold">{a.name}</div><div className="text-[12px] text-[#6a6d70]">{a.cat}</div></div></div>
              <div className="text-[13px] text-[#32363a] mt-3 flex-1">{a.desc}</div>
              <div className="flex items-center mt-4">{on && <Status s="Connected" />}<div className="flex-1" /><Btn primary={!on} data-agent={`concur-appc-${a.id}`} onClick={() => toggle(a)}>{on ? 'Disconnect' : 'Connect'}</Btn></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────── Help & policy ─────────────── */

const FAQ: [string, string][] = [
  ['How do I add a card transaction to a report?', 'Open the report, select Add Expense and pick the transactions from Available Expenses. Corporate card charges arrive with e-receipts already attached.'],
  ['How do I itemize a hotel bill?', 'Open the hotel expense, enter check-in and check-out dates, then use the Itemizations tab — Itemize Nightly splits the room rate across each night.'],
  ['Can I change a report after submitting it?', 'Yes, while it is still pending approval: open the report and select Recall. Make your changes and submit again.'],
  ['Who approves my reports?', 'Your manager (Priya Raman) approves first, then Northwind Expense Processing audits the report before payment.'],
  ['When will I be reimbursed?', 'Out-of-pocket amounts are paid by direct deposit within 5 business days of audit approval. Corporate card charges are paid directly to American Express.'],
]

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <Modal title="SAP Concur Help" width={680} onClose={onClose} agent="concur-help-dialog" footer={<Btn primary onClick={onClose}>Close</Btn>}>
      <div className="p-6">
        {FAQ.map(([q, a], i) => (
          <div key={q} className="border-b border-[#eeeeee]">
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full text-left py-3 text-[14px] font-semibold text-[#0a6ed1] flex items-center gap-2"><ChevronRight className={`w-4 h-4 transition-transform ${open === i ? 'rotate-90' : ''}`} />{q}</button>
            {open === i && <div className="pb-3 pl-6 text-[14px] text-[#32363a]">{a}</div>}
          </div>
        ))}
        <div className="mt-4 text-[13px] text-[#6a6d70]">Need more help? Contact the Northwind Travel & Expense desk at t&e@northwind.com.</div>
      </div>
    </Modal>
  )
}

export function PolicyDialog({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['Hotel', 'Up to $325.00 per night (room + tax); must be itemized'],
    ['Individual Meals', 'Up to $75.00 per day while traveling'],
    ['Business Meals', 'All attendees must be listed; alcohol limited to 2 drinks per person'],
    ['Airfare', 'Economy for flights under 6 hours; book 14+ days ahead'],
    ['Car Rental', 'Intermediate class or smaller, up to $90.00 per day'],
    ['Personal Car Mileage', '$0.70 per mile (IRS 2026 rate)'],
    ['Receipts', 'Required for every expense over $25.00'],
  ]
  return (
    <Modal title="Northwind US Travel & Expense Policy" width={680} onClose={onClose} agent="concur-policy-dialog" footer={<Btn primary onClick={onClose}>Close</Btn>}>
      <table className="w-full text-[14px] m-0">
        <tbody>
          {rows.map(([k, v]) => <tr key={k} className="border-b border-[#eeeeee]"><td className="px-6 py-3 font-semibold w-[200px] align-top">{k}</td><td className="px-6 py-3">{v}</td></tr>)}
        </tbody>
      </table>
    </Modal>
  )
}
