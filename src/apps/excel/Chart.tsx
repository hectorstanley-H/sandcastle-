import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { logoUrl } from '@/os/registry'
import type { Chart, Sheet } from './seed'
import { Evaluator, parseRange, refName, formatValue, type Val } from './formula'

export const CHART_COLORS = ['#156082', '#E97132', '#196B24', '#0F9ED5', '#A02B93', '#4EA72E']

const compact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`
  return String(Math.round(n * 100) / 100)
}

function WrapTick(props: any) {
  const { x, y, payload } = props
  const words = String(payload?.value ?? '').split(' ')
  const lines: string[] = []
  for (const w of words) {
    const last = lines[lines.length - 1]
    if (last !== undefined && (last + ' ' + w).length <= 13) lines[lines.length - 1] = last + ' ' + w
    else lines.push(w)
  }
  return (
    <text x={x} y={y + 12} textAnchor="middle" fontSize={10.5} fill="#595959">
      {lines.slice(0, 2).map((l, i) => (
        <tspan key={i} x={x} dy={i ? 12 : 0}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

export function chartData(sheet: Sheet, si: number, ev: Evaluator, range: string) {
  const rg = parseRange(range)
  if (!rg) return { rows: [], series: [] as string[] }
  const series: string[] = []
  for (let c = rg.c1 + 1; c <= rg.c2; c++) series.push(String(formatValue(ev.value(si, c, rg.r1)) || `Series${c - rg.c1}`))
  const rows: Record<string, any>[] = []
  for (let r = rg.r1 + 1; r <= rg.r2; r++) {
    const name = formatValue(ev.value(si, rg.c1, r))
    if (!name || /^total/i.test(name)) continue
    const row: Record<string, any> = { name }
    series.forEach((s, i) => {
      const v: Val = ev.value(si, rg.c1 + 1 + i, r)
      row[s] = typeof v === 'number' ? v : 0
    })
    rows.push(row)
  }
  void refName
  return { rows, series }
}

export function ChartObject({
  chart,
  sheet,
  si,
  ev,
  left,
  top,
  selected,
  onSelect,
  onTitle,
  fresh,
}: {
  chart: Chart
  sheet: Sheet
  si: number
  ev: Evaluator
  left: number
  top: number
  selected: boolean
  onSelect: () => void
  onTitle: (t: string) => void
  fresh: boolean
}) {
  const { rows, series } = chartData(sheet, si, ev, chart.range)
  return (
    <div
      data-agent={`excel-chart-${chart.id}`}
      onMouseDown={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={`absolute bg-white ${selected ? 'outline outline-[1.5px] outline-[#7F7F7F]' : 'border border-[#D9D9D9]'} ${fresh ? 'flash-new' : ''}`}
      style={{ left, top, width: chart.w, height: chart.h, zIndex: 6 }}
    >
      {selected &&
        [
          [0, 0],
          [50, 0],
          [100, 0],
          [0, 50],
          [100, 50],
          [0, 100],
          [50, 100],
          [100, 100],
        ].map(([x, y], i) => (
          <span key={i} className="absolute w-[7px] h-[7px] bg-white border border-[#7F7F7F] rounded-full" style={{ left: `calc(${x}% - 4px)`, top: `calc(${y}% - 4px)` }} />
        ))}
      <input
        data-agent={`excel-chart-title-${chart.id}`}
        aria-label="Chart Title"
        value={chart.title}
        onChange={(e) => onTitle(e.target.value)}
        className="block w-full text-center bg-transparent outline-none text-[15px] text-[#595959] mt-2"
        style={{ fontFamily: 'Aptos Narrow, Calibri, var(--font-win)' }}
      />
      <div className="absolute left-2 right-3 top-9 bottom-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 6, left: 4, bottom: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="#D9D9D9" />
            <XAxis dataKey="name" tick={<WrapTick />} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} interval={0} height={34} />
            <YAxis tick={{ fontSize: 10.5, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
            <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString('en-US')}`} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#595959' }} />
            {series.map((s, i) => (
              <Bar key={s} dataKey={s} fill={CHART_COLORS[i % CHART_COLORS.length]} isAnimationActive={fresh} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {chart.createdBy === 'hworker' && (
        <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 h-[18px] px-1.5 rounded-sm bg-[#430693] text-white text-[10px] font-semibold">
          <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" /> H-Worker
        </span>
      )}
    </div>
  )
}
