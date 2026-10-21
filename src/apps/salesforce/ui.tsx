import { createContext, useContext, type ReactNode } from 'react'
import {
  Building2,
  CalendarDays,
  ChartColumn,
  Check,
  ChevronDown,
  Contact,
  Crown,
  FileText,
  Gauge,
  House,
  ListChecks,
  Mail,
  Megaphone,
  MessagesSquare,
  Package,
  Phone,
  ReceiptText,
  TrendingUp,
  UserStar,
  Users,
  History,
} from 'lucide-react'
import { person } from '@/data/people'
import { logoUrl } from '@/os/registry'

export type Route =
  | { page: 'home' }
  | { page: 'list'; object: string; filter?: string }
  | { page: 'record'; object: string; id: string }
  | { page: 'search'; q: string }

export const NavCtx = createContext<{ go: (r: Route) => void; route: Route }>({ go: () => {}, route: { page: 'home' } })
export const useNav = () => useContext(NavCtx)

export const SF_BLUE = '#0176D3'

export const OBJ: Record<string, { color: string; icon: any; label: string; plural: string; key: string }> = {
  Opportunity: { color: '#FF5D2D', icon: Crown, label: 'Opportunity', plural: 'Opportunities', key: '006' },
  Account: { color: '#5867E8', icon: Building2, label: 'Account', plural: 'Accounts', key: '001' },
  Contact: { color: '#A094ED', icon: Contact, label: 'Contact', plural: 'Contacts', key: '003' },
  Lead: { color: '#F88962', icon: UserStar, label: 'Lead', plural: 'Leads', key: '00Q' },
  Task: { color: '#3BA755', icon: ListChecks, label: 'Task', plural: 'Tasks', key: '00T' },
  Event: { color: '#CB65FF', icon: CalendarDays, label: 'Event', plural: 'Events', key: '00U' },
  Call: { color: '#48C3CC', icon: Phone, label: 'Call', plural: 'Calls', key: '00T' },
  Email: { color: '#939393', icon: Mail, label: 'Email', plural: 'Emails', key: '02s' },
  Campaign: { color: '#F49756', icon: Megaphone, label: 'Campaign', plural: 'Campaigns', key: '701' },
  Dashboard: { color: '#EF6E64', icon: Gauge, label: 'Dashboard', plural: 'Dashboards', key: '01Z' },
  Report: { color: '#2ECBBE', icon: ChartColumn, label: 'Report', plural: 'Reports', key: '00O' },
  File: { color: '#9DA4B1', icon: FileText, label: 'File', plural: 'Files', key: '069' },
  Chatter: { color: '#00A1E0', icon: MessagesSquare, label: 'Chatter', plural: 'Chatter', key: '' },
  Forecasts: { color: '#6B9EE2', icon: TrendingUp, label: 'Forecasts', plural: 'Forecasts', key: '' },
  Home: { color: '#FF538A', icon: House, label: 'Home', plural: 'Home', key: '' },
  Product: { color: '#B781D3', icon: Package, label: 'Product', plural: 'Products', key: '01t' },
  Quote: { color: '#88C651', icon: ReceiptText, label: 'Quote', plural: 'Quotes', key: '0Q0' },
  ContactRole: { color: '#A094ED', icon: Users, label: 'Contact Role', plural: 'Contact Roles', key: '' },
  History: { color: '#7F8DE1', icon: History, label: 'History', plural: 'History', key: '' },
}

export function ObjIcon({ type, size = 32, className = '' }: { type: string; size?: number; className?: string }) {
  const o = OBJ[type] ?? OBJ.File
  const I = o.icon
  return (
    <span className={`inline-flex items-center justify-center shrink-0 rounded-[4px] ${className}`} style={{ width: size, height: size, background: o.color }}>
      <I size={Math.round(size * 0.6)} color="#fff" strokeWidth={2} />
    </span>
  )
}

export const alias = (id: string) => {
  const p = person(id)
  return (p.first[0] + p.last.replace(/[^A-Za-z]/g, '').slice(0, 4)).toLowerCase()
}

export const usd = (n: number | null | undefined, cents = true) =>
  n == null || n === ('' as any) ? '' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })

export const usdShort = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 2).replace(/\.?0+$/, '')}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`)

/** 10/30/2026 */
export const sfDate = (v?: string) => {
  if (!v) return ''
  const dt = v.length === 10 ? new Date(v + 'T12:00:00') : new Date(v)
  return dt.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}
export const sfDateTime = (v?: string) => {
  if (!v) return ''
  const dt = new Date(v)
  return dt.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) + ', ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function Btn({
  children,
  variant = 'neutral',
  onClick,
  agent,
  label,
  className = '',
  disabled,
  icon,
}: {
  children?: ReactNode
  variant?: 'neutral' | 'brand' | 'outline' | 'destructive' | 'success'
  onClick?: () => void
  agent?: string
  label?: string
  className?: string
  disabled?: boolean
  icon?: ReactNode
}) {
  const styles: Record<string, string> = {
    neutral: 'bg-white border-[#C9C9C9] text-[#0176D3] hover:bg-[#F3F3F3]',
    brand: 'bg-[#0176D3] border-[#0176D3] text-white hover:bg-[#014486] hover:border-[#014486]',
    outline: 'bg-white border-[#0176D3] text-[#0176D3] hover:bg-[#F3F3F3]',
    destructive: 'bg-[#BA0517] border-[#BA0517] text-white',
    success: 'bg-[#2E844A] border-[#2E844A] text-white',
  }
  return (
    <button
      data-agent={agent}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-[4px] border text-[13px] whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-default ${styles[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}

/** button group like [New Event | New Task | Edit | ▼] */
export function BtnGroup({ items }: { items: { label: string; agent?: string; onClick?: () => void }[] }) {
  return (
    <div className="inline-flex">
      {items.map((it, i) => (
        <button
          key={it.label}
          data-agent={it.agent}
          onClick={it.onClick}
          className={`h-8 px-4 border border-[#C9C9C9] bg-white text-[13px] text-[#0176D3] hover:bg-[#F3F3F3] ${i ? '-ml-px' : ''} ${i === 0 ? 'rounded-l-[4px]' : ''}`}
        >
          {it.label}
        </button>
      ))}
      <button className="h-8 w-8 -ml-px border border-[#C9C9C9] bg-white text-[#747474] rounded-r-[4px] hover:bg-[#F3F3F3] flex items-center justify-center" aria-label="Show more actions">
        <ChevronDown size={14} />
      </button>
    </div>
  )
}

export function Card({ title, icon, count, actions, children, className = '', footer, agent }: { title: ReactNode; icon?: string; count?: number; actions?: ReactNode; children?: ReactNode; className?: string; footer?: ReactNode; agent?: string }) {
  return (
    <section data-agent={agent} className={`bg-white rounded-[4px] border border-[#C9C9C9] ${className}`} style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }}>
      <header className="flex items-center gap-3 px-4 pt-3 pb-2">
        {icon && <ObjIcon type={icon} size={24} />}
        <h2 className="flex-1 text-[14px] font-bold text-[#181818] truncate">
          {title}
          {count != null && <span className="font-bold"> ({count})</span>}
        </h2>
        {actions}
      </header>
      {children}
      {footer && <footer className="border-t border-[#E5E5E5] h-10 flex items-center justify-center text-[13px] text-[#0176D3] hover:underline cursor-pointer">{footer}</footer>}
    </section>
  )
}

export function Link({ children, onClick, agent, label, className = '' }: { children: ReactNode; onClick?: () => void; agent?: string; label?: string; className?: string }) {
  return (
    <button data-agent={agent} aria-label={label} onClick={onClick} className={`text-[#0176D3] hover:underline text-left ${className}`}>
      {children}
    </button>
  )
}

export function HWChip({ text = 'H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full text-[10.5px] font-semibold text-white align-middle" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> {text}
    </span>
  )
}

export function Check16() {
  return <Check size={14} strokeWidth={3} />
}

export const inputCls =
  'w-full h-8 px-3 rounded-[4px] border border-[#C9C9C9] bg-white text-[13px] text-[#181818] outline-none focus:border-[#1B96FF] focus:shadow-[0_0_3px_#0176D3]'
export const labelCls = 'block text-[12px] text-[#444444] mb-0.5'
