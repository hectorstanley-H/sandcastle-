import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, FileText, RefreshCw, Search } from 'lucide-react'
import { useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { STAGES } from '@/db/seeds/sales'
import { Btn, Card, Link, OBJ, ObjIcon, alias, sfDate, usd, usdShort, useNav } from './ui'
import { ChatterFeed } from './Chatter'

function PageHeader({ object, title, buttons = [] }: { object: string; title: string; buttons?: string[] }) {
  return (
    <div className="bg-[#F3F3F3] rounded-t-[4px] border-b border-[#C9C9C9] px-4 py-3 flex items-center gap-3">
      <ObjIcon type={object} size={32} />
      <div className="flex-1">
        <div className="text-[13px] leading-tight">{OBJ[object]?.plural}</div>
        <div className="text-[18px] font-bold leading-tight flex items-center gap-1">{title} <ChevronDown size={16} /></div>
      </div>
      {buttons.map((b, i) => <Btn key={b} variant={i === 0 && b.startsWith('New') ? 'neutral' : 'neutral'}>{b}</Btn>)}
    </div>
  )
}
const shell = 'bg-white rounded-[4px] border border-[#C9C9C9] shadow-[0_2px_2px_rgba(0,0,0,0.1)]'

export function SearchResults({ q }: { q: string }) {
  const { go } = useNav()
  const s = q.toLowerCase()
  const opps = useCollection<any>('salesforce.opportunities').filter((o) => o.name.toLowerCase().includes(s))
  const accts = useCollection<any>('salesforce.accounts')
  const matchA = accts.filter((a) => a.name.toLowerCase().includes(s))
  const contacts = useCollection<any>('salesforce.contacts').filter((c) => (c.name + c.email).toLowerCase().includes(s))
  const accName = (id: string) => accts.find((a) => a.id === id)?.name
  const block = (obj: string, rows: any[], cols: [string, (r: any) => any][]) => (
    <div className={`${shell}`}>
      <div className="flex items-center gap-2 px-4 py-2.5"><ObjIcon type={obj} size={24} /><span className="text-[14px] font-bold">{OBJ[obj].plural} ({rows.length})</span></div>
      <table className="w-full text-[13px]">
        <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{cols.map(([l]) => <th key={l} className="font-normal px-4 border-y border-[#E5E5E5]">{l}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="h-8 border-b border-[#E5E5E5] hover:bg-[#F3F3F3]">{cols.map(([l, f], i) => <td key={l} className="px-4">{i === 0 ? <Link agent={`sf-search-row-${r.id}`} onClick={() => go({ page: 'record', object: obj, id: r.id })}>{f(r)}</Link> : f(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
  return (
    <div className="p-3 flex gap-3">
      <div className={`${shell} w-[220px] py-2 text-[13px] self-start`}>
        <div className="px-4 py-1 font-bold">Search Results</div>
        {['Top Results', 'Opportunities', 'Accounts', 'Contacts', 'Leads', 'Files', 'Reports'].map((x, i) => <div key={x} className={`px-4 py-1.5 ${i === 0 ? 'bg-[#EEF4FF] border-l-[3px] border-[#0176D3] font-bold' : ''}`}>{x}</div>)}
      </div>
      <div className="flex-1 space-y-3">
        <div className="text-[18px] font-bold">Top Results</div>
        {opps.length > 0 && block('Opportunity', opps, [['Opportunity Name', (r) => r.name], ['Account Name', (r) => accName(r.accountId)], ['Stage', (r) => r.stage], ['Close Date', (r) => sfDate(r.closeDate)], ['Amount', (r) => usd(r.amount)], ['Owner Alias', (r) => alias(r.ownerId)]])}
        {matchA.length > 0 && block('Account', matchA, [['Account Name', (r) => r.name], ['Phone', (r) => r.phone], ['Type', (r) => r.type], ['Owner Alias', (r) => alias(r.ownerId)]])}
        {contacts.length > 0 && block('Contact', contacts, [['Name', (r) => r.name], ['Account Name', (r) => accName(r.accountId)], ['Title', (r) => r.title], ['Email', (r) => r.email]])}
      </div>
    </div>
  )
}

export function ReportsPage() {
  const reps = [
    ['Pipeline by Stage — This Quarter', 'Sales Reports', 'Rachel Goldberg', 1],
    ['Opportunities Closing This Month', 'Sales Reports', 'Alex Morgan', 2],
    ['Closed Won — FY27 YTD', 'Executive Reports', 'Rachel Goldberg', 3],
    ['Renewals Due — Next 120 Days', 'Customer Success', 'Aisha Bello', 4],
    ['Lead Conversion by Source', 'Marketing Reports', 'Hannah Novak', 5],
    ['Activities by Rep — Last 7 Days', 'Sales Reports', 'Rachel Goldberg', 6],
    ['Stuck Deals (No Activity 14d)', 'Sales Reports', 'Liam O’Connor', 7],
    ['Webinar Leads — AI-Powered Ops Summit', 'Marketing Reports', 'Hannah Novak', 8],
    ['Forecast vs Quota by Rep', 'Executive Reports', 'Rachel Goldberg', 9],
  ]
  return (
    <div className="p-3 flex gap-3 h-full">
      <div className={`${shell} w-[220px] py-3 text-[13px] self-start`}>
        {['REPORTS', 'Recent', 'Created by Me', 'Private Reports', 'Public Reports', 'All Reports', 'FOLDERS', 'All Folders', 'Created by Me', 'Shared with Me', 'FAVORITES', 'All Favorites'].map((x, i) => (
          <div key={i} className={x === x.toUpperCase() ? 'px-4 pt-3 pb-1 text-[11px] font-bold text-[#444]' : `px-4 py-1.5 ${x === 'Recent' ? 'bg-[#EEF4FF] border-l-[3px] border-[#0176D3] font-bold' : 'hover:bg-[#F3F3F3]'}`}>{x}</div>
        ))}
      </div>
      <div className={`${shell} flex-1 self-start`}>
        <PageHeader object="Report" title="Recent" buttons={['New Report', 'New Folder']} />
        <div className="px-4 py-2 text-[12px] text-[#444]">{reps.length} items</div>
        <table className="w-full text-[13px]">
          <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Report Name', 'Description', 'Folder', 'Created By', 'Created On', 'Subscribed'].map((h) => <th key={h} className="font-normal px-3 border-y border-[#C9C9C9]">{h}</th>)}</tr></thead>
          <tbody>{reps.map(([n, f, c, i]) => <tr key={n as string} className="h-9 border-b border-[#E5E5E5] hover:bg-[#F3F3F3]"><td className="px-3"><Link>{n}</Link></td><td className="px-3 text-[#444]"></td><td className="px-3"><Link>{f}</Link></td><td className="px-3">{c}</td><td className="px-3">{sfDate(new Date(Date.now() - (i as number) * 9 * 86400000).toISOString())}</td><td className="px-3">{(i as number) % 3 === 0 ? '✓' : ''}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

const COLORS = ['#1B96FF', '#3BA755', '#FE9339', '#CB65FF', '#FF5D2D', '#2ECBBE', '#B781D3', '#FCC003']

export function DashboardsPage() {
  const opps = useCollection<any>('salesforce.opportunities')
  const open = opps.filter((o) => !o.stage.startsWith('Closed'))
  const byStage = STAGES.slice(0, 8).map((s) => ({ stage: s, amount: open.filter((o) => o.stage === s).reduce((t, o) => t + o.amount, 0) }))
  const reps = ['alex', 'liam', 'rachel', 'aisha'].map((r) => ({ rep: person(r).name, won: opps.filter((o) => o.ownerId === r && o.stage === 'Closed Won').reduce((t, o) => t + o.amount, 0), pipe: open.filter((o) => o.ownerId === r).reduce((t, o) => t + o.amount, 0) }))
  const bySource = Object.entries(open.reduce((m: any, o) => ((m[o.leadSource] = (m[o.leadSource] ?? 0) + o.amount), m), {})).map(([name, value]) => ({ name, value }))
  const total = open.reduce((t, o) => t + o.amount, 0)
  return (
    <div className="p-3 space-y-3">
      <div className={`${shell} px-4 py-3 flex items-center gap-3`}>
        <ObjIcon type="Dashboard" size={32} />
        <div className="flex-1"><div className="text-[13px]">Dashboard</div><div className="text-[18px] font-bold">Sales Leadership — Pipeline</div><div className="text-[12px] text-[#444]">As of {new Date().toLocaleString('en-US')} · Viewing as {ME.name}</div></div>
        <Btn icon={<RefreshCw size={13} />}>Refresh</Btn><Btn>Edit</Btn><Btn>Subscribe</Btn>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card title="Open Pipeline"><div className="px-4 pb-6 pt-4 text-center"><div className="text-[40px] font-light text-[#181818]">{usdShort(total)}</div><div className="text-[12px] text-[#444]">{open.length} open opportunities</div></div></Card>
        <Card title="Closed Won (All Time)"><div className="px-4 pb-6 pt-4 text-center"><div className="text-[40px] font-light">{usdShort(opps.filter((o) => o.stage === 'Closed Won').reduce((t, o) => t + o.amount, 0))}</div><div className="text-[12px] text-[#444]">Win rate {Math.round((opps.filter((o) => o.stage === 'Closed Won').length / opps.filter((o) => o.stage.startsWith('Closed')).length) * 100)}%</div></div></Card>
        <Card title="Pipeline by Lead Source">
          <div className="h-[150px]"><ResponsiveContainer><PieChart><Pie data={bySource} dataKey="value" innerRadius={38} outerRadius={62} isAnimationActive={false}>{bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: any) => usd(v, false)} /></PieChart></ResponsiveContainer></div>
        </Card>
        <Card title="Open Pipeline by Stage" className="col-span-2">
          <div className="h-[260px] pr-4"><ResponsiveContainer><BarChart data={byStage} layout="vertical" margin={{ left: 40 }}><CartesianGrid horizontal={false} stroke="#E5E5E5" /><XAxis type="number" tickFormatter={usdShort} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => usd(v, false)} /><Bar dataKey="amount" fill="#1B96FF" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Closed Won vs Pipeline by Rep">
          <div className="h-[260px] pr-3"><ResponsiveContainer><BarChart data={reps}><CartesianGrid vertical={false} stroke="#E5E5E5" /><XAxis dataKey="rep" tick={{ fontSize: 10 }} /><YAxis tickFormatter={usdShort} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => usd(v, false)} /><Bar dataKey="won" fill="#3BA755" isAnimationActive={false} /><Bar dataKey="pipe" fill="#FE9339" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>
    </div>
  )
}

export function ForecastsPage() {
  const opps = useCollection<any>('salesforce.opportunities')
  const months = [0, 1, 2].map((i) => {
    const d = new Date()
    d.setMonth(Math.floor(d.getMonth() / 3) * 3 + i, 1)
    return d
  })
  const sum = (owner: string | null, m: Date | null, cat: string) =>
    opps
      .filter((o) => (!owner || o.ownerId === owner) && o.forecastCategory === cat && (!m || new Date(o.closeDate + 'T12:00').getMonth() === m.getMonth()))
      .reduce((t, o) => t + o.amount, 0)
  const cats = ['Closed', 'Commit', 'Best Case', 'Pipeline']
  const rows = [null, 'alex', 'liam', 'rachel', 'aisha']
  return (
    <div className="p-3">
      <div className={shell}>
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[#C9C9C9] bg-[#F3F3F3] rounded-t-[4px]">
          <ObjIcon type="Forecasts" size={32} />
          <div className="flex-1"><div className="text-[13px]">Forecasts</div><div className="text-[18px] font-bold flex items-center gap-1">Opportunity Revenue <ChevronDown size={16} /></div></div>
          <Btn>Q{Math.floor(new Date().getMonth() / 3) + 1} FY{String(new Date().getFullYear() + 1).slice(2)}</Btn>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="h-9 bg-[#F3F3F3] text-[#444] text-left"><th className="px-4 font-normal">Forecast Owner</th>{cats.map((c) => <th key={c} className="px-3 font-normal text-right">{c} Forecast</th>)}<th className="px-3 font-normal text-right">Quota</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r)} className={`h-10 border-b border-[#E5E5E5] ${!r ? 'font-bold bg-[#FAFAF9]' : ''}`}>
                <td className="px-4">{r ? <span className="pl-6">{person(r).name}</span> : 'Rachel Goldberg (Sales Team)'}</td>
                {cats.map((c) => <td key={c} className="px-3 text-right"><Link>{usd(sum(r, null, c), false)}</Link></td>)}
                <td className="px-3 text-right">{usd(r ? 900_000 : 3_600_000, false)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-[12px] text-[#444]">Months in quarter: {months.map((m) => m.toLocaleDateString('en-US', { month: 'long' })).join(', ')}</div>
      </div>
    </div>
  )
}

export function ChatterPage() {
  return (
    <div className="p-3 flex gap-3">
      <div className={`${shell} w-[220px] py-3 text-[13px] self-start`}>
        {['What I Follow', 'To Me', 'Bookmarked', 'Company', 'Muted'].map((x, i) => <div key={x} className={`px-4 py-1.5 ${i === 0 ? 'bg-[#EEF4FF] border-l-[3px] border-[#0176D3] font-bold' : ''}`}>{x}</div>)}
      </div>
      <div className={`${shell} flex-1`}><ChatterFeed /></div>
      <div className={`${shell} w-[300px] self-start p-4 text-[13px]`}><div className="font-bold mb-2">Recommendations</div><div className="text-[#444]">Follow the <Link>Contoso Ltd</Link> account to see renewal updates.</div></div>
    </div>
  )
}

export function FilesPage() {
  const opps = useCollection<any>('salesforce.opportunities')
  const files = opps.flatMap((o) => (o.files ?? []).map((f: any) => ({ ...f, opp: o.name })))
  return (
    <div className="p-3">
      <div className={shell}>
        <PageHeader object="File" title="Recent" buttons={['Upload Files']} />
        <div className="flex items-center gap-2 px-4 py-2"><div className="flex items-center h-8 w-[260px] border border-[#C9C9C9] rounded px-2 gap-1 text-[#747474]"><Search size={13} /><span className="text-[13px]">Search Files...</span></div></div>
        <table className="w-full text-[13px]">
          <thead><tr className="bg-[#F3F3F3] h-8 text-left text-[#444]">{['Title', 'Owner', 'Last Modified', 'Size'].map((h) => <th key={h} className="font-normal px-4 border-y border-[#C9C9C9]">{h}</th>)}</tr></thead>
          <tbody>{files.map((f, i) => <tr key={i} className="h-10 border-b border-[#E5E5E5]"><td className="px-4"><span className="inline-flex items-center gap-2"><FileText size={16} className="text-[#E65A5A]" /><Link>{f.name}</Link></span></td><td className="px-4">{ME.name}</td><td className="px-4">{sfDate(f.date)}</td><td className="px-4">{f.size}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
