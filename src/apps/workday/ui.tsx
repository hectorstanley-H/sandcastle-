import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { logoUrl } from '@/os/registry'

export const WD = {
  blue: '#0875E1',
  blueDark: '#005CB9',
  blueLight: '#D7EAFC',
  text: '#333333',
  sub: '#5E6A75',
  border: '#DFE2E6',
  soap: '#F6F7F8',
  soap2: '#F0F1F2',
  green: '#319C4C',
  red: '#DE2E21',
  orange: '#F38B00',
  font: "'Roboto', 'Inter', 'Helvetica Neue', Arial, sans-serif",
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'tertiary'; size?: 'sm' | 'md'; agent?: string; icon?: ReactNode }

export function Btn({ variant = 'secondary', size = 'md', agent, icon, className = '', children, ...rest }: BtnProps) {
  const base = `inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors disabled:opacity-40 ${size === 'sm' ? 'h-8 px-4 text-[13px]' : 'h-10 px-6 text-[14px]'}`
  const v =
    variant === 'primary'
      ? 'bg-[#0875E1] text-white hover:bg-[#005CB9]'
      : variant === 'secondary'
        ? 'bg-white text-[#333] border border-[#494949] hover:bg-[#F0F1F2]'
        : 'text-[#0875E1] hover:bg-[#F0F1F2] px-3'
  return (
    <button data-agent={agent} className={`${base} ${v} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export function Card({ children, className = '', title, action, agent }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; agent?: string }) {
  return (
    <div data-agent={agent} className={`bg-white rounded-2xl border border-[#E8EBED] shadow-[0_1px_4px_rgba(31,38,46,0.08)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="text-[18px] font-bold text-[#333]">{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function Pill({ tone = 'gray', children }: { tone?: 'gray' | 'blue' | 'green' | 'orange' | 'red'; children: ReactNode }) {
  const m = {
    gray: 'bg-[#E8EBED] text-[#494949]',
    blue: 'bg-[#D7EAFC] text-[#005CB9]',
    green: 'bg-[#DFF6E3] text-[#1E6F34]',
    orange: 'bg-[#FFEFD6] text-[#9C4F00]',
    red: 'bg-[#FDE2E0] text-[#A31B12]',
  }[tone]
  return <span className={`inline-flex items-center h-6 px-2.5 rounded text-[12px] font-bold uppercase tracking-[0.02em] ${m}`}>{children}</span>
}

export function HWorkerChip({ text = 'H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[11px] font-semibold text-white align-middle" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> {text}
    </span>
  )
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[220px_1fr] gap-4 items-start py-2.5">
      <label className="pt-2.5 text-[14px] font-medium text-[#333]">
        {label}
        {required && <span className="text-[#DE2E21] ml-0.5">*</span>}
      </label>
      <div>
        {children}
        {hint && <div className="text-[12px] text-[#5E6A75] mt-1">{hint}</div>}
      </div>
    </div>
  )
}

export const inputCls = 'h-10 w-full max-w-[360px] px-3 rounded-md border border-[#A1AAB3] bg-white text-[14px] text-[#333] outline-none focus:border-[#0875E1] focus:shadow-[0_0_0_1px_#0875E1]'

/** Breadcrumb-ish page header like Workday task pages */
export function PageTitle({ title, sub, right, icon }: { title: string; sub?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      {icon}
      <div className="flex-1 min-w-0">
        <h1 className="text-[28px] leading-tight font-bold text-[#333]">{title}</h1>
        {sub && <div className="text-[14px] text-[#5E6A75] mt-1">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

/** circle "worklet" app icon */
export function AppIcon({ icon, color, size = 40 }: { icon: ReactNode; color: string; size?: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full shrink-0 text-white" style={{ width: size, height: size, background: color }}>
      {icon}
    </span>
  )
}
