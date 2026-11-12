import { useEffect, useRef, useState, type ReactNode } from 'react'
import { db, useRecord } from '@/db/db'

export type Msg = {
  id: string
  channelId: string
  from: string
  text: string
  date: string
  threadTs?: string
  reactions?: { emoji: string; users: string[] }[]
  createdBy?: string
  saved?: boolean
  savedDone?: boolean
  pinned?: boolean
  edited?: boolean
  deleted?: boolean
  system?: boolean
  broadcast?: boolean
  files?: SlackFile[]
  forwardedFrom?: { channelId: string; from: string; text: string; date: string }
}

export interface SlackFile {
  name: string
  size: string
  kind: string
  open?: { appId: string; params?: any }
}

export interface SlackChannel {
  id: string
  name: string
  topic: string
  members: number
  private?: boolean
  createdBy?: string
  description?: string
}

export interface SlackPrefs {
  id: string
  statusEmoji?: string
  statusText?: string
  away?: boolean
  paused?: boolean
  starred?: string[]
  muted?: string[]
  notif?: Record<string, 'all' | 'mentions' | 'nothing'>
  topics?: Record<string, string>
  extraMembers?: Record<string, string[]>
  unfollowed?: string[]
}

export function useSlackPrefs(): [SlackPrefs, (p: Partial<SlackPrefs> | ((p: SlackPrefs) => Partial<SlackPrefs>)) => void] {
  const rec = useRecord<SlackPrefs>('slack.settings', 'me')
  const prefs: SlackPrefs = { id: 'me', ...(rec ?? {}) }
  const set = (patch: Partial<SlackPrefs> | ((p: SlackPrefs) => Partial<SlackPrefs>)) => {
    const cur: SlackPrefs = { id: 'me', ...(db.find<SlackPrefs>('slack.settings', 'me') ?? {}) }
    const p = typeof patch === 'function' ? patch(cur) : patch
    if (db.find('slack.settings', 'me')) db.update('slack.settings', 'me', p)
    else db.insert('slack.settings', { ...cur, ...p })
  }
  return [prefs, set]
}

export function useMenu<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false)
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, toggle: () => setOpen((o) => !o), close: () => setOpen(false), ref }
}

export function Pop({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div role="menu" className={`absolute z-50 bg-white text-[#1D1C1D] rounded-lg border border-[#DDDDDD] shadow-[0_4px_16px_rgba(0,0,0,0.18)] py-1.5 ${className}`}>{children}</div>
}

export function MItem({ label, onClick, icon, hint, danger, agent, checked, disabled }: { label: ReactNode; onClick?: () => void; icon?: ReactNode; hint?: ReactNode; danger?: boolean; agent?: string; checked?: boolean; disabled?: boolean }) {
  return (
    <button
      role="menuitem"
      data-agent={agent}
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 h-8 text-[14px] text-left hover:bg-[#1264A3] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit group/mi ${danger ? 'text-[#E01E5A]' : ''}`}
    >
      {icon && <span className="w-4 flex items-center justify-center shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[12px] text-[#616061] group-hover/mi:text-white/80">{hint}</span>}
      {checked && <span>✓</span>}
    </button>
  )
}
export const MSep = () => <div className="h-px bg-[#DDDDDD] my-1.5" />

export function Modal({ title, onClose, children, width = 520, agent }: { title: ReactNode; onClose: () => void; children: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/40 flex items-start justify-center pt-16" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-[0_18px_48px_rgba(0,0,0,0.35)] max-h-[calc(100%-96px)] flex flex-col text-[#1D1C1D]" style={{ width }} data-agent={agent}>
        <div className="flex items-center px-6 h-16 shrink-0">
          <div className="text-[22px] font-black flex-1 min-w-0 truncate">{title}</div>
          <button aria-label="Close" onClick={onClose} className="w-9 h-9 rounded-md hover:bg-[#F2F2F2] flex items-center justify-center text-[#616061] text-[20px]">×</button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {})
  } catch {
    /* clipboard unavailable */
  }
}

export const kindOf = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'img'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xlsx'
  if (['doc', 'docx'].includes(ext)) return 'docx'
  if (['ppt', 'pptx'].includes(ext)) return 'pptx'
  return ext || 'file'
}
export const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export const EMOJI_PICK = ['+1', 'heart', 'joy', 'tada', 'eyes', 'raised_hands', 'white_check_mark', 'fire', 'rocket', '100', 'pray', 'clap', 'thinking_face', 'smile', 'sweat_smile', 'muscle', 'sparkles', 'wave', 'coffee', 'bug', 'ticket', 'memo', 'warning', 'rotating_light', 'mega', 'star', 'zap', 'chart_with_upwards_trend', 'package', 'calendar']

export const STATUS_PRESETS: [string, string, string][] = [
  ['calendar', 'In a meeting', '1 hour'],
  ['car', 'Commuting', '30 minutes'],
  ['face_with_thermometer', 'Out sick', 'Today'],
  ['palm_tree', 'Vacationing', "Don't clear"],
  ['house_with_garden', 'Working remotely', 'Today'],
]
export const STATUS_EMOJI: Record<string, string> = { calendar: '📅', car: '🚗', face_with_thermometer: '🤒', palm_tree: '🌴', house_with_garden: '🏡', speech_balloon: '💬' }
