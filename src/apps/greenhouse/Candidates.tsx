import { useState } from 'react'
import { MagnifyingGlass, DownloadSimple } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import type { Candidate, Job } from './types'
import { Btn, fmtDay, type Go, StagePill } from './shared'

export function CandidatesList({ go }: { go: Go }) {
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const jobs = useCollection<Job>('greenhouse.jobs')
  const [q, setQ] = useState('')
  const list = cands.filter((c) => !q || `${c.name} ${c.company} ${c.title}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => +new Date(b.lastActivity) - +new Date(a.lastActivity))
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-8 pt-6 pb-4 flex items-center gap-4">
        <h1 className="text-[24px] font-semibold flex-1">All Candidates <span className="text-[#5B6B66] font-normal text-[16px]">({list.length})</span></h1>
        <div className="flex items-center gap-2 h-9 w-[300px] rounded-md border border-[#C9D0CD] bg-white px-2.5">
          <MagnifyingGlass size={15} className="text-[#5B6B66]" />
          <input data-agent="greenhouse-candidates-filter" aria-label="Filter candidates" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company or title" className="flex-1 outline-none text-[13.5px]" />
        </div>
        <Btn><DownloadSimple size={15} /> Export</Btn>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-8 pb-8">
        <div className="bg-white rounded-lg border border-[#E1E4E2]">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] text-[#5B6B66] border-b border-[#E1E4E2]">
                <th className="px-5 h-10 font-semibold">Name</th>
                <th className="font-semibold">Job</th>
                <th className="font-semibold">Stage</th>
                <th className="font-semibold">Source</th>
                <th className="font-semibold">Applied</th>
                <th className="font-semibold">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} data-agent={`greenhouse-candidate-${c.id}`} onClick={() => go({ page: 'candidate', candidateId: c.id })} className="border-b border-[#EDEFEE] hover:bg-[#F7F8F7]">
                  <td className="px-5 py-2.5">
                    <div className="font-semibold text-[#1B7F62]">{c.name}</div>
                    <div className="text-[12.5px] text-[#5B6B66]">{c.title} at {c.company}</div>
                  </td>
                  <td>{jobs.find((j) => j.id === c.jobId)?.name}</td>
                  <td><StagePill stage={c.stage} /></td>
                  <td>{c.source}</td>
                  <td>{fmtDay(c.appliedAt)}</td>
                  <td>{fmtDay(c.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
