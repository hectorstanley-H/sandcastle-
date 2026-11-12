import { useRef } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { DataBarVertical20Regular, DataBarHorizontal20Regular, DataLine20Regular, DataArea20Regular, DataPie20Regular, Delete20Regular } from '@fluentui/react-icons'
import { logoUrl } from '@/os/registry'
import type { Chart, Sheet } from './seed'
import type { ChartType } from './types'
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
  colors = CHART_COLORS,
  onType,
  onDelete,
  onMove,
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
  colors?: string[]
  onType?: (t: ChartType) => void
  onDelete?: () => void
  /** drag finished: pixel offset from the original position */
  onMove?: (dx: number, dy: number) => void
}) {
  const { rows, series } = chartData(sheet, si, ev, chart.range)
  const type = ((chart as any).type ?? 'column') as ChartType
  const drag = useRef<{ x: number; y: number; el: HTMLElement } | null>(null)
  const money = rows.some((r) => series.some((s) => Math.abs(r[s]) >= 1000))
  const tip = (v: any) => (money ? `$${Number(v).toLocaleString('en-US')}` : Number(v).toLocaleString('en-US'))
  return (
    <div
      data-agent={`excel-chart-${chart.id}`}
      onMouseDown={(e) => {
        e.stopPropagation()
        onSelect()
        const t = e.target as HTMLElement
        if (!onMove || t.tagName === 'INPUT' || t.closest('[data-chart-tools]')) return
        const el = e.currentTarget as HTMLElement
        drag.current = { x: e.clientX, y: e.clientY, el }
        const mv = (ev: MouseEvent) => {
          if (!drag.current) return
          el.style.transform = `translate(${ev.clientX - drag.current.x}px, ${ev.clientY - drag.current.y}px)`
        }
        const up = (ev: MouseEvent) => {
          window.removeEventListener('mousemove', mv)
          window.removeEventListener('mouseup', up)
          const d = drag.current
          drag.current = null
          el.style.transform = ''
          if (d && (Math.abs(ev.clientX - d.x) > 4 || Math.abs(ev.clientY - d.y) > 4)) onMove(ev.clientX - d.x, ev.clientY - d.y)
        }
        window.addEventListener('mousemove', mv)
        window.addEventListener('mouseup', up)
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
          {type === 'pie' ? (
            <PieChart>
              <Tooltip formatter={tip} />
              <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#595959' }} />
              <Pie data={rows} dataKey={series[0] ?? 'value'} nameKey="name" outerRadius="78%" isAnimationActive={fresh} label={{ fontSize: 10.5, fill: '#595959' }}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : type === 'line' ? (
            <LineChart data={rows} margin={{ top: 6, right: 10, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#D9D9D9" />
              <XAxis dataKey="name" tick={<WrapTick />} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} interval={0} height={34} />
              <YAxis tick={{ fontSize: 10.5, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
              <Tooltip formatter={tip} />
              <Legend iconType="plainline" iconSize={12} wrapperStyle={{ fontSize: 11, color: '#595959' }} />
              {series.map((s, i) => (
                <Line key={s} dataKey={s} stroke={colors[i % colors.length]} strokeWidth={2.25} dot={{ r: 2.5 }} isAnimationActive={fresh} />
              ))}
            </LineChart>
          ) : type === 'area' ? (
            <AreaChart data={rows} margin={{ top: 6, right: 10, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#D9D9D9" />
              <XAxis dataKey="name" tick={<WrapTick />} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} interval={0} height={34} />
              <YAxis tick={{ fontSize: 10.5, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
              <Tooltip formatter={tip} />
              <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#595959' }} />
              {series.map((s, i) => (
                <Area key={s} dataKey={s} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.35} isAnimationActive={fresh} />
              ))}
            </AreaChart>
          ) : type === 'bar' ? (
            <BarChart layout="vertical" data={rows} margin={{ top: 6, right: 10, left: 4, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid horizontal={false} stroke="#D9D9D9" />
              <XAxis type="number" tick={{ fontSize: 10.5, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5, fill: '#595959' }} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} width={110} />
              <Tooltip formatter={tip} />
              <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#595959' }} />
              {series.map((s, i) => (
                <Bar key={s} dataKey={s} fill={colors[i % colors.length]} isAnimationActive={fresh} />
              ))}
            </BarChart>
          ) : (
            <BarChart data={rows} margin={{ top: 6, right: 6, left: 4, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="#D9D9D9" />
              <XAxis dataKey="name" tick={<WrapTick />} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} interval={0} height={34} />
              <YAxis tick={{ fontSize: 10.5, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
              <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString('en-US')}`} />
              <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, color: '#595959' }} />
              {series.map((s, i) => (
                <Bar key={s} dataKey={s} fill={colors[i % colors.length]} isAnimationActive={fresh} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {selected && (onType || onDelete) && (
        <div data-chart-tools className="absolute -right-[38px] top-0 flex flex-col gap-0.5 bg-white rounded-md border border-[#D1D1D1] shadow-[0_2px_8px_rgba(0,0,0,0.14)] p-0.5" onMouseDown={(e) => e.stopPropagation()}>
          {(
            [
              ['column', DataBarVertical20Regular, 'Clustered Column'],
              ['bar', DataBarHorizontal20Regular, 'Clustered Bar'],
              ['line', DataLine20Regular, 'Line'],
              ['area', DataArea20Regular, 'Area'],
              ['pie', DataPie20Regular, 'Pie'],
            ] as [ChartType, any, string][]
          ).map(([t, I, l]) => (
            <button key={t} title={`Change chart type: ${l}`} aria-label={`Change chart type: ${l}`} onClick={() => onType?.(t)} className={`w-7 h-7 rounded flex items-center justify-center ${type === t ? 'bg-[#D3F0E0] text-[#0E5C2F]' : 'text-[#424242] hover:bg-[#F0F0F0]'}`}>
              <I className="w-4 h-4" />
            </button>
          ))}
          <span className="h-px bg-[#E1E1E1] mx-1" />
          <button title="Delete chart" aria-label="Delete chart" onClick={onDelete} className="w-7 h-7 rounded flex items-center justify-center text-[#C42B1C] hover:bg-[#FDE7E9]">
            <Delete20Regular className="w-4 h-4" />
          </button>
        </div>
      )}
      {chart.createdBy === 'hworker' && (
        <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 h-[18px] px-1.5 rounded-sm bg-[#430693] text-white text-[10px] font-semibold">
          <img src={logoUrl('hworker')} className="w-3 h-3 rounded-sm" alt="" /> H-Worker
        </span>
      )}
    </div>
  )
}
