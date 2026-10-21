import { useEffect, useState } from 'react'
import { Desktop } from './os/Desktop'
import { LockScreen } from './os/LockScreen'
import { cancelReset, doReset, useSystem } from './os/system'
import { wm } from './os/wm'
import { startRun } from './agent/runtime'
import { getWorkflow } from './workflows'

function ResetDialog() {
  const open = useSystem((s) => s.resetDialog)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/30 fade-in" style={{ fontFamily: 'var(--font-win)' }}>
      <div className="w-[440px] rounded-lg bg-[#f3f3f3] shadow-2xl overflow-hidden slide-up border border-black/10">
        <div className="p-6 bg-white">
          <div className="text-[20px] font-semibold mb-2">Reset the demo?</div>
          <p className="text-[13.5px] text-black/70 leading-relaxed">
            This clears every change made by you and your H-Workers — sent emails, expense reports, tickets, records and agent history — and
            restores the original demo data. Open windows will close.
          </p>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-black/5">
          <button data-agent="confirm-reset" className="h-8 px-5 rounded bg-[#005FB8] text-white text-[13px] hover:bg-[#1a6fc0]" onClick={doReset}>
            Reset demo
          </button>
          <button className="h-8 px-5 rounded bg-white border border-black/10 text-[13px] hover:bg-[#fafafa]" onClick={cancelReset}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function Resetting() {
  const on = useSystem((s) => s.resetting)
  if (!on) return null
  return (
    <div className="fixed inset-0 z-[20001] flex flex-col items-center justify-center bg-[#0F6CBD] text-white fade-in" style={{ fontFamily: 'var(--font-win)' }}>
      <div className="w-10 h-10 mb-6 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
      <div className="text-[22px] font-light">Restoring demo environment</div>
      <div className="text-[13px] text-white/70 mt-2">Please don’t turn off your PC</div>
    </div>
  )
}

let deepLinked = false

export default function App() {
  const locked = useSystem((s) => s.locked)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    setBooted(true)
    if (deepLinked) return
    deepLinked = true
    // deep-link helpers: ?open=<appId>  ?autorun=<workflowId>&speed=N  (used by the test harness too)
    const q = new URLSearchParams(location.search)
    const open = q.get('open')
    if (open) setTimeout(() => wm().open('main', open, q.get('params') ? JSON.parse(q.get('params')!) : undefined, { maximized: q.has('max') }), 300)
    const auto = q.get('autorun')
    if (auto && getWorkflow(auto)) {
      setTimeout(() => {
        const id = startRun(auto, {}, { speed: Number(q.get('speed')) || 1 })
        if (q.has('max')) {
          const w = wm().desks.main.windows.find((x) => x.params?.runId === id)
          if (w) wm().patch('main', w.id, { maximized: true })
        }
      }, 600)
    }
  }, [])

  return (
    <div className="w-full h-full relative">
      {booted && <Desktop deskId="main" />}
      {locked && <LockScreen />}
      <ResetDialog />
      <Resetting />
    </div>
  )
}
