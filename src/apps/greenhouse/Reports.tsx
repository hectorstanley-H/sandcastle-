import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ChartBar, PlugsConnected, AddressBook } from '@phosphor-icons/react'
import { useCollection } from '@/db/db'
import type { Candidate, Job } from './types'
import { PIPELINE, STAGE_LABEL } from './types'
import { Card, type Go } from './shared'

export function Reports({ go: _go }: { go: Go }) {
  const cands = useCollection<Candidate>('greenhouse.candidates')
  const jobs = useCollection<Job>('greenhouse.jobs')
  const funnel = PIPELINE.map((s) => ({ stage: STAGE_LABEL[s], n: cands.filter((c) => PIPELINE.indexOf(c.stage as any) >= PIPELINE.indexOf(s)).length }))
  const sources = Object.entries(cands.reduce((m: Record<string, number>, c) => ((m[c.source] = (m[c.source] ?? 0) + 1), m), {})).map(([source, n]) => ({ source, n }))
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-[1320px] mx-auto px-8 py-7 space-y-6">
        <h1 className="text-[24px] font-semibold flex items-center gap-2"><ChartBar size={24} /> Reports</h1>
        <div className="grid grid-cols-4 gap-4">
          {[['Open jobs', jobs.filter((j) => j.status === 'open').length], ['Active candidates', cands.filter((c) => c.stage !== 'rejected' && c.stage !== 'hired').length], ['Hires this quarter', cands.filter((c) => c.stage === 'hired').length], ['Avg. time to hire', '34 days']].map(([k, v]) => (
            <div key={k as string} className="bg-white rounded-lg border border-[#E1E4E2] p-5"><div className="text-[13px] text-[#5B6B66]">{k}</div><div className="text-[28px] font-semibold">{v}</div></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Card title="Pipeline funnel"><div className="h-[260px] p-4"><ResponsiveContainer><BarChart data={funnel}><CartesianGrid vertical={false} stroke="#EDEFEE" /><XAxis dataKey="stage" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" fill="#24A47F" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
          <Card title="Candidates by source"><div className="h-[260px] p-4"><ResponsiveContainer><BarChart data={sources}><CartesianGrid vertical={false} stroke="#EDEFEE" /><XAxis dataKey="source" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="n" fill="#15372C" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        </div>
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
