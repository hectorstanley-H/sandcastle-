import type { ReactNode } from 'react'
import { ThumbsUp, ThumbsDown, Question } from '@phosphor-icons/react'
import { logoUrl } from '@/os/registry'
import { person } from '@/data/people'
import type { Rating, Stage } from './types'

export const GH = {
  forest: '#15372C',
  green: '#24A47F',
  greenDark: '#1B7F62',
  mint: '#E6F4EE',
  bg: '#F7F8F7',
  border: '#E1E4E2',
  text: '#15372C',
  muted: '#5B6B66',
  link: '#1B7F62',
  red: '#C9302C',
}

export const FONT = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"

export type Route =
  | { page: 'dashboard' }
  | { page: 'jobs' }
  | { page: 'job'; jobId: string; tab?: 'dashboard' | 'candidates' | 'setup' }
  | { page: 'candidates' }
  | { page: 'candidate'; candidateId: string }
  | { page: 'reports' }
  | { page: 'crm' }
  | { page: 'integrations' }
  | { page: 'posts' }
  | { page: 'configure' }

export type Go = (r: Route) => void

export const RATING_LABEL: Record<Rating, string> = {
  strong_yes: 'Strong Yes',
  yes: 'Yes',
  mixed: 'Mixed',
  no: 'No',
  strong_no: 'Definitely Not',
}

export function RatingIcon({ rating, size = 16 }: { rating: Rating; size?: number }) {
  const s = size
  if (rating === 'strong_yes')
    return (
      <span className="inline-flex items-center -space-x-1" title="Strong Yes" aria-label="Strong Yes">
        <ThumbsUp size={s} weight="fill" color="#1E9E6A" />
        <ThumbsUp size={s} weight="fill" color="#1E9E6A" />
      </span>
    )
  if (rating === 'yes') return <ThumbsUp size={s} weight="fill" color="#1E9E6A" aria-label="Yes" />
  if (rating === 'no') return <ThumbsDown size={s} weight="fill" color="#D64B45" aria-label="No" />
  if (rating === 'strong_no')
    return (
      <span className="inline-flex items-center -space-x-1" title="Definitely Not" aria-label="Definitely Not">
        <ThumbsDown size={s} weight="fill" color="#D64B45" />
        <ThumbsDown size={s} weight="fill" color="#D64B45" />
      </span>
    )
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-[#F0B429] text-white" style={{ width: s, height: s }} aria-label="Mixed">
      <Question size={s * 0.7} weight="bold" />
    </span>
  )
}

export function HWorkerChip({ text = 'H-Worker' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full bg-[#F1ECF9] text-[#430693] text-[10.5px] font-semibold align-middle">
      <img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" />
      {text}
    </span>
  )
}

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))

export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export const fmtTimeOnly = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const fmtActivity = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export const pname = (id: string) => (id === 'system' ? 'Greenhouse' : person(id).name)

export function Card({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`bg-white border border-[#E1E4E2] rounded-lg ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-5 h-12 border-b border-[#EDEFEE]">
          <h2 className="text-[15px] font-semibold text-[#15372C]">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Btn({
  children,
  kind = 'secondary',
  className = '',
  ...rest
}: { children: ReactNode; kind?: 'primary' | 'secondary' | 'ghost' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement> & { 'data-agent'?: string }) {
  const k = {
    primary: 'bg-[#15372C] text-white hover:bg-[#0E271F] border border-[#15372C]',
    secondary: 'bg-white text-[#15372C] border border-[#C9D0CD] hover:bg-[#F2F4F3]',
    ghost: 'text-[#15372C] hover:bg-[#EEF1EF] border border-transparent',
    danger: 'bg-white text-[#C9302C] border border-[#C9D0CD] hover:bg-[#FDF1F0]',
  }[kind]
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md text-[13.5px] font-medium whitespace-nowrap disabled:opacity-50 ${k} ${className}`}>
      {children}
    </button>
  )
}

export function StagePill({ stage }: { stage: Stage }) {
  const c: Record<Stage, string> = {
    application_review: 'bg-[#EEF1EF] text-[#3E4F49]',
    phone_screen: 'bg-[#E8F0FB] text-[#1D4E89]',
    onsite: 'bg-[#FFF3DC] text-[#8A5A00]',
    offer: 'bg-[#F1ECF9] text-[#5B2A9B]',
    hired: 'bg-[#E3F5EC] text-[#11734B]',
    rejected: 'bg-[#FBEAEA] text-[#A3302A]',
  }
  const label = { application_review: 'Application Review', phone_screen: 'Phone Screen', onsite: 'Onsite', offer: 'Offer', hired: 'Hired', rejected: 'Rejected' }[stage]
  return <span className={`inline-flex items-center h-[22px] px-2 rounded text-[12px] font-medium whitespace-nowrap ${c[stage]}`}>{label}</span>
}

export const LOCATION_LABEL: Record<string, string> = {
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  'onsite-boston': 'Onsite — Boston HQ, 1 Federal St',
}
