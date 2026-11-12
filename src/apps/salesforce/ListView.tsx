import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Filter, Pencil, Pin, RefreshCw, Search, Settings, Table2, Columns3, X } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { STAGES, STAGE_PROB, forecastFor } from '@/db/seeds/sales'
import { Btn, HWChip, Link, Menu, MenuButton, OBJ, ObjIcon, alias, inputCls, labelCls, sfDate, usd, useNav, type MenuItem } from './ui'
import { Modal } from './record'
import { COL, OWNERS, useActions } from './forms'

type Col = { key: string; label: string; render?: (r: any) => ReactNode; sort?: (r: any) => any; w?: number }
type EditSpec = { type: 'text' | 'number' | 'date' | 'select'; options?: string[] }

export const STATIC_CAMPAIGNS = [
  ['AI-Powered Operations Summit 2026', 'Webinar', 'Completed', 452, 216, 38_000],
  ['OpsWorld Chicago', 'Trade Show', 'Completed', 310, 0, 64_000],
  ['Q4 Manufacturing ABM', 'Email', 'In Progress', 1_840, 0, 22_000],
  ['Customer Advisory Board', 'Conference', 'Planned', 40, 0, 45_000],
  ['Renewal Accelerator FY27', 'Email', 'In Progress', 120, 0, 5_000],
  ['EMEA Roadshow — Milan', 'Seminar / Conference', 'Planned', 180, 0, 31_000],
  ['Partner Webinar: Ops + ERP', 'Webinar', 'Planned', 0, 0, 8_000],
].map(([name, type, status, sent, resp, cost], i) => ({ id: `701Hs0000${i}`, name, type, status, sent, resp, cost, start: sfDate(new Date(Date.now() - (30 - i * 9) * 86400000).toISOString()) }))

const inQuarter = (d?: string) => {
  if (!d) return false
  const now = new Date()
  const qs = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const qe = new Date(qs.getFullYear(), qs.getMonth() + 3, 0, 23, 59)
  const x = new Date(d + 'T12:00')
  return x >= qs && x <= qe
}
const todayIso = () => new Date().toISOString().slice(0, 10)

const VIEWS: Record<string, [string, (r: any) => boolean][]> = {
  Opportunity: [
    ['All Opportunities', () => true],
    ['My Opportunities', (r) => r.ownerId === ME.id],
    ['Open Opportunities', (r) => !r.stage?.startsWith('Closed')],
    ['Closing This Quarter', (r) => !r.stage?.startsWith('Closed') && inQuarter(r.closeDate)],
    ['Won Opportunities', (r) => r.stage === 'Closed Won'],
    ['Lost Opportunities', (r) => r.stage === 'Closed Lost'],
  ],
  Account: [
    ['All Accounts', () => true],
    ['My Accounts', (r) => r.ownerId === ME.id],
    ['Customers', (r) => String(r.type).startsWith('Customer')],
    ['Prospects', (r) => r.type === 'Prospect'],
  ],
  Contact: [
    ['All Contacts', () => true],
    ['My Contacts', (r) => r.ownerId === ME.id],
  ],
  Lead: [
    ['All Open Leads', () => true],
    ['My Leads', (r) => r.ownerId === ME.id],
    ['Open Leads', (r) => !String(r.status).startsWith('Closed')],
    ['Converted Leads', (r) => r.status === 'Closed - Converted'],
    ['Today’s Leads', (r) => String(r.createdDate).slice(0, 10) === todayIso()],
  ],
  Task: [
    ['Open Tasks', () => true],
    ['My Tasks', (r) => r.ownerId === ME.id],
    ['Overdue Tasks', (r) => r.status !== 'Completed' && r.dueDate < todayIso()],
    ['Today’s Tasks', (r) => r.dueDate === todayIso()],
    ['Completed Tasks', (r) => r.status === 'Completed'],
  ],
  Campaign: [
    ['All Active Campaigns', () => true],
    ['In Progress', (r) => r.status === 'In Progress'],
    ['Planned', (r) => r.status === 'Planned'],
    ['Completed Campaigns', (r) => r.status === 'Completed'],
  ],
  Case: [
    ['All Open Cases', (r) => r.status !== 'Closed'],
    ['My Cases', (r) => r.ownerId === ME.id],
    ['All Cases', () => true],
    ['Closed Cases', (r) => r.status === 'Closed'],
  ],
}

const EDITABLE: Record<string, Record<string, EditSpec>> = {
  Opportunity: { amount: { type: 'number' }, closeDate: { type: 'date' }, stage: { type: 'select', options: STAGES } },
  Account: { phone: { type: 'text' }, type: { type: 'select', options: ['Prospect', 'Customer - Direct', 'Customer - Channel', 'Partner'] }, industry: { type: 'text' }, city: { type: 'text' } },
  Contact: { title: { type: 'text' }, phone: { type: 'text' }, email: { type: 'text' } },
  Lead: { title: { type: 'text' }, company: { type: 'text' }, state: { type: 'text' }, status: { type: 'select', options: ['Open - Not Contacted', 'Working - Contacted', 'Closed - Converted', 'Closed - Not Converted'] } },
  Task: { dueDate: { type: 'date' }, status: { type: 'select', options: ['Not Started', 'In Progress', 'Completed', 'Waiting on someone else', 'Deferred'] }, priority: { type: 'select', options: ['High', 'Normal', 'Low'] } },
  Case: { status: { type: 'select', options: ['New', 'Working', 'Escalated', 'Closed'] }, priority: { type: 'select', options: ['High', 'Medium', 'Low'] } },
}

type Flt = { key: string; op: 'equals' | 'not equal to' | 'contains' | 'greater than' | 'less than'; value: string }

export function ListView({ object }: { object: string }) {
  const { go } = useNav()
  const { open: openApp } = useDesk()
  const { run, toast } = useActions()
  const { isAgent } = useDesk()
  const accounts = useCollection<any>('salesforce.accounts')
  const contacts = useCollection<any>('salesforce.contacts')
  const opps = useCollection<any>('salesforce.opportunities')
  const leads = useCollection<any>('salesforce.leads')
  const tasks = useCollection<any>('salesforce.tasks')
  const cases = useCollection<any>('salesforce.cases')
  const dbCampaigns = useCollection<any>('salesforce.campaigns')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [newOpen, setNewOpen] = useState(false)
  const [viewIdx, setViewIdx] = useState(0)
  const [viewNames, setViewNames] = useState<Record<number, string>>({})
  const [viewMenu, setViewMenu] = useState(false)
  const [display, setDisplay] = useState<'table' | 'kanban'>('table')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Flt[]>([])
  const [ownerScope, setOwnerScope] = useState<'all' | 'mine'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [refreshedAt, setRefreshedAt] = useState(Date.now())
  const [spin, setSpin] = useState(false)
  const [modal, setModal] = useState<null | 'import' | 'label' | 'campaign' | 'email' | 'fields' | 'rename' | { campaign: any }>(null)
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''
  const open = (obj: string, id: string) => go({ page: 'record', object: obj, id })
  const mail = (email: string) => openApp('outlook', { compose: { to: [email] } })
  const labels = (r: any) => (r.labels?.length ? r.labels.map((l: string) => <span key={l} className="ml-1 inline-flex h-[18px] items-center px-1.5 rounded bg-[#EEF4FF] text-[11px] text-[#014486]">{l}</span>) : null)

  const cfg: Record<string, { rows: any[]; cols: Col[]; view: string; buttons: string[] }> = {
    Opportunity: {
      rows: opps,
      view: 'All Opportunities',
      buttons: ['New', 'Import', 'Assign Label'],
      cols: [
        { key: 'name', label: 'Opportunity Name', render: (r) => <span className="flex items-center gap-1.5"><Link agent={`sf-list-row-${r.id}`} label={r.name} onClick={() => open('Opportunity', r.id)}>{r.name}</Link>{(r.updatedBy === 'hworker' || r.createdBy === 'hworker') && <HWChip />}{labels(r)}</span>, w: 300 },
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
        { key: 'name', label: 'Account Name', render: (r) => <span className="flex items-center"><Link agent={`sf-list-row-${r.id}`} onClick={() => open('Account', r.id)}>{r.name}</Link>{labels(r)}</span>, w: 260 },
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
        { key: 'email', label: 'Email', render: (r) => <Link onClick={() => r.email && mail(r.email)}>{r.email}</Link> },
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
        { key: 'email', label: 'Email', render: (r) => <Link onClick={() => r.email && mail(r.email)}>{r.email}</Link> },
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
        { key: 'subject', label: 'Subject', render: (r) => <span className="flex items-center gap-1.5"><Link onClick={() => run({ kind: 'edit', object: 'Task', id: r.id })}>{r.subject}</Link>{r.createdBy === 'hworker' && <HWChip />}</span>, w: 320 },
        { key: 'whatId', label: 'Related To', render: (r) => <Link onClick={() => r.whatId && open(opps.some((o) => o.id === r.whatId) ? 'Opportunity' : 'Account', r.whatId)}>{opps.find((o) => o.id === r.whatId)?.name ?? accName(r.whatId)}</Link> },
        { key: 'dueDate', label: 'Due Date', render: (r) => <span className={r.status !== 'Completed' && new Date(r.dueDate + 'T23:59') < new Date() ? 'text-[#BA0517]' : ''}>{sfDate(r.dueDate)}</span> },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'ownerId', label: 'Assigned Alias', render: (r) => alias(r.ownerId) },
      ],
    },
    Campaign: {
      rows: [...STATIC_CAMPAIGNS, ...dbCampaigns.map((c) => ({ ...c, start: sfDate(c.startDate) }))],
      view: 'All Active Campaigns',
      buttons: ['New'],
      cols: [
        { key: 'name', label: 'Campaign Name', render: (r) => <span className="flex items-center gap-1.5"><Link onClick={() => setModal({ campaign: r })}>{r.name}</Link>{r.createdBy === 'hworker' && <HWChip />}</span>, w: 300 },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'start', label: 'Start Date' },
        { key: 'sent', label: 'Num Sent', render: (r) => Number(r.sent).toLocaleString() },
        { key: 'cost', label: 'Actual Cost', render: (r) => usd(r.cost) },
      ],
    },
    Case: {
      rows: cases,
      view: 'All Open Cases',
      buttons: ['New', 'Change Owner'],
      cols: [
        { key: 'caseNumber', label: 'Case Number', render: (r) => <Link agent={`sf-list-row-${r.id}`} onClick={() => open('Case', r.id)}>{r.caseNumber}</Link>, w: 120 },
        { key: 'subject', label: 'Subject', render: (r) => <Link onClick={() => open('Case', r.id)}>{r.subject}</Link>, w: 280 },
        { key: 'accountId', label: 'Account Name', render: (r) => <Link onClick={() => r.accountId && open('Account', r.accountId)}>{accName(r.accountId)}</Link>, sort: (r) => accName(r.accountId) },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'createdDate', label: 'Date/Time Opened', render: (r) => sfDate(r.createdDate) },
        { key: 'ownerId', label: 'Case Owner Alias', render: (r) => alias(r.ownerId) },
      ],
    },
  }
  const c = cfg[object] ?? cfg.Opportunity
  const views = VIEWS[object] ?? [[c.view, () => true]]
  const viewName = viewNames[viewIdx] ?? views[viewIdx]?.[0] ?? c.view
  const cols = c.cols.filter((x, i) => i === 0 || !hidden.has(x.key))
  const ownerKey = c.rows[0] && 'ownerId' in c.rows[0] ? 'ownerId' : null
  const sortKey = c.cols.some((x) => x.key === sort.key) ? sort.key : c.cols[0].key

  const rows = useMemo(() => {
    let l = c.rows.filter(views[viewIdx]?.[1] ?? (() => true))
    if (ownerScope === 'mine' && ownerKey) l = l.filter((r) => r.ownerId === ME.id)
    for (const f of filters) {
      const col = c.cols.find((x) => x.key === f.key)
      const get = col?.sort ?? ((r: any) => r[f.key])
      l = l.filter((r) => {
        const v = get(r)
        const s = String(v ?? '').toLowerCase()
        const t = f.value.toLowerCase()
        const n = Number(String(f.value).replace(/[^0-9.-]/g, ''))
        switch (f.op) {
          case 'equals':
            return s === t
          case 'not equal to':
            return s !== t
          case 'contains':
            return s.includes(t)
          case 'greater than':
            return typeof v === 'number' ? v > n : s > t
          case 'less than':
            return typeof v === 'number' ? v < n : s < t
        }
      })
    }
    if (q) l = l.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
    const col = c.cols.find((x) => x.key === sortKey) ?? c.cols[0]
    const val = col.sort ?? ((r: any) => r[col.key])
    return [...l].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.dir
    })
  }, [c, q, sort, viewIdx, filters, ownerScope])
  const sortCol = c.cols.find((x) => x.key === sortKey) ?? c.cols[0]
  const editable = EDITABLE[object] ?? {}
  const selIds = [...selected].filter((id) => rows.some((r) => r.id === id))
  const dirty = Object.keys(drafts).length

  const needSel = (fn: () => void) => () => (selIds.length ? fn() : toast('Select at least one record and try again.'))
  const onButton = (b: string) => {
    if (b === 'New') return object === 'Opportunity' ? setNewOpen(true) : run({ kind: 'new', object, stay: object === 'Campaign' })
    if (b === 'New Task') return run({ kind: 'new', object: 'Task', stay: true })
    if (b === 'Import') return setModal('import')
    if (b === 'Assign Label') return needSel(() => setModal('label'))()
    if (b === 'Add to Campaign') return needSel(() => setModal('campaign'))()
    if (b === 'Send List Email') return needSel(() => setModal('email'))()
    if (b === 'Change Owner') return needSel(() => run({ kind: 'owner', object, ids: selIds }))()
  }

  const saveDrafts = () => {
    const hw = isAgent ? 'hworker' : undefined
    for (const [id, patch] of Object.entries(drafts)) {
      const p: any = { ...patch, lastModified: new Date().toISOString(), updatedBy: hw }
      if ('amount' in p) p.amount = Number(String(p.amount).replace(/[^0-9.]/g, '')) || 0
      if (object === 'Opportunity' && 'stage' in p) {
        const r = db.find<any>('salesforce.opportunities', id)
        if (r && r.stage !== p.stage) Object.assign(p, { probability: STAGE_PROB[p.stage], forecastCategory: forecastFor(p.stage), stageHistory: [...(r.stageHistory ?? []), { stage: p.stage, date: new Date().toISOString(), by: 'alex', hw: isAgent }] })
      }
      db.update(COL[object], id, p)
    }
    toast(`${dirty} record${dirty === 1 ? ' was' : 's were'} saved.`)
    setDrafts({})
    setEditMode(false)
  }

  const rowMenu = (r: any): MenuItem[] => {
    const items: MenuItem[] = []
    if (object === 'Campaign') return [{ label: 'View', onClick: () => setModal({ campaign: r }) }, ...(r.id.startsWith('701Hs0000') ? [] : [{ label: 'Delete', onClick: () => run({ kind: 'delete', object, id: r.id, name: r.name }) }])]
    items.push({ label: 'Edit', onClick: () => run({ kind: 'edit', object, id: r.id }) })
    if (object === 'Task' && r.status !== 'Completed') items.push({ label: 'Mark Complete', onClick: () => db.update('salesforce.tasks', r.id, { status: 'Completed' }) })
    items.push({ label: 'Delete', onClick: () => run({ kind: 'delete', object, id: r.id, name: r.name ?? r.subject ?? r.caseNumber }) })
    if (ownerKey) items.push({ label: 'Change Owner', onClick: () => run({ kind: 'owner', object, ids: [r.id] }) })
    if (['Opportunity', 'Account', 'Contact', 'Lead'].includes(object)) items.push({ label: 'Clone', onClick: () => run({ kind: 'clone', object, id: r.id }) })
    return items
  }

  const cell = (r: any, col: Col) => {
    const spec = editable[col.key]
    if (editMode && spec) {
      const v = drafts[r.id]?.[col.key] ?? r[col.key] ?? ''
      const setV = (x: string) => setDrafts((d) => ({ ...d, [r.id]: { ...(d[r.id] ?? {}), [col.key]: x } }))
      const changed = drafts[r.id]?.[col.key] != null
      const cls = `w-full h-6 px-1 rounded-[3px] border text-[12.5px] outline-none ${changed ? 'border-[#FE9339] bg-[#FAFFBD]' : 'border-[#C9C9C9] bg-white'}`
      return spec.type === 'select' ? (
        <select value={v} onChange={(e) => setV(e.target.value)} className={cls} aria-label={col.label}>
          {spec.options!.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input value={v} type={spec.type === 'date' ? 'date' : 'text'} onChange={(e) => setV(e.target.value)} className={cls} aria-label={col.label} />
      )
    }
    return (
      <span className="group/cell flex items-center gap-1 min-w-0">
        <span className="truncate flex-1 min-w-0">{col.render ? col.render(r) : r[col.key]}</span>
        {spec && (
          <button aria-label={`Edit ${col.label}`} onClick={() => setEditMode(true)} className="opacity-0 group-hover/cell:opacity-100 text-[#747474] shrink-0">
            <Pencil size={11} />
          </button>
        )}
      </span>
    )
  }

  const ago = Math.round((Date.now() - refreshedAt) / 60000)

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[4px] border border-[#C9C9C9]" style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }}>
        <div className="px-4 pt-3 pb-3 bg-[#F3F3F3] rounded-t-[4px] border-b border-[#C9C9C9]">
          <div className="flex items-start gap-3">
            <ObjIcon type={object} size={32} />
            <div className="flex-1 relative">
              <div className="text-[13px] leading-tight">{OBJ[object]?.plural}</div>
              <button className="flex items-center gap-1.5 text-[18px] font-bold leading-tight" data-agent="sf-list-view-picker" onClick={() => setViewMenu(!viewMenu)}>
                {viewName} <ChevronDown size={16} /> <Pin size={14} className="text-[#747474] ml-1" />
              </button>
              {viewMenu && (
                <Menu
                  className="left-0 top-12"
                  width={280}
                  onClose={() => setViewMenu(false)}
                  items={[
                    { label: 'List Views', header: true },
                    ...views.map(([n], i) => ({
                      label: viewNames[i] ?? n,
                      checked: i === viewIdx,
                      agent: `sf-listview-${object.toLowerCase()}-${i}`,
                      onClick: () => {
                        setViewIdx(i)
                        setSelected(new Set())
                      },
                    })),
                  ]}
                />
              )}
            </div>
            <div className="inline-flex">
              {c.buttons.map((b, i) => (
                <button key={b} data-agent={`sf-list-${b.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => onButton(b)} className={`h-8 px-4 border border-[#C9C9C9] bg-white text-[13px] text-[#0176D3] hover:bg-[#F3F3F3] ${i ? '-ml-px' : 'rounded-l-[4px]'} ${i === c.buttons.length - 1 ? 'rounded-r-[4px]' : ''}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 text-[12px] text-[#444]">
              {rows.length}
              {rows.length > 49 ? '+' : ''} items • Sorted by {sortCol.label} • Filtered by {viewName.toLowerCase()}
              {filters.length ? ` and ${filters.length} more filter${filters.length > 1 ? 's' : ''}` : ''} - {object === 'Lead' ? 'Lead Status' : 'Record Type'} • Updated {ago < 1 ? 'a few seconds ago' : `${ago} minute${ago > 1 ? 's' : ''} ago`}
              {selIds.length > 0 && <span className="ml-1 font-bold">• {selIds.length} item{selIds.length > 1 ? 's' : ''} selected</span>}
            </div>
            <div className="flex items-center h-8 w-[220px] border border-[#C9C9C9] rounded-[4px] bg-white px-2 gap-1.5">
              <Search size={14} className="text-[#747474]" />
              <input data-agent="sf-list-search" aria-label="Search this list" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this list..." className="flex-1 outline-none text-[13px] bg-transparent" />
            </div>
            <MenuButton
              label="List View Controls"
              className="w-8 h-8 border border-[#C9C9C9] rounded-[4px] bg-white flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]"
              menuClass="right-0 top-9"
              items={[
                { label: 'List View Controls', header: true },
                { label: 'Rename', onClick: () => setModal('rename') },
                { label: 'Select Fields to Display', onClick: () => setModal('fields') },
                { label: 'Reset Column Widths', onClick: () => setHidden(new Set()) },
                { label: 'Clear Filters', onClick: () => { setFilters([]); setOwnerScope('all') } },
              ]}
            >
              <Settings size={14} />
            </MenuButton>
            <MenuButton
              label="Display as"
              className="w-8 h-8 border border-[#C9C9C9] rounded-[4px] bg-white flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]"
              menuClass="right-0 top-9"
              width={180}
              items={[{ label: 'Display as', header: true }, { label: 'Table', checked: display === 'table', onClick: () => setDisplay('table') }, ...(object === 'Opportunity' ? [{ label: 'Kanban', checked: display === 'kanban', agent: 'sf-list-display-kanban', onClick: () => setDisplay('kanban') }] : [])]}
            >
              {display === 'kanban' ? <Columns3 size={14} /> : <Table2 size={14} />}
            </MenuButton>
            <button
              aria-label="Refresh"
              onClick={() => {
                setSpin(true)
                setRefreshedAt(Date.now())
                setTimeout(() => setSpin(false), 700)
              }}
              className="w-8 h-8 border border-[#C9C9C9] rounded-[4px] bg-white flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]"
            >
              <RefreshCw size={14} className={spin ? 'animate-spin' : ''} />
            </button>
            <button aria-label="Edit List" disabled={!Object.keys(editable).length || display === 'kanban'} onClick={() => (editMode ? (setEditMode(false), setDrafts({})) : setEditMode(true))} className={`w-8 h-8 border rounded-[4px] flex items-center justify-center hover:bg-[#F3F3F3] disabled:opacity-40 ${editMode ? 'border-[#0176D3] bg-[#EEF4FF] text-[#0176D3]' : 'border-[#C9C9C9] bg-white text-[#747474]'}`}>
              <Pencil size={14} />
            </button>
            <button aria-label="Show filters" onClick={() => setFilterOpen(!filterOpen)} className={`w-8 h-8 border rounded-[4px] flex items-center justify-center hover:bg-[#F3F3F3] ${filterOpen || filters.length ? 'border-[#0176D3] bg-[#EEF4FF] text-[#0176D3]' : 'border-[#C9C9C9] bg-white text-[#747474]'}`}>
              <Filter size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-auto">
            {display === 'kanban' && object === 'Opportunity' ? (
              <Kanban rows={rows} accName={accName} open={(id) => open('Opportunity', id)} />
            ) : (
              <table className="w-full text-[13px] border-collapse">
                <thead className="sticky top-0 bg-[#F3F3F3] z-10">
                  <tr className="h-8 text-left">
                    <th className="w-8 border-b border-[#C9C9C9]" />
                    <th className="w-8 border-b border-[#C9C9C9]">
                      <input type="checkbox" aria-label="Select all" className="ml-2" checked={rows.length > 0 && selIds.length === rows.length} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                    </th>
                    {cols.map((col) => (
                      <th key={col.key} style={{ width: col.w }} className="border-b border-l border-[#C9C9C9] font-normal text-[#444] px-2 hover:bg-white cursor-pointer whitespace-nowrap" onClick={() => setSort((s) => ({ key: col.key, dir: s.key === col.key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </span>
                      </th>
                    ))}
                    <th className="w-10 border-b border-l border-[#C9C9C9]" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={`h-8 hover:bg-[#F3F3F3] ${selected.has(r.id) ? 'bg-[#EEF4FF]' : ''} ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                      <td className="text-center text-[12px] text-[#444] border-b border-[#E5E5E5]">{i + 1}</td>
                      <td className="border-b border-[#E5E5E5]">
                        <input
                          type="checkbox"
                          aria-label={`Select item ${i + 1}`}
                          className="ml-2"
                          checked={selected.has(r.id)}
                          onChange={() =>
                            setSelected((s) => {
                              const n = new Set(s)
                              if (n.has(r.id)) n.delete(r.id)
                              else n.add(r.id)
                              return n
                            })
                          }
                        />
                      </td>
                      {cols.map((col) => (
                        <td key={col.key} className="px-2 border-b border-[#E5E5E5] truncate max-w-[320px]">
                          {cell(r, col)}
                        </td>
                      ))}
                      <td className="border-b border-[#E5E5E5]">
                        <div className="flex justify-center">
                          <MenuButton label={`Show actions for ${r.name ?? r.subject ?? ''}`} className="w-6 h-6 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474] bg-white hover:bg-[#F3F3F3]" menuClass="right-0 top-7" width={160} items={() => rowMenu(r)}>
                            <ChevronDown size={11} />
                          </MenuButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={cols.length + 3} className="py-12 text-center text-[13px] text-[#444]">
                        No items to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {filterOpen && (
            <FilterPanel
              object={object}
              cols={c.cols}
              filters={filters}
              setFilters={setFilters}
              ownerScope={ownerScope}
              setOwnerScope={ownerKey ? setOwnerScope : undefined}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>
        {editMode && (
          <div className="h-12 shrink-0 border-t border-[#C9C9C9] bg-[#F3F3F3] flex items-center justify-center gap-2 rounded-b-[4px]">
            <span className="text-[12px] text-[#444] mr-2">{dirty ? `${dirty} item${dirty > 1 ? 's' : ''} changed` : 'Edit fields inline, then save.'}</span>
            <Btn onClick={() => { setDrafts({}); setEditMode(false) }}>Cancel</Btn>
            <Btn variant="brand" disabled={!dirty} onClick={saveDrafts}>Save</Btn>
          </div>
        )}
      </div>
      {newOpen && <NewOpportunityModal onClose={() => setNewOpen(false)} />}
      {modal === 'import' && <ImportModal object={object} onClose={() => setModal(null)} />}
      {modal === 'label' && <LabelModal object={object} ids={selIds} onClose={() => { setModal(null); setSelected(new Set()) }} />}
      {modal === 'campaign' && <AddToCampaignModal object={object} ids={selIds} onClose={() => { setModal(null); setSelected(new Set()) }} />}
      {modal === 'email' && <ListEmailModal ids={selIds} onClose={() => { setModal(null); setSelected(new Set()) }} />}
      {modal === 'fields' && <FieldsModal cols={c.cols} hidden={hidden} setHidden={setHidden} onClose={() => setModal(null)} />}
      {modal === 'rename' && <RenameModal current={viewName} onSave={(n) => setViewNames((x) => ({ ...x, [viewIdx]: n }))} onClose={() => setModal(null)} />}
      {modal && typeof modal === 'object' && <CampaignModal c={modal.campaign} onClose={() => setModal(null)} />}
    </div>
  )
}

/* ───────────── Kanban ───────────── */
function Kanban({ rows, accName, open }: { rows: any[]; accName: (id: string) => string; open: (id: string) => void }) {
  const { isAgent } = useDesk()
  const { toast } = useActions()
  const [over, setOver] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const move = (id: string, stage: string) => {
    const r = db.find<any>('salesforce.opportunities', id)
    if (!r || r.stage === stage) return
    db.update('salesforce.opportunities', id, (x) => ({ stage, probability: STAGE_PROB[stage], forecastCategory: forecastFor(stage), lastModified: new Date().toISOString(), stageHistory: [...(x.stageHistory ?? []), { stage, date: new Date().toISOString(), by: 'alex', hw: isAgent }], updatedBy: isAgent ? 'hworker' : undefined }))
    toast(`"${r.name}" moved to ${stage}.`)
  }
  return (
    <div className="flex gap-2 p-3 min-h-full items-start">
      {STAGES.map((s) => {
        const list = rows.filter((r) => r.stage === s)
        const total = list.reduce((t, r) => t + (r.amount || 0), 0)
        return (
          <div
            key={s}
            data-agent={`sf-kanban-col-${s.toLowerCase().replace(/[^a-z]+/g, '-')}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(s)
            }}
            onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              const id = dragId.current ?? e.dataTransfer.getData('text/plain')
              if (id) move(id, s)
            }}
            className={`w-[220px] shrink-0 rounded-[4px] border ${over === s ? 'border-[#1B96FF] bg-[#EEF4FF]' : 'border-[#E5E5E5] bg-[#F3F3F3]'}`}
          >
            <div className="px-2 py-2 border-b border-[#E5E5E5] bg-white rounded-t-[4px]">
              <div className="text-[13px] font-bold truncate">
                {s} ({list.length})
              </div>
              <div className="text-[12px] text-[#444]">{usd(total, false)}</div>
            </div>
            <div className="p-1.5 space-y-1.5 min-h-[120px]">
              {list.map((r) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={(e) => {
                    dragId.current = r.id
                    e.dataTransfer.setData('text/plain', r.id)
                  }}
                  onDragEnd={() => (dragId.current = null)}
                  className="bg-white rounded-[4px] border border-[#E5E5E5] p-2 text-[12px] cursor-grab hover:shadow"
                >
                  <Link className="text-[13px] font-bold block truncate" onClick={() => open(r.id)}>
                    {r.name}
                  </Link>
                  <div className="text-[#444] truncate">{accName(r.accountId)}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold">{usd(r.amount, false)}</span>
                    <span className="text-[#444]">{sfDate(r.closeDate)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[#444]">
                    <Avatar id={r.ownerId} size={16} /> {person(r.ownerId).name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────────── filter panel ───────────── */
function FilterPanel({ object, cols, filters, setFilters, ownerScope, setOwnerScope, onClose }: { object: string; cols: Col[]; filters: Flt[]; setFilters: (f: Flt[]) => void; ownerScope: 'all' | 'mine'; setOwnerScope?: (s: 'all' | 'mine') => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Flt>({ key: cols[0].key, op: 'contains', value: '' })
  return (
    <div className="w-[300px] shrink-0 border-l border-[#C9C9C9] bg-white flex flex-col" data-agent="sf-list-filter-panel">
      <div className="h-11 px-3 flex items-center border-b border-[#E5E5E5]">
        <span className="flex-1 text-[14px] font-bold">Filters</span>
        <button onClick={onClose} aria-label="Close filters" className="text-[#747474]">
          <X size={16} />
        </button>
      </div>
      <div className="p-3 space-y-3 overflow-auto text-[13px]">
        {setOwnerScope && (
          <div className="rounded border border-[#E5E5E5] p-2">
            <div className="text-[12px] text-[#444] mb-1">Filter by Owner</div>
            {(['all', 'mine'] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 py-0.5">
                <input type="radio" checked={ownerScope === s} onChange={() => setOwnerScope(s)} /> {s === 'all' ? `All ${OBJ[object]?.plural.toLowerCase()}` : `My ${OBJ[object]?.plural.toLowerCase()}`}
              </label>
            ))}
          </div>
        )}
        {filters.map((f, i) => (
          <div key={i} className="rounded border border-[#E5E5E5] p-2 flex items-start gap-2">
            <div className="flex-1">
              <div className="text-[12px] text-[#444]">{cols.find((c) => c.key === f.key)?.label}</div>
              <div>
                {f.op} <b>{f.value}</b>
              </div>
            </div>
            <button aria-label="Remove filter" onClick={() => setFilters(filters.filter((_, j) => j !== i))} className="text-[#747474]">
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="rounded border border-dashed border-[#C9C9C9] p-2 space-y-2">
          <div className="text-[12px] font-bold text-[#444]">New Filter</div>
          <select aria-label="Field" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} className={inputCls}>
            {cols.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select aria-label="Operator" value={draft.op} onChange={(e) => setDraft({ ...draft, op: e.target.value as Flt['op'] })} className={inputCls}>
            {['equals', 'not equal to', 'contains', 'greater than', 'less than'].map((o) => <option key={o}>{o}</option>)}
          </select>
          <input aria-label="Value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="Value" className={inputCls} />
          <Btn
            className="w-full"
            disabled={!draft.value.trim()}
            onClick={() => {
              setFilters([...filters, { ...draft, value: draft.value.trim() }])
              setDraft({ ...draft, value: '' })
            }}
          >
            Add Filter
          </Btn>
        </div>
        {(filters.length > 0 || ownerScope !== 'all') && (
          <Link onClick={() => { setFilters([]); setOwnerScope?.('all') }}>Remove All</Link>
        )}
      </div>
    </div>
  )
}

/* ───────────── list-level modals ───────────── */
const IMPORT_SAMPLE: Record<string, string> = {
  Lead: 'First Name,Last Name,Company,Title,Email\nGrace,Okafor,Bellows Logistics,Ops Director,grace.okafor@bellowslogistics.com\nTom,Lindqvist,Nordic Freight,COO,tom.lindqvist@nordicfreight.com',
  Contact: 'First Name,Last Name,Title,Email,Account\nRuth,Adeyemi,Plant Manager,ruth.adeyemi@fabrikam.com,Fabrikam, Inc.',
  Account: 'Account Name,Industry,City,Phone\nNordic Freight,Transportation,Oslo,(470) 555-0192',
  Opportunity: 'Opportunity Name,Amount,Close Date,Stage\nNordic Freight - Ops Cloud Pilot,48000,' + new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10) + ',Prospecting',
}

function ImportModal({ object, onClose }: { object: string; onClose: () => void }) {
  const { isAgent } = useDesk()
  const { toast } = useActions()
  const accounts = useCollection<any>('salesforce.accounts')
  const [text, setText] = useState(IMPORT_SAMPLE[object] ?? '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const header = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase())
  const recs = lines.slice(1).map((l) => {
    const parts = l.split(',')
    const o: Record<string, string> = {}
    header.forEach((h, i) => (o[h] = (i === header.length - 1 ? parts.slice(i).join(',') : parts[i] ?? '').trim()))
    return o
  })
  const doImport = () => {
    const hw = isAgent ? 'hworker' : undefined
    const now = new Date().toISOString()
    for (const r of recs) {
      const first = r['first name'] ?? ''
      const last = r['last name'] ?? ''
      if (object === 'Lead') db.insert('salesforce.leads', { id: uid('00QHs'), firstName: first, lastName: last, name: `${first} ${last}`.trim(), company: r.company ?? '', title: r.title ?? '', email: r.email ?? '', phone: r.phone ?? '', status: 'Open - Not Contacted', leadSource: 'Web', rating: '', industry: r.industry ?? '', city: r.city ?? '', state: r.state ?? '', ownerId: ME.id, employees: 0, description: '', createdDate: now, createdBy: hw })
      else if (object === 'Contact') db.insert('salesforce.contacts', { id: uid('003Hs'), accountId: accounts.find((a) => a.name.toLowerCase() === (r.account ?? '').toLowerCase())?.id ?? '', firstName: first, lastName: last, name: `${first} ${last}`.trim(), title: r.title ?? '', email: r.email ?? '', phone: r.phone ?? '', mobile: '', city: '', ownerId: ME.id, leadSource: '', createdDate: now, createdBy: hw })
      else if (object === 'Account') db.insert('salesforce.accounts', { id: uid('001Hs'), name: r['account name'] ?? r.name ?? 'New Account', type: 'Prospect', industry: r.industry ?? '', phone: r.phone ?? '', website: '', city: r.city ?? '', state: '', country: 'United States', employees: 0, annualRevenue: 0, ownerId: ME.id, rating: '', accountNumber: '', site: '', description: '', createdDate: now, createdBy: hw })
      else if (object === 'Opportunity') {
        const stage = STAGES.includes(r.stage) ? r.stage : 'Prospecting'
        db.insert('salesforce.opportunities', { id: uid('006Hs'), name: r['opportunity name'] ?? 'New Opportunity', accountId: accounts[0]?.id, amount: Number(r.amount) || 0, closeDate: r['close date'] || todayIso(), stage, probability: STAGE_PROB[stage], forecastCategory: forecastFor(stage), type: 'New Business', leadSource: 'Web', ownerId: ME.id, nextStep: '', description: '', seats: null, pricePerSeat: null, contractTerm: 12, contractStart: '', competitor: 'None', createdDate: now, lastModified: now, products: [], contactRoles: [], quotes: [], files: [], stageHistory: [{ stage, date: now, by: 'alex', hw: isAgent }], createdBy: hw })
      }
    }
    toast(`Import complete: ${recs.length} ${OBJ[object]?.plural.toLowerCase()} created.`)
    onClose()
  }
  return (
    <Modal title={`Import ${OBJ[object]?.plural}`} agent="sf-import-modal" width={720} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!recs.length} onClick={doImport}>Import {recs.length || ''}</Btn></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div className="flex gap-2 text-[12px]">
          {['Choose data', 'Edit mapping', 'Start import'].map((s, i) => (
            <span key={s} className={`flex-1 text-center py-1 rounded ${i === 0 ? 'bg-[#0176D3] text-white' : 'bg-[#F3F3F3] text-[#444]'}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
        <div>
          <label className={labelCls}>Paste CSV data (first row is the header)</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className={`${inputCls} h-auto py-2 font-mono text-[12px]`} />
        </div>
        <div className="text-[12px] text-[#444]">
          {recs.length} record{recs.length === 1 ? '' : 's'} detected · Columns mapped: {header.join(', ') || '—'}
        </div>
      </div>
    </Modal>
  )
}

function LabelModal({ object, ids, onClose }: { object: string; ids: string[]; onClose: () => void }) {
  const { toast } = useActions()
  const [label, setLabel] = useState('')
  const existing = [...new Set(db.get<any>(COL[object]).flatMap((r) => r.labels ?? []))] as string[]
  const apply = (l: string) => {
    for (const id of ids) db.update(COL[object], id, (r) => ({ labels: [...new Set([...(r.labels ?? []), l])] }))
    toast(`Label "${l}" was assigned to ${ids.length} record${ids.length > 1 ? 's' : ''}.`)
    onClose()
  }
  return (
    <Modal title="Assign Label" agent="sf-label-modal" width={480} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!label.trim()} onClick={() => apply(label.trim())}>Save</Btn></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div>
          <label className={labelCls}>Search or create a label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Q4 Push" className={inputCls} />
        </div>
        {existing.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {existing.map((l) => (
              <button key={l} onClick={() => apply(l)} className="h-6 px-2 rounded bg-[#EEF4FF] text-[12px] text-[#014486] hover:bg-[#D8E6FE]">
                {l}
              </button>
            ))}
          </div>
        )}
        <div className="text-[12px] text-[#444]">{ids.length} record(s) selected</div>
      </div>
    </Modal>
  )
}

function AddToCampaignModal({ object, ids, onClose }: { object: string; ids: string[]; onClose: () => void }) {
  const { toast } = useActions()
  const dbc = useCollection<any>('salesforce.campaigns')
  const all = [...STATIC_CAMPAIGNS, ...dbc]
  const [cid, setCid] = useState(all[0]?.id)
  const [status, setStatus] = useState('Sent')
  const save = () => {
    const camp = all.find((c) => c.id === cid)
    if (!camp) return
    for (const id of ids) db.update(COL[object], id, (r) => ({ campaigns: [...(r.campaigns ?? []).filter((x: any) => x.name !== camp.name), { name: camp.name, status, date: new Date().toISOString() }] }))
    if (dbc.some((c) => c.id === cid)) db.update('salesforce.campaigns', cid, (r) => ({ members: [...new Set([...(r.members ?? []), ...ids])] }))
    toast(`${ids.length} ${object === 'Lead' ? 'lead' : 'contact'}${ids.length > 1 ? 's were' : ' was'} added to "${camp.name}".`)
    onClose()
  }
  return (
    <Modal title="Add to Campaign" agent="sf-campaign-modal" width={520} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" onClick={save}>Submit</Btn></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div>
          <label className={labelCls}>Campaign</label>
          <select value={cid} onChange={(e) => setCid(e.target.value)} className={inputCls}>
            {all.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Member Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {['Sent', 'Responded', 'Registered', 'Attended'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="text-[12px] text-[#444]">{ids.length} record(s) selected</div>
      </div>
    </Modal>
  )
}

function ListEmailModal({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { isAgent } = useDesk()
  const { toast } = useActions()
  const contacts = useCollection<any>('salesforce.contacts').filter((c) => ids.includes(c.id))
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState(`Hi {{First Name}},\n\n\n\nBest,\n${ME.name}`)
  const send = () => {
    for (const c of contacts)
      db.insert('salesforce.activities', { id: uid('00T'), type: 'email', whoId: c.id, whatId: c.accountId || undefined, subject: `Email: ${subject}`, description: body.replace(/\{\{First Name\}\}/g, c.firstName), date: new Date().toISOString(), ownerId: ME.id, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    toast(`Your email was sent to ${contacts.length} recipient${contacts.length > 1 ? 's' : ''}.`)
    onClose()
  }
  return (
    <Modal title="Send List Email" agent="sf-list-email-modal" width={720} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!subject.trim()} onClick={send}>Send</Btn></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div>
          <label className={labelCls}>To</label>
          <div className="flex flex-wrap gap-1 p-1.5 rounded border border-[#C9C9C9] min-h-8">
            {contacts.map((c) => (
              <span key={c.id} className="inline-flex items-center h-6 px-2 rounded bg-[#F3F3F3] border border-[#E5E5E5] text-[12px]">
                {c.name}
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={`${inputCls} h-auto py-2`} />
        </div>
        <div className="text-[12px] text-[#444]">Merge field {'{{First Name}}'} is replaced for each recipient. Emails are logged to each contact’s activity timeline.</div>
      </div>
    </Modal>
  )
}

function FieldsModal({ cols, hidden, setHidden, onClose }: { cols: Col[]; hidden: Set<string>; setHidden: (s: Set<string>) => void; onClose: () => void }) {
  const [h, setH] = useState(new Set(hidden))
  return (
    <Modal title="Select Fields to Display" width={520} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" onClick={() => { setHidden(h); onClose() }}>Save</Btn></>}>
      <div className="p-5 space-y-1.5 text-[13px]">
        {cols.map((c, i) => (
          <label key={c.key} className={`flex items-center gap-2 ${i === 0 ? 'text-[#747474]' : ''}`}>
            <input
              type="checkbox"
              disabled={i === 0}
              checked={!h.has(c.key)}
              onChange={() => {
                const n = new Set(h)
                if (n.has(c.key)) n.delete(c.key)
                else n.add(c.key)
                setH(n)
              }}
            />
            {c.label} {i === 0 && '(required)'}
          </label>
        ))}
      </div>
    </Modal>
  )
}

function RenameModal({ current, onSave, onClose }: { current: string; onSave: (n: string) => void; onClose: () => void }) {
  const [n, setN] = useState(current)
  return (
    <Modal title="Rename List View" width={480} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!n.trim()} onClick={() => { onSave(n.trim()); onClose() }}>Save</Btn></>}>
      <div className="p-5">
        <label className={labelCls}>List Name</label>
        <input value={n} onChange={(e) => setN(e.target.value)} className={inputCls} />
      </div>
    </Modal>
  )
}

function CampaignModal({ c, onClose }: { c: any; onClose: () => void }) {
  const contacts = useCollection<any>('salesforce.contacts').filter((x) => x.campaigns?.some((k: any) => k.name === c.name))
  const leads = useCollection<any>('salesforce.leads').filter((x) => x.campaigns?.some((k: any) => k.name === c.name) || (c.name.startsWith('AI-Powered') && x.leadSource === 'Webinar'))
  const members = [...contacts.map((x) => ({ ...x, kind: 'Contact' })), ...leads.map((x) => ({ ...x, kind: 'Lead' }))]
  const { go } = useNav()
  return (
    <Modal title={c.name} width={720} onClose={onClose} footer={<Btn onClick={onClose}>Close</Btn>}>
      <div className="p-5 text-[13px] space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[['Type', c.type], ['Status', c.status], ['Start Date', c.start], ['Actual Cost', usd(c.cost, false)], ['Num Sent', Number(c.sent).toLocaleString()], ['Responses', Number(c.resp ?? 0).toLocaleString()], ['Response Rate', c.sent ? `${Math.round(((c.resp ?? 0) / c.sent) * 100)}%` : '0%'], ['Members', String(members.length)]].map(([k, v]) => (
            <div key={k as string}>
              <div className="text-[12px] text-[#444]">{k}</div>
              <div className="text-[14px]">{v}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="font-bold mb-1">Campaign Members ({members.length})</div>
          {members.length ? (
            <table className="w-full text-[12.5px]">
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-[#E5E5E5] h-8">
                    <td>
                      <Link onClick={() => { onClose(); go({ page: 'record', object: m.kind, id: m.id }) }}>{m.name}</Link>
                    </td>
                    <td>{m.kind}</td>
                    <td>{m.campaigns?.find((k: any) => k.name === c.name)?.status ?? 'Responded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-[#444]">No members yet. Use “Add to Campaign” on the Contacts or Leads list.</div>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ───────────── New / edit / clone opportunity ───────────── */
export function NewOpportunityModal({ onClose, accountId, initial, editId }: { onClose: () => void; accountId?: string; initial?: any; editId?: string }) {
  const { isAgent } = useDesk()
  const { go } = useNav()
  const { toast } = useActions()
  const accounts = useCollection<any>('salesforce.accounts')
  const blank = { name: '', accountId: accountId ?? accounts[0]?.id, closeDate: '', stage: 'Prospecting', amount: '', type: 'New Business', leadSource: 'Web', nextStep: '', description: '' }
  const existing = editId ? db.find<any>('salesforce.opportunities', editId) : undefined
  const [f, setF] = useState<any>(existing ? { ...existing } : initial ? { ...blank, ...initial } : blank)
  const [err, setErr] = useState(false)
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const save = (andNew = false) => {
    if (!String(f.name).trim()) {
      setErr(true)
      return
    }
    if (existing) {
      const stageChanged = f.stage !== existing.stage
      db.update('salesforce.opportunities', existing.id, (r) => ({
        ...f,
        amount: Number(String(f.amount).replace(/[^0-9.]/g, '')) || 0,
        probability: stageChanged ? STAGE_PROB[f.stage] : r.probability,
        forecastCategory: stageChanged ? forecastFor(f.stage) : r.forecastCategory,
        stageHistory: stageChanged ? [...(r.stageHistory ?? []), { stage: f.stage, date: new Date().toISOString(), by: 'alex', hw: isAgent }] : r.stageHistory,
        lastModified: new Date().toISOString(),
        updatedBy: isAgent ? 'hworker' : undefined,
      }))
      toast(`Opportunity "${f.name}" was saved.`)
      onClose()
      return
    }
    const id = uid('006Hs')
    db.insert('salesforce.opportunities', {
      seats: null,
      pricePerSeat: null,
      contractTerm: 12,
      contractStart: '',
      competitor: 'None',
      products: [],
      contactRoles: [],
      quotes: [],
      files: [],
      ...f,
      id,
      amount: Number(String(f.amount).replace(/[^0-9.]/g, '')) || 0,
      closeDate: f.closeDate || new Date().toISOString().slice(0, 10),
      probability: STAGE_PROB[f.stage],
      forecastCategory: forecastFor(f.stage),
      ownerId: ME.id,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      stageHistory: [{ stage: f.stage, date: new Date().toISOString(), by: 'alex', hw: isAgent }],
      createdBy: isAgent ? 'hworker' : undefined,
      updatedBy: undefined,
    })
    if (andNew) {
      toast(`Opportunity "${f.name}" was created.`)
      setF(blank)
      return
    }
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
      title={existing ? `Edit ${existing.name}` : 'New Opportunity'}
      agent="sf-new-opp-modal"
      width={860}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          {!existing && <Btn onClick={() => save(true)}>Save &amp; New</Btn>}
          <Btn variant="brand" agent="sf-new-opp-save" onClick={() => save()}>
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
            <div className="flex items-center gap-2 h-8 text-[13px]">{person(existing?.ownerId ?? ME.id).name}</div>
          </div>
          <div>
            {L('Amount')}
            <input data-agent="sf-new-opp-amount" aria-label="Amount" value={f.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} />
          </div>
          <div>
            {L('Opportunity Name', true)}
            <input data-agent="sf-new-opp-name" aria-label="Opportunity Name" value={f.name} onChange={(e) => set('name', e.target.value)} className={`${inputCls} ${err ? '!border-[#BA0517]' : ''}`} />
            {err && <div className="text-[12px] text-[#BA0517] mt-0.5">Complete this field.</div>}
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

