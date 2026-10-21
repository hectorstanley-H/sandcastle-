/**
 * Shared Microsoft 365 desktop chrome pieces (title bar, ribbon primitives, backstage) used by Word and PowerPoint.
 */
import { useState, type ReactNode } from 'react'
import {
  Save20Regular,
  ArrowUndo20Regular,
  ArrowRedo20Regular,
  ChevronDown12Regular,
  Search16Regular,
  ArrowLeft24Regular,
  Home24Regular,
  DocumentAdd24Regular,
  FolderOpen24Regular,
  Info24Regular,
  Print24Regular,
  Share20Regular,
  Pin16Regular,
  CloudCheckmark16Regular,
  Settings20Regular,
} from '@fluentui/react-icons'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'

export const FONT = 'var(--font-win)'

/** Microsoft 365 Copilot mark (approximation of the 2024+ colourful ribbon logo). */
export function CopilotIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="cp-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0F9BF0" />
          <stop offset="0.55" stopColor="#5A5BEF" />
          <stop offset="1" stopColor="#B340E6" />
        </linearGradient>
        <linearGradient id="cp-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9A13A" />
          <stop offset="0.5" stopColor="#F4566C" />
          <stop offset="1" stopColor="#D23FD0" />
        </linearGradient>
        <linearGradient id="cp-c" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2BC0A4" />
          <stop offset="1" stopColor="#1A8CF0" />
        </linearGradient>
      </defs>
      <path d="M11.2 3.5h8.1c1.6 0 2.9 1 3.4 2.5l-6.4 20.2c-.5 1.4-1.8 2.3-3.3 2.3H5.6c-1.6 0-2.7-1.5-2.2-3l5.1-17.5c.4-1.6 1.6-4.5 2.7-4.5z" fill="url(#cp-a)" />
      <path d="M20.8 28.5h-8.1c-1.6 0-2.9-1-3.4-2.5l6.4-20.2c.5-1.4 1.8-2.3 3.3-2.3h7.4c1.6 0 2.7 1.5 2.2 3l-5.1 17.5c-.4 1.6-1.6 4.5-2.7 4.5z" fill="url(#cp-b)" opacity="0.92" />
      <path d="M13.5 13.5h6.2l-2 6.3h-6.2z" fill="url(#cp-c)" opacity="0.85" />
    </svg>
  )
}

export function HWorkerChip({ label = 'Edited by H-Worker', className = '' }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 h-[18px] px-1.5 rounded-[4px] text-white text-[11px] font-semibold leading-none ${className}`}
      style={{ background: '#430693' }}
      title="This file was changed by an H-Worker agent"
    >
      <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" /> {label}
    </span>
  )
}

/* ───────────────────────── Title bar ───────────────────────── */

export function OfficeTitleBar({
  app,
  color,
  fileName,
  status,
  onSave,
  saveAgentId,
  saving,
  filenameButton,
  height = 40,
}: {
  app: 'word' | 'powerpoint'
  color: string
  fileName: string
  status: string
  onSave: () => void
  saveAgentId: string
  saving?: boolean
  filenameButton?: ReactNode
  height?: number
}) {
  const [autoSave, setAutoSave] = useState(true)
  const btn = 'h-8 w-8 flex items-center justify-center rounded hover:bg-white/15'
  return (
    <div data-drag-handle className="shrink-0 flex items-center text-white select-none relative" style={{ background: color, height }}>
      <div className="flex items-center gap-0.5 pl-2" data-no-drag>
        <img src={logoUrl(app)} className="w-[18px] h-[18px] mx-1.5" alt="" draggable={false} />
        <button
          onClick={() => setAutoSave((v) => !v)}
          className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-white/15 text-[12px]"
          aria-label="AutoSave"
        >
          AutoSave
          <span className={`relative inline-block w-[34px] h-[18px] rounded-full border ${autoSave ? 'bg-white border-white' : 'border-white/90'}`}>
            <span
              className="absolute top-[3px] w-[10px] h-[10px] rounded-full transition-all"
              style={{ left: autoSave ? 19 : 3, background: autoSave ? color : '#fff' }}
            />
          </span>
          <span className="w-5 text-left">{autoSave ? 'On' : 'Off'}</span>
        </button>
        <button data-agent={saveAgentId} aria-label="Save" title="Save (Ctrl+S)" onClick={onSave} className={btn}>
          {saving ? <CloudCheckmark16Regular className="w-5 h-5" /> : <Save20Regular />}
        </button>
        <button className={btn} aria-label="Undo" title="Undo (Ctrl+Z)">
          <ArrowUndo20Regular />
        </button>
        <span className="opacity-80 -ml-1.5"><ChevronDown12Regular /></span>
        <button className={btn} aria-label="Redo" title="Redo (Ctrl+Y)">
          <ArrowRedo20Regular />
        </button>
        <button className="h-8 w-5 flex items-center justify-center rounded hover:bg-white/15" aria-label="Customize Quick Access Toolbar">
          <ChevronDown12Regular />
        </button>
        <div className="ml-2">
          {filenameButton ?? (
            <span className="text-[12px] px-2">
              {fileName} • {status}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1" />
      {/* centred search */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" data-no-drag>
        <div className="flex items-center gap-2 h-[30px] w-[min(420px,28vw)] rounded-[6px] bg-white/[0.18] hover:bg-white/25 px-2.5 text-[13px] text-white/90 border border-white/10">
          <Search16Regular className="shrink-0" />
          <span className="truncate">Search</span>
          <span className="ml-auto text-[11px] text-white/60">Alt+Q</span>
        </div>
      </div>
      <div className="flex items-center gap-1 pr-1" data-no-drag>
        <button className="h-8 px-2 flex items-center gap-1.5 rounded hover:bg-white/15 text-[12px]" aria-label="Copilot">
          <span className="w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center"><CopilotIcon size={16} /></span>
        </button>
        <button className="h-8 flex items-center gap-2 px-1.5 rounded hover:bg-white/15 text-[12px]" aria-label="Account manager for Alex Morgan">
          <span>{ME.name}</span>
          <Avatar id={ME.id} size={26} ring="rgba(255,255,255,0.55)" />
        </button>
        <button className={btn} aria-label="Ribbon display options"><Settings20Regular /></button>
      </div>
      <WindowControls dark height={height} />
    </div>
  )
}

/* ───────────────────────── Ribbon primitives ───────────────────────── */

export function RibbonTabs({
  tabs,
  active,
  accent,
  onFile,
  fileAgentId,
  onTab,
  right,
}: {
  tabs: string[]
  active: string
  accent: string
  onFile: () => void
  fileAgentId: string
  onTab: (t: string) => void
  right?: ReactNode
}) {
  return (
    <div className="h-[38px] shrink-0 flex items-end px-2 bg-[#F3F3F3]">
      <div className="flex items-end h-full">
        <button
          data-agent={fileAgentId}
          aria-label="File"
          onClick={onFile}
          className="h-[30px] mb-[4px] px-3 text-[13px] rounded hover:bg-[#E5E5E5] text-[#242424]"
        >
          File
        </button>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={`relative h-[30px] mb-[4px] px-3 text-[13px] rounded hover:bg-[#E5E5E5] ${t === active ? 'font-semibold' : ''}`}
            style={{ color: t === active ? accent : '#242424' }}
          >
            {t}
            {t === active && <span className="absolute left-3 right-3 -bottom-[2px] h-[3px] rounded-full" style={{ background: accent }} />}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 h-full pb-[2px]">{right}</div>
    </div>
  )
}

export function Ribbon({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 bg-[#F3F3F3] px-2 pb-2">
      <div className="h-[104px] bg-white rounded-[8px] shadow-[0_0_2px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] flex items-stretch px-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function Group({ label, children, className = '', last }: { label: string; children: ReactNode; className?: string; last?: boolean }) {
  return (
    <div className={`relative flex flex-col shrink-0 px-1.5 pt-1.5 ${className}`}>
      <div className="flex-1 flex items-start gap-0.5 min-h-0">{children}</div>
      <div className="h-[20px] flex items-center justify-center text-[11.5px] text-[#616161] whitespace-nowrap">{label}</div>
      {!last && <span className="absolute right-0 top-2 bottom-2 w-px bg-[#E0E0E0]" />}
    </div>
  )
}

/** Large ribbon button (icon on top, label below). */
export function BigBtn({
  icon,
  label,
  dropdown,
  onClick,
  agent,
  active,
  aria,
  onDropdown,
  dropdownAgent,
}: {
  icon: ReactNode
  label: string
  dropdown?: boolean
  onClick?: () => void
  agent?: string
  active?: boolean
  aria?: string
  onDropdown?: () => void
  dropdownAgent?: string
}) {
  if (onDropdown) {
    return (
      <div className="flex flex-col items-stretch w-[60px] h-[76px] rounded-[4px] hover:outline hover:outline-1 hover:outline-[#E0E0E0]">
        <button data-agent={agent} aria-label={aria ?? label} onClick={onClick} className="flex-1 flex items-center justify-center rounded-t-[4px] hover:bg-[#F0F0F0] text-[#242424]">
          {icon}
        </button>
        <button
          data-agent={dropdownAgent}
          aria-label={`${label} options`}
          onClick={onDropdown}
          className="h-[34px] flex flex-col items-center justify-start text-[12px] leading-[14px] text-[#242424] rounded-b-[4px] hover:bg-[#F0F0F0]"
        >
          <span>{label}</span>
          <ChevronDown12Regular className="w-3 h-3" />
        </button>
      </div>
    )
  }
  return (
    <button
      data-agent={agent}
      aria-label={aria ?? label}
      onClick={onClick}
      className={`flex flex-col items-center justify-start gap-1 pt-1.5 min-w-[48px] px-1 h-[76px] rounded-[4px] text-[#242424] ${active ? 'bg-[#E0E0E0]' : 'hover:bg-[#F0F0F0]'}`}
    >
      <span className="h-8 flex items-center justify-center">{icon}</span>
      <span className="text-[12px] leading-[14px] text-center whitespace-pre-line">{label}</span>
      {dropdown && <ChevronDown12Regular className="w-3 h-3 -mt-0.5" />}
    </button>
  )
}

/** Small icon (+ optional label) button. */
export function SmBtn({
  icon,
  label,
  title,
  dropdown,
  onClick,
  agent,
  active,
}: {
  icon?: ReactNode
  label?: string
  title?: string
  dropdown?: boolean
  onClick?: () => void
  agent?: string
  active?: boolean
}) {
  return (
    <button
      data-agent={agent}
      aria-label={title ?? label}
      title={title ?? label}
      onClick={onClick}
      className={`h-[24px] flex items-center gap-1 px-[3px] rounded-[4px] text-[12px] text-[#242424] whitespace-nowrap ${active ? 'bg-[#D6D6D6]' : 'hover:bg-[#F0F0F0]'}`}
    >
      {icon && <span className="w-5 h-5 flex items-center justify-center [&_svg]:w-[18px] [&_svg]:h-[18px]">{icon}</span>}
      {label && <span>{label}</span>}
      {dropdown && <ChevronDown12Regular className="w-2.5 h-2.5 text-[#616161]" />}
    </button>
  )
}

export function FakeSelect({ value, width, title }: { value: string; width: number; title: string }) {
  return (
    <div
      title={title}
      className="h-[24px] flex items-center justify-between border border-[#D1D1D1] rounded-[4px] px-1.5 text-[12px] text-[#242424] bg-white hover:border-[#B3B3B3]"
      style={{ width }}
    >
      <span className="truncate">{value}</span>
      <ChevronDown12Regular className="w-2.5 h-2.5 text-[#616161] shrink-0" />
    </div>
  )
}

export function Sep() {
  return <span className="w-px h-5 bg-[#E0E0E0] mx-0.5 self-center" />
}

/* ───────────────────────── Backstage ───────────────────────── */

export interface RecentItem {
  id: string
  name: string
  location: string
  modified: string
  agentId: string
  hworker?: boolean
}

export function Backstage({
  app,
  color,
  appName,
  greeting,
  newTiles,
  recents,
  onBack,
  onOpen,
  canBack,
}: {
  app: 'word' | 'powerpoint'
  color: string
  appName: string
  greeting: string
  newTiles: ReactNode
  recents: RecentItem[]
  onBack: () => void
  onOpen: (id: string) => void
  canBack: boolean
}) {
  const [pane, setPane] = useState<'home' | 'new' | 'open'>('home')
  const nav: [typeof pane | string, string, ReactNode][] = [
    ['home', 'Home', <Home24Regular />],
    ['new', 'New', <DocumentAdd24Regular />],
    ['open', 'Open', <FolderOpen24Regular />],
  ]
  return (
    <div className="flex-1 min-h-0 flex" style={{ fontFamily: FONT }}>
      <div className="w-[220px] shrink-0 flex flex-col text-white" style={{ background: color }}>
        <button
          onClick={onBack}
          disabled={!canBack}
          aria-label="Back"
          className="h-14 w-14 flex items-center justify-center hover:bg-white/10 rounded-full m-2 disabled:opacity-50"
        >
          <span className="w-8 h-8 rounded-full border border-white/80 flex items-center justify-center"><ArrowLeft24Regular className="w-5 h-5" /></span>
        </button>
        {nav.map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setPane(id as typeof pane)}
            className={`h-11 flex items-center gap-3 px-6 text-[14px] text-left ${pane === id ? 'bg-black/25' : 'hover:bg-white/10'}`}
          >
            {icon}
            {label}
          </button>
        ))}
        <div className="mx-6 my-3 h-px bg-white/25" />
        {['Info', 'Save a Copy', 'Print', 'Share', 'Export', 'Close'].map((l) => (
          <button key={l} className="h-9 flex items-center gap-3 px-6 text-[13.5px] text-left hover:bg-white/10">
            {l === 'Info' && <Info24Regular className="w-5 h-5" />}
            {l === 'Print' && <Print24Regular className="w-5 h-5" />}
            {l === 'Share' && <Share20Regular />}
            {['Save a Copy', 'Export', 'Close'].includes(l) && <span className="w-5" />}
            {l}
          </button>
        ))}
        <div className="flex-1" />
        {['Account', 'Feedback', 'Options'].map((l) => (
          <button key={l} className="h-9 flex items-center px-6 text-[13.5px] text-left hover:bg-white/10">
            {l}
          </button>
        ))}
        <div className="h-3" />
      </div>
      <div className="flex-1 min-w-0 overflow-auto bg-white">
        <div className="px-12 pt-8 pb-10 max-w-[1100px]">
          <div className="text-[28px] font-light text-[#242424] mb-5">{pane === 'open' ? 'Open' : pane === 'new' ? 'New' : greeting}</div>
          {pane !== 'open' && (
            <>
              <div className="flex gap-4 flex-wrap">{newTiles}</div>
              <div className="flex justify-end mt-2 text-[13px] pr-2" style={{ color }}>
                More {app === 'word' ? 'templates' : 'themes'} →
              </div>
            </>
          )}
          <div className="mt-6 flex items-center gap-6 border-b border-[#E0E0E0] text-[14px]">
            {['Recent', 'Pinned', 'Shared with Me'].map((t, i) => (
              <span key={t} className={`pb-2 ${i === 0 ? 'font-semibold border-b-2' : 'text-[#616161]'}`} style={i === 0 ? { borderColor: color } : undefined}>
                {t}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_260px_160px] text-[12.5px] text-[#616161] px-3 py-2 border-b border-[#F0F0F0]">
            <span>Name</span>
            <span>Location</span>
            <span>Date modified</span>
          </div>
          {recents.map((r) => (
            <button
              key={r.id}
              data-agent={r.agentId}
              aria-label={`Open ${r.name}`}
              onClick={() => onOpen(r.id)}
              className="w-full grid grid-cols-[1fr_260px_160px] items-center text-left px-3 py-2 hover:bg-[#F5F5F5] rounded group"
            >
              <span className="flex items-center gap-3 min-w-0">
                <img src={logoUrl(app)} className="w-7 h-7" alt="" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[13.5px] text-[#242424] truncate">
                    {r.name}
                    {r.hworker && <HWorkerChip label="H-Worker" />}
                  </span>
                  <span className="block text-[12px] text-[#616161] truncate">{r.location}</span>
                </span>
                <Pin16Regular className="ml-auto mr-4 text-[#616161] opacity-0 group-hover:opacity-100" />
              </span>
              <span className="text-[12.5px] text-[#616161] truncate">{r.location.split(' » ')[0]}</span>
              <span className="text-[12.5px] text-[#616161]">{fmtModified(r.modified)}</span>
            </button>
          ))}
          <div className="text-[12px] text-[#616161] mt-6">{appName} · Microsoft 365 Apps for enterprise</div>
        </div>
      </div>
    </div>
  )
}

export function fmtModified(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 86_400_000
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diff < 2 && diff > 0) return 'Yesterday at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
