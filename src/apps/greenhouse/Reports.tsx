import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useState } from 'react'
import { ChartBar, PlugsConnected, AddressBook, DownloadSimple } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import type { Candidate, Interview, Job } from './types'
import { PIPELINE, STAGE_LABEL } from './types'
import { Btn, Card, daysSince, fmtDay, type Go, pname } from './shared'

export function Reports({ go }: { go: Go }) {
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const jobs = useCollection<Job>('greenhouse.jobs')
  const interviews = useCollection<Interview>('greenhouse.interviews')
  const { toast } = useDesk()
  const [tab, setTab] = useState<'overview' | 'offers' | 'interviewers' | 'stage'>('overview')
  const funnel = PIPELINE.map((s) => ({ stage: STAGE_LABEL[s], n: cands.filter((c) => PIPELINE.indexOf(c.stage as any) >= PIPELINE.indexOf(s)).length }))
  const sources = Object.entries(cands.reduce((m: Record<string, number>, c) => ((m[c.source] = (m[c.source] ?? 0) + 1), m), {})).map(([source, n]) => ({ source, n }))
  const offers = cands.filter((c) => c.offer)
  const people = [...new Set(interviews.flatMap((i) => i.interviewers))]
  const ivRows = people
    .map((p) => {
      const mine = interviews.filter((i) => i.interviewers.includes(p) && i.status !== 'cancelled')
      const done = mine.filter((i) => +new Date(i.end) < Date.now())
      const cards = cands.flatMap((c) => c.scorecards).filter((s) => s.interviewer === p)
      return { p, upcoming: mine.length - done.length, done: done.length, cards: cards.length }
    })
    .sort((a, b) => b.done + b.upcoming - (a.done + a.upcoming))
  const open = jobs.filter((j) => j.status === 'open')
  const tabs: [typeof tab, string][] = [
    ['overview', 'Pipeline overview'],
    ['offers', 'Offers'],
    ['interviewers', 'Interviewer activity'],
    ['stage', 'Time in stage'],
  ]
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1320px] mx-auto px-8 py-7 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-semibold flex items-center gap-2 flex-1"><ChartBar size={24} /> Reports</h1>
          <Btn data-agent="greenhouse-report-export" onClick={() => toast({ appId: 'greenhouse', title: 'Report exported', body: `${tabs.find((t) => t[0] === tab)?.[1]} report will be emailed to ${ME.email} as .xlsx.` })}>
            <DownloadSimple size={15} /> Export
          </Btn>
        </div>
        <div className="flex gap-6 border-b border-[#E1E4E2]">
          {tabs.map(([k, l]) => (
            <button key={k} data-agent={`greenhouse-report-tab-${k}`} onClick={() => setTab(k)} className={`relative pb-2.5 text-[14px] ${tab === k ? 'font-semibold' : 'text-[#5B6B66]'}`}>
              {l}
              {tab === k && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t bg-[#24A47F]" />}
            </button>
          ))}
        </div>
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-4 gap-4">
              {[['Open jobs', jobs.filter((j) => j.status === 'open').length], ['Active candidates', cands.filter((c) => c.stage !== 'rejected' && c.stage !== 'hired').length], ['Hires this quarter', cands.filter((c) => c.stage === 'hired').length], ['Avg. time to hire', '34 days']].map(([k, v]) => (
                <div key={k as string} className="bg-white rounded-lg border border-[#E1E4E2] p-5"><div className="text-[13px] text-[#5B6B66]">{k}</div><div className="text-[28px] font-semibold">{v}</div></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card title="Pipeline funnel"><div className="h-[260px] p-4"><ResponsiveContainer><BarChart data={funnel}><CartesianGrid vertical={false} stroke="#EDEFEE" /><XAxis dataKey="stage" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" fill="#24A47F" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
              <Card title="Candidates by source"><div className="h-[260px] p-4"><ResponsiveContainer><BarChart data={sources}><CartesianGrid vertical={false} stroke="#EDEFEE" /><XAxis dataKey="source" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" fill="#15372C" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
            </div>
          </>
        )}
        {tab === 'offers' && (
          <Card title={`Offers (${offers.length})`}>
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-[#5B6B66] border-b border-[#E1E4E2]"><th className="px-5 h-10 font-semibold">Candidate</th><th className="font-semibold">Job</th><th className="font-semibold">Base salary</th><th className="font-semibold">Start date</th><th className="font-semibold">Status</th></tr></thead>
              <tbody>
                {offers.map((c) => (
                  <tr key={c.id} onClick={() => go({ page: 'candidate', candidateId: c.id })} className="border-b border-[#EDEFEE] last:border-0 hover:bg-[#F7F8F7] cursor-pointer">
                    <td className="px-5 py-2.5 font-semibold text-[#1B7F62]">{c.name}</td>
                    <td>{jobs.find((j) => j.id === c.jobId)?.name}</td>
                    <td>{c.offer!.salary}</td>
                    <td>{fmtDay(c.offer!.startDate)}</td>
                    <td className="capitalize">{c.offer!.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {tab === 'interviewers' && (
          <Card title="Interviewer activity">
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-[#5B6B66] border-b border-[#E1E4E2]"><th className="px-5 h-10 font-semibold">Interviewer</th><th className="font-semibold text-right">Completed</th><th className="font-semibold text-right">Upcoming</th><th className="font-semibold text-right pr-5">Scorecards submitted</th></tr></thead>
              <tbody>
                {ivRows.map((r) => (
                  <tr key={r.p} className="border-b border-[#EDEFEE] last:border-0">
                    <td className="px-5 py-2.5"><span className="flex items-center gap-2"><Avatar id={r.p} size={24} /> {pname(r.p)}</span></td>
                    <td className="text-right tabular-nums">{r.done}</td>
                    <td className="text-right tabular-nums">{r.upcoming}</td>
                    <td className="text-right tabular-nums pr-5">{r.cards}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {tab === 'stage' && (
          <Card title="Average days in current stage · open jobs">
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-[#5B6B66] border-b border-[#E1E4E2]"><th className="px-5 h-10 font-semibold">Job</th>{PIPELINE.slice(0, 4).map((s) => <th key={s} className="font-semibold text-right">{STAGE_LABEL[s]}</th>)}<th className="pr-5" /></tr></thead>
              <tbody>
                {open.map((j) => (
                  <tr key={j.id} className="border-b border-[#EDEFEE] last:border-0">
                    <td className="px-5 py-2.5"><button onClick={() => go({ page: 'job', jobId: j.id, tab: 'candidates' })} className="font-semibold hover:underline text-left">{j.name}</button></td>
                    {PIPELINE.slice(0, 4).map((s) => {
                      const xs = cands.filter((c) => c.jobId === j.id && c.stage === s)
                      const avg = xs.length ? Math.round(xs.reduce((n, c) => n + daysSince(c.stageEnteredAt), 0) / xs.length) : null
                      return <td key={s} className={`text-right tabular-nums ${avg != null && avg > 14 ? 'text-[#A3302A] font-semibold' : ''}`}>{avg == null ? '—' : `${avg}d`}</td>
                    })}
                    <td className="pr-5" />
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}

export function Placeholder({ page, go: _go }: { page: string; go: Go }) {
  const crm = page === 'crm'
  const I = crm ? AddressBook : PlugsConnected
  const rows = crm
    ? ['Ops leaders — Northeast (42 prospects)', 'Silver medalists 2026 (18)', 'Supply chain meetup Boston (27)', 'University recruiting — MIT / BU (64)']
    : ['Workday — HRIS sync · Connected', 'Okta — SSO · Connected', 'Docusign — Offer letters · Connected', 'Microsoft Outlook — Calendar · Connected', 'Zoom — Interviews · Connected', 'Sterling — Background checks · Connected']
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1000px] mx-auto px-8 py-7">
        <h1 className="text-[24px] font-semibold flex items-center gap-2 mb-5"><I size={24} /> {crm ? 'CRM' : 'Integrations'}</h1>
        <Card>{rows.map((r) => <div key={r} className="px-5 py-3.5 border-b border-[#EDEFEE] last:border-0 text-[14px]">{r}</div>)}</Card>
      </div>
    </div>
  )
}
