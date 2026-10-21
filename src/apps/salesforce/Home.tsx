import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CalendarClock, ChevronDown, Lightbulb, RefreshCw, TrendingDown } from 'lucide-react'
import { useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { Card, Link, ObjIcon, sfDate, usd, usdShort, useNav } from './ui'
import { TypeDot } from './Activity'

export function Home() {
  const { go } = useNav()
  const opps = useCollection<any>('salesforce.opportunities')
  const tasks = useCollection<any>('salesforce.tasks')
  const accounts = useCollection<any>('salesforce.accounts')
  const events = useCollection<any>('outlook.events')
  const mine = opps.filter((o) => o.ownerId === ME.id)

  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0)
  const inQ = (o: any) => {
    const d = new Date(o.closeDate + 'T12:00')
    return d >= qStart && d <= qEnd
  }
  const closedQ = opps.filter((o) => o.stage === 'Closed Won' && inQ(o))
  const closed = closedQ.reduce((s, o) => s + o.amount, 0)
  const open70 = opps.filter((o) => !o.stage.startsWith('Closed') && o.probability > 70 && inQ(o)).reduce((s, o) => s + o.amount, 0)
  const goal = 3_600_000

  const data = useMemo(() => {
    const pts: any[] = []
    const days = Math.round((+qEnd - +qStart) / 86400000)
    for (let i = 0; i <= days; i += 7) {
      const d = new Date(+qStart + i * 86400000)
      const c = closedQ.filter((o) => new Date(o.closeDate + 'T12:00') <= d).reduce((s, o) => s + o.amount, 0)
      const past = d <= now
      pts.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Goal: goal,
        Closed: past ? c : null,
        'Closed + Open (>70%)': past ? c + (d >= new Date(+now - 7 * 86400000) ? open70 : 0) : null,
      })
    }
    return pts
  }, [opps])

  const todayTasks = tasks.filter((t) => t.ownerId === ME.id && t.status !== 'Completed').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const todayEvents = events.filter((e) => new Date(e.start).toDateString() === now.toDateString()).sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const keyDeals = mine.filter((o) => !o.stage.startsWith('Closed')).sort((a, b) => b.amount - a.amount).slice(0, 5)
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  const assistant = [
    { icon: AlertTriangle, color: '#FE9339', title: 'Contoso Ltd - Renewal FY27 (3-yr)', body: 'Close date is in 9 days and the opportunity is still in Negotiation/Review.', id: opps.find((o) => o.name.startsWith('Contoso Ltd - Renewal'))?.id },
    { icon: CalendarClock, color: '#0176D3', title: 'Adatum Corporation - Ops Cloud Enterprise', body: 'No activity logged since today’s meeting with Elena Rossi.', id: opps.find((o) => o.name.startsWith('Adatum'))?.id },
    { icon: TrendingDown, color: '#BA0517', title: 'Southridge Video - Production Scheduling', body: 'You have an overdue task: security questionnaire.', id: opps.find((o) => o.name.startsWith('Southridge'))?.id },
    { icon: Lightbulb, color: '#3BA755', title: 'Contoso Ltd - APAC Add-on Seats', body: 'Kate Sullivan’s team grew 14% this quarter — a good time to discuss expansion.', id: opps.find((o) => o.name.includes('APAC'))?.id },
  ]

  return (
    <div className="p-3 flex gap-3 items-start">
      <div className="flex-[2] min-w-0 space-y-3">
        <Card
          title="Quarterly Performance"
          actions={
            <span className="flex items-center gap-2 text-[12px] text-[#444]">
              As of Today {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              <button className="w-7 h-7 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474]">
                <RefreshCw size={13} />
              </button>
            </span>
          }
        >
          <div className="px-4 flex gap-10 pb-2 text-[12px] text-[#444]">
            <div>
              CLOSED <span className="text-[16px] font-bold text-[#181818] ml-1">{usd(closed, false)}</span>
            </div>
            <div>
              OPEN (&gt;70%) <span className="text-[16px] font-bold text-[#181818] ml-1">{usd(open70, false)}</span>
            </div>
            <div>
              GOAL <span className="text-[16px] font-bold text-[#181818] ml-1">{usd(goal, false)}</span>
              <button className="ml-1 text-[#747474]">✎</button>
            </div>
          </div>
          <div className="h-[260px] px-2 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#E5E5E5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#444' }} axisLine={{ stroke: '#C9C9C9' }} tickLine={false} />
                <YAxis tickFormatter={(v) => usdShort(v)} tick={{ fontSize: 11, fill: '#444' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip formatter={(v: any) => usd(v, false)} />
                <Line type="stepAfter" dataKey="Goal" stroke="#7FB348" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Closed" stroke="#FFB75D" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Closed + Open (>70%)" stroke="#1B96FF" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 pb-3 text-[12px] text-[#444]">
            {[['Closed', '#FFB75D'], ['Goal', '#7FB348'], ['Closed + Open (>70%)', '#1B96FF']].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: c }} /> {l}
              </span>
            ))}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card title="Today’s Events" icon="Event" footer="View Calendar">
            <ul className="px-4 pb-2">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex gap-3 py-2 border-b border-[#E5E5E5] last:border-0">
                  <div className="w-16 text-[12px] text-[#444] shrink-0">{new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="min-w-0">
                    <Link className="text-[13px] truncate block">{e.title}</Link>
                    <div className="text-[12px] text-[#444] truncate">{e.location ?? (e.teams ? 'Microsoft Teams Meeting' : '')}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Today’s Tasks" icon="Task" footer="View All" actions={<button className="w-6 h-6 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474]"><ChevronDown size={12} /></button>}>
            <ul className="px-4 pb-2">
              {todayTasks.slice(0, 5).map((t) => (
                <li key={t.id} className={`flex gap-2 py-2 border-b border-[#E5E5E5] last:border-0 ${t.createdBy ? 'flash-new' : ''}`}>
                  <input type="checkbox" readOnly className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <Link className="text-[13px] truncate block" onClick={() => t.whatId && go({ page: 'record', object: 'Opportunity', id: t.whatId })}>
                      {t.subject}
                    </Link>
                    <div className="text-[12px] text-[#444] truncate">{opps.find((o) => o.id === t.whatId)?.name}</div>
                  </div>
                  <span className={`text-[12px] whitespace-nowrap ${new Date(t.dueDate + 'T23:59') < now ? 'text-[#BA0517]' : 'text-[#444]'}`}>{t.dueDate === new Date().toISOString().slice(0, 10) ? 'Today' : sfDate(t.dueDate)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card title="Key Deals - My Opportunities" footer="View All Key Deals" actions={<button className="w-6 h-6 border border-[#C9C9C9] rounded flex items-center justify-center text-[#747474]"><ChevronDown size={12} /></button>}>
          <ul className="px-4 pb-2">
            {keyDeals.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2 border-b border-[#E5E5E5] last:border-0">
                <ObjIcon type="Opportunity" size={24} />
                <div className="flex-1 min-w-0">
                  <Link agent={`sf-keydeal-${o.id}`} className="text-[13px] truncate block" onClick={() => go({ page: 'record', object: 'Opportunity', id: o.id })}>
                    {o.name}
                  </Link>
                  <div className="text-[12px] text-[#444] truncate">
                    {accName(o.accountId)} • {sfDate(o.closeDate)} • {o.stage}
                  </div>
                </div>
                <div className="text-[13px] font-bold">{usd(o.amount, false)}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="flex-1 min-w-[300px] max-w-[420px] space-y-3">
        <Card title="Assistant" icon="Forecasts">
          <ul className="px-3 pb-3 space-y-2">
            {assistant.map((a, i) => (
              <li key={i} className="flex gap-3 p-3 rounded border border-[#E5E5E5]">
                <a.icon size={18} style={{ color: a.color }} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <Link className="text-[13px] font-bold" onClick={() => a.id && go({ page: 'record', object: 'Opportunity', id: a.id })}>
                    {a.title}
                  </Link>
                  <div className="text-[12.5px] text-[#181818] leading-[1.4]">{a.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent Records" footer="View All">
          <ul className="px-4 pb-2">
            {opps.slice(0, 6).map((o, i) => (
              <li key={o.id} className="flex items-center gap-3 py-1.5">
                <ObjIcon type={i % 3 === 2 ? 'Account' : 'Opportunity'} size={24} />
                <Link className="text-[13px] truncate" onClick={() => go({ page: 'record', object: i % 3 === 2 ? 'Account' : 'Opportunity', id: i % 3 === 2 ? o.accountId : o.id })}>
                  {i % 3 === 2 ? accName(o.accountId) : o.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent Activity">
          <ul className="px-4 pb-3 space-y-2">
            {[['call', 'Renewal terms — final pricing', 'Contoso Ltd'], ['email', 'Agenda for the operations walkthrough', 'Adatum Corporation'], ['task', 'Prep walkthrough demo environment', 'Adatum Corporation']].map(([t, s, a]) => (
              <li key={s} className="flex gap-2 items-start">
                <TypeDot type={t} size={20} />
                <div className="min-w-0 text-[12.5px]">
                  <Link className="truncate block">{s}</Link>
                  <div className="text-[#444]">{a}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
