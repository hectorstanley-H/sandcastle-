import { useState } from 'react'
import { MagnifyingGlass, DownloadSimple, UserPlus } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME } from '@/data/people'
import type { Candidate, Job, Stage } from './types'
import { STAGE_LABEL } from './types'
import { Btn, fmtDay, type Go, StagePill } from './shared'
import { AddCandidateModal } from './Modals'

export function CandidatesList({ go }: { go: Go }) {
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const jobs = useCollection<Job>('greenhouse.jobs')
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<'all' | 'active' | Stage>('all')
  const [jobF, setJobF] = useState('all')
  const [adding, setAdding] = useState(false)
  const { toast } = useDesk()
  const list = cands
    .filter((c) => !q || `${c.name} ${c.company} ${c.title}`.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => (stage === 'all' ? true : stage === 'active' ? c.stage !== 'rejected' && c.stage !== 'hired' : c.stage === stage))
    .filter((c) => jobF === 'all' || c.jobId === jobF)
    .sort((a, b) => +new Date(b.lastActivity) - +new Date(a.lastActivity))
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-8 pt-6 pb-4 flex items-center gap-4">
        <h1 className="text-[24px] font-semibold flex-1">All Candidates <span className="text-[#5B6B66] font-normal text-[16px]">({list.length})</span></h1>
        <div className="flex items-center gap-2 h-9 w-[300px] rounded-md border border-[#C9D0CD] bg-white px-2.5">
          <MagnifyingGlass size={15} className="text-[#5B6B66]" />
          <input data-agent="greenhouse-candidates-filter" aria-label="Filter candidates" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company or title" className="flex-1 outline-none text-[13.5px]" />
        </div>
        <Btn data-agent="greenhouse-candidates-export" onClick={() => toast({ appId: 'greenhouse', title: 'Export started', body: `candidates_export.xlsx with ${list.length} candidates will be emailed to ${ME.email}.` })}><DownloadSimple size={15} /> Export</Btn>
        <Btn kind="primary" data-agent="greenhouse-candidates-add" onClick={() => setAdding(true)}><UserPlus size={15} /> Add Candidate</Btn>
      </div>
      <div className="px-8 pb-4 flex items-center gap-3 text-[13.5px]">
        <select aria-label="Filter by stage" value={stage} onChange={(e) => setStage(e.target.value as any)} className="h-9 rounded-md border border-[#C9D0CD] px-2 bg-white">
          <option value="all">All stages</option>
          <option value="active">Active (not hired / rejected)</option>
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select aria-label="Filter by job" value={jobF} onChange={(e) => setJobF(e.target.value)} className="h-9 rounded-md border border-[#C9D0CD] px-2 bg-white max-w-[320px]">
          <option value="all">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
        {(stage !== 'all' || jobF !== 'all') && (
          <button onClick={() => (setStage('all'), setJobF('all'))} className="text-[#1B7F62] font-medium hover:underline">
            Clear
          </button>
        )}
      </div>
      {adding && <AddCandidateModal onClose={() => setAdding(false)} onDone={(id) => (setAdding(false), go({ page: 'candidate', candidateId: id }))} />}
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
