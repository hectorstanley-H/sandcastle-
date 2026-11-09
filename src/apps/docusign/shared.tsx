import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock, CheckCircle2, PenLine, XCircle, Ban, FileEdit, AlertTriangle, Send, FileText, Users, LayoutTemplate, Upload, FileSignature } from 'lucide-react'
import { logoUrl } from '@/os/registry'
import { ME } from '@/data/people'

export const C = {
  purple: '#4C00FF',
  purpleHover: '#3A00C4',
  ink: '#130032',
  inkSoft: '#2A1A4A',
  text: '#130032',
  sub: '#5E5873',
  muted: '#8B8698',
  line: '#E5E1EC',
  lineSoft: '#F0EDF4',
  bg: '#F7F6FA',
  yellow: '#FFCC22',
  green: '#00805A',
  red: '#D11F3B',
}

export const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif"

export type EnvStatus = 'draft' | 'sent' | 'delivered' | 'action' | 'completed' | 'declined' | 'voided'
export interface Recipient {
  name: string
  email: string
  role: 'signer' | 'cc' | 'inperson' | 'viewer'
  status: string
  order: number
  at?: string
}
export interface Field {
  id: string
  type: string
  page: number
  x: number
  y: number
  recipient: number
}
export interface Envelope {
  id: string
  subject: string
  message: string
  status: EnvStatus
  templateId?: string
  documents: { name: string; pages: number }[]
  recipients: Recipient[]
  sender: string
  senderName: string
  createdAt: string
  sentAt?: string
  completedAt?: string
  expiresAt?: string
  lastChange: string
  voidReason?: string
  declineReason?: string
  fields?: Field[]
  history: { at: string; action: string; by: string; detail: string }[]
  createdBy?: string
  deleted?: boolean
}
export interface Template {
  id: string
  name: string
  description: string
  documents: { name: string; pages: number }[]
  roles: { roleName: string; name: string; email: string; role: string }[]
  subject: string
  message: string
  owner: string
  folder: string
  createdAt: string
  updatedAt: string
  shared: boolean
  uses: number
}

export const isWaiting = (e: Envelope) => e.status === 'sent' || e.status === 'delivered'
export const isExpiring = (e: Envelope) =>
  (isWaiting(e) || e.status === 'action') && !!e.expiresAt && +new Date(e.expiresAt) - Date.now() < 7 * 86400_000 && +new Date(e.expiresAt) > Date.now()
export const isMine = (e: Envelope) => e.sender === ME.email
export const inInbox = (e: Envelope) => e.status !== 'draft' && e.recipients.some((r) => r.email === ME.email)

export const STATUS: Record<string, { label: string; color: string; Icon: any }> = {
  draft: { label: 'Draft', color: '#5E5873', Icon: FileEdit },
  sent: { label: 'Waiting for Others', color: '#5E5873', Icon: Clock },
  delivered: { label: 'Waiting for Others', color: '#5E5873', Icon: Clock },
  action: { label: 'Need to Sign', color: '#4C00FF', Icon: PenLine },
  completed: { label: 'Completed', color: '#00805A', Icon: CheckCircle2 },
  declined: { label: 'Declined', color: '#D11F3B', Icon: XCircle },
  voided: { label: 'Voided', color: '#5E5873', Icon: Ban },
  expiring: { label: 'Expiring Soon', color: '#B35C00', Icon: AlertTriangle },
}

export function StatusLabel({ e, small }: { e: Envelope; small?: boolean }) {
  const s = STATUS[e.status] ?? STATUS.sent
  const I = s.Icon
  return (
    <span className={`inline-flex items-center gap-1.5 ${small ? 'text-[13px]' : 'text-[14px]'}`} style={{ color: e.status === 'action' ? C.purple : C.text }}>
      <I size={16} strokeWidth={2} style={{ color: s.color }} />
      <span className={e.status === 'action' ? 'font-semibold' : ''}>{s.label}</span>
    </span>
  )
}

export const fmtD = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '')
export const fmtT = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase() : '')
export const fmtDT = (iso?: string) => (iso ? `${fmtD(iso)} | ${fmtT(iso)}` : '')

export function HWorkerChip({ small }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold text-white shrink-0 ${small ? 'h-[18px] px-1.5 text-[10.5px]' : 'h-[22px] px-2 text-[11.5px]'}`}
      style={{ background: '#430693' }}
      title="Sent by H-Worker on behalf of Alex Morgan"
    >
      <img src={logoUrl('hworker')} className={small ? 'w-3 h-3 rounded-sm' : 'w-3.5 h-3.5 rounded-sm'} alt="" /> H-Worker
    </span>
  )
}

export function Wordmark({ height = 22 }: { height?: number }) {
  return <img src={logoUrl('docusign-wordmark')} style={{ height }} alt="Docusign" draggable={false} />
}

export function Btn({
  children,
  kind = 'secondary',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'secondary' | 'tertiary' | 'yellow' }) {
  const base = 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[4px] text-[14px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap'
  const k =
    kind === 'primary'
      ? 'bg-[#4C00FF] text-white hover:bg-[#3A00C4]'
      : kind === 'yellow'
        ? 'bg-[#FFCC22] text-[#130032] hover:bg-[#F5BF00]'
        : kind === 'tertiary'
          ? 'text-[#4C00FF] hover:bg-[#F2EDFF]'
          : 'bg-white text-[#130032] border border-[#CBC4D6] hover:bg-[#F5F3F8]'
  return (
    <button className={`${base} ${k} ${className}`} {...rest}>
      {children}
    </button>
  )
}

/** "Start" primary button with Docusign's dropdown. */
export function StartButton({ onSend, onTemplate, wide, light }: { onSend: () => void; onTemplate: () => void; wide?: boolean; light?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      // ignore clicks on other desktops (e.g. another agent working at the same time)
      const desk = ref.current?.closest('[data-desk]')
      if (desk && !desk.contains(e.target as Node)) return
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const items: [string, any, string, (() => void) | null, string?][] = [
    ['Send an Envelope', Send, 'docusign-start-envelope', onSend, 'Upload documents and add recipients'],
    ['Sign a Document', FileSignature, 'docusign-start-sign', null, 'Sign a document yourself'],
    ['Use a Template', LayoutTemplate, 'docusign-start-template', onTemplate, 'Start from a reusable template'],
    ['Create a Web Form', FileText, 'docusign-start-webform', null],
    ['Bulk Send', Users, 'docusign-start-bulk', null],
    ['Upload a Completed Agreement', Upload, 'docusign-start-upload', null],
  ]
  return (
    <div ref={ref} className={`relative ${wide ? 'w-full' : ''}`}>
      <button
        data-agent="docusign-start"
        aria-label="Start"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[4px] text-[15px] font-semibold ${wide ? 'w-full' : ''} ${light ? 'bg-[#FFCC22] text-[#130032] hover:bg-[#F5BF00]' : 'bg-[#4C00FF] text-white hover:bg-[#3A00C4]'}`}
      >
        Start <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[44px] z-50 w-[280px] bg-white rounded-md shadow-[0_8px_24px_rgba(19,0,50,0.18),0_0_0_1px_rgba(19,0,50,0.06)] py-2">
          {items.map(([label, I, id, fn, sub]) => (
            <button
              key={id}
              data-agent={id}
              aria-label={label}
              onClick={() => {
                setOpen(false)
                fn?.()
              }}
              className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[#F5F3F8]"
            >
              <I size={18} className="mt-0.5 text-[#5E5873] shrink-0" />
              <span>
                <span className="block text-[14px] text-[#130032]">{label}</span>
                {sub && <span className="block text-[12px] text-[#8B8698]">{sub}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** recipient colours used on tags (Docusign's per-recipient palette) */
export const RCOLORS = [
  { bg: '#FFE48A', border: '#E0B400', solid: '#F5C400' },
  { bg: '#CFE5FF', border: '#5B9BE6', solid: '#3E86E0' },
  { bg: '#D6F2D0', border: '#5FB653', solid: '#45A33A' },
  { bg: '#F6D3EE', border: '#C963B3', solid: '#B9479F' },
  { bg: '#FFD9C2', border: '#E58A4E', solid: '#DE7433' },
]
