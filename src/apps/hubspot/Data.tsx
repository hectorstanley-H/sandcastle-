/** HubSpot › Goals (revenue quota per rep) and Data management › Properties (schema + fill rates). */
import { Fragment, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Search, Target } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { person } from '@/data/people'
import { HLink, Initials, Pill, hsDate, hsMoney, inputH, useHNav } from './ui'
import { OWNERS } from './owners'
import { LEAD_STATUS, LIFECYCLE, STAGES, TICKET_CATEGORY, TICKET_STATUS, isOpenDeal, weighted } from './store'

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-11 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const monthLabel = (k: string) => new Date(`${k}-15T12:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const shift = (k: string, n: number) => {
  const d = new Date(`${k}-15T12:00`)
  d.setMonth(d.getMonth() + n)
  return monthKey(d)
}
const compact = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`)

/* ───────────────────────── goals ───────────────────────── */

export function GoalsPage() {
  const { go, toast } = useHNav()
  const goals = useCollection<any>('hubspot.goals')
  const deals = useCollection<any>('hubspot.deals')
  const [month, setMonth] = useState(monthKey(new Date()))
  const [editing, setEditing] = useState<string | null>(null)
  const [val, setVal] = useState('')
  const inMonth = (iso?: string) => !!iso && iso.slice(0, 7) === month
  const now = new Date()
  const isCurrent = month === monthKey(now)
  const daysIn = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate()
  const elapsed = month < monthKey(now) ? 1 : isCurrent ? now.getDate() / daysIn : 0

  const rows = OWNERS.map((o) => {
    const g = goals.find((x) => x.ownerId === o.id && x.month === month)
    const won = deals.filter((d) => d.ownerId === o.id && d.stage === 'Closed Won' && inMonth(d.closeDate))
    const pipe = deals.filter((d) => d.ownerId === o.id && isOpenDeal(d) && inMonth(d.closeDate))
    const achieved = won.reduce((t, d) => t + d.amount, 0)
    const forecast = achieved + pipe.reduce((t, d) => t + weighted(d), 0)
    return { o, g, target: g?.target ?? 0, achieved, forecast, won, pipe }
  })
  const team = rows.reduce((t, r) => ({ target: t.target + r.target, achieved: t.achieved + r.achieved, forecast: t.forecast + r.forecast }), { target: 0, achieved: 0, forecast: 0 })
  const saveTarget = (ownerId: string) => {
    const n = Math.max(0, Math.round(Number(val.replace(/[^0-9.]/g, '')) || 0))
    const g = goals.find((x) => x.ownerId === ownerId && x.month === month)
    if (g) db.update('hubspot.goals', g.id, { target: n })
    else db.insert('hubspot.goals', { id: uid('goal'), ownerId, month, target: n })
    setEditing(null)
    toast(`Goal for ${person(ownerId).name} set to ${hsMoney(n)}.`)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-medium">Goals</h1>
          <div className="text-[13px] text-[#516F90]">Monthly revenue goals · Closed Won deals by close date</div>
        </div>
        <div className="flex items-center gap-2" data-agent="hs-goals-month">
          <button aria-label="Previous month" onClick={() => setMonth(shift(month, -1))} className="w-8 h-8 rounded border border-[#CBD6E2] bg-white flex items-center justify-center"><ChevronLeft size={15} /></button>
          <span className="w-[150px] text-center text-[14px] font-medium">{monthLabel(month)}</span>
          <button aria-label="Next month" onClick={() => setMonth(shift(month, 1))} className="w-8 h-8 rounded border border-[#CBD6E2] bg-white flex items-center justify-center"><ChevronRight size={15} /></button>
        </div>
      </div>

      <div className="bg-white border border-[#DFE3EB] rounded-[4px] p-5 flex items-center gap-8">
        <div className="w-12 h-12 rounded-full bg-[#FFF3F0] flex items-center justify-center"><Target size={24} className="text-[#FF5C35]" /></div>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wide text-[#516F90]">Team progress</div>
          <div className="text-[26px] font-light">{compact(team.achieved)} <span className="text-[16px] text-[#516F90]">of {compact(team.target)}</span></div>
        </div>
        <div className="flex-1">
          <Bar pct={team.target ? team.achieved / team.target : 0} forecast={team.target ? team.forecast / team.target : 0} pace={elapsed} />
          <div className="flex justify-between text-[12px] text-[#516F90] mt-1.5">
            <span>{team.target ? Math.round((team.achieved / team.target) * 100) : 0}% attained</span>
            <span>Forecast {compact(team.forecast)} · {isCurrent ? `${Math.round(elapsed * 100)}% of month elapsed` : month < monthKey(now) ? 'Month closed' : 'Not started'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
        <table className="w-full">
          <thead><tr><th className={th}>Owner</th><th className={th}>Goal</th><th className={`${th} w-[34%]`}>Progress</th><th className={th}>Closed won</th><th className={th}>Weighted forecast</th><th className={th}>Status</th><th className={th}>Deals won</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pct = r.target ? r.achieved / r.target : 0
              const status = !r.target ? ['No goal', '#EAF0F6', '#516F90'] : pct >= 1 ? ['Achieved', '#E5F8F6', '#00826F'] : r.forecast / r.target >= Math.max(elapsed, 0.6) ? ['On track', '#E5F5F8', '#007A8C'] : ['At risk', '#FDEDEE', '#C93B44']
              return (
                <tr key={r.o.id} data-agent={`hs-goal-row-${r.o.id}`}>
                  <td className={td}><div className="flex items-center gap-2"><Initials name={r.o.name} size={26} /> {r.o.name}</div></td>
                  <td className={td}>
                    {editing === r.o.id ? (
                      <input autoFocus aria-label="Goal amount" data-agent="hs-goal-input" value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => saveTarget(r.o.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(r.o.id); if (e.key === 'Escape') setEditing(null) }} className={`${inputH} h-8 w-[120px]`} />
                    ) : (
                      <button data-agent={`hs-goal-edit-${r.o.id}`} onClick={() => { setEditing(r.o.id); setVal(String(r.target)) }} className="group flex items-center gap-1.5 tabular-nums">{r.target ? hsMoney(r.target) : 'Set goal'} <Pencil size={11} className="text-[#7C98B6] opacity-0 group-hover:opacity-100" /></button>
                    )}
                  </td>
                  <td className={td}><Bar pct={pct} forecast={r.target ? r.forecast / r.target : 0} pace={elapsed} small /></td>
                  <td className={`${td} tabular-nums`}>{hsMoney(r.achieved)}</td>
                  <td className={`${td} tabular-nums text-[#516F90]`}>{hsMoney(Math.round(r.forecast))}</td>
                  <td className={td}><Pill color={status[1]} text={status[2]}>{status[0]}</Pill></td>
                  <td className={`${td} max-w-[260px] truncate`}>{r.won.length ? r.won.map((d, i) => <span key={d.id}>{i ? ', ' : ''}<HLink onClick={() => go({ page: 'deal', id: d.id })}>{d.name.split(' — ')[0]}</HLink></span>) : <span className="text-[#7C98B6]">--</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Bar({ pct, forecast, pace, small }: { pct: number; forecast: number; pace: number; small?: boolean }) {
  const p = (x: number) => `${Math.min(100, Math.max(0, x * 100))}%`
  return (
    <div className={`relative rounded-full bg-[#EAF0F6] ${small ? 'h-2' : 'h-3'}`}>
      <div className="absolute inset-y-0 left-0 rounded-full bg-[#BFE8EE]" style={{ width: p(forecast) }} title="Weighted forecast" />
      <div className="absolute inset-y-0 left-0 rounded-full bg-[#00A4BD]" style={{ width: p(pct) }} title="Closed won" />
      {pace > 0 && pace < 1 && <div className="absolute -top-1 -bottom-1 w-0.5 bg-[#33475B]" style={{ left: p(pace) }} title="Expected pace" />}
    </div>
  )
}

/* ───────────────────────── properties ───────────────────────── */

type Prop = { label: string; name: string; type: string; group: string; options?: string[] }
const OBJECTS: { id: string; label: string; col: string; props: Prop[] }[] = [
  {
    id: 'contacts', label: 'Contact', col: 'hubspot.contacts', props: [
      { label: 'First name', name: 'firstname', type: 'Single-line text', group: 'Contact information' },
      { label: 'Last name', name: 'lastname', type: 'Single-line text', group: 'Contact information' },
      { label: 'Email', name: 'email', type: 'Single-line text', group: 'Contact information' },
      { label: 'Phone number', name: 'phone', type: 'Phone number', group: 'Contact information' },
      { label: 'Company name', name: 'company', type: 'Single-line text', group: 'Contact information' },
      { label: 'Job title', name: 'jobtitle', type: 'Single-line text', group: 'Contact information' },
      { label: 'City', name: 'city', type: 'Single-line text', group: 'Contact information' },
      { label: 'Country/Region', name: 'country', type: 'Single-line text', group: 'Contact information' },
      { label: 'Lifecycle stage', name: 'lifecyclestage', type: 'Dropdown select', group: 'Contact information', options: LIFECYCLE },
      { label: 'Lead status', name: 'hs_lead_status', type: 'Dropdown select', group: 'Sales properties', options: LEAD_STATUS },
      { label: 'Contact owner', name: 'hubspot_owner_id', type: 'HubSpot user', group: 'Sales properties' },
      { label: 'HubSpot score', name: 'hubspotscore', type: 'Score', group: 'Sales properties' },
      { label: 'Webinar attendance', name: 'webinar_status', type: 'Dropdown select', group: 'Marketing', options: ['Registered', 'Attended'] },
      { label: 'Create date', name: 'createdate', type: 'Date picker', group: 'System' },
      { label: 'Last activity date', name: 'notes_last_updated', type: 'Date picker', group: 'System' },
    ],
  },
  {
    id: 'companies', label: 'Company', col: 'hubspot.companies', props: [
      { label: 'Company name', name: 'name', type: 'Single-line text', group: 'Company information' },
      { label: 'Company domain name', name: 'domain', type: 'Single-line text', group: 'Company information' },
      { label: 'Industry', name: 'industry', type: 'Dropdown select', group: 'Company information' },
      { label: 'Number of employees', name: 'numberofemployees', type: 'Number', group: 'Company information' },
      { label: 'Annual revenue', name: 'annualrevenue', type: 'Number (currency)', group: 'Company information' },
      { label: 'City', name: 'city', type: 'Single-line text', group: 'Company information' },
      { label: 'Country/Region', name: 'country', type: 'Single-line text', group: 'Company information' },
      { label: 'Company owner', name: 'hubspot_owner_id', type: 'HubSpot user', group: 'Sales properties' },
      { label: 'Lifecycle stage', name: 'lifecyclestage', type: 'Dropdown select', group: 'Sales properties', options: LIFECYCLE },
      { label: 'Create date', name: 'createdate', type: 'Date picker', group: 'System' },
    ],
  },
  {
    id: 'deals', label: 'Deal', col: 'hubspot.deals', props: [
      { label: 'Deal name', name: 'dealname', type: 'Single-line text', group: 'Deal information' },
      { label: 'Amount', name: 'amount', type: 'Number (currency)', group: 'Deal information' },
      { label: 'Deal stage', name: 'dealstage', type: 'Pipeline stage', group: 'Deal information', options: STAGES },
      { label: 'Pipeline', name: 'pipeline', type: 'Pipeline', group: 'Deal information' },
      { label: 'Close date', name: 'closedate', type: 'Date picker', group: 'Deal information' },
      { label: 'Priority', name: 'hs_priority', type: 'Dropdown select', group: 'Deal information', options: ['High', 'Medium', 'Low'] },
      { label: 'Deal owner', name: 'hubspot_owner_id', type: 'HubSpot user', group: 'Sales properties' },
      { label: 'Create date', name: 'createdate', type: 'Date picker', group: 'System' },
    ],
  },
  {
    id: 'tickets', label: 'Ticket', col: 'hubspot.tickets', props: [
      { label: 'Ticket name', name: 'subject', type: 'Single-line text', group: 'Ticket information' },
      { label: 'Ticket status', name: 'hs_pipeline_stage', type: 'Pipeline stage', group: 'Ticket information', options: TICKET_STATUS },
      { label: 'Priority', name: 'hs_ticket_priority', type: 'Dropdown select', group: 'Ticket information', options: ['High', 'Medium', 'Low'] },
      { label: 'Category', name: 'hs_ticket_category', type: 'Dropdown select', group: 'Ticket information', options: TICKET_CATEGORY },
      { label: 'Source', name: 'source_type', type: 'Dropdown select', group: 'Ticket information' },
      { label: 'Ticket owner', name: 'hubspot_owner_id', type: 'HubSpot user', group: 'Ticket information' },
      { label: 'Create date', name: 'createdate', type: 'Date picker', group: 'System' },
    ],
  },
]
/** internal name → field on our seed records */
const FIELD: Record<string, string> = {
  firstname: 'firstName', lastname: 'lastName', jobtitle: 'jobTitle', lifecyclestage: 'lifecycleStage', hs_lead_status: 'leadStatus', hubspot_owner_id: 'ownerId', hubspotscore: 'leadScore', webinar_status: 'webinarStatus', createdate: 'createDate',
  notes_last_updated: 'lastActivity', numberofemployees: 'employees', annualrevenue: 'revenue', dealname: 'name', dealstage: 'stage', closedate: 'closeDate', hs_priority: 'priority', hs_pipeline_stage: 'status', hs_ticket_priority: 'priority', hs_ticket_category: 'category', source_type: 'source',
}

export function PropertiesPage() {
  const [obj, setObj] = useState('contacts')
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const o = OBJECTS.find((x) => x.id === obj)!
  const recs = useCollection<any>(o.col)
  const fill = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of o.props) {
      const f = FIELD[p.name] ?? p.name
      m[p.name] = recs.length ? recs.filter((r) => r[f] !== undefined && r[f] !== null && r[f] !== '').length / recs.length : 0
    }
    return m
  }, [recs, o])
  const groups = Array.from(new Set(o.props.map((p) => p.group)))
  const rows = o.props.filter((p) => (!group || p.group === group) && (!q || `${p.label} ${p.name}`.toLowerCase().includes(q.toLowerCase())))
  const values = (p: Prop) => {
    const f = FIELD[p.name] ?? p.name
    const counts = new Map<string, number>()
    recs.forEach((r) => { const v = r[f]; if (v !== undefined && v !== null && v !== '') counts.set(p.type === 'HubSpot user' ? person(v).name : String(v), (counts.get(p.type === 'HubSpot user' ? person(v).name : String(v)) ?? 0) + 1) })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-[22px] font-medium">Properties</h1>
        <div className="text-[13px] text-[#516F90]">The fields stored on each CRM object, and how complete your data is.</div>
      </div>
      <div className="flex items-center gap-4 border-b border-[#DFE3EB]">
        {OBJECTS.map((x) => (
          <button key={x.id} data-agent={`hs-props-object-${x.id}`} onClick={() => { setObj(x.id); setGroup(''); setOpen(null) }} className={`h-10 text-[14px] font-medium border-b-[3px] ${obj === x.id ? 'border-[#FF5C35]' : 'border-transparent text-[#516F90]'}`}>{x.label} properties</button>
        ))}
      </div>
      <div className="bg-white border border-[#DFE3EB] rounded-[4px]">
        <div className="flex items-center gap-2 p-3 border-b border-[#DFE3EB]">
          <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><Search size={14} className="text-[#7C98B6]" /><input aria-label="Search properties" data-agent="hs-props-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search properties" className="flex-1 outline-none text-[13px]" /></div>
          <select aria-label="Group" value={group} onChange={(e) => setGroup(e.target.value)} className={`${inputH} h-8 text-[13px]`}><option value="">All groups</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>
          <span className="ml-auto text-[13px] text-[#516F90]">{rows.length} properties · {recs.length} {o.label.toLowerCase()} records</span>
        </div>
        <table className="w-full">
          <thead><tr><th className={th}>Name</th><th className={th}>Internal name</th><th className={th}>Field type</th><th className={th}>Group</th><th className={`${th} w-[220px]`}>Fill rate</th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const f = fill[p.name] ?? 0
              return (
                <Fragment key={p.name}>
                  <tr className="hover:bg-[#F5F8FA] cursor-pointer" onClick={() => setOpen(open === p.name ? null : p.name)} data-agent={`hs-prop-row-${p.name}`}>
                    <td className={`${td} text-[#0091AE] font-medium`}>{p.label}</td>
                    <td className={`${td} font-mono text-[12.5px] text-[#516F90]`}>{p.name}</td>
                    <td className={td}>{p.type}</td>
                    <td className={td}>{p.group}</td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#EAF0F6]"><div className="h-full rounded-full" style={{ width: `${f * 100}%`, background: f > 0.8 ? '#00BDA5' : f > 0.4 ? '#F5C26B' : '#F2547D' }} /></div>
                        <span className="w-10 text-right tabular-nums text-[12.5px]">{Math.round(f * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                  {open === p.name && (
                    <tr>
                      <td colSpan={5} className="px-6 py-3 bg-[#F5F8FA] border-b border-[#DFE3EB]">
                        <div className="text-[12px] font-semibold uppercase tracking-wide text-[#516F90] mb-2">{p.options ? 'Options' : 'Most common values'}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(p.options ? p.options.map((x) => [x, recs.filter((r) => r[FIELD[p.name] ?? p.name] === x).length] as [string, number]) : values(p)).map(([x, n]) => (
                            <Pill key={x}>{p.type.startsWith('Date') ? hsDate(x) : x} <span className="ml-1 text-[#7C98B6]">{n}</span></Pill>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
