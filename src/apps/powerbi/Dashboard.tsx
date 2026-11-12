import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Share20Regular, Mail20Regular, ArrowClockwise20Regular, Star20Regular, Star20Filled, MoreHorizontal16Regular, Comment20Regular, ArrowExpand16Regular } from '@fluentui/react-icons'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { HWChip, THEME, dataSource, fmtDT, fmtN, usePbi } from './shared'
import { AXIS, GRID, LoadingDots } from './visuals'
import { ShareDialog } from './Report'
import { SubscribeDialog } from './views'

export function DashboardView({ rec }: { rec: any }) {
  const all = useCollection('powerbi.reports')
  const pbi = usePbi()
  const { isAgent: _a } = useDesk()
  const src = dataSource(rec, all)
  const k = src.kpis ?? {}
  const p = src.prevKpis ?? {}
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<null | 'share' | 'subscribe'>(null)
  const [tileMenu, setTileMenu] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const hasKpis = !!src.kpis
  const tiles: [string, string, number, number, boolean?][] = hasKpis
    ? [
        ['On-time delivery', `${k.onTimeDelivery}%`, k.onTimeDelivery, p.onTimeDelivery],
        ['Order cycle time', `${k.orderCycleTimeDays} days`, k.orderCycleTimeDays, p.orderCycleTimeDays, true],
        ['Warehouse SLA', `${k.warehouseSla}%`, k.warehouseSla, p.warehouseSla],
        ['Cost per order', `$${Number(k.costPerOrder ?? 0).toFixed(2)}`, k.costPerOrder, p.costPerOrder, true],
        ['Orders shipped', fmtN(k.ordersShipped ?? 0), k.ordersShipped, p.ordersShipped],
        ['Backorders', fmtN(k.backorders ?? 0), k.backorders, p.backorders, true],
      ]
    : []
  const pinned: any[] = rec.tiles ?? []
  const refresh = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      pbi.notify({ kind: 'success', title: 'Tiles refreshed', body: `“${rec.name}” tiles show the latest cached data.` })
    }, 1400)
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#EAEAEA]" data-agent="powerbi-dashboard">
      <div className="h-11 shrink-0 bg-white border-b border-[#EDEBE9] flex items-center px-2 gap-0.5 text-[13px]">
        <button data-agent="powerbi-dashboard-share" onClick={() => setDialog('share')} className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F3F2F1]">
          <Share20Regular className="w-[18px] h-[18px]" /> Share
        </button>
        <button onClick={() => pbi.notify({ kind: 'info', title: 'Comments', body: 'Open a tile’s report to start a conversation on a visual.' })} className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F3F2F1]">
          <Comment20Regular className="w-[18px] h-[18px]" /> Comment
        </button>
        <button onClick={() => setDialog('subscribe')} className="flex items-center gap-1.5 h-8 px-2 rounded hover:bg-[#F3F2F1]">
          <Mail20Regular className="w-[18px] h-[18px]" /> Subscribe to dashboard
        </button>
        <div className="flex-1" />
        <button aria-label="Refresh visuals" title="Refresh visuals" onClick={refresh} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]">
          <ArrowClockwise20Regular className={loading ? 'animate-spin text-[#0F6CBD]' : ''} />
        </button>
        <button aria-label="Favorite" onClick={() => db.update('powerbi.reports', rec.id, { favorite: !rec.favorite })} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F3F2F1]">
          {rec.favorite ? <Star20Filled className="text-[#E5A00D]" /> : <Star20Regular />}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[20px] font-semibold">{rec.name}</div>
          {src !== rec && <span className="text-[12px] text-[#605E5C]">Data from “{src.name}” · last refreshed {fmtDT(src.lastRefreshed)}</span>}
          {src.refreshedBy === 'hworker' && <HWChip />}
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-[1100px]">
          {tiles.map(([l, v, cur, prev, lower]) => {
            const good = lower ? cur <= prev : cur >= prev
            return (
              <button key={l} onClick={() => pbi.openItem(src.id)} className="relative bg-white h-[140px] p-4 text-left shadow-[0_0_0_1px_#E6E6E6] hover:shadow-md">
                <div className="text-[13px] text-[#605E5C]">{l}</div>
                <div className={`text-[36px] font-light text-[#252423] mt-2 ${loading ? 'opacity-30' : ''}`}>{v}</div>
                <div className={`text-[12px] ${good ? 'text-[#107C10]' : 'text-[#A4262C]'}`}>{good ? '▲' : '▼'} vs last week</div>
                {loading && <LoadingDots />}
              </button>
            )
          })}
          {pinned.map((t) => (
            <div key={t.id} data-agent={`powerbi-tile-${t.id}`} className={`relative group bg-white p-4 shadow-[0_0_0_1px_#E6E6E6] hover:shadow-md ${focus === t.id ? 'col-span-3 h-[220px]' : 'h-[140px]'}`}>
              <button onClick={() => pbi.openItem(t.reportId, t.page ?? 0)} className="absolute inset-0" aria-label={`Open ${t.title}`} />
              <div className="relative pointer-events-none">
                <div className="text-[13px] font-semibold text-[#252423] truncate pr-10">{t.title}</div>
                <div className="text-[11.5px] text-[#605E5C] truncate">
                  {t.reportName} · page {Number(t.page ?? 0) + 1}
                </div>
                <div className={`mt-3 flex items-end gap-1.5 ${focus === t.id ? 'h-[130px]' : 'h-[60px]'}`}>
                  {Array.from({ length: 10 }, (_, i) => {
                    let seed = 0
                    for (const c of t.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
                    const h = 25 + (((seed >> i) * 9301 + 49297 * i) % 233280) / 233280 * 75
                    return <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${h}%`, background: i % 2 ? THEME[1] : THEME[0] }} />
                  })}
                </div>
              </div>
              <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 z-10">
                <button aria-label="Focus mode" onClick={() => setFocus(focus === t.id ? null : t.id)} className="w-6 h-6 rounded hover:bg-[#F3F2F1] flex items-center justify-center bg-white">
                  <ArrowExpand16Regular />
                </button>
                <button aria-label="More options" onClick={() => setTileMenu(tileMenu === t.id ? null : t.id)} className="w-6 h-6 rounded hover:bg-[#F3F2F1] flex items-center justify-center bg-white">
                  <MoreHorizontal16Regular />
                </button>
              </div>
              {tileMenu === t.id && (
                <div className="absolute right-2 top-9 z-20 w-[180px] bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13)] py-1 text-[13px]" onMouseLeave={() => setTileMenu(null)}>
                  <button onClick={() => pbi.openItem(t.reportId, t.page ?? 0)} className="w-full h-8 px-3 text-left hover:bg-[#F3F2F1]">
                    Go to report
                  </button>
                  <button
                    onClick={() => {
                      db.update('powerbi.reports', rec.id, (d) => ({ tiles: (d.tiles ?? []).filter((x: any) => x.id !== t.id) }))
                      setTileMenu(null)
                    }}
                    className="w-full h-8 px-3 text-left hover:bg-[#F3F2F1] text-[#A4262C]"
                  >
                    Delete tile
                  </button>
                </div>
              )}
            </div>
          ))}
          {hasKpis && (
            <div className="col-span-3 bg-white h-[260px] p-4 shadow-[0_0_0_1px_#E6E6E6]">
              <div className="text-[14px] font-semibold mb-2">Orders shipped by week</div>
              <LineChart width={1060} height={200} data={src.weekly ?? []}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="week" tick={AXIS} tickLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Line dataKey="orders" stroke={THEME[0]} strokeWidth={2.5} dot={false} />
                <Line dataKey="ordersLY" stroke={THEME[1]} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </div>
          )}
          {!hasKpis && !pinned.length && (
            <div className="col-span-3 bg-white p-10 text-center text-[13px] text-[#605E5C] shadow-[0_0_0_1px_#E6E6E6]">This dashboard is empty. Open a report and use “Pin visual” on any visual to add tiles here.</div>
          )}
        </div>
      </div>
      {dialog === 'share' && <ShareDialog rec={rec} prefix="powerbi-dashboard-share" onClose={() => setDialog(null)} />}
      {dialog === 'subscribe' && <SubscribeDialog rec={rec} pages={['Dashboard']} onClose={() => setDialog(null)} onDone={(m) => pbi.notify({ kind: 'success', title: 'Subscription created', body: m })} />}
    </div>
  )
}
