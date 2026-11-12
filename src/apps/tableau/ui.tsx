import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Check, X } from 'lucide-react'

export const NAVY = '#1F457E'

export type Page = 'home' | 'explore' | 'favorites' | 'recents' | 'shared' | 'workbook' | 'pulse' | 'collections' | 'recommendations' | 'external' | 'search'

export interface TabCtx {
  go: (p: Page, opts?: { project?: string | null; q?: string }) => void
  openWb: (id: string) => void
  toast: (m: string) => void
}
export const TabNav = createContext<TabCtx>({ go: () => {}, openWb: () => {}, toast: () => {} })
export const useTab = () => useContext(TabNav)

export function useToastState() {
  const [toast, setToast] = useState<string | null>(null)
  const t = useRef<any>(null)
  useEffect(() => () => clearTimeout(t.current), [])
  return {
    toast,
    show: (m: string) => {
      setToast(m)
      clearTimeout(t.current)
      t.current = setTimeout(() => setToast(null), 4000)
    },
  }
}

export type MItem = { label: ReactNode; onClick?: () => void; agent?: string; checked?: boolean; divider?: boolean; header?: boolean; disabled?: boolean; icon?: ReactNode }

/** dropdown that closes on outside mousedown (the toggle button lives in the same parent, so it doesn't re-open) */
export function Menu({ items, onClose, className = 'right-0 top-9', width = 220 }: { items: MItem[]; onClose: () => void; className?: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, onClose)
  return (
    <div ref={ref} role="menu" className={`absolute z-50 bg-white border border-[#DDD] rounded-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.18)] py-1.5 text-left ${className}`} style={{ width }}>
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="my-1 border-t border-[#EEE]" />
        ) : it.header ? (
          <div key={i} className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#777]">{it.label}</div>
        ) : (
          <button
            key={i}
            role="menuitem"
            data-agent={it.agent}
            disabled={it.disabled}
            onClick={() => {
              onClose()
              it.onClick?.()
            }}
            className="w-full h-8 px-4 flex items-center gap-2.5 text-[13px] text-[#333] hover:bg-[#F0F4FA] disabled:text-[#AAA] disabled:hover:bg-white text-left whitespace-nowrap"
          >
            {it.checked != null && <span className="w-3.5 text-[#1F457E]">{it.checked && <Check size={13} strokeWidth={3} />}</span>}
            {it.icon}
            <span className="truncate">{it.label}</span>
          </button>
        ),
      )}
    </div>
  )
}

export function useOutside(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  const cb = useRef(onClose)
  cb.current = onClose
  useEffect(() => {
    if (!active) return
    const h = (e: MouseEvent) => {
      const desk = ref.current?.closest('[data-desk]')
      if (desk && !desk.contains(e.target as Node)) return
      const box = ref.current?.parentElement ?? ref.current
      if (box && !box.contains(e.target as Node)) cb.current()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [active])
}

export function MenuButton({ children, items, className, label, menuClass, width, agent }: { children: ReactNode; items: MItem[] | (() => MItem[]); className: string; label?: string; menuClass?: string; width?: number; agent?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button data-agent={agent} aria-label={label} onClick={() => setOpen(!open)} className={`${className} ${open ? 'bg-[#E1EBF6]' : ''}`}>
        {children}
      </button>
      {open && <Menu items={typeof items === 'function' ? items() : items} onClose={() => setOpen(false)} className={menuClass} width={width} />}
    </span>
  )
}

export function Dialog({ title, onClose, children, footer, width = 480, agent }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-start justify-center pt-20" data-agent={agent}>
      <div className="bg-white rounded-[4px] shadow-2xl max-h-[85%] flex flex-col" style={{ width }}>
        <div className="h-12 px-5 flex items-center border-b border-[#E6E6E6] shrink-0">
          <span className="text-[15px] font-semibold flex-1">{title}</span>
          <button onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#E6E6E6] flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

export const btnSecondary = 'h-8 px-4 border border-[#CCC] rounded-[3px] text-[13px] hover:bg-[#F5F5F5] disabled:opacity-50'
export const btnPrimary = 'h-8 px-4 rounded-[3px] bg-[#1F457E] text-white text-[13px] font-semibold hover:bg-[#2A5A9E] disabled:opacity-50'
export const field = 'w-full h-8 border border-[#CCC] rounded-[3px] px-2 text-[13px] outline-none focus:border-[#1F457E] bg-white'

export function SidePanel({ title, onClose, children, width = 340, agent }: { title: ReactNode; onClose: () => void; children: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute top-0 right-0 bottom-0 z-40 bg-white border-l border-[#DDD] shadow-[-6px_0_20px_rgba(0,0,0,0.12)] flex flex-col" style={{ width }} data-agent={agent}>
      <div className="h-12 px-4 flex items-center border-b border-[#E6E6E6] shrink-0">
        <span className="text-[15px] font-semibold flex-1 flex items-center gap-2">{title}</span>
        <button onClick={onClose} aria-label="Close panel">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  )
}

export const ago = (iso: string) => {
  const s = (Date.now() - +new Date(iso)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
