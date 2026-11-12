import { Fragment, useMemo, useState } from 'react'
import { MagnifyingGlass, CaretDown, CaretRight, DownloadSimple, CheckCircle, XCircle, Prohibit } from '@phosphor-icons/react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Card, PageHead } from './Admin'
import { Btn, HWChip, fmtOktaTime, isFresh, Menu, type OktaLog } from './shared'

const RANGES: [string, string, number][] = [
  ['24h', 'Last 24 hours', 864e5],
  ['7d', 'Last 7 days', 7 * 864e5],
  ['30d', 'Last 30 days', 30 * 864e5],
  ['all', 'All time', Infinity],
]

/** `field eq "value"` / `field co "value"` queries (System Log filter syntax), else free text */
function matches(l: OktaLog, q: string) {
  const s = q.trim()
  if (!s) return true
  const m = s.match(/^([\w.]+)\s+(eq|co|sw)\s+"([^"]*)"$/i)
  if (m) {
    const [, field, op, val] = m
    const get: Record<string, string> = { eventtype: l.eventType, 'actor.displayname': l.actor.displayName, 'actor.alternateid': l.actor.alternateId, 'outcome.result': l.outcome, 'client.ipaddress': l.ip, 'target.displayname': l.target.map((t) => t.displayName).join(' '), displaymessage: l.displayMessage }
    const v = (get[field.toLowerCase()] ?? '').toLowerCase()
    const w = val.toLowerCase()
    return op.toLowerCase() === 'eq' ? v === w : op.toLowerCase() === 'sw' ? v.startsWith(w) : v.includes(w)
  }
  return `${l.eventType} ${l.displayMessage} ${l.actor.displayName} ${l.target.map((t) => t.displayName).join(' ')}`.toLowerCase().includes(s.toLowerCase())
}

export function SystemLog() {
  const logs = useCollection<OktaLog>('okta.logs')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [range, setRange] = useState('24h')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [outcome, setOutcome] = useState<'all' | 'SUCCESS' | 'FAILURE'>('all')
  const [recent, setRecent] = useState<string[]>([])
  const { toast } = useDesk()
  const span = RANGES.find((r) => r[0] === range)![2]
  const rows = useMemo(() => {
    return [...logs]
      .sort((a, b) => +new Date(b.published) - +new Date(a.published))
      .filter((l) => Date.now() - +new Date(l.published) <= span)
      .filter((l) => outcome === 'all' || (outcome === 'SUCCESS' ? l.outcome === 'SUCCESS' : l.outcome !== 'SUCCESS'))
      .filter((l) => matches(l, q))
  }, [logs, q, span, outcome])
  const commit = () => {
    const s = q.trim()
    if (s) setRecent((r) => [s, ...r.filter((x) => x !== s)].slice(0, 5))
  }
  const hist = useMemo(() => {
    const b: { h: string; n: number }[] = []
    for (let i = 23; i >= 0; i--) {
      const t = Date.now() - i * 3600000
      const d = new Date(t)
      b.push({ h: d.toLocaleTimeString('en-US', { hour: 'numeric' }), n: rows.filter((l) => Math.abs(+new Date(l.published) - t) < 1800000).length })
    }
    return b
  }, [rows])
  return (
    <div>
      <PageHead
        title="System Log"
        actions={
          <>
            <Btn label="Download CSV" onClick={() => toast({ appId: 'okta', title: 'Download started', body: `system_log.csv · ${rows.length} events` })}><DownloadSimple size={15} /> Download CSV</Btn>
            <div className="relative">
              <Btn agent="okta-log-range" label="Time range" onClick={() => setRangeOpen(!rangeOpen)}>{RANGES.find((r) => r[0] === range)![1]} <CaretDown size={13} /></Btn>
              {rangeOpen && <Menu className="left-0 top-10" onClose={() => setRangeOpen(false)} items={RANGES.map(([k, l]) => ({ label: l, onClick: () => setRange(k) }))} />}
            </div>
            <div className="flex rounded-[4px] border border-[#8C8C96] overflow-hidden text-[13px] font-semibold h-9">
              {(['all', 'SUCCESS', 'FAILURE'] as const).map((o) => (
                <button key={o} onClick={() => setOutcome(o)} className={`px-3 ${outcome === o ? 'bg-[#1662DD] text-white' : 'bg-white hover:bg-[#F4F4F4]'}`}>
                  {o === 'all' ? 'All outcomes' : o === 'SUCCESS' ? 'Success' : 'Failure'}
                </button>
              ))}
            </div>
          </>
        }
      />
      <div className="px-8 pb-8 space-y-4">
        <Card pad={false}>
          <div className="p-4 flex gap-2 border-b border-[#EBEBED]">
            <div className="flex items-center gap-2 h-9 flex-1 rounded-[4px] border border-[#8C8C96] px-3">
              <MagnifyingGlass size={16} className="text-[#6E6E78]" />
              <input data-agent="okta-log-search" aria-label="Search System Log" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit()} placeholder='Search (e.g. eventType eq "user.lifecycle.activate")' className="flex-1 outline-none text-[14px] font-mono" />
            </div>
            <Btn primary label="Search" onClick={commit}>Search</Btn>
          </div>
          {recent.length > 0 && (
            <div className="px-4 pt-3 flex items-center gap-2 flex-wrap text-[12px]">
              <span className="text-[#6E6E78]">Recent searches:</span>
              {recent.map((r) => (
                <button key={r} onClick={() => setQ(r)} className="h-6 px-2 rounded-full border border-[#D7D7DC] font-mono hover:border-[#1662DD]">
                  {r}
                </button>
              ))}
            </div>
          )}
          <div className="px-5 pt-3 text-[13px] text-[#6E6E78]">Count of events over time · {rows.length} events</div>
          <div className="h-[120px] px-3 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist}>
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#6E6E78' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#6E6E78' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="n" fill="#1662DD" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card pad={false}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-[#6E6E78] border-b border-[#EBEBED]">
                <th className="w-8"></th>
                <th className="px-2 h-10 font-semibold w-[190px]">Time</th>
                <th className="font-semibold w-[200px]">Actor</th>
                <th className="font-semibold">Event Info</th>
                <th className="font-semibold w-[260px]">Targets</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 120).map((l) => {
                const OI = l.outcome === 'SUCCESS' ? CheckCircle : l.outcome === 'DENY' ? Prohibit : XCircle
                return (
                  <Fragment key={l.id}>
                    <tr data-agent={`okta-log-${l.id}`} onClick={() => setOpen(open === l.id ? null : l.id)} className={`border-b border-[#F1F1F3] align-top hover:bg-[#FAFAFA] ${isFresh(l.published) ? 'flash-new' : ''}`}>
                      <td className="pl-3 pt-3 text-[#6E6E78]">{open === l.id ? <CaretDown size={12} /> : <CaretRight size={12} />}</td>
                      <td className="px-2 py-2.5 text-[#46464F] whitespace-nowrap">{fmtOktaTime(l.published)}</td>
                      <td className="py-2.5">
                        <div className="font-medium flex items-center gap-1.5">{l.actor.displayName}{l.by === 'hworker' && <HWChip />}</div>
                        <div className="text-[12px] text-[#6E6E78]">{l.actor.type}</div>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5"><OI size={15} weight="fill" className={l.outcome === 'SUCCESS' ? 'text-[#1E8A3A]' : 'text-[#DA372C]'} /> {l.displayMessage}</div>
                        <div className="text-[12px] text-[#6E6E78] font-mono mt-0.5">{l.eventType}</div>
                      </td>
                      <td className="py-2.5 pr-4">
                        {l.target.slice(0, 2).map((t, i) => (
                          <div key={i} className="truncate"><span className="text-[#6E6E78]">{t.type}:</span> {t.displayName}</div>
                        ))}
                      </td>
                    </tr>
                    {open === l.id && (
                      <tr className="bg-[#FAFAFA] border-b border-[#F1F1F3]">
                        <td></td>
                        <td colSpan={4} className="px-2 py-3 font-mono text-[12px] text-[#46464F] leading-[18px]">
                          outcome.result: {l.outcome}<br />client.ipAddress: {l.ip}<br />client.geographicalContext: {l.location}<br />client.userAgent: {l.client}<br />actor.alternateId: {l.actor.alternateId}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
