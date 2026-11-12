import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight, CircleCheck, Pencil, Plus, X } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { person } from '@/data/people'
import { Btn, BtnGroup, MenuButton, ObjIcon, inputCls, type MenuItem } from './ui'

/* ───────────── toast ───────────── */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const t = useRef<any>(null)
  useEffect(() => () => clearTimeout(t.current), [])
  const show = (msg: string) => {
    setToast(msg)
    clearTimeout(t.current)
    t.current = setTimeout(() => setToast(null), 3800)
  }
  return { toast, show, hide: () => setToast(null) }
}

export function ToastView({ toast, hide }: { toast: string | null; hide: () => void }) {
  if (!toast) return null
  return (
    <div className="sticky top-2 z-40 h-0 flex justify-center pointer-events-none">
      <div data-agent="sf-toast" className="pointer-events-auto flex items-center gap-3 min-w-[480px] max-w-[720px] px-4 py-3 rounded-[4px] bg-[#2E844A] text-white text-[15px]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <span className="w-6 h-6 rounded-full bg-white/0 flex items-center justify-center">
          <CircleCheck size={22} />
        </span>
        <span className="flex-1">{toast}</span>
        <button onClick={hide} aria-label="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

/* ───────────── confetti (Path celebration) ───────────── */
export function Confetti() {
  const colors = ['#0176D3', '#FF5D2D', '#3BA755', '#FE9339', '#CB65FF', '#1B96FF', '#FCC003']
  const pieces = Array.from({ length: 90 }).map((_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 15) * 0.06,
    dur: 2.2 + ((i * 13) % 10) / 10,
    color: colors[i % colors.length],
    rot: (i * 47) % 360,
    w: 6 + (i % 4) * 2,
  }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
      <style>{`@keyframes sf-confetti{0%{transform:translateY(-20px) rotate(0)}100%{transform:translateY(900px) rotate(720deg);opacity:.2}}`}</style>
      {pieces.map((p, i) => (
        <span key={i} className="absolute top-0" style={{ left: `${p.left}%`, width: p.w, height: p.w * 0.45, background: p.color, transform: `rotate(${p.rot}deg)`, animation: `sf-confetti ${p.dur}s ${p.delay}s ease-in forwards` }} />
      ))}
    </div>
  )
}

/* ───────────── path ───────────── */
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function Path({
  stages,
  current,
  closedWon,
  closedLost,
  onAction,
  closedLabel = 'Closed',
  guidance,
  keyFields,
  onEditKeyFields,
}: {
  stages: string[]
  current: string
  closedWon?: boolean
  closedLost?: boolean
  onAction: (selected: string, kind: 'complete' | 'current' | 'closed') => void
  closedLabel?: string
  guidance?: ReactNode
  keyFields?: ReactNode
  onEditKeyFields?: () => void
}) {
  const all = [...stages, closedLabel]
  const curIdx = closedWon || closedLost ? all.length - 1 : all.indexOf(current)
  const [sel, setSel] = useState<string>(all[curIdx] ?? all[0])
  const [open, setOpen] = useState(false)
  useEffect(() => setSel(all[curIdx]), [current, closedWon, closedLost])
  const selIdx = all.indexOf(sel)
  const isClosedSel = sel === closedLabel
  const kind: 'complete' | 'current' | 'closed' = isClosedSel ? 'closed' : selIdx === curIdx ? 'complete' : 'current'
  const done = closedWon
  return (
    <div className="bg-white rounded-[4px] border border-[#C9C9C9] px-3 py-3" style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }} data-agent="sf-path">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(!open)} aria-label="Show key fields" className="w-6 h-6 shrink-0 rounded-full border border-[#C9C9C9] flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <ul className="flex-1 flex min-w-0">
          {all.map((s, i) => {
            const complete = done || i < curIdx
            const isCur = i === curIdx && !done
            const isSel = s === sel && !isCur
            let bg = '#F3F3F3'
            let fg = '#181818'
            if (complete) {
              bg = '#3BA755'
              fg = '#fff'
            }
            if (isCur) {
              bg = closedLost ? '#BA0517' : '#014486'
              fg = '#fff'
            }
            if (isSel) {
              bg = '#0176D3'
              fg = '#fff'
            }
            if (done && i === all.length - 1) bg = '#3BA755'
            const label = i === all.length - 1 && (closedWon || closedLost) ? current : s
            const first = i === 0
            const lastItem = i === all.length - 1
            return (
              <li key={s} className="flex-1 min-w-0 -mr-[2px]" style={{ zIndex: all.length - i }}>
                <button
                  data-agent={`sf-path-${slug(s)}`}
                  aria-label={s}
                  title={label}
                  onClick={() => setSel(s)}
                  className="group w-full h-8 flex items-center justify-center text-[13px] px-4 transition-colors"
                  style={{
                    background: bg,
                    color: fg,
                    clipPath: first
                      ? 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'
                      : lastItem
                        ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)'
                        : 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)',
                    borderRadius: first ? '16px 0 0 16px' : lastItem ? '0 16px 16px 0' : undefined,
                  }}
                >
                  {complete && !(lastItem && done) ? (
                    <>
                      <Check size={16} strokeWidth={3} className="group-hover:hidden" />
                      <span className="hidden group-hover:inline truncate">{label}</span>
                    </>
                  ) : (
                    <span className="truncate">
                      {lastItem && done && <Check size={14} strokeWidth={3} className="inline -mt-0.5 mr-1" />}
                      {label}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        {!done && (
          <Btn variant="brand" agent="sf-path-action" label={kind === 'closed' ? 'Select Closed Stage' : kind === 'complete' ? 'Mark Stage as Complete' : 'Mark as Current Stage'} onClick={() => onAction(sel, kind)} className="shrink-0 min-w-[210px]" icon={kind === 'complete' ? <Check size={14} strokeWidth={3} /> : undefined}>
            {kind === 'closed' ? 'Select Closed Stage' : kind === 'complete' ? 'Mark Stage as Complete' : 'Mark as Current Stage'}
          </Btn>
        )}
        {done && (
          <Btn variant="neutral" className="shrink-0 min-w-[210px]" onClick={() => onAction(closedLabel, 'closed')}>
            Change Closed Stage
          </Btn>
        )}
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-6 mt-3 pt-3 border-t border-[#E5E5E5]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-bold">Key Fields</h3>
              <button className="text-[13px] text-[#0176D3] hover:underline" onClick={onEditKeyFields}>Edit</button>
            </div>
            {keyFields}
          </div>
          <div>
            <h3 className="text-[14px] font-bold mb-2">Guidance for Success</h3>
            <div className="text-[13px] leading-[1.5] text-[#181818]">{guidance}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────── highlights ───────────── */
export function Highlights({ object, title, fields, actions, badge, recordId, more }: { object: string; title: string; fields: [string, ReactNode][]; actions: { label: string; agent?: string; onClick?: () => void }[]; badge?: ReactNode; recordId?: string; more?: MenuItem[] }) {
  const follows = useCollection<any>('salesforce.follows')
  const following = !!recordId && follows.some((f) => f.id === recordId)
  const toggleFollow = () => {
    if (!recordId) return
    if (following) db.remove('salesforce.follows', recordId)
    else db.insert('salesforce.follows', { id: recordId, object, name: title, date: new Date().toISOString() })
  }
  return (
    <div className="bg-white rounded-[4px] border border-[#C9C9C9]" style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }}>
      <div className="flex items-start gap-3 px-4 pt-3 pb-3">
        <ObjIcon type={object} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-[#181818] leading-tight">{object === 'Opportunity' ? 'Opportunity' : object}</div>
          <h1 className="text-[18px] font-bold leading-tight text-[#181818] truncate flex items-center gap-2" data-agent="sf-record-title">
            {title} {badge}
          </h1>
        </div>
        <Btn className="px-3" icon={following ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />} onClick={toggleFollow}>
          {following ? 'Following' : 'Follow'}
        </Btn>
        <BtnGroup items={actions} more={more} />
      </div>
      <div className="flex gap-12 px-4 pb-3 pt-1">
        {fields.map(([l, v]) => (
          <div key={l} className="min-w-0">
            <div className="text-[12px] text-[#444] whitespace-nowrap">{l}</div>
            <div className="text-[14px] text-[#181818] truncate">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────── detail fields ───────────── */
export type FieldDef = {
  key: string
  label: string
  type?: 'text' | 'number' | 'currency' | 'date' | 'select' | 'textarea' | 'percent' | 'readonly'
  options?: string[]
  render?: (v: any, rec: any) => ReactNode
  full?: boolean
  required?: boolean
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 h-8 px-2 rounded bg-[#F3F3F3] text-[14px] text-[#181818]">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {title}
      </button>
      {open && <div className="grid grid-cols-2 gap-x-8 px-2 pt-1">{children}</div>}
    </div>
  )
}

export function DetailField({ f, rec, editing, draft, setDraft, onEdit, prefix }: { f: FieldDef; rec: any; editing: boolean; draft: any; setDraft: (d: any) => void; onEdit: () => void; prefix: string }) {
  const editable = f.type !== 'readonly'
  const v = rec[f.key]
  if (editing && editable) {
    const val = draft[f.key] ?? ''
    const set = (x: any) => setDraft({ ...draft, [f.key]: x })
    const changed = String(draft[f.key] ?? '') !== String(rec[f.key] ?? '')
    return (
      <div className={`py-1.5 ${f.full ? 'col-span-2' : ''}`}>
        <label className="block text-[12px] text-[#444] mb-0.5">
          {f.required && <abbr className="text-[#BA0517] no-underline mr-0.5">*</abbr>}
          {f.label}
        </label>
        <div className={changed ? 'rounded-[4px] bg-[#FAFFBD] p-[2px] -m-[2px]' : ''}>
          {f.type === 'select' ? (
            <select data-agent={`${prefix}-field-${f.key}`} aria-label={f.label} value={val} onChange={(e) => set(e.target.value)} className={inputCls}>
              {!f.options?.includes(val) && <option value={val}>{val || '--None--'}</option>}
              {f.options!.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea data-agent={`${prefix}-field-${f.key}`} aria-label={f.label} value={val} onChange={(e) => set(e.target.value)} rows={3} className={`${inputCls} h-auto py-1.5 leading-[1.4]`} />
          ) : (
            <input
              data-agent={`${prefix}-field-${f.key}`}
              aria-label={f.label}
              type={f.type === 'date' ? 'date' : 'text'}
              inputMode={f.type === 'currency' || f.type === 'number' || f.type === 'percent' ? 'decimal' : undefined}
              value={val}
              onChange={(e) => set(e.target.value)}
              className={inputCls}
            />
          )}
        </div>
      </div>
    )
  }
  return (
    <div className={`group flex items-end min-h-[52px] border-b border-[#E5E5E5] py-1 ${f.full ? 'col-span-2' : ''}`} onDoubleClick={() => editable && onEdit()}>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-[#444] leading-tight">{f.label}</div>
        <div className="text-[14px] text-[#181818] min-h-[22px] leading-[1.45] whitespace-pre-wrap break-words" data-agent={`${prefix}-value-${f.key}`}>
          {f.render ? f.render(v, rec) : v}
        </div>
      </div>
      {editable && (
        <button data-agent={`${prefix}-edit-${f.key}`} aria-label={`Edit ${f.label}`} onClick={onEdit} className="w-6 h-6 mb-0.5 shrink-0 flex items-center justify-center text-[#AEAEAE] group-hover:text-[#747474] hover:bg-[#F3F3F3] rounded">
          <Pencil size={13} />
        </button>
      )}
    </div>
  )
}

/* ───────────── tabs card ───────────── */
export function TabsCard({ tabs, active, setActive, children, prefix }: { tabs: string[]; active: string; setActive: (t: string) => void; children: ReactNode; prefix: string }) {
  return (
    <div className="bg-white rounded-[4px] border border-[#C9C9C9]" style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }}>
      <div className="flex gap-6 px-4 border-b border-[#E5E5E5]">
        {tabs.map((t) => (
          <button key={t} data-agent={`${prefix}-tab-${slug(t)}`} aria-label={t} onClick={() => setActive(t)} className={`relative h-11 text-[14px] ${active === t ? 'font-bold text-[#181818]' : 'text-[#444] hover:text-[#0176D3]'}`}>
            {t}
            {active === t && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-[#0176D3]" />}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}

export function RelatedCard({ icon, title, count, children, agent, onNew, newLabel = 'New', menu }: { icon: string; title: string; count: number; children?: ReactNode; agent?: string; onNew?: () => void; newLabel?: string; menu?: MenuItem[] }) {
  const [all, setAll] = useState(false)
  const items: MenuItem[] = [...(onNew ? [{ label: newLabel, onClick: onNew }] : []), ...(menu ?? []), { label: 'View All', disabled: !count, onClick: () => setAll(true) }]
  return (
    <section data-agent={agent} data-rel={title} className="bg-[#F3F3F3]/0 rounded-[4px] border border-[#C9C9C9] bg-white" style={{ boxShadow: '0 2px 2px 0 rgba(0,0,0,0.10)' }}>
      <header className="flex items-center gap-3 px-3 py-2.5">
        <ObjIcon type={icon} size={24} />
        <h2 className="flex-1 text-[14px] font-bold truncate">
          <span className="hover:underline cursor-pointer" onClick={() => count && setAll(true)}>
            {title} ({count > 6 ? '6+' : count})
          </span>
        </h2>
        <MenuButton label={`${title} actions`} className="w-6 h-6 border border-[#C9C9C9] rounded-[4px] flex items-center justify-center text-[#747474] hover:bg-[#F3F3F3]" menuClass="right-0 top-7" width={170} items={items}>
          <ChevronDown size={12} />
        </MenuButton>
      </header>
      {count > 0 && <div className="px-3 pb-2">{children}</div>}
      {count > 0 && (
        <footer onClick={() => setAll(true)} className="border-t border-[#E5E5E5] h-9 flex items-center justify-center text-[13px] text-[#0176D3] hover:underline cursor-pointer">
          View All
        </footer>
      )}
      {all && (
        <Modal title={`${title} (${count})`} width={720} onClose={() => setAll(false)} footer={<>{onNew && <Btn onClick={() => { setAll(false); onNew() }}>{newLabel}</Btn>}<Btn variant="brand" onClick={() => setAll(false)}>Close</Btn></>}>
          <div className="px-5 py-3">{children}</div>
        </Modal>
      )}
    </section>
  )
}

export function Modal({ title, children, footer, onClose, width = 640, agent }: { title: string; children: ReactNode; footer: ReactNode; onClose: () => void; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-16 bg-[#7E8C99]/60" data-agent={agent}>
      <div className="relative" style={{ width }}>
        <button onClick={onClose} aria-label="Close" className="absolute -top-10 right-0 w-8 h-8 rounded flex items-center justify-center bg-white/0 text-white hover:bg-white/10">
          <X size={22} />
        </button>
        <div className="bg-white rounded-t-[4px] border-b border-[#E5E5E5] h-[52px] flex items-center justify-center text-[20px] font-normal">{title}</div>
        <div className="bg-white max-h-[560px] overflow-auto">{children}</div>
        <div className="bg-[#F3F3F3] rounded-b-[4px] border-t border-[#E5E5E5] px-4 py-3 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}

/* ───────────── user hover card (opens on click) ───────────── */
export function PersonLink({ id, className = '' }: { id: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const { open: openApp } = useDesk()
  const p = person(id)
  return (
    <>
      <button onClick={() => setOpen(true)} className={`text-[#0176D3] hover:underline text-left ${className}`}>
        {p.name}
      </button>
      {open && (
        <Modal
          title={p.name}
          width={460}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Btn onClick={() => { setOpen(false); openApp('outlook', { compose: { to: [p.email] } }) }}>Send Email</Btn>
              <Btn variant="brand" onClick={() => setOpen(false)}>Close</Btn>
            </>
          }
        >
          <div className="p-5 flex gap-4 text-[13px]">
            <Avatar id={id} size={56} />
            <div className="space-y-0.5">
              <div className="text-[16px] font-bold">{p.name}</div>
              <div className="text-[#444]">{p.title}</div>
              <div>{p.email}</div>
              <div>{p.phone}</div>
              <div className="text-[#444]">{p.location}</div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
