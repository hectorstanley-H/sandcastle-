import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { Search, Info } from 'lucide-react'
import { logoUrl } from '@/os/registry'

export type Incident = {
  id: string
  number: string
  opened: string
  updated: string
  callerId: string
  shortDescription: string
  description: string
  category: string
  subcategory: string
  service: string
  ci: string
  impact: number
  urgency: number
  priority: number
  state: string
  assignmentGroup: string
  assignedTo: string
  channel: string
  location: string
  activity: { id: string; author: string; date: string; kind: string; text: string; via?: string }[]
  closeCode?: string
  closeNotes?: string
  duplicateOf?: string
  updatedBy?: string
  /* optional fields added by the app at runtime */
  resolvedAt?: string
  resolvedBy?: string
  followers?: string[]
  watchList?: string[]
  tags?: string[]
  attachments?: { id: string; name: string; size: number; by: string; date: string }[]
  problemId?: string
  changeRequest?: string
  tasks?: { id: string; number: string; short: string; state: string; assignedTo: string; created: string }[]
}

export const PRIORITY_LABEL: Record<number, string> = { 1: '1 - Critical', 2: '2 - High', 3: '3 - Moderate', 4: '4 - Low', 5: '5 - Planning' }
export const PRIORITY_COLOR: Record<number, string> = { 1: '#E3242B', 2: '#F2A100', 3: '#E6C700', 4: '#5D9BD6', 5: '#9AA3AE' }
export const LEVEL: Record<number, string> = { 1: '1 - High', 2: '2 - Medium', 3: '3 - Low' }
export const prio = (impact: number, urgency: number) => Math.min(5, Math.max(1, impact + urgency - 1))
export const STATES = ['New', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Canceled']
export const CATEGORIES: Record<string, string[]> = {
  'Inquiry / Help': ['Antivirus', 'Email', 'Internal Application', 'Access'],
  Software: ['Email', 'Operating System', 'SAP', 'Single sign-on', 'Application', 'Office 365', 'Mobile application', 'Licensing', 'Reporting', 'Integration', 'Installation'],
  Hardware: ['Laptop', 'Monitor', 'Printer', 'Peripheral', 'Audio/Visual', 'Physical security'],
  Network: ['VPN', 'Wireless', 'DNS', 'DHCP', 'Firewall', 'Telephony'],
  Database: ['SQL Server', 'Oracle', 'HANA'],
}
export const CLOSE_CODES = ['Duplicate', 'Known error', 'No resolution provided', 'Resolved by caller', 'Resolved by change', 'Resolved by problem', 'Solved (Work Around)', 'Solved (Permanently)', 'User error']

export const fmtSN = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export const SN_FONT = "Lato, 'Source Sans Pro', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export function PriorityCell({ p }: { p: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[p] }} />
      {PRIORITY_LABEL[p]}
    </span>
  )
}

export function HWChip({ small }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-[#430693] text-white font-bold ${small ? 'h-[16px] px-1.5 text-[10px]' : 'h-5 px-2 text-[11px]'}`}>
      <img src={logoUrl('hworker')} className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} alt="" /> H-Worker
    </span>
  )
}

/** ServiceNow classic form row: right-aligned label, field on the right */
export function FieldRow({ label, required, children, mandatoryFilled, wide }: { label: string; required?: boolean; children: ReactNode; mandatoryFilled?: boolean; wide?: boolean }) {
  return (
    <div className={`flex items-start gap-3 min-h-[34px] mb-2.5 ${wide ? '' : ''}`}>
      <label className={`${wide ? 'w-[16%]' : 'w-[34%]'} shrink-0 text-right text-[14px] text-[#2E3238] pt-[7px] flex items-center justify-end gap-1`}>
        {required && <span className={`text-[15px] leading-none ${mandatoryFilled ? 'text-[#8A9099]' : 'text-[#C9302C]'}`}>*</span>}
        {label}
      </label>
      <div className="flex-1 min-w-0 pr-6">{children}</div>
    </div>
  )
}

export const inputCls = 'w-full h-[32px] px-2 rounded-[4px] border border-[#8790A1] bg-white text-[14px] text-[#1B1D21] outline-none focus:border-[#0C66E4] focus:shadow-[0_0_0_1px_#0C66E4] disabled:bg-[#EDEFF2] disabled:text-[#5B616B] read-only:bg-[#EDEFF2]'

export function RefButtons({ onLookup, onPreview }: { onLookup?: () => void; onPreview?: () => void } = {}) {
  return (
    <>
      <button type="button" onClick={onLookup} onMouseDown={(e) => onLookup && e.preventDefault()} className="w-8 h-8 shrink-0 rounded-[4px] border border-[#8790A1] bg-white flex items-center justify-center text-[#4A5059] hover:bg-[#F1F3F5]" aria-label="Look up"><Search size={15} /></button>
      <button type="button" onClick={onPreview} className="w-6 h-8 shrink-0 flex items-center justify-center text-[#4A5059] hover:text-[#0C66E4]" aria-label="Preview record"><Info size={16} /></button>
    </>
  )
}

/* ─────────── small UI helpers shared by the ServiceNow screens ─────────── */

/** App-level info message ("Record updated", "Link copied"…) shown under the banner, like ServiceNow's form messages. */
export const FlashContext = createContext<(msg: string, kind?: 'info' | 'error') => void>(() => {})
export const useFlash = () => useContext(FlashContext)

export function copyText(t: string) {
  try {
    void navigator.clipboard?.writeText(t).catch(() => {})
  } catch {
    /* clipboard unavailable */
  }
}

/** Dropdown/popover that closes on outside click or Escape. */
export function Popover({ onClose, className = '', children, agent }: { onClose: () => void; className?: string; children: ReactNode; agent?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const down = (e: MouseEvent) => {
      // clicks on the trigger (same wrapper) are handled by the trigger itself
      const scope = ref.current?.parentElement ?? ref.current
      if ((e.target as HTMLElement)?.closest?.('[data-sn-trigger]')) return
      if (scope && !scope.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const t = setTimeout(() => document.addEventListener('mousedown', down), 0)
    document.addEventListener('keydown', key)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [onClose])
  return (
    <div ref={ref} data-agent={agent} className={`absolute z-50 bg-white rounded-[6px] border border-[#DADDE2] shadow-[0_8px_24px_rgba(0,0,0,0.18)] py-1 text-[14px] text-[#1B1D21] ${className}`}>
      {children}
    </div>
  )
}

export function MenuItem({ children, onClick, disabled, agent, danger }: { children: ReactNode; onClick?: () => void; disabled?: boolean; agent?: string; danger?: boolean }) {
  return (
    <button type="button" data-agent={agent} disabled={disabled} onClick={onClick} className={`w-full text-left px-4 py-1.5 text-[14px] hover:bg-[#EEF4FB] disabled:text-[#8A9099] disabled:hover:bg-transparent ${danger ? 'text-[#C9302C]' : ''}`}>
      {children}
    </button>
  )
}

/** Centered modal dialog in ServiceNow style. */
export function Modal({ title, onClose, children, footer, width = 520, agent }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/40 flex items-start justify-center pt-24" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[8px] shadow-[0_16px_40px_rgba(0,0,0,0.3)] max-w-[92%]" style={{ width }} data-agent={agent}>
        <div className="h-12 px-5 flex items-center border-b border-[#DADDE2]">
          <div className="text-[16px] font-bold text-[#1B1D21] flex-1">{title}</div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="w-8 h-8 rounded flex items-center justify-center hover:bg-[#EDEFF2] text-[18px] leading-none">×</button>
        </div>
        <div className="px-5 py-4 text-[14px] text-[#2E3238]">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#DADDE2] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export const btnCls = 'h-8 px-3 rounded-[4px] border border-[#8790A1] bg-white text-[14px] font-bold text-[#1B1D21] hover:bg-[#F1F3F5] disabled:text-[#8A9099]'
export const primaryCls = 'h-8 px-4 rounded-[4px] bg-[#032D42] hover:bg-[#0B3F59] text-white text-[14px] font-bold disabled:opacity-50'

/** Task SLA computation (response + resolution) for an incident, ServiceNow style. */
export const SLA_RESPONSE_MIN = [15, 30, 60, 240, 480]
export const SLA_RESOLUTION_H = [4, 8, 24, 72, 120]
export type SlaRow = { name: string; target: 'Response' | 'Resolution'; stage: 'In progress' | 'Completed' | 'Breached' | 'Paused' | 'Cancelled'; pct: number; leftMs: number; elapsedMs: number; start: string; breached: boolean }
export function slaFor(inc: { priority: number; opened: string; state: string; updated: string; activity: { author: string; date: string; kind: string }[]; resolvedAt?: string }, now = Date.now()): SlaRow[] {
  const p = Math.min(5, Math.max(1, inc.priority || 4))
  const opened = +new Date(inc.opened)
  const done = ['Resolved', 'Closed', 'Canceled'].includes(inc.state)
  const endRes = done ? +new Date(inc.resolvedAt ?? inc.updated) : now
  const firstTouch = inc.activity
    .filter((a) => a.author !== 'System' && (a.kind === 'work' || a.kind === 'comment' || a.kind === 'field'))
    .map((a) => +new Date(a.date))
    .filter((t) => t >= opened)
    .sort((a, b) => a - b)[0]
  const rows: SlaRow[] = []
  const respTarget = SLA_RESPONSE_MIN[p - 1] * 60_000
  const respEnd = firstTouch ?? (done ? endRes : now)
  const respElapsed = Math.max(0, respEnd - opened)
  rows.push({
    name: `P${p} response (${SLA_RESPONSE_MIN[p - 1] >= 60 ? SLA_RESPONSE_MIN[p - 1] / 60 + ' hour' : SLA_RESPONSE_MIN[p - 1] + ' min'})`,
    target: 'Response',
    stage: inc.state === 'Canceled' ? 'Cancelled' : firstTouch || done ? 'Completed' : respElapsed > respTarget ? 'Breached' : 'In progress',
    pct: Math.round((respElapsed / respTarget) * 100),
    leftMs: respTarget - respElapsed,
    elapsedMs: respElapsed,
    start: inc.opened,
    breached: respElapsed > respTarget,
  })
  const resTarget = SLA_RESOLUTION_H[p - 1] * 3600_000
  const resElapsed = Math.max(0, endRes - opened)
  rows.push({
    name: `P${p} resolution (${SLA_RESOLUTION_H[p - 1]} hour)`,
    target: 'Resolution',
    stage: inc.state === 'Canceled' ? 'Cancelled' : done ? 'Completed' : inc.state === 'On Hold' ? 'Paused' : resElapsed > resTarget ? 'Breached' : 'In progress',
    pct: Math.round((resElapsed / resTarget) * 100),
    leftMs: resTarget - resElapsed,
    elapsedMs: resElapsed,
    start: inc.opened,
    breached: resElapsed > resTarget,
  })
  return rows
}
export const fmtDur = (ms: number) => {
  const neg = ms < 0
  const m = Math.floor(Math.abs(ms) / 60_000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  return `${neg ? '-' : ''}${d ? d + 'd ' : ''}${h}h ${mm}m`
}

export function Wordmark() {
  return (
    <span className="flex items-center text-white text-[19px] font-bold tracking-[-0.2px] select-none" style={{ fontFamily: "'Plus Jakarta Sans', Lato, sans-serif" }}>
      servicen
      <span className="inline-block w-[13px] h-[13px] rounded-full border-[3px] border-[#62D84E] mx-[1px] translate-y-[1px]" />
      w
    </span>
  )
}
