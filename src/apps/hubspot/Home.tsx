import { useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { HLink, Pill, hsDate, hsMoney, priorityStyle, useHNav } from './ui'
import { LIFECYCLE, STAGES, STAGE_PROB, isOpenDeal, weighted } from './store'
import { OWNERS } from './owners'

const PAL = ['#00A4BD', '#FF5C35', '#6A78D1', '#00BDA5', '#F5C26B', '#F2547D', '#7C98B6']
const compact = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`)

function Card({ title, children, className = '', right }: { title: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <div className={`bg-white border border-[#DFE3EB] rounded-[4px] ${className}`}>
      <div className="px-4 h-12 flex items-center border-b border-[#DFE3EB]"><span className="text-[14.5px] font-semibold flex-1">{title}</span>{right}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}
const Kpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-white border border-[#DFE3EB] rounded-[4px] p-4"><div className="text-[12px] font-semibold text-[#516F90] tracking-wide uppercase">{label}</div><div className="text-[26px] font-semibold mt-1">{value}</div>{sub && <div className="text-[12.5px] text-[#516F90]">{sub}</div>}</div>
)

function useCrm() {
  const deals = useCollection<any>('hubspot.deals')
  const contacts = useCollection<any>('hubspot.contacts')
  const tasks = useCollection<any>('hubspot.tasks')
  const tickets = useCollection<any>('hubspot.tickets')
  return { deals, contacts, tasks, tickets }
}

export function HomeDashboard() {
  const { go } = useHNav()
  const { deals, contacts, tasks, tickets } = useCrm()
  const [mine, setMine] = useState(false)
  const ds = mine ? deals.filter((d) => d.ownerId === ME.id) : deals
  const open = ds.filter(isOpenDeal)
  const won = ds.filter((d) => d.stage === 'Closed Won')
  const byStage = STAGES.slice(0, 5).map((s) => ({ stage: s.replace('Decision Maker Bought-In', 'Decision Maker').replace('Presentation Scheduled', 'Presentation').replace('Appointment Scheduled', 'Appointment'), amount: ds.filter((d) => d.stage === s).reduce((t, d) => t + d.amount, 0), count: ds.filter((d) => d.stage === s).length }))
  const funnel = LIFECYCLE.map((l) => ({ name: l.replace('Marketing Qualified Lead', 'MQL').replace('Sales Qualified Lead', 'SQL'), value: contacts.filter((c) => c.lifecycleStage === l).length }))
  const myTasks = tasks.filter((t) => t.ownerId === ME.id && t.status !== 'Completed').sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).slice(0, 6)
  const hot = [...contacts].sort((a, b) => b.leadScore - a.leadScore).slice(0, 5)
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center">
        <div className="flex-1"><h1 className="text-[22px] font-medium">Sales dashboard</h1><div className="text-[13px] text-[#516F90]">Live view of pipeline, leads and work due.</div></div>
        <div className="flex border border-[#CBD6E2] rounded-[3px] overflow-hidden text-[13px]">
          {[['All reps', false], ['My deals', true]].map(([l, v]) => <button key={l as string} onClick={() => setMine(v as boolean)} className={`px-3 h-8 ${mine === v ? 'bg-[#33475B] text-white' : 'bg-white'}`}>{l as string}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Open pipeline" value={compact(open.reduce((t, d) => t + d.amount, 0))} sub={`${open.length} open deals`} />
        <Kpi label="Weighted forecast" value={compact(open.reduce((t, d) => t + weighted(d), 0))} sub="Probability-adjusted" />
        <Kpi label="Closed won" value={compact(won.reduce((t, d) => t + d.amount, 0))} sub={`${won.length} deals`} />
        <Kpi label="Open tickets" value={String(tickets.filter((t) => t.status !== 'Closed').length)} sub={`${tickets.filter((t) => t.status === 'Waiting on us').length} waiting on us`} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card title="Pipeline by stage" className="col-span-2">
          <div className="h-[260px]">
            <ResponsiveContainer><BarChart data={byStage} margin={{ left: 0, right: 8 }}><CartesianGrid vertical={false} stroke="#DFE3EB" /><XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#516F90' }} tickLine={false} /><YAxis tickFormatter={compact} tick={{ fontSize: 12, fill: '#516F90' }} tickLine={false} axisLine={false} width={50} /><Tooltip formatter={(v) => hsMoney(Number(v))} /><Bar dataKey="amount" radius={[3, 3, 0, 0]} fill="#00A4BD" /></BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card title="Contacts by lifecycle stage">
          <div className="h-[260px]"><ResponsiveContainer><PieChart><Pie data={funnel} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{funnel.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">{funnel.map((f, i) => <span key={f.name} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: PAL[i % PAL.length] }} />{f.name} {f.value}</span>)}</div>
        </Card>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card title="My tasks" right={<HLink className="text-[13px]" onClick={() => go({ page: 'tasks' })}>View all</HLink>}>
          <div className="space-y-2.5">{myTasks.map((t) => <div key={t.id} className="flex items-center gap-2 text-[13.5px]"><Pill color={priorityStyle[t.priority]?.[0]} text={priorityStyle[t.priority]?.[1]}>{t.priority}</Pill><span className="flex-1 truncate">{t.title}</span><span className={`text-[12px] ${new Date(t.dueDate) < new Date() ? 'text-[#C93B44]' : 'text-[#516F90]'}`}>{hsDate(t.dueDate)}</span></div>)}{!myTasks.length && <div className="text-[13px] text-[#516F90]">You’re all caught up.</div>}</div>
        </Card>
        <Card title="Hottest leads" right={<HLink className="text-[13px]" onClick={() => go({ page: 'contacts' })}>All contacts</HLink>}>
          <div className="space-y-2.5">{hot.map((c) => <div key={c.id} className="flex items-center gap-2 text-[13.5px]"><HLink className="flex-1 truncate" onClick={() => go({ page: 'contact', id: c.id })}>{c.firstName} {c.lastName}</HLink><span className="text-[12px] text-[#516F90] truncate max-w-[110px]">{c.company}</span><span className="w-9 text-right font-semibold text-[#00A38D]">{c.leadScore}</span></div>)}</div>
        </Card>
        <Card title="Biggest open deals" right={<HLink className="text-[13px]" onClick={() => go({ page: 'deals' })}>Deals board</HLink>}>
          <div className="space-y-2.5">{[...open].sort((a, b) => b.amount - a.amount).slice(0, 5).map((d) => <div key={d.id} className="flex items-center gap-2 text-[13.5px]"><HLink className="flex-1 truncate" onClick={() => go({ page: 'deal', id: d.id })}>{d.name}</HLink><span className="font-semibold">{compact(d.amount)}</span></div>)}</div>
        </Card>
      </div>
    </div>
  )
}

export function ReportsPage({ tab: initial }: { tab?: string }) {
  const { deals, contacts, tasks } = useCrm()
  const [tab, setTab] = useState(initial ?? 'Forecast')
  const [owner, setOwner] = useState('')
  const ds = owner ? deals.filter((d) => d.ownerId === owner) : deals
  const open = ds.filter(isOpenDeal)
  const months = useMemo(() => {
    const m: Record<string, { month: string; commit: number; best: number; won: number; key: number }> = {}
    for (const d of ds) {
      const dt = new Date(d.closeDate)
      const k = dt.getFullYear() * 12 + dt.getMonth()
      const e = (m[k] ??= { month: dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), commit: 0, best: 0, won: 0, key: k })
      if (d.stage === 'Closed Won') e.won += d.amount
      else if (d.stage !== 'Closed Lost') { if (STAGES.indexOf(d.stage) >= 3) e.commit += d.amount; else e.best += d.amount }
    }
    return Object.values(m).sort((a, b) => a.key - b.key)
  }, [ds])
  const byOwner = OWNERS.map((o) => ({ name: o.name.split(' ')[0], open: deals.filter((d) => d.ownerId === o.id && isOpenDeal(d)).reduce((t, d) => t + d.amount, 0), won: deals.filter((d) => d.ownerId === o.id && d.stage === 'Closed Won').reduce((t, d) => t + d.amount, 0), deals: deals.filter((d) => d.ownerId === o.id).length }))
  const growth = useMemo(() => {
    const out: { week: string; contacts: number }[] = []
    for (let w = 11; w >= 0; w--) { const end = Date.now() - w * 7 * 86400000; out.push({ week: new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), contacts: contacts.filter((c) => +new Date(c.createDate) <= end).length }) }
    return out
  }, [contacts])
  const winRate = (() => { const w = ds.filter((d) => d.stage === 'Closed Won').length, l = ds.filter((d) => d.stage === 'Closed Lost').length; return w + l ? Math.round((w / (w + l)) * 100) : 0 })()
  const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA]'
  const td = 'px-3 h-11 border-b border-[#DFE3EB] text-[13.5px]'
  return (
    <div className="min-h-full bg-white">
      <div className="px-6 pt-5 flex items-center"><h1 className="text-[22px] font-medium flex-1">{tab === 'Forecast' ? 'Sales forecast' : 'Reports'}</h1>
        <select aria-label="Deal owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 px-2 text-[13px] border border-[#CBD6E2] rounded bg-white"><option value="">All reps</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
      <div className="flex gap-1 px-6 mt-2 border-b border-[#DFE3EB]">{['Forecast', 'Pipeline', 'Team performance', 'Contact growth'].map((t) => <button key={t} data-agent={`hs-report-tab-${t.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setTab(t)} className={`h-11 px-3 text-[14px] relative ${tab === t ? 'font-semibold' : 'text-[#516F90]'}`}>{t}{tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}</button>)}</div>
      <div className="p-6 space-y-4 bg-[#F5F8FA] min-h-[560px]">
        {tab === 'Forecast' && (
          <>
            <div className="grid grid-cols-4 gap-4"><Kpi label="Closed won" value={compact(ds.filter((d) => d.stage === 'Closed Won').reduce((t, d) => t + d.amount, 0))} /><Kpi label="Commit" value={compact(open.filter((d) => STAGES.indexOf(d.stage) >= 3).reduce((t, d) => t + d.amount, 0))} sub="Decision maker bought-in or later" /><Kpi label="Best case" value={compact(open.reduce((t, d) => t + d.amount, 0))} /><Kpi label="Win rate" value={`${winRate}%`} /></div>
            <Card title="Forecast by close month"><div className="h-[300px]"><ResponsiveContainer><BarChart data={months}><CartesianGrid vertical={false} stroke="#DFE3EB" /><XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} /><YAxis tickFormatter={compact} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={50} /><Tooltip formatter={(v) => hsMoney(Number(v))} /><Bar dataKey="won" stackId="a" name="Closed won" fill="#00BDA5" /><Bar dataKey="commit" stackId="a" name="Commit" fill="#00A4BD" /><Bar dataKey="best" stackId="a" name="Best case" fill="#B8C9D9" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
          </>
        )}
        {tab === 'Pipeline' && (
          <Card title="Open deals by stage" className="overflow-hidden">
            <table className="w-full border-collapse"><thead><tr>{['Stage', 'Deals', 'Amount', 'Win probability', 'Weighted amount'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead><tbody>{STAGES.map((s, i) => { const l = ds.filter((d) => d.stage === s); return <tr key={s}><td className={td}>{s}</td><td className={td}>{l.length}</td><td className={td}>{hsMoney(l.reduce((t, d) => t + d.amount, 0))}</td><td className={td}>{Math.round(STAGE_PROB[i] * 100)}%</td><td className={td}>{hsMoney(l.reduce((t, d) => t + d.amount * STAGE_PROB[i], 0))}</td></tr> })}</tbody></table>
          </Card>
        )}
        {tab === 'Team performance' && (
          <>
            <Card title="Pipeline and revenue by rep"><div className="h-[280px]"><ResponsiveContainer><BarChart data={byOwner}><CartesianGrid vertical={false} stroke="#DFE3EB" /><XAxis dataKey="name" tickLine={false} tick={{ fontSize: 12 }} /><YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={50} tick={{ fontSize: 12 }} /><Tooltip formatter={(v) => hsMoney(Number(v))} /><Bar dataKey="open" name="Open pipeline" fill="#00A4BD" /><Bar dataKey="won" name="Closed won" fill="#00BDA5" /></BarChart></ResponsiveContainer></div></Card>
            <Card title="Activity"><table className="w-full border-collapse"><thead><tr>{['Rep', 'Deals', 'Open tasks', 'Overdue tasks'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead><tbody>{OWNERS.map((o) => { const t = tasks.filter((x) => x.ownerId === o.id && x.status !== 'Completed'); return <tr key={o.id}><td className={td}>{person(o.id).name}</td><td className={td}>{deals.filter((d) => d.ownerId === o.id).length}</td><td className={td}>{t.length}</td><td className={`${td} ${t.some((x) => new Date(x.dueDate) < new Date()) ? 'text-[#C93B44] font-semibold' : ''}`}>{t.filter((x) => new Date(x.dueDate) < new Date()).length}</td></tr> })}</tbody></table></Card>
          </>
        )}
        {tab === 'Contact growth' && <Card title="Total contacts, last 12 weeks"><div className="h-[300px]"><ResponsiveContainer><LineChart data={growth}><CartesianGrid vertical={false} stroke="#DFE3EB" /><XAxis dataKey="week" tickLine={false} tick={{ fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12 }} /><Tooltip /><Line type="monotone" dataKey="contacts" stroke="#FF5C35" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></Card>}
      </div>
    </div>
  )
}
