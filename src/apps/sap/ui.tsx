/** SAP Fiori (Horizon theme) primitives used across the S/4HANA apps. */
import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import { ChevronDown, X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { logoUrl } from '@/os/registry'

export const C = {
  text: '#1d2d3e',
  text2: '#556b82',
  brand: '#0064d9',
  emph: '#0070f2',
  border: '#d9d9d9',
  fieldBorder: '#bcc3ca',
  fieldBottom: '#556b82',
  bg: '#f5f6f7',
  pos: '#256f3a',
  posIcon: '#30914c',
  crit: '#e76500',
  neg: '#aa0808',
  info: '#0070f2',
  hover: '#eaecee',
  sel: '#ebf8ff',
}

export const usd = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const sapDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '')

type BtnKind = 'default' | 'emph' | 'transparent' | 'ghost' | 'accept' | 'reject'
export function Btn({ kind = 'default', className = '', children, icon, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind; icon?: ReactNode }) {
  const base = 'inline-flex items-center justify-center gap-1.5 h-[26px] px-2.5 rounded-lg text-[14px] whitespace-nowrap border disabled:opacity-40 disabled:pointer-events-none'
  const k: Record<BtnKind, string> = {
    default: 'bg-white border-[#bcc3ca] text-[#0064d9] hover:bg-[#eaecee] font-semibold',
    emph: 'bg-[#0070f2] border-[#0070f2] text-white hover:bg-[#0064d9] font-semibold',
    transparent: 'bg-transparent border-transparent text-[#0064d9] hover:bg-[#eaecee] font-semibold',
    ghost: 'bg-transparent border-transparent text-[#1d2d3e] hover:bg-[#eaecee]',
    accept: 'bg-[#f5fae5] border-[#30914c] text-[#256f3a] hover:bg-[#ebf5cb] font-semibold',
    reject: 'bg-[#fff8d6] border-[#e76500] text-[#aa0808] hover:bg-[#ffef9f] font-semibold',
  }
  return (
    <button className={`${base} ${k[kind]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export function Label({ children, required, className = '' }: { children: ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`text-[14px] text-[#556b82] leading-[1.4] mb-1 ${className}`}>
      {children}
      {required && <span className="text-[#aa0808] ml-0.5">*</span>}
      <span>:</span>
    </div>
  )
}

const fieldCls =
  'h-[26px] w-full bg-white rounded-[4px] border border-[#bcc3ca] px-2 text-[14px] text-[#1d2d3e] outline-none shadow-[inset_0_-1px_0_#556b82] hover:border-[#0064d9] hover:shadow-[inset_0_-1px_0_#0064d9] focus:outline-[2px] focus:outline-[#0032a5] focus:outline-offset-[-1px] placeholder:text-[#556b82] placeholder:italic'

export function Input({ className = '', state, ...rest }: InputHTMLAttributes<HTMLInputElement> & { state?: 'error' | 'success' | 'warning' }) {
  const st = state === 'error' ? '!border-[#aa0808] !shadow-[inset_0_-1px_0_#aa0808] !bg-[#ffeaf4]' : state === 'success' ? '!border-[#30914c] !shadow-[inset_0_-1px_0_#30914c]' : state === 'warning' ? '!border-[#e76500] !shadow-[inset_0_-1px_0_#e76500] !bg-[#fff8d6]' : ''
  return <input className={`${fieldCls} ${st} ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select className={`${fieldCls} appearance-none pr-7`} {...rest}>
        {children}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-1.5 top-[5px] text-[#0064d9] pointer-events-none" />
    </div>
  )
}

export function Text({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-[14px] text-[#1d2d3e] min-h-[20px] ${className}`}>{children}</div>
}

export function Field({ label, children, required, className = '' }: { label: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  )
}

const STATUS: Record<string, string> = {
  Posted: 'pos',
  Paid: 'pos',
  'Completely Invoiced': 'pos',
  Released: 'pos',
  Active: 'pos',
  Sent: 'info',
  'Partially Invoiced': 'crit',
  'In Approval': 'crit',
  Parked: 'crit',
  Draft: 'none',
  'Blocked for Payment': 'neg',
  Blocked: 'neg',
}
export function ObjectStatus({ status, inverted, large }: { status: string; inverted?: boolean; large?: boolean }) {
  const s = STATUS[status] ?? 'none'
  const color = s === 'pos' ? C.pos : s === 'crit' ? '#b44f00' : s === 'neg' ? C.neg : s === 'info' ? C.brand : C.text2
  const Icon = s === 'pos' ? CheckCircle2 : s === 'crit' ? AlertTriangle : s === 'neg' ? XCircle : s === 'info' ? Info : null
  if (inverted) {
    const bg = s === 'pos' ? '#f5fae5' : s === 'crit' ? '#fff8d6' : s === 'neg' ? '#ffeaf4' : s === 'info' ? '#e1f4ff' : '#eff1f2'
    return (
      <span className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 ${large ? 'h-7 text-[14px]' : 'h-[20px] text-[12px]'} font-semibold border`} style={{ color, background: bg, borderColor: color + '55' }}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {status}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[14px]" style={{ color }}>
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />}
      {status}
    </span>
  )
}

export function MessageStrip({ type = 'success', children, onClose }: { type?: 'success' | 'info' | 'warning' | 'error'; children: ReactNode; onClose?: () => void }) {
  const m = {
    success: ['#f5fae5', '#30914c', CheckCircle2],
    info: ['#e1f4ff', '#0070f2', Info],
    warning: ['#fff8d6', '#e76500', AlertTriangle],
    error: ['#ffeaf4', '#aa0808', XCircle],
  }[type] as [string, string, any]
  const I = m[2]
  return (
    <div className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[14px] text-[#1d2d3e]" style={{ background: m[0], borderColor: m[1] }}>
      <I className="w-4 h-4 mt-[2px] shrink-0" style={{ color: m[1] }} />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/5">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export function Dialog({ title, children, footer, width = 560, state, agent }: { title: ReactNode; children: ReactNode; footer: ReactNode; width?: number; state?: 'success' | 'error' | 'info'; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.3)]" data-agent={agent}>
      <div className="bg-white rounded-xl shadow-[0_0_2rem_rgba(34,53,72,0.3),0_0_0_1px_rgba(34,53,72,0.1)] flex flex-col max-h-[85%]" style={{ width }}>
        <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-[#d9d9d9] text-[16px] font-bold text-[#1d2d3e]">
          {state === 'success' && <CheckCircle2 className="w-5 h-5 text-[#30914c]" />}
          {state === 'error' && <XCircle className="w-5 h-5 text-[#aa0808]" />}
          {state === 'info' && <Info className="w-5 h-5 text-[#0070f2]" />}
          {title}
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        <div className="h-[52px] shrink-0 flex items-center justify-end gap-2 px-4 border-t border-[#d9d9d9]">{footer}</div>
      </div>
    </div>
  )
}

export function HWChip({ text = 'H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-[20px] pl-0.5 pr-2 rounded-full text-[11.5px] font-semibold text-white align-middle" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> {text}
    </span>
  )
}

/** sap.m.Table-ish */
export function Table({ cols, children, className = '' }: { cols: { label: string; align?: 'right' | 'left' | 'center'; w?: string }[]; children: ReactNode; className?: string }) {
  return (
    <table className={`w-full border-collapse text-[14px] text-[#1d2d3e] ${className}`}>
      <thead>
        <tr className="h-[33px] border-b border-[#a8b2bd]">
          {cols.map((c, i) => (
            <th key={i} className="px-2 font-semibold text-[#1d2d3e] whitespace-nowrap" style={{ textAlign: c.align ?? 'left', width: c.w }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Card({ title, children, toolbar, className = '' }: { title?: ReactNode; children: ReactNode; toolbar?: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] ${className}`}>
      {title && (
        <div className="h-11 px-4 flex items-center gap-2 border-b border-[#e5e5e5]">
          <div className="text-[16px] font-bold text-[#1d2d3e] flex-1">{title}</div>
          {toolbar}
        </div>
      )}
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-[20px] font-bold text-[#1d2d3e] mb-3">{children}</div>
}
