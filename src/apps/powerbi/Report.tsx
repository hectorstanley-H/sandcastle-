import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown12Regular,
  ArrowExportUp20Regular,
  Share20Regular,
  Chat20Regular,
  Lightbulb20Regular,
  Mail20Regular,
  Edit20Regular,
  MoreHorizontal20Regular,
  ArrowClockwise20Regular,
  Bookmark20Regular,
  Eye20Regular,
  ArrowReset20Regular,
  Comment20Regular,
  Sparkle20Regular,
  Filter20Regular,
  ChevronRight16Regular,
  ChevronLeft16Regular,
  Dismiss20Regular,
  Link20Regular,
  Copy20Regular,
  DocumentPdf20Regular,
  SlideText20Regular,
  DocumentTable20Regular,
  Search16Regular,
  Star20Regular,
  Star20Filled,
  Add16Regular,
  Info16Regular,
  Eraser20Regular,
} from '@fluentui/react-icons'
import { db } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import { Avatar } from '@/components/Avatar'
import { PEOPLE, person } from '@/data/people'
import { HWChip, applyRefresh, fmtDT, usePbi } from './shared'
import { GenericPage, OpsPage } from './pages'

const PW = 1280
const PH = 720

function useScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [s, setS] = useState(0.8)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const sc = Math.min((el.clientWidth - 32) / PW, (el.clientHeight - 24) / PH)
      if (r.width) setS(Math.max(0.3, sc))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return s
}

function Btn({ icon: I, label, agent, onClick, chevron, primary }: { icon: any; label: string; agent?: string; onClick?: () => void; chevron?: boolean; primary?: boolean }) {
  return (
    <button
      data-agent={agent}
      aria-label={label}
      onClick={onClick}
      className={`flex items-center gap-1.5 h-8 px-2 rounded-[4px] text-[13px] whitespace-nowrap ${primary ? 'text-[#252423] hover:bg-[#F3F2F1]' : 'text-[#252423] hover:bg-[#F3F2F1]'}`}
    >
      <I className="w-[18px] h-[18px] text-[#252423]" />
      <span>{label}</span>
      {chevron && <ChevronDown12Regular className="text-[#605E5C]" />}
    </button>
  )
}

export function ReportView({ rec, page, onPage }: { rec: any; page: number; nonce: number; onPage: (p: number) => void }) {
  const { isAgent } = useDesk()
  const pbi = usePbi()
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState(true)
  const [share, setShare] = useState(false)
  const [exportMenu, setExportMenu] = useState(false)
  const [fileMenu, setFileMenu] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const scale = useScale(canvasRef)
  const pages: string[] = rec.pages ?? ['Page 1']

  const refresh = () => {
    if (loading) return
    setLoading(true)
    const nid = pbi.notify({ kind: 'progress', title: 'Refreshing visuals', body: `Querying semantic model “${rec.name}”…` }, 0)
    setTimeout(() => {
      applyRefresh(rec.id, isAgent, 'Visuals')
      setLoading(false)
      pbi.dismiss(nid)
      pbi.notify({ kind: 'success', title: 'Data refreshed', body: `“${rec.name}” is up to date as of ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.` })
    }, 2600)
  }

  const doExport = (format: string) => {
    setExportMenu(false)
    const nid = pbi.notify({ kind: 'progress', title: `Exporting to ${format}`, body: 'This might take a few minutes…' }, 0)
    setTimeout(() => {
      pbi.dismiss(nid)
      db.update('powerbi.reports', rec.id, (r) => ({ exports: [{ format, at: new Date().toISOString(), by: isAgent ? 'hworker' : undefined }, ...(r.exports ?? [])] }))
      pbi.notify({ kind: 'success', title: 'Your file is ready', body: `${rec.name}.${format === 'PDF' ? 'pdf' : format === 'PowerPoint' ? 'pptx' : 'xlsx'} was downloaded.` })
    }, 2000)
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-[#EAEAEA]" data-agent="powerbi-report">
      {/* action bar */}
      <div className="h-11 shrink-0 bg-white border-b border-[#EDEBE9] flex items-center px-2 gap-0.5">
        <div className="relative">
          <Btn icon={() => <span className="w-0" />} label="File" chevron agent="powerbi-file" onClick={() => setFileMenu((m) => !m)} />
          {fileMenu && (
            <Dropdown onClose={() => setFileMenu(false)} items={[['Save a copy'], ['Download this file'], ['Manage permissions'], ['Print this page'], ['Embed report'], ['Generate a QR code'], ['Settings']]} />
          )}
        </div>
        <div className="relative">
          <Btn icon={ArrowExportUp20Regular} label="Export" chevron agent="powerbi-export" onClick={() => setExportMenu((m) => !m)} />
          {exportMenu && (
            <div className="absolute z-40 left-0 top-9 w-[250px] bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13),0_1.2px_3.6px_rgba(0,0,0,0.11)] py-1">
              {[
                ['PowerPoint', SlideText20Regular, 'powerbi-export-pptx', '#C43E1C'],
                ['PDF', DocumentPdf20Regular, 'powerbi-export-pdf', '#D13438'],
                ['Analyze in Excel', DocumentTable20Regular, 'powerbi-export-excel', '#107C41'],
              ].map(([l, I, a, c]: any) => (
                <button key={l} data-agent={a} aria-label={l} onClick={() => doExport(l === 'Analyze in Excel' ? 'Excel' : l)} className="w-full flex items-center gap-2.5 h-9 px-3 text-[13px] hover:bg-[#F3F2F1] text-left">
                  <I style={{ color: c }} /> {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <Btn icon={Share20Regular} label="Share" agent="powerbi-share" onClick={() => setShare(true)} />
        <Btn icon={Chat20Regular} label="Chat in Teams" />
        <Btn icon={Lightbulb20Regular} label="Get insights" />
        <Btn icon={Mail20Regular} label="Subscribe to report" />
        <Btn icon={Edit20Regular} label="Edit" />
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="More options">
          <MoreHorizontal20Regular />
        </button>
        <div className="flex-1" />
        <button
          data-agent="powerbi-refresh"
          aria-label="Refresh visuals"
          title="Refresh visuals"
          onClick={refresh}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]"
        >
          <ArrowClockwise20Regular className={loading ? 'animate-spin text-[#0F6CBD]' : ''} />
        </button>
        <Btn icon={Bookmark20Regular} label="Bookmarks" chevron />
        <Btn icon={Eye20Regular} label="View" chevron />
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="Reset to default">
          <ArrowReset20Regular />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="Comments">
          <Comment20Regular />
        </button>
        <button
          onClick={() => db.update('powerbi.reports', rec.id, { favorite: !rec.favorite })}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]"
          aria-label="Favorite"
        >
          {rec.favorite ? <Star20Filled className="text-[#E5A00D]" /> : <Star20Regular />}
        </button>
        <button className="flex items-center gap-1.5 h-8 px-2.5 ml-1 rounded-[4px] border border-[#D1D1D1] text-[13px] hover:bg-[#F3F2F1]">
          <Sparkle20Regular className="text-[#744EC2]" /> Copilot
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* canvas */}
        <div ref={canvasRef} className="flex-1 min-w-0 flex items-center justify-center overflow-hidden relative">
          <div style={{ width: PW * scale, height: PH * scale }} className="relative">
            <div
              className="absolute left-0 top-0 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              style={{ width: PW, height: PH, transform: `scale(${scale})`, transformOrigin: '0 0', fontFamily: "'Segoe UI', var(--font-win)" }}
              data-agent="powerbi-canvas"
            >
              <div className="absolute inset-0 bg-[#F6F6F6]" />
              {rec.kpis ? <OpsPage rec={rec} page={page} loading={loading} /> : rec.generic ? <GenericPage rec={rec} loading={loading} /> : null}
            </div>
          </div>
        </div>

        {/* filters pane */}
        {filters ? (
          <div className="w-[246px] shrink-0 bg-white border-l border-[#EDEBE9] flex flex-col" data-agent="powerbi-filter-pane">
            <div className="h-11 flex items-center px-3 gap-2">
              <span className="text-[15px] font-semibold flex-1">Filters</span>
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="Clear filters">
                <Eraser20Regular className="w-4 h-4" />
              </button>
              <button data-agent="powerbi-filter-pane-toggle" onClick={() => setFilters(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="Collapse filters">
                <ChevronRight16Regular />
              </button>
            </div>
            <div className="mx-3 h-8 flex items-center gap-2 px-2 rounded-[4px] border border-[#D1D1D1] text-[12.5px] text-[#8A8886]">
              <Search16Regular /> Search
            </div>
            <div className="flex-1 overflow-auto px-3 py-3 space-y-3">
              <FilterSection title="Filters on this page">
                {(rec.kpis ? ['Region is (All)', 'Distribution Center is (All)', 'Order Channel is (All)'] : ['Business unit is (All)']).map((f) => (
                  <FilterCard key={f} text={f} />
                ))}
              </FilterSection>
              <FilterSection title="Filters on all pages">
                <FilterCard text={rec.kpis ? `Fiscal Week is Week ${rec.fiscalWeek}` : 'Fiscal Year is FY27'} active />
                <FilterCard text="Company Code is 1010" active />
              </FilterSection>
              <button className="w-full h-8 rounded-[4px] border border-dashed border-[#C8C6C4] text-[12px] text-[#605E5C] flex items-center justify-center gap-1">
                <Add16Regular /> Add data fields here
              </button>
            </div>
          </div>
        ) : (
          <button data-agent="powerbi-filter-pane-toggle" onClick={() => setFilters(true)} className="w-8 shrink-0 bg-white border-l border-[#EDEBE9] flex flex-col items-center pt-3 gap-3" aria-label="Expand filters">
            <ChevronLeft16Regular />
            <Filter20Regular className="w-4 h-4" />
            <span className="text-[12px] [writing-mode:vertical-rl]">Filters</span>
          </button>
        )}
      </div>

      {/* page tabs + footer */}
      <div className="h-9 shrink-0 bg-white border-t border-[#EDEBE9] flex items-center px-2 text-[12.5px]">
        <button className="w-7 h-7 flex items-center justify-center text-[#605E5C]" aria-label="Previous page">
          <ChevronLeft16Regular />
        </button>
        {pages.map((p, i) => (
          <button
            key={p}
            data-agent={`powerbi-page-${i}`}
            onClick={() => onPage(i)}
            className={`relative h-9 px-3 ${i === page ? 'font-semibold text-[#252423]' : 'text-[#605E5C] hover:bg-[#F3F2F1]'}`}
          >
            {p}
            {i === page && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t bg-[#F2C811]" />}
          </button>
        ))}
        <div className="flex-1" />
        <span className="flex items-center gap-2 text-[12px] text-[#605E5C]" data-agent="powerbi-last-refreshed">
          {rec.refreshedBy === 'hworker' && <HWChip />}
          <Info16Regular />
          Semantic model last refreshed: {fmtDT(rec.lastRefreshed)}
        </span>
        <span className="mx-3 text-[#C8C6C4]">|</span>
        <span className="text-[12px] text-[#605E5C]">Page {page + 1} of {pages.length}</span>
      </div>

      {share && <ShareDialog rec={rec} onClose={() => setShare(false)} />}
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-[#252423] mb-1.5">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function FilterCard({ text, active }: { text: string; active?: boolean }) {
  const [a, b] = text.split(' is ')
  return (
    <div className={`rounded-[4px] px-2.5 py-2 ${active ? 'bg-[#EBF3FC]' : 'bg-[#F3F2F1]'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-[#252423]">{a}</span>
        <ChevronDown12Regular className="text-[#605E5C]" />
      </div>
      <div className="text-[11.5px] text-[#605E5C]">is {b}</div>
    </div>
  )
}

function Dropdown({ items, onClose }: { items: [string][]; onClose: () => void }) {
  return (
    <div className="absolute z-40 left-0 top-9 w-[220px] bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13),0_1.2px_3.6px_rgba(0,0,0,0.11)] py-1">
      {items.map(([l]) => (
        <button key={l} onClick={onClose} className="w-full h-9 px-3 text-[13px] text-left hover:bg-[#F3F2F1]">
          {l}
        </button>
      ))}
    </div>
  )
}

/* ───────────────────────────── Send link dialog ───────────────────────────── */

function ShareDialog({ rec, onClose }: { rec: any; onClose: () => void }) {
  const { isAgent } = useDesk()
  const pbi = usePbi()
  const [to, setTo] = useState<string[]>([])
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const matches = text.length > 1 ? PEOPLE.filter((p) => !p.external && (p.name + ' ' + p.email).toLowerCase().includes(text.toLowerCase())).slice(0, 5) : []
  const add = (email: string) => {
    if (email && !to.includes(email)) setTo([...to, email])
    setText('')
  }
  const send = () => {
    if (!to.length) return
    db.update('powerbi.reports', rec.id, (r) => ({
      sharedWith: Array.from(new Set([...(r.sharedWith ?? []), ...to])),
      shareMessage: msg,
      ...(isAgent ? { sharedBy: 'hworker' } : {}),
    }))
    setSent(true)
    pbi.notify({ kind: 'success', title: 'Link sent', body: `${to.length} ${to.length === 1 ? 'person' : 'people'} can now view “${rec.name}”.` })
    setTimeout(onClose, 1100)
  }
  return (
    <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center" onMouseDown={onClose}>
      <div className="w-[460px] bg-white rounded-lg shadow-[0_25.6px_57.6px_rgba(0,0,0,0.22),0_4.8px_14.4px_rgba(0,0,0,0.18)] p-6" onMouseDown={(e) => e.stopPropagation()} data-agent="powerbi-share-dialog">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-[20px] font-semibold text-[#252423]">Send link</div>
            <div className="text-[12.5px] text-[#605E5C] truncate">{rec.name}</div>
          </div>
          <button aria-label="Close" onClick={onClose} className="w-8 h-8 rounded hover:bg-[#F3F2F1] flex items-center justify-center">
            <Dismiss20Regular />
          </button>
        </div>
        <button className="mt-4 w-full flex items-center gap-2 h-9 px-3 rounded-[4px] bg-[#F3F2F1] text-[13px] text-left">
          <Link20Regular className="text-[#0F6CBD]" /> People in Northwind Global with the link can view <ChevronRight16Regular className="ml-auto" />
        </button>
        <div className="mt-3 min-h-[36px] flex flex-wrap items-center gap-1 px-2 py-1 rounded-[4px] border border-[#8A8886] focus-within:border-[#0F6CBD] relative">
          {to.map((e) => {
            const p = PEOPLE.find((x) => x.email === e)
            return (
              <span key={e} className="flex items-center gap-1.5 h-6 pl-0.5 pr-2 rounded-full bg-[#EBF3FC] text-[12.5px]">
                <Avatar email={e} size={20} /> {p?.name ?? e}
                <button onClick={() => setTo(to.filter((x) => x !== e))} aria-label={`Remove ${e}`} className="text-[#605E5C]">
                  ×
                </button>
              </span>
            )
          })}
          <input
            data-agent="powerbi-share-to"
            aria-label="Enter a name, group, or email"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const t = text.trim()
                const m = matches[0] ?? PEOPLE.find((p) => p.email.toLowerCase() === t.toLowerCase())
                add(m ? m.email : t.includes('@') ? t : '')
              }
            }}
            placeholder={to.length ? '' : 'Enter a name, group, or email'}
            className="flex-1 min-w-[140px] h-7 outline-none text-[13px]"
          />
          {matches.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13)] py-1">
              {matches.map((p) => (
                <button key={p.id} data-agent={`powerbi-share-suggest-${p.id}`} onClick={() => add(p.email)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F3F2F1] text-left">
                  <Avatar id={p.id} size={28} />
                  <span>
                    <span className="block text-[13px]">{p.name}</span>
                    <span className="block text-[11.5px] text-[#605E5C]">{p.email}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <textarea
          data-agent="powerbi-share-message"
          aria-label="Add a message (optional)"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Add a message (optional)"
          className="mt-3 w-full h-[96px] resize-none rounded-[4px] border border-[#8A8886] focus:border-[#0F6CBD] outline-none px-2.5 py-2 text-[13px]"
        />
        <div className="mt-4 flex items-center gap-2">
          <button
            data-agent="powerbi-share-send"
            onClick={send}
            disabled={!to.length || sent}
            className="h-8 px-5 rounded-[4px] bg-[#0F6CBD] hover:bg-[#115EA3] disabled:bg-[#C8C6C4] text-white text-[13px] font-semibold"
          >
            {sent ? 'Sent' : 'Send'}
          </button>
          <div className="flex-1" />
          {[
            [Copy20Regular, 'Copy link', '#0F6CBD'],
            [null, 'Outlook', 'outlook'],
            [null, 'Teams', 'teams'],
            [null, 'PowerPoint', 'powerpoint'],
          ].map(([I, l, c]: any) => (
            <button key={l} title={l} aria-label={l} className="w-10 h-12 flex flex-col items-center justify-center gap-0.5 rounded hover:bg-[#F3F2F1] text-[10px] text-[#605E5C]">
              {I ? <I style={{ color: c }} /> : <img src={logoUrl(c)} className="w-5 h-5" alt="" />}
              {l.split(' ')[0]}
            </button>
          ))}
        </div>
        {rec.sharedWith?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#EDEBE9] text-[12px] text-[#605E5C]">
            Already shared with {rec.sharedWith.map((e: string) => PEOPLE.find((p) => p.email === e)?.name ?? e).join(', ')}
            {rec.sharedBy === 'hworker' && <span className="ml-2"><HWChip label="Shared by H-Worker" /></span>}
          </div>
        )}
        <div className="hidden">{person('alex').name}</div>
      </div>
    </div>
  )
}
