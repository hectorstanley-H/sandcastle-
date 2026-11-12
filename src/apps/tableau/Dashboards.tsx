/** Dashboards for the non-pipeline workbooks, plus the authoring canvas for new workbooks. */
import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db, useCollection } from '@/db/db'
import { person } from '@/data/people'
import { regionOf, T10, k } from './metrics'
import { btnPrimary, field } from './ui'

const SHEETS: Record<string, string[]> = {
  forecast: ['Forecast Summary', 'Forecast by Rep', 'Commit Detail'],
  winloss: ['Win/Loss Overview', 'Loss Reasons'],
  funnel: ['Funnel', 'Lead Sources', 'Webinar'],
  sla: ['SLA Overview', 'Ticket Backlog'],
  health: ['Health Overview', 'At-Risk Accounts'],
  arr: ['Bookings', 'ARR Trend'],
  superstore: ['Overview', 'Product', 'Customers'],
  blank: ['Sheet 1'],
}
export const sheetsFor = (wb: any) => (wb.viz ? ['Sheet 1'] : SHEETS[wb.thumb] ?? ['Dashboard'])

const card = 'bg-white border border-[#E6E6E6] p-3'
const seeded = (i: number, mod = 100) => ((i * 7919 + 104729) % mod) / mod

function Kpis({ items }: { items: [string, string, string][] }) {
  return (
    <div className={`grid gap-3 mb-3`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map(([l, v, s], i) => (
        <div key={l} className="bg-white border border-[#E6E6E6] px-4 py-3 border-t-[3px]" style={{ borderTopColor: T10[i % 10] }}>
          <div className="text-[12px] font-bold text-[#555]">{l}</div>
          <div className="text-[28px] font-bold text-[#333] leading-tight">{v}</div>
          <div className="text-[11px] text-[#777]">{s}</div>
        </div>
      ))}
    </div>
  )
}
function Box({ title, children, h = 240, className = '' }: { title: string; children: ReactNode; h?: number; className?: string }) {
  return (
    <div className={`${card} ${className}`}>
      <div className="text-[13px] font-bold text-[#333] mb-1">{title}</div>
      <div style={{ height: h }}>{children}</div>
    </div>
  )
}
function SimpleTable({ cols, rows }: { cols: [string, string, boolean?][]; rows: any[] }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const list = sort ? [...rows].sort((a, b) => (typeof a[sort.key] === 'number' ? a[sort.key] - b[sort.key] : String(a[sort.key]).localeCompare(String(b[sort.key]))) * sort.dir) : rows
  return (
    <table className="w-full text-[11.5px]">
      <thead>
        <tr className="border-b border-[#DDD]">
          {cols.map(([key, l, r]) => (
            <th key={key} onClick={() => setSort((s) => ({ key, dir: s?.key === key && s.dir === 1 ? -1 : 1 }))} className={`py-1 font-bold text-[#555] cursor-pointer select-none ${r ? 'text-right' : 'text-left'}`}>
              {l}
              {sort?.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{list.map((r, i) => <tr key={i} className="border-b border-[#F0F0F0]">{cols.map(([key, , right]) => <td key={key} className={`py-1 ${right ? 'text-right' : ''}`}>{r[key]}</td>)}</tr>)}</tbody>
    </table>
  )
}

export function OtherDashboard({ wb, sheet }: { wb: any; sheet: string }) {
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const hsContacts = useCollection<any>('hubspot.contacts')
  const tickets = useCollection<any>('hubspot.tickets')
  const kind = wb.viz ? 'custom' : wb.thumb
  const title = wb.viz ? wb.name : `${wb.name}${sheet && sheet !== sheetsFor(wb)[0] ? ` — ${sheet}` : ''}`
  return (
    <div className="bg-white border border-[#E6E6E6] p-4 min-w-[1000px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="text-[20px] font-bold text-[#333]">{title}</div>
      <div className="text-[12px] text-[#777] mb-3">Project: {wb.project} · Owner: {person(wb.owner).name} · Live data</div>
      {kind === 'custom' && <Authoring wb={wb} />}
      {kind === 'forecast' && <Forecast opps={opps} sheet={sheet} />}
      {kind === 'winloss' && <WinLossWb opps={opps} accts={accts} sheet={sheet} />}
      {kind === 'funnel' && <Funnel contacts={hsContacts} sheet={sheet} />}
      {kind === 'sla' && <Sla tickets={tickets} sheet={sheet} />}
      {kind === 'health' && <Health accts={accts} opps={opps} sheet={sheet} />}
      {kind === 'arr' && <Arr opps={opps} sheet={sheet} />}
      {kind === 'superstore' && <Superstore sheet={sheet} />}
      {!['custom', 'forecast', 'winloss', 'funnel', 'sla', 'health', 'arr', 'superstore'].includes(kind) && <Authoring wb={wb} />}
    </div>
  )
}

/* ───────────── forecast ───────────── */
function Forecast({ opps, sheet }: { opps: any[]; sheet: string }) {
  const months = [0, 1, 2, 3, 4, 5].map((i) => new Date(new Date().getFullYear(), new Date().getMonth() + i, 1))
  const open = opps.filter((o) => !o.stage.startsWith('Closed'))
  const data = months.map((m) => {
    const inM = (o: any) => o.closeDate.slice(0, 7) === `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
    const row: any = { month: m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) }
    for (const c of ['Commit', 'Best Case', 'Pipeline']) row[c] = open.filter((o) => inM(o) && o.forecastCategory === c).reduce((t, o) => t + o.amount, 0)
    row.Closed = opps.filter((o) => inM(o) && o.stage === 'Closed Won').reduce((t, o) => t + o.amount, 0)
    return row
  })
  const reps = ['alex', 'liam', 'rachel', 'aisha'].map((r) => {
    const l = open.filter((o) => o.ownerId === r)
    const s = (c: string) => l.filter((o) => o.forecastCategory === c).reduce((t, o) => t + o.amount, 0)
    return { rep: person(r).name, commit: s('Commit'), best: s('Best Case'), pipe: s('Pipeline'), quota: 900_000 }
  })
  const sum = (c: string) => data.reduce((t, r) => t + r[c], 0)
  if (sheet === 'Forecast by Rep')
    return (
      <div className="grid grid-cols-[1.3fr_1fr] gap-3">
        <Box title="Commit + Best Case vs Quota by Rep" h={300}>
          <ResponsiveContainer><BarChart data={reps}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="rep" tick={{ fontSize: 11 }} /><YAxis tickFormatter={k} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => k(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="commit" name="Commit" stackId="a" fill={T10[4]} isAnimationActive={false} /><Bar dataKey="best" name="Best Case" stackId="a" fill={T10[1]} isAnimationActive={false} /><Bar dataKey="quota" name="Quota" fill="#BAB0AC" isAnimationActive={false} /></BarChart></ResponsiveContainer>
        </Box>
        <div className={card}><div className="text-[13px] font-bold mb-2">Rep Forecast</div><SimpleTable cols={[['rep', 'Rep'], ['commitF', 'Commit', true], ['bestF', 'Best Case', true], ['pipeF', 'Pipeline', true], ['cov', 'Coverage', true]]} rows={reps.map((r) => ({ ...r, commitF: k(r.commit), bestF: k(r.best), pipeF: k(r.pipe), cov: `${((r.commit + r.best + r.pipe) / r.quota).toFixed(1)}x` }))} /></div>
      </div>
    )
  if (sheet === 'Commit Detail')
    return (
      <div className={card}>
        <div className="text-[13px] font-bold mb-2">Opportunities in Commit</div>
        <SimpleTable cols={[['name', 'Opportunity'], ['owner', 'Owner'], ['stage', 'Stage'], ['close', 'Close Date'], ['amt', 'Amount', true]]} rows={open.filter((o) => o.forecastCategory === 'Commit').map((o) => ({ name: o.name, owner: person(o.ownerId).name, stage: o.stage, close: new Date(o.closeDate + 'T12:00').toLocaleDateString('en-US'), amt: k(o.amount) }))} />
      </div>
    )
  return (
    <>
      <Kpis items={[['Commit (6 mo)', k(sum('Commit')), 'forecast category'], ['Best Case (6 mo)', k(sum('Best Case')), 'upside'], ['Pipeline (6 mo)', k(sum('Pipeline')), 'early stage'], ['Closed Won (6 mo)', k(sum('Closed')), 'booked']]} />
      <Box title="Forecast by Close Month" h={300}>
        <ResponsiveContainer><BarChart data={data}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tickFormatter={k} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => k(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />{['Closed', 'Commit', 'Best Case', 'Pipeline'].map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={[T10[4], T10[0], T10[1], '#BAB0AC'][i]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer>
      </Box>
    </>
  )
}

/* ───────────── win / loss ───────────── */
const LOSS_REASONS = ['Price', 'Lost to competitor', 'No decision', 'Timing', 'Missing feature']
function WinLossWb({ opps, accts, sheet }: { opps: any[]; accts: any[]; sheet: string }) {
  const closed = opps.filter((o) => o.stage.startsWith('Closed'))
  const won = closed.filter((o) => o.stage === 'Closed Won')
  const lost = closed.filter((o) => o.stage === 'Closed Lost')
  if (sheet === 'Loss Reasons') {
    const reasons = LOSS_REASONS.map((r, i) => ({ reason: r, count: lost.filter((_, j) => j % LOSS_REASONS.length === i).length, amount: lost.filter((_, j) => j % LOSS_REASONS.length === i).reduce((t, o) => t + o.amount, 0) }))
    return (
      <div className="grid grid-cols-2 gap-3">
        <Box title="Lost Deals by Reason" h={280}><ResponsiveContainer><PieChart><Pie data={reasons} dataKey="count" nameKey="reason" outerRadius={100} isAnimationActive={false}>{reasons.map((_, i) => <Cell key={i} fill={T10[i]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></Box>
        <div className={card}><div className="text-[13px] font-bold mb-2">Lost Opportunities</div><SimpleTable cols={[['name', 'Opportunity'], ['reason', 'Reason'], ['amt', 'Amount', true]]} rows={lost.map((o, j) => ({ name: o.name, reason: LOSS_REASONS[j % LOSS_REASONS.length], amt: k(o.amount) }))} /></div>
      </div>
    )
  }
  const byRegion = ['East', 'West', 'Central', 'EMEA'].map((r) => ({ region: r, won: won.filter((o) => regionOf(accts.find((a) => a.id === o.accountId)) === r).length, lost: lost.filter((o) => regionOf(accts.find((a) => a.id === o.accountId)) === r).length }))
  return (
    <>
      <Kpis items={[['Win Rate', `${Math.round((won.length / Math.max(1, closed.length)) * 100)}%`, `${closed.length} closed deals`], ['Won', k(won.reduce((t, o) => t + o.amount, 0)), `${won.length} deals`], ['Lost', k(lost.reduce((t, o) => t + o.amount, 0)), `${lost.length} deals`]]} />
      <Box title="Won vs Lost by Region" h={280}><ResponsiveContainer><BarChart data={byRegion}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="region" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="won" name="Won" fill={T10[4]} isAnimationActive={false} /><Bar dataKey="lost" name="Lost" fill={T10[2]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Box>
    </>
  )
}

/* ───────────── marketing funnel (HubSpot) ───────────── */
const STAGES = ['Subscriber', 'Lead', 'Marketing Qualified Lead', 'Sales Qualified Lead', 'Opportunity', 'Customer']
function Funnel({ contacts, sheet }: { contacts: any[]; sheet: string }) {
  const counts = STAGES.map((s) => ({ stage: s, count: contacts.filter((c) => c.lifecycleStage === s).length }))
  const cum = counts.map((c, i) => ({ ...c, reached: counts.slice(i).reduce((t, x) => t + x.count, 0) }))
  if (sheet === 'Lead Sources') {
    const src = ['Organic search', 'Webinar', 'Paid social', 'Referral', 'Direct', 'Email'].map((s, i) => ({ source: s, contacts: contacts.filter((_, j) => j % 6 === i).length + (s === 'Webinar' ? contacts.filter((c) => c.webinarStatus).length : 0) }))
    return <Box title="Contacts by Original Source" h={300}><ResponsiveContainer><BarChart data={src} layout="vertical" margin={{ left: 20 }}><CartesianGrid horizontal={false} stroke="#EEE" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="source" width={110} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="contacts" fill={T10[0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Box>
  }
  if (sheet === 'Webinar') {
    const reg = contacts.filter((c) => c.webinarStatus)
    const att = reg.filter((c) => c.webinarStatus === 'Attended')
    return (
      <>
        <Kpis items={[['Registrants', String(reg.length), 'AI-Powered Ops Summit'], ['Attended', String(att.length), `${Math.round((att.length / Math.max(1, reg.length)) * 100)}% show rate`], ['Avg Lead Score', String(Math.round(att.reduce((t, c) => t + (c.leadScore ?? 0), 0) / Math.max(1, att.length))), 'attendees']]} />
        <div className={card}><SimpleTable cols={[['name', 'Contact'], ['company', 'Company'], ['status', 'Status'], ['stage', 'Lifecycle'], ['score', 'Score', true]]} rows={reg.map((c) => ({ name: `${c.firstName} ${c.lastName}`, company: c.company, status: c.webinarStatus, stage: c.lifecycleStage, score: c.leadScore }))} /></div>
      </>
    )
  }
  return (
    <>
      <Kpis items={[['Contacts', String(contacts.length), 'all lifecycle stages'], ['MQLs', String(counts[2].count), 'marketing qualified'], ['Lead → MQL', `${Math.round((cum[2].reached / Math.max(1, cum[1].reached)) * 100)}%`, 'conversion']]} />
      <div className={card}>
        <div className="text-[13px] font-bold text-[#333] mb-2">Lifecycle Funnel (contacts reaching each stage)</div>
        {cum.map((c, i) => (
          <div key={c.stage} className="flex items-center gap-3 py-1 text-[12px]">
            <span className="w-[190px] text-right">{c.stage}</span>
            <div className="flex-1 flex justify-center"><div className="h-7 flex items-center justify-center text-white font-bold" style={{ width: `${Math.max(6, (c.reached / Math.max(1, cum[0].reached)) * 100)}%`, background: T10[i] }}>{c.reached}</div></div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ───────────── SLA (HubSpot tickets) ───────────── */
function Sla({ tickets, sheet }: { tickets: any[]; sheet: string }) {
  const weeks = Array.from({ length: 8 }).map((_, i) => ({ week: `W${i + 1}`, attainment: Math.round(88 + seeded(i + 3) * 10), target: 95 }))
  const byPri = ['High', 'Medium', 'Low'].map((p) => ({ priority: p, open: tickets.filter((t) => t.priority === p && !/closed/i.test(t.status ?? '')).length }))
  if (sheet === 'Ticket Backlog') return <div className={card}><div className="text-[13px] font-bold mb-2">Open Tickets</div><SimpleTable cols={[['subject', 'Subject'], ['priority', 'Priority'], ['status', 'Status'], ['category', 'Category']]} rows={tickets.map((t) => ({ subject: t.subject, priority: t.priority, status: t.status, category: t.category ?? t.type ?? '' }))} /></div>
  return (
    <>
      <Kpis items={[['SLA Attainment', `${weeks[7].attainment}%`, 'last week'], ['Open Tickets', String(tickets.length), 'HubSpot Service'], ['High Priority', String(byPri[0].open), 'open'], ['Median First Response', '2h 14m', 'last 30 days']]} />
      <div className="grid grid-cols-[1.3fr_1fr] gap-3">
        <Box title="SLA Attainment vs Target (weekly)"><ResponsiveContainer><LineChart data={weeks}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis domain={[80, 100]} tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="attainment" name="Attainment %" stroke={T10[0]} strokeWidth={2} isAnimationActive={false} /><Line dataKey="target" name="Target %" stroke={T10[2]} strokeDasharray="4 4" isAnimationActive={false} /></LineChart></ResponsiveContainer></Box>
        <Box title="Open Tickets by Priority"><ResponsiveContainer><BarChart data={byPri}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="priority" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="open" isAnimationActive={false}>{byPri.map((_, i) => <Cell key={i} fill={[T10[2], T10[1], T10[4]][i]} />)}</Bar></BarChart></ResponsiveContainer></Box>
      </div>
    </>
  )
}

/* ───────────── customer health ───────────── */
function Health({ accts, opps, sheet }: { accts: any[]; opps: any[]; sheet: string }) {
  const customers = accts
    .filter((a) => String(a.type).startsWith('Customer'))
    .map((a, i) => {
      const score = Math.round(40 + seeded(i * 3 + a.name.length) * 55)
      const s = Math.min(98, Math.max(32, a.name.startsWith('Contoso') ? 92 : score))
      return { name: a.name, score: s, band: s >= 75 ? 'Healthy' : s >= 55 ? 'Neutral' : 'At risk', arr: opps.filter((o) => o.accountId === a.id && o.stage === 'Closed Won').reduce((t, o) => t + o.amount, 0), owner: person(a.ownerId).name }
    })
  const bands = ['Healthy', 'Neutral', 'At risk'].map((b) => ({ band: b, count: customers.filter((c) => c.band === b).length }))
  const rows = (sheet === 'At-Risk Accounts' ? customers.filter((c) => c.band !== 'Healthy') : customers).map((c) => ({ ...c, arrF: k(c.arr) }))
  return (
    <>
      {sheet !== 'At-Risk Accounts' && <Kpis items={[['Customers', String(customers.length), 'active accounts'], ['Healthy', String(bands[0].count), 'score ≥ 75'], ['At Risk', String(bands[2].count), 'score < 55']]} />}
      <div className="grid grid-cols-[1fr_1.4fr] gap-3">
        <Box title="Accounts by Health Band"><ResponsiveContainer><PieChart><Pie data={bands} dataKey="count" nameKey="band" innerRadius={50} outerRadius={95} isAnimationActive={false}>{bands.map((_, i) => <Cell key={i} fill={[T10[4], T10[5], T10[2]][i]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></Box>
        <div className={card}><div className="text-[13px] font-bold mb-2">{sheet === 'At-Risk Accounts' ? 'Accounts needing attention' : 'Health Scores'}</div><SimpleTable cols={[['name', 'Account'], ['owner', 'CSM / Owner'], ['band', 'Band'], ['score', 'Score', true], ['arrF', 'Won ARR', true]]} rows={rows} /></div>
      </div>
    </>
  )
}

/* ───────────── bookings & ARR ───────────── */
function Arr({ opps, sheet }: { opps: any[]; sheet: string }) {
  const months = Array.from({ length: 12 }).map((_, i) => new Date(new Date().getFullYear(), new Date().getMonth() - 11 + i, 1))
  const won = opps.filter((o) => o.stage === 'Closed Won')
  let arr = 18_400_000
  const data = months.map((m, i) => {
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
    const real = won.filter((o) => o.closeDate.slice(0, 7) === key).reduce((t, o) => t + o.amount, 0)
    const bookings = real || Math.round(380_000 + seeded(i + 5) * 520_000)
    arr += bookings - Math.round(90_000 + seeded(i + 11) * 120_000)
    return { month: m.toLocaleDateString('en-US', { month: 'short' }), bookings, arr }
  })
  if (sheet === 'ARR Trend') return <Box title="Ending ARR (12 months)" h={320}><ResponsiveContainer><AreaChart data={data}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tickFormatter={k} tick={{ fontSize: 10 }} width={64} /><Tooltip formatter={(v: any) => k(v)} /><Area dataKey="arr" name="ARR" stroke={T10[0]} fill={T10[0]} fillOpacity={0.2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></Box>
  return (
    <>
      <Kpis items={[['Ending ARR', k(data[11].arr), 'all products'], ['Bookings (12 mo)', k(data.reduce((t, d) => t + d.bookings, 0)), 'new + expansion'], ['Net Retention', '112%', 'trailing 12 months']]} />
      <Box title="Monthly Bookings" h={300}><ResponsiveContainer><BarChart data={data}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tickFormatter={k} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => k(v)} /><Bar dataKey="bookings" fill={T10[4]} isAnimationActive={false} /></BarChart></ResponsiveContainer></Box>
    </>
  )
}

/* ───────────── superstore sample ───────────── */
function Superstore({ sheet }: { sheet: string }) {
  const cats = ['Furniture', 'Office Supplies', 'Technology']
  const regions = ['Central', 'East', 'South', 'West']
  const grid = cats.map((c, i) => {
    const row: any = { category: c }
    regions.forEach((r, j) => (row[r] = Math.round(70_000 + seeded(i * 4 + j + 2) * 110_000)))
    return row
  })
  const subs = ['Phones', 'Chairs', 'Storage', 'Tables', 'Binders', 'Machines', 'Accessories', 'Copiers', 'Bookcases', 'Appliances'].map((s, i) => ({ sub: s, sales: Math.round(90_000 + seeded(i + 21) * 240_000), profit: Math.round(-20_000 + seeded(i + 31) * 60_000) }))
  if (sheet === 'Product') return <Box title="Sales and Profit by Sub-Category" h={320}><ResponsiveContainer><BarChart data={subs} layout="vertical" margin={{ left: 20 }}><CartesianGrid horizontal={false} stroke="#EEE" /><XAxis type="number" tickFormatter={k} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="sub" width={90} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => k(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="sales" name="Sales" fill={T10[0]} isAnimationActive={false} /><Bar dataKey="profit" name="Profit" isAnimationActive={false}>{subs.map((s, i) => <Cell key={i} fill={s.profit < 0 ? T10[2] : T10[1]} />)}</Bar></BarChart></ResponsiveContainer></Box>
  if (sheet === 'Customers') return <div className={card}><SimpleTable cols={[['name', 'Customer'], ['segment', 'Segment'], ['orders', 'Orders', true], ['sales', 'Sales', true]]} rows={['Sean Miller', 'Tamara Chand', 'Raymond Buch', 'Tom Ashbrook', 'Adrian Barton', 'Ken Lonsdale', 'Sanjit Chand', 'Hunter Lopez'].map((n, i) => ({ name: n, segment: ['Consumer', 'Corporate', 'Home Office'][i % 3], orders: 5 + Math.round(seeded(i + 41) * 30), sales: k(Math.round(9_000 + seeded(i + 51) * 20_000)) }))} /></div>
  return (
    <>
      <Kpis items={[['Sales', k(grid.reduce((t, r) => t + regions.reduce((s, x) => s + r[x], 0), 0)), 'all regions'], ['Profit', k(286_397), '12.5% ratio'], ['Orders', '5,009', 'distinct orders']]} />
      <Box title="Sales by Category and Region" h={280}><ResponsiveContainer><BarChart data={grid}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="category" tick={{ fontSize: 11 }} /><YAxis tickFormatter={k} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: any) => k(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />{regions.map((r, i) => <Bar key={r} dataKey={r} fill={T10[i]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer></Box>
    </>
  )
}

/* ───────────── authoring (new workbooks) ───────────── */
const DIMS: [string, string][] = [
  ['stage', 'Stage'],
  ['owner', 'Opportunity Owner'],
  ['region', 'Region'],
  ['leadSource', 'Lead Source'],
  ['type', 'Type'],
  ['forecastCategory', 'Forecast Category'],
]
const MEASURES: [string, string][] = [
  ['sum', 'SUM(Amount)'],
  ['count', 'COUNT(Opportunities)'],
  ['avg', 'AVG(Amount)'],
]

function Authoring({ wb }: { wb: any }) {
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const v = wb.viz ?? {}
  const [dim, setDim] = useState<string>(v.dim ?? '')
  const [measure, setMeasure] = useState<string>(v.measure ?? 'sum')
  const [mark, setMark] = useState<string>(v.mark ?? 'bar')
  const [openOnly, setOpenOnly] = useState<boolean>(v.openOnly ?? true)
  const [saved, setSaved] = useState(false)
  const data = useMemo(() => {
    if (!dim) return []
    const g: Record<string, number[]> = {}
    for (const o of opps.filter((x) => !openOnly || !x.stage.startsWith('Closed'))) {
      const key = dim === 'owner' ? person(o.ownerId).name : dim === 'region' ? regionOf(accts.find((a) => a.id === o.accountId)) : o[dim] || '—'
      ;(g[key] ??= []).push(o.amount)
    }
    return Object.entries(g)
      .map(([name, l]) => ({ name, value: measure === 'count' ? l.length : measure === 'avg' ? Math.round(l.reduce((t, x) => t + x, 0) / l.length) : l.reduce((t, x) => t + x, 0) }))
      .sort((a, b) => b.value - a.value)
  }, [dim, measure, openOnly, opps, accts])
  const fmt = (x: number) => (measure === 'count' ? String(x) : k(x))
  return (
    <div className="flex gap-3">
      <div className="w-[230px] shrink-0 border border-[#E6E6E6] bg-[#FAFAFA] p-3 text-[12.5px] space-y-3">
        <div className="font-bold text-[#333]">Data: Salesforce Opportunities</div>
        <div>
          <div className="text-[11px] font-bold text-[#555] mb-1">Columns (Dimension)</div>
          <select value={dim} onChange={(e) => setDim(e.target.value)} className={field} aria-label="Dimension">
            <option value="">Drop field here…</option>
            {DIMS.map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] font-bold text-[#555] mb-1">Rows (Measure)</div>
          <select value={measure} onChange={(e) => setMeasure(e.target.value)} className={field} aria-label="Measure">
            {MEASURES.map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] font-bold text-[#555] mb-1">Marks</div>
          <div className="grid grid-cols-2 gap-1">
            {['bar', 'line', 'pie', 'text'].map((x) => (
              <button key={x} onClick={() => setMark(x)} className={`h-7 rounded-[3px] border text-[12px] capitalize ${mark === x ? 'border-[#1F457E] bg-[#E1EBF6] font-semibold' : 'border-[#CCC] bg-white'}`}>{x}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open opportunities only</label>
        <button className={`${btnPrimary} w-full`} disabled={!dim} onClick={() => { db.update('tableau.workbooks', wb.id, { viz: { dim, measure, mark, openOnly }, updated: new Date().toISOString() }); setSaved(true); setTimeout(() => setSaved(false), 2000) }}>{saved ? 'Saved ✓' : 'Save'}</button>
      </div>
      <div className="flex-1 border border-[#E6E6E6] p-3 min-h-[360px]">
        {!dim ? (
          <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-[#999] text-[13px] border-2 border-dashed border-[#DDD]">
            <div className="text-[15px] font-semibold text-[#555] mb-1">Drop field here</div>
            Choose a dimension and a measure to build your view.
          </div>
        ) : (
          <>
            <div className="text-[13px] font-bold text-[#333] mb-2">{MEASURES.find(([x]) => x === measure)?.[1]} by {DIMS.find(([x]) => x === dim)?.[1]}</div>
            <div className="h-[320px]">
              {mark === 'text' ? (
                <SimpleTable cols={[['name', DIMS.find(([x]) => x === dim)![1]], ['v', MEASURES.find(([x]) => x === measure)![1], true]]} rows={data.map((d) => ({ name: d.name, v: fmt(d.value) }))} />
              ) : (
                <ResponsiveContainer>
                  {mark === 'pie' ? (
                    <PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={120} isAnimationActive={false}>{data.map((_, i) => <Cell key={i} fill={T10[i % 10]} />)}</Pie><Tooltip formatter={(x: any) => fmt(x)} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
                  ) : mark === 'line' ? (
                    <LineChart data={data}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} /><Tooltip formatter={(x: any) => fmt(x)} /><Line dataKey="value" stroke={T10[0]} strokeWidth={2} isAnimationActive={false} /></LineChart>
                  ) : (
                    <BarChart data={data}><CartesianGrid vertical={false} stroke="#EEE" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} /><Tooltip formatter={(x: any) => fmt(x)} /><Bar dataKey="value" fill={T10[0]} isAnimationActive={false} /></BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
