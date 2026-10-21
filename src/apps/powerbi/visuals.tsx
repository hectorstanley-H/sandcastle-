import type { ReactNode } from 'react'
import { MoreHorizontal16Regular, Filter12Regular, ArrowExpand16Regular, Pin16Regular } from '@fluentui/react-icons'
import { THEME, fmtN } from './shared'

export const AXIS = { fontSize: 11, fill: '#605E5C', fontFamily: 'Segoe UI, sans-serif' }
export const GRID = '#E9E9E9'

/** A visual container positioned on the 1280x720 page. */
export function Visual({
  x,
  y,
  w,
  h,
  title,
  sub,
  loading,
  children,
  agent,
  bare,
}: {
  x: number
  y: number
  w: number
  h: number
  title?: string
  sub?: string
  loading?: boolean
  children: ReactNode
  agent?: string
  bare?: boolean
}) {
  return (
    <div
      data-agent={agent}
      className={`absolute group ${bare ? '' : 'bg-white rounded-[6px] shadow-[0_0_0_1px_#E6E6E6]'}`}
      style={{ left: x, top: y, width: w, height: h }}
    >
      {!bare && (
        <div className="absolute -top-[22px] right-0 hidden group-hover:flex items-center gap-0.5 bg-white rounded-t px-1 h-[22px] text-[#605E5C] shadow-[0_-1px_2px_rgba(0,0,0,0.08)] z-10">
          <Pin16Regular className="w-3.5 h-3.5" />
          <Filter12Regular />
          <ArrowExpand16Regular className="w-3.5 h-3.5" />
          <MoreHorizontal16Regular />
        </div>
      )}
      <div className={`w-full h-full flex flex-col ${bare ? '' : 'px-3 pt-2 pb-1.5'} transition-opacity ${loading ? 'opacity-30' : ''}`}>
        {title && (
          <div className="shrink-0 leading-tight">
            <div className="text-[14px] font-semibold text-[#252423] truncate">{title}</div>
            {sub && <div className="text-[11px] text-[#605E5C] truncate">{sub}</div>}
          </div>
        )}
        <div className="flex-1 min-h-0 relative">{children}</div>
      </div>
      {loading && <LoadingDots />}
    </div>
  )
}

export function LoadingDots() {
  return (
    <div className="absolute inset-0 flex items-start justify-start p-2 pointer-events-none" data-agent="powerbi-visual-loading">
      <div className="flex gap-1 mt-0.5 ml-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#118DFF] animate-bounce" style={{ animationDelay: `${i * 110}ms`, animationDuration: '0.9s' }} />
        ))}
      </div>
    </div>
  )
}

export type Fmt = 'pct' | 'int' | 'dec' | 'money' | 'mm' | 'days'
export function fmtVal(v: number, f: Fmt) {
  if (f === 'pct') return `${v.toFixed(1)}%`
  if (f === 'int') return fmtN(Math.round(v))
  if (f === 'dec') return v.toFixed(1)
  if (f === 'days') return `${v.toFixed(1)} d`
  if (f === 'money') return `$${v.toFixed(2)}`
  if (f === 'mm') return v >= 1 ? `$${v.toFixed(2)}M` : `$${Math.round(v * 1000)}K`
  return String(v)
}

/** Power BI "new card" style KPI with target + delta vs last week */
export function KpiCard({
  label,
  value,
  prev,
  target,
  fmt,
  lowerBetter,
  loading,
  agent,
  x,
  y,
  w,
  h,
  accent = THEME[0],
}: {
  label: string
  value: number
  prev?: number
  target?: number
  fmt: Fmt
  lowerBetter?: boolean
  loading?: boolean
  agent?: string
  x: number
  y: number
  w: number
  h: number
  accent?: string
}) {
  const delta = prev !== undefined ? value - prev : 0
  const good = lowerBetter ? delta <= 0 : delta >= 0
  const onTarget = target === undefined ? undefined : lowerBetter ? value <= target : value >= target
  const deltaTxt =
    prev === undefined
      ? ''
      : fmt === 'pct'
        ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts`
        : fmt === 'int'
          ? `${delta >= 0 ? '+' : ''}${((delta / prev) * 100).toFixed(1)}%`
          : fmt === 'money'
            ? `${delta >= 0 ? '+' : '-'}$${Math.abs(delta).toFixed(2)}`
            : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`
  return (
    <Visual x={x} y={y} w={w} h={h} loading={loading} agent={agent} bare>
      <div className="w-full h-full bg-white rounded-[6px] shadow-[0_0_0_1px_#E6E6E6] overflow-hidden flex">
        <div className="w-[4px] shrink-0" style={{ background: accent }} />
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col">
          <div className="text-[12px] text-[#605E5C] truncate">{label}</div>
          <div className="text-[27px] leading-[34px] font-semibold text-[#252423] tracking-[-0.3px]" data-agent={agent ? `${agent}-value` : undefined}>
            {fmtVal(value, fmt)}
          </div>
          <div className="mt-auto flex items-center gap-1.5 text-[11px] whitespace-nowrap">
            {prev !== undefined && (
              <span className="font-semibold flex items-center gap-0.5" style={{ color: good ? '#107C10' : '#D13438' }}>
                {delta >= 0 ? '▲' : '▼'} {deltaTxt}
              </span>
            )}
            {prev !== undefined && <span className="text-[#605E5C]">vs LW</span>}
          </div>
          {target !== undefined && (
            <div className="text-[11px] text-[#605E5C] flex items-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: onTarget ? '#107C10' : '#D13438' }} />
              Target {fmtVal(target, fmt)}
            </div>
          )}
        </div>
      </div>
    </Visual>
  )
}

/* ─────────────── map ─────────────── */

const US: [number, number][] = [
  [-124.7, 48.4], [-123.3, 49], [-95.2, 49], [-95.2, 49.4], [-94.8, 48.7], [-91, 48.2], [-89.5, 48], [-84.5, 46.5], [-82.5, 45.3], [-83, 42], [-79, 43.3], [-76.8, 43.6], [-75, 45],
  [-71.5, 45], [-70, 46.7], [-69.2, 47.4], [-67.8, 47.1], [-67, 45], [-70.2, 43.6], [-70.8, 42.6], [-70, 41.8], [-71.9, 41.3], [-74, 40.6], [-74, 39.4], [-75.5, 38.5],
  [-76, 37], [-75.5, 35.2], [-77.5, 34.4], [-79, 33.5], [-81, 31.9], [-81.4, 30.3], [-80, 26.8], [-80.4, 25.2], [-81.2, 25.4], [-82.6, 27.8], [-82.8, 29.2], [-84, 30], [-85.4, 29.7],
  [-87.5, 30.3], [-89.5, 30.2], [-89.3, 29.1], [-91.3, 29.3], [-93.8, 29.7], [-95, 29.2], [-97.2, 27.6], [-97.2, 25.9], [-99.1, 26.4], [-101.4, 29.8], [-103, 29], [-104.6, 29.6],
  [-106.5, 31.8], [-108.2, 31.8], [-111.1, 31.3], [-114.8, 32.5], [-117.1, 32.5], [-118.5, 34], [-120.6, 34.5], [-121.9, 36.6], [-122.5, 37.8], [-123.8, 39.7], [-124.4, 40.4],
  [-124.2, 42], [-124.5, 43.5], [-123.9, 46.2], [-124.7, 48.4],
]
const CANADA: [number, number][] = [
  [-131, 52], [-127, 50.5], [-124.7, 48.4], [-123.3, 49], [-95.2, 49], [-95.2, 49.4], [-94.8, 48.7], [-91, 48.2], [-89.5, 48], [-84.5, 46.5], [-82.5, 45.3], [-83, 42], [-79, 43.3],
  [-76.8, 43.6], [-75, 45], [-71.5, 45], [-70, 46.7], [-69.2, 47.4], [-67.8, 47.1], [-67, 45], [-64.5, 45.3], [-61, 45.6], [-60, 46.5], [-64, 48.8], [-62, 50], [-56, 52], [-56, 54], [-131, 54],
]
const MEXICO: [number, number][] = [
  [-117.1, 32.5], [-114.8, 32.5], [-111.1, 31.3], [-108.2, 31.8], [-106.5, 31.8], [-104.6, 29.6], [-103, 29], [-101.4, 29.8], [-99.1, 26.4], [-97.2, 25.9], [-97.6, 22], [-112, 22],
  [-112.5, 27], [-114.8, 31.2], [-114.2, 27.5], [-110.2, 23.2], [-109.4, 22.8], [-112.2, 26.6], [-115.8, 29.9],
]
const proj = (lon: number, lat: number): [number, number] => [(lon + 126) * 7.9, (50.5 - lat) * 10]
const path = (pts: [number, number][]) => 'M' + pts.map(([a, b]) => proj(a, b).map((n) => n.toFixed(1)).join(' ')).join(' L') + ' Z'
const LAKES: [number, number][][] = [
  [[-92, 46.7], [-89, 47.9], [-85, 47.2], [-84.6, 46.5], [-87, 46.4], [-90.6, 46.6]],
  [[-87.8, 42], [-87.5, 45.5], [-86.2, 45.9], [-85.6, 44.8], [-86.4, 42.5]],
  [[-83.5, 41.6], [-79, 42.9], [-80.2, 42.6], [-82.5, 42.0]],
]

export function BubbleMap({ data, target, loading }: { data: { dc: string; region: string; lat: number; lon: number; orders: number; onTime: number }[]; target: number; loading?: boolean }) {
  const max = Math.max(...data.map((d) => d.orders))
  return (
    <div className="absolute inset-0 rounded-[3px] overflow-hidden">
      <svg viewBox="0 -5 480 275" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <rect x="0" y="0" width="520" height="320" fill="#C3DAEE" />
        <path d={path(CANADA)} fill="#EFEDE8" stroke="#D2D0CB" strokeWidth="0.6" />
        <path d={path(MEXICO)} fill="#EFEDE8" stroke="#D2D0CB" strokeWidth="0.6" />
        <path d={path(US)} fill="#FAF9F7" stroke="#BDBBB6" strokeWidth="0.8" />
        {LAKES.map((l, i) => (
          <path key={i} d={path(l)} fill="#C3DAEE" />
        ))}
        {/* faux state lines */}
        {[-111, -104, -97, -90, -82].map((lon) => (
          <path key={lon} d={`M${proj(lon, 49)[0]} ${proj(lon, 49)[1]} L${proj(lon, 31)[0]} ${proj(lon, 31)[1]}`} stroke="#E4E2DE" strokeWidth="0.6" strokeDasharray="3 2" />
        ))}
        {[45, 41, 37, 33].map((lat) => (
          <path key={lat} d={`M${proj(-120, lat)[0]} ${proj(-120, lat)[1]} L${proj(-76, lat)[0]} ${proj(-76, lat)[1]}`} stroke="#E4E2DE" strokeWidth="0.6" strokeDasharray="3 2" />
        ))}
        {!loading &&
          data.map((d) => {
            const [cx, cy] = proj(d.lon, d.lat)
            const r = 7 + Math.sqrt(d.orders / max) * 16
            const ok = d.onTime >= target
            return (
              <g key={d.dc}>
                <circle cx={cx} cy={cy} r={r} fill={ok ? '#118DFF' : '#E66C37'} fillOpacity="0.72" stroke="#fff" strokeWidth="1.2" />
                <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#fff" fontFamily="Segoe UI">
                  {d.onTime.toFixed(1)}%
                </text>
                <text x={cx} y={cy + r + 10} textAnchor="middle" fontSize="8.5" fill="#323130" fontFamily="Segoe UI" stroke="#FAF9F7" strokeWidth="2.5" paintOrder="stroke">
                  {d.dc.replace(/^DC-0\d /, '')}
                </text>
              </g>
            )
          })}
      </svg>
      <div className="absolute left-1.5 bottom-1 text-[9px] font-semibold text-[#605E5C] flex items-center gap-1">
        <span className="grid grid-cols-2 gap-[1px]">
          <span className="w-[4px] h-[4px] bg-[#F25022]" />
          <span className="w-[4px] h-[4px] bg-[#7FBA00]" />
          <span className="w-[4px] h-[4px] bg-[#00A4EF]" />
          <span className="w-[4px] h-[4px] bg-[#FFB900]" />
        </span>
        Microsoft Azure
      </div>
      <div className="absolute right-1.5 bottom-1 text-[8.5px] text-[#605E5C] bg-white/70 px-1">© 2026 TomTom, © 2026 Microsoft Corporation</div>
      <div className="absolute right-1.5 top-1.5 flex flex-col bg-white rounded shadow text-[#323130] text-[12px] leading-none">
        <span className="w-5 h-5 flex items-center justify-center border-b border-[#EDEBE9]">+</span>
        <span className="w-5 h-5 flex items-center justify-center">−</span>
      </div>
      <div className="absolute left-1.5 top-1.5 bg-white/85 rounded px-1.5 py-1 text-[10px] text-[#323130] flex items-center gap-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#118DFF]" />At/above target</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E66C37]" />Below target</span>
      </div>
    </div>
  )
}

/* ─────────────── table / matrix ─────────────── */

export interface Col {
  key: string
  label: string
  align?: 'left' | 'right'
  fmt?: (v: any, row: any) => string
  /** conditional formatting */
  scale?: { min: number; max: number; reverse?: boolean }
  bar?: number
  icon?: (v: any, row: any) => 'good' | 'warn' | 'bad'
}

function scaleColor(v: number, s: { min: number; max: number; reverse?: boolean }) {
  let t = Math.max(0, Math.min(1, (v - s.min) / (s.max - s.min)))
  if (s.reverse) t = 1 - t
  // red (#F8696B) → yellow (#FFEB84) → green (#63BE7B), Excel-like 3-colour scale, softened
  const lerp = (a: number[], b: number[], k: number) => a.map((x, i) => Math.round(x + (b[i] - x) * k))
  const c = t < 0.5 ? lerp([248, 105, 107], [255, 235, 132], t * 2) : lerp([255, 235, 132], [99, 190, 123], (t - 0.5) * 2)
  return `rgba(${c[0]},${c[1]},${c[2]},0.55)`
}

export function Matrix({ cols, rows, total }: { cols: Col[]; rows: any[]; total?: any }) {
  return (
    <div className="absolute inset-0 overflow-auto">
      <table className="w-full text-[11.5px] border-collapse" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <thead className="sticky top-0 bg-white">
          <tr className="border-b-2 border-[#252423]">
            {cols.map((c) => (
              <th key={c.key} className={`py-1 px-1.5 font-semibold text-[#252423] whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-[#EDEBE9] ${i % 2 ? 'bg-[#FAFAFA]' : ''}`}>
              {cols.map((c) => (
                <Cell key={c.key} c={c} r={r} />
              ))}
            </tr>
          ))}
          {total && (
            <tr className="border-t-2 border-[#252423] font-semibold">
              {cols.map((c) => (
                <td key={c.key} className={`py-1 px-1.5 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`}>
                  {total[c.key] === undefined ? '' : c.fmt ? c.fmt(total[c.key], total) : total[c.key]}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ c, r }: { c: Col; r: any }) {
  const v = r[c.key]
  const txt = c.fmt ? c.fmt(v, r) : v
  const style: any = {}
  if (c.scale && typeof v === 'number') style.background = scaleColor(v, c.scale)
  const ic = c.icon?.(v, r)
  return (
    <td className={`py-[5px] px-1.5 whitespace-nowrap text-[#252423] ${c.align === 'right' ? 'text-right' : ''}`} style={style}>
      {c.bar ? (
        <div className="relative flex justify-end">
          <div className="absolute left-0 top-0 bottom-0 bg-[#118DFF]/30" style={{ width: `${Math.min(100, (v / c.bar) * 100)}%` }} />
          <span className="relative">{txt}</span>
        </div>
      ) : (
        <span className="inline-flex items-center gap-1">
          {ic && <span className="w-2 h-2 rounded-full" style={{ background: ic === 'good' ? '#107C10' : ic === 'warn' ? '#D9B300' : '#D13438' }} />}
          {txt}
        </span>
      )}
    </td>
  )
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-[#605E5C] flex-wrap">
      {items.map(([l, c]) => (
        <span key={l} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  )
}
