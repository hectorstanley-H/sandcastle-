import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Download, FileText, Pencil, RefreshCw, Search, Star } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { COMPANY, ME, PEOPLE, person } from '@/data/people'
import { STAGES } from '@/db/seeds/sales'
import { Btn, Card, Link, MenuButton, OBJ, ObjIcon, alias, inputCls, labelCls, sfDate, sfDateTime, usd, usdShort, useNav } from './ui'
import { Modal } from './record'
import { ChatterFeed, type FeedFilter } from './Chatter'
import { OWNERS, useActions } from './forms'
import { FilePreview } from './related'

function PageHeader({ object, title, buttons = [] }: { object: string; title: string; buttons?: [string, () => void][] }) {
  return (
    <div className="bg-[#F3F3F3] rounded-t-[4px] border-b border-[#C9C9C9] px-4 py-3 flex items-center gap-3">
      <ObjIcon type={object} size={32} />
      <div className="flex-1">
        <div className="text-[13px] leading-tight">{OBJ[object]?.plural}</div>
        <div className="text-[18px] font-bold leading-tight flex items-center gap-1">{title} <ChevronDown size={16} /></div>
      </div>
      {buttons.map(([b, fn]) => (
        <Btn key={b} onClick={fn}>
          {b}
        </Btn>
      ))}
    </div>
  )
}
const shell = 'bg-white rounded-[4px] border border-[#C9C9C9] shadow-[0_2px_2px_rgba(0,0,0,0.1)]'
const navItem = (active: boolean) => `w-full text-left px-4 py-1.5 ${active ? 'bg-[#EEF4FF] border-l-[3px] border-[#0176D3] font-bold' : 'hover:bg-[#F3F3F3]'}`

/* ───────────── search results ───────────── */
export function SearchResults({ q }: { q: string }) {
  const { go } = useNav()
  const s = q.toLowerCase()
  const [scope, setScope] = useState('Top Results')
  const opps = useCollection<any>('salesforce.opportunities').filter((o) => o.name.toLowerCase().includes(s))
  const accts = useCollection<any>('salesforce.accounts')
  const matchA = accts.filter((a) => a.name.toLowerCase().includes(s))
  const contacts = useCollection<any>('salesforce.contacts').filter((c) => (c.name + c.email).toLowerCase().includes(s))
  const leads = useCollection<any>('salesforce.leads').filter((l) => (l.name + ' ' + l.company + ' ' + l.email).toLowerCase().includes(s))
  const cases = useCollection<any>('salesforce.cases').filter((c) => (c.caseNumber + ' ' + c.subject).toLowerCase().includes(s))
  const allOpps = useCollection<any>('salesforce.opportunities')
  const files = allOpps.flatMap((o) => (o.files ?? []).map((f: any) => ({ ...f, id: o.id + f.name, opp: o }))).filter((f) => f.name.toLowerCase().includes(s))
  const [preview, setPreview] = useState<any>(null)
  const accName = (id: string) => accts.find((a) => a.id === id)?.name
  const block = (obj: string, rows: any[], cols: [string, (r: any) => any][]) => (
    <div className={`${shell}`}>
      <div className="flex items-center gap-2 px-4 py-2.5"><ObjIcon type={obj} size={24} /><span className="text-[14px] font-bold">{OBJ[obj].plural} ({rows.length})</span></div>
      <table className="w-full text-[13px]">
        <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{cols.map(([l]) => <th key={l} className="font-normal px-4 border-y border-[#E5E5E5]">{l}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="h-8 border-b border-[#E5E5E5] hover:bg-[#F3F3F3]">{cols.map(([l, f], i) => <td key={l} className="px-4">{i === 0 ? <Link agent={`sf-search-row-${r.id}`} onClick={() => (obj === 'File' ? setPreview(r) : go({ page: 'record', object: obj, id: r.id }))}>{f(r)}</Link> : f(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
  const show = (k: string) => scope === 'Top Results' || scope === k
  const total = opps.length + matchA.length + contacts.length + leads.length + cases.length + files.length
  return (
    <div className="p-3 flex gap-3">
      <div className={`${shell} w-[220px] py-2 text-[13px] self-start`}>
        <div className="px-4 py-1 font-bold">Search Results</div>
        {['Top Results', 'Opportunities', 'Accounts', 'Contacts', 'Leads', 'Cases', 'Files', 'Reports'].map((x) => (
          <button key={x} onClick={() => setScope(x)} className={navItem(scope === x)}>
            {x}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-3">
        <div className="text-[18px] font-bold">{scope}</div>
        {show('Opportunities') && opps.length > 0 && block('Opportunity', opps, [['Opportunity Name', (r) => r.name], ['Account Name', (r) => accName(r.accountId)], ['Stage', (r) => r.stage], ['Close Date', (r) => sfDate(r.closeDate)], ['Amount', (r) => usd(r.amount)], ['Owner Alias', (r) => alias(r.ownerId)]])}
        {show('Accounts') && matchA.length > 0 && block('Account', matchA, [['Account Name', (r) => r.name], ['Phone', (r) => r.phone], ['Type', (r) => r.type], ['Owner Alias', (r) => alias(r.ownerId)]])}
        {show('Contacts') && contacts.length > 0 && block('Contact', contacts, [['Name', (r) => r.name], ['Account Name', (r) => accName(r.accountId)], ['Title', (r) => r.title], ['Email', (r) => r.email]])}
        {show('Leads') && leads.length > 0 && block('Lead', leads, [['Name', (r) => r.name], ['Company', (r) => r.company], ['Lead Status', (r) => r.status], ['Email', (r) => r.email]])}
        {show('Cases') && cases.length > 0 && block('Case', cases, [['Case Number', (r) => r.caseNumber], ['Subject', (r) => r.subject], ['Status', (r) => r.status], ['Priority', (r) => r.priority]])}
        {show('Files') && files.length > 0 && block('File', files, [['Title', (r) => r.name], ['Related To', (r) => r.opp.name], ['Size', (r) => r.size]])}
        {(scope === 'Reports' || (scope === 'Top Results' ? total === 0 : !({ Opportunities: opps, Accounts: matchA, Contacts: contacts, Leads: leads, Cases: cases, Files: files } as any)[scope]?.length)) && (
          <div className={`${shell} p-10 text-center text-[13px] text-[#444]`}>
            <Search size={28} className="inline mb-2 text-[#747474]" />
            <div className="text-[16px] text-[#181818]">Don’t give up yet!</div>
            <div>We couldn’t find any {scope === 'Top Results' ? 'results' : scope.toLowerCase()} for “{q}”. Check the spelling or try different terms.</div>
          </div>
        )}
      </div>
      {preview && <FilePreview f={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

/* ───────────── reports ───────────── */
type RType = 'Opportunities' | 'Leads' | 'Accounts' | 'Activities' | 'Cases'
type Field = { key: string; label: string; money?: boolean; date?: boolean }
const RFIELDS: Record<RType, Field[]> = {
  Opportunities: [
    { key: 'name', label: 'Opportunity Name' },
    { key: 'account', label: 'Account Name' },
    { key: 'stage', label: 'Stage' },
    { key: 'owner', label: 'Opportunity Owner' },
    { key: 'closeDate', label: 'Close Date', date: true },
    { key: 'forecastCategory', label: 'Forecast Category' },
    { key: 'leadSource', label: 'Lead Source' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount', money: true },
  ],
  Leads: [
    { key: 'name', label: 'Name' },
    { key: 'company', label: 'Company' },
    { key: 'status', label: 'Lead Status' },
    { key: 'leadSource', label: 'Lead Source' },
    { key: 'industry', label: 'Industry' },
    { key: 'owner', label: 'Lead Owner' },
    { key: 'createdDate', label: 'Create Date', date: true },
  ],
  Accounts: [
    { key: 'name', label: 'Account Name' },
    { key: 'type', label: 'Type' },
    { key: 'industry', label: 'Industry' },
    { key: 'city', label: 'Billing City' },
    { key: 'owner', label: 'Account Owner' },
    { key: 'annualRevenue', label: 'Annual Revenue', money: true },
  ],
  Activities: [
    { key: 'subject', label: 'Subject' },
    { key: 'type', label: 'Task Subtype' },
    { key: 'owner', label: 'Assigned' },
    { key: 'related', label: 'Related To' },
    { key: 'date', label: 'Date', date: true },
  ],
  Cases: [
    { key: 'caseNumber', label: 'Case Number' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'owner', label: 'Case Owner' },
    { key: 'createdDate', label: 'Date/Time Opened', date: true },
  ],
}

const today = () => new Date().toISOString().slice(0, 10)
const qBounds = () => {
  const n = new Date()
  const s = new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3, 1)
  return [s, new Date(s.getFullYear(), s.getMonth() + 3, 0, 23, 59)] as const
}
const inQ = (d: string) => {
  const [s, e] = qBounds()
  const x = new Date(d + 'T12:00')
  return x >= s && x <= e
}

type RDef = { id: string; name: string; folder: string; owner: string; type: RType; group?: string; where?: (r: any) => boolean; description?: string; createdDate?: string; custom?: boolean }
export const STD_REPORTS: RDef[] = [
  { id: 'r-pipe-stage', name: 'Pipeline by Stage — This Quarter', folder: 'Sales Reports', owner: 'rachel', type: 'Opportunities', group: 'stage', where: (r) => !r.stage.startsWith('Closed') && inQ(r.closeDate), description: 'Open opportunities closing this quarter grouped by stage' },
  { id: 'r-closing-month', name: 'Opportunities Closing This Month', folder: 'Sales Reports', owner: 'alex', type: 'Opportunities', group: 'owner', where: (r) => !r.stage.startsWith('Closed') && r.closeDate.slice(0, 7) === today().slice(0, 7) },
  { id: 'r-won-ytd', name: 'Closed Won — FY27 YTD', folder: 'Executive Reports', owner: 'rachel', type: 'Opportunities', group: 'owner', where: (r) => r.stage === 'Closed Won' },
  { id: 'r-renewals', name: 'Renewals Due — Next 120 Days', folder: 'Customer Success', owner: 'aisha', type: 'Opportunities', group: 'stage', where: (r) => /renewal/i.test(r.type + r.name) && r.closeDate <= new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10) && !r.stage.startsWith('Closed') },
  { id: 'r-lead-source', name: 'Lead Conversion by Source', folder: 'Marketing Reports', owner: 'hannah', type: 'Leads', group: 'leadSource' },
  { id: 'r-activities-7d', name: 'Activities by Rep — Last 7 Days', folder: 'Sales Reports', owner: 'rachel', type: 'Activities', group: 'owner', where: (r) => +new Date(r.date) >= Date.now() - 7 * 86400000 },
  { id: 'r-stuck', name: 'Stuck Deals (No Activity 14d)', folder: 'Sales Reports', owner: 'liam', type: 'Opportunities', group: 'owner', where: (r) => !r.stage.startsWith('Closed') && !r.recentActivity },
  { id: 'r-webinar-leads', name: 'Webinar Leads — AI-Powered Ops Summit', folder: 'Marketing Reports', owner: 'hannah', type: 'Leads', group: 'status', where: (r) => r.leadSource === 'Webinar' },
  { id: 'r-forecast', name: 'Forecast vs Quota by Rep', folder: 'Executive Reports', owner: 'rachel', type: 'Opportunities', group: 'forecastCategory', where: (r) => !r.stage.startsWith('Closed Lost') && inQ(r.closeDate) },
]

function useReportData() {
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const leads = useCollection<any>('salesforce.leads')
  const acts = useCollection<any>('salesforce.activities')
  const tasks = useCollection<any>('salesforce.tasks')
  const cases = useCollection<any>('salesforce.cases')
  return useMemo(() => {
    const acc = (id: string) => accts.find((a) => a.id === id)?.name ?? ''
    const oppName = (id: string) => opps.find((o) => o.id === id)?.name ?? acc(id)
    const since = Date.now() - 14 * 86400000
    return {
      Opportunities: opps.map((o) => ({ ...o, account: acc(o.accountId), owner: person(o.ownerId).name, _obj: 'Opportunity', recentActivity: acts.some((a) => a.whatId === o.id && +new Date(a.date) >= since) })),
      Leads: leads.map((l) => ({ ...l, owner: person(l.ownerId).name, _obj: 'Lead' })),
      Accounts: accts.map((a) => ({ ...a, owner: person(a.ownerId).name, _obj: 'Account' })),
      Activities: [...acts.map((a) => ({ ...a, type: a.type[0].toUpperCase() + a.type.slice(1), owner: person(a.ownerId).name, related: oppName(a.whatId) })), ...tasks.map((t) => ({ ...t, type: 'Task', date: t.dueDate + 'T12:00:00', owner: person(t.ownerId).name, related: oppName(t.whatId) }))],
      Cases: cases.map((c) => ({ ...c, owner: person(c.ownerId).name, _obj: 'Case' })),
    } as Record<RType, any[]>
  }, [opps, accts, leads, acts, tasks, cases])
}

export function ReportsPage() {
  const { go } = useNav()
  const { toast } = useActions()
  const custom = useCollection<any>('salesforce.reports')
  const meta = useCollection<any>('salesforce.reportMeta')
  const folders = useCollection<any>('salesforce.reportFolders')
  const [nav, setNav] = useState('Recent')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | 'report' | 'folder'>(null)
  const all: RDef[] = [...custom.map((c) => ({ ...c, custom: true })), ...STD_REPORTS]
  const isFav = (id: string) => meta.find((m) => m.id === id)?.favorite
  const isSub = (id: string) => meta.find((m) => m.id === id)?.subscribed
  const created = (r: RDef, i: number) => r.createdDate ?? new Date(Date.now() - (i + 1) * 9 * 86400000).toISOString()
  const list = all
    .map((r, i) => ({ ...r, createdDate: created(r, i) }))
    .filter((r) => {
      if (nav === 'Created by Me' || nav === 'Created by Me ') return r.owner === ME.id
      if (nav === 'Private Reports') return r.custom && r.folder === 'Private Reports'
      if (nav === 'Public Reports') return r.folder !== 'Private Reports'
      if (nav === 'All Favorites') return isFav(r.id)
      if (nav.startsWith('folder:')) return r.folder === nav.slice(7)
      return true
    })
    .filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()))
  const folderNames = [...new Set([...STD_REPORTS.map((r) => r.folder), ...folders.map((f) => f.name)])]
  const showFolders = nav === 'All Folders' || nav === 'Shared with Me'
  return (
    <div className="p-3 flex gap-3 h-full">
      <div className={`${shell} w-[220px] py-3 text-[13px] self-start`}>
        {['REPORTS', 'Recent', 'Created by Me', 'Private Reports', 'Public Reports', 'All Reports', 'FOLDERS', 'All Folders', 'Created by Me ', 'Shared with Me', 'FAVORITES', 'All Favorites'].map((x, i) =>
          x === x.toUpperCase() ? (
            <div key={i} className="px-4 pt-3 pb-1 text-[11px] font-bold text-[#444]">{x}</div>
          ) : (
            <button key={i} onClick={() => setNav(x)} className={navItem(nav === x)}>
              {x.trim()}
            </button>
          ),
        )}
      </div>
      <div className={`${shell} flex-1 self-start`}>
        <PageHeader object="Report" title={nav.startsWith('folder:') ? nav.slice(7) : nav.trim()} buttons={[['New Report', () => setModal('report')], ['New Folder', () => setModal('folder')]]} />
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="flex-1 text-[12px] text-[#444]">{showFolders ? folderNames.length : list.length} items</span>
          <div className="flex items-center h-8 w-[240px] border border-[#C9C9C9] rounded px-2 gap-1.5">
            <Search size={13} className="text-[#747474]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports..." className="flex-1 outline-none text-[13px]" aria-label="Search reports" />
          </div>
        </div>
        {showFolders ? (
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Name', 'Reports', 'Created By'].map((h) => <th key={h} className="font-normal px-3 border-y border-[#C9C9C9]">{h}</th>)}</tr></thead>
            <tbody>{folderNames.map((f) => <tr key={f} className="h-9 border-b border-[#E5E5E5] hover:bg-[#F3F3F3]"><td className="px-3"><Link onClick={() => setNav(`folder:${f}`)}>{f}</Link></td><td className="px-3">{all.filter((r) => r.folder === f).length}</td><td className="px-3">{folders.find((x) => x.name === f) ? ME.name : 'Rachel Goldberg'}</td></tr>)}</tbody>
          </table>
        ) : (
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Report Name', 'Description', 'Folder', 'Created By', 'Created On', 'Subscribed', ''].map((h, i) => <th key={i} className="font-normal px-3 border-y border-[#C9C9C9]">{h}</th>)}</tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.id} className="h-9 border-b border-[#E5E5E5] hover:bg-[#F3F3F3]">
                  <td className="px-3">
                    <span className="flex items-center gap-1">
                      <Link agent={`sf-report-${r.id}`} onClick={() => go({ page: 'report', id: r.id })}>{r.name}</Link>
                      {isFav(r.id) && <Star size={12} className="fill-[#FCC003] text-[#DD7A01]" />}
                    </span>
                  </td>
                  <td className="px-3 text-[#444] truncate max-w-[200px]">{r.description ?? ''}</td>
                  <td className="px-3"><Link onClick={() => setNav(`folder:${r.folder}`)}>{r.folder}</Link></td>
                  <td className="px-3">{person(r.owner).name}</td>
                  <td className="px-3">{sfDate(r.createdDate)}</td>
                  <td className="px-3">{(isSub(r.id) ?? (!r.custom && (STD_REPORTS.findIndex((x) => x.id === r.id) + 1) % 3 === 0)) ? '✓' : ''}</td>
                  <td className="px-2 w-10">
                    <MenuButton
                      label={`Actions for ${r.name}`}
                      className="w-6 h-6 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474] bg-white"
                      menuClass="right-0 top-7"
                      width={170}
                      items={[
                        { label: 'Run', onClick: () => go({ page: 'report', id: r.id }) },
                        { label: isFav(r.id) ? 'Remove from Favorites' : 'Add to Favorites', onClick: () => db.upsert('salesforce.reportMeta', { id: r.id, favorite: !isFav(r.id) }) },
                        { label: isSub(r.id) ? 'Unsubscribe' : 'Subscribe', onClick: () => { db.upsert('salesforce.reportMeta', { id: r.id, subscribed: !isSub(r.id) }); toast(isSub(r.id) ? 'You unsubscribed from this report.' : 'You’re subscribed. You’ll get this report every Monday at 8:00 AM.') } },
                        ...(r.custom ? [{ label: 'Delete', onClick: () => { db.remove('salesforce.reports', r.id); toast(`Report "${r.name}" was deleted.`) } }] : []),
                      ]}
                    >
                      <ChevronDown size={11} />
                    </MenuButton>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="py-10 text-center text-[#444]">No reports to show.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {modal === 'report' && <ReportBuilder folders={folderNames} onClose={() => setModal(null)} />}
      {modal === 'folder' && <FolderModal onClose={() => setModal(null)} />}
    </div>
  )
}

function FolderModal({ onClose }: { onClose: () => void }) {
  const { toast } = useActions()
  const [name, setName] = useState('')
  return (
    <Modal title="New Folder" width={480} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!name.trim()} onClick={() => { db.insert('salesforce.reportFolders', { id: uid('00l'), name: name.trim(), createdDate: new Date().toISOString() }); toast(`Folder "${name.trim()}" was created.`); onClose() }}>Save</Btn></>}>
      <div className="p-5">
        <label className={labelCls}>Folder Label</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
    </Modal>
  )
}

function ReportBuilder({ folders, onClose, edit }: { folders: string[]; onClose: () => void; edit?: RDef }) {
  const { go } = useNav()
  const { toast } = useActions()
  const { isAgent } = useDesk()
  const [type, setType] = useState<RType>(edit?.type ?? 'Opportunities')
  const [name, setName] = useState(edit?.name ?? '')
  const [group, setGroup] = useState(edit?.group ?? '')
  const [folder, setFolder] = useState(edit?.folder ?? 'Private Reports')
  const save = () => {
    if (edit?.custom) {
      db.update('salesforce.reports', edit.id, { name, type, group, folder })
      toast(`Report "${name}" was saved.`)
      onClose()
      return
    }
    const id = uid('00O')
    db.insert('salesforce.reports', { id, name: name.trim() || `New ${type} Report`, type, group, folder, owner: ME.id, createdDate: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    toast('Report was saved.')
    onClose()
    go({ page: 'report', id })
  }
  return (
    <Modal title={edit ? 'Edit Report' : 'Create Report'} agent="sf-report-builder" width={620} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" onClick={save}>{edit ? 'Save' : 'Save & Run'}</Btn></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div>
          <label className={labelCls}>Report Type</label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(RFIELDS) as RType[]).map((t) => (
              <button key={t} onClick={() => { setType(t); setGroup('') }} className={`h-16 rounded border text-[12px] flex flex-col items-center justify-center gap-1 ${type === t ? 'border-[#0176D3] bg-[#EEF4FF] font-bold' : 'border-[#C9C9C9]'}`}>
                <ObjIcon type={{ Opportunities: 'Opportunity', Leads: 'Lead', Accounts: 'Account', Activities: 'Task', Cases: 'Case' }[t]} size={22} />
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Report Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${type} Report`} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Group Rows By</label>
            <select value={group} onChange={(e) => setGroup(e.target.value)} className={inputCls}>
              <option value="">(no grouping)</option>
              {RFIELDS[type].filter((f) => !f.money && !f.date && !['name', 'subject', 'caseNumber'].includes(f.key)).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Folder</label>
            <select value={folder} onChange={(e) => setFolder(e.target.value)} className={inputCls}>
              {['Private Reports', ...folders].map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function ReportRun({ id }: { id: string }) {
  const { go } = useNav()
  const { isAgent } = useDesk()
  const { toast } = useActions()
  const custom = useCollection<any>('salesforce.reports')
  const meta = useCollection<any>('salesforce.reportMeta')
  const data = useReportData()
  const [at, setAt] = useState(new Date())
  const [edit, setEdit] = useState(false)
  const [showDetails, setShowDetails] = useState(true)
  const def: RDef | undefined = STD_REPORTS.find((r) => r.id === id) ?? (custom.find((r) => r.id === id) ? { ...custom.find((r) => r.id === id), custom: true } : undefined)
  if (!def) return <div className="p-6">This report was deleted.</div>
  const fields = RFIELDS[def.type]
  const rows = data[def.type].filter(def.where ?? (() => true))
  const money = fields.find((f) => f.money)
  const sum = (l: any[]) => (money ? l.reduce((t, r) => t + (Number(r[money.key]) || 0), 0) : 0)
  const groups = def.group ? Object.entries(rows.reduce((m: Record<string, any[]>, r) => ((m[r[def.group!] || '-'] ??= []).push(r), m), {})).sort((a, b) => (money ? sum(b[1]) - sum(a[1]) : b[1].length - a[1].length)) : [['All', rows] as [string, any[]]]
  const chart = groups.map(([g, l]) => ({ g, v: money ? sum(l) : l.length }))
  const fav = meta.find((m) => m.id === id)?.favorite
  const sub = meta.find((m) => m.id === id)?.subscribed
  const fmt = (f: Field, v: any) => (f.money ? usd(v, false) : f.date ? sfDate(String(v).slice(0, 10)) : v)
  const exportCsv = () => {
    const fileId = `f-sf-report-${id}`
    db.remove('files', fileId)
    db.insert('files', { id: fileId, name: `${def.name.replace(/[^\w]+/g, '_')}.csv`, folder: 'Downloads', kind: 'csv', size: `${Math.max(2, Math.round(rows.length * 0.3))} KB`, modified: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    toast(`${def.name}.csv was exported to Downloads.`)
  }
  return (
    <div className="p-3 space-y-3">
      <div className={`${shell} px-4 py-3 flex items-center gap-3`}>
        <ObjIcon type="Report" size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px]">Report: {def.type}</div>
          <div className="text-[18px] font-bold flex items-center gap-2 truncate">
            {def.name}
            <button aria-label={fav ? 'Remove from favorites' : 'Add to favorites'} onClick={() => db.upsert('salesforce.reportMeta', { id, favorite: !fav })}>
              <Star size={15} className={fav ? 'fill-[#FCC003] text-[#DD7A01]' : 'text-[#747474]'} />
            </button>
          </div>
          <div className="text-[12px] text-[#444]">As of {at.toLocaleString('en-US')} · Viewing as {ME.name}</div>
        </div>
        <Btn icon={<RefreshCw size={13} />} onClick={() => { setAt(new Date()); toast('Report was refreshed.') }}>Refresh</Btn>
        <Btn icon={<Pencil size={13} />} onClick={() => setEdit(true)}>Edit</Btn>
        <Btn onClick={() => { db.upsert('salesforce.reportMeta', { id, subscribed: !sub }); toast(sub ? 'You unsubscribed from this report.' : 'Subscribed: you’ll receive this report every Monday at 8:00 AM.') }}>{sub ? 'Unsubscribe' : 'Subscribe'}</Btn>
        <Btn icon={<Download size={13} />} onClick={exportCsv}>Export</Btn>
        <Btn onClick={() => go({ page: 'list', object: 'Report' })}>Back to Reports</Btn>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className={`${shell} p-4`}>
          <div className="text-[12px] text-[#444]">Total Records</div>
          <div className="text-[28px] font-light">{rows.length}</div>
        </div>
        {money && (
          <div className={`${shell} p-4`}>
            <div className="text-[12px] text-[#444]">Sum of {money.label}</div>
            <div className="text-[28px] font-light">{usd(sum(rows), false)}</div>
          </div>
        )}
        <div className={`${shell} p-4`}>
          <div className="text-[12px] text-[#444]">Grouped by</div>
          <div className="text-[18px] font-light pt-2">{def.group ? fields.find((f) => f.key === def.group)?.label : '—'}</div>
        </div>
      </div>
      {def.group && (
        <div className={`${shell} p-3`}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="g" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tickFormatter={(v) => (money ? usdShort(v) : String(v))} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => (money ? usd(v, false) : v)} />
                <Bar dataKey="v" name={money ? `Sum of ${money.label}` : 'Record Count'} fill="#1B96FF" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className={shell}>
        <div className="px-4 py-2 flex items-center border-b border-[#E5E5E5] text-[12px]">
          <span className="flex-1 text-[#444]">{rows.length} records</span>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} /> Detail Rows</label>
        </div>
        <table className="w-full text-[12.5px]">
          <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{fields.map((f) => <th key={f.key} className={`font-normal px-3 ${f.money ? 'text-right' : ''}`}>{f.label}</th>)}</tr></thead>
          <tbody>
            {groups.map(([g, l]) => (
              <GroupRows key={g} label={def.group ? `${fields.find((f) => f.key === def.group)?.label}: ${g}` : ''} rows={l} fields={fields} details={showDetails} total={money ? usd(sum(l), false) : ''} fmt={fmt} open={(r) => r._obj && go({ page: 'record', object: r._obj, id: r.id })} />
            ))}
            <tr className="h-9 bg-[#F3F3F3] font-bold">
              <td className="px-3" colSpan={fields.length - (money ? 1 : 0)}>Grand Total ({rows.length} records)</td>
              {money && <td className="px-3 text-right">{usd(sum(rows), false)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
      {edit && <ReportBuilder edit={def} folders={[...new Set(STD_REPORTS.map((r) => r.folder))]} onClose={() => setEdit(false)} />}
    </div>
  )
}

function GroupRows({ label, rows, fields, details, total, fmt, open }: { label: string; rows: any[]; fields: Field[]; details: boolean; total: string; fmt: (f: Field, v: any) => any; open: (r: any) => void }) {
  return (
    <>
      {label && (
        <tr className="h-8 bg-[#FAFAF9] border-b border-[#E5E5E5]">
          <td className="px-3 font-bold" colSpan={fields.length - (total ? 1 : 0)}>{label} ({rows.length})</td>
          {total && <td className="px-3 text-right font-bold">{total}</td>}
        </tr>
      )}
      {details &&
        rows.map((r) => (
          <tr key={r.id} className="h-8 border-b border-[#E5E5E5] hover:bg-[#F3F3F3]">
            {fields.map((f, i) => (
              <td key={f.key} className={`px-3 truncate max-w-[220px] ${f.money ? 'text-right' : ''}`}>
                {i === 0 && r._obj ? <Link onClick={() => open(r)}>{fmt(f, r[f.key])}</Link> : fmt(f, r[f.key])}
              </td>
            ))}
          </tr>
        ))}
    </>
  )
}

/* ───────────── dashboards ───────────── */
const COLORS = ['#1B96FF', '#3BA755', '#FE9339', '#CB65FF', '#FF5D2D', '#2ECBBE', '#B781D3', '#FCC003']
const COMPONENTS = ['Open Pipeline', 'Closed Won (All Time)', 'Pipeline by Lead Source', 'Open Pipeline by Stage', 'Closed Won vs Pipeline by Rep']

export function DashboardsPage() {
  const { go } = useNav()
  const { toast } = useActions()
  const opps = useCollection<any>('salesforce.opportunities')
  const prefs = useCollection<any>('salesforce.prefs')
  const [at, setAt] = useState(new Date())
  const [spin, setSpin] = useState(false)
  const [modal, setModal] = useState<null | 'edit' | 'sub'>(null)
  const hidden: string[] = prefs.find((p) => p.id === 'dashHidden')?.items ?? []
  const sub = prefs.find((p) => p.id === 'dashSub')
  const open = opps.filter((o) => !o.stage.startsWith('Closed'))
  const byStage = STAGES.slice(0, 8).map((s) => ({ stage: s, amount: open.filter((o) => o.stage === s).reduce((t, o) => t + o.amount, 0) }))
  const reps = ['alex', 'liam', 'rachel', 'aisha'].map((r) => ({ rep: person(r).name, won: opps.filter((o) => o.ownerId === r && o.stage === 'Closed Won').reduce((t, o) => t + o.amount, 0), pipe: open.filter((o) => o.ownerId === r).reduce((t, o) => t + o.amount, 0) }))
  const bySource = Object.entries(open.reduce((m: any, o) => ((m[o.leadSource] = (m[o.leadSource] ?? 0) + o.amount), m), {})).map(([name, value]) => ({ name, value }))
  const total = open.reduce((t, o) => t + o.amount, 0)
  const vis = (n: string) => !hidden.includes(n)
  return (
    <div className="p-3 space-y-3">
      <div className={`${shell} px-4 py-3 flex items-center gap-3`}>
        <ObjIcon type="Dashboard" size={32} />
        <div className="flex-1"><div className="text-[13px]">Dashboard</div><div className="text-[18px] font-bold">Sales Leadership — Pipeline</div><div className="text-[12px] text-[#444]">As of {at.toLocaleString('en-US')} · Viewing as {ME.name}</div></div>
        <Btn icon={<RefreshCw size={13} className={spin ? 'animate-spin' : ''} />} onClick={() => { setSpin(true); setTimeout(() => { setSpin(false); setAt(new Date()) }, 700) }}>Refresh</Btn>
        <Btn onClick={() => setModal('edit')}>Edit</Btn>
        <Btn onClick={() => setModal('sub')}>{sub?.on ? 'Subscribed' : 'Subscribe'}</Btn>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {vis(COMPONENTS[0]) && <Card title="Open Pipeline" footer="View Report" onFooter={() => go({ page: 'report', id: 'r-pipe-stage' })}><div className="px-4 pb-6 pt-4 text-center"><div className="text-[40px] font-light text-[#181818]">{usdShort(total)}</div><div className="text-[12px] text-[#444]">{open.length} open opportunities</div></div></Card>}
        {vis(COMPONENTS[1]) && <Card title="Closed Won (All Time)" footer="View Report" onFooter={() => go({ page: 'report', id: 'r-won-ytd' })}><div className="px-4 pb-6 pt-4 text-center"><div className="text-[40px] font-light">{usdShort(opps.filter((o) => o.stage === 'Closed Won').reduce((t, o) => t + o.amount, 0))}</div><div className="text-[12px] text-[#444]">Win rate {Math.round((opps.filter((o) => o.stage === 'Closed Won').length / Math.max(1, opps.filter((o) => o.stage.startsWith('Closed')).length)) * 100)}%</div></div></Card>}
        {vis(COMPONENTS[2]) && (
          <Card title="Pipeline by Lead Source">
            <div className="h-[150px]"><ResponsiveContainer><PieChart><Pie data={bySource} dataKey="value" innerRadius={38} outerRadius={62} isAnimationActive={false}>{bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => usd(v, false)} /></PieChart></ResponsiveContainer></div>
          </Card>
        )}
        {vis(COMPONENTS[3]) && (
          <Card title="Open Pipeline by Stage" className="col-span-2" footer="View Report" onFooter={() => go({ page: 'report', id: 'r-pipe-stage' })}>
            <div className="h-[260px] pr-4"><ResponsiveContainer><BarChart data={byStage} layout="vertical" margin={{ left: 40 }}><CartesianGrid horizontal={false} stroke="#E5E5E5" /><XAxis type="number" tickFormatter={usdShort} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => usd(v, false)} /><Bar dataKey="amount" fill="#1B96FF" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
          </Card>
        )}
        {vis(COMPONENTS[4]) && (
          <Card title="Closed Won vs Pipeline by Rep">
            <div className="h-[260px] pr-3"><ResponsiveContainer><BarChart data={reps}><CartesianGrid vertical={false} stroke="#E5E5E5" /><XAxis dataKey="rep" tick={{ fontSize: 10 }} /><YAxis tickFormatter={usdShort} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => usd(v, false)} /><Bar dataKey="won" fill="#3BA755" isAnimationActive={false} /><Bar dataKey="pipe" fill="#FE9339" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
          </Card>
        )}
      </div>
      {modal === 'edit' && <DashEdit hidden={hidden} onClose={() => setModal(null)} />}
      {modal === 'sub' && <DashSub cur={sub} onClose={() => setModal(null)} onSaved={(on) => toast(on ? 'You’re subscribed to this dashboard.' : 'Subscription removed.')} />}
    </div>
  )
}

function DashEdit({ hidden, onClose }: { hidden: string[]; onClose: () => void }) {
  const [h, setH] = useState<string[]>(hidden)
  return (
    <Modal title="Edit Dashboard Components" width={480} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" onClick={() => { db.upsert('salesforce.prefs', { id: 'dashHidden', items: h }); onClose() }}>Save</Btn></>}>
      <div className="p-5 space-y-2 text-[13px]">
        {COMPONENTS.map((c) => (
          <label key={c} className="flex items-center gap-2">
            <input type="checkbox" checked={!h.includes(c)} onChange={() => setH(h.includes(c) ? h.filter((x) => x !== c) : [...h, c])} /> {c}
          </label>
        ))}
      </div>
    </Modal>
  )
}

function DashSub({ cur, onClose, onSaved }: { cur: any; onClose: () => void; onSaved: (on: boolean) => void }) {
  const [freq, setFreq] = useState(cur?.freq ?? 'Weekly')
  const [day, setDay] = useState(cur?.day ?? 'Monday')
  const [time, setTime] = useState(cur?.time ?? '8:00 AM')
  return (
    <Modal
      title="Subscribe to Dashboard"
      width={520}
      onClose={onClose}
      footer={
        <>
          {cur?.on && <Btn className="mr-auto" onClick={() => { db.upsert('salesforce.prefs', { id: 'dashSub', on: false }); onSaved(false); onClose() }}>Unsubscribe</Btn>}
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="brand" onClick={() => { db.upsert('salesforce.prefs', { id: 'dashSub', on: true, freq, day, time }); onSaved(true); onClose() }}>Save</Btn>
        </>
      }
    >
      <div className="p-5 grid grid-cols-3 gap-3 text-[13px]">
        <div><label className={labelCls}>Frequency</label><select value={freq} onChange={(e) => setFreq(e.target.value)} className={inputCls}>{['Daily', 'Weekly', 'Monthly'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label className={labelCls}>Day</label><select value={day} onChange={(e) => setDay(e.target.value)} className={inputCls}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label className={labelCls}>Time</label><select value={time} onChange={(e) => setTime(e.target.value)} className={inputCls}>{['7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM', '5:00 PM'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="col-span-3 text-[12px] text-[#444]">Recipients: {ME.name} ({ME.email})</div>
      </div>
    </Modal>
  )
}

/* ───────────── forecasts ───────────── */
export function ForecastsPage() {
  const { go } = useNav()
  const opps = useCollection<any>('salesforce.opportunities')
  const [offset, setOffset] = useState(0)
  const [drill, setDrill] = useState<{ owner: string | null; cat: string } | null>(null)
  const base = new Date()
  const qStart = new Date(base.getFullYear(), Math.floor(base.getMonth() / 3) * 3 + offset * 3, 1)
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0, 23, 59)
  const months = [0, 1, 2].map((i) => new Date(qStart.getFullYear(), qStart.getMonth() + i, 1))
  const inRange = (o: any) => {
    const d = new Date(o.closeDate + 'T12:00')
    return d >= qStart && d <= qEnd
  }
  const match = (owner: string | null, cat: string) => opps.filter((o) => (!owner || o.ownerId === owner) && o.forecastCategory === cat && inRange(o))
  const sum = (owner: string | null, cat: string) => match(owner, cat).reduce((t, o) => t + o.amount, 0)
  const cats = ['Closed', 'Commit', 'Best Case', 'Pipeline']
  const rows = [null, 'alex', 'liam', 'rachel', 'aisha']
  const qLabel = (o: number) => {
    const d = new Date(base.getFullYear(), Math.floor(base.getMonth() / 3) * 3 + o * 3, 1)
    return `Q${Math.floor(d.getMonth() / 3) + 1} FY${String(d.getFullYear() + 1).slice(2)}`
  }
  const list = drill ? match(drill.owner, drill.cat) : []
  return (
    <div className="p-3 space-y-3">
      <div className={shell}>
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[#C9C9C9] bg-[#F3F3F3] rounded-t-[4px]">
          <ObjIcon type="Forecasts" size={32} />
          <div className="flex-1"><div className="text-[13px]">Forecasts</div><div className="text-[18px] font-bold flex items-center gap-1">Opportunity Revenue <ChevronDown size={16} /></div></div>
          <MenuButton className="h-8 px-4 rounded-[4px] border border-[#C9C9C9] bg-white text-[13px] text-[#0176D3] hover:bg-[#F3F3F3] inline-flex items-center gap-1" menuClass="right-0 top-9" width={160} items={[-1, 0, 1, 2].map((o) => ({ label: qLabel(o), checked: o === offset, onClick: () => { setOffset(o); setDrill(null) } }))}>
            {qLabel(offset)} <ChevronDown size={13} />
          </MenuButton>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="h-9 bg-[#F3F3F3] text-[#444] text-left"><th className="px-4 font-normal">Forecast Owner</th>{cats.map((c) => <th key={c} className="px-3 font-normal text-right">{c} Forecast</th>)}<th className="px-3 font-normal text-right">Quota</th><th className="px-3 font-normal text-right">Attainment</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r)} className={`h-10 border-b border-[#E5E5E5] ${!r ? 'font-bold bg-[#FAFAF9]' : ''}`}>
                <td className="px-4">{r ? <span className="pl-6">{person(r).name}</span> : 'Rachel Goldberg (Sales Team)'}</td>
                {cats.map((c) => (
                  <td key={c} className={`px-3 text-right ${drill && drill.owner === r && drill.cat === c ? 'bg-[#EEF4FF]' : ''}`}>
                    <Link onClick={() => setDrill(drill && drill.owner === r && drill.cat === c ? null : { owner: r, cat: c })}>{usd(sum(r, c), false)}</Link>
                  </td>
                ))}
                <td className="px-3 text-right">{usd(r ? 900_000 : 3_600_000, false)}</td>
                <td className="px-3 text-right">{Math.round((sum(r, 'Closed') / (r ? 900_000 : 3_600_000)) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-[12px] text-[#444]">Months in quarter: {months.map((m) => m.toLocaleDateString('en-US', { month: 'long' })).join(', ')}</div>
      </div>
      {drill && (
        <div className={shell}>
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#E5E5E5]">
            <ObjIcon type="Opportunity" size={24} />
            <span className="flex-1 text-[14px] font-bold">
              {drill.cat} Opportunities — {drill.owner ? person(drill.owner).name : 'Sales Team'} ({list.length})
            </span>
            <Link onClick={() => setDrill(null)}>Close</Link>
          </div>
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Opportunity Name', 'Stage', 'Close Date', 'Owner', 'Amount'].map((h) => <th key={h} className={`font-normal px-4 ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="h-8 border-b border-[#E5E5E5]">
                  <td className="px-4"><Link onClick={() => go({ page: 'record', object: 'Opportunity', id: o.id })}>{o.name}</Link></td>
                  <td className="px-4">{o.stage}</td>
                  <td className="px-4">{sfDate(o.closeDate)}</td>
                  <td className="px-4">{person(o.ownerId).name}</td>
                  <td className="px-4 text-right">{usd(o.amount, false)}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="py-6 text-center text-[#444]">No opportunities in this forecast category.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ───────────── chatter ───────────── */
export function ChatterPage() {
  const { go } = useNav()
  const { toast } = useActions()
  const [f, setF] = useState<FeedFilter>('follow')
  const follows = useCollection<any>('salesforce.follows')
  const contoso = useCollection<any>('salesforce.accounts').find((a) => a.name === 'Contoso Ltd')
  const items: [FeedFilter, string][] = [['follow', 'What I Follow'], ['me', 'To Me'], ['bookmarked', 'Bookmarked'], ['company', 'Company'], ['muted', 'Muted']]
  const followsContoso = !!contoso && follows.some((x) => x.id === contoso.id)
  return (
    <div className="p-3 flex gap-3">
      <div className={`${shell} w-[220px] py-3 text-[13px] self-start`}>
        {items.map(([k, l]) => (
          <button key={k} onClick={() => setF(k)} className={navItem(f === k)}>
            {l}
          </button>
        ))}
      </div>
      <div className={`${shell} flex-1`}><ChatterFeed key={f} filter={f === 'company' ? 'all' : f} onToast={toast} /></div>
      <div className={`${shell} w-[300px] self-start p-4 text-[13px]`}>
        <div className="font-bold mb-2">Recommendations</div>
        {contoso && !followsContoso ? (
          <>
            <div className="text-[#444]">Follow the <Link onClick={() => go({ page: 'record', object: 'Account', id: contoso.id })}>Contoso Ltd</Link> account to see renewal updates.</div>
            <Btn className="mt-2" onClick={() => { db.insert('salesforce.follows', { id: contoso.id, object: 'Account', name: contoso.name, date: new Date().toISOString() }); toast('You’re now following Contoso Ltd.') }}>Follow</Btn>
          </>
        ) : (
          <div className="text-[#444]">You’re all caught up on recommendations.</div>
        )}
        {follows.length > 0 && (
          <>
            <div className="font-bold mt-4 mb-1">Following ({follows.length})</div>
            {follows.slice(0, 8).map((x) => (
              <div key={x.id} className="flex items-center gap-2 py-0.5">
                <ObjIcon type={x.object} size={16} />
                <Link className="truncate" onClick={() => go({ page: 'record', object: x.object, id: x.id })}>{x.name}</Link>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/* ───────────── files ───────────── */
export function FilesPage() {
  const { go } = useNav()
  const opps = useCollection<any>('salesforce.opportunities')
  const uploaded = useCollection<any>('salesforce.files')
  const [q, setQ] = useState('')
  const [up, setUp] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const files = [...uploaded.map((f) => ({ ...f, owner: f.ownerId ?? ME.id })), ...opps.flatMap((o) => (o.files ?? []).map((f: any) => ({ ...f, opp: o, owner: o.ownerId })))].filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="p-3">
      <div className={shell}>
        <PageHeader object="File" title="Recent" buttons={[['Upload Files', () => setUp(true)]]} />
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex items-center h-8 w-[260px] border border-[#C9C9C9] rounded px-2 gap-1 text-[#747474]">
            <Search size={13} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Files..." aria-label="Search Files" className="flex-1 outline-none text-[13px] text-[#181818]" />
          </div>
          <span className="text-[12px] text-[#444]">{files.length} items</span>
        </div>
        <table className="w-full text-[13px]">
          <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Title', 'Related To', 'Owner', 'Last Modified', 'Size'].map((h) => <th key={h} className="font-normal px-4 border-y border-[#C9C9C9]">{h}</th>)}</tr></thead>
          <tbody>
            {files.map((f, i) => (
              <tr key={i} className="h-10 border-b border-[#E5E5E5] hover:bg-[#F3F3F3]">
                <td className="px-4"><span className="inline-flex items-center gap-2"><FileText size={16} className={f.kind === 'pdf' ? 'text-[#E65A5A]' : f.kind === 'pptx' ? 'text-[#FF8B4C]' : 'text-[#4A90E2]'} /><Link onClick={() => setPreview(f)}>{f.name}</Link></span></td>
                <td className="px-4">{f.opp ? <Link onClick={() => go({ page: 'record', object: 'Opportunity', id: f.opp.id })}>{f.opp.name}</Link> : ''}</td>
                <td className="px-4">{person(f.owner).name}</td>
                <td className="px-4">{sfDate(f.date)}</td>
                <td className="px-4">{f.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {up && <FilesUpload onClose={() => setUp(false)} />}
      {preview && <FilePreview f={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function FilesUpload({ onClose }: { onClose: () => void }) {
  const { toast } = useActions()
  const { isAgent } = useDesk()
  const [name, setName] = useState('Q4_Territory_Plan.pdf')
  return (
    <Modal title="Upload Files" width={520} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!name.trim()} onClick={() => { const kind = name.split('.').pop()?.toLowerCase() ?? 'pdf'; db.insert('salesforce.files', { id: uid('069Hs'), name: name.trim(), kind, size: `${120 + Math.round(Math.random() * 900)} KB`, date: new Date().toISOString(), ownerId: ME.id, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true }); toast(`${name.trim()} was uploaded.`); onClose() }}>Upload</Btn></>}>
      <div className="p-5 text-[13px] space-y-2">
        <div className="rounded border-2 border-dashed border-[#C9C9C9] p-6 text-center text-[#444]">Drop files here or choose a file below</div>
        <label className={labelCls}>File name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
    </Modal>
  )
}

/* ───────────── setup ───────────── */
export function SetupPage({ tab = 'home' }: { tab?: string }) {
  const { go } = useNav()
  const { toast } = useActions()
  const prefs = useCollection<any>('salesforce.prefs')
  const counts: Record<string, number> = {
    Account: useCollection<any>('salesforce.accounts').length,
    Contact: useCollection<any>('salesforce.contacts').length,
    Lead: useCollection<any>('salesforce.leads').length,
    Opportunity: useCollection<any>('salesforce.opportunities').length,
    Case: useCollection<any>('salesforce.cases').length,
    Task: useCollection<any>('salesforce.tasks').length,
  }
  const [q, setQ] = useState('')
  const inactive: string[] = prefs.find((p) => p.id === 'inactiveUsers')?.items ?? []
  const users = PEOPLE.filter((p) => !p.external)
  const tabs: [string, string][] = [['home', 'Setup Home'], ['users', 'Users'], ['objects', 'Object Manager'], ['company', 'Company Information']]
  return (
    <div className="p-3 flex gap-3">
      <div className={`${shell} w-[240px] py-3 text-[13px] self-start`}>
        <div className="px-3 pb-2">
          <div className="flex items-center h-8 border border-[#C9C9C9] rounded px-2 gap-1">
            <Search size={13} className="text-[#747474]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quick Find" className="flex-1 outline-none text-[13px]" aria-label="Quick Find" />
          </div>
        </div>
        {tabs.filter(([, l]) => !q || l.toLowerCase().includes(q.toLowerCase())).map(([k, l]) => (
          <button key={k} onClick={() => go({ page: 'setup', tab: k })} className={navItem(tab === k)}>
            {l}
          </button>
        ))}
      </div>
      <div className={`${shell} flex-1 self-start`}>
        <div className="px-4 py-3 border-b border-[#C9C9C9] bg-[#F3F3F3] rounded-t-[4px]">
          <div className="text-[13px]">Setup</div>
          <div className="text-[18px] font-bold">{tabs.find(([k]) => k === tab)?.[1]}</div>
        </div>
        {tab === 'home' && (
          <div className="p-4 grid grid-cols-3 gap-3 text-[13px]">
            {[['Users', `${users.length - inactive.length} active users`, 'users'], ['Object Manager', `${Object.keys(counts).length} standard objects`, 'objects'], ['Company Information', COMPANY.name, 'company']].map(([t, d, k]) => (
              <button key={k} onClick={() => go({ page: 'setup', tab: k })} className="text-left rounded border border-[#E5E5E5] p-4 hover:bg-[#F3F3F3]">
                <div className="text-[15px] font-bold text-[#0176D3]">{t}</div>
                <div className="text-[#444]">{d}</div>
              </button>
            ))}
          </div>
        )}
        {tab === 'users' && (
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Action', 'Full Name', 'Alias', 'Username', 'Title', 'Profile', 'Active'].map((h) => <th key={h} className="font-normal px-3">{h}</th>)}</tr></thead>
            <tbody>
              {users.map((u) => {
                const off = inactive.includes(u.id)
                const isOwner = OWNERS.some((o) => o.id === u.id)
                return (
                  <tr key={u.id} className="h-9 border-b border-[#E5E5E5]">
                    <td className="px-3">
                      <Link
                        onClick={() => {
                          if (u.id === ME.id) return toast('You can’t deactivate your own user.')
                          db.upsert('salesforce.prefs', { id: 'inactiveUsers', items: off ? inactive.filter((x) => x !== u.id) : [...inactive, u.id] })
                          toast(`${u.name} was ${off ? 'activated' : 'deactivated'}.`)
                        }}
                      >
                        {off ? 'Activate' : 'Deactivate'}
                      </Link>
                    </td>
                    <td className="px-3"><span className="inline-flex items-center gap-1.5"><Avatar id={u.id} size={20} /> {u.name}</span></td>
                    <td className="px-3">{alias(u.id)}</td>
                    <td className="px-3">{u.email}</td>
                    <td className="px-3">{u.title}</td>
                    <td className="px-3">{u.id === ME.id || u.id === 'rachel' ? 'System Administrator' : isOwner ? 'Sales User' : 'Standard User'}</td>
                    <td className="px-3">{off ? '' : '✓'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {tab === 'objects' && (
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Label', 'API Name', 'Type', 'Records', 'Key Prefix'].map((h) => <th key={h} className="font-normal px-3">{h}</th>)}</tr></thead>
            <tbody>
              {Object.entries(counts).map(([k, n]) => (
                <tr key={k} className="h-9 border-b border-[#E5E5E5]">
                  <td className="px-3"><Link onClick={() => go({ page: 'list', object: k })}>{OBJ[k].label}</Link></td>
                  <td className="px-3">{k}</td>
                  <td className="px-3">Standard Object</td>
                  <td className="px-3">{n}</td>
                  <td className="px-3">{OBJ[k].key}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'company' && (
          <div className="p-4 grid grid-cols-2 gap-x-8 text-[13px]">
            {[['Organization Name', COMPANY.name], ['Primary Contact', person('rachel').name], ['Default Locale', 'English (United States)'], ['Default Time Zone', '(GMT-05:00) Eastern Standard Time'], ['Currency Locale', `English (United States) - ${COMPANY.currency}`], ['Address', COMPANY.hq], ['Edition', 'Enterprise Edition'], ['Licensed Users', String(users.length)], ['Last Modified', sfDateTime(new Date().toISOString())]].map(([k, v]) => (
              <div key={k} className="border-b border-[#E5E5E5] py-2">
                <div className="text-[12px] text-[#444]">{k}</div>
                <div>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
