import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Filter, Pencil, Pin, RefreshCw, Search, Settings, Table2 } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { STAGES, STAGE_PROB, forecastFor } from '@/db/seeds/sales'
import { Btn, HWChip, Link, OBJ, ObjIcon, alias, inputCls, labelCls, sfDate, usd, useNav } from './ui'
import { Modal } from './record'

type Col = { key: string; label: string; render?: (r: any) => ReactNode; sort?: (r: any) => any; w?: number }

export function ListView({ object }: { object: string }) {
  const { go } = useNav()
  const accounts = useCollection<any>('salesforce.accounts')
  const contacts = useCollection<any>('salesforce.contacts')
  const opps = useCollection<any>('salesforce.opportunities')
  const leads = useCollection<any>('salesforce.leads')
  const tasks = useCollection<any>('salesforce.tasks')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [newOpen, setNewOpen] = useState(false)
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''
  const open = (obj: string, id: string) => go({ page: 'record', object: obj, id })

  const cfg: Record<string, { rows: any[]; cols: Col[]; view: string; buttons: string[] }> = {
    Opportunity: {
      rows: opps,
      view: 'All Opportunities',
      buttons: ['New', 'Import', 'Assign Label'],
      cols: [
        { key: 'name', label: 'Opportunity Name', render: (r) => <span className="flex items-center gap-1.5"><Link agent={`sf-list-row-${r.id}`} label={r.name} onClick={() => open('Opportunity', r.id)}>{r.name}</Link>{(r.updatedBy === 'hworker' || r.createdBy === 'hworker') && <HWChip />}</span>, w: 300 },
        { key: 'accountId', label: 'Account Name', render: (r) => <Link onClick={() => open('Account', r.accountId)}>{accName(r.accountId)}</Link>, sort: (r) => accName(r.accountId) },
        { key: 'amount', label: 'Amount', render: (r) => usd(r.amount) },
        { key: 'closeDate', label: 'Close Date', render: (r) => sfDate(r.closeDate) },
        { key: 'stage', label: 'Stage' },
        { key: 'ownerId', label: 'Opportunity Owner Alias', render: (r) => alias(r.ownerId) },
      ],
    },
    Account: {
      rows: accounts,
      view: 'All Accounts',
      buttons: ['New', 'Import', 'Assign Label'],
      cols: [
        { key: 'name', label: 'Account Name', render: (r) => <Link agent={`sf-list-row-${r.id}`} onClick={() => open('Account', r.id)}>{r.name}</Link>, w: 260 },
        { key: 'city', label: 'Billing City' },
        { key: 'phone', label: 'Phone' },
        { key: 'type', label: 'Type' },
        { key: 'industry', label: 'Industry' },
        { key: 'ownerId', label: 'Account Owner Alias', render: (r) => alias(r.ownerId) },
      ],
    },
    Contact: {
      rows: contacts,
      view: 'All Contacts',
      buttons: ['New', 'Import', 'Add to Campaign', 'Send List Email'],
      cols: [
        { key: 'name', label: 'Name', render: (r) => <Link agent={`sf-list-row-${r.id}`} onClick={() => open('Contact', r.id)}>{r.name}</Link>, w: 220 },
        { key: 'accountId', label: 'Account Name', render: (r) => <Link onClick={() => open('Account', r.accountId)}>{accName(r.accountId)}</Link>, sort: (r) => accName(r.accountId) },
        { key: 'title', label: 'Title' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email', render: (r) => <Link>{r.email}</Link> },
        { key: 'ownerId', label: 'Contact Owner Alias', render: (r) => alias(r.ownerId) },
      ],
    },
    Lead: {
      rows: leads,
      view: 'All Open Leads',
      buttons: ['New', 'Import', 'Add to Campaign', 'Change Owner'],
      cols: [
        { key: 'name', label: 'Name', render: (r) => <Link agent={`sf-list-row-${r.id}`} onClick={() => open('Lead', r.id)}>{r.name}</Link>, w: 200 },
        { key: 'title', label: 'Title' },
        { key: 'company', label: 'Company' },
        { key: 'state', label: 'State/Province' },
        { key: 'email', label: 'Email', render: (r) => <Link>{r.email}</Link> },
        { key: 'status', label: 'Lead Status' },
        { key: 'createdDate', label: 'Created Date', render: (r) => sfDate(r.createdDate) },
        { key: 'ownerId', label: 'Owner Alias', render: (r) => alias(r.ownerId) },
      ],
    },
    Task: {
      rows: tasks,
      view: 'Open Tasks',
      buttons: ['New Task'],
      cols: [
        { key: 'subject', label: 'Subject', render: (r) => <span className="flex items-center gap-1.5"><Link>{r.subject}</Link>{r.createdBy === 'hworker' && <HWChip />}</span>, w: 320 },
        { key: 'whatId', label: 'Related To', render: (r) => <Link onClick={() => r.whatId && open('Opportunity', r.whatId)}>{opps.find((o) => o.id === r.whatId)?.name ?? ''}</Link> },
        { key: 'dueDate', label: 'Due Date', render: (r) => <span className={r.status !== 'Completed' && new Date(r.dueDate + 'T23:59') < new Date() ? 'text-[#BA0517]' : ''}>{sfDate(r.dueDate)}</span> },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'ownerId', label: 'Assigned Alias', render: (r) => alias(r.ownerId) },
      ],
    },
    Campaign: {
      rows: [
        ['AI-Powered Operations Summit 2026', 'Webinar', 'Completed', 452, 216, 38_000],
        ['OpsWorld Chicago', 'Trade Show', 'Completed', 310, 0, 64_000],
        ['Q4 Manufacturing ABM', 'Email', 'In Progress', 1_840, 0, 22_000],
        ['Customer Advisory Board', 'Conference', 'Planned', 40, 0, 45_000],
        ['Renewal Accelerator FY27', 'Email', 'In Progress', 120, 0, 5_000],
        ['EMEA Roadshow — Milan', 'Seminar / Conference', 'Planned', 180, 0, 31_000],
        ['Partner Webinar: Ops + ERP', 'Webinar', 'Planned', 0, 0, 8_000],
      ].map(([name, type, status, sent, resp, cost], i) => ({ id: `701Hs0000${i}`, name, type, status, sent, resp, cost, start: sfDate(new Date(Date.now() - (30 - i * 9) * 86400000).toISOString()) })),
      view: 'All Active Campaigns',
      buttons: ['New'],
      cols: [
        { key: 'name', label: 'Campaign Name', render: (r) => <Link>{r.name}</Link>, w: 300 },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'start', label: 'Start Date' },
        { key: 'sent', label: 'Num Sent', render: (r) => Number(r.sent).toLocaleString() },
        { key: 'cost', label: 'Actual Cost', render: (r) => usd(r.cost) },
      ],
    },
  }
  const c = cfg[object] ?? cfg.Opportunity
  const rows = useMemo(() => {
    let l = c.rows
    if (q) l = l.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
    const col = c.cols.find((x) => x.key === sort.key) ?? c.cols[0]
    const val = col.sort ?? ((r: any) => r[col.key])
    return [...l].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.dir
    })
  }, [c, q, sort])
  const sortCol = c.cols.find((x) => x.key === sort.key) ?? c.cols[0]

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[4px] border border-[#C9C9C9]" style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }}>
        <div className="px-4 pt-3 pb-3 bg-[#F3F3F3] rounded-t-[4px] border-b border-[#C9C9C9]">
          <div className="flex items-start gap-3">
            <ObjIcon type={object} size={32} />
            <div className="flex-1">
              <div className="text-[13px] leading-tight">{OBJ[object]?.plural}</div>
              <button className="flex items-center gap-1.5 text-[18px] font-bold leading-tight" data-agent="sf-list-view-picker">
                {c.view} <ChevronDown size={16} /> <Pin size={14} className="text-[#747474] ml-1" />
              </button>
            </div>
            <div className="inline-flex">
              {c.buttons.map((b, i) => (
                <button key={b} data-agent={`sf-list-${b.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => b === 'New' && object === 'Opportunity' && setNewOpen(true)} className={`h-8 px-4 border border-[#C9C9C9] bg-white text-[13px] text-[#0176D3] hover:bg-[#F3F3F3] ${i ? '-ml-px' : 'rounded-l-[4px]'} ${i === c.buttons.length - 1 ? 'rounded-r-[4px]' : ''}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 text-[12px] text-[#444]">
              {rows.length}
              {rows.length > 49 ? '+' : ''} items • Sorted by {sortCol.label} • Filtered by {c.view.replace(/^All /, 'All ').toLowerCase()} - {object === 'Lead' ? 'Lead Status' : 'Record Type'} • Updated a few seconds ago
            </div>
            <div className="flex items-center h-8 w-[220px] border border-[#C9C9C9] rounded-[4px] bg-white px-2 gap-1.5">
              <Search size={14} className="text-[#747474]" />
              <input data-agent="sf-list-search" aria-label="Search this list" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this list..." className="flex-1 outline-none text-[13px] bg-transparent" />
            </div>
            {[Settings, Table2, RefreshCw, Pencil, Filter].map((I, i) => (
              <button key={i} className="w-8 h-8 border border-[#C9C9C9] rounded-[4px] bg-white flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]">
                <I size={14} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0 bg-[#F3F3F3] z-10">
              <tr className="h-8 text-left">
                <th className="w-8 border-b border-[#C9C9C9]" />
                <th className="w-8 border-b border-[#C9C9C9]">
                  <input type="checkbox" className="ml-2" />
                </th>
                {c.cols.map((col) => (
                  <th key={col.key} style={{ width: col.w }} className="border-b border-l border-[#C9C9C9] font-normal text-[#444] px-2 hover:bg-white cursor-pointer whitespace-nowrap" onClick={() => setSort((s) => ({ key: col.key, dir: s.key === col.key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sort.key === col.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </span>
                  </th>
                ))}
                <th className="w-10 border-b border-l border-[#C9C9C9]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`h-8 hover:bg-[#F3F3F3] ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                  <td className="text-center text-[12px] text-[#444] border-b border-[#E5E5E5]">{i + 1}</td>
                  <td className="border-b border-[#E5E5E5]">
                    <input type="checkbox" className="ml-2" />
                  </td>
                  {c.cols.map((col) => (
                    <td key={col.key} className="px-2 border-b border-[#E5E5E5] truncate max-w-[320px]">
                      {col.render ? col.render(r) : r[col.key]}
                    </td>
                  ))}
                  <td className="border-b border-[#E5E5E5]">
                    <button className="w-6 h-6 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474] mx-auto">
                      <ChevronDown size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {newOpen && <NewOpportunityModal onClose={() => setNewOpen(false)} />}
    </div>
  )
}

export function NewOpportunityModal({ onClose, accountId }: { onClose: () => void; accountId?: string }) {
  const { isAgent } = useDesk()
  const { go } = useNav()
  const accounts = useCollection<any>('salesforce.accounts')
  const [f, setF] = useState<any>({ name: '', accountId: accountId ?? accounts[0]?.id, closeDate: '', stage: 'Prospecting', amount: '', type: 'New Business', leadSource: 'Web', nextStep: '', description: '' })
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const save = () => {
    const id = uid('006Hs')
    db.insert('salesforce.opportunities', {
      id,
      ...f,
      amount: Number(String(f.amount).replace(/[^0-9.]/g, '')) || 0,
      closeDate: f.closeDate || new Date().toISOString().slice(0, 10),
      probability: STAGE_PROB[f.stage],
      forecastCategory: forecastFor(f.stage),
      ownerId: ME.id,
      seats: null,
      pricePerSeat: null,
      contractTerm: 12,
      contractStart: '',
      competitor: 'None',
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      products: [],
      contactRoles: [],
      quotes: [],
      files: [],
      stageHistory: [{ stage: f.stage, date: new Date().toISOString(), by: 'alex', hw: isAgent }],
      createdBy: isAgent ? 'hworker' : undefined,
    })
    onClose()
    go({ page: 'record', object: 'Opportunity', id })
  }
  const L = (t: string, req?: boolean) => (
    <label className={labelCls}>
      {req && <abbr className="text-[#BA0517] no-underline mr-0.5">*</abbr>}
      {t}
    </label>
  )
  return (
    <Modal
      title="New Opportunity"
      agent="sf-new-opp-modal"
      width={860}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn>Save &amp; New</Btn>
          <Btn variant="brand" agent="sf-new-opp-save" onClick={save}>
            Save
          </Btn>
        </>
      }
    >
      <div className="px-6 py-4">
        <div className="text-right text-[12px] text-[#444] mb-2">
          <abbr className="text-[#BA0517] no-underline">*</abbr> = Required Information
        </div>
        <div className="h-8 px-3 rounded bg-[#F3F3F3] flex items-center text-[14px] mb-3">Opportunity Information</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-2">
          <div>
            {L('Opportunity Owner')}
            <div className="flex items-center gap-2 h-8 text-[13px]">{person(ME.id).name}</div>
          </div>
          <div>
            {L('Amount')}
            <input data-agent="sf-new-opp-amount" aria-label="Amount" value={f.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} />
          </div>
          <div>
            {L('Opportunity Name', true)}
            <input data-agent="sf-new-opp-name" aria-label="Opportunity Name" value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </div>
          <div>
            {L('Close Date', true)}
            <input data-agent="sf-new-opp-close" aria-label="Close Date" type="date" value={f.closeDate} onChange={(e) => set('closeDate', e.target.value)} className={inputCls} />
          </div>
          <div>
            {L('Account Name')}
            <select data-agent="sf-new-opp-account" aria-label="Account Name" value={f.accountId} onChange={(e) => set('accountId', e.target.value)} className={inputCls}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            {L('Stage', true)}
            <select data-agent="sf-new-opp-stage" aria-label="Stage" value={f.stage} onChange={(e) => set('stage', e.target.value)} className={inputCls}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            {L('Type')}
            <select value={f.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>
              {['New Business', 'Existing Business - Upgrade', 'Existing Business - Renewal'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            {L('Probability (%)')}
            <input readOnly value={STAGE_PROB[f.stage]} className={inputCls} />
          </div>
          <div>
            {L('Lead Source')}
            <select value={f.leadSource} onChange={(e) => set('leadSource', e.target.value)} className={inputCls}>
              {['Web', 'Webinar', 'Trade Show', 'Partner Referral', 'Outbound', 'Existing Customer'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            {L('Next Step')}
            <input value={f.nextStep} onChange={(e) => set('nextStep', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="h-8 px-3 rounded bg-[#F3F3F3] flex items-center text-[14px] my-3">Description Information</div>
        <div className="px-2">
          {L('Description')}
          <textarea value={f.description} onChange={(e) => set('description', e.target.value)} rows={3} className={`${inputCls} h-auto py-1.5`} />
        </div>
      </div>
    </Modal>
  )
}
