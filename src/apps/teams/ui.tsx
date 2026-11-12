import { createContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { db, useRecord } from '@/db/db'
import { ME } from '@/data/people'
import { TEAMS_PRESENCE } from './seed'

export const PURPLE = '#5B5FC7'
export type Presence = 'available' | 'busy' | 'away' | 'dnd' | 'offline'

export interface TeamsPrefs {
  id: string
  presence?: Presence
  statusMessage?: string
  addedApps?: string[]
  favFiles?: string[]
  mutedChannels?: string[]
}

export function useTeamsPrefs(): [TeamsPrefs, (p: Partial<TeamsPrefs>) => void] {
  const rec = useRecord<TeamsPrefs>('teams.settings', 'me')
  const prefs: TeamsPrefs = { id: 'me', presence: 'available', ...(rec ?? {}) }
  const set = (patch: Partial<TeamsPrefs>) => {
    if (db.find('teams.settings', 'me')) db.update('teams.settings', 'me', patch)
    else db.insert('teams.settings', { ...prefs, ...patch })
  }
  return [prefs, set]
}

/** the signed-in user's presence, provided by the app shell */
export const MyPresence = createContext<Presence>('available')
export const presenceOf = (id: string, mine: Presence): Presence => (id === ME.id ? mine : TEAMS_PRESENCE[id] ?? 'offline')
export const PRESENCE_LABEL: Record<Presence, string> = { available: 'Available', busy: 'Busy', dnd: 'Do not disturb', away: 'Away', offline: 'Appear offline' }
export const PRESENCE_COLOR: Record<Presence, string> = { available: '#6BB700', busy: '#C50F1F', dnd: '#C50F1F', away: '#FFAA44', offline: '#8A8886' }

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

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div role="menu" className={`absolute z-50 bg-white rounded-lg shadow-[0_8px_28px_rgba(0,0,0,0.2)] border border-black/5 py-1 text-[#242424] ${className}`}>{children}</div>
}

export function Item({ icon, label, onClick, agent, checked, danger, disabled, hint }: { icon?: ReactNode; label: ReactNode; onClick?: () => void; agent?: string; checked?: boolean; danger?: boolean; disabled?: boolean; hint?: ReactNode }) {
  return (
    <button
      role="menuitem"
      data-agent={agent}
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 h-8 text-[13.5px] text-left hover:bg-[#F5F5F5] disabled:opacity-40 ${danger ? 'text-[#C4314B]' : ''}`}
    >
      {icon !== undefined && <span className="w-5 flex items-center justify-center text-[#424242] shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[12px] text-[#616161]">{hint}</span>}
      {checked && <span style={{ color: PURPLE }}>✓</span>}
    </button>
  )
}
export const Sep = () => <div className="h-px bg-[#EDEBE9] my-1" />

export function copyText(text: string) {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {})
  } catch {
    /* clipboard unavailable */
  }
}

export const QUICK_REACTIONS = ['👍', '❤️', '😆', '😮', '😢', '😡']
export const EMOJI_SET = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂', '😉', '😊', '😍', '🤩', '😎', '🤔', '😐', '😮', '😢', '😭', '😡', '🙏', '👍', '👎', '👏', '🙌', '💪', '👋', '✅', '❌', '🎉', '🔥', '🚀', '💯', '❤️', '💡', '📌', '📅', '☕', '🍕', '⚠️', '⭐']
export const STICKERS: [string, string][] = [['🎉', 'Party time'], ['👏', 'Well done'], ['🙌', 'High five'], ['☕', 'Coffee break'], ['🚀', 'Ship it'], ['🤝', 'Deal'], ['🔥', 'On fire'], ['🏆', 'Champion']]
export const GIFS: [string, string][] = [['💃', 'Happy dance'], ['🙏', 'Thank you'], ['🤯', 'Mind blown'], ['😅', 'Phew'], ['👀', 'Watching'], ['🎯', 'Nailed it']]

export interface Attachment {
  name: string
  size: string
  kind: string
  open?: { appId: string; params?: any }
}

export const kindOf = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'img'
  if (['xls', 'xlsx'].includes(ext)) return 'xlsx'
  if (['doc', 'docx'].includes(ext)) return 'docx'
  if (['ppt', 'pptx'].includes(ext)) return 'pptx'
  return ext || 'file'
}
export const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** toggle my reaction on a message stored as { reactions: {emoji,count}[], myReactions: string[] } */
export function toggleReaction(id: string, emoji: string) {
  db.update('teams.messages', id, (r) => {
    const mine: string[] = r.myReactions ?? []
    const rs: { emoji: string; count: number }[] = [...(r.reactions ?? [])]
    const i = rs.findIndex((x) => x.emoji === emoji)
    if (mine.includes(emoji)) {
      if (i >= 0) {
        const count = rs[i].count - 1
        if (count > 0) rs[i] = { ...rs[i], count }
        else rs.splice(i, 1)
      }
      return { reactions: rs, myReactions: mine.filter((x) => x !== emoji) }
    }
    if (i >= 0) rs[i] = { ...rs[i], count: rs[i].count + 1 }
    else rs.push({ emoji, count: 1 })
    return { reactions: rs, myReactions: [...mine, emoji] }
  })
}

export const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${String(sec).padStart(2, '0')}s`
}
