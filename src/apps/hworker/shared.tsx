import { appIcon, getApp } from '@/os/registry'
import type { Workflow } from '@/agent/types'

export const HMark = ({ className = 'h-4', color = '#0F0E12' }: { className?: string; color?: string }) => (
  <svg viewBox="0 0 1035 600" className={className} aria-label="H Company">
    <circle cx="300" cy="300" r="300" fill={color} />
    <rect x="838" y="195" width="54" height="220" fill={color} />
    <rect x="1035" y="282" width="45" height="197" transform="rotate(90 1035 282)" fill={color} />
    <rect x="981" y="195" width="54" height="220" fill={color} />
  </svg>
)

export function AppStack({ apps, size = 28, max = 5 }: { apps: string[]; size?: number; max?: number }) {
  const list = Array.from(new Set(apps)).slice(0, max)
  return (
    <div className="flex items-center">
      {list.map((a, i) => (
        <span
          key={a}
          title={getApp(a)?.name}
          className="rounded-[9px] bg-white flex items-center justify-center border border-[#EAE5DD] shadow-[0_1px_2px_rgba(15,14,18,0.06)]"
          style={{ width: size, height: size, marginLeft: i ? -size * 0.22 : 0, zIndex: 10 - i }}
        >
          <img src={appIcon(a)} style={{ width: size * 0.62, height: size * 0.62 }} className="object-contain" alt="" />
        </span>
      ))}
      {apps.length > max && <span className="ml-1.5 text-[11px] text-[#7A7A87]">+{apps.length - max}</span>}
    </div>
  )
}

export const CATEGORY_TINT: Record<string, string> = {
  Finance: '#F1ECF9',
  Procurement: '#F1ECF9',
  HR: '#F1ECF9',
  Sales: '#F1ECF9',
  Marketing: '#F1ECF9',
  IT: '#F1ECF9',
  Support: '#F1ECF9',
  Engineering: '#F1ECF9',
  Operations: '#F1ECF9',
  Communication: '#F1ECF9',
  Legal: '#F1ECF9',
}

export function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[10.5px] tracking-[0.12em] uppercase text-[#7A7A87] ${className}`} style={{ fontFamily: 'var(--font-mono)' }}>
      {children}
    </span>
  )
}

export function WorkflowCard({ wf, onOpen, onDeploy, compact }: { wf: Workflow; onOpen: () => void; onDeploy: () => void; compact?: boolean }) {
  return (
    <div
      role="button"
      data-agent={`hw-wf-${wf.id}`}
      onClick={onOpen}
      className="group relative flex flex-col text-left rounded-2xl bg-white border border-[#EAE5DD] hover:border-[#D8D2C8] hover:shadow-[0_8px_24px_rgba(15,14,18,0.06)] transition-all p-4"
    >
      <div className="flex items-center justify-between">
        <AppStack apps={wf.apps} size={30} />
        <Mono>{wf.category}</Mono>
      </div>
      <div className="mt-3.5 text-[14.5px] font-bold text-[#0F0E12] leading-snug">{wf.title}</div>
      {!compact && <div className="mt-1 text-[12.5px] text-[#3A3A44] leading-snug line-clamp-2">{wf.description}</div>}
      <div className="flex-1" />
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11.5px] text-[#7A7A87]">Saves ~{wf.timeSaved}</span>
        <button
          data-agent={`hw-deploy-${wf.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onDeploy()
          }}
          className="h-8 px-3.5 rounded-full bg-[#0F0E12] text-white text-[12px] font-semibold opacity-90 group-hover:opacity-100 hover:bg-[#2A2930] transition"
        >
          Deploy
        </button>
      </div>
    </div>
  )
}
