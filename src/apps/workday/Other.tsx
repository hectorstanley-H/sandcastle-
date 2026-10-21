import { DollarSign, HeartPulse, TrendingUp, LayoutGrid, Download } from 'lucide-react'
import { useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { money } from '@/data/time'
import { Btn, Card, Pill, AppIcon } from './ui'
import type { Nav } from './index'
import { TOP_APPS } from './Home'

function Head({ icon, color, title, sub }: { icon: any; color: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 mb-7">
      <AppIcon icon={icon} color={color} size={48} />
      <div>
        <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
        <div className="text-[14px] text-[#5E6A75]">{sub}</div>
      </div>
    </div>
  )
}

export function PayPage() {
  const y = new Date().getFullYear()
  const slips = Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() > 15 ? 15 : 1)
    d.setDate(d.getDate() - i * 15)
    return { date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }), gross: 5500, net: 3871.42 - (i % 3) * 12.5 }
  })
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<DollarSign size={22} />} color="#319C4C" title="Pay" sub="Alex Morgan · US Semi-Monthly" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['Most Recent Net Pay', money(3871.42)], ['YTD Gross', money(5500 * 19)], [`${y} Total Compensation`, '$151,800']].map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-[#E8EBED] p-5">
            <div className="text-[13px] text-[#5E6A75]">{k}</div>
            <div className="text-[24px] font-bold mt-1">{v}</div>
          </div>
        ))}
      </div>
      <Card title="Payslips" action={<Btn size="sm" icon={<Download size={14} />}>Print</Btn>}>
        <table className="w-full text-[14px]">
          <thead><tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]"><th className="px-6 h-10 font-bold">Payment Date</th><th className="font-bold">Type</th><th className="font-bold text-right">Gross Pay</th><th className="font-bold text-right pr-6">Net Pay</th></tr></thead>
          <tbody>{slips.map((s) => <tr key={s.date} className="border-b border-[#F0F1F2]"><td className="px-6 h-11 text-[#0875E1] font-bold">{s.date}</td><td>Regular</td><td className="text-right">{money(s.gross)}</td><td className="text-right pr-6">{money(s.net)}</td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  )
}

export function BenefitsPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<HeartPulse size={22} />} color="#DE2E21" title="Benefits" sub="Open Enrollment 2027 · closes Friday 11:59 PM ET" />
      <div className="grid grid-cols-3 gap-5">
        {[['Medical', 'Aetna Choice POS II — Employee + Spouse', '$186.40 / pay period'], ['Dental', 'Delta Dental PPO — Employee + Spouse', '$18.20 / pay period'], ['Vision', 'VSP Vision Care — Employee', '$4.10 / pay period'], ['401(k)', 'Fidelity — 6% pre-tax, 4% company match', '6% of pay'], ['Life Insurance', 'MetLife Basic Life — 2x salary', 'Company paid'], ['HSA', 'HealthEquity — $150 / pay period', '$150.00 / pay period']].map(([t, p, c]) => (
          <Card key={t}><div className="p-5"><div className="flex items-center justify-between"><div className="text-[16px] font-bold">{t}</div><Pill tone="green">Enrolled</Pill></div><div className="text-[13.5px] mt-2">{p}</div><div className="text-[13px] text-[#5E6A75] mt-1">{c}</div></div></Card>
        ))}
      </div>
      <div className="mt-6"><Btn variant="primary">Change Benefits for Open Enrollment</Btn></div>
    </div>
  )
}

export function PerformancePage({ nav }: { nav: Nav }) {
  const team = useCollection<any>('workday.workers').filter((w) => w.managerId === 'wd-alex')
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<TrendingUp size={22} />} color="#F38B00" title="Team Performance" sub="2026 Mid-Year Review · Operations (Alex Morgan)" />
      <Card title="Reviews">
        <table className="w-full text-[14px]">
          <thead><tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]"><th className="px-6 h-10 font-bold">Worker</th><th className="font-bold">Review</th><th className="font-bold">Status</th><th className="font-bold">Goals</th></tr></thead>
          <tbody>{team.map((w, i) => <tr key={w.id} className="border-b border-[#F0F1F2]" onClick={() => nav({ page: 'worker', workerId: w.id })}><td className="px-6 h-14"><div className="flex items-center gap-3"><Avatar id={w.personId} size={30} /><b className="text-[#0875E1]">{w.name}</b></div></td><td>2026 Mid-Year Review</td><td><Pill tone={w.status !== 'Active' ? 'gray' : i === 0 ? 'orange' : 'green'}>{w.status !== 'Active' ? 'Not Applicable' : i === 0 ? 'Manager Evaluation' : 'Complete'}</Pill></td><td>{w.status !== 'Active' ? '—' : `${3 + i} of ${5 + i} on track`}</td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  )
}

export function AllApps({ nav }: { nav: Nav }) {
  const extra = ['Expenses', 'Learning', 'Career', 'Directory', 'Feedback', 'Goals', 'Org Studio', 'Recruiting', 'Absence', 'Help']
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<LayoutGrid size={22} />} color="#005CB9" title="Apps" sub="All the apps you have access to" />
      <div className="grid grid-cols-4 gap-4">
        {TOP_APPS.map((a) => (
          <button key={a.key} onClick={() => nav(a.route)} className="bg-white rounded-2xl border border-[#E8EBED] p-5 flex items-center gap-3 hover:shadow-md text-left"><AppIcon icon={a.icon} color={a.color} /><span className="text-[14px] font-bold">{a.name}</span></button>
        ))}
        {extra.map((e, i) => (
          <div key={e} className="bg-white rounded-2xl border border-[#E8EBED] p-5 flex items-center gap-3"><AppIcon icon={<LayoutGrid size={18} />} color={['#5E6A75', '#8660D9', '#00A3A3', '#F38B00', '#0875E1'][i % 5]} /><span className="text-[14px] font-bold">{e}</span></div>
        ))}
      </div>
    </div>
  )
}
