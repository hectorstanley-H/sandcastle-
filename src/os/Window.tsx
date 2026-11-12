import { Suspense, useContext, useRef, type ReactNode } from 'react'
import { DeskContext, WinContext } from './context'
import { getApp } from './registry'
import { useWM, wm, type Win } from './wm'

/* ───────────────────────── Window controls ───────────────────────── */

const IconMin = () => (
  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" strokeWidth="1" /></svg>
)
const IconMax = ({ restore }: { restore?: boolean }) =>
  restore ? (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="2.5" width="7" height="7" rx="1" />
      <path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1.2" />
    </svg>
  )
const IconClose = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1"><path d="M0 0l10 10M10 0L0 10" /></svg>
)

/** Windows 11 caption buttons. Use inside custom title bars (frame: 'none'). */
export function WindowControls({ dark, height = 32, className = '' }: { dark?: boolean; height?: number; className?: string }) {
  const win = useContext(WinContext)
  const { deskId } = useContext(DeskContext)
  if (!win) return null
  const base = `w-[46px] flex items-center justify-center transition-colors ${dark ? 'text-white hover:bg-white/10' : 'text-black/80 hover:bg-black/5'}`
  return (
    <div className={`flex shrink-0 self-start ${className}`} style={{ height }} onPointerDown={(e) => e.stopPropagation()}>
      <button aria-label="Minimize" className={base} style={{ height }} onClick={() => wm().minimize(deskId, win.id)}>
        <IconMin />
      </button>
      <button aria-label={win.maximized ? 'Restore' : 'Maximize'} className={base} style={{ height }} onClick={() => wm().toggleMax(deskId, win.id)}>
        <IconMax restore={win.maximized} />
      </button>
      <button
        aria-label="Close"
        data-agent={`close-${win.appId}`}
        className={`w-[46px] flex items-center justify-center transition-colors hover:bg-[#C42B1C] hover:text-white ${dark ? 'text-white' : 'text-black/80'}`}
        style={{ height }}
        onClick={() => wm().close(deskId, win.id)}
      >
        <IconClose />
      </button>
    </div>
  )
}

/* ───────────────────────── Title bars ───────────────────────── */

function NativeTitleBar({ win }: { win: Win }) {
  const app = getApp(win.appId)!
  const color = app.titleBarColor ?? '#F3F3F3'
  const dark = app.titleBarText === 'light'
  return (
    <div
      data-drag-handle
      className="flex items-center h-8 shrink-0 select-none"
      style={{ background: color, color: dark ? '#fff' : '#1a1a1a' }}
    >
      <img src={app.icon} className="w-4 h-4 ml-3 mr-2.5" alt="" draggable={false} />
      <span className="text-[12px] truncate flex-1" style={{ fontFamily: 'var(--font-win)' }}>
        {win.title ?? app.name}
      </span>
      <WindowControls dark={dark} />
    </div>
  )
}

function EdgeIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

/** Microsoft Edge window chrome (tab strip + address bar). */
function BrowserChrome({ win }: { win: Win }) {
  const app = getApp(win.appId)!
  const url = win.url ?? app.url ?? 'https://www.bing.com'
  const u = (() => {
    try {
      return new URL(url)
    } catch {
      return null
    }
  })()
  const title = win.title ?? app.name
  return (
    <div className="shrink-0 select-none bg-[#F7F7F7] border-b border-[#E5E5E5]" style={{ fontFamily: 'var(--font-win)' }}>
      {/* tab strip */}
      <div data-drag-handle className="flex items-end h-[38px] pl-2 bg-[#EBEBEB]">
        <div className="flex items-center gap-1 h-full pr-1">
          <button className="w-7 h-7 rounded hover:bg-black/5 flex items-center justify-center text-[#444]" aria-label="Tab actions">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="12" height="10" rx="2" /><path d="M2 6h12" /></svg>
          </button>
        </div>
        <div className="relative flex items-center gap-2 h-[32px] w-[240px] px-3 rounded-t-lg bg-[#F7F7F7] text-[12px] text-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
          <img src={app.icon} className="w-4 h-4 shrink-0 object-contain" alt="" draggable={false} />
          <span className="truncate flex-1">{title}</span>
          <span className="w-5 h-5 rounded hover:bg-black/10 flex items-center justify-center text-[#555]">
            <svg width="8" height="8" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.3"><path d="M0 0l10 10M10 0L0 10" /></svg>
          </span>
        </div>
        <button className="w-7 h-7 mb-[2px] ml-1 rounded hover:bg-black/5 flex items-center justify-center text-[#444]" aria-label="New tab">
          <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.2"><path d="M6 0v12M0 6h12" /></svg>
        </button>
        <div className="flex-1 h-full" />
        <WindowControls height={38} />
      </div>
      {/* toolbar */}
      <div className="flex items-center h-[40px] px-2 gap-1 text-[#333]">
        <button className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center" aria-label="Back"><EdgeIcon d="M12 4l-6 6 6 6" /></button>
        <button className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center opacity-40" aria-label="Forward"><EdgeIcon d="M8 4l6 6-6 6" /></button>
        <button className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center" aria-label="Refresh"><EdgeIcon d="M15.5 9.5A5.5 5.5 0 1 1 13.8 5.6M15.5 3.5v3h-3" /></button>
        <div className="flex-1 flex items-center h-[30px] mx-1 px-3 rounded-full bg-white border border-[#E3E3E3] hover:border-[#cfcfcf] text-[13px]">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.3" className="mr-2 shrink-0"><rect x="3.5" y="7" width="9" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
          <span className="truncate">
            {u ? (
              <>
                <span className="text-[#666]">{u.protocol}//</span>
                <span className="text-[#111]">{u.host}</span>
                <span className="text-[#666]">{u.pathname + u.search + u.hash}</span>
              </>
            ) : (
              url
            )}
          </span>
          <div className="flex-1" />
          <EdgeIcon size={15} d="M10 2.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L10 14.3l-4.6 2.4.9-5.1L2.5 8l5.2-.8z" />
        </div>
        <button className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center" aria-label="Favorites"><EdgeIcon d="M4 3h12v14l-6-4-6 4z" /></button>
        <button className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center" aria-label="Collections"><EdgeIcon d="M3 6h10v10H3zM7 3h10v10" /></button>
        <div className="w-px h-5 bg-black/10 mx-1" />
        <div className="w-7 h-7 rounded-full bg-[#0F6CBD] text-white text-[11px] font-semibold flex items-center justify-center">AM</div>
        <button className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center" aria-label="Settings and more">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="13" cy="8" r="1.2" /></svg>
        </button>
        <div className="w-7 h-7 rounded flex items-center justify-center">
          <img src={getApp('edge')!.icon} className="w-4 h-4 opacity-90" alt="Copilot" />
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Window ───────────────────────── */

function AppSplash({ appId }: { appId: string }) {
  const app = getApp(appId)
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white" data-app-splash>
      <img src={app?.icon} className="w-16 h-16 animate-pulse" alt="" />
    </div>
  )
}

export function WindowFrame({ win, children }: { win: Win; children?: ReactNode }) {
  const { deskId } = useContext(DeskContext)
  const active = useWM((s) => s.desks[deskId]?.activeId === win.id)
  const bounds = useWM((s) => s.desks[deskId]?.bounds)
  const app = getApp(win.appId)
  const ref = useRef<HTMLDivElement>(null)
  if (!app) return null
  const Comp = app.component

  const scaleOf = () => {
    const root = ref.current?.closest('[data-desk]') as HTMLElement | null
    if (!root) return 1
    return root.getBoundingClientRect().width / root.offsetWidth || 1
  }

  const onPointerDown = (e: React.PointerEvent) => {
    wm().focus(deskId, win.id)
    const t = e.target as HTMLElement
    const handle = t.closest('[data-drag-handle]')
    if (!handle || t.closest('button, input, a, [data-no-drag]')) return
    if (e.button !== 0) return
    const scale = scaleOf()
    const sx = e.clientX
    const sy = e.clientY
    const ox = win.x
    const oy = win.y
    let moved = false
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale
      const dy = (ev.clientY - sy) / scale
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return
      if (!moved && win.maximized) {
        // un-maximize on drag like Windows
        wm().patch(deskId, win.id, { maximized: false, x: Math.max(0, ev.clientX / scale - win.w / 2), y: 0 })
      }
      moved = true
      wm().patch(deskId, win.id, {
        x: Math.round(ox + dx),
        y: Math.round(Math.max(0, oy + dy)),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    if (t.closest('[data-drag-handle]') && !t.closest('button, input, a, [data-no-drag]')) wm().toggleMax(deskId, win.id)
  }

  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation()
    wm().focus(deskId, win.id)
    const scale = scaleOf()
    const sx = e.clientX
    const sy = e.clientY
    const o = { x: win.x, y: win.y, w: win.w, h: win.h }
    const [mw, mh] = app.minSize ?? [420, 300]
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale
      const dy = (ev.clientY - sy) / scale
      const p: Partial<Win> = {}
      if (dir.includes('e')) p.w = Math.max(mw, o.w + dx)
      if (dir.includes('s')) p.h = Math.max(mh, o.h + dy)
      if (dir.includes('w')) {
        const w = Math.max(mw, o.w - dx)
        p.w = w
        p.x = o.x + (o.w - w)
      }
      if (dir.includes('n')) {
        const h = Math.max(mh, o.h - dy)
        p.h = h
        p.y = o.y + (o.h - h)
      }
      wm().patch(deskId, win.id, p)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const style: React.CSSProperties = win.maximized
    ? { left: 0, top: 0, width: bounds?.w ?? '100%', height: bounds?.h ?? '100%', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <div
      ref={ref}
      data-win={win.id}
      data-win-app={win.appId}
      data-minimized={win.minimized ? 'true' : 'false'}
      className={`absolute flex flex-col overflow-hidden bg-white win-open ${win.maximized ? '' : 'rounded-lg'} ${
        active ? 'shadow-[0_8px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.12)]' : 'shadow-[0_4px_20px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.1)]'
      }`}
      style={{ ...style, visibility: win.minimized ? 'hidden' : 'visible', pointerEvents: win.minimized ? 'none' : undefined }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <WinContext.Provider value={win}>
        {app.frame === 'native' && <NativeTitleBar win={win} />}
        {app.frame === 'browser' && <BrowserChrome win={win} />}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <Suspense fallback={<AppSplash appId={win.appId} />}>
            {children ?? <Comp win={win} params={win.params} />}
          </Suspense>
        </div>
      </WinContext.Provider>
      {!win.maximized && (
        <>
          <div className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" onPointerDown={startResize('n')} />
          <div className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize" onPointerDown={startResize('s')} />
          <div className="absolute left-0 top-2 bottom-2 w-1.5 cursor-w-resize" onPointerDown={startResize('w')} />
          <div className="absolute right-0 top-2 bottom-2 w-1.5 cursor-e-resize" onPointerDown={startResize('e')} />
          <div className="absolute right-0 bottom-0 w-3 h-3 cursor-se-resize" onPointerDown={startResize('se')} />
          <div className="absolute left-0 bottom-0 w-3 h-3 cursor-sw-resize" onPointerDown={startResize('sw')} />
          <div className="absolute right-0 top-0 w-3 h-3 cursor-ne-resize" onPointerDown={startResize('ne')} />
          <div className="absolute left-0 top-0 w-3 h-3 cursor-nw-resize" onPointerDown={startResize('nw')} />
        </>
      )}
    </div>
  )
}
