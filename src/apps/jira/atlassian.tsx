import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search, Bell, HelpCircle, Settings, Plus, PanelLeft, Grip, Sparkles, X, CornerDownLeft } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'

export const ATL_FONT = "'Atlassian Sans', ui-sans-serif, -apple-system, 'Segoe UI', Inter, Ubuntu, 'Helvetica Neue', sans-serif"
export const T = { text: '#292A2E', subtle: '#505258', subtlest: '#6B6E76', border: '#0B120E24', blue: '#1868DB', blueHover: '#1558BC', bgNeutral: '#0515240F', selected: '#E9F2FE' }

export function copyText(t: string) {
  try {
    void navigator.clipboard?.writeText(t).catch(() => {})
  } catch {
    /* clipboard unavailable */
  }
}

/** Atlassian-style dropdown. Closes on outside click / Escape; clicks on elements marked data-atl-trigger are left to the trigger. */
export function Pop({ onClose, className = '', children, agent }: { onClose: () => void; className?: string; children: ReactNode; agent?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t?.closest?.('[data-atl-trigger]')) return
      const scope = ref.current?.parentElement ?? ref.current
      if (scope && !scope.contains(t)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const id = setTimeout(() => document.addEventListener('mousedown', down), 0)
    document.addEventListener('keydown', key)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [onClose])
  return (
    <div ref={ref} data-agent={agent} className={`absolute z-50 bg-white rounded-[6px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] py-1.5 text-[14px] text-[#292A2E] ${className}`}>
      {children}
    </div>
  )
}
export function PopItem({ children, onClick, agent, disabled, danger, active }: { children: ReactNode; onClick?: () => void; agent?: string; disabled?: boolean; danger?: boolean; active?: boolean }) {
  return (
    <button type="button" data-agent={agent} disabled={disabled} onClick={onClick} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-[#0515240F] disabled:text-[#B7B9BE] disabled:hover:bg-transparent ${danger ? 'text-[#AE2E24]' : ''} ${active ? 'bg-[#E9F2FE] text-[#1868DB]' : ''}`}>
      {children}
    </button>
  )
}
export function PopHeading({ children }: { children: ReactNode }) {
  return <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase text-[#6B6E76]">{children}</div>
}

/** Atlassian modal dialog */
export function Dialog({ title, onClose, children, footer, width = 560, agent }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-[60] bg-[#050C1F]/50 flex items-start justify-center pt-20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[12px] shadow-xl max-w-[92%] flex flex-col max-h-[80%]" style={{ width }} data-agent={agent}>
        <div className="h-[60px] shrink-0 flex items-center px-6">
          <h2 className="text-[20px] font-semibold flex-1">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-[4px] hover:bg-[#0515240F] flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="px-6 pb-4 text-[14px] overflow-auto">{children}</div>
        {footer && <div className="h-[64px] shrink-0 flex items-center justify-end px-6 gap-2">{footer}</div>}
      </div>
    </div>
  )
}
export const btnSubtle = 'h-8 px-3 rounded-[4px] hover:bg-[#0515240F] text-[14px] font-medium text-[#292A2E]'
export const btnDefault = 'h-8 px-3 rounded-[4px] bg-[#0515240F] hover:bg-[#0B120E24] text-[14px] font-medium text-[#292A2E] disabled:opacity-50'
export const btnPrimary = 'h-8 px-3 rounded-[4px] bg-[#1868DB] hover:bg-[#1558BC] text-white text-[14px] font-medium disabled:opacity-50'
export const inputAtl = 'w-full h-9 px-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB] focus:shadow-[0_0_0_1px_#1868DB] bg-white'

export type AtlNotification = { id: string; title: ReactNode; body?: string; date: string; onClick?: () => void }
export type RovoHit = { id: string; title: string; sub?: string; onClick: () => void }

const APPS: [string, string][] = [['jira', 'Jira'], ['confluence', 'Confluence'], ['slack', 'Slack'], ['zendesk', 'Zendesk'], ['servicenow', 'ServiceNow'], ['teams', 'Microsoft Teams']]

export function TopNav({
  product, onCreate, createAgent, search = 'Search', onSearch, onToggleSidebar, onHome, notifications, rovo, helpItems, settingsItems,
}: {
  product: 'jira' | 'confluence'
  onCreate: () => void
  createAgent: string
  search?: string
  onSearch?: (q: string) => void
  onToggleSidebar?: () => void
  onHome?: () => void
  notifications?: AtlNotification[]
  rovo?: (q: string) => RovoHit[]
  helpItems?: { label: string; onClick: () => void }[]
  settingsItems?: { label: string; onClick: () => void }[]
}) {
  const desk = useDesk()
  const { close } = useWin()
  const [menu, setMenu] = useState<null | 'apps' | 'bell' | 'help' | 'settings' | 'me' | 'rovo'>(null)
  const [q, setQ] = useState('')
  const [rq, setRq] = useState('')
  const [asked, setAsked] = useState<string | null>(null)
  const [read, setRead] = useState<Set<string>>(new Set())
  const unread = (notifications ?? []).filter((n) => !read.has(n.id)).length
  const toggle = (m: typeof menu) => setMenu((x) => (x === m ? null : m))
  const hits = asked && rovo ? rovo(asked) : []
  const iconBtn = 'relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#0515240F] text-[#505258]'
  return (
    <div className="h-[56px] shrink-0 flex items-center gap-2 px-3 border-b bg-white relative z-30" style={{ borderColor: '#0B120E24' }}>
      <button className="w-8 h-8 rounded-[4px] flex items-center justify-center hover:bg-[#0515240F] text-[#505258]" aria-label="Collapse sidebar" onClick={onToggleSidebar}><PanelLeft size={18} /></button>
      <span className="relative">
        <button data-atl-trigger className={`w-8 h-8 rounded-[4px] flex items-center justify-center hover:bg-[#0515240F] text-[#505258] ${menu === 'apps' ? 'bg-[#E9F2FE] text-[#1868DB]' : ''}`} aria-label="Apps" onClick={() => toggle('apps')}><Grip size={18} /></button>
        {menu === 'apps' && (
          <Pop onClose={() => setMenu(null)} className="left-0 top-10 w-[260px]">
            <PopHeading>Switch to</PopHeading>
            {APPS.map(([id, name]) => (
              <PopItem key={id} active={id === product} onClick={() => { setMenu(null); if (id !== product) desk.open(id) }}>
                <img src={logoUrl(id)} className="w-5 h-5 object-contain" alt="" /> {name}
              </PopItem>
            ))}
          </Pop>
        )}
      </span>
      <button onClick={onHome} className="flex items-center gap-1.5 px-1.5 h-8 rounded-[4px] hover:bg-[#0515240F] cursor-pointer">
        <span className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: '#1868DB' }}>
          <img src={logoUrl(product)} className="w-4 h-4 brightness-0 invert" alt="" />
        </span>
        <span className="text-[16px] font-semibold text-[#292A2E]">{product === 'jira' ? 'Jira' : 'Confluence'}</span>
      </button>
      <div className="flex-1 flex justify-center gap-2">
        <div className="relative w-full max-w-[680px]">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#505258]" />
          <input
            placeholder={search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim() && onSearch) {
                onSearch(q.trim())
                setQ('')
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            data-agent={`${product === 'jira' ? 'jira' : 'conf'}-search`}
            className="w-full h-8 pl-8 pr-3 rounded-[6px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB] focus:shadow-[0_0_0_1px_#1868DB] placeholder:text-[#6B6E76]"
          />
        </div>
        <button data-agent={createAgent} aria-label="Create" onClick={onCreate} className="h-8 px-3 rounded-[4px] bg-[#1868DB] hover:bg-[#1558BC] text-white text-[14px] font-medium flex items-center gap-1.5 shrink-0">
          <Plus size={16} /> Create
        </button>
      </div>
      <span className="relative">
        <button data-atl-trigger onClick={() => toggle('rovo')} className={`h-8 px-2.5 rounded-[4px] border border-[#0B120E24] text-[14px] text-[#292A2E] flex items-center gap-1.5 hover:bg-[#0515240F] ${menu === 'rovo' ? 'bg-[#F3F0FF]' : ''}`}><Sparkles size={15} className="text-[#AF59E1]" /> Ask Rovo</button>
        {menu === 'rovo' && (
          <Pop onClose={() => setMenu(null)} className="right-0 top-10 w-[380px] !py-0" agent={`${product === 'jira' ? 'jira' : 'conf'}-rovo`}>
            <div className="px-4 py-3 border-b border-[#0B120E24] flex items-center gap-2"><Sparkles size={16} className="text-[#AF59E1]" /><b>Rovo</b><span className="text-[12px] text-[#6B6E76]">searches your {product === 'jira' ? 'work items' : 'pages'}</span></div>
            <div className="px-4 py-3 max-h-[320px] overflow-auto">
              {asked ? (
                <>
                  <div className="text-[13px] text-[#505258] mb-2">{hits.length ? `Here’s what I found for “${asked}”:` : `I couldn’t find anything about “${asked}”. Try other keywords.`}</div>
                  {hits.slice(0, 8).map((h) => (
                    <button key={h.id} onClick={() => { setMenu(null); h.onClick() }} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#0515240F]">
                      <div className="text-[14px] text-[#1868DB]">{h.title}</div>
                      {h.sub && <div className="text-[12px] text-[#6B6E76] truncate">{h.sub}</div>}
                    </button>
                  ))}
                </>
              ) : (
                <div className="text-[13px] text-[#505258]">Ask a question or describe what you’re looking for, e.g. “SSO bugs in review”.</div>
              )}
            </div>
            <div className="px-3 py-2 border-t border-[#0B120E24] flex items-center gap-2">
              <input autoFocus value={rq} onChange={(e) => setRq(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && rq.trim()) setAsked(rq.trim()) }} placeholder="Ask Rovo…" className="flex-1 h-8 px-2 rounded-[4px] border border-[#8C8F97] text-[14px] outline-none focus:border-[#1868DB]" />
              <button aria-label="Send" disabled={!rq.trim()} onClick={() => setAsked(rq.trim())} className="w-8 h-8 rounded-[4px] bg-[#1868DB] text-white flex items-center justify-center disabled:opacity-40"><CornerDownLeft size={15} /></button>
            </div>
          </Pop>
        )}
      </span>
      <span className="relative">
        <button data-atl-trigger aria-label="Notifications" className={iconBtn} onClick={() => toggle('bell')}>
          <Bell size={18} />
          {unread > 0 && <span className="absolute top-0.5 right-0 h-4 min-w-4 px-1 rounded-full bg-[#1868DB] text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
        </button>
        {menu === 'bell' && (
          <Pop onClose={() => setMenu(null)} className="right-0 top-10 w-[400px] !py-0">
            <div className="px-4 py-3 flex items-center border-b border-[#0B120E24]"><b className="text-[16px]">Notifications</b><div className="flex-1" /><button className="text-[13px] text-[#1868DB] hover:underline" onClick={() => setRead(new Set((notifications ?? []).map((n) => n.id)))}>Mark all as read</button></div>
            <div className="max-h-[400px] overflow-auto">
              {(notifications ?? []).map((n) => (
                <button key={n.id} onClick={() => { setRead((r) => new Set([...r, n.id])); setMenu(null); n.onClick?.() }} className="w-full text-left px-4 py-2.5 hover:bg-[#0515240F] border-b border-[#0B120E14] flex gap-2">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${read.has(n.id) ? 'bg-transparent' : 'bg-[#1868DB]'}`} />
                  <span className="min-w-0">
                    <span className="block text-[14px]">{n.title}</span>
                    {n.body && <span className="block text-[13px] text-[#505258] truncate">{n.body}</span>}
                    <span className="block text-[12px] text-[#6B6E76]">{new Date(n.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </span>
                </button>
              ))}
              {!notifications?.length && <div className="px-4 py-8 text-center text-[14px] text-[#505258]">You have no notifications from the last 30 days.</div>}
            </div>
          </Pop>
        )}
      </span>
      <span className="relative">
        <button data-atl-trigger aria-label="Help" className={iconBtn} onClick={() => toggle('help')}><HelpCircle size={18} /></button>
        {menu === 'help' && (
          <Pop onClose={() => setMenu(null)} className="right-0 top-10 w-[240px]">
            <PopHeading>Help</PopHeading>
            {(helpItems ?? []).map((h) => <PopItem key={h.label} onClick={() => { setMenu(null); h.onClick() }}>{h.label}</PopItem>)}
            <PopItem onClick={() => { setMenu(null); desk.open('edge', { q: `Atlassian ${product === 'jira' ? 'Jira' : 'Confluence'} documentation` }) }}>Browse documentation</PopItem>
            <PopItem onClick={() => { setMenu(null); desk.open('edge', { q: 'Atlassian Community' }) }}>Ask the community</PopItem>
          </Pop>
        )}
      </span>
      <span className="relative">
        <button data-atl-trigger aria-label="Settings" className={iconBtn} onClick={() => toggle('settings')}><Settings size={18} /></button>
        {menu === 'settings' && (
          <Pop onClose={() => setMenu(null)} className="right-0 top-10 w-[240px]">
            <PopHeading>{product === 'jira' ? 'Jira settings' : 'Confluence settings'}</PopHeading>
            {(settingsItems ?? []).map((h) => <PopItem key={h.label} onClick={() => { setMenu(null); h.onClick() }}>{h.label}</PopItem>)}
            {!settingsItems?.length && <div className="px-3 py-2 text-[13px] text-[#6B6E76]">Only site admins can change these settings.</div>}
          </Pop>
        )}
      </span>
      <span className="relative">
        <button data-atl-trigger aria-label="Your profile and settings" className="rounded-full" onClick={() => toggle('me')}><Avatar id={ME.id} size={26} /></button>
        {menu === 'me' && (
          <Pop onClose={() => setMenu(null)} className="right-0 top-10 w-[260px]">
            <div className="px-3 py-2 flex items-center gap-3"><Avatar id={ME.id} size={36} /><div className="min-w-0"><div className="font-semibold">{ME.name}</div><div className="text-[12px] text-[#6B6E76] truncate">{ME.email}</div></div></div>
            <div className="h-px bg-[#0B120E24] my-1" />
            <PopItem onClick={() => { setMenu(null); desk.open('teams') }}>Message your team</PopItem>
            <PopItem onClick={() => { setMenu(null); desk.open(product === 'jira' ? 'confluence' : 'jira') }}>Open {product === 'jira' ? 'Confluence' : 'Jira'}</PopItem>
            <div className="h-px bg-[#0B120E24] my-1" />
            <PopItem onClick={() => close()}>Log out</PopItem>
          </Pop>
        )}
      </span>
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
  const [bg, fg] = c[tone] ?? c.default
  return <span className={`inline-flex items-center h-[18px] px-1 rounded-[3px] text-[11px] uppercase whitespace-nowrap ${bold ? 'font-bold' : 'font-semibold'}`} style={{ background: bg, color: fg }}>{children}</span>
}

export function HWBadge() {
  return <span className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-[3px] bg-[#430693] text-white text-[10.5px] font-bold"><img src={logoUrl('hworker')} className="w-2.5 h-2.5" alt="" />H-Worker</span>
}

/** Atlassian flag (bottom-left notification) */
export function Flag({ children, onClose, agent }: { children: ReactNode; onClose: () => void; agent?: string }) {
  const cb = useRef(onClose)
  cb.current = onClose
  useEffect(() => {
    const t = setTimeout(() => cb.current(), 5000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="absolute left-6 bottom-6 z-[70] w-[380px] bg-white rounded-[8px] shadow-[0_8px_12px_#1E1F2126,0_0_1px_#1E1F214F] p-4 flex gap-3" data-agent={agent} role="status">
      <span className="w-6 h-6 rounded-full bg-[#22A06B] text-white flex items-center justify-center text-[13px] shrink-0">✓</span>
      <div className="flex-1 text-[14px]">{children}</div>
      <button onClick={onClose} aria-label="Dismiss"><X size={16} /></button>
    </div>
  )
}
