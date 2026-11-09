/** Workforce console: deploy a batch of headless agents, triage their escalations, read their audit trails. */
import { useEffect, useMemo, useState } from 'react'
import {
  UsersThree,
  RocketLaunch,
  CheckCircle,
  WarningCircle,
  ArrowsClockwise,
  HandPalm,
  X,
  ShieldCheck,
  PencilSimpleLine,
  DownloadSimple,
  CircleNotch,
  Clock,
  UserSwitch,
} from '@phosphor-icons/react'
import { getWorkflow } from '@/workflows'
import { normalizePlan, fmtUsd, VIA_STYLE, RATES } from '@/agent/execution'
import { ViaChip } from '@/agent/AgentWindow'
import { apTemplate, expenseTemplate, incidentTemplate, useFleet, type FleetAgent, type FleetTemplate, type AuditEntry } from '@/agent/fleet'
import { AppStack, Mono } from './shared'

const secs = (ms: number) => (ms < 60000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`)

function useTick(on: boolean) {
  const [, f] = useState(0)
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => f((x) => x + 1), 500)
    return () => clearInterval(t)
  }, [on])
}

const STATUS: Record<FleetAgent['status'], { label: string; bg: string; fg: string }> = {
  queued: { label: 'Queued', bg: '#F1EEE9', fg: '#7A7A87' },
  running: { label: 'Working', bg: '#F1ECF9', fg: '#430693' },
  review: { label: 'Needs review', bg: '#FFF4CE', fg: '#8A5A00' },
  done: { label: 'Done', bg: '#DFF6DD', fg: '#0E700E' },
  handed_back: { label: 'Handed back', bg: '#EDEBE9', fg: '#605E5C' },
}

export function WorkforceView() {
  const templates = useMemo<FleetTemplate[]>(
    () => [apTemplate(normalizePlan(getWorkflow('sap-post-supplier-invoice')?.plan ?? [])), expenseTemplate, incidentTemplate],
    [],
  )
  const { fleet, deploy, resolve, clear } = useFleet()
  const [tplId, setTplId] = useState(templates[0].id)
  const [count, setCount] = useState(10)
  const [audit, setAudit] = useState<string | null>(null)
  const tpl = templates.find((t) => t.id === tplId)!
  const live = !!fleet && !fleet.endedAt
  useTick(live)

  const agents = fleet?.agents ?? []
  const by = (s: FleetAgent['status']) => agents.filter((a) => a.status === s)
  const reviews = by('review')
  const done = by('done')
  const cost = agents.reduce((n, a) => n + a.cost, 0)
  const durations = done.filter((a) => a.startedAt && a.endedAt).map((a) => a.endedAt! - a.startedAt!)
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
  const savedMin = done.length * (fleet?.template.personMinutes ?? 0)
  const auditAgent = agents.find((a) => a.id === audit)

  return (
    <div className="px-10 py-8" data-agent="hw-workforce">
      <div className="flex items-end justify-between gap-6">
        <div>
          <Mono>Workforce</Mono>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight">Deploy a team of agents</h1>
          <p className="mt-1 text-[13.5px] text-[#3A3A44] max-w-[640px]">Give a batch of work to many agents at once. They work in the background, escalate what they shouldn’t decide alone, and leave a full audit trail.</p>
        </div>
        {fleet && (
          <button onClick={clear} className="h-9 px-4 rounded-full border border-[#E1DDD6] text-[12.5px] font-semibold hover:bg-[#F7F5F1]">New deployment</button>
        )}
      </div>

      {!fleet && (
        <div className="mt-7 rounded-2xl border border-[#EAE5DD] p-5 fade-in">
          <Mono>1 · Pick the task</Mono>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTplId(t.id)}
                data-agent={`hw-wf-tpl-${t.id}`}
                className={`text-left rounded-xl p-4 border transition ${tplId === t.id ? 'border-[#430693] bg-[#FBF9FE] shadow-[0_0_0_3px_rgba(113,20,235,0.12)]' : 'border-[#EAE5DD] hover:border-[#D8D2C8]'}`}
              >
                <AppStack apps={t.apps} size={26} />
                <div className="mt-3 text-[14px] font-bold">{t.title}</div>
                <div className="mt-1 text-[12px] text-[#3A3A44] leading-snug">{t.description}</div>
                <div className="mt-3 flex flex-wrap gap-1">{t.plan.map((s, i) => <ViaChip key={i} step={s} compact />)}</div>
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto] gap-6 items-end">
            <div>
              <Mono>2 · How many agents</Mono>
              <div className="mt-3 flex items-center gap-4">
                <input type="range" min={2} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="flex-1 accent-[#430693]" data-agent="hw-wf-count" />
                <span className="w-28 text-[22px] font-bold tabular-nums">{count} <span className="text-[13px] font-semibold text-[#7A7A87]">agents</span></span>
              </div>
              <div className="mt-1 text-[12px] text-[#7A7A87]">
                One {tpl.unit.replace(/s$/, '')} each · about {count * tpl.personMinutes} min of manual work · estimated {fmtUsd(count * 0.09)} in compute
              </div>
            </div>
            <button
              onClick={() => deploy(tpl, count)}
              data-agent="hw-wf-deploy"
              className="h-11 px-6 rounded-full bg-[#0F0E12] hover:bg-[#2A2930] text-white text-[13.5px] font-semibold flex items-center gap-2"
            >
              <RocketLaunch size={16} weight="fill" /> Deploy {count} agents
            </button>
          </div>
        </div>
      )}

      {fleet && (
        <>
          {/* KPIs */}
          <div className="mt-6 grid grid-cols-6 gap-3">
            {[
              ['Working', by('running').length + by('queued').length, '#430693'],
              ['Needs review', reviews.length, '#8A5A00'],
              ['Done', done.length, '#0E700E'],
              ['Handed back', by('handed_back').length, '#605E5C'],
              ['Compute cost', fmtUsd(cost), '#0F0E12'],
              ['Person-time saved', `${Math.floor(savedMin / 60)}h ${savedMin % 60}m`, '#0F0E12'],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-xl border border-[#EAE5DD] px-4 py-3">
                <div className="text-[22px] font-bold tabular-nums" style={{ color: c as string }}>{v}</div>
                <div className="text-[11.5px] text-[#7A7A87]">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11.5px] text-[#7A7A87]">
            <span className="flex items-center gap-1">{live ? <CircleNotch size={12} className="animate-spin text-[#430693]" /> : <CheckCircle size={12} weight="fill" className="text-[#0E700E]" />} {fleet.template.title} · {agents.length} {fleet.template.unit}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {secs((fleet.endedAt ?? Date.now()) - fleet.startedAt)} elapsed{avg ? ` · avg ${secs(avg)} per item` : ''}</span>
            <span>vs ~{agents.length * fleet.template.personMinutes} min by hand · ${(agents.length * fleet.template.personMinutes * RATES.personMinute).toFixed(0)}</span>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_360px] gap-5 items-start">
            {/* agent grid */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {agents.map((a) => (
                <AgentTile key={a.id} a={a} plan={fleet.template.plan} onOpen={() => setAudit(a.id)} />
              ))}
            </div>

            {/* review queue */}
            <div className="rounded-2xl border border-[#EAE5DD] bg-[#FBFAF8] p-4 sticky top-4" data-agent="hw-wf-reviews">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><ShieldCheck size={15} weight="fill" className="text-[#430693]" /><Mono>Review queue</Mono></div>
                {reviews.length > 0 && <span className="h-5 px-2 rounded-full bg-[#8A5A00] text-white text-[11px] font-bold flex items-center">{reviews.length}</span>}
              </div>
              {reviews.length === 0 && <div className="mt-4 mb-2 text-[12.5px] text-[#7A7A87]">Nothing waiting. Agents escalate here when a decision is above their permissions.</div>}
              <div className="mt-3 space-y-3">
                {reviews.map((a) => (
                  <div key={a.id} className="rounded-xl bg-white border border-[#F2D58A] p-3.5 result-in" data-agent={`hw-wf-review-${a.id}`}>
                    <div className="flex items-center gap-2 text-[11.5px] text-[#7A7A87]">
                      <span className="font-bold text-[#0F0E12]">{a.name}</span> · {a.item.label}
                    </div>
                    <div className="mt-1.5 flex items-start gap-1.5 text-[13px] font-bold leading-snug">
                      <WarningCircle size={16} weight="fill" className="text-[#C88A04] mt-[1px] shrink-0" /> {a.item.issue?.title}
                    </div>
                    <div className="mt-1 text-[12px] text-[#3A3A44] leading-snug">{a.item.issue?.detail}</div>
                    {a.item.issue?.suggestion && <div className="mt-2 text-[11.5px] text-[#430693]"><b>Agent suggests:</b> {a.item.issue.suggestion}</div>}
                    <div className="mt-3 flex gap-1.5">
                      <button onClick={() => resolve(a.id, 'approved')} className="flex-1 h-8 rounded-lg bg-[#0F0E12] text-white text-[12px] font-semibold">Approve</button>
                      <button onClick={() => resolve(a.id, 'rejected')} className="flex-1 h-8 rounded-lg border border-[#E1DDD6] bg-white text-[12px] font-semibold">Reject</button>
                      <button onClick={() => resolve(a.id, 'taken_over')} title="Take over this item yourself" className="h-8 px-2.5 rounded-lg border border-[#E1DDD6] bg-white text-[12px] font-semibold flex items-center gap-1"><UserSwitch size={14} /> Take over</button>
                    </div>
                  </div>
                ))}
              </div>
              <RecoveredList agents={agents} onOpen={setAudit} />
            </div>
          </div>
        </>
      )}

      {auditAgent && fleet && <AuditDrawer a={auditAgent} tpl={fleet.template} onClose={() => setAudit(null)} />}
    </div>
  )
}

function AgentTile({ a, plan, onOpen }: { a: FleetAgent; plan: FleetTemplate['plan']; onOpen: () => void }) {
  const st = STATUS[a.status]
  const cur = plan[Math.min(a.step, plan.length - 1)]
  return (
    <button onClick={onOpen} data-agent={`hw-wf-agent-${a.id}`} className={`text-left rounded-xl border bg-white p-3.5 hover:shadow-[0_6px_18px_rgba(15,14,18,0.06)] transition ${a.status === 'review' ? 'border-[#F2D58A]' : 'border-[#EAE5DD]'}`}>
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] font-bold">{a.name}</span>
        <span className="ml-auto h-5 px-2 rounded-full text-[10.5px] font-semibold flex items-center gap-1" style={{ background: st.bg, color: st.fg }}>
          {a.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
          {st.label}
        </span>
      </div>
      <div className="mt-1 text-[12px] font-semibold truncate">{a.item.label}</div>
      <div className="text-[11px] text-[#7A7A87] truncate">{a.item.sub}</div>
      {/* step progress, coloured by execution method */}
      <div className="mt-2.5 flex gap-[3px]">
        {plan.map((s, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-500"
            style={{ background: i < a.step || a.status === 'done' ? VIA_STYLE[s.via].dot : i === a.step && a.status === 'running' ? `${VIA_STYLE[s.via].dot}55` : '#EAE5DD' }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10.5px] text-[#7A7A87]">
        {a.status === 'running' && cur ? <ViaChip step={cur} compact /> : a.status === 'done' ? <span>Audit trail ready</span> : a.status === 'review' ? <span className="text-[#8A5A00] font-semibold">Waiting for you</span> : a.status === 'handed_back' ? <span>{a.decision === 'taken_over' ? 'Taken over by you' : 'Returned to queue'}</span> : <span>Starting…</span>}
        <span className="ml-auto tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{fmtUsd(a.cost)}</span>
      </div>
    </button>
  )
}

function RecoveredList({ agents, onOpen }: { agents: FleetAgent[]; onOpen: (id: string) => void }) {
  const rec = agents.filter((a) => a.log.some((l) => l.kind === 'recover'))
  if (!rec.length) return null
  return (
    <div className="mt-5 pt-4 border-t border-[#EAE5DD]">
      <Mono>Recovered automatically</Mono>
      <div className="mt-2 space-y-2">
        {rec.map((a) => (
          <button key={a.id} onClick={() => onOpen(a.id)} className="w-full text-left flex items-start gap-2 text-[12px] leading-snug hover:bg-white rounded-lg p-1.5 -mx-1.5">
            <ArrowsClockwise size={14} className="text-[#0E700E] mt-[1px] shrink-0" />
            <span><b>{a.name}</b> · {a.item.issue?.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const KIND_ICON: Partial<Record<AuditEntry['kind'], any>> = {
  write: PencilSimpleLine,
  recover: ArrowsClockwise,
  review: HandPalm,
  decision: UsersThree,
  done: CheckCircle,
}

function AuditDrawer({ a, tpl, onClose }: { a: FleetAgent; tpl: FleetTemplate; onClose: () => void }) {
  const t0 = a.log[0]?.t ?? Date.now()
  const writes = a.log.filter((l) => l.kind === 'write')
  const decisions = a.log.filter((l) => l.kind === 'decision')
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ agent: a.name, item: a.item, task: tpl.title, status: a.status, cost: a.cost, log: a.log }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-${a.name.replace(' ', '-').toLowerCase()}-${a.item.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-[#0F0E12]/20 fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[520px] h-full bg-white shadow-[-12px_0_40px_rgba(15,14,18,0.12)] flex flex-col slide-up" data-agent="hw-wf-audit">
        <div className="px-6 pt-5 pb-4 border-b border-[#EAE5DD]">
          <div className="flex items-center gap-2">
            <Mono>Audit trail</Mono>
            <span className="ml-auto" />
            <button onClick={exportJson} className="h-8 px-3 rounded-full border border-[#E1DDD6] text-[12px] font-semibold flex items-center gap-1.5 hover:bg-[#F7F5F1]"><DownloadSimple size={14} /> Export</button>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F1EEE9] flex items-center justify-center"><X size={16} /></button>
          </div>
          <div className="mt-2 text-[17px] font-bold">{a.name} · {a.item.label}</div>
          <div className="text-[12.5px] text-[#7A7A87]">{a.item.sub}</div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              ['Status', STATUS[a.status].label],
              ['Duration', a.startedAt ? secs((a.endedAt ?? Date.now()) - a.startedAt) : '—'],
              ['Cost', fmtUsd(a.cost)],
              ['System changes', String(writes.length)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-[#FBFAF8] border border-[#EAE5DD] px-2.5 py-1.5">
                <div className="text-[13px] font-bold">{v}</div>
                <div className="text-[10.5px] text-[#7A7A87]">{l}</div>
              </div>
            ))}
          </div>
          {decisions.length > 0 && <div className="mt-2 text-[11.5px] text-[#430693] font-semibold">Human decision recorded · {decisions[decisions.length - 1].text}</div>}
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
          <ol className="relative border-l border-[#EAE5DD] ml-1.5 space-y-2.5">
            {a.log.map((l, i) => {
              const Icon = KIND_ICON[l.kind]
              const color = l.kind === 'write' ? '#430693' : l.kind === 'recover' ? '#0E700E' : l.kind === 'review' ? '#C88A04' : l.kind === 'decision' ? '#0B5394' : l.kind === 'done' ? '#0E700E' : undefined
              return (
                <li key={i} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-[5px] w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: color ?? (l.via ? VIA_STYLE[l.via].dot : '#C9C6CF') }} />
                  <div className="flex items-start gap-2">
                    <span className="w-12 shrink-0 text-[10.5px] text-[#9A97A3] pt-[2px] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>+{((l.t - t0) / 1000).toFixed(1)}s</span>
                    <div className="flex-1 min-w-0">
                      {l.kind === 'step' && l.via ? (
                        <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">{l.text} <ViaChip step={{ text: l.text, via: l.via, model: l.model }} compact />{l.cost !== undefined && <span className="text-[10.5px] text-[#9A97A3] font-normal" style={{ fontFamily: 'var(--font-mono)' }}>{fmtUsd(l.cost)}</span>}</div>
                      ) : (
                        <div className={`flex items-start gap-1.5 text-[12px] leading-snug ${l.kind === 'api' || l.kind === 'code' ? 'break-all' : ''}`} style={{ color: color ?? '#3A3A44', fontFamily: l.kind === 'api' || l.kind === 'code' ? 'var(--font-mono)' : undefined, fontWeight: color ? 600 : 400 }}>
                          {Icon && <Icon size={13} weight="bold" className="mt-[2px] shrink-0" />}
                          {l.text}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
