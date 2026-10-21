import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useCollection } from '@/db/db'
import { HWChip, THEME, dataSource, fmtDT, fmtN, usePbi } from './shared'
import { AXIS, GRID } from './visuals'

export function DashboardView({ rec }: { rec: any }) {
  const all = useCollection('powerbi.reports')
  const pbi = usePbi()
  const src = dataSource(rec, all)
  const k = src.kpis ?? {}
  const p = src.prevKpis ?? {}
  const tiles: [string, string, number, number, boolean?][] = [
    ['On-time delivery', `${k.onTimeDelivery}%`, k.onTimeDelivery, p.onTimeDelivery],
    ['Order cycle time', `${k.orderCycleTimeDays} days`, k.orderCycleTimeDays, p.orderCycleTimeDays, true],
    ['Warehouse SLA', `${k.warehouseSla}%`, k.warehouseSla, p.warehouseSla],
    ['Cost per order', `$${Number(k.costPerOrder ?? 0).toFixed(2)}`, k.costPerOrder, p.costPerOrder, true],
    ['Orders shipped', fmtN(k.ordersShipped ?? 0), k.ordersShipped, p.ordersShipped],
    ['Backorders', fmtN(k.backorders ?? 0), k.backorders, p.backorders, true],
  ]
  return (
    <div className="flex-1 overflow-auto bg-[#EAEAEA] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-[20px] font-semibold">{rec.name}</div>
        <span className="text-[12px] text-[#605E5C]">Data from “{src.name}” · last refreshed {fmtDT(src.lastRefreshed)}</span>
        {src.refreshedBy === 'hworker' && <HWChip />}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-[1100px]">
        {tiles.map(([l, v, cur, prev, lower]) => {
          const good = lower ? cur <= prev : cur >= prev
          return (
            <button key={l} onClick={() => pbi.openItem(src.id)} className="bg-white h-[140px] p-4 text-left shadow-[0_0_0_1px_#E6E6E6] hover:shadow-md">
              <div className="text-[13px] text-[#605E5C]">{l}</div>
              <div className="text-[36px] font-light text-[#252423] mt-2">{v}</div>
              <div className={`text-[12px] ${good ? 'text-[#107C10]' : 'text-[#A4262C]'}`}>{good ? '▲' : '▼'} vs last week</div>
            </button>
          )
        })}
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
      </div>
    </div>
  )
}
