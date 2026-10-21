import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DeskContext } from './context'
import { APPS, getApp, logoUrl } from './registry'
import { useWM, wm } from './wm'
import { WindowFrame } from './Window'
import { Taskbar, TASKBAR_H } from './Taskbar'
import { StartMenu } from './StartMenu'
import { AgentWallpaper, BloomWallpaper } from './Wallpaper'
import { requestReset } from './system'
import { useDB } from '@/db/db'

const NONE: never[] = []

function DesktopIcons({ deskId, isAgent }: { deskId: string; isAgent: boolean }) {
  const [sel, setSel] = useState<string | null>(null)
  const apps = APPS.filter((a) => a.desktop && !(isAgent && a.id === 'hworker'))
  const icons = [
    { id: 'thispc', name: 'This PC', icon: logoUrl('thispc'), open: () => wm().open(deskId, 'explorer', { path: 'thispc' }) },
    { id: 'recycle', name: 'Recycle Bin', icon: logoUrl('recyclebin'), open: () => wm().open(deskId, 'explorer', { path: 'recycle' }) },
    ...apps.map((a) => ({ id: a.id, name: a.name, icon: a.icon, open: () => wm().open(deskId, a.id) })),
  ]
  return (
    <div
      className="absolute top-0 left-0 bottom-0 p-1 flex flex-col flex-wrap content-start gap-0.5"
      style={{ bottom: TASKBAR_H + 4 }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSel(null)
      }}
    >
      {icons.map((i) => (
        <button
          key={i.id}
          data-agent={`desktop-icon-${i.id}`}
          onPointerDown={(e) => {
            e.stopPropagation()
            setSel(i.id)
          }}
          onDoubleClick={i.open}
          onKeyDown={(e) => e.key === 'Enter' && i.open()}
          className={`w-[78px] h-[84px] flex flex-col items-center pt-1.5 gap-1 rounded-[3px] border ${
            sel === i.id ? 'bg-white/25 border-white/40' : 'border-transparent hover:bg-white/15'
          } ${i.id === 'hworker' ? 'relative' : ''}`}
        >
          <img src={i.icon} className="w-[44px] h-[44px] object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]" alt="" draggable={false} />
          <span
            className="text-[11.5px] leading-[14px] text-white text-center line-clamp-2 px-0.5"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.5)' }}
          >
            {i.name}
          </span>
        </button>
      ))}
    </div>
  )
}

function ContextMenu({ x, y, onClose, deskId }: { x: number; y: number; onClose: () => void; deskId: string }) {
  const Item = ({ label, onClick, kbd, icon }: { label: string; onClick?: () => void; kbd?: string; icon?: string }) => (
    <button
      className="w-full flex items-center gap-3 h-8 px-3 rounded text-[12.5px] hover:bg-black/5 text-left"
      onClick={() => {
        onClick?.()
        onClose()
      }}
    >
      <span className="w-4 h-4 flex items-center justify-center">{icon && <img src={icon} className="w-4 h-4" alt="" />}</span>
      <span className="flex-1">{label}</span>
      {kbd && <span className="text-[11px] text-black/50">{kbd}</span>}
    </button>
  )
  return (
    <>
      <div className="absolute inset-0 z-[9500]" onPointerDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div
        className="absolute z-[9501] w-[260px] p-1 rounded-lg menu-open"
        style={{ left: x, top: y, background: 'rgba(249,249,249,0.95)', backdropFilter: 'blur(30px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.08)', fontFamily: 'var(--font-win)' }}
      >
        <Item label="Deploy an H-Worker…" icon={logoUrl('hworker')} onClick={() => wm().open(deskId, 'hworker', { view: 'home', focusPrompt: true })} />
        <div className="h-px bg-black/10 my-1 mx-2" />
        <Item label="View" kbd="›" />
        <Item label="Sort by" kbd="›" />
        <Item label="Refresh" />
        <div className="h-px bg-black/10 my-1 mx-2" />
        <Item label="New" kbd="›" />
        <div className="h-px bg-black/10 my-1 mx-2" />
        <Item label="Display settings" onClick={() => wm().open(deskId, 'settings', { page: 'display' })} />
        <Item label="Personalize" onClick={() => wm().open(deskId, 'settings', { page: 'personalization' })} />
        <div className="h-px bg-black/10 my-1 mx-2" />
        <Item label="Open in Terminal" />
        <Item label="Reset demo data…" onClick={requestReset} />
      </div>
    </>
  )
}

function Toasts({ deskId }: { deskId: string }) {
  const toasts = useWM((s) => s.desks[deskId]?.toasts ?? NONE)
  return (
    <div className="absolute right-3 z-[9400] flex flex-col gap-2 w-[364px]" style={{ bottom: TASKBAR_H + 12 }}>
      {toasts.map((t) => {
        const app = getApp(t.appId)
        return (
          <div
            key={t.id}
            className="toast-in rounded-lg p-4 text-[#1a1a1a] cursor-default"
            style={{ background: 'rgba(249,249,249,0.95)', backdropFilter: 'blur(30px)', boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)', fontFamily: 'var(--font-win)' }}
          >
            <div className="flex items-center gap-2 text-[12px] text-black/70 mb-2">
              <img src={app?.icon} className="w-4 h-4" alt="" />
              <span className="flex-1">{app?.name}</span>
              <button className="w-6 h-6 rounded hover:bg-black/5 flex items-center justify-center" onClick={() => wm().dismissToast(deskId, t.id)} aria-label="Dismiss">
                <svg width="9" height="9" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2"><path d="M0 0l10 10M10 0L0 10" /></svg>
              </button>
            </div>
            <div className="text-[13.5px] font-semibold">{t.title}</div>
            {t.body && <div className="text-[12.5px] text-black/70 mt-0.5 line-clamp-3">{t.body}</div>}
            {t.action && (
              <button
                className="mt-3 w-full h-8 rounded bg-[#005FB8] hover:bg-[#1a6fc0] text-white text-[12.5px]"
                onClick={() => {
                  wm().open(deskId, t.action!.appId, t.action!.params)
                  wm().dismissToast(deskId, t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * A full desktop: wallpaper, icons, windows, taskbar, start menu, toasts.
 * `fixedSize` renders at a virtual resolution (agent desktops are scaled into the agent window).
 */
export const Desktop = memo(function Desktop({ deskId, isAgent = false, fixedSize }: { deskId: string; isAgent?: boolean; fixedSize?: { w: number; h: number } }) {
  const ref = useRef<HTMLDivElement>(null)
  const windows = useWM((s) => s.desks[deskId]?.windows ?? NONE)
  const epoch = useDB((s) => s.epoch)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    wm().ensureDesk(deskId, isAgent, fixedSize ? { w: fixedSize.w, h: fixedSize.h - TASKBAR_H } : undefined)
  }, [deskId, isAgent, fixedSize])

  useEffect(() => {
    if (fixedSize || !ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(() => wm().setBounds(deskId, { w: el.offsetWidth, h: el.offsetHeight - TASKBAR_H }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [deskId, fixedSize])

  return (
    <DeskContext.Provider value={{ deskId, isAgent }}>
      <div
        ref={ref}
        data-desk={deskId}
        className="relative overflow-hidden select-none"
        style={fixedSize ? { width: fixedSize.w, height: fixedSize.h } : { width: '100%', height: '100%' }}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest('[data-win],[data-taskbar]')) return
          e.preventDefault()
          if (isAgent) return
          const r = ref.current!.getBoundingClientRect()
          setMenu({ x: Math.min(e.clientX - r.left, r.width - 270), y: Math.min(e.clientY - r.top, r.height - 380) })
        }}
      >
        {isAgent ? <AgentWallpaper /> : <BloomWallpaper />}
        <DesktopIcons key={epoch} deskId={deskId} isAgent={isAgent} />
        <div className="absolute inset-0 pointer-events-none" style={{ bottom: TASKBAR_H }}>
          <div className="relative w-full h-full pointer-events-none [&>*]:pointer-events-auto">
            {windows.map((w) => (
              <WindowFrame key={`${w.id}-${epoch}`} win={w} />
            ))}
          </div>
        </div>
        <Toasts deskId={deskId} />
        <StartMenu />
        <Taskbar />
        {menu && <ContextMenu x={menu.x} y={menu.y} deskId={deskId} onClose={() => setMenu(null)} />}
      </div>
    </DeskContext.Provider>
  )
})
