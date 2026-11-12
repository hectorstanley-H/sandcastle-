import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { db, useRecord } from '@/db/db'

/** Outlook-wide preferences (persisted in the demo DB). */
export interface OutlookPrefs {
  id: string
  density?: 'roomy' | 'compact'
  preview?: boolean
  senderImages?: boolean
  autoReply?: boolean
  autoReplyText?: string
  hiddenCalendars?: string[]
  favorites?: string[]
}

export const PREFS_ID = 'prefs'
export function usePrefs(): [OutlookPrefs, (patch: Partial<OutlookPrefs>) => void] {
  const rec = useRecord<OutlookPrefs>('outlook.settings', PREFS_ID)
  const prefs: OutlookPrefs = { id: PREFS_ID, density: 'roomy', preview: true, senderImages: true, autoReply: false, autoReplyText: '', ...(rec ?? {}) }
  const set = (patch: Partial<OutlookPrefs>) => {
    if (db.find('outlook.settings', PREFS_ID)) db.update('outlook.settings', PREFS_ID, patch)
    else db.insert('outlook.settings', { ...prefs, ...patch })
  }
  return [prefs, set]
}

/** Small dropdown state holder: wrapper ref closes the menu on outside mousedown / Escape. */
export function useMenu<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false)
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, toggle: () => setOpen((o) => !o), close: () => setOpen(false), ref }
}

export function MenuPanel({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div role="menu" style={style} className={`absolute z-50 bg-white rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black/5 py-1 text-[#242424] ${className}`}>
      {children}
    </div>
  )
}

export function MenuItem({
  icon,
  label,
  onClick,
  agent,
  checked,
  disabled,
  hint,
  danger,
}: {
  icon?: ReactNode
  label: ReactNode
  onClick?: () => void
  agent?: string
  checked?: boolean
  disabled?: boolean
  hint?: ReactNode
  danger?: boolean
}) {
  return (
    <button
      role="menuitem"
      data-agent={agent}
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 h-8 text-[13px] text-left hover:bg-[#F5F5F5] disabled:opacity-40 disabled:hover:bg-transparent ${danger ? 'text-[#C50F1F]' : ''}`}
    >
      {icon !== undefined && <span className="w-5 flex items-center justify-center text-[#424242] shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[11.5px] text-[#616161]">{hint}</span>}
      {checked && <span className="text-[#0F6CBD]">✓</span>}
    </button>
  )
}

export const MenuSep = () => <div className="h-px bg-[#EDEBE9] my-1" />
export const MenuHeader = ({ children }: { children: ReactNode }) => <div className="px-3 pt-1.5 pb-1 text-[11.5px] font-semibold text-[#616161]">{children}</div>

export function Toggle({ on, onChange, agent, label }: { on: boolean; onChange: (v: boolean) => void; agent?: string; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-agent={agent}
      onClick={() => onChange(!on)}
      className={`relative w-10 h-5 shrink-0 rounded-full transition-colors ${on ? 'bg-[#0F6CBD]' : 'bg-white border border-[#616161]'}`}
    >
      <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full transition-all ${on ? 'left-[22px] bg-white' : 'left-[3px] bg-[#616161]'}`} />
    </button>
  )
}

export function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {})
  } catch {
    /* clipboard unavailable */
  }
}

/** Snooze presets used by the ribbon and the list hover actions. */
export function snoozeTimes(now = new Date()) {
  const at = (d: Date, h: number) => {
    const x = new Date(d)
    x.setHours(h, 0, 0, 0)
    return x
  }
  const later = new Date(now.getTime() + 3 * 3600000)
  const tomorrow = at(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), 8)
  const sat = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((6 - now.getDay() + 7) % 7 || 7))
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((8 - now.getDay()) % 7 || 7))
  const fmt = (d: Date) => d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return [
    { id: 'later', label: 'Later today', when: later, hint: fmt(later) },
    { id: 'tomorrow', label: 'Tomorrow', when: tomorrow, hint: fmt(tomorrow) },
    { id: 'weekend', label: 'This weekend', when: at(sat, 8), hint: fmt(at(sat, 8)) },
    { id: 'nextweek', label: 'Next week', when: at(mon, 8), hint: fmt(at(mon, 8)) },
  ]
}

export const EMOJIS = ['😀', '😊', '😂', '😍', '🙏', '👍', '👏', '🎉', '🔥', '✅', '❤️', '😮', '😢', '🤔', '🚀', '📎', '📅', '⚠️', '💡', '☕']
