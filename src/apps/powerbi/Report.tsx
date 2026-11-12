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
import { db, uid } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { fmtSmart } from '@/data/time'
import { HWChip, applyRefresh, fmtDT, itemUrl, usePbi } from './shared'
import { GenericPage, NO_FILTER, OpsPage, type OpsFilter } from './pages'
import { VisualCtx } from './visuals'
import { EmbedDialog, PinDialog, QrDialog, SubscribeDialog, TeamsShareDialog, createReportFrom, PbiModal, PBtn, field } from './views'

const PW = 1280
const PH = 720

function useScale(ref: React.RefObject<HTMLDivElement | null>, mode: 'page' | 'width' | 'actual' = 'page') {
  const [s, setS] = useState(0.8)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const sc = mode === 'actual' ? 1 : mode === 'width' ? (el.clientWidth - 32) / PW : Math.min((el.clientWidth - 32) / PW, (el.clientHeight - 24) / PH)
      if (r.width) setS(Math.max(0.3, sc))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, mode])
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
  const [menu, setMenu] = useState<null | 'more' | 'bookmarks' | 'view'>(null)
  const [fit, setFit] = useState<'page' | 'width' | 'actual'>('page')
  const [filter, setFilter] = useState<OpsFilter>(NO_FILTER)
  const [focused, setFocused] = useState<string | null>(null)
  const [spotlight, setSpotlight] = useState<string | null>(null)
  const [pane, setPane] = useState<null | 'insights' | 'comments' | 'copilot'>(null)
  const [dialog, setDialog] = useState<null | 'subscribe' | 'teams' | 'pin' | 'embed' | 'qr' | 'saveCopy' | 'bookmark' | 'settings'>(null)
  const [pinTitle, setPinTitle] = useState('')
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [highContrast, setHighContrast] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const scale = useScale(canvasRef, fit)
  const pages: string[] = rec.pages ?? ['Page 1']
  const url = itemUrl(rec, page)
  const regions: string[] = rec.byRegion?.map((r: any) => r.region) ?? []
  const dcs: string[] = rec.byRegion?.map((r: any) => r.dc) ?? []
  const filtered = filter.region.length > 0 || filter.dc.length > 0
  const filterSummary = [filter.region.length ? `Region is ${filter.region.join(', ')}` : '', filter.dc.length ? `Distribution Center is ${filter.dc.join(', ')}` : '', rec.kpis ? `Fiscal Week is Week ${rec.fiscalWeek}` : 'Fiscal Year is FY27', 'Company Code is 1010'].filter(Boolean).join(' · ')
  const copy = (t: string, what = 'Link copied') => {
    navigator.clipboard?.writeText(t).catch(() => {})
    pbi.notify({ kind: 'success', title: what, body: rec.name })
  }
  const resetAll = () => {
    setFilter(NO_FILTER)
    setFocused(null)
    setSpotlight(null)
  }
  const applyBookmark = (b: any) => {
    onPage(b.page)
    setFilter(b.filter ?? NO_FILTER)
    setFocused(null)
    setSpotlight(null)
    setMenu(null)
  }
  const visualCtx = {
    focused,
    spotlight,
    setFocused,
    setSpotlight,
    filterSummary,
    onPin: (t: string) => {
      setPinTitle(t)
      setDialog('pin')
    },
    onExport: (t: string) => {
      const nid = pbi.notify({ kind: 'progress', title: 'Exporting data', body: t }, 0)
      setTimeout(() => {
        pbi.dismiss(nid)
        pbi.notify({ kind: 'success', title: 'Export complete', body: `data (${t}).csv was downloaded.` })
      }, 1200)
    },
  }
  const insights = (() => {
    const out: { title: string; body: string }[] = []
    if (rec.kpis) {
      const k = rec.kpis
      const p = rec.prevKpis ?? {}
      const t = rec.targets ?? {}
      for (const [key, label, lower] of [
        ['onTimeDelivery', 'On-time delivery', false],
        ['warehouseSla', 'Warehouse SLA', false],
        ['orderCycleTimeDays', 'Order cycle time', true],
        ['costPerOrder', 'Cost per order', true],
        ['backorders', 'Backorders', true],
      ] as [string, string, boolean][]) {
        if (t[key] === undefined) continue
        const ok = lower ? k[key] <= t[key] : k[key] >= t[key]
        out.push({ title: `${label} is ${ok ? 'on target' : 'off target'}`, body: `${k[key]} vs target ${t[key]} (last week ${p[key] ?? '—'}).` })
      }
      const worst = [...(rec.byRegion ?? [])].sort((a: any, b: any) => a.onTime - b.onTime)[0]
      const best = [...(rec.byRegion ?? [])].sort((a: any, b: any) => b.onTime - a.onTime)[0]
      if (worst) out.unshift({ title: `${worst.dc} has the lowest on-time %`, body: `${worst.onTime}% on-time and ${worst.backorders} backorders — ${(rec.targets?.onTimeDelivery ?? 95) - worst.onTime > 0 ? `${((rec.targets?.onTimeDelivery ?? 95) - worst.onTime).toFixed(1)} pts below target` : 'at target'}.` })
      if (best) out.push({ title: `${best.dc} leads on-time delivery`, body: `${best.onTime}% on-time across ${best.orders.toLocaleString('en-US')} orders.` })
      const lw = rec.weekly?.[rec.weekly.length - 2]
      const tw = rec.weekly?.[rec.weekly.length - 1]
      if (lw && tw) out.push({ title: `Orders ${tw.orders >= lw.orders ? 'up' : 'down'} ${Math.abs(((tw.orders - lw.orders) / lw.orders) * 100).toFixed(1)}% week over week`, body: `${tw.week}: ${tw.orders.toLocaleString('en-US')} vs ${lw.week}: ${lw.orders.toLocaleString('en-US')} (last year ${tw.ordersLY.toLocaleString('en-US')}).` })
    } else if (rec.generic) {
      for (const c of rec.generic.cards ?? []) {
        if (c.prev === undefined) continue
        const d = c.value - c.prev
        out.push({ title: `${c.label} ${d >= 0 ? 'increased' : 'decreased'}`, body: `${c.value.toLocaleString('en-US')} vs ${c.prev.toLocaleString('en-US')} previously${c.target !== undefined ? ` (target ${c.target})` : ''}.` })
      }
      const top = [...(rec.generic.bars?.data ?? [])].sort((a: any, b: any) => b.v - a.v)[0]
      if (top) out.unshift({ title: `${top.name} is the largest contributor`, body: `${rec.generic.bars.title}: ${top.v.toLocaleString('en-US')}.` })
    }
    return out
  })()

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
            <Dropdown
              onClose={() => setFileMenu(false)}
              items={[
                ['Save a copy', () => setDialog('saveCopy')],
                ['Download this file', () => pbi.notify({ kind: 'success', title: 'Download complete', body: `${rec.name}.pbix was saved to Downloads.` })],
                ['Manage permissions', () => setShare(true)],
                ['Print this page', () => pbi.notify({ kind: 'success', title: 'Sent to printer', body: `${pages[page]} — ${rec.name}` })],
                ['Embed report', () => setDialog('embed')],
                ['Generate a QR code', () => setDialog('qr')],
                ['Settings', () => pbi.itemSettings?.(rec.id)],
              ]}
            />
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
        <Btn icon={Chat20Regular} label="Chat in Teams" agent="powerbi-chat-teams" onClick={() => setDialog('teams')} />
        <Btn icon={Lightbulb20Regular} label="Get insights" agent="powerbi-insights" onClick={() => setPane((p) => (p === 'insights' ? null : 'insights'))} />
        <Btn icon={Mail20Regular} label="Subscribe to report" agent="powerbi-subscribe" onClick={() => setDialog('subscribe')} />
        <Btn icon={Edit20Regular} label="Edit" onClick={() => setDialog('saveCopy')} />
        <div className="relative">
          <button onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="More options">
            <MoreHorizontal20Regular />
          </button>
          {menu === 'more' && (
            <Dropdown
              onClose={() => setMenu(null)}
              items={[
                ['Pin to a dashboard', () => (setPinTitle(`${pages[page]} (live page)`), setDialog('pin'))],
                ['See related content', () => pbi.openWorkspace(rec.workspace)],
                ['Open semantic model', () => { const m = db.get('powerbi.reports').find((r) => r.reportId === rec.id && r.type === 'semanticModel'); if (m) pbi.openItem(m.id); else pbi.notify({ kind: 'info', title: 'Semantic model', body: 'This report uses an embedded model.' }) }],
                ['Copy link', () => copy(url)],
                ['Embed report', () => setDialog('embed')],
                ['Settings', () => pbi.itemSettings?.(rec.id)],
              ]}
            />
          )}
        </div>
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
        <div className="relative">
          <Btn icon={Bookmark20Regular} label="Bookmarks" chevron agent="powerbi-bookmarks" onClick={() => setMenu((m) => (m === 'bookmarks' ? null : 'bookmarks'))} />
          {menu === 'bookmarks' && (
            <div className="absolute z-40 right-0 top-9 w-[260px] bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13),0_1.2px_3.6px_rgba(0,0,0,0.11)] py-1 text-[13px]" onMouseLeave={() => setMenu(null)}>
              <button data-agent="powerbi-bookmark-add" onClick={() => (setMenu(null), setDialog('bookmark'))} className="w-full h-9 px-3 text-left hover:bg-[#F3F2F1]">
                Add a personal bookmark
              </button>
              {(rec.bookmarks ?? []).length > 0 && <div className="h-px bg-[#EDEBE9] my-1" />}
              {(rec.bookmarks ?? []).map((b: any) => (
                <div key={b.id} className="flex items-center hover:bg-[#F3F2F1]">
                  <button onClick={() => applyBookmark(b)} className="flex-1 h-9 px-3 text-left truncate">
                    {b.name}
                    <span className="text-[11.5px] text-[#605E5C]"> · {pages[b.page]}</span>
                  </button>
                  <button aria-label={`Delete ${b.name}`} onClick={() => db.update('powerbi.reports', rec.id, (r) => ({ bookmarks: (r.bookmarks ?? []).filter((x: any) => x.id !== b.id) }))} className="w-8 h-8 text-[#605E5C] hover:text-[#A4262C]">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <Btn icon={Eye20Regular} label="View" chevron onClick={() => setMenu((m) => (m === 'view' ? null : 'view'))} />
          {menu === 'view' && (
            <Dropdown
              onClose={() => setMenu(null)}
              items={[
                [`${fit === 'page' ? '✓ ' : ''}Fit to page`, () => setFit('page')],
                [`${fit === 'width' ? '✓ ' : ''}Fit to width`, () => setFit('width')],
                [`${fit === 'actual' ? '✓ ' : ''}Actual size`, () => setFit('actual')],
                [`${highContrast ? '✓ ' : ''}High contrast colors`, () => setHighContrast((h) => !h)],
                [`${filters ? '✓ ' : ''}Filters pane`, () => setFilters((f) => !f)],
              ]}
            />
          )}
        </div>
        <button onClick={resetAll} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="Reset to default" title="Reset to default">
          <ArrowReset20Regular />
        </button>
        <button onClick={() => setPane((p) => (p === 'comments' ? null : 'comments'))} className={`w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1] ${pane === 'comments' ? 'bg-[#EBF3FC]' : ''}`} aria-label="Comments" title="Comments">
          <Comment20Regular />
        </button>
        <button
          onClick={() => db.update('powerbi.reports', rec.id, { favorite: !rec.favorite })}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]"
          aria-label="Favorite"
        >
          {rec.favorite ? <Star20Filled className="text-[#E5A00D]" /> : <Star20Regular />}
        </button>
        <button onClick={() => setPane((p) => (p === 'copilot' ? null : 'copilot'))} className={`flex items-center gap-1.5 h-8 px-2.5 ml-1 rounded-[4px] border border-[#D1D1D1] text-[13px] hover:bg-[#F3F2F1] ${pane === 'copilot' ? 'bg-[#F3EEFB]' : ''}`}>
          <Sparkle20Regular className="text-[#744EC2]" /> Copilot
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* canvas */}
        <div ref={canvasRef} className={`flex-1 min-w-0 flex ${fit === 'page' ? 'items-center' : 'items-start pt-3'} justify-center ${fit === 'page' ? 'overflow-hidden' : 'overflow-auto'} relative`}>
          <div style={{ width: PW * scale, height: PH * scale }} className="relative shrink-0">
            <div
              className="absolute left-0 top-0 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              style={{ width: PW, height: PH, transform: `scale(${scale})`, transformOrigin: '0 0', fontFamily: "'Segoe UI', var(--font-win)", filter: highContrast ? 'contrast(1.35) saturate(1.3)' : undefined }}
              data-agent="powerbi-canvas"
            >
              <div className="absolute inset-0 bg-[#F6F6F6]" />
              <VisualCtx.Provider value={visualCtx}>
                {rec.kpis ? <OpsPage rec={rec} page={page} loading={loading} filter={filter} setFilter={setFilter} /> : rec.generic ? <GenericPage rec={rec} loading={loading} /> : null}
              </VisualCtx.Provider>
              {focused && (
                <button onClick={() => setFocused(null)} className="absolute left-4 top-[18px] z-40 h-7 px-2.5 rounded bg-white shadow text-[12.5px] text-[#0F6CBD] hover:bg-[#F3F2F1]">
                  ← Back to report
                </button>
              )}
            </div>
          </div>
        </div>
        {pane && <ReportSidePane kind={pane} rec={rec} insights={insights} page={page} pages={pages} onClose={() => setPane(null)} />}

        {/* filters pane */}
        {filters ? (
          <div className="w-[246px] shrink-0 bg-white border-l border-[#EDEBE9] flex flex-col" data-agent="powerbi-filter-pane">
            <div className="h-11 flex items-center px-3 gap-2">
              <span className="text-[15px] font-semibold flex-1">Filters</span>
              <button onClick={() => setFilter(NO_FILTER)} className={`w-7 h-7 flex items-center justify-center rounded hover:bg-[#F3F2F1] ${filtered ? 'text-[#0F6CBD]' : ''}`} aria-label="Clear filters" title="Clear filters">
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
                {rec.kpis ? (
                  <>
                    <FilterCard
                      text={`Region is ${filter.region.length ? filter.region.join(', ') : '(All)'}`}
                      active={filter.region.length > 0}
                      open={openCard === 'region'}
                      onToggle={() => setOpenCard((c) => (c === 'region' ? null : 'region'))}
                      options={regions}
                      selected={filter.region}
                      onChange={(region) => setFilter({ ...filter, region })}
                      agent="powerbi-filter-region"
                    />
                    <FilterCard
                      text={`Distribution Center is ${filter.dc.length ? filter.dc.join(', ') : '(All)'}`}
                      active={filter.dc.length > 0}
                      open={openCard === 'dc'}
                      onToggle={() => setOpenCard((c) => (c === 'dc' ? null : 'dc'))}
                      options={dcs}
                      selected={filter.dc}
                      onChange={(dc) => setFilter({ ...filter, dc })}
                      agent="powerbi-filter-dc"
                    />
                    <FilterCard text="Order Channel is (All)" />
                  </>
                ) : (
                  <FilterCard text="Business unit is (All)" />
                )}
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
        <button onClick={() => page > 0 && onPage(page - 1)} className={`w-7 h-7 flex items-center justify-center ${page > 0 ? 'text-[#252423] hover:bg-[#F3F2F1] rounded' : 'text-[#C8C6C4]'}`} aria-label="Previous page">
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
        <button onClick={() => page < pages.length - 1 && onPage(page + 1)} className={`w-7 h-7 flex items-center justify-center ${page < pages.length - 1 ? 'text-[#252423] hover:bg-[#F3F2F1] rounded' : 'text-[#C8C6C4]'}`} aria-label="Next page">
          <ChevronRight16Regular />
        </button>
        {filtered && (
          <span className="ml-2 h-6 px-2 rounded-full bg-[#EBF3FC] text-[#0F6CBD] text-[11.5px] flex items-center gap-1">
            Filtered: {[...filter.region, ...filter.dc].join(', ')}
            <button aria-label="Clear filters" onClick={() => setFilter(NO_FILTER)} className="ml-0.5">
              ×
            </button>
          </span>
        )}
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
      {dialog === 'subscribe' && <SubscribeDialog rec={rec} pages={pages} onClose={() => setDialog(null)} onDone={(m) => pbi.notify({ kind: 'success', title: 'Subscription created', body: m })} />}
      {dialog === 'teams' && <TeamsShareDialog rec={rec} onClose={() => setDialog(null)} onDone={(m) => pbi.notify({ kind: 'success', title: 'Shared to Teams', body: m })} />}
      {dialog === 'pin' && <PinDialog title={pinTitle} rec={rec} page={page} onClose={() => setDialog(null)} onDone={(n) => pbi.notify({ kind: 'success', title: 'Pinned to dashboard', body: `“${pinTitle}” was pinned to ${n}.` })} />}
      {dialog === 'embed' && <EmbedDialog rec={rec} url={url} onClose={() => setDialog(null)} onCopy={(t) => copy(t, 'Copied to clipboard')} />}
      {dialog === 'qr' && <QrDialog rec={rec} url={url} onClose={() => setDialog(null)} />}
      {dialog === 'saveCopy' && (
        <NameDialog
          title="Save a copy of this report"
          label="Name"
          initial={`Copy of ${rec.name}`}
          okLabel="Save"
          onOk={(n) => {
            const id = createReportFrom(rec, n, 'My workspace', isAgent)
            pbi.notify({ kind: 'success', title: 'Report saved', body: `“${n}” was saved to My workspace — you can edit your copy.` })
            pbi.openItem(id)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'bookmark' && (
        <NameDialog
          title="Add a personal bookmark"
          label="Bookmark name"
          initial={`${pages[page]}${filtered ? ` — ${[...filter.region, ...filter.dc].join(', ')}` : ''}`}
          okLabel="Save"
          onOk={(n) => {
            db.update('powerbi.reports', rec.id, (r) => ({ bookmarks: [...(r.bookmarks ?? []), { id: uid('bm'), name: n, page, filter, at: new Date().toISOString() }] }))
            pbi.notify({ kind: 'success', title: 'Bookmark added', body: n })
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function NameDialog({ title, label, initial, okLabel, onOk, onClose }: { title: string; label: string; initial: string; okLabel: string; onOk: (v: string) => void; onClose: () => void }) {
  const [v, setV] = useState(initial)
  return (
    <PbiModal
      title={title}
      onClose={onClose}
      width={420}
      footer={
        <>
          <PBtn primary disabled={!v.trim()} onClick={() => (onOk(v.trim()), onClose())}>
            {okLabel}
          </PBtn>
          <PBtn onClick={onClose}>Cancel</PBtn>
        </>
      }
    >
      <label className="block">
        <span className="block text-[12.5px] font-semibold mb-1">{label}</span>
        <input autoFocus className={field} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && v.trim() && (onOk(v.trim()), onClose())} />
      </label>
    </PbiModal>
  )
}

function ReportSidePane({ kind, rec, insights, page, pages, onClose }: { kind: 'insights' | 'comments' | 'copilot'; rec: any; insights: { title: string; body: string }[]; page: number; pages: string[]; onClose: () => void }) {
  const [draft, setDraft] = useState('')
  const [asked, setAsked] = useState<{ q: string; a: string }[]>([])
  const comments: any[] = rec.comments ?? []
  return (
    <div className="w-[300px] shrink-0 bg-white border-l border-[#EDEBE9] flex flex-col" data-agent={`powerbi-${kind}-pane`}>
      <div className="h-11 flex items-center px-3 gap-2 shrink-0">
        <span className="text-[15px] font-semibold flex-1">{kind === 'insights' ? 'Insights' : kind === 'comments' ? 'Comments' : 'Copilot'}</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F3F2F1]" aria-label="Close pane">
          <Dismiss20Regular className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto px-3 pb-3 space-y-2 text-[13px]">
        {kind === 'insights' &&
          (insights.length ? (
            insights.map((i) => (
              <div key={i.title} className="rounded-md border border-[#E1DFDD] p-3">
                <div className="font-semibold text-[13px] flex items-center gap-1.5">
                  <Lightbulb20Regular className="w-4 h-4 text-[#E5A00D]" /> {i.title}
                </div>
                <div className="text-[12.5px] text-[#605E5C] mt-1">{i.body}</div>
              </div>
            ))
          ) : (
            <div className="text-[#605E5C]">No notable insights for this report right now.</div>
          ))}
        {kind === 'comments' && (
          <>
            {comments.map((c) => (
              <div key={c.id} className="rounded-md border border-[#E1DFDD] p-2.5">
                <div className="flex items-center gap-2">
                  <Avatar id={c.author} size={22} />
                  <span className="text-[12.5px] font-semibold flex-1">{person(c.author).name}</span>
                  <button aria-label="Delete comment" onClick={() => db.update('powerbi.reports', rec.id, (r) => ({ comments: (r.comments ?? []).filter((x: any) => x.id !== c.id) }))} className="text-[#605E5C] hover:text-[#A4262C]">
                    ×
                  </button>
                </div>
                <div className="text-[11px] text-[#605E5C]">
                  {pages[c.page] ?? ''} · {fmtSmart(c.at)}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
              </div>
            ))}
            {!comments.length && <div className="text-[#605E5C] py-2">Start a conversation about this report.</div>}
            <textarea data-agent="powerbi-comment-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment. Use @ to mention someone." className="w-full h-[70px] resize-none rounded border border-[#8A8886] focus:border-[#0F6CBD] outline-none p-2" />
            <div className="flex justify-end">
              <PBtn
                primary
                agent="powerbi-comment-post"
                disabled={!draft.trim()}
                onClick={() => {
                  db.update('powerbi.reports', rec.id, (r) => ({ comments: [...(r.comments ?? []), { id: uid('cmt'), author: ME.id, text: draft.trim(), page, at: new Date().toISOString() }] }))
                  setDraft('')
                }}
              >
                Post
              </PBtn>
            </div>
          </>
        )}
        {kind === 'copilot' && (
          <>
            <div className="rounded-lg p-3 bg-gradient-to-br from-[#EEF6FF] to-[#F5EEFF]">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <Sparkle20Regular className="w-4 h-4 text-[#744EC2]" /> Summary of “{pages[page]}”
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[12.5px]">
                {insights.slice(0, 4).map((i) => (
                  <li key={i.title}>
                    {i.title}. {i.body}
                  </li>
                ))}
              </ul>
            </div>
            {asked.map((m, i) => (
              <div key={i} className="space-y-1">
                <div className="ml-6 rounded-lg bg-[#EBF3FC] px-3 py-2 text-[12.5px]">{m.q}</div>
                <div className="mr-4 rounded-lg border border-[#E1DFDD] px-3 py-2 text-[12.5px]">{m.a}</div>
              </div>
            ))}
            {['What changed since last week?', 'Which region needs attention?', 'Summarize this page'].map((q) => (
              <button
                key={q}
                onClick={() =>
                  setAsked((a) => [
                    ...a,
                    {
                      q,
                      a: q.startsWith('Which') ? (insights[0] ? `${insights[0].title}. ${insights[0].body}` : 'No region stands out.') : q.startsWith('What') ? insights.filter((i) => /week|increased|decreased|up|down/i.test(i.title + i.body)).map((i) => i.title).join('; ') || 'Little changed week over week.' : insights.slice(0, 3).map((i) => i.title).join('. ') + '.',
                    },
                  ])
                }
                className="w-full text-left rounded-md border border-[#D1D1D1] px-3 py-2 text-[12.5px] hover:bg-[#F3F2F1]"
              >
                {q}
              </button>
            ))}
            <div className="text-[11px] text-[#A19F9D]">AI-generated content may be incorrect.</div>
          </>
        )}
      </div>
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
function FilterCard({
  text,
  active,
  open,
  onToggle,
  options,
  selected,
  onChange,
  agent,
}: {
  text: string
  active?: boolean
  open?: boolean
  onToggle?: () => void
  options?: string[]
  selected?: string[]
  onChange?: (v: string[]) => void
  agent?: string
}) {
  const [a, b] = text.split(' is ')
  return (
    <div className={`rounded-[4px] px-2.5 py-2 ${active ? 'bg-[#EBF3FC]' : 'bg-[#F3F2F1]'}`} data-agent={agent}>
      <button onClick={onToggle} disabled={!onToggle} className="w-full flex items-center justify-between text-left">
        <span className="text-[12.5px] font-semibold text-[#252423]">{a}</span>
        <ChevronDown12Regular className={`text-[#605E5C] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="text-[11.5px] text-[#605E5C] truncate">is {b}</div>
      {open && options && onChange && (
        <div className="mt-2 pt-2 border-t border-[#E1DFDD] space-y-1">
          <div className="text-[11px] text-[#605E5C]">Filter type: Basic filtering</div>
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={!selected?.length} onChange={() => onChange([])} /> Select all
          </label>
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={!!selected?.includes(o)} onChange={() => onChange(selected?.includes(o) ? selected.filter((x) => x !== o) : [...(selected ?? []), o])} />
              <span className="truncate">{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function Dropdown({ items, onClose }: { items: ([string] | [string, () => void])[]; onClose: () => void }) {
  return (
    <div className="absolute z-40 left-0 top-9 w-[220px] bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13),0_1.2px_3.6px_rgba(0,0,0,0.11)] py-1" onMouseLeave={onClose}>
      {items.map(([l, fn]) => (
        <button
          key={l}
          onClick={() => {
            onClose()
            fn?.()
          }}
          className="w-full h-9 px-3 text-[13px] text-left hover:bg-[#F3F2F1]"
        >
          {l}
        </button>
      ))}
    </div>
  )
}

/* ───────────────────────────── Send link dialog ───────────────────────────── */

export function ShareDialog({ rec, onClose, prefix = 'powerbi-share' }: { rec: any; onClose: () => void; prefix?: string }) {
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
      <div className="w-[460px] bg-white rounded-lg shadow-[0_25.6px_57.6px_rgba(0,0,0,0.22),0_4.8px_14.4px_rgba(0,0,0,0.18)] p-6" onMouseDown={(e) => e.stopPropagation()} data-agent={`${prefix}-dialog`}>
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
            data-agent={`${prefix}-to`}
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
                <button key={p.id} data-agent={`${prefix}-suggest-${p.id}`} onClick={() => add(p.email)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F3F2F1] text-left">
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
          data-agent={`${prefix}-message`}
          aria-label="Add a message (optional)"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Add a message (optional)"
          className="mt-3 w-full h-[96px] resize-none rounded-[4px] border border-[#8A8886] focus:border-[#0F6CBD] outline-none px-2.5 py-2 text-[13px]"
        />
        <div className="mt-4 flex items-center gap-2">
          <button
            data-agent={`${prefix}-send`}
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
            <button
              key={l}
              title={l}
              aria-label={l}
              onClick={() => {
                if (l === 'Copy link') {
                  navigator.clipboard?.writeText(itemUrl(rec)).catch(() => {})
                  pbi.notify({ kind: 'success', title: 'Link copied', body: `People in Northwind Global with the link can view “${rec.name}”.` })
                } else pbi.notify({ kind: 'success', title: `Shared via ${l}`, body: `A link to “${rec.name}” is ready in ${l}.` })
              }}
              className="w-10 h-12 flex flex-col items-center justify-center gap-0.5 rounded hover:bg-[#F3F2F1] text-[10px] text-[#605E5C]"
            >
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
