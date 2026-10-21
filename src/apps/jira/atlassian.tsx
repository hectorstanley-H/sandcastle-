import type { ReactNode } from 'react'
import { Search, Bell, HelpCircle, Settings, Plus, PanelLeft, Grip, Sparkles } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'

export const ATL_FONT = "'Atlassian Sans', ui-sans-serif, -apple-system, 'Segoe UI', Inter, Ubuntu, 'Helvetica Neue', sans-serif"
export const T = { text: '#292A2E', subtle: '#505258', subtlest: '#6B6E76', border: '#0B120E24', blue: '#1868DB', blueHover: '#1558BC', bgNeutral: '#0515240F', selected: '#E9F2FE' }

export function TopNav({ product, onCreate, createAgent, search = 'Search' }: { product: 'jira' | 'confluence'; onCreate: () => void; createAgent: string; search?: string }) {
  return (
    <div className="h-[56px] shrink-0 flex items-center gap-2 px-3 border-b bg-white" style={{ borderColor: '#0B120E24' }}>
      <button className="w-8 h-8 rounded-[4px] flex items-center justify-center hover:bg-[#0515240F] text-[#505258]" aria-label="Collapse sidebar"><PanelLeft size={18} /></button>
      <button className="w-8 h-8 rounded-[4px] flex items-center justify-center hover:bg-[#0515240F] text-[#505258]" aria-label="Apps"><Grip size={18} /></button>
      <div className="flex items-center gap-1.5 px-1.5 h-8 rounded-[4px] hover:bg-[#0515240F] cursor-pointer">
        <span className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: product === 'jira' ? '#1868DB' : '#1868DB' }}>
          <img src={logoUrl(product)} className="w-4 h-4 brightness-0 invert" alt="" />
        </span>
        <span className="text-[16px] font-semibold text-[#292A2E]">{product === 'jira' ? 'Jira' : 'Confluence'}</span>
      </div>
      <div className="flex-1 flex justify-center gap-2">
        <div className="relative w-full max-w-[680px]">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#505258]" />
          <input placeholder={search} className="w-full h-8 pl-8 pr-3 rounded-[6px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB] focus:shadow-[0_0_0_1px_#1868DB] placeholder:text-[#6B6E76]" />
        </div>
        <button data-agent={createAgent} aria-label="Create" onClick={onCreate} className="h-8 px-3 rounded-[4px] bg-[#1868DB] hover:bg-[#1558BC] text-white text-[14px] font-medium flex items-center gap-1.5 shrink-0">
          <Plus size={16} /> Create
        </button>
      </div>
      <button className="h-8 px-2.5 rounded-[4px] border border-[#0B120E24] text-[14px] text-[#292A2E] flex items-center gap-1.5 hover:bg-[#0515240F]"><Sparkles size={15} className="text-[#AF59E1]" /> Ask Rovo</button>
      {[Bell, HelpCircle, Settings].map((I, i) => (
        <button key={i} className="relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#0515240F] text-[#505258]">
          <I size={18} />
          {i === 0 && <span className="absolute top-0.5 right-0 h-4 min-w-4 px-1 rounded-full bg-[#1868DB] text-white text-[10px] font-bold flex items-center justify-center">3</span>}
        </button>
      ))}
      <Avatar id={ME.id} size={26} />
    </div>
  )
}

export function SideItem({ icon, label, active, onClick, agent, indent }: { icon?: ReactNode; label: ReactNode; active?: boolean; onClick?: () => void; agent?: string; indent?: number }) {
  return (
    <button
      data-agent={agent}
      onClick={onClick}
      className={`relative w-full h-8 flex items-center gap-2 pr-2 rounded-[4px] text-[14px] text-left ${active ? 'bg-[#E9F2FE] text-[#1868DB] font-medium' : 'text-[#292A2E] hover:bg-[#0515240F]'}`}
      style={{ paddingLeft: 8 + (indent ?? 0) * 16 }}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded bg-[#1868DB]" />}
      {icon && <span className={`w-5 flex justify-center shrink-0 ${active ? 'text-[#1868DB]' : 'text-[#505258]'}`}>{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  )
}

export function Lozenge({ children, tone = 'default', bold }: { children: ReactNode; tone?: 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'grey'; bold?: boolean }) {
  const c: Record<string, [string, string]> = {
    default: ['#DDDEE1', '#292A2E'],
    grey: ['#DDDEE1', '#292A2E'],
    blue: ['#CFE1FD', '#1558BC'],
    green: ['#BAF3DB', '#216E4E'],
    yellow: ['#F8E6A0', '#7F5F01'],
    red: ['#FFD5D2', '#AE2E24'],
    purple: ['#EED7FC', '#803FA5'],
  }
  const [bg, fg] = c[tone]
  return <span className={`inline-flex items-center h-[18px] px-1 rounded-[3px] text-[11px] uppercase whitespace-nowrap ${bold ? 'font-bold' : 'font-semibold'}`} style={{ background: bg, color: fg }}>{children}</span>
}

export function HWBadge() {
  return <span className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-[3px] bg-[#430693] text-white text-[10.5px] font-bold"><img src={logoUrl('hworker')} className="w-2.5 h-2.5" alt="" />H-Worker</span>
}
