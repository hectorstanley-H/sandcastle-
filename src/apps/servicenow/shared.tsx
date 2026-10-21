import type { ReactNode } from 'react'
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

export function RefButtons() {
  return (
    <>
      <button className="w-8 h-8 shrink-0 rounded-[4px] border border-[#8790A1] bg-white flex items-center justify-center text-[#4A5059] hover:bg-[#F1F3F5]" aria-label="Look up"><Search size={15} /></button>
      <button className="w-6 h-8 shrink-0 flex items-center justify-center text-[#4A5059]" aria-label="Preview record"><Info size={16} /></button>
    </>
  )
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
