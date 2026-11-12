/** Small Excel-styled UI kit: modal dialogs, menus, colour pickers. */
import { useEffect, useRef, type ReactNode } from 'react'
import { Dismiss20Regular, Checkmark16Regular, ChevronRight12Regular } from '@fluentui/react-icons'
import { PALETTE } from './types'

export const GREEN = '#107C41'

export function Modal({ title, children, onClose, footer, width = 420, agent }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; width?: number; agent?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="absolute inset-0 z-[80] bg-black/25 flex items-center justify-center" onMouseDown={onClose}>
      <div data-agent={agent} role="dialog" aria-label={title} className="bg-white rounded-lg shadow-[0_24px_60px_rgba(0,0,0,0.28)] text-[#242424] flex flex-col max-h-[86%]" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="h-11 shrink-0 flex items-center pl-5 pr-2">
          <div className="flex-1 text-[15px] font-semibold">{title}</div>
          <button aria-label="Close" onClick={onClose} className="w-8 h-8 rounded hover:bg-[#F0F0F0] flex items-center justify-center">
            <Dismiss20Regular />
          </button>
        </div>
        <div className="px-5 pb-3 overflow-auto text-[13px]">{children}</div>
        {footer && <div className="px-5 py-3 flex items-center justify-end gap-2 border-t border-[#EDEBE9]">{footer}</div>}
      </div>
    </div>
  )
}

export function Btn({ children, primary, onClick, disabled, agent, color }: { children: ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean; agent?: string; color?: string }) {
  return (
    <button
      data-agent={agent}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 min-w-[80px] px-3 rounded text-[13px] font-semibold disabled:opacity-50 ${primary ? 'text-white hover:brightness-110' : 'border border-[#C7C7C7] bg-white hover:bg-[#F5F5F5]'}`}
      style={primary ? { background: color ?? GREEN } : undefined}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-[12px] font-semibold text-[#424242] mb-1">{label}</span>
      {children}
    </label>
  )
}

export const inputCls = 'w-full h-8 px-2 rounded border border-[#C7C7C7] outline-none focus:border-[#107C41] text-[13px] bg-white'

export interface MenuItem {
  label: string
  agent?: string
  icon?: any
  onClick?: () => void
  checked?: boolean
  disabled?: boolean
  sep?: boolean
  sub?: MenuItem[]
  swatch?: string
  hint?: string
}

/** Dropdown / context menu. Position absolutely via `style` (or it drops below its relative parent). */
export function PopMenu({ items, onClose, style, width = 230, free }: { items: MenuItem[]; onClose: () => void; style?: React.CSSProperties; width?: number; free?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const down = (e: MouseEvent) => {
      // clicks on the anchor (the menu's relative wrapper) are handled by the anchor's own toggle
      const box = free ? ref.current : ref.current?.parentElement
      if (box && !box.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const t = setTimeout(() => window.addEventListener('mousedown', down), 0)
    window.addEventListener('keydown', key)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
    }
  }, [onClose])
  return (
    <div ref={ref} role="menu" className="absolute z-[70] bg-white rounded-md border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)] py-1 text-[#242424]" style={{ top: '100%', left: 0, marginTop: 4, width, ...style }} onMouseDown={(e) => e.stopPropagation()}>
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="h-px bg-[#E1E1E1] my-1" />
        ) : (
          <div key={it.label + i} className="relative group/mi">
            <button
              role="menuitem"
              data-agent={it.agent}
              aria-label={it.label}
              disabled={it.disabled}
              onClick={() => {
                if (it.sub) return
                it.onClick?.()
                onClose()
              }}
              className="w-full flex items-center gap-2.5 px-3 h-8 text-left text-[12.5px] hover:bg-[#F0F0F0] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="w-4 flex items-center justify-center shrink-0">
                {it.checked ? <Checkmark16Regular className="w-3.5 h-3.5" /> : it.swatch ? <span className="w-3.5 h-3.5 rounded-sm border border-black/15" style={{ background: it.swatch }} /> : it.icon ? <it.icon className="w-4 h-4 text-[#424242]" /> : null}
              </span>
              <span className="flex-1 truncate">{it.label}</span>
              {it.hint && <span className="text-[11px] text-[#8A8886]">{it.hint}</span>}
              {it.sub && <ChevronRight12Regular className="text-[#616161]" />}
            </button>
            {it.sub && (
              <div className="hidden group-hover/mi:block absolute left-full top-0 -ml-1">
                <PopMenu items={it.sub} onClose={onClose} style={{ top: 0, left: 0, marginTop: 0 }} width={210} free />
              </div>
            )}
          </div>
        ),
      )}
    </div>
  )
}

export function ColorGrid({ onPick, none, noneLabel = 'No Fill' }: { onPick: (c: string | undefined) => void; none?: boolean; noneLabel?: string }) {
  return (
    <div className="p-2">
      <div className="grid grid-cols-10 gap-1">
        {PALETTE.map((c) => (
          <button key={c} title={c} aria-label={`Color ${c}`} onClick={() => onPick(c)} className="w-[18px] h-[18px] border border-black/15 hover:outline hover:outline-2 hover:outline-[#107C41]" style={{ background: c }} />
        ))}
      </div>
      {none && (
        <button onClick={() => onPick(undefined)} className="mt-2 w-full h-7 text-left px-1 text-[12.5px] hover:bg-[#F0F0F0] rounded">
          {noneLabel}
        </button>
      )}
    </div>
  )
}

export function Popover({ children, onClose, style, free }: { children: ReactNode; onClose: () => void; style?: React.CSSProperties; free?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const box = free ? ref.current : ref.current?.parentElement
      if (box && !box.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => window.addEventListener('mousedown', down), 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousedown', down)
    }
  }, [onClose])
  return (
    <div ref={ref} className="absolute z-[70] bg-white rounded-md border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)] text-[#242424]" style={{ top: '100%', left: 0, marginTop: 4, ...style }} onMouseDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}
