import { useContext, useEffect, useState, type ReactNode } from 'react'
import { DeskContext } from './context'
import { APPS, getApp, logoUrl } from './registry'
import { useWM, wm } from './wm'
import { TrayFlyout } from '@/apps/hworker/TrayFlyout'
import { useRuns } from '@/agent/runs'
import { setTray, useSystem } from './system'

export const TASKBAR_H = 48

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return now
}

function TbButton({ children, onClick, active, running, label, agent }: { children: ReactNode; onClick?: () => void; active?: boolean; running?: boolean; label: string; agent?: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      data-agent={agent}
      onClick={onClick}
      className={`group relative w-10 h-10 rounded-[5px] flex items-center justify-center transition-colors ${active ? 'bg-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]' : 'hover:bg-white/50'}`}
    >
      <span className="transition-transform group-active:scale-90 flex">{children}</span>
      {running && (
        <span
          className={`absolute bottom-[1px] h-[3px] rounded-full transition-all ${active ? 'w-4 bg-[#005FB8]' : 'w-1.5 bg-[#8a8a8a]'}`}
        />
      )}
    </button>
  )
}

const WinLogo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="wl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#28AFEA" />
        <stop offset="1" stopColor="#0B62C4" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="10.4" height="10.4" rx="1" fill="url(#wl)" />
    <rect x="12.6" y="1" width="10.4" height="10.4" rx="1" fill="url(#wl)" />
    <rect x="1" y="12.6" width="10.4" height="10.4" rx="1" fill="url(#wl)" />
    <rect x="12.6" y="12.6" width="10.4" height="10.4" rx="1" fill="url(#wl)" />
  </svg>
)

export function Taskbar() {
  const { deskId, isAgent } = useContext(DeskContext)
  const desk = useWM((s) => s.desks[deskId])
  const now = useClock()
  const trayOpen = useSystem((s) => s.trayOpen)
  const setTrayOpen = (fn: (o: boolean) => boolean) => setTray(fn(trayOpen))
  const runningAgents = useRuns((s) => Object.values(s.runs).filter((r) => r.host !== 'observer').filter((r) => r.status === 'running' || r.status === 'paused' || r.status === 'awaiting').length)
  if (!desk) return null
  const pinned = APPS.filter((a) => a.pinned && !(isAgent && a.id === 'hworker'))
  const openIds = Array.from(new Set(desk.windows.map((w) => w.appId)))
  const extra = openIds.filter((id) => !pinned.some((p) => p.id === id))
  const items = [...pinned.map((p) => p.id), ...extra]
  const active = desk.windows.find((w) => w.id === desk.activeId && !w.minimized)

  const clickApp = (appId: string) => {
    const wins = desk.windows.filter((w) => w.appId === appId)
    if (!wins.length) return wm().open(deskId, appId)
    const top = wins.sort((a, b) => b.z - a.z)[0]
    if (active?.id === top.id) wm().minimize(deskId, top.id)
    else wm().focus(deskId, top.id)
  }

  return (
    <>
      <div
        data-taskbar
        className="absolute left-0 right-0 bottom-0 flex items-center px-2 z-[9000] text-[#1a1a1a] select-none"
        style={{
          height: TASKBAR_H,
          background: 'rgba(238,243,250,0.82)',
          backdropFilter: 'blur(30px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
          borderTop: '1px solid rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-win)',
        }}
      >
        {/* widgets */}
        <div className="flex items-center gap-2 px-2 h-10 rounded-[5px] hover:bg-white/50 w-[180px]">
          <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="10" cy="10" r="5" fill="#FFB900" /><path d="M8 18a4 4 0 0 1 .6-7.9A5 5 0 0 1 18 11a3.5 3.5 0 0 1-.5 7z" fill="#fff" stroke="#c9d6e6" strokeWidth=".6" /></svg>
          <div className="leading-tight">
            <div className="text-[12px]">62°F</div>
            <div className="text-[11px] text-black/60">Mostly sunny</div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center gap-[3px]">
          <TbButton label="Start" agent="taskbar-start" active={desk.startOpen} onClick={() => wm().setStart(deskId, !desk.startOpen)}>
            <WinLogo />
          </TbButton>
          <button
            onClick={() => wm().setStart(deskId, true)}
            className="flex items-center gap-2 h-[34px] w-[200px] px-3 mx-1 rounded-full bg-white/70 border border-black/5 text-[13px] text-black/60 hover:bg-white/90"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
            Search
          </button>
          <TbButton label="Task View">
            <svg width="22" height="22" viewBox="0 0 24 24"><rect x="2" y="4" width="13" height="16" rx="2" fill="#2B2B2B" /><rect x="9" y="7" width="13" height="10" rx="2" fill="#7A7A7A" stroke="#fff" strokeWidth="1" /></svg>
          </TbButton>
          {items.map((id) => {
            const app = getApp(id)
            if (!app) return null
            const running = openIds.includes(id)
            return (
              <TbButton key={id} label={app.name} agent={`taskbar-app-${id}`} running={running} active={active?.appId === id} onClick={() => clickApp(id)}>
                <img src={app.icon} className="w-6 h-6 object-contain" alt="" draggable={false} />
              </TbButton>
            )
          })}
        </div>
        {/* system tray */}
        <div className="flex items-center gap-0.5 text-[12px]">
          <button className="w-7 h-10 rounded hover:bg-white/50 flex items-center justify-center" aria-label="Show hidden icons">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 8l4-4 4 4" /></svg>
          </button>
          {!isAgent && (
            <button
              data-tray-hworker
              aria-label="H-Worker"
              onClick={() => setTrayOpen((o) => !o)}
              className={`relative w-9 h-10 rounded hover:bg-white/50 flex items-center justify-center ${trayOpen ? 'bg-white/60' : ''}`}
            >
              <img src={logoUrl('hworker')} className="w-[20px] h-[20px] rounded-[5px]" alt="" />
              {runningAgents > 0 && (
                <span className="absolute top-1.5 right-1 min-w-[14px] h-[14px] px-[3px] rounded-full bg-[#7114EB] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#eef3fa]">
                  {runningAgents}
                </span>
              )}
            </button>
          )}
          {isAgent && (
            <div className="flex items-center gap-1.5 px-2 h-7 mr-1 rounded-full bg-[#0F0E12] text-white text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#9A5BEC] animate-pulse" />
              H-WORKER VM
            </div>
          )}
          <div className="flex items-center gap-2 px-2 h-10 rounded hover:bg-white/50">
            <span className="text-[11px]">ENG</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM3.5 9.6a6.4 6.4 0 0 1 9 0l-.9.9a5.1 5.1 0 0 0-7.2 0zM1 7.1a10 10 0 0 1 14 0l-.9.9a8.7 8.7 0 0 0-12.2 0z" /></svg>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor" /><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.8a6 6 0 0 1 0 8.4" /></svg>
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="1" y="4" width="16" height="8" rx="2" /><rect x="3" y="6" width="10" height="4" rx="1" fill="currentColor" stroke="none" /><path d="M18.5 7v2" /></svg>
          </div>
          <div className="flex flex-col items-end justify-center px-2 h-10 rounded hover:bg-white/50 leading-tight">
            <span>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            <span>{now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <button className="w-7 h-10 rounded hover:bg-white/50 flex items-center justify-center" aria-label="Notifications">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8zM6.5 14a1.6 1.6 0 0 0 3 0" /></svg>
          </button>
        </div>
      </div>
      {!isAgent && trayOpen && <TrayFlyout onClose={() => setTray(false)} />}
    </>
  )
}
