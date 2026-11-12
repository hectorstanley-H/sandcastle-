/** Shared SAP Concur (NextGen UI) primitives. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Receipt, Plane, Hotel, Car, Utensils, ChevronDown } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { db } from '@/db/db'

export const BLUE = '#0a6ed1'
export const $ = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const d = (iso?: string) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '')
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')
export const r2 = (n: number) => Math.round(n * 100) / 100

export const EXPENSE_TYPES: [string, string[]][] = [
  ['Travel', ['Airfare', 'Hotel', 'Car Rental', 'Taxi/Rideshare', 'Parking', 'Train', 'Fuel', 'Personal Car Mileage', 'Tolls']],
  ['Meals & Entertainment', ['Business Meals', 'Individual Meals', 'Entertainment', 'Tips/Gratuities']],
  ['Office & Other', ['Conference/Seminar Fees', 'Office Supplies', 'Meeting Room Rental', 'Mobile/Cellular Phone', 'Internet/Online Fees', 'Training', 'Miscellaneous']],
]
export const ALL_TYPES = EXPENSE_TYPES.flatMap(([, t]) => t)

export const typeIcon = (t: string) => (t === 'Airfare' ? Plane : t === 'Hotel' ? Hotel : t.includes('Taxi') || t.includes('Car') || t === 'Parking' ? Car : t.includes('Meal') ? Utensils : Receipt)

export function expenseAlerts(e: any): string[] {
  const a: string[] = []
  if (!e.type || e.type === 'Undefined') a.push('Expense Type is required.')
  if (e.type === 'Business Meals' && (e.attendees?.length ?? 0) < 2) a.push('Business Meals require at least one attendee in addition to the employee.')
  if (e.type === 'Hotel' && (!e.checkIn || !e.checkOut)) a.push('Hotel expenses must be itemized: enter the check-in and check-out dates.')
  if (e.type === 'Individual Meals' && e.amount > 75) a.push(`Individual Meals exceed the $75.00 daily limit (${$(e.amount)}). If this was a business meal, change the expense type.`)
  return a
}

export function recalc(reportId: string) {
  const total = db.get<any>('concur.expenses').filter((e) => e.reportId === reportId).reduce((s, e) => s + e.amount, 0)
  db.update('concur.reports', reportId, { total: Math.round(total * 100) / 100 })
}

/** append an audit-trail entry to a report / request */
export function logHistory(col: string, id: string, text: string, by = 'Alex Morgan') {
  db.update(col, id, (r) => ({ history: [...(r.history ?? []), { at: new Date().toISOString(), by, text }] }))
}

export function Btn({ primary, children, className = '', ...rest }: any) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded text-[14px] font-semibold border disabled:opacity-40 ${primary ? 'text-white border-transparent hover:brightness-95' : 'bg-white border-[#89919a] text-[#0a6ed1] hover:bg-[#ebf5fe]'} ${className}`}
      style={primary ? { background: BLUE } : undefined}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] text-[#32363a] mb-1">
        {label}
        {required && <span className="text-[#bb0000]"> *</span>}
      </span>
      {children}
    </label>
  )
}
export const inputCls = 'w-full h-9 rounded border border-[#89919a] bg-white px-2.5 text-[14px] text-[#32363a] outline-none focus:border-[#0a6ed1] focus:shadow-[0_0_0_1px_#0a6ed1] read-only:bg-[#f2f2f2] read-only:border-[#d9d9d9]'

export function Status({ s }: { s: string }) {
  const m: Record<string, [string, string]> = {
    'Not Submitted': ['#f2f2f2', '#32363a'],
    'Submitted & Pending Approval': ['#fef7f1', '#b44f00'],
    'Pending Approval': ['#fef7f1', '#b44f00'],
    Approved: ['#f1fdf6', '#107e3e'],
    Paid: ['#f1fdf6', '#107e3e'],
    Booked: ['#f1fdf6', '#107e3e'],
    Ticketed: ['#f1fdf6', '#107e3e'],
    'Sent Back': ['#ffebeb', '#bb0000'],
    Canceled: ['#ffebeb', '#bb0000'],
    Connected: ['#f1fdf6', '#107e3e'],
  }
  const [bg, fg] = m[s] ?? m['Not Submitted']
  return <span className="inline-flex items-center h-6 px-2 rounded text-[12px] font-semibold border whitespace-nowrap" style={{ background: bg, color: fg, borderColor: fg + '40' }}>{s}</span>
}

export function HW() {
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[11px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> H-Worker
    </span>
  )
}

export function Modal({ title, children, footer, width = 640, onClose, agent }: { title: string; children: ReactNode; footer: ReactNode; width?: number; onClose?: () => void; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center" data-agent={agent}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col max-h-[88%]" style={{ width }}>
        <div className="h-14 shrink-0 px-6 flex items-center border-b border-[#e5e5e5]">
          <div className="text-[20px] font-semibold text-[#32363a] flex-1">{title}</div>
          {onClose && <button onClick={onClose} aria-label="Close dialog" className="w-8 h-8 rounded hover:bg-[#f2f2f2] flex items-center justify-center"><X className="w-5 h-5" /></button>}
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        <div className="h-16 shrink-0 px-6 flex items-center justify-end gap-2 border-t border-[#e5e5e5]">{footer}</div>
      </div>
    </div>
  )
}

/** simple confirm dialog */
export function Confirm({ title, text, ok = 'OK', onOk, onClose, danger }: { title: string; text: ReactNode; ok?: string; onOk: () => void; onClose: () => void; danger?: boolean }) {
  return (
    <Modal title={title} width={500} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary onClick={() => { onOk(); onClose() }} style={danger ? { background: '#bb0000' } : undefined}>{ok}</Btn></>}>
      <div className="p-6 text-[14px] text-[#32363a] leading-[1.6]">{text}</div>
    </Modal>
  )
}

/** Concur-style dropdown menu anchored to a trigger */
export function Menu({ trigger, items, align = 'left', agent, className = '' }: { trigger: ReactNode; items: ({ label: string; onClick: () => void; disabled?: boolean; agent?: string } | null)[]; align?: 'left' | 'right'; agent?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" data-agent={agent} onClick={() => setOpen((o) => !o)} className={className}>{trigger}</button>
      {open && (
        <div className={`absolute z-40 top-full mt-1 min-w-[220px] bg-white rounded border border-[#d9d9d9] shadow-lg py-1 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.filter(Boolean).map((it) => (
            <button
              key={it!.label}
              role="menuitem"
              data-agent={it!.agent}
              disabled={it!.disabled}
              onClick={() => { setOpen(false); it!.onClick() }}
              className="block w-full text-left px-4 py-2 text-[14px] text-[#32363a] hover:bg-[#ebf5fe] disabled:opacity-40 disabled:hover:bg-transparent whitespace-nowrap"
            >
              {it!.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <span className="flex items-center gap-1 text-[#0a6ed1] font-semibold">{children} <ChevronDown className="w-4 h-4" /></span>
)

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center mb-5">
      <div className="text-[26px] font-light text-[#32363a] flex-1">{children}</div>
      {right}
    </div>
  )
}

export function Tabs({ tabs, value, onChange, prefix }: { tabs: [string, string][]; value: string; onChange: (k: string) => void; prefix: string }) {
  return (
    <div className="flex gap-6 border-b border-[#e5e5e5]">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" data-agent={`${prefix}-${k}`} onClick={() => onChange(k)} className={`relative h-11 text-[14px] font-semibold ${value === k ? 'text-[#0a6ed1]' : 'text-[#32363a] hover:text-[#0a6ed1]'}`}>
          {l}
          {value === k && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#0a6ed1]" />}
        </button>
      ))}
    </div>
  )
}

export const initials = (n: string) => n.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()

/** inline confirmation / info strip (Concur "toast" bar) */
export function Banner({ type = 'success', children, onClose }: { type?: 'success' | 'info' | 'error'; children: ReactNode; onClose?: () => void }) {
  const c = type === 'success' ? ['#f1fdf6', '#107e3e'] : type === 'error' ? ['#ffebeb', '#bb0000'] : ['#ebf5fe', '#0a6ed1']
  return (
    <div className="flex items-center gap-2 rounded border px-3 py-2 text-[14px] text-[#32363a] mb-4" style={{ background: c[0], borderColor: c[1] + '66' }} role="status">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c[1] }} />
      <div className="flex-1">{children}</div>
      {onClose && <button onClick={onClose} aria-label="Dismiss" className="w-6 h-6 rounded hover:bg-black/5 flex items-center justify-center"><X className="w-4 h-4" /></button>}
    </div>
  )
}

/** read a picked file name (receipts are stored by name only) */
export function pickFile(accept = 'image/*,.pdf'): Promise<string | null> {
  return new Promise((resolve) => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = accept
    inp.onchange = () => resolve(inp.files?.[0]?.name ?? null)
    inp.click()
  })
}
