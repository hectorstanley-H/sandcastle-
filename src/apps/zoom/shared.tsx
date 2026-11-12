import { createContext, useContext, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { db, useRecord } from '@/db/db'

export type Tab = 'home' | 'chat' | 'meetings' | 'calendar' | 'docs' | 'contacts' | 'whiteboards' | 'notes' | 'apps'
export const BLUE = '#0B5CFF'

export const fmtT = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const endIso = (m: any) => new Date(+new Date(m.start) + m.durationMins * 60000).toISOString()
export const dayLabel = (iso: string) => {
  const d = new Date(iso)
  const t = new Date()
  const tm = new Date(Date.now() + 86400000)
  if (d.toDateString() === t.toDateString()) return 'Today'
  if (d.toDateString() === tm.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}
export const inviteLink = (m: any) => `https://northwind.zoom.us/j/${String(m.meetingNumber ?? '').replace(/\s/g, '')}?pwd=${m.passcode ?? ''}`
export const recLink = (r: any) => `https://northwind.zoom.us/rec/share/${r.id.replace(/[^a-z0-9]/gi, '')}`

export function copyText(t: string) {
  try {
    void navigator.clipboard?.writeText(t).catch(() => {})
  } catch {
    /* clipboard unavailable */
  }
}

export function HWBadge({ text = 'Scheduled by H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full text-[10.5px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}>
      <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> {text}
    </span>
  )
}

/** A participant of an in-meeting session: person id (internal/external directory) or a display name. */
export interface LiveMeeting {
  topic: string
  meetingId?: string
  participants: string[]
  shareOnStart?: boolean
}

export interface ZoomCtx {
  toast: (msg: string) => void
  setTab: (t: Tab) => void
  startMeeting: (m: LiveMeeting) => void
  openMeeting: (id: string) => void
  openRecording: (id: string) => void
  openChat: (id: string) => void
  /** open a Team Chat conversation by chat id */
  selectChat: (id: string) => void
  schedule: (initial?: { attendees?: string; topic?: string; date?: string }) => void
}
export const ZCtx = createContext<ZoomCtx>({
  toast: () => {},
  setTab: () => {},
  startMeeting: () => {},
  openMeeting: () => {},
  openRecording: () => {},
  openChat: () => {},
  selectChat: () => {},
  schedule: () => {},
})
export const useZoom = () => useContext(ZCtx)

/** per-user Zoom preferences, persisted in the demo DB */
export interface Prefs {
  id: 'me'
  status?: 'available' | 'away' | 'dnd' | 'offline'
  starredContacts?: string[]
  muteOnJoin?: boolean
  videoOffOnJoin?: boolean
  apps?: string[]
}
export function usePrefs(): [Prefs, (p: Partial<Prefs>) => void] {
  const p = useRecord<any>('zoom.prefs', 'me') as Prefs | undefined
  const cur: Prefs = p ?? { id: 'me', status: 'available', starredContacts: [], muteOnJoin: true, videoOffOnJoin: false, apps: [] }
  return [cur, (patch) => db.upsert('zoom.prefs', { ...cur, ...patch, id: 'me' })]
}
export const STATUS: Record<string, [string, string]> = {
  available: ['Available', '#00A35C'],
  away: ['Away', '#F5A623'],
  dnd: ['Do not disturb', '#E02828'],
  offline: ['Appear offline', '#9AA0A6'],
}

export function ZModal({ title, onClose, children, footer, width = 520, agent }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/30 flex items-center justify-center" data-agent={agent}>
      <div className="max-h-[92%] overflow-auto bg-white rounded-[14px] shadow-2xl" style={{ width }}>
        <div className="h-14 px-6 flex items-center border-b border-[#E4E4ED]">
          <span className="text-[17px] font-bold flex-1">{title}</span>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 text-[14px]">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#E4E4ED] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
export const btnPrimary = 'h-9 px-5 rounded-[8px] bg-[#0B5CFF] text-white text-[14px] font-semibold disabled:opacity-50'
export const btnSecondary = 'h-9 px-4 rounded-[8px] border border-[#D5D7E0] text-[14px] font-medium hover:bg-[#F7F7FA]'
export const btnDanger = 'h-9 px-5 rounded-[8px] bg-[#E02828] text-white text-[14px] font-semibold'
export const fieldCls = 'h-9 px-3 rounded-[8px] border border-[#D5D7E0] text-[14px] outline-none focus:border-[#0B5CFF] bg-white'

/** "Delete X?" confirmation */
export function Confirm({ title, body, action = 'Delete', onCancel, onConfirm, agent }: { title: string; body: ReactNode; action?: string; onCancel: () => void; onConfirm: () => void; agent?: string }) {
  return (
    <ZModal
      title={title}
      onClose={onCancel}
      width={420}
      agent={agent}
      footer={
        <>
          <button onClick={onCancel} className={btnSecondary}>Cancel</button>
          <button data-agent={agent ? `${agent}-confirm` : undefined} onClick={onConfirm} className={btnDanger}>{action}</button>
        </>
      }
    >
      <div className="text-[#3F4752] leading-[1.5]">{body}</div>
    </ZModal>
  )
}

/** generate an AI Companion style summary + transcript for a meeting that was just recorded */
export function genRecording(topic: string, names: string[], chat: { from: string; text: string }[], secs: number) {
  const mm = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const host = names[0] ?? 'Host'
  const others = names.slice(1)
  const lines: [string, string, string][] = [
    [host, mm(Math.min(5, secs)), `Thanks for joining${others.length ? `, ${others.map((n) => n.split(' ')[0]).join(' and ')}` : ''}. Let’s get started on ${topic}.`],
    ...chat.map((c, i) => [c.from, mm(Math.min(secs, 10 + i * 15)), c.text] as [string, string, string]),
    ...(others.length ? [[others[0], mm(Math.max(1, Math.floor(secs * 0.6))), 'That works for us — let’s capture the action items and follow up by email.'] as [string, string, string]] : []),
    [host, mm(Math.max(1, secs - 2)), 'Great, I’ll send a recap with next steps after the call. Thanks everyone.'],
  ]
  const dur = secs >= 3600 ? `${Math.floor(secs / 3600)}:${mm(secs).slice(3)}` : mm(secs).slice(3)
  return {
    duration: dur,
    size: `${Math.max(1, Math.round(secs * 0.13 * 10) / 10)} MB`,
    summary: {
      quick: `${host} met with ${others.length ? others.join(', ') : 'the team'} to discuss ${topic}. ${chat.length ? `${chat.length} message${chat.length > 1 ? 's were' : ' was'} shared in the meeting chat. ` : ''}The group agreed on next steps and a written recap.`,
      nextSteps: [`${host} to send a recap of “${topic}” with action items`, ...(others[0] ? [`${others[0]} to confirm owners and timelines`] : []), 'Schedule a follow-up if open questions remain'],
      sections: [
        ['Discussion', chat.length ? chat.map((c) => `${c.from}: ${c.text}`).join(' · ') : `Open discussion on ${topic}.`],
        ['Decisions', 'Proceed with the agreed approach; owners to follow up asynchronously.'],
      ],
    },
    transcript: lines,
  }
}
