import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ArrowUp, Eye, Play, ArrowSquareOut, CircleNotch } from '@phosphor-icons/react'
import { WORKFLOWS, matchWorkflows } from '@/workflows'
import { startRun } from '@/agent/runtime'
import { useRuns } from '@/agent/runs'
import { openAgentWindow } from '@/agent/AgentWindow'
import { wm } from '@/os/wm'
import { TASKBAR_H } from '@/os/Taskbar'
import { AppStack, HMark, Mono } from './shared'

/** Quick-deploy panel that opens from the H-Worker icon in the system tray. */
export function TrayFlyout({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const live = useRuns(useShallow((s) => Object.values(s.runs).filter((r) => ['running', 'paused', 'booting'].includes(r.status))))
  const quick = WORKFLOWS.filter((w) => w.featured).slice(0, 6)
  const matches = q.trim().length > 2 ? matchWorkflows(q).slice(0, 4).map((m) => m.wf) : []
  const deploy = (id: string, prompt?: string) => {
    startRun(id, {}, { prompt })
    onClose()
  }
  return (
    <>
      <div className="absolute inset-0 z-[9100]" onPointerDown={onClose} />
      <div
        className="absolute right-3 z-[9101] w-[400px] rounded-2xl overflow-hidden bg-white text-[#0F0E12] slide-up"
        style={{ bottom: TASKBAR_H + 10, fontFamily: 'var(--font-brand)', boxShadow: '0 24px 60px rgba(15,14,18,0.28), 0 0 0 1px rgba(15,14,18,0.08)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="relative px-5 pt-5 pb-4 bg-[#0F0E12] text-white overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(360px 180px at 100% 0%, rgba(113,20,235,0.6), transparent 70%)' }} />
          <div className="relative flex items-center gap-2.5">
            <HMark className="h-[13px]" color="#fff" />
            <span className="text-[14px] font-bold">H-Worker</span>
            <div className="flex-1" />
            <span className="text-[11px] text-white/60" style={{ fontFamily: 'var(--font-mono)' }}>{10 - live.length} / 10 AVAILABLE</span>
          </div>
          <div className="relative mt-4 flex items-center h-10 rounded-full bg-white/10 border border-white/15 pl-4 pr-1">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && matches[0] && deploy(matches[0].id, q)}
              placeholder="What should an H-Worker do?"
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/50"
            />
            <button disabled={!matches[0]} onClick={() => matches[0] && deploy(matches[0].id, q)} className="w-8 h-8 rounded-full bg-white text-[#0F0E12] disabled:opacity-40 flex items-center justify-center">
              <ArrowUp size={14} weight="bold" />
            </button>
          </div>
        </div>
        {matches.length > 0 && (
          <div className="px-3 pt-3">
            <Mono className="px-2">Best matches</Mono>
            {matches.map((wf) => (
              <button key={wf.id} onClick={() => deploy(wf.id, q)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#F7F5F1] text-left">
                <AppStack apps={wf.apps} size={24} max={3} />
                <span className="flex-1 text-[12.5px] font-semibold truncate">{wf.title}</span>
                <Play size={12} weight="fill" />
              </button>
            ))}
          </div>
        )}
        {live.length > 0 && (
          <div className="px-3 pt-3">
            <Mono className="px-2">Working now</Mono>
            {live.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl">
                <CircleNotch size={18} className="text-[#430693] animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{r.name} · {r.title}</div>
                  <div className="text-[11px] text-[#7A7A87] truncate">{r.plan[Math.max(0, r.planIndex)] ?? 'Starting…'}</div>
                </div>
                <button onClick={() => { openAgentWindow(r.id); onClose() }} className="h-7 px-2.5 rounded-full border border-[#E1DDD6] text-[11.5px] font-semibold flex items-center gap-1 hover:bg-[#F7F5F1]"><Eye size={12} /> Watch</button>
              </div>
            ))}
          </div>
        )}
        <div className="px-3 pt-3 pb-2">
          <Mono className="px-2">Quick deploy</Mono>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {quick.map((wf) => (
              <button key={wf.id} data-agent={`tray-deploy-${wf.id}`} onClick={() => deploy(wf.id)} className="group flex flex-col gap-2 p-3 rounded-xl border border-[#EAE5DD] hover:border-[#C2A0EE] hover:bg-[#FBF9FE] text-left">
                <AppStack apps={wf.apps} size={22} max={4} />
                <span className="text-[12px] font-semibold leading-snug line-clamp-2">{wf.title}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            wm().open('main', 'hworker')
            onClose()
          }}
          className="w-full flex items-center justify-between px-5 h-11 border-t border-[#EAE5DD] text-[12.5px] font-semibold hover:bg-[#FBFAF8]"
        >
          Open H-Worker <ArrowSquareOut size={14} />
        </button>
      </div>
    </>
  )
}
