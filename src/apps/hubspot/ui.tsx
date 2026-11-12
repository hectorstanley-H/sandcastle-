import { createContext, useContext, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { logoUrl } from '@/os/registry'

export type HRoute =
  | { page: 'contacts' }
  | { page: 'companies' }
  | { page: 'deals' }
  | { page: 'contact'; id: string }
  | { page: 'lists' }
  | { page: 'list'; id: string }
  | { page: 'list-new' }
  | { page: 'sequences' }
  | { page: 'sequence'; id: string }
  | { page: 'emails' }
  | { page: 'home' }
  | { page: 'company'; id: string }
  | { page: 'deal'; id: string }
  | { page: 'tasks' }
  | { page: 'tickets' }
  | { page: 'ticket'; id: string }
  | { page: 'reports'; tab?: string }
  | { page: 'inbox'; id?: string }
  | { page: 'calls' }
  | { page: 'meetings' }
  | { page: 'products' }
  | { page: 'quotes' }
  | { page: 'quote'; id: string }
  | { page: 'quote-new'; dealId?: string }
  | { page: 'workflows' }
  /** id 'new' opens the builder for a new workflow */
  | { page: 'workflow'; id: string }
  | { page: 'forms' }
  /** id 'new' opens the editor for a new form */
  | { page: 'form'; id: string }
  | { page: 'kb' }
  /** id 'new' opens the editor for a new article */
  | { page: 'kb-article'; id: string }
  | { page: 'goals' }
  | { page: 'properties' }

export interface HNavCtx {
  go: (r: HRoute) => void
  /** show a modal (rendered above everything inside the app window); null closes it */
  open: (n: ReactNode | null) => void
  toast: (msg: string) => void
}
export const HNav = createContext<HNavCtx>({ go: () => {}, open: () => {}, toast: () => {} })
export const useHNav = () => useContext(HNav)

export const C = {
  text: '#33475B',
  sub: '#516F90',
  border: '#CBD6E2',
  light: '#DFE3EB',
  bg: '#F5F8FA',
  link: '#0091AE',
  orange: '#FF5C35',
  obsidian: '#213343',
}

export const PORTAL = '4398211'

export function HBtn({ children, variant = 'secondary', onClick, agent, label, className = '', disabled, small }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'; onClick?: () => void; agent?: string; label?: string; className?: string; disabled?: boolean; small?: boolean }) {
  const v: Record<string, string> = {
    primary: 'bg-[#FF5C35] border-[#FF5C35] text-white hover:bg-[#FF7A59]',
    secondary: 'bg-white border-[#FF5C35] text-[#FF5C35] hover:bg-[#FFF3F0]',
    tertiary: 'bg-[#425B76] border-[#425B76] text-white hover:bg-[#516F90]',
    ghost: 'bg-[#F5F8FA] border-[#CBD6E2] text-[#33475B] hover:bg-[#EAF0F6]',
  }
  return (
    <button data-agent={agent} aria-label={label} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 ${small ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[14px]'} rounded-[3px] border font-medium whitespace-nowrap disabled:opacity-50 ${v[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function HLink({ children, onClick, agent, className = '' }: { children: ReactNode; onClick?: () => void; agent?: string; className?: string }) {
  return (
    <button data-agent={agent} onClick={onClick} className={`text-[#0091AE] hover:underline font-medium text-left ${className}`}>
      {children}
    </button>
  )
}

export function HWTag({ text = 'H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full text-[10.5px] font-semibold text-white align-middle" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> {text}
    </span>
  )
}

export function Initials({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  const palette = ['#FF7A59', '#00BDA5', '#6A78D1', '#F2547D', '#00A4BD', '#FFB000', '#516F90', '#7C98B6']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const i = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
  return (
    <span className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0" style={{ width: size, height: size, background: color ?? palette[h % palette.length], fontSize: size * 0.38 }}>
      {i}
    </span>
  )
}

export const hsDate = (iso?: string, time = false) => {
  if (!iso) return '--'
  const d = new Date(iso.length === 10 ? iso + 'T12:00' : iso)
  const s = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return time ? `${s} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : s
}
export const hsMoney = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const inputH = 'h-9 px-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] text-[14px] text-[#33475B] outline-none focus:border-[#00A4BD] focus:bg-white focus:shadow-[0_0_4px_1px_rgba(0,208,228,0.3)]'

export const selectH = `${inputH} pr-8`

export function Modal({ title, onClose, children, footer, width = 560, agent }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 bg-[#213343]/60 flex items-start justify-center pt-14 overflow-auto" data-agent={agent}>
      <div className="bg-white rounded-[4px] shadow-2xl overflow-hidden mb-10" style={{ width }}>
        <div className="h-14 bg-[#33475B] text-white flex items-center px-6 text-[17px] font-medium">
          {title}
          <button className="ml-auto" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 text-[14px]">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#DFE3EB] flex gap-2 bg-[#F5F8FA]">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-[#516F90] mt-1">{hint}</span>}
    </label>
  )
}

export function Pill({ children, color = '#EAF0F6', text = '#33475B' }: { children: ReactNode; color?: string; text?: string }) {
  return <span className="inline-flex items-center px-2 h-5 rounded-[3px] text-[12px] font-medium whitespace-nowrap" style={{ background: color, color: text }}>{children}</span>
}

export const priorityStyle: Record<string, [string, string]> = {
  High: ['#FDEDEE', '#C93B44'],
  Medium: ['#FFF4DC', '#9B6A00'],
  Low: ['#E5F8F6', '#00826F'],
}
