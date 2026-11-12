/** NetSuite (Redwood-era classic UI) shared primitives, view model and small data helpers. */
import { type ReactNode } from 'react'
import { Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { db, useRecord } from '@/db/db'

export const BAR = '#13212c'
export const MENU = '#26394a'
export const BTN = '#3a75c4'
export const n2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '')
export const money = (n: number) => (n < 0 ? `(${n2(-n)})` : n2(n))

export const NS_ACCOUNTS = [
  '1010 Woodgrove Operating Checking', '1020 Woodgrove Payroll Account', '1200 Accounts Receivable', '1300 Prepaid Expenses', '1590 Accumulated Depreciation',
  '2000 Accounts Payable', '2100 Accrued Payroll', '2150 Accrued Liabilities', '2400 Deferred Revenue', '4000 Revenue',
  '6000 Salaries & Wages', '6110 Office Supplies', '6120 Facilities Maintenance', '6130 Utilities', '6200 Professional Services', '6401 Software Subscriptions',
  '6403 Cloud Hosting', '6810 Bank Service Charges', '6900 Depreciation Expense', '7100 Unrealized FX Gain/Loss', '8100 Interest Income',
]
export const DEPTS = ['Finance', 'Operations', 'Sales', 'IT', 'G&A']
export const ROLES = ['Controller', 'A/P Clerk', 'Administrator', 'CFO']

export type ReportId = 'tb' | 'is' | 'bs' | 'ap'
export type View =
  | { v: 'home' }
  | { v: 'match' }
  | { v: 'recon' }
  | { v: 'je'; id?: string; copyOf?: string }
  | { v: 'jes'; status?: string }
  | { v: 'bill'; id?: string; vendor?: string }
  | { v: 'bills' }
  | { v: 'search' }
  | { v: 'searches' }
  | { v: 'ss'; id: string }
  | { v: 'txns'; type?: string }
  | { v: 'vendors' }
  | { v: 'vendor'; id: string }
  | { v: 'customers' }
  | { v: 'entity'; kind: 'vendor' | 'customer' }
  | { v: 'coa' }
  | { v: 'report'; id: ReportId }
  | { v: 'tasks' }
  | { v: 'pos' }
  | { v: 'invoices'; overdue?: boolean }
  | { v: 'returns' }
  | { v: 'pay' }
  | { v: 'gsearch'; q: string }
  | { v: 'help' }
  | { v: 'company' }
  | { v: 'personalize' }
  | { v: 'users' }
  | { v: 'files' }

export type Go = (v: View) => void

/* ───────────── prefs (persisted per user in the demo DB) ───────────── */

export interface NsPrefs {
  id: 'me'
  role?: string
  layout?: '3col' | '2col'
  hidden?: string[]
  collapsed?: string[]
  shortcuts?: { label: string; view: View }[]
  company?: Record<string, string>
}
export function usePrefs(): NsPrefs {
  return (useRecord<any>('netsuite.prefs', 'me') as NsPrefs | undefined) ?? { id: 'me' }
}
export function setPrefs(patch: Partial<NsPrefs> | ((p: NsPrefs) => Partial<NsPrefs>)) {
  const cur = (db.find<any>('netsuite.prefs', 'me') as NsPrefs | undefined) ?? { id: 'me' }
  db.upsert('netsuite.prefs', { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch), id: 'me' })
}

/* ───────────── vendors: seeded extras + every vendor seen on a bill ───────────── */

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export function mergeVendors(vendors: any[], bills: any[]) {
  const out = [...vendors]
  for (const name of new Set(bills.map((b) => b.vendor))) {
    if (!out.some((v) => v.name === name)) out.push({ id: `nsv-${slug(name)}`, name, category: 'Supplier', terms: 'Net 30', email: '', phone: '', derived: true })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/* ───────────── CSV export (real file) ───────────── */

export function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  try {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    /* ignore — export is best-effort in the demo */
  }
}

/* ───────────── primitives ───────────── */

export function Btn({ primary, children, className = '', ...rest }: any) {
  return (
    <button className={`inline-flex items-center gap-1 h-[28px] px-3 rounded-[3px] text-[13px] font-semibold border disabled:opacity-50 ${primary ? 'text-white border-[#2b5fa6]' : 'bg-[#f0f0f0] text-[#333] border-[#b9b9b9] hover:bg-[#e4e4e4]'} ${className}`} style={primary ? { background: `linear-gradient(#4a86d4, ${BTN})` } : undefined} {...rest}>
      {children}
    </button>
  )
}
export const inp = 'h-[26px] w-full rounded-[3px] border border-[#b9b9b9] bg-white px-1.5 text-[13px] outline-none focus:border-[#3a75c4] focus:shadow-[0_0_0_1px_#3a75c4]'
export function F({ label, req, children }: { label: string; req?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase text-[#666] mb-0.5 tracking-wide">{label}{req && <span className="text-[#c00]"> *</span>}</div>
      {children}
    </div>
  )
}
/** Dashboard portlet. When `collapseKey` is given the gear toggles the portlet (persisted). */
export function Portlet({ title, children, agent, right, collapseKey }: { title: string; children: ReactNode; agent?: string; right?: ReactNode; collapseKey?: string }) {
  const prefs = usePrefs()
  const collapsed = !!collapseKey && (prefs.collapsed ?? []).includes(collapseKey)
  const toggle = () =>
    collapseKey && setPrefs((p) => ({ collapsed: (p.collapsed ?? []).includes(collapseKey) ? (p.collapsed ?? []).filter((k) => k !== collapseKey) : [...(p.collapsed ?? []), collapseKey] }))
  return (
    <div className="bg-white rounded-[4px] border border-[#d5d5d5] shadow-[0_1px_2px_rgba(0,0,0,0.06)]" data-agent={agent}>
      <div className="h-9 px-3 flex items-center border-b border-[#e4e4e4]">
        {collapseKey && (
          <button onClick={toggle} aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`} className="mr-1 text-[#888] hover:text-[#24385b]">
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
        <div className="text-[13px] font-bold text-[#24385b] uppercase tracking-wide flex-1">{title}</div>
        {right}
        {collapseKey ? (
          <button onClick={toggle} title="Portlet settings" aria-label={`${title} settings`} className="ml-2 text-[#999] hover:text-[#24385b]"><Settings className="w-3.5 h-3.5" /></button>
        ) : (
          <Settings className="w-3.5 h-3.5 text-[#999] ml-2" />
        )}
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  )
}
export function HW() {
  return <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full text-[10.5px] font-semibold text-white align-middle" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}><img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> H-Worker</span>
}
/** Record/list page header. `list` makes the "List" link navigate; Search always opens saved searches. */
export function PageHead({ kind, title, children, status, go, list }: { kind: string; title: ReactNode; children?: ReactNode; status?: ReactNode; go?: Go; list?: View }) {
  return (
    <div className="px-6 pt-4 pb-3 bg-white border-b border-[#d5d5d5]">
      <div className="flex items-center gap-3">
        <div className="text-[22px] text-[#24385b] font-semibold">{kind}</div>
        {status}
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[12px] text-[#3a75c4]">
          <button className="hover:underline disabled:no-underline disabled:cursor-default" disabled={!go || !list} onClick={() => go && list && go(list)}>List</button>
          <button className="hover:underline disabled:no-underline disabled:cursor-default" disabled={!go} onClick={() => go?.({ v: 'searches' })}>Search</button>
          <button className="hover:underline disabled:no-underline disabled:cursor-default" disabled={!go} onClick={() => go?.({ v: 'personalize' })}>Customize</button>
        </div>
      </div>
      {title && <div className="text-[14px] text-[#555] mt-0.5">{title}</div>}
      {children && <div className="flex items-center gap-2 mt-3">{children}</div>}
    </div>
  )
}
export function Banner({ ok, children, onClose }: { ok: boolean; children: ReactNode; onClose?: () => void }) {
  return (
    <div className={`mx-6 mt-3 px-3 py-2 rounded-[3px] border text-[13px] flex items-center gap-2 ${ok ? 'bg-[#eef8f0] border-[#9fd3ab] text-[#1e5b2b]' : 'bg-[#fdf0ee] border-[#efb3a9] text-[#8a2a1c]'}`}>
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose} className="text-[12px] opacity-70 hover:opacity-100">✕</button>}
    </div>
  )
}
export function StatusPill({ s }: { s: string }) {
  const good = /approved|paid|complete|reconciled|closed|received/i.test(s)
  const bad = /rejected|overdue|void/i.test(s)
  return <span className={`text-[12px] font-bold px-2 py-0.5 rounded ${good ? 'text-[#1e7b34] bg-[#eef8f0]' : bad ? 'text-[#c0392b] bg-[#fdf0ee]' : 'text-[#b45f06] bg-[#fff4e5]'}`}>{s.toUpperCase()}</span>
}
export const TH = 'text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]'
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`m-6 bg-white border border-[#d5d5d5] rounded-[4px] ${className}`}>{children}</div>
}
