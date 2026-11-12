import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { ME, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'

export type Comment = { id: string; author: string; public: boolean; body: string; date: string; via?: string; cc?: string[]; attachments?: { name: string; size: number }[]; channel?: string }
export type Ticket = {
  id: string; number: number; subject: string; requester: { name: string; email: string; org: string }; status: string; priority: string; type: string
  group: string; assignee: string; tags: string[]; channel: string; created: string; updated: string; comments: Comment[]; updatedBy?: string
  /* optional fields added by the app at runtime */
  followers?: string[]
  problemId?: string
  productArea?: string
  mergedInto?: string
  jiraKey?: string
  createdBy?: string
}
export type Macro = { id: string; title: string; body: string; status?: string; tags?: string[]; category: string }
export type ViewDef = { id: string; name: string; pred: (t: Ticket) => boolean; custom?: boolean }
export type CustomView = { id: string; name: string; statuses: string[]; group: string; assignee: '' | 'me' | 'none'; priority: string; tag: string; owner: string }

export const STATUS: Record<string, { label: string; bg: string; fg: string; letter: string }> = {
  new: { label: 'New', bg: '#FFB648', fg: '#703B15', letter: 'N' },
  open: { label: 'Open', bg: '#E34F32', fg: '#fff', letter: 'O' },
  pending: { label: 'Pending', bg: '#3091EC', fg: '#fff', letter: 'P' },
  hold: { label: 'On-hold', bg: '#2F3941', fg: '#fff', letter: 'H' },
  solved: { label: 'Solved', bg: '#87929D', fg: '#fff', letter: 'S' },
  closed: { label: 'Closed', bg: '#D8DCDE', fg: '#49545C', letter: 'C' },
}
export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Inter, Roboto, 'Helvetica Neue', Arial, sans-serif"
export const HOURS = (iso: string) => (Date.now() - +new Date(iso)) / 3600_000
export const waiting = (t: Ticket) => ['new', 'open'].includes(t.status) && HOURS(t.created) > 24 && !t.comments.some((c) => c.author !== 'requester' && c.public)
export const AGENTS = ['alex', 'aisha', 'ryan', 'oliver']
export const GROUPS = ['Support', 'Billing', 'Tier 2']

export const ago = (iso: string) => {
  const h = HOURS(iso)
  if (h < 1) return Math.round(h * 60) <= 1 ? '1 minute ago' : `${Math.round(h * 60)} minutes ago`
  if (h < 24) return Math.round(h) === 1 ? '1 hour ago' : `${Math.round(h)} hours ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'Yesterday' : `${d} days ago`
}
export const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function Badge({ s, small }: { s: string; small?: boolean }) {
  const st = STATUS[s] ?? STATUS.open
  return <span className={`inline-flex items-center justify-center rounded-[4px] font-semibold whitespace-nowrap ${small ? 'h-[18px] px-1.5 text-[11px]' : 'h-5 px-2 text-[12px]'}`} style={{ background: st.bg, color: st.fg }}>{st.label}</span>
}
export function HW() {
  return <span className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-full bg-[#430693] text-white text-[10.5px] font-semibold"><img src={logoUrl('hworker')} className="w-2.5 h-2.5" alt="" />H-Worker</span>
}
export function ReqAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const internal = PEOPLE.find((p) => p.id === name)
  return internal ? <Avatar id={name} size={size} /> : <Avatar name={name} size={size} />
}

/** Garden-style dropdown; closes on outside click / Escape (clicks on [data-zd-trigger] are left to the trigger) */
export function ZPop({ onClose, className = '', children, agent }: { onClose: () => void; className?: string; children: ReactNode; agent?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t?.closest?.('[data-zd-trigger]')) return
      const scope = ref.current?.parentElement ?? ref.current
      if (scope && !scope.contains(t)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const id = setTimeout(() => document.addEventListener('mousedown', down), 0)
    document.addEventListener('keydown', key)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [onClose])
  return (
    <div ref={ref} data-agent={agent} className={`absolute z-40 bg-white rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.2)] border border-[#D8DCDE] py-1 text-[14px] text-[#2F3941] ${className}`}>
      {children}
    </div>
  )
}
export function ZItem({ children, onClick, danger, disabled, agent }: { children: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean; agent?: string }) {
  return <button type="button" data-agent={agent} disabled={disabled} onClick={onClick} className={`w-full text-left px-4 py-1.5 hover:bg-[#EDF7FF] flex items-center gap-2 disabled:text-[#C2C8CC] disabled:hover:bg-transparent ${danger ? 'text-[#CC3340]' : ''}`}>{children}</button>
}

export function ZModal({ title, onClose, children, footer, width = 520, agent }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-[60] bg-[#2F3941]/50 flex items-start justify-center pt-20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[8px] shadow-[0_20px_40px_rgba(0,0,0,0.3)] max-w-[92%] max-h-[80%] flex flex-col" style={{ width }} data-agent={agent}>
        <div className="h-14 px-6 flex items-center border-b border-[#E9EBED]">
          <div className="text-[16px] font-semibold text-[#2F3941] flex-1">{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-[#F8F9F9] flex items-center justify-center text-[#68737D]"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 text-[14px] text-[#2F3941] overflow-auto">{children}</div>
        {footer && <div className="px-6 py-3 border-t border-[#E9EBED] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
export const zBtn = 'h-8 px-3 rounded-[4px] border border-[#C2C8CC] text-[14px] text-[#2F3941] hover:bg-[#F8F9F9] disabled:text-[#C2C8CC]'
export const zPrimary = 'h-8 px-4 rounded-[4px] bg-[#1F73B7] text-white text-[14px] font-semibold hover:bg-[#144A75] disabled:opacity-50'
export const zDanger = 'h-8 px-4 rounded-[4px] bg-[#CC3340] text-white text-[14px] font-semibold hover:bg-[#8C232C]'
export const zInput = 'w-full h-9 px-2.5 rounded-[4px] border border-[#C2C8CC] bg-white text-[14px] text-[#2F3941] outline-none focus:border-[#1F73B7] focus:shadow-[0_0_0_3px_rgba(31,115,183,0.35)]'

/** in-app notifications ("Ticket #123 updated") */
export const ZFlash = createContext<(msg: string) => void>(() => {})
export const useZFlash = () => useContext(ZFlash)

/** tiny renderer for comment markdown (**bold**, _italic_, `code`, links) */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*|(?<![\w])_[^_\n]+_(?![\w])|`[^`\n]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <b key={i}>{p.slice(2, -2)}</b>
        : /^_[^_]+_$/.test(p) ? <i key={i}>{p.slice(1, -1)}</i>
        : /^`[^`]+`$/.test(p) ? <code key={i} className="px-1 rounded bg-[#E9EBED] text-[13px]">{p.slice(1, -1)}</code>
        : /^\[[^\]]+\]\([^)]+\)$/.test(p) ? <span key={i} className="text-[#1F73B7] underline">{p.slice(1, p.indexOf(']'))}</span>
        : /^https?:\/\//.test(p) ? <span key={i} className="text-[#1F73B7] underline break-all">{p}</span>
        : p,
      )}
    </>
  )
}

export const nextNumber = (tickets: Ticket[]) => Math.max(48300, ...tickets.map((t) => t.number)) + 1
export const myId = ME.id
