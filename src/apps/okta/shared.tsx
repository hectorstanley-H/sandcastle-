import type { ReactNode } from 'react'
import { db, uid, type Rec } from '@/db/db'
import { logoUrl } from '@/os/registry'
import { ME } from '@/data/people'

export const BLUE = '#1662DD'
export const TEXT = '#1D1D21'
export const SUB = '#6E6E78'
export const BORDER = '#D7D7DC'
export const FONT = "'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

export interface OktaUser extends Rec {
  oktaId: string
  personId?: string
  firstName: string
  lastName: string
  login: string
  email: string
  title: string
  department: string
  manager: string
  status: string
  created: string
  activated?: string
  lastLogin?: string
  mfa: { type: string; enrolled: string }[]
  groups: string[]
  updatedBy?: string
}
export interface OktaApp extends Rec {
  label: string
  tile?: string
  logo: string
  signOn: string
  status: string
  provisioning?: boolean
  oktaId: string
}
export interface OktaAssignment extends Rec {
  userId: string
  appId: string
  assignedAt: string
  assignedBy: string
  scope: 'USER' | 'GROUP'
  group?: string
  appUsername?: string
}
export interface OktaLog extends Rec {
  published: string
  actor: { id: string; type: string; displayName: string; alternateId: string }
  eventType: string
  displayMessage: string
  target: { type: string; displayName: string; alternateId: string }[]
  outcome: string
  ip: string
  location: string
  client: string
  by?: string
}

export type Route = {
  area: 'home' | 'admin'
  page: 'dashboard' | 'people' | 'user' | 'groups' | 'apps' | 'logs' | 'profiles' | 'integrations' | 'security' | 'workflow' | 'customizations' | 'settings' | 'selfservice' | 'tasks'
  userId?: string
  tab?: string
}

export const STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#1E8A3A' },
  STAGED: { label: 'Staged', color: '#8C8C96' },
  PROVISIONED: { label: 'Pending user action', color: '#1662DD' },
  SUSPENDED: { label: 'Suspended', color: '#E08A00' },
  DEPROVISIONED: { label: 'Deactivated', color: '#4B4B53' },
  LOCKED_OUT: { label: 'Locked out', color: '#DA372C' },
  PASSWORD_EXPIRED: { label: 'Password reset', color: '#E08A00' },
}

export function StatusDot({ status, className = '' }: { status: string; className?: string }) {
  const s = STATUS[status] ?? STATUS.ACTIVE
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.ACTIVE
  const bg: Record<string, string> = { ACTIVE: '#E6F4EA', STAGED: '#EEEEF0', PROVISIONED: '#E6EEFC', SUSPENDED: '#FEF3DF', DEPROVISIONED: '#EEEEF0', LOCKED_OUT: '#FCE9E8', PASSWORD_EXPIRED: '#FEF3DF' }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded text-[12px] font-semibold" style={{ background: bg[status] ?? '#EEE', color: status === 'ACTIVE' ? '#1B6E31' : status === 'LOCKED_OUT' ? '#B42318' : status === 'PROVISIONED' ? '#1450B8' : '#55555E' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export function HWChip({ text = 'H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: '#F2ECFA', color: '#430693', border: '1px solid #DCCBF0', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" />
      {text}
    </span>
  )
}

export function AppLogo({ id, size = 24, className = '' }: { id: string; size?: number; className?: string }) {
  return <img src={logoUrl(id)} alt="" className={`shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />
}

export function Initials({ name, size = 32, color = '#E6EEFC', fg = '#1450B8' }: { name: string; size?: number; color?: string; fg?: string }) {
  const i = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
  return (
    <span className="rounded-full inline-flex items-center justify-center shrink-0 font-semibold select-none" style={{ width: size, height: size, background: color, color: fg, fontSize: Math.max(10, size * 0.36) }}>
      {i}
    </span>
  )
}

export function Btn({ children, primary, danger, onClick, agent, label, disabled, small, className = '' }: { children: ReactNode; primary?: boolean; danger?: boolean; onClick?: () => void; agent?: string; label?: string; disabled?: boolean; small?: boolean; className?: string }) {
  const base = `inline-flex items-center justify-center gap-1.5 rounded-[4px] font-semibold whitespace-nowrap transition-colors ${small ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-[14px]'}`
  const style = disabled
    ? 'bg-[#EEEEF0] text-[#A0A0A8] cursor-default'
    : primary
      ? 'bg-[#1662DD] text-white hover:bg-[#1450B8]'
      : danger
        ? 'bg-[#DA372C] text-white hover:bg-[#B42318]'
        : 'bg-white text-[#1D1D21] border border-[#8C8C96] hover:bg-[#F4F4F4]'
  return (
    <button type="button" data-agent={agent} aria-label={label} disabled={disabled} onClick={onClick} className={`${base} ${style} ${className}`}>
      {children}
    </button>
  )
}

/** Shared modal (Odyssey dialog). */
export function Modal({ title, children, footer, onClose, width = 560 }: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void; width?: number }) {
  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-[#1D1D21]/40 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-[0_8px_32px_rgba(29,29,33,0.24)] flex flex-col max-h-[80%]" style={{ width }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[20px] font-semibold text-[#1D1D21]">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center text-[#6E6E78] hover:bg-[#F4F4F4] text-[20px] leading-none">
            ×
          </button>
        </div>
        <div className="px-6 pb-4 overflow-auto min-h-0 text-[14px] text-[#1D1D21]">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#EBEBED] flex justify-end gap-2 bg-[#FAFAFA] rounded-b-lg">{footer}</div>}
      </div>
    </div>
  )
}

export const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`

export function actorFor(isAgent: boolean) {
  return isAgent
    ? { id: '0oahworkerapi01', type: 'PublicClientApp', displayName: 'H-Worker (API)', alternateId: 'hworker-svc@northwind.com' }
    : { id: '00ualexmorgan001', type: 'User', displayName: ME.name, alternateId: ME.email }
}

export function addLog(isAgent: boolean, eventType: string, displayMessage: string, target: OktaLog['target'], extra: Partial<OktaLog> = {}) {
  const rec: OktaLog = {
    id: uid('okta-log'),
    published: new Date().toISOString(),
    actor: actorFor(isAgent),
    eventType,
    displayMessage,
    target,
    outcome: 'SUCCESS',
    ip: isAgent ? '34.120.18.77' : '73.114.62.18',
    location: isAgent ? 'Council Bluffs, Iowa, United States' : 'Boston, Massachusetts, United States',
    client: isAgent ? 'H-Worker Agent 2.4 (Okta API)' : 'Edge 130.0 on Windows 11',
    severity: 'INFO',
    ...(isAgent ? { by: 'hworker' } : {}),
    ...extra,
  }
  db.insert('okta.logs', rec, { prepend: true })
}

export const userTarget = (u: OktaUser) => ({ type: 'User', displayName: fullName(u), alternateId: u.login })
export const appTarget = (a: OktaApp) => ({ type: 'AppInstance', displayName: a.label, alternateId: a.id })

export function fmtOkta(iso?: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export function fmtOktaTime(iso?: string) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** true for records created in the last few seconds (flash-new) */
export const isFresh = (iso?: string) => !!iso && Date.now() - new Date(iso).getTime() < 8000
