import { useState } from 'react'
import { MagnifyingGlass, Plus, Star, DownloadSimple } from '@phosphor-icons/react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import type { Candidate, Job } from './types'
import { Btn, daysSince, type Go } from './shared'
import { activeCount, stageCounts } from './data'
import { CreateJobModal } from './Modals'
import { isStarred } from './Pipeline'

const STATUS_STYLE: Record<Job['status'], string> = {
  open: 'bg-[#E3F5EC] text-[#11734B]',
  draft: 'bg-[#EEF1EF] text-[#3E4F49]',
  closed: 'bg-[#F3EEE6] text-[#7A5A24]',
}

export function JobsList({ go }: { go: Go }) {
  const jobs = useCollection<Job>('greenhouse.jobs')
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const [status, setStatus] = useState<Record<string, boolean>>({ open: true, draft: true, closed: false })
  const [mine, setMine] = useState(false)
  const [dept, setDept] = useState('all')
  const [office, setOffice] = useState('all')
  const [q, setQ] = useState('')
  const [types, setTypes] = useState<Record<string, boolean>>({ 'Full-time': true, 'Part-time': false, Contract: false, Intern: false })
  const [creating, setCreating] = useState(false)
  const { toast } = useDesk()
  const anyType = Object.values(types).some(Boolean)
  const depts = [...new Set(jobs.map((j) => j.department))].sort()
  const offices = [...new Set(jobs.map((j) => j.office))].sort()
  const list = jobs.filter(
    (j) =>
      status[j.status] &&
      (!mine || j.hiringTeam.includes(ME.id)) &&
      (dept === 'all' || j.department === dept) &&
      (office === 'all' || j.office === office) &&
      (!anyType || types[j.employmentType] !== false) &&
      (!q || (j.name + j.reqId).toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div className="flex-1 min-h-0 flex">
      <aside className="w-[260px] shrink-0 border-r border-[#E1E4E2] bg-white overflow-auto p-5 space-y-6">
        <div>
          <div className="text-[12px] uppercase tracking-wide font-semibold text-[#5B6B66] mb-2">Filter jobs</div>
          <div className="flex items-center gap-2 h-9 rounded-md border border-[#C9D0CD] px-2.5">
            <MagnifyingGlass size={15} className="text-[#5B6B66]" />
            <input data-agent="greenhouse-jobs-filter" aria-label="Filter jobs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job name or req ID" className="flex-1 min-w-0 text-[13.5px] outline-none" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="w-4 h-4 accent-[#15372C]" /> My jobs only
        </label>
        <div>
          <div className="text-[13.5px] font-semibold mb-2">Status</div>
          {(['open', 'draft', 'closed'] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 text-[14px] py-1">
              <input type="checkbox" checked={!!status[s]} onChange={(e) => setStatus({ ...status, [s]: e.target.checked })} className="w-4 h-4 accent-[#15372C]" />
              <span className="capitalize">{s}</span>
              <span className="ml-auto text-[12.5px] text-[#7A8884]">{jobs.filter((j) => j.status === s).length}</span>
            </label>
          ))}
        </div>
        <div>
          <div className="text-[13.5px] font-semibold mb-2">Department</div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full h-9 rounded-md border border-[#C9D0CD] px-2 text-[13.5px] bg-white">
            <option value="all">All departments</option>
            {depts.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[13.5px] font-semibold mb-2">Office</div>
          <select value={office} onChange={(e) => setOffice(e.target.value)} className="w-full h-9 rounded-md border border-[#C9D0CD] px-2 text-[13.5px] bg-white">
            <option value="all">All offices</option>
            {offices.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[13.5px] font-semibold mb-2">Employment type</div>
          {['Full-time', 'Part-time', 'Contract', 'Intern'].map((t) => (
            <label key={t} className="flex items-center gap-2 text-[14px] py-1">
              <input type="checkbox" checked={!!types[t]} onChange={(e) => setTypes({ ...types, [t]: e.target.checked })} className="w-4 h-4 accent-[#15372C]" /> {t}
              <span className="ml-auto text-[12.5px] text-[#7A8884]">{jobs.filter((j) => j.employmentType === t).length}</span>
            </label>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Jobs</h1>
              <div className="text-[13.5px] text-[#5B6B66] mt-0.5">{list.length} jobs · {list.reduce((a, j) => a + j.openings - j.filled, 0)} openings</div>
            </div>
            <div className="flex gap-2">
              <Btn data-agent="greenhouse-jobs-export" onClick={() => toast({ appId: 'greenhouse', title: 'Export started', body: `jobs_export.xlsx with ${list.length} jobs will be emailed to ${ME.email}.` })}><DownloadSimple size={16} /> Export</Btn>
              <Btn kind="primary" data-agent="greenhouse-jobs-create" onClick={() => setCreating(true)}><Plus size={16} weight="bold" /> Create a job</Btn>
            </div>
          </div>
          <div className="bg-white border border-[#E1E4E2] rounded-lg overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#5B6B66] border-b border-[#E1E4E2] bg-[#FAFBFA]">
                  <th className="w-8" />
                  <th className="font-semibold py-2.5 px-3">Job</th>
                  <th className="font-semibold px-3">Req ID</th>
                  <th className="font-semibold px-3">Office</th>
                  <th className="font-semibold px-3">Department</th>
                  <th className="font-semibold px-3">Hiring Manager</th>
                  <th className="font-semibold px-2 text-center" title="Application Review / Phone Screen / Onsite / Offer / Hired">Pipeline</th>
                  <th className="font-semibold px-3 text-right">Active</th>
                  <th className="font-semibold px-3 text-right">Openings</th>
                  <th className="font-semibold px-3 text-right">Days open</th>
                  <th className="font-semibold px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((j) => {
                  const m = stageCounts(j.id, cands)
                  return (
                    <tr key={j.id} className="border-b border-[#EDEFEE] last:border-0 hover:bg-[#FAFBFA]">
                      <td className="pl-3">
                        <button aria-label={isStarred(j) ? `Unfollow ${j.name}` : `Follow ${j.name}`} onClick={() => db.update('greenhouse.jobs', j.id, { starred: !isStarred(j) })} className="flex">
                          <Star size={16} weight={isStarred(j) ? 'fill' : 'regular'} className={isStarred(j) ? 'text-[#F0B429]' : 'text-[#B5BFBB] hover:text-[#F0B429]'} />
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <button data-agent={`greenhouse-job-${j.id}`} aria-label={`Open job ${j.name}`} onClick={() => go({ page: 'job', jobId: j.id, tab: 'candidates' })} className="font-semibold text-[14px] text-left hover:underline">
                          {j.name}
                        </button>
                        <div className="text-[12px] text-[#5B6B66]">{j.employmentType}</div>
                      </td>
                      <td className="px-3 text-[#3E4F49] tabular-nums">{j.reqId}</td>
                      <td className="px-3 text-[#3E4F49]">{j.office}</td>
                      <td className="px-3 text-[#3E4F49]">{j.department}</td>
                      <td className="px-3"><span className="flex items-center gap-2"><Avatar id={j.hiringManager} size={22} />{j.hiringManager === ME.id ? 'You' : undefined}{j.hiringManager !== ME.id && <span className="text-[#3E4F49]">{`${ME.id && j.hiringManager ? '' : ''}`}{require(j.hiringManager)}</span>}</span></td>
                      <td className="px-2">
                        <div className="flex items-center justify-center gap-1">
                          {(['application_review', 'phone_screen', 'onsite', 'offer', 'hired'] as const).map((s) => (
                            <span key={s} className={`w-7 h-6 rounded text-[12px] flex items-center justify-center tabular-nums ${m[s] ? 'bg-[#E6F4EE] text-[#15372C] font-semibold' : 'bg-[#F4F6F5] text-[#B5BFBB]'}`}>{m[s]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 text-right tabular-nums font-semibold">{activeCount(j.id, cands)}</td>
                      <td className="px-3 text-right tabular-nums">{j.filled}/{j.openings}</td>
                      <td className="px-3 text-right tabular-nums text-[#3E4F49]">{j.status === 'draft' ? '—' : daysSince(j.openedAt) - (j.closedAt ? daysSince(j.closedAt) : 0)}</td>
                      <td className="px-3"><span className={`inline-flex h-[22px] items-center px-2 rounded text-[12px] font-medium capitalize ${STATUS_STYLE[j.status]}`}>{j.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {creating && <CreateJobModal onClose={() => setCreating(false)} onDone={(id) => (setCreating(false), go({ page: 'job', jobId: id, tab: 'setup' }))} />}
    </div>
  )
}

import { person } from '@/data/people'
function require(id: string) {
  return person(id).name
}
