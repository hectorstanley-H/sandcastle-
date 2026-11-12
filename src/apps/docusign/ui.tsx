/** Small Docusign UI primitives: dropdown menus, modals and toasts. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDesk } from '@/os/context'
import { Btn } from './shared'

/** close-on-outside-click that ignores other desktops (agents may be working elsewhere) */
export function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      const desk = ref.current?.closest('[data-desk]')
      if (desk && !desk.contains(e.target as Node)) return
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return ref
}

export type MenuItem = { label: string; onClick: () => void; icon?: any; danger?: boolean; agent?: string; disabled?: boolean } | 'sep' | { header: string }

/** A trigger with a dropdown menu. `trigger` receives the toggle fn. */
export function Menu({ trigger, items, align = 'right', width = 220, up }: { trigger: (toggle: () => void, open: boolean) => ReactNode; items: MenuItem[]; align?: 'left' | 'right'; width?: number; up?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  return (
    <div ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <div
          role="menu"
          className={`absolute z-50 ${up ? 'bottom-full mb-1' : 'top-full mt-1'} ${align === 'right' ? 'right-0' : 'left-0'} bg-white rounded-md shadow-[0_8px_24px_rgba(19,0,50,0.18),0_0_0_1px_rgba(19,0,50,0.06)] py-1.5 text-left`}
          style={{ width }}
        >
          {items.map((it, i) =>
            it === 'sep' ? (
              <div key={i} className="my-1 h-px bg-[#E5E1EC]" />
            ) : 'header' in it ? (
              <div key={i} className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8B8698]">
                {it.header}
              </div>
            ) : (
              <button
                key={i}
                role="menuitem"
                data-agent={it.agent}
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
                className={`w-full flex items-center gap-2.5 px-4 h-9 text-[14px] text-left hover:bg-[#F5F3F8] disabled:opacity-40 disabled:pointer-events-none ${it.danger ? 'text-[#D11F3B]' : 'text-[#130032]'}`}
              >
                {it.icon && <it.icon size={16} className={it.danger ? 'text-[#D11F3B]' : 'text-[#5E5873]'} />}
                <span className="truncate">{it.label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export function Modal({ title, children, onClose, footer, width = 520, agent }: { title: ReactNode; children: ReactNode; onClose: () => void; footer?: ReactNode; width?: number; agent?: string }) {
  return (
    <div className="absolute inset-0 z-[60] bg-[#130032]/40 flex items-start justify-center pt-16" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div data-agent={agent} className="max-h-[calc(100%-100px)] flex flex-col bg-white rounded-md shadow-[0_16px_48px_rgba(19,0,50,0.3)]" style={{ width }}>
        <div className="flex items-center justify-between px-6 h-14 border-b border-[#E5E1EC] shrink-0">
          <div className="text-[18px] font-semibold truncate">{title}</div>
          <button aria-label="Close dialog" onClick={onClose} className="w-8 h-8 rounded hover:bg-[#F2F0F5] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5 text-[14px]">{children}</div>
        {footer !== undefined && <div className="flex justify-end gap-3 px-6 py-3 border-t border-[#E5E1EC] shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmFooter({ onCancel, onOk, ok, disabled, danger, agent }: { onCancel: () => void; onOk: () => void; ok: string; disabled?: boolean; danger?: boolean; agent?: string }) {
  return (
    <>
      <Btn onClick={onCancel}>Cancel</Btn>
      <Btn kind="primary" data-agent={agent} disabled={disabled} onClick={onOk} className={danger ? '!bg-[#D11F3B] hover:!bg-[#A3122B]' : ''}>
        {ok}
      </Btn>
    </>
  )
}

export const inputCls = 'w-full h-9 px-2.5 rounded-[4px] border border-[#CBC4D6] outline-none focus:border-[#4C00FF] text-[14px] bg-white'

export function useToast() {
  const { toast } = useDesk()
  return (title: string, body?: string) => toast({ appId: 'docusign', title, body })
}

/** copy text to the clipboard, ignoring failures (iframes / permissions) */
export function copyText(t: string) {
  try {
    void navigator.clipboard?.writeText(t)
  } catch {
    /* ignore */
  }
}
