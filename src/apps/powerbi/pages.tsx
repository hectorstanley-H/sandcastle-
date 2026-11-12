import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState } from 'react'
import { ChevronDown12Regular, Checkmark12Regular } from '@fluentui/react-icons'
import { AXIS, BubbleMap, GRID, KpiCard, Legend, Matrix, Visual, fmtVal, type Fmt } from './visuals'
import { THEME, fmtN } from './shared'

const W = 1280
const P = 16
const ANIM = 700

const kfmt = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n))

function cardsRow(n: number) {
  const gap = 8
  const w = (W - P * 2 - gap * (n - 1)) / n
  return Array.from({ length: n }, (_, i) => ({ x: P + i * (w + gap), y: 60, w, h: 96 }))
}

export interface OpsFilter {
  region: string[]
  dc: string[]
}
export const NO_FILTER: OpsFilter = { region: [], dc: [] }

function Slicer({ label, value, options, selected, onChange }: { label: string; value: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-[150px] relative">
      <div className="text-[10.5px] text-[#605E5C] leading-[13px]">{label}</div>
      <button
        data-agent={`powerbi-slicer-${label.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => setOpen((o) => !o)}
        className="w-full h-[24px] border border-[#C8C6C4] rounded-[2px] flex items-center justify-between px-1.5 text-[12px] text-[#252423] bg-white hover:border-[#8A8886]"
      >
        <span className="truncate">{value}</span> <ChevronDown12Regular className="text-[#605E5C] shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-[40px] z-40 w-[200px] bg-white rounded shadow-[0_6px_14px_rgba(0,0,0,0.18)] py-1 text-[12px]" onMouseLeave={() => setOpen(false)}>
          <button onClick={() => (onChange([]), setOpen(false))} className="w-full flex items-center gap-2 h-7 px-2 hover:bg-[#F3F2F1] text-left">
            <span className="w-3.5 h-3.5 border border-[#605E5C] rounded-[2px] flex items-center justify-center">{!selected.length && <Checkmark12Regular />}</span> Select all
          </button>
          {options.map((o) => (
            <button key={o} onClick={() => onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o])} className="w-full flex items-center gap-2 h-7 px-2 hover:bg-[#F3F2F1] text-left">
              <span className="w-3.5 h-3.5 border border-[#605E5C] rounded-[2px] flex items-center justify-center">{selected.includes(o) && <Checkmark12Regular />}</span>
              <span className="truncate">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Header({ rec, subtitle, filter, setFilter }: { rec: any; subtitle: string; filter?: OpsFilter; setFilter?: (f: OpsFilter) => void }) {
  const regions: string[] = rec.byRegion?.map((r: any) => r.region) ?? []
  return (
    <div className="absolute left-0 top-0 right-0 h-[52px] flex items-center px-4 border-b border-[#EDEBE9]">
      <div className="w-8 h-8 rounded-md bg-[#12239E] text-white flex items-center justify-center text-[15px] font-bold mr-2.5">N</div>
      <div className="leading-tight">
        <div className="text-[17px] font-semibold text-[#252423]">{rec.name}</div>
        <div className="text-[11.5px] text-[#605E5C]">{subtitle}</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {rec.kpis && filter && setFilter && (
          <>
            <div className="w-[150px]">
              <div className="text-[10.5px] text-[#605E5C] leading-[13px]">Fiscal week</div>
              <div className="h-[24px] border border-[#C8C6C4] rounded-[2px] flex items-center justify-between px-1.5 text-[12px] text-[#252423]">
                Week {rec.fiscalWeek} <ChevronDown12Regular className="text-[#605E5C]" />
              </div>
            </div>
            <Slicer label="Region" value={filter.region.length ? (filter.region.length === 1 ? filter.region[0] : 'Multiple selections') : 'All'} options={regions} selected={filter.region} onChange={(region) => setFilter({ ...filter, region })} />
            <div className="w-[150px]">
              <div className="text-[10.5px] text-[#605E5C] leading-[13px]">Channel</div>
              <div className="h-[24px] border border-[#C8C6C4] rounded-[2px] flex items-center justify-between px-1.5 text-[12px] text-[#252423]">
                All <ChevronDown12Regular className="text-[#605E5C]" />
              </div>
            </div>
          </>
        )}
        {!(rec.kpis && filter && setFilter) && (rec.kpis
          ? [
              ['Fiscal week', `Week ${rec.fiscalWeek}`],
              ['Region', 'All'],
              ['Channel', 'All'],
            ]
          : [
              ['Period', 'FY27 YTD'],
              ['Business unit', 'All'],
            ]
        ).map(([l, v]) => (
          <div key={l} className="w-[150px]">
            <div className="text-[10.5px] text-[#605E5C] leading-[13px]">{l}</div>
            <div className="h-[24px] border border-[#C8C6C4] rounded-[2px] flex items-center justify-between px-1.5 text-[12px] text-[#252423]">
              {v} <ChevronDown12Regular className="text-[#605E5C]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────── ops report ──────────────────────────────── */

/** aggregate KPIs over a subset of distribution centers (weighted by orders) */
function aggregate(rows: any[], k: any) {
  const orders = rows.reduce((a, r) => a + r.orders, 0) || 1
  const w = (f: string) => Math.round((rows.reduce((a, r) => a + r[f] * r.orders, 0) / orders) * 100) / 100
  return {
    ...k,
    ordersShipped: rows.reduce((a, r) => a + r.orders, 0),
    onTimeDelivery: Math.round(w('onTime') * 10) / 10,
    warehouseSla: Math.round(w('sla') * 10) / 10,
    orderCycleTimeDays: Math.round(w('cycleDays') * 10) / 10,
    costPerOrder: w('costPerOrder'),
    backorders: rows.reduce((a, r) => a + r.backorders, 0),
  }
}

export function OpsPage({ rec: rec0, page, loading, filter = NO_FILTER, setFilter }: { rec: any; page: number; loading: boolean; filter?: OpsFilter; setFilter?: (f: OpsFilter) => void }) {
  const filtered = filter.region.length > 0 || filter.dc.length > 0
  const rows = filtered ? rec0.byRegion.filter((r: any) => (!filter.region.length || filter.region.includes(r.region)) && (!filter.dc.length || filter.dc.includes(r.dc))) : rec0.byRegion
  const rec = filtered ? { ...rec0, byRegion: rows.length ? rows : rec0.byRegion } : rec0
  const k = filtered && rows.length ? aggregate(rows, rec0.kpis) : rec0.kpis
  const p = filtered && rows.length ? { ordersShipped: rows.reduce((a: number, r: any) => a + r.prevOrders, 0) } : rec0.prevKpis
  const t = rec0.targets ?? {}
  const key = rec0.lastRefreshed
  const scope = filter.dc.length ? filter.dc.join(', ') : filter.region.length ? `${filter.region.join(', ')} region${filter.region.length > 1 ? 's' : ''}` : 'All distribution centers'
  const sub = `Fiscal Week ${rec0.fiscalWeek} · ${rec0.weekRange} · ${scope}`
  const cross = setFilter
    ? {
        region: (v: string) => setFilter({ ...filter, region: filter.region.length === 1 && filter.region[0] === v ? [] : [v] }),
        dc: (v: string) => setFilter({ ...filter, dc: filter.dc.length === 1 && filter.dc[0] === v ? [] : [v] }),
        isDc: (v: string) => filter.dc.includes(v),
        isRegion: (v: string) => filter.region.includes(v),
      }
    : undefined
  return (
    <>
      <Header rec={rec0} subtitle={sub} filter={filter} setFilter={setFilter} />
      {page === 0 && <Exec rec={rec} k={k} p={p} t={t} loading={loading} key={key} cross={cross} />}
      {page === 1 && <Fulfillment rec={rec} k={k} p={p} t={t} loading={loading} key={key} />}
      {page === 2 && <WarehouseSla rec={rec} k={k} p={p} t={t} loading={loading} key={key} cross={cross} />}
      {page === 3 && <VendorSpend rec={rec0} k={rec0.kpis} p={rec0.prevKpis} t={t} loading={loading} key={key} />}
    </>
  )
}

type Cross = { region: (v: string) => void; dc: (v: string) => void; isDc: (v: string) => boolean; isRegion: (v: string) => boolean }
type PP = { rec: any; k: any; p: any; t: any; loading: boolean; cross?: Cross }

function Exec({ rec, k, p, t, loading, cross }: PP) {
  const c = cardsRow(7)
  const cards: [string, string, Fmt, boolean?][] = [
    ['ordersShipped', 'Orders shipped', 'int'],
    ['onTimeDelivery', 'On-time delivery %', 'pct'],
    ['orderCycleTimeDays', 'Order cycle time (days)', 'dec', true],
    ['warehouseSla', 'Warehouse SLA %', 'pct'],
    ['costPerOrder', 'Cost per order', 'money', true],
    ['backorders', 'Backorders', 'int', true],
    ['returnsRate', 'Returns rate %', 'pct', true],
  ]
  const regions = rec.byRegion.map((r: any) => ({ name: r.region, tw: r.orders, lw: r.prevOrders }))
  const tot = rec.byRegion.reduce((a: any, r: any) => ({ orders: a.orders + r.orders, backorders: a.backorders + r.backorders }), { orders: 0, backorders: 0 })
  return (
    <>
      {cards.map(([key, label, fmt, lb], i) => (
        <KpiCard key={key} {...c[i]} agent={`powerbi-kpi-${key}`} label={label} value={k[key]} prev={p?.[key]} target={t[key]} fmt={fmt} lowerBetter={lb} loading={loading} accent={i % 2 ? THEME[1] : THEME[0]} />
      ))}
      <Visual x={P} y={164} w={500} h={268} title="Orders shipped by fiscal week" sub="This year vs last year" loading={loading}>
        <div className="absolute right-0 -top-7"><Legend items={[['This year', THEME[0]], ['Last year', THEME[1]]]} /></div>
        <LineChart width={476} height={218} data={rec.weekly} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: '#C8C6C4' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[15000, 'auto']} tickFormatter={kfmt} />
          <Tooltip formatter={(v: any) => fmtN(v)} />
          <Line type="linear" dataKey="orders" name="This year" stroke={THEME[0]} strokeWidth={2.5} dot={false} animationDuration={ANIM} />
          <Line type="linear" dataKey="ordersLY" name="Last year" stroke={THEME[1]} strokeWidth={2} dot={false} strokeDasharray="0" animationDuration={ANIM} />
        </LineChart>
      </Visual>
      <Visual x={524} y={164} w={420} h={268} title="Orders by region" sub="This week vs last week" loading={loading}>
        <div className="absolute right-0 -top-7"><Legend items={[['This week', THEME[0]], ['Last week', THEME[1]]]} /></div>
        <BarChart width={396} height={218} data={regions} margin={{ top: 16, right: 4, left: -12, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#C8C6C4' }} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={kfmt} />
          <Tooltip formatter={(v: any) => fmtN(v)} />
          <Bar dataKey="tw" name="This week" fill={THEME[0]} animationDuration={ANIM} onClick={cross ? (d: any) => cross.region(d?.name ?? d?.payload?.name) : undefined} style={cross ? { cursor: 'pointer' } : undefined}>
            <LabelList dataKey="tw" position="top" formatter={(v: any) => `${(v / 1000).toFixed(1)}K`} style={{ fontSize: 9, fill: '#605E5C' }} />
          </Bar>
          <Bar dataKey="lw" name="Last week" fill={THEME[1]} animationDuration={ANIM} onClick={cross ? (d: any) => cross.region(d?.name ?? d?.payload?.name) : undefined} style={cross ? { cursor: 'pointer' } : undefined} />
        </BarChart>
      </Visual>
      <Visual x={952} y={164} w={312} h={268} title="Orders by carrier" sub={`${fmtN(k.ordersShipped)} orders`} loading={loading}>
        <Donut data={rec.byCarrier.map((c: any) => ({ name: c.carrier, v: c.orders }))} w={288} h={218} />
      </Visual>
      <Visual x={P} y={440} w={470} h={264} title="On-time delivery % by distribution center" sub={`Bubble size = orders shipped · target ${t.onTimeDelivery}%`} loading={loading} agent="powerbi-visual-map">
        <BubbleMap data={rec.byRegion} target={t.onTimeDelivery ?? 95} loading={loading} />
      </Visual>
      <Visual x={494} y={440} w={770} h={264} title="Distribution center scorecard" loading={loading} agent="powerbi-visual-scorecard">
        <Matrix
          cols={[
            { key: 'dc', label: 'Distribution center' },
            { key: 'region', label: 'Region' },
            { key: 'orders', label: 'Orders', align: 'right', fmt: fmtN, bar: Math.max(...rec.byRegion.map((r: any) => r.orders)) },
            { key: 'onTime', label: 'On-time %', align: 'right', fmt: (v) => `${v.toFixed(1)}%`, scale: { min: 91, max: 98 } },
            { key: 'sla', label: 'SLA %', align: 'right', fmt: (v) => `${v.toFixed(1)}%`, icon: (v) => (v >= 98 ? 'good' : v >= 96.5 ? 'warn' : 'bad') },
            { key: 'cycleDays', label: 'Cycle (d)', align: 'right', fmt: (v) => v.toFixed(1), scale: { min: 2.2, max: 3.8, reverse: true } },
            { key: 'backorders', label: 'Backorders', align: 'right', fmt: fmtN },
            { key: 'costPerOrder', label: 'Cost/order', align: 'right', fmt: (v) => `$${v.toFixed(2)}` },
          ]}
          rows={rec.byRegion}
          total={{ dc: 'Total', orders: tot.orders, onTime: k.onTimeDelivery, sla: k.warehouseSla, cycleDays: k.orderCycleTimeDays, backorders: tot.backorders, costPerOrder: k.costPerOrder }}
          onRow={cross ? (r) => cross.dc(r.dc) : undefined}
          selected={cross ? (r) => cross.isDc(r.dc) : undefined}
        />
      </Visual>
    </>
  )
}

function Fulfillment({ rec, k, p, t, loading }: PP) {
  const c = cardsRow(5)
  const cards: [string, string, Fmt, boolean?][] = [
    ['ordersShipped', 'Orders shipped', 'int'],
    ['orderCycleTimeDays', 'Order cycle time (days)', 'dec', true],
    ['backorders', 'Backorders', 'int', true],
    ['returnsRate', 'Returns rate %', 'pct', true],
    ['openIncidents', 'Open fulfillment incidents', 'int', true],
  ]
  return (
    <>
      {cards.map(([key, label, fmt, lb], i) => (
        <KpiCard key={key} {...c[i]} agent={`powerbi-kpi-${key}`} label={label} value={k[key] ?? 0} prev={p?.[key]} target={t[key]} fmt={fmt} lowerBetter={lb} loading={loading} accent={THEME[i % 2 ? 2 : 0]} />
      ))}
      <Visual x={P} y={164} w={740} h={268} title="Orders shipped and on-time % by fiscal week" loading={loading}>
        <div className="absolute right-0 -top-7"><Legend items={[['Orders shipped', THEME[0]], ['On-time %', THEME[2]]]} /></div>
        <ComposedChart width={716} height={218} data={rec.weekly} margin={{ top: 12, right: 0, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: '#C8C6C4' }} />
          <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={kfmt} />
          <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} domain={[88, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip />
          <Bar yAxisId="l" dataKey="orders" name="Orders shipped" fill={THEME[0]} barSize={26} animationDuration={ANIM} />
          <Line yAxisId="r" dataKey="onTime" name="On-time %" stroke={THEME[2]} strokeWidth={2.5} dot={{ r: 2.5, fill: THEME[2] }} animationDuration={ANIM} />
          <ReferenceLine yAxisId="r" y={t.onTimeDelivery} stroke="#D64550" strokeDasharray="4 3" label={{ value: `Target ${t.onTimeDelivery}%`, fill: '#D64550', fontSize: 10, position: 'insideTopRight' }} />
        </ComposedChart>
      </Visual>
      <Visual x={764} y={164} w={500} h={268} title="Order cycle time by stage (days)" sub={`Total ${k.orderCycleTimeDays.toFixed(1)} days · target ${t.orderCycleTimeDays?.toFixed(1)}`} loading={loading}>
        <BarChart layout="vertical" width={476} height={210} data={rec.cycleStages} margin={{ top: 10, right: 36, left: 20, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="stage" tick={AXIS} tickLine={false} axisLine={false} width={96} />
          <Bar dataKey="days" fill={THEME[5]} barSize={22} animationDuration={ANIM}>
            <LabelList dataKey="days" position="right" style={{ fontSize: 11, fill: '#252423' }} />
          </Bar>
        </BarChart>
      </Visual>
      <Visual x={P} y={440} w={480} h={264} title="Backorders by product category" sub="Units on backorder" loading={loading}>
        <BarChart width={456} height={212} data={rec.backorderCats} margin={{ top: 18, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="category" tick={{ ...AXIS, fontSize: 9.5 }} tickLine={false} interval={0} axisLine={{ stroke: '#C8C6C4' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Bar dataKey="units" fill={THEME[3]} animationDuration={ANIM}>
            <LabelList dataKey="units" position="top" style={{ fontSize: 10, fill: '#605E5C' }} />
          </Bar>
        </BarChart>
      </Visual>
      <Visual x={504} y={440} w={760} h={264} title="Carrier performance" loading={loading}>
        <Matrix
          cols={[
            { key: 'carrier', label: 'Carrier' },
            { key: 'orders', label: 'Shipments', align: 'right', fmt: fmtN, bar: Math.max(...rec.byCarrier.map((r: any) => r.orders)) },
            { key: 'onTime', label: 'On-time %', align: 'right', fmt: (v) => `${v.toFixed(1)}%`, scale: { min: 90, max: 98 } },
            { key: 'transitDays', label: 'Avg transit (d)', align: 'right', fmt: (v) => v.toFixed(1), scale: { min: 1.6, max: 4, reverse: true } },
            { key: 'costPerShipment', label: 'Cost / shipment', align: 'right', fmt: (v) => `$${v.toFixed(2)}` },
            { key: 'onTime', label: 'Status', fmt: (v) => (v >= (t.onTimeDelivery ?? 95) ? 'On track' : 'Below target'), icon: (v) => (v >= (t.onTimeDelivery ?? 95) ? 'good' : v >= 92 ? 'warn' : 'bad') },
          ]}
          rows={rec.byCarrier}
          total={{ carrier: 'Total', orders: k.ordersShipped, onTime: k.onTimeDelivery }}
        />
      </Visual>
    </>
  )
}

function WarehouseSla({ rec, k, t, loading, cross }: PP) {
  const R = rec.byRegion
  const avg = (f: string) => R.reduce((a: number, r: any) => a + r[f] * r.orders, 0) / R.reduce((a: number, r: any) => a + r.orders, 0)
  const sla = k.warehouseSla
  const tgt = t.warehouseSla ?? 98
  const min = 90
  const frac = (sla - min) / (100 - min)
  return (
    <>
      <Visual x={P} y={60} w={300} h={300} title="Warehouse SLA %" sub="Orders shipped within SLA window" loading={loading} agent="powerbi-kpi-warehouseSla">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <PieChart width={270} height={170}>
            <Pie data={[{ v: frac }, { v: 1 - frac }]} dataKey="v" startAngle={180} endAngle={0} cx={135} cy={140} innerRadius={78} outerRadius={118} stroke="none" animationDuration={ANIM}>
              <Cell fill={sla >= tgt ? THEME[0] : THEME[2]} />
              <Cell fill="#E6E6E6" />
            </Pie>
          </PieChart>
          <div className="-mt-[58px] text-[30px] font-semibold text-[#252423]" data-agent="powerbi-kpi-warehouseSla-value">{sla.toFixed(1)}%</div>
          <div className="flex justify-between w-[236px] text-[11px] text-[#605E5C] mt-1">
            <span>{min}%</span>
            <span className="font-semibold" style={{ color: sla >= tgt ? '#107C10' : '#D13438' }}>Target {tgt}%</span>
            <span>100%</span>
          </div>
          <div className="text-[11px] mt-3 text-[#605E5C]">
            Pick accuracy <b className="text-[#252423]">{avg('pickAccuracy').toFixed(1)}%</b> · Dock-to-stock <b className="text-[#252423]">{avg('dockToStockHrs').toFixed(1)} h</b>
          </div>
        </div>
      </Visual>
      <Visual x={324} y={60} w={940} h={300} title="Warehouse SLA % by distribution center" sub={`Target ${tgt}%`} loading={loading}>
        <BarChart width={916} height={248} data={R} margin={{ top: 18, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="dc" tick={AXIS} tickLine={false} axisLine={{ stroke: '#C8C6C4' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[94, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip />
          <ReferenceLine y={tgt} stroke="#D64550" strokeDasharray="4 3" label={{ value: `Target ${tgt}%`, fill: '#D64550', fontSize: 10, position: 'insideTopRight' }} />
          <Bar dataKey="sla" barSize={56} animationDuration={ANIM} onClick={cross ? (d: any) => cross.dc(d?.dc ?? d?.payload?.dc) : undefined} style={cross ? { cursor: 'pointer' } : undefined}>
            {R.map((r: any) => (
              <Cell key={r.dc} fill={r.sla >= tgt ? THEME[0] : THEME[2]} />
            ))}
            <LabelList dataKey="sla" position="top" formatter={(v: any) => `${v.toFixed(1)}%`} style={{ fontSize: 11, fill: '#252423' }} />
          </Bar>
        </BarChart>
      </Visual>
      <Visual x={P} y={368} w={760} h={336} title="Warehouse operations matrix" loading={loading}>
        <Matrix
          cols={[
            { key: 'dc', label: 'Distribution center' },
            { key: 'city', label: 'Location' },
            { key: 'sla', label: 'SLA %', align: 'right', fmt: (v) => `${v.toFixed(1)}%`, scale: { min: 95.5, max: 99.5 } },
            { key: 'pickAccuracy', label: 'Pick accuracy %', align: 'right', fmt: (v) => `${v.toFixed(1)}%`, icon: (v) => (v >= 99.5 ? 'good' : v >= 99 ? 'warn' : 'bad') },
            { key: 'dockToStockHrs', label: 'Dock-to-stock (h)', align: 'right', fmt: (v) => v.toFixed(1), scale: { min: 4.5, max: 8, reverse: true } },
            { key: 'backorders', label: 'Backorders', align: 'right', fmt: fmtN, bar: Math.max(...R.map((r: any) => r.backorders)) },
            { key: 'cycleDays', label: 'Cycle (d)', align: 'right', fmt: (v) => v.toFixed(1) },
          ]}
          rows={R}
          total={{ dc: 'Total', sla: k.warehouseSla, pickAccuracy: avg('pickAccuracy'), dockToStockHrs: avg('dockToStockHrs'), backorders: k.backorders, cycleDays: k.orderCycleTimeDays }}
          onRow={cross ? (r) => cross.dc(r.dc) : undefined}
          selected={cross ? (r) => cross.isDc(r.dc) : undefined}
        />
      </Visual>
      <Visual x={784} y={368} w={480} h={336} title="On-time delivery % trend" sub="Actual vs target" loading={loading}>
        <div className="absolute right-0 -top-7"><Legend items={[['On-time %', THEME[0]], ['Target', THEME[7]]]} /></div>
        <LineChart width={456} height={284} data={rec.weekly.map((w: any) => ({ ...w, target: t.onTimeDelivery }))} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: '#C8C6C4' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[90, 98]} tickFormatter={(v) => `${v}%`} />
          <Tooltip />
          <Line dataKey="onTime" name="On-time %" stroke={THEME[0]} strokeWidth={2.5} dot={{ r: 2.5 }} animationDuration={ANIM} />
          <Line dataKey="target" name="Target" stroke={THEME[7]} strokeWidth={1.5} strokeDasharray="5 4" dot={false} animationDuration={ANIM} />
        </LineChart>
      </Visual>
    </>
  )
}

function VendorSpend({ rec, k, p, t, loading }: PP) {
  const V = rec.vendors
  const total = V.reduce((a: number, v: any) => a + v.spend, 0)
  const prevTotal = V.reduce((a: number, v: any) => a + v.prevSpend, 0)
  const pos = V.reduce((a: number, v: any) => a + v.pos, 0)
  const vOt = V.reduce((a: number, v: any) => a + v.onTime * v.spend, 0) / total
  const cats: Record<string, number> = {}
  for (const v of V) cats[v.category] = (cats[v.category] ?? 0) + v.spend
  const last = rec.spendMonthly[rec.spendMonthly.length - 1]
  const c = cardsRow(5)
  return (
    <>
      <KpiCard {...c[0]} label="Vendor spend (MTD)" value={total / 1e6} prev={prevTotal / 1e6} fmt="mm" lowerBetter loading={loading} />
      <KpiCard {...c[1]} agent="powerbi-kpi-costPerOrder" label="Cost per order" value={k.costPerOrder} prev={p?.costPerOrder} target={t.costPerOrder} fmt="money" lowerBetter loading={loading} accent={THEME[1]} />
      <KpiCard {...c[2]} label="Purchase orders issued" value={pos} prev={pos - 14} fmt="int" loading={loading} />
      <KpiCard {...c[3]} label="Vendor on-time %" value={vOt} prev={vOt - 0.6} target={96} fmt="pct" loading={loading} accent={THEME[1]} />
      <KpiCard {...c[4]} label="Spend vs budget (Oct)" value={(last.spend / last.budget) * 100} prev={(rec.spendMonthly[10].spend / rec.spendMonthly[10].budget) * 100} target={100} fmt="pct" lowerBetter loading={loading} />
      <Visual x={P} y={164} w={620} h={268} title="Spend by vendor" sub="This month vs last month" loading={loading}>
        <div className="absolute right-0 -top-7"><Legend items={[['This month', THEME[0]], ['Last month', THEME[1]]]} /></div>
        <BarChart layout="vertical" width={596} height={220} data={V.slice(0, 7)} margin={{ top: 6, right: 30, left: 30, bottom: 0 }} barGap={1}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}K`} />
          <YAxis type="category" dataKey="vendor" tick={{ ...AXIS, fontSize: 10.5 }} tickLine={false} axisLine={false} width={120} />
          <Tooltip formatter={(v: any) => `$${fmtN(v)}`} />
          <Bar dataKey="spend" name="This month" fill={THEME[0]} barSize={10} animationDuration={ANIM} />
          <Bar dataKey="prevSpend" name="Last month" fill={THEME[1]} barSize={10} animationDuration={ANIM} />
        </BarChart>
      </Visual>
      <Visual x={644} y={164} w={300} h={268} title="Spend by category" loading={loading}>
        <Donut data={Object.entries(cats).map(([name, v]) => ({ name, v }))} w={276} h={218} money />
      </Visual>
      <Visual x={952} y={164} w={312} h={268} title="Monthly spend vs budget ($M)" loading={loading}>
        <div className="absolute right-0 -top-7"><Legend items={[['Spend', THEME[0]], ['Budget', THEME[6]]]} /></div>
        <LineChart width={288} height={218} data={rec.spendMonthly} margin={{ top: 12, right: 6, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="month" tick={{ ...AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#C8C6C4' }} interval={1} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[1, 1.6]} />
          <Line dataKey="spend" stroke={THEME[0]} strokeWidth={2.5} dot={false} animationDuration={ANIM} />
          <Line dataKey="budget" stroke={THEME[6]} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={ANIM} />
        </LineChart>
      </Visual>
      <Visual x={P} y={440} w={1248} h={264} title="Vendor detail" loading={loading}>
        <Matrix
          cols={[
            { key: 'vendor', label: 'Vendor' },
            { key: 'category', label: 'Category' },
            { key: 'spend', label: 'Spend (MTD)', align: 'right', fmt: (v) => `$${fmtN(v)}`, bar: V[0].spend },
            { key: 'prevSpend', label: 'Last month', align: 'right', fmt: (v) => `$${fmtN(v)}` },
            { key: 'mom', label: 'MoM %', align: 'right', fmt: (_, r) => `${(((r.spend - r.prevSpend) / r.prevSpend) * 100).toFixed(1)}%` },
            { key: 'pos', label: 'POs', align: 'right' },
            { key: 'onTime', label: 'Vendor on-time %', align: 'right', fmt: (v) => `${v.toFixed(1)}%`, scale: { min: 88, max: 100 } },
            { key: 'onTime', label: 'Risk', fmt: (v) => (v >= 96 ? 'Low' : v >= 92 ? 'Medium' : 'High'), icon: (v) => (v >= 96 ? 'good' : v >= 92 ? 'warn' : 'bad') },
          ]}
          rows={V}
          total={{ vendor: 'Total', spend: total, prevSpend: prevTotal, pos }}
        />
      </Visual>
    </>
  )
}

export function Donut({ data, w, h, money }: { data: { name: string; v: number }[]; w: number; h: number; money?: boolean }) {
  const sum = data.reduce((a, d) => a + d.v, 0)
  return (
    <div className="flex items-center" style={{ width: w, height: h }}>
      <PieChart width={Math.min(150, w * 0.52)} height={h}>
        <Pie data={data} dataKey="v" innerRadius={38} outerRadius={64} paddingAngle={0} stroke="#fff" strokeWidth={1} animationDuration={ANIM}>
          {data.map((_, i) => (
            <Cell key={i} fill={THEME[i % THEME.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-[11px]">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: THEME[i % THEME.length] }} />
            <span className="truncate text-[#605E5C] flex-1">{d.name}</span>
            <span className="text-[#252423] tabular-nums">{money ? `$${Math.round(d.v / 1000)}K` : `${((d.v / sum) * 100).toFixed(1)}%`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────── generic report ──────────────────────────────── */

export function GenericPage({ rec, loading }: { rec: any; loading: boolean }) {
  const g = rec.generic
  const c = cardsRow(g.cards.length)
  const sub = `Data as of ${new Date(rec.lastRefreshed).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  return (
    <>
      <Header rec={rec} subtitle={sub} />
      {g.cards.map((cd: any, i: number) => (
        <KpiCard key={cd.label} {...c[i]} label={cd.label} value={cd.value} prev={cd.prev} target={cd.target} fmt={cd.fmt} lowerBetter={cd.lowerBetter} loading={loading} accent={THEME[i % 2]} />
      ))}
      <Visual x={P} y={164} w={620} h={268} title={g.line.title} loading={loading}>
        <div className="absolute right-0 -top-7"><Legend items={[[g.line.a, THEME[0]], [g.line.b, THEME[1]]]} /></div>
        <LineChart width={596} height={218} data={g.line.data} margin={{ top: 12, right: 8, left: -6, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: '#C8C6C4' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => (v >= 1000 ? kfmt(v) : String(v))} />
          <Tooltip />
          <Line dataKey="a" name={g.line.a} stroke={THEME[0]} strokeWidth={2.5} dot={false} animationDuration={ANIM} />
          <Line dataKey="b" name={g.line.b} stroke={THEME[1]} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={ANIM} />
        </LineChart>
      </Visual>
      <Visual x={644} y={164} w={620} h={268} title={g.bars.title} loading={loading}>
        <BarChart width={596} height={218} data={g.bars.data} margin={{ top: 18, right: 4, left: -6, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} tickLine={false} interval={0} axisLine={{ stroke: '#C8C6C4' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Bar dataKey="v" fill={THEME[0]} animationDuration={ANIM}>
            <LabelList dataKey="v" position="top" formatter={(v: any) => (v >= 1000 ? fmtN(v) : v)} style={{ fontSize: 10, fill: '#605E5C' }} />
          </Bar>
        </BarChart>
      </Visual>
      <Visual x={P} y={440} w={420} h={264} title={g.donut.title} loading={loading}>
        <Donut data={g.donut.data} w={396} h={214} />
      </Visual>
      <Visual x={444} y={440} w={820} h={264} title={g.table.title} loading={loading}>
        <Matrix cols={g.table.cols.map((l: string, i: number) => ({ key: String(i), label: l, align: i ? 'right' : 'left' }))} rows={g.table.rows.map((r: string[]) => Object.fromEntries(r.map((v, i) => [String(i), v])))} />
      </Visual>
    </>
  )
}

export { fmtVal }
