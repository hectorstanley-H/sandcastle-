/** Coupa look & feel primitives shared by the views. */
import { type ReactNode } from 'react'
import {
  Laptop, Monitor, Keyboard, Mouse, Headphones, Smartphone, FileText, PenLine, NotebookPen, Armchair, Table2, Coffee, IdCard, Printer, Presentation, Usb, AppWindow, Package, X,
} from 'lucide-react'
import { logoUrl } from '@/os/registry'

export const NAVY = '#0b2d5b'
export const BLUE = '#1a6ebd'
export const $ = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '')
export const fdt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

const IMG: Record<string, [any, string]> = {
  laptop: [Laptop, '#e8f0fb'], monitor: [Monitor, '#eaf6f0'], dock: [Usb, '#f1eefb'], keyboard: [Keyboard, '#fdf1e7'], headset: [Headphones, '#e8f6fb'],
  mouse: [Mouse, '#f4f4f4'], phone: [Smartphone, '#eef1f6'], paper: [FileText, '#fbfaf0'], pen: [PenLine, '#eef1f6'], notebook: [NotebookPen, '#f4f4f4'],
  chair: [Armchair, '#f1eefb'], desk: [Table2, '#fdf1e7'], coffee: [Coffee, '#f6eee8'], badge: [IdCard, '#e8f0fb'], toner: [Printer, '#f4f4f4'],
  board: [Presentation, '#eaf6f0'], software: [AppWindow, '#e8f0fb'],
}
export function ProductImg({ kind, size = 120 }: { kind: string; size?: number }) {
  const [I, bg] = IMG[kind] ?? [Package, '#f4f4f4']
  return (
    <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: size, height: size * 0.8, background: bg }}>
      <I style={{ width: size * 0.42, height: size * 0.42 }} className="text-[#3d4f66]" strokeWidth={1.2} />
    </div>
  )
}

export function Btn({ primary, danger, children, className = '', ...rest }: any) {
  const cls = primary
    ? 'text-white border-transparent hover:brightness-110'
    : danger
      ? 'bg-white text-[#c8102e] border-[#c8102e] hover:bg-[#fdf0f2]'
      : 'bg-white text-[#1a6ebd] border-[#1a6ebd] hover:bg-[#eef5fc]'
  return (
    <button className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[14px] font-semibold border disabled:opacity-40 ${cls} ${className}`} style={primary ? { background: BLUE } : undefined} {...rest}>
      {children}
    </button>
  )
}
export const inputCls = 'w-full h-9 rounded border border-[#b8c2cc] bg-white px-2.5 text-[14px] outline-none focus:border-[#1a6ebd] focus:shadow-[0_0_0_2px_#1a6ebd33]'
export function Row({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-4 py-2">
      <div className="text-[14px] text-[#4a5a6a] pt-2 text-right">{required && <span className="text-[#c8102e]">* </span>}{label}</div>
      <div>{children}</div>
    </div>
  )
}

const PILL: Record<string, string> = {
  'Pending Approval': '#b45f06', Approved: '#2e7d32', Ordered: '#1a6ebd', Rejected: '#c8102e', Draft: '#5f6b7a', Paid: '#2e7d32', Disputed: '#c8102e', 'Pending Receipt': '#b45f06',
  Withdrawn: '#5f6b7a', Issued: '#1a6ebd', Received: '#2e7d32', Closed: '#5f6b7a', Cancelled: '#c8102e', Submitted: '#1a6ebd', 'In Review': '#b45f06', Completed: '#2e7d32', Active: '#2e7d32', Onboarding: '#b45f06',
}
export function StatusPill({ s }: { s: string }) {
  const c = PILL[s] ?? '#5f6b7a'
  return <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap" style={{ color: c, background: c + '18' }}>{s}</span>
}

export function HW() {
  return <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[11px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}><img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> H-Worker</span>
}

export function Card({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-[#d8dee6] ${className}`}>
      {title && <div className="px-5 h-12 flex items-center gap-2 text-[16px] font-bold border-b border-[#eef1f4]"><span className="flex-1">{title}</span>{right}</div>}
      {children}
    </div>
  )
}

export function Chips<T extends string>({ value, options, onChange, agent }: { value: T; options: [T, string, number?][]; onChange: (v: T) => void; agent: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l, n]) => (
        <button key={v} data-agent={`${agent}-${v.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => onChange(v)} className={`h-8 px-3.5 rounded-full text-[13px] font-semibold border ${value === v ? 'text-white border-transparent' : 'bg-white text-[#3d4f66] border-[#d8dee6] hover:border-[#1a6ebd]'}`} style={value === v ? { background: NAVY } : undefined}>
          {l}{n !== undefined && <span className="ml-1.5 opacity-75">{n}</span>}
        </button>
      ))}
    </div>
  )
}

export function Modal({ title, children, footer, onClose, width = 520, agent }: { title: ReactNode; children: ReactNode; footer: ReactNode; onClose: () => void; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center" data-agent={agent} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col max-h-[85%]" style={{ width }}>
        <div className="h-12 px-5 flex items-center border-b border-[#eef1f4] text-[16px] font-bold">
          <span className="flex-1">{title}</span>
          <button onClick={onClose} aria-label="Close dialog" className="w-8 h-8 rounded-full hover:bg-[#f3f5f8] flex items-center justify-center text-[#5f6b7a]"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-auto p-5 text-[14px]">{children}</div>
        <div className="h-14 px-5 flex items-center justify-end gap-2 border-t border-[#eef1f4]">{footer}</div>
      </div>
    </div>
  )
}

export function Th({ children, right, first }: { children?: ReactNode; right?: boolean; first?: boolean }) {
  return <th className={`${first ? 'pl-5' : 'px-2'} font-semibold ${right ? 'text-right pr-5' : ''}`}>{children}</th>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-10 text-center text-[14px] text-[#5f6b7a]">{children}</div>
}
