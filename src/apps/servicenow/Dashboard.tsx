import { useState } from 'react'
import { ChevronDown, ChevronRight, Mail } from 'lucide-react'
import { useCollection } from '@/db/db'
import { PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { type Incident, PRIORITY_COLOR, PRIORITY_LABEL, slaFor } from './shared'

const ACTIVE = (i: Incident) => !['Resolved', 'Closed', 'Canceled'].includes(i.state)

function Bars({ rows, onClick }: { rows: { label: string; n: number; color?: string; key?: string }[]; onClick?: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <button key={r.label} onClick={() => onClick?.(r.key ?? r.label)} className="w-full flex items-center gap-3 text-[13px] text-left group">
          <span className="w-[170px] truncate text-[#2E3238] group-hover:underline">{r.label}</span>
          <span className="flex-1 h-4 rounded-[3px] bg-[#EDEFF2] overflow-hidden"><span className="block h-full rounded-[3px]" style={{ width: `${(r.n / max) * 100}%`, background: r.color ?? '#1F6FB2' }} /></span>
          <span className="w-8 text-right font-bold">{r.n}</span>
        </button>
      ))}
    </div>
  )
}

export function Dashboard({ onList, onOpen }: { onList: (filter: string) => void; onOpen: (id: string) => void }) {
  const all = useCollection<Incident>('servicenow.incidents')
  const active = all.filter(ACTIVE)
  const breached = active.filter((i) => slaFor(i).some((s) => s.stage === 'Breached'))
  const resolved7 = all.filter((i) => ['Resolved', 'Closed'].includes(i.state) && Date.now() - +new Date(i.resolvedAt ?? i.updated) < 7 * 864e5)
  const tiles: [string, number, string, string][] = [
    ['Open incidents', active.length, 'open', '#1F6FB2'],
    ['Unassigned', active.filter((i) => !i.assignmentGroup).length, 'unassigned', '#E3242B'],
    ['Critical / High open', active.filter((i) => i.priority <= 2).length, 'p1p2', '#F2A100'],
    ['SLA breached', breached.length, 'open', '#C9302C'],
    ['Resolved (7 days)', resolved7.length, 'resolved', '#2E8540'],
  ]
  const byGroup = Object.entries(active.reduce<Record<string, number>>((m, i) => ((m[i.assignmentGroup || '(empty)'] = (m[i.assignmentGroup || '(empty)'] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])
  const byCat = Object.entries(active.reduce<Record<string, number>>((m, i) => ((m[i.category] = (m[i.category] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])
  // opened per day, last 14 days
  const days = Array.from({ length: 14 }, (_, n) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (13 - n))
    return d
  })
  const opened = days.map((d) => all.filter((i) => new Date(i.opened).toDateString() === d.toDateString()).length)
  const closed = days.map((d) => all.filter((i) => ['Resolved', 'Closed'].includes(i.state) && new Date(i.resolvedAt ?? i.updated).toDateString() === d.toDateString()).length)
  const peak = Math.max(1, ...opened, ...closed)
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F6F7F8]" data-agent="sn-dashboard">
      <div className="px-6 pt-5 pb-10">
        <div className="text-[13px] text-[#5B616B]">Platform Analytics</div>
        <h1 className="text-[22px] font-bold text-[#1B1D21] mb-4">Incident Overview</h1>
        <div className="grid grid-cols-5 gap-3 mb-4">
          {tiles.map(([l, n, f, c]) => (
            <button key={l} onClick={() => onList(f)} className="text-left bg-white rounded-[8px] border border-[#DADDE2] p-4 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
              <div className="text-[13px] text-[#5B616B]">{l}</div>
              <div className="text-[32px] font-bold leading-tight" style={{ color: c }}>{n}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-[8px] border border-[#DADDE2] p-4">
            <div className="text-[15px] font-bold mb-3">Open incidents by priority</div>
            <Bars rows={[1, 2, 3, 4, 5].map((p) => ({ label: PRIORITY_LABEL[p], n: active.filter((i) => i.priority === p).length, color: PRIORITY_COLOR[p] }))} onClick={() => onList('open')} />
          </div>
          <div className="bg-white rounded-[8px] border border-[#DADDE2] p-4">
            <div className="text-[15px] font-bold mb-3">Opened vs resolved (14 days)</div>
            <div className="flex items-end gap-1.5 h-[120px]">
              {days.map((d, n) => (
                <div key={n} className="flex-1 flex flex-col items-center gap-1" title={`${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${opened[n]} opened, ${closed[n]} resolved`}>
                  <div className="w-full flex items-end justify-center gap-[2px] h-[100px]">
                    <span className="w-[45%] rounded-t-[2px] bg-[#1F6FB2]" style={{ height: `${(opened[n] / peak) * 100}%` }} />
                    <span className="w-[45%] rounded-t-[2px] bg-[#62D84E]" style={{ height: `${(closed[n] / peak) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-[#8A9099]">{d.getDate()}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-[12px] text-[#5B616B]"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#1F6FB2]" /> Opened</span><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#62D84E]" /> Resolved</span></div>
          </div>
          <div className="bg-white rounded-[8px] border border-[#DADDE2] p-4">
            <div className="text-[15px] font-bold mb-3">Open incidents by assignment group</div>
            <Bars rows={byGroup.map(([g, n]) => ({ label: g, n, color: g === '(empty)' ? '#E3242B' : '#032D42' }))} onClick={(g) => onList(g === '(empty)' ? 'unassigned' : 'open')} />
          </div>
          <div className="bg-white rounded-[8px] border border-[#DADDE2] p-4">
            <div className="text-[15px] font-bold mb-3">Open incidents by category</div>
            <Bars rows={byCat.map(([c, n]) => ({ label: c, n }))} onClick={() => onList('open')} />
          </div>
        </div>
        <div className="bg-white rounded-[8px] border border-[#DADDE2] p-4">
          <div className="text-[15px] font-bold mb-3">SLA breaches</div>
          {breached.length ? (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left border-b border-[#DADDE2]">{['Number', 'Short description', 'Priority', 'Assignment group', 'Breached SLA'].map((h) => <th key={h} className="py-1.5 pr-3 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {breached.slice(0, 12).map((i) => (
                  <tr key={i.id} className="border-b border-[#EDEFF2]">
                    <td className="py-1.5 pr-3"><button onClick={() => onOpen(i.id)} className="text-[#1F6FB2] hover:underline">{i.number}</button></td>
                    <td className="pr-3 max-w-[380px] truncate">{i.shortDescription}</td>
                    <td className="pr-3">{PRIORITY_LABEL[i.priority]}</td>
                    <td className="pr-3">{i.assignmentGroup || <span className="text-[#8A9099]">(empty)</span>}</td>
                    <td className="pr-3 text-[#C9302C]">{slaFor(i).filter((s) => s.stage === 'Breached').map((s) => s.target).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="text-[13px] text-[#5B616B]">No breached SLAs. 🎉</div>}
        </div>
      </div>
    </div>
  )
}

export function GroupsPage() {
  const groups = useCollection<any>('servicenow.groups')
  const incidents = useCollection<Incident>('servicenow.incidents')
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white" data-agent="sn-groups">
      <div className="h-[52px] shrink-0 flex items-center px-4 border-b border-[#DADDE2] bg-[#F6F7F8] text-[18px] font-bold">Groups <span className="ml-2 text-[13px] font-normal text-[#5B616B]">sys_user_group · {groups.length} records</span></div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[14px]">
          <thead><tr className="border-b-2 border-[#C5CAD3] text-left h-10">{['', 'Name', 'Manager', 'Description', 'Group email', 'Members', 'Open incidents'].map((h) => <th key={h} className="px-3 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {groups.map((g, i) => {
              const n = incidents.filter((x) => x.assignmentGroup === g.name && ACTIVE(x)).length
              return [
                <tr key={g.id} className={`h-[38px] border-b border-[#E4E7EB] cursor-pointer hover:bg-[#EEF4FB] ${i % 2 ? 'bg-[#FAFBFB]' : ''}`} onClick={() => setOpen(open === g.id ? null : g.id)}>
                  <td className="pl-3 w-8 text-[#5B616B]">{open === g.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                  <td className="px-3 text-[#1F6FB2]">{g.name}</td>
                  <td className="px-3">{g.manager}</td>
                  <td className="px-3 text-[13px] text-[#4A5059]">{g.description}</td>
                  <td className="px-3 text-[13px]"><span className="inline-flex items-center gap-1"><Mail size={12} /> {g.email}</span></td>
                  <td className="px-3">{g.members.length}</td>
                  <td className="px-3 font-bold">{n}</td>
                </tr>,
                open === g.id && (
                  <tr key={g.id + '-m'} className="bg-[#F6F7F8] border-b border-[#E4E7EB]">
                    <td />
                    <td colSpan={6} className="px-3 py-3">
                      <div className="text-[12px] font-bold text-[#5B616B] uppercase mb-2">Group members</div>
                      <div className="flex flex-wrap gap-3">
                        {g.members.map((m: string) => (
                          <span key={m} className="flex items-center gap-2 bg-white rounded-[6px] border border-[#DADDE2] px-2.5 py-1.5 text-[13px]">
                            <Avatar name={m} size={24} /> {m}
                            <span className="text-[#8A9099]">· {incidents.filter((x) => x.assignedTo === m && ACTIVE(x)).length} open</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function UsersPage() {
  const [q, setQ] = useState('')
  const rows = PEOPLE.filter((p) => !p.external && (!q || (p.name + ' ' + p.email + ' ' + p.dept).toLowerCase().includes(q.toLowerCase())))
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white" data-agent="sn-users">
      <div className="h-[52px] shrink-0 flex items-center gap-3 px-4 border-b border-[#DADDE2] bg-[#F6F7F8]">
        <span className="text-[18px] font-bold">Users</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search users" className="h-8 w-[240px] px-2 border border-[#8790A1] rounded-[4px] text-[13px] outline-none" />
        <span className="text-[13px] text-[#5B616B]">{rows.length} records</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[14px]">
          <thead><tr className="border-b-2 border-[#C5CAD3] text-left h-10">{['Name', 'User ID', 'Email', 'Title', 'Department', 'Location', 'Phone'].map((h) => <th key={h} className="px-3 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id} className={`h-[38px] border-b border-[#E4E7EB] ${i % 2 ? 'bg-[#FAFBFB]' : ''}`}>
                <td className="px-3"><span className="flex items-center gap-2"><Avatar id={p.id} size={22} /><span className="text-[#1F6FB2]">{p.name}</span></span></td>
                <td className="px-3 text-[13px]">{p.email.split('@')[0]}</td>
                <td className="px-3 text-[13px]">{p.email}</td>
                <td className="px-3">{p.title}</td>
                <td className="px-3">{p.dept}</td>
                <td className="px-3">{p.location}</td>
                <td className="px-3 text-[13px]">{p.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
