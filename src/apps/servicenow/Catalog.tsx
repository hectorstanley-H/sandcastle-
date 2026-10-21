import { useState } from 'react'
import { Search, ShoppingCart, CheckCircle2, Laptop, UserPlus, Monitor, Smartphone, FileText, FolderLock, Code2, ChevronRight } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person, PEOPLE } from '@/data/people'
import { fmtSN, inputCls, HWChip, FieldRow } from './shared'

export const CAT_ITEMS = [
  { id: 'cat-laptop', name: 'Standard Laptop', price: 1450, icon: Laptop, category: 'Hardware', short: 'Dell Latitude 7440 for general business use', delivery: '5 Days', spec: ['Intel Core Ultra 7 165U', '16 GB RAM, 512 GB SSD', '14" FHD+ display', 'Windows 11 Enterprise', '3-year ProSupport warranty'] },
  { id: 'cat-devlaptop', name: 'Developer Laptop', price: 2890, icon: Code2, category: 'Hardware', short: 'MacBook Pro 14" M4 Pro for engineering', delivery: '7 Days', spec: ['Apple M4 Pro, 24 GB RAM', '1 TB SSD', 'macOS Sequoia, Jamf-managed'] },
  { id: 'cat-onboarding', name: 'New Hire Onboarding', price: 0, icon: UserPlus, category: 'HR Services', short: 'Equipment, accounts and access for a new employee', delivery: '3 Days', spec: ['Laptop + peripherals', 'Okta, Microsoft 365, Slack accounts', 'Application access by role', 'Badge and desk assignment'] },
  { id: 'cat-monitor', name: 'Standard Monitor (27")', price: 329, icon: Monitor, category: 'Hardware', short: 'Dell P2725H 27" FHD monitor', delivery: '3 Days', spec: ['27" IPS, 1920×1080', 'USB-C hub'] },
  { id: 'cat-phone', name: 'Mobile phone', price: 799, icon: Smartphone, category: 'Hardware', short: 'iPhone 16 with corporate plan', delivery: '5 Days', spec: ['128 GB', 'Intune enrolled'] },
  { id: 'cat-acrobat', name: 'Adobe Acrobat Pro', price: 239.88, icon: FileText, category: 'Software', short: 'Annual named-user license', delivery: '1 Day', spec: ['Edit, sign and export PDFs'] },
  { id: 'cat-share', name: 'Access to shared drive', price: 0, icon: FolderLock, category: 'Access', short: 'Request access to a department share', delivery: '1 Day', spec: ['Approval by share owner'] },
]

const money = (n: number) => (n ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '$0.00')

export function CatalogHome({ onItem }: { onItem: (id: string) => void }) {
  const cats = ['Hardware', 'Software', 'HR Services', 'Access']
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F6F7F8]">
      <div className="px-8 pt-6 pb-10 max-w-[1300px]">
        <div className="text-[13px] text-[#5B616B] mb-1">Self-Service</div>
        <div className="flex items-center gap-4 mb-5">
          <h1 className="text-[24px] font-bold text-[#1B1D21]">Service Catalog</h1>
          <div className="relative ml-auto">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5B616B]" />
            <input placeholder="Search catalog" className="h-9 w-[320px] pl-8 pr-3 rounded-[4px] border border-[#8790A1] bg-white text-[14px] outline-none" />
          </div>
          <button className="h-9 px-3 rounded-[4px] border border-[#8790A1] bg-white text-[14px] font-bold flex items-center gap-1.5"><ShoppingCart size={15} /> Cart (0)</button>
        </div>
        {cats.map((c) => (
          <div key={c} className="mb-6">
            <div className="flex items-center gap-2 text-[16px] font-bold mb-2">{c} <span className="text-[13px] font-normal text-[#5B616B]">({CAT_ITEMS.filter((i) => i.category === c).length})</span></div>
            <div className="grid grid-cols-4 gap-4">
              {CAT_ITEMS.filter((i) => i.category === c).map((it) => (
                <button key={it.id} data-agent={`sn-cat-item-${it.id}`} onClick={() => onItem(it.id)} className="text-left bg-white rounded-[8px] border border-[#DADDE2] p-4 hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:border-[#8790A1] flex gap-3">
                  <span className="w-12 h-12 rounded-[8px] bg-[#E6F1F6] flex items-center justify-center text-[#032D42] shrink-0"><it.icon size={24} /></span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-[#1B1D21]">{it.name}</span>
                    <span className="block text-[13px] text-[#5B616B] mt-0.5 line-clamp-2">{it.short}</span>
                    <span className="block text-[13px] text-[#1B1D21] mt-1.5 font-bold">{it.price ? money(it.price) : 'No charge'}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CatalogItem({ itemId, onOrdered, onBack }: { itemId: string; onOrdered: (reqId: string) => void; onBack: () => void }) {
  const { isAgent } = useDesk()
  const it = CAT_ITEMS.find((i) => i.id === itemId) ?? CAT_ITEMS[0]
  const reqs = useCollection<any>('servicenow.requests')
  const [vars, setVars] = useState<Record<string, string>>({ requested_for: ME.name, os: 'Windows 11 Enterprise', location: 'Boston - 1 Federal St', equipment: 'Standard Laptop', department: 'Operations' })
  const [sw, setSw] = useState<Set<string>>(new Set(['Microsoft 365', 'Slack']))
  const [qty, setQty] = useState('1')
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setVars((x) => ({ ...x, [k]: v }))
  const onboarding = it.id === 'cat-onboarding'
  const order = () => {
    if (onboarding && (!vars.new_hire_name || !vars.start_date)) {
      setErr('The following mandatory fields are not filled in: New hire name, Start date')
      return
    }
    const max = Math.max(...reqs.map((r) => Number(String(r.number).slice(3))), 10231)
    const maxR = Math.max(...reqs.map((r) => Number(String(r.ritm).slice(4))), 10455)
    const id = `req-${Date.now().toString(36)}`
    const who = PEOPLE.find((p) => p.name === (onboarding ? vars.new_hire_name : vars.requested_for)) ?? ME
    db.insert('servicenow.requests', {
      id,
      number: `REQ00${max + 1}`,
      ritm: `RITM00${maxR + 1}`,
      item: it.name,
      itemId: it.id,
      requestedFor: who.id,
      openedBy: ME.id,
      date: new Date().toISOString(),
      state: 'Open',
      stage: 'Waiting for Approval',
      approval: 'Requested',
      price: it.price * Number(qty),
      quantity: Number(qty),
      variables: { ...vars, ...(onboarding ? { software: Array.from(sw).join(', ') } : {}) },
      createdBy: isAgent ? 'hworker' : undefined,
    }, { prepend: true })
    onOrdered(id)
  }
  const V = ({ k, label, req, type = 'text' }: { k: string; label: string; req?: boolean; type?: string }) => (
    <FieldRow label={label} required={req} mandatoryFilled={!!vars[k]}>
      <input data-agent={`sn-var-${k}`} aria-label={label} type={type} value={vars[k] ?? ''} onChange={(e) => set(k, e.target.value)} className={inputCls} />
    </FieldRow>
  )
  const S = ({ k, label, opts }: { k: string; label: string; opts: string[] }) => (
    <FieldRow label={label}>
      <select data-agent={`sn-var-${k}`} aria-label={label} value={vars[k] ?? ''} onChange={(e) => set(k, e.target.value)} className={inputCls}>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </FieldRow>
  )
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F6F7F8]">
      <div className="px-8 pt-5 pb-10 max-w-[1300px]">
        <div className="text-[13px] text-[#5B616B] mb-3 flex items-center gap-1">
          <button className="text-[#1F6FB2] hover:underline" onClick={onBack}>Service Catalog</button> <ChevronRight size={13} /> <span>{it.category}</span> <ChevronRight size={13} /> <span className="text-[#1B1D21]">{it.name}</span>
        </div>
        <div className="flex gap-6 items-start">
          <div className="flex-1 bg-white rounded-[8px] border border-[#DADDE2]">
            <div className="flex gap-5 p-6 border-b border-[#E4E7EB]">
              <span className="w-24 h-24 rounded-[10px] bg-[#E6F1F6] flex items-center justify-center text-[#032D42] shrink-0"><it.icon size={48} strokeWidth={1.4} /></span>
              <div>
                <h1 className="text-[22px] font-bold">{it.name}</h1>
                <div className="text-[14px] text-[#4A5059] mt-1">{it.short}</div>
                <ul className="mt-2 text-[13px] text-[#2E3238] list-disc pl-5 space-y-0.5">{it.spec.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
            {err && <div className="mx-6 mt-4 px-3 py-2 rounded bg-[#FBE9E9] text-[#A52A2A] text-[14px]">{err}</div>}
            <div className="p-6 pr-2">
              {onboarding ? (
                <>
                  {V({ k: "new_hire_name", label: "New hire name", req: true })}
                  {V({ k: "start_date", label: "Start date", req: true, type: "date" })}
                  {V({ k: "title", label: "Job title" })}
                  {S({ k: "department", label: "Department", opts: ['Operations', 'Finance', 'Sales', 'Engineering', 'People', 'IT', 'Marketing', 'Customer Success'] })}
                  {V({ k: "manager", label: "Manager" })}
                  {S({ k: "location", label: "Location", opts: ['Boston - 1 Federal St', 'New York - 5th Ave', 'Chicago - Wacker Dr', 'Austin - Congress Ave', 'San Francisco - Market St', 'Remote'] })}
                  {S({ k: "equipment", label: "Equipment", opts: ['Standard Laptop', 'Developer Laptop'] })}
                  <FieldRow label="Application access">
                    <div className="grid grid-cols-3 gap-y-1.5 pt-1.5">
                      {['Microsoft 365', 'Slack', 'Salesforce', 'Workday', 'SAP S/4HANA', 'Coupa', 'Jira', 'Confluence', 'Zendesk', 'ServiceNow', 'Power BI', 'Concur'].map((s) => (
                        <label key={s} className="flex items-center gap-2 text-[14px]">
                          <input type="checkbox" data-agent={`sn-var-sw-${s.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} checked={sw.has(s)} onChange={() => setSw((x) => { const n = new Set(x); if (n.has(s)) n.delete(s); else n.add(s); return n })} className="w-4 h-4 accent-[#032D42]" />
                          {s}
                        </label>
                      ))}
                    </div>
                  </FieldRow>
                  <FieldRow label="Additional notes"><textarea data-agent="sn-var-notes" aria-label="Additional notes" value={vars.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${inputCls} h-auto py-1.5`} /></FieldRow>
                </>
              ) : (
                <>
                  {V({ k: "requested_for", label: "Requested for", req: true })}
                  {it.category === 'Hardware' && S({ k: "os", label: "Operating system", opts: it.id === 'cat-devlaptop' ? ['macOS Sequoia'] : ['Windows 11 Enterprise', 'Windows 11 Enterprise (Engineering image)'] })}
                  {S({ k: "location", label: "Delivery location", opts: ['Boston - 1 Federal St', 'New York - 5th Ave', 'Chicago - Wacker Dr', 'Austin - Congress Ave', 'San Francisco - Market St', 'Ship to home'] })}
                  <FieldRow label="Business justification"><textarea data-agent="sn-var-justification" aria-label="Business justification" value={vars.justification ?? ''} onChange={(e) => set('justification', e.target.value)} rows={3} className={`${inputCls} h-auto py-1.5`} /></FieldRow>
                </>
              )}
            </div>
          </div>
          <div className="w-[300px] shrink-0 bg-white rounded-[8px] border border-[#DADDE2] p-5 sticky top-0">
            <div className="text-[16px] font-bold mb-3">Order this Item</div>
            <div className="flex justify-between text-[14px] py-1.5"><span className="text-[#4A5059]">Price</span><span className="font-bold">{money(it.price)}</span></div>
            <div className="flex justify-between items-center text-[14px] py-1.5">
              <span className="text-[#4A5059]">Quantity</span>
              <select data-agent="sn-var-quantity" value={qty} onChange={(e) => setQty(e.target.value)} className="h-8 px-2 rounded-[4px] border border-[#8790A1]">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
            </div>
            <div className="flex justify-between text-[14px] py-1.5"><span className="text-[#4A5059]">Delivery time</span><span>{it.delivery}</span></div>
            <div className="flex justify-between text-[14px] py-1.5 border-t border-[#E4E7EB] mt-2 pt-3"><span className="text-[#4A5059]">Total</span><span className="font-bold">{money(it.price * Number(qty))}</span></div>
            <button data-agent="sn-order-now" onClick={order} className="mt-4 w-full h-10 rounded-[4px] bg-[#032D42] hover:bg-[#0B3F59] text-white text-[15px] font-bold">Order Now</button>
            <button className="mt-2 w-full h-10 rounded-[4px] border border-[#8790A1] text-[15px] font-bold hover:bg-[#F1F3F5]">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OrderStatus({ requestId, onRequests }: { requestId: string; onRequests: () => void }) {
  const r = useRecord<any>('servicenow.requests', requestId)
  if (!r) return <div className="flex-1 p-8 text-[#5B616B]">Request not found</div>
  const stages = ['Waiting for Approval', 'Fulfillment', 'Delivery', 'Completed']
  const si = Math.max(0, stages.indexOf(r.stage))
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F6F7F8]">
      <div className="px-8 pt-6 pb-10 max-w-[1200px]">
        <h1 className="text-[22px] font-bold mb-4">Order Status</h1>
        <div className="bg-white rounded-[8px] border border-[#DADDE2] p-6 mb-5">
          <div className="flex items-center gap-3 text-[#2E8540]">
            <CheckCircle2 size={28} />
            <div className="text-[18px] font-bold text-[#1B1D21]">Thank you, your request has been submitted</div>
            {r.createdBy === 'hworker' && <HWChip />}
          </div>
          <div className="grid grid-cols-3 gap-6 mt-5 text-[14px]">
            <div><div className="text-[#5B616B]">Order Placed</div><div className="font-bold">{fmtSN(r.date)}</div></div>
            <div><div className="text-[#5B616B]">Request Number</div><button onClick={onRequests} className="font-bold text-[#1F6FB2] hover:underline" data-agent="sn-order-number">{r.number}</button></div>
            <div><div className="text-[#5B616B]">Estimated Delivery</div><div className="font-bold">{new Date(+new Date(r.date) + 5 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
          </div>
        </div>
        <div className="bg-white rounded-[8px] border border-[#DADDE2] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead><tr className="bg-[#F6F7F8] text-left border-b border-[#DADDE2]">{['Number', 'Description', 'Requested for', 'Stage', 'Price', 'Quantity', 'Total'].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
            <tbody>
              <tr className="flash-new">
                <td className="px-4 py-3 text-[#1F6FB2]">{r.ritm}</td>
                <td className="px-4">{r.item}{r.variables?.new_hire_name ? ` — ${r.variables.new_hire_name}` : ''}</td>
                <td className="px-4">{r.variables?.new_hire_name ?? person(r.requestedFor).name}</td>
                <td className="px-4">
                  <div className="flex items-center gap-1">
                    {stages.map((s, i) => <span key={s} title={s} className={`w-3 h-3 rounded-full ${i < si ? 'bg-[#2E8540]' : i === si ? 'bg-[#F2A100]' : 'bg-[#DADDE2]'}`} />)}
                    <span className="ml-2 text-[13px]">{r.stage}</span>
                  </div>
                </td>
                <td className="px-4">{money(r.price / (r.quantity || 1))}</td>
                <td className="px-4">{r.quantity}</td>
                <td className="px-4 font-bold">{money(r.price)}</td>
              </tr>
            </tbody>
          </table>
          {r.variables && Object.keys(r.variables).length > 0 && (
            <div className="border-t border-[#DADDE2] px-4 py-3 grid grid-cols-3 gap-x-6 gap-y-1.5 text-[13px]">
              {Object.entries(r.variables).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><span className="text-[#5B616B] capitalize">{k.replace(/_/g, ' ')}: </span>{String(v)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function RequestList({ onOpen }: { onOpen: (id: string) => void }) {
  const reqs = useCollection<any>('servicenow.requests')
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="h-[52px] shrink-0 flex items-center px-4 border-b border-[#DADDE2] bg-[#F6F7F8] text-[18px] font-bold">Requests</div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[14px]">
          <thead><tr className="border-b-2 border-[#C5CAD3] text-left h-10">{['Number', 'Item', 'Requested for', 'Opened', 'Stage', 'Approval', 'Price'].map((h) => <th key={h} className="px-3 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {[...reqs].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map((r, i) => (
              <tr key={r.id} className={`h-[38px] border-b border-[#E4E7EB] ${i % 2 ? 'bg-[#FAFBFB]' : ''}`}>
                <td className="px-3"><button data-agent={`sn-req-${r.id}`} onClick={() => onOpen(r.id)} className="text-[#1F6FB2] hover:underline">{r.number}</button></td>
                <td className="px-3">{r.item}{r.variables?.new_hire_name ? ` — ${r.variables.new_hire_name}` : ''}</td>
                <td className="px-3">{r.variables?.new_hire_name ?? person(r.requestedFor).name}</td>
                <td className="px-3 text-[13px]">{fmtSN(r.date)}</td>
                <td className="px-3">{r.stage}</td>
                <td className="px-3">{r.approval}</td>
                <td className="px-3">{money(r.price)} {r.createdBy === 'hworker' && <HWChip small />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
