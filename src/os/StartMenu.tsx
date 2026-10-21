import { useContext, useEffect, useRef, useState } from 'react'
import { DeskContext } from './context'
import { APPS } from './registry'
import { useWM, wm } from './wm'
import { ME, initials } from '@/data/people'
import { TASKBAR_H } from './Taskbar'
import { requestReset, requestLock } from './system'

const RECOMMENDED = [
  { name: 'Q3 Operations Review.pptx', app: 'powerpoint', when: '2h ago' },
  { name: 'Vendor Spend FY25.xlsx', app: 'excel', when: 'Yesterday at 4:12 PM' },
  { name: 'Onboarding Checklist.docx', app: 'word', when: 'Yesterday at 10:03 AM' },
  { name: 'Contoso MSA - Redline.pdf', app: 'acrobat', when: 'Mon at 3:40 PM' },
  { name: 'Weekly KPI Dashboard', app: 'powerbi', when: 'Mon at 9:15 AM' },
  { name: 'Travel Policy 2025.pdf', app: 'acrobat', when: 'Last week' },
]

export function StartMenu() {
  const { deskId, isAgent } = useContext(DeskContext)
  const open = useWM((s) => s.desks[deskId]?.startOpen)
  const [q, setQ] = useState('')
  const [userMenu, setUserMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setUserMenu(false)
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50)
    }
  }, [open])

  if (!open) return null
  const apps = APPS.filter((a) => !a.hidden && !(isAgent && a.id === 'hworker'))
  const results = q.trim()
    ? apps.filter((a) => (a.name + ' ' + a.category + ' ' + (a.publisher ?? '')).toLowerCase().includes(q.trim().toLowerCase()))
    : []
  const launch = (id: string) => {
    wm().open(deskId, id)
    wm().setStart(deskId, false)
  }

  return (
    <>
      <div className="absolute inset-0 z-[8990]" onPointerDown={() => wm().setStart(deskId, false)} />
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[8995] w-[660px] rounded-lg overflow-hidden start-open"
        style={{
          bottom: TASKBAR_H + 12,
          height: 720,
          maxHeight: 'calc(100% - 70px)',
          background: 'rgba(242,245,250,0.92)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.08)',
          fontFamily: 'var(--font-win)',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          <div className="px-8 pt-7 pb-4">
            <div className="flex items-center h-9 px-3 rounded-full bg-white border-b-2 border-[#005FB8] shadow-sm">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.4"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
              <input
                ref={inputRef}
                data-agent="start-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) launch(results[0].id)
                  if (e.key === 'Escape') wm().setStart(deskId, false)
                }}
                placeholder="Search for apps, settings, and documents"
                className="flex-1 bg-transparent outline-none text-[13px] px-2"
              />
            </div>
          </div>
          {q.trim() ? (
            <div className="flex-1 px-8 overflow-auto">
              <div className="text-[13px] font-semibold mb-2">Best match</div>
              {results.length === 0 && <div className="text-[13px] text-black/60 py-6">No results for “{q}”</div>}
              {results.map((a, i) => (
                <button
                  key={a.id}
                  data-agent={`start-result-${a.id}`}
                  onClick={() => launch(a.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-md text-left hover:bg-white/80 ${i === 0 ? 'bg-white/70' : ''}`}
                >
                  <img src={a.icon} className="w-8 h-8 object-contain" alt="" />
                  <div>
                    <div className="text-[13px]">{a.name}</div>
                    <div className="text-[11px] text-black/55">App · {a.publisher}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 px-8 overflow-auto">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[14px] font-semibold">Pinned</span>
                <button className="text-[12px] px-2 py-1 rounded bg-white/80 border border-black/5">All apps ›</button>
              </div>
              <div className="grid grid-cols-6 gap-y-2">
                {apps.slice(0, 24).map((a) => (
                  <button
                    key={a.id}
                    data-agent={`start-pin-${a.id}`}
                    onClick={() => launch(a.id)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-md hover:bg-white/70"
                  >
                    <img src={a.icon} className="w-8 h-8 object-contain" alt="" />
                    <span className="text-[11.5px] w-[88px] truncate text-center">{a.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-5 mb-2 px-2">
                <span className="text-[14px] font-semibold">Recommended</span>
                <button className="text-[12px] px-2 py-1 rounded bg-white/80 border border-black/5">More ›</button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {RECOMMENDED.map((r) => (
                  <button key={r.name} onClick={() => launch(r.app)} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/70 text-left">
                    <img src={APPS.find((a) => a.id === r.app)?.icon} className="w-8 h-8 object-contain" alt="" />
                    <div className="min-w-0">
                      <div className="text-[12px] truncate">{r.name}</div>
                      <div className="text-[11px] text-black/55">{r.when}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="relative h-16 px-12 flex items-center justify-between bg-black/[0.035] border-t border-black/5">
            <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/60" onClick={() => setUserMenu((u) => !u)}>
              <span className="w-8 h-8 rounded-full text-white text-[12px] font-semibold flex items-center justify-center" style={{ background: isAgent ? '#0F0E12' : ME.color }}>
                {isAgent ? 'H' : initials(ME.name)}
              </span>
              <span className="text-[12.5px]">{isAgent ? 'H-Worker (as Alex Morgan)' : ME.name}</span>
            </button>
            {userMenu && !isAgent && (
              <div className="absolute left-10 bottom-16 w-56 rounded-lg bg-[#f9f9f9] shadow-xl border border-black/10 p-1 text-[13px]">
                <button className="w-full text-left px-3 py-2 rounded hover:bg-black/5" onClick={() => { wm().setStart(deskId, false); requestLock() }}>Lock</button>
                <button className="w-full text-left px-3 py-2 rounded hover:bg-black/5" onClick={() => { wm().setStart(deskId, false); wm().open(deskId, 'settings') }}>Change account settings</button>
                <div className="h-px bg-black/10 my-1" />
                <button className="w-full text-left px-3 py-2 rounded hover:bg-black/5 text-[#C42B1C]" onClick={() => { wm().setStart(deskId, false); requestReset() }}>Reset demo…</button>
              </div>
            )}
            <button className="w-9 h-9 rounded-md hover:bg-white/60 flex items-center justify-center" aria-label="Power" onClick={() => !isAgent && requestReset()} title="Power (reset demo)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M8 1.5v6M4.5 3.6a5.5 5.5 0 1 0 7 0" /></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
