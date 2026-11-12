import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { BarChart3, FileBarChart, Users, Clock, ChevronRight, XCircle, Download } from 'lucide-react'
import { useCollection } from '@/db/db'
import type { Nav } from './index'
import { Btn, StatusLabel, fmtD, fmtDT, type Envelope } from './shared'
import { useToast } from './ui'

const REPORTS: [string, string, any, string][] = [
  ['overview', 'Overview', BarChart3, ''],
  ['envelope', 'Envelope Report', FileBarChart, 'Status and details of all envelopes sent by users in the account'],
  ['recipient', 'Recipient Report', Users, 'Recipient activity, authentication and signing times'],
  ['velocity', 'Envelope Velocity', Clock, 'Time from sent to completed, by template and sender'],
  ['declined', 'Declined & Voided Envelopes', XCircle, 'Envelopes declined by recipients or voided by senders'],
]

const hrs = (a?: string, b?: string) => (a && b ? Math.max(0, (+new Date(b) - +new Date(a)) / 3600_000) : null)

function ReportTable({ id, envs, nav }: { id: string; envs: Envelope[]; nav: Nav }) {
  const toast = useToast()
  const live = envs.filter((e) => !e.deleted && e.status !== 'draft').sort((a, b) => +new Date(b.lastChange) - +new Date(a.lastChange))
  const meta = REPORTS.find((r) => r[0] === id)!
  let head: string[] = []
  let rows: { key: string; envId: string; cells: React.ReactNode[] }[] = []
  if (id === 'envelope') {
    head = ['Subject', 'Sender', 'Status', 'Sent', 'Completed']
    rows = live.map((e) => ({ key: e.id, envId: e.id, cells: [e.subject, e.senderName, <StatusLabel key="s" e={e} small />, fmtD(e.sentAt), fmtD(e.completedAt)] }))
  } else if (id === 'recipient') {
    head = ['Recipient', 'Email', 'Envelope', 'Action', 'Status', 'Last activity']
    rows = live.flatMap((e) =>
      e.recipients.map((r, i) => ({ key: e.id + i, envId: e.id, cells: [r.name, r.email, e.subject, r.role === 'cc' ? 'Receives a Copy' : 'Needs to Sign', r.status, fmtDT(r.at)] })),
    )
  } else if (id === 'velocity') {
    head = ['Subject', 'Template', 'Sender', 'Sent', 'Hours to complete']
    rows = live
      .filter((e) => e.status === 'completed')
      .map((e) => ({ key: e.id, envId: e.id, cells: [e.subject, e.templateId ? 'Yes' : 'No', e.senderName, fmtD(e.sentAt), (hrs(e.sentAt, e.completedAt) ?? 0).toFixed(1)] }))
  } else {
    head = ['Subject', 'Status', 'Reason', 'Last change']
    rows = live
      .filter((e) => e.status === 'declined' || e.status === 'voided')
      .map((e) => ({ key: e.id, envId: e.id, cells: [e.subject, <StatusLabel key="s" e={e} small />, e.declineReason ?? e.voidReason ?? '', fmtDT(e.lastChange)] }))
  }
  return (
    <>
      <div className="flex items-center">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">{meta[1]}</h1>
          <div className="text-[13px] text-[#5E5873]">{meta[3]}</div>
        </div>
        <div className="flex-1" />
        <Btn data-agent="docusign-report-export" onClick={() => toast('Export started', `${meta[1]} — ${rows.length} rows (CSV)`)}>
          <Download size={16} /> Export CSV
        </Btn>
      </div>
      <div className="bg-white rounded-lg border border-[#E5E1EC] mt-5 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-[#5E5873] border-b border-[#CBC4D6] bg-[#FAF9FC]">
              {head.map((h) => (
                <th key={h} className="px-4 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} onClick={() => nav.go({ page: 'details', id: r.envId })} className="border-b border-[#F0EDF4] hover:bg-[#FAF9FC] cursor-pointer">
                {r.cells.map((c, i) => (
                  <td key={i} className={`px-4 py-2.5 ${i === 0 ? 'font-semibold max-w-[360px] truncate' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-10 text-center text-[13px] text-[#5E5873]">No rows for this report.</div>}
      </div>
      <div className="text-[12.5px] text-[#5E5873] mt-3">{rows.length} rows</div>
    </>
  )
}

export function Reports({ nav, report = 'overview' }: { nav: Nav; report?: string }) {
  const envs = useCollection<Envelope>('docusign.envelopes')
  const data = useMemo(() => {
    const months: { key: string; label: string; sent: number; completed: number; hours: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), sent: 0, completed: 0, hours: 0 })
    }
    // a believable baseline (account-wide volume) plus the actual envelopes in the db
    const base = [[38, 33, 31], [44, 40, 27], [41, 37, 25], [52, 46, 22], [49, 44, 21], [36, 24, 19]]
    months.forEach((m, i) => {
      m.sent = base[i][0]
      m.completed = base[i][1]
      m.hours = base[i][2]
    })
    for (const e of envs) {
      if (e.sentAt) {
        const d = new Date(e.sentAt)
        const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
        if (m) m.sent++
      }
      if (e.completedAt) {
        const d = new Date(e.completedAt)
        const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
        if (m) m.completed++
      }
    }
    return months
  }, [envs])
  const totSent = data.reduce((s, m) => s + m.sent, 0)
  const totDone = data.reduce((s, m) => s + m.completed, 0)
  const kpis = [
    ['Envelopes sent', totSent, 'Last 6 months'],
    ['Completed', totDone, `${Math.round((totDone / totSent) * 100)}% completion rate`],
    ['Avg. time to complete', '21.4 h', '−18% vs. prior period'],
    ['Declined / Voided', envs.filter((e) => e.status === 'declined' || e.status === 'voided').length + 4, 'Last 6 months'],
  ]
  return (
    <div className="flex-1 min-h-0 flex">
      <aside className="w-[248px] shrink-0 border-r border-[#E5E1EC] py-6 px-4">
        <div className="px-2 mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8B8698]">Reports</div>
        {REPORTS.map(([k, l, I]) => {
          const a = report === k
          return (
            <button
              key={k}
              data-agent={`docusign-report-${k}`}
              onClick={() => nav.go({ page: 'reports', report: k })}
              className={`w-full flex items-center gap-3 h-9 px-2 rounded-[4px] text-[14px] text-left ${a ? 'bg-[#F0EBFF] font-semibold' : 'text-[#3D3551] hover:bg-[#F5F3F8]'}`}
            >
              <I size={17} className={`shrink-0 ${a ? 'text-[#4C00FF]' : 'text-[#5E5873]'}`} /> <span className="truncate">{l}</span>
            </button>
          )
        })}
      </aside>
      <main className="flex-1 min-w-0 overflow-auto bg-[#F7F6FA] px-8 py-6">
        {report !== 'overview' ? (
          <ReportTable id={report} envs={envs} nav={nav} />
        ) : (
        <>
        <div className="flex items-center">
          <h1 className="text-[24px] font-semibold tracking-tight">Overview</h1>
          <div className="flex-1" />
          <span className="text-[13px] text-[#5E5873]">Account: Northwind Global · All users · Last 6 months</span>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-5">
          {kpis.map(([l, v, s]) => (
            <div key={l as string} className="bg-white rounded-lg border border-[#E5E1EC] p-4">
              <div className="text-[13px] text-[#5E5873]">{l}</div>
              <div className="text-[28px] font-semibold mt-1">{v}</div>
              <div className="text-[12px] text-[#8B8698]">{s}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-4 mt-4">
          <div className="bg-white rounded-lg border border-[#E5E1EC] p-5">
            <div className="text-[15px] font-semibold mb-3">Envelopes sent vs. completed</div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#EEEAF3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5E5873' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5E5873' }} width={32} />
                  <Tooltip cursor={{ fill: '#F5F3F8' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sent" name="Sent" fill="#4C00FF" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#FFCC22" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-[#E5E1EC] p-5">
            <div className="text-[15px] font-semibold mb-3">Average time to complete (hours)</div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid vertical={false} stroke="#EEEAF3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5E5873' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5E5873' }} width={32} />
                  <Tooltip />
                  <Line dataKey="hours" name="Hours" stroke="#130032" strokeWidth={2.5} dot={{ r: 3.5, fill: '#130032' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E1EC] mt-4">
          <div className="px-5 h-12 flex items-center text-[15px] font-semibold border-b border-[#E5E1EC]">Standard reports</div>
          {(
            [
              ['envelope', 'Envelope Report', 'Status and details of all envelopes sent by users in the account'],
              ['recipient', 'Envelope Recipient Report', 'Recipient activity, authentication and signing times'],
              ['velocity', 'Envelope Velocity', 'Time from sent to completed, by template and sender'],
              ['declined', 'Declined & Voided Envelopes', 'Envelopes declined by recipients or voided by senders'],
            ] as const
          ).map(([k, t, d]) => (
            <div key={t} className="flex items-center px-5 py-3 border-b border-[#F0EDF4] last:border-0 hover:bg-[#FAF9FC]">
              <FileBarChart size={18} className="text-[#4C00FF] mr-3" />
              <div className="flex-1">
                <div className="text-[14px] font-semibold">{t}</div>
                <div className="text-[12.5px] text-[#5E5873]">{d}</div>
              </div>
              <button data-agent={`docusign-report-run-${k}`} onClick={() => nav.go({ page: 'reports', report: k })} className="text-[13px] font-semibold text-[#4C00FF] flex items-center hover:underline">
                Run <ChevronRight size={15} />
              </button>
            </div>
          ))}
        </div>
        </>
        )}
      </main>
    </div>
  )
}
