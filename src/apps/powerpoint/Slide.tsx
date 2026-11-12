import { memo, useRef } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis } from 'recharts'

export interface TextFmt {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
  size?: number
  font?: string
  align?: 'left' | 'center' | 'right' | 'justify'
  list?: 'bullet' | 'number' | 'none'
  lineSpacing?: number
}

export interface Shape {
  id: string
  kind: 'rect' | 'roundRect' | 'ellipse' | 'triangle' | 'arrow' | 'text' | 'star'
  x: number
  y: number
  w: number
  h: number
  fill?: string
  line?: string
  text?: string
  color?: string
  size?: number
}

export interface Slide {
  id: string
  layout: 'title' | 'titleContent' | 'section' | 'twoContent' | 'chart' | 'kpis' | 'closing'
  title: string
  subtitle?: string
  bullets: string[]
  bullets2?: string[]
  headings?: string[]
  notes?: string
  chart?: { type: 'bar' | 'line' | 'pie'; data: { name: string; value: number; value2?: number }[]; series?: string[] }
  kpis?: { label: string; value: string; delta?: string }[]
  createdBy?: string
  createdAt?: string
  /* optional extras */
  fmt?: { title?: TextFmt; body?: TextFmt; subtitle?: TextFmt }
  shapes?: Shape[]
  bg?: string
  hidden?: boolean
  transition?: string
  animation?: string
  section?: string
  comments?: { id: string; author: string; text: string; at: string; resolved?: boolean }[]
}

export const SW = 960
export const SH = 540

export interface Theme {
  name: string
  navy: string
  accent: string
  teal: string
  font: string
  light?: string
}
export const THEMES: Record<string, Theme> = {
  northwind: { name: 'Northwind', navy: '#14213D', accent: '#E97132', teal: '#156082', font: "'Aptos', 'Segoe UI Variable Display', 'Segoe UI', var(--font-win)" },
  office: { name: 'Office Theme', navy: '#0E2841', accent: '#E97132', teal: '#0F9ED5', font: "'Aptos', 'Segoe UI', var(--font-win)" },
  facet: { name: 'Facet', navy: '#1E5E3A', accent: '#90C226', teal: '#549E39', font: "'Trebuchet MS', 'Segoe UI', sans-serif" },
  ion: { name: 'Ion', navy: '#1B2A4A', accent: '#0FA0CE', teal: '#B01513', font: "'Century Gothic', 'Segoe UI', sans-serif" },
  madison: { name: 'Madison', navy: '#3B1F47', accent: '#D97706', teal: '#7C3AED', font: "Georgia, 'Times New Roman', serif" },
}

const compact = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n))

export interface Edit {
  onTitle?: (v: string) => void
  onSubtitle?: (v: string) => void
  onBullets?: (v: string[]) => void
  onFocusBox?: (box: 'title' | 'subtitle' | 'body') => void
  /* shapes */
  selected?: string | null
  onSelectShape?: (id: string | null) => void
  onShape?: (id: string, patch: Partial<Shape>) => void
  /** current on-screen scale of the slide (for dragging) */
  scale?: number
}

const fmtStyle = (f?: TextFmt): React.CSSProperties =>
  f
    ? {
        fontWeight: f.bold ? 700 : undefined,
        fontStyle: f.italic ? 'italic' : undefined,
        textDecoration: [f.underline && 'underline', f.strike && 'line-through'].filter(Boolean).join(' ') || undefined,
        color: f.color,
        fontFamily: f.font ? `'${f.font}', var(--font-win)` : undefined,
        textAlign: f.align,
      }
    : {}

/** A text block that is a real textarea when editable, overlaid on the rendered text so it looks like PowerPoint. */
function EditText({ value, onChange, agent, className, style, placeholder, label, onFocus }: { value: string; onChange?: (v: string) => void; agent: string; className?: string; style?: React.CSSProperties; placeholder: string; label: string; onFocus?: () => void }) {
  if (!onChange) return <div className={className} style={{ ...style, whiteSpace: 'pre-wrap' }}>{value}</div>
  return (
    <textarea
      data-agent={agent}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      className={`${className} block w-full resize-none bg-transparent outline-none overflow-hidden hover:outline-dashed hover:outline-1 hover:outline-[#A0A0A0] focus:outline-dashed focus:outline-1 focus:outline-[#7A7A7A] placeholder:text-[#9E9E9E]`}
      style={style}
      rows={1}
    />
  )
}

function Bullets({
  items,
  onChange,
  agent = 'ppt-slide-bullets',
  size = 22,
  color = '#262626',
  bulletColor,
  height,
  fmt,
  onFocus,
  font,
  build,
}: {
  items: string[]
  onChange?: (v: string[]) => void
  agent?: string
  size?: number
  color?: string
  bulletColor: string
  height: number
  fmt?: TextFmt
  onFocus?: () => void
  font: string
  /** slide-show animation: number of bullets revealed so far */
  build?: { shown: number; effect: string }
}) {
  const sz = fmt?.size ?? size
  const lh = sz * (fmt?.lineSpacing ?? 1.55)
  const text = items.join('\n')
  const list = fmt?.list ?? 'bullet'
  const pad = list === 'none' ? 0 : list === 'number' ? 1.6 : 1.1
  let n = 0
  return (
    <div className="relative" style={{ height, fontSize: sz, lineHeight: `${lh}px`, color: fmt?.color ?? color, ...fmtStyle(fmt) }}>
      <ul className="absolute inset-0 pointer-events-none">
        {items.map((b, i) => {
          if (b.trim()) n++
          const hidden = build && i >= build.shown
          return (
            <li
              key={i}
              className="relative min-h-[1em]"
              style={{
                whiteSpace: 'pre-wrap',
                paddingLeft: `${pad}em`,
                opacity: hidden ? 0 : 1,
                transform: hidden && build?.effect === 'Fly In' ? 'translateY(40px)' : hidden && build?.effect === 'Float In' ? 'translateY(14px)' : undefined,
                transition: build ? 'opacity .45s ease, transform .45s ease' : undefined,
              }}
            >
              {b.trim() && list !== 'none' && (
                <span className="absolute left-0 top-0" style={{ color: bulletColor, fontWeight: list === 'number' ? 600 : undefined }}>
                  {list === 'number' ? `${n}.` : '•'}
                </span>
              )}
              {b || ' '}
            </li>
          )
        })}
        {!items.length && onChange && <li className="pl-[1.1em] text-[#9E9E9E]">Click to add text</li>}
      </ul>
      {onChange && (
        <textarea
          data-agent={agent}
          aria-label="Slide bullets"
          value={text}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          onFocus={onFocus}
          spellCheck={false}
          className="absolute inset-0 w-full h-full resize-none bg-transparent outline-none hover:outline-dashed hover:outline-1 hover:outline-[#A0A0A0] focus:outline-dashed focus:outline-1 focus:outline-[#7A7A7A]"
          style={{ color: 'transparent', caretColor: '#000', lineHeight: `${lh}px`, fontSize: sz, fontFamily: fmt?.font ? `'${fmt.font}', var(--font-win)` : font, fontWeight: fmt?.bold ? 700 : undefined, fontStyle: fmt?.italic ? 'italic' : undefined, padding: 0, paddingLeft: `${pad}em`, textAlign: fmt?.align }}
        />
      )}
    </div>
  )
}

function Footer({ footer, n, dark }: { footer: string; n: number; dark?: boolean }) {
  return (
    <div className="absolute left-[48px] right-[48px] bottom-[18px] flex items-center text-[11px]" style={{ color: dark ? 'rgba(255,255,255,0.6)' : '#7F7F7F' }}>
      <span>{footer}</span>
      <span className="ml-auto">{n || ''}</span>
    </div>
  )
}

function ChartBlock({ chart, w, h, th }: { chart: NonNullable<Slide['chart']>; w: number; h: number; th: Theme }) {
  const C = [th.teal, th.accent, '#0F9ED5', '#196B24', '#A02B93', '#4EA72E']
  const series = chart.series ?? ['Value']
  if (chart.type === 'pie')
    return (
      <PieChart width={w} height={h}>
        <Pie data={chart.data} dataKey="value" nameKey="name" innerRadius={h * 0.22} outerRadius={h * 0.4} isAnimationActive={false}>
          {chart.data.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    )
  if (chart.type === 'line')
    return (
      <LineChart width={w} height={h} data={chart.data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#E5E5E5" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#595959' }} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} />
        <YAxis tick={{ fontSize: 12, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} width={52} domain={['auto', 'auto']} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
        <Line dataKey="value" name={series[0]} stroke={th.teal} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
        {chart.data[0]?.value2 !== undefined && <Line dataKey="value2" name={series[1] ?? 'Prior'} stroke="#A6A6A6" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />}
      </LineChart>
    )
  return (
    <BarChart width={w} height={h} data={chart.data} margin={{ top: 22, right: 10, left: 4, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#E5E5E5" />
      <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: '#595959' }} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} interval={0} />
      <YAxis tick={{ fontSize: 12, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} width={52} />
      <Bar dataKey="value" name={series[0]} fill={th.teal} radius={[3, 3, 0, 0]} isAnimationActive={false}>
        <LabelList dataKey="value" position="top" formatter={(v: any) => compact(Number(v))} style={{ fontSize: 11, fill: '#404040' }} />
      </Bar>
      {chart.data[0]?.value2 !== undefined && <Bar dataKey="value2" name={series[1] ?? 'Target'} fill={th.accent} radius={[3, 3, 0, 0]} isAnimationActive={false} />}
    </BarChart>
  )
}

/* ───────────── shapes ───────────── */

function ShapeView({ s, edit }: { s: Shape; edit?: Edit }) {
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; ow: number; oh: number; mode: 'move' | 'size' } | null>(null)
  const selected = edit?.selected === s.id
  const fill = s.fill ?? (s.kind === 'text' ? 'transparent' : '#156082')
  const border = s.line ? `2px solid ${s.line}` : undefined
  const common: React.CSSProperties = { left: s.x, top: s.y, width: s.w, height: s.h }
  const start = (e: React.PointerEvent, mode: 'move' | 'size') => {
    if (!edit?.onShape) return
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' && mode === 'move' && selected) return
    e.stopPropagation()
    edit.onSelectShape?.(s.id)
    drag.current = { x: e.clientX, y: e.clientY, ox: s.x, oy: s.y, ow: s.w, oh: s.h, mode }
    const sc = edit.scale ?? 1
    const mv = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = (ev.clientX - d.x) / sc
      const dy = (ev.clientY - d.y) / sc
      if (d.mode === 'move') edit.onShape!(s.id, { x: Math.round(Math.max(-s.w / 2, Math.min(SW - s.w / 2, d.ox + dx))), y: Math.round(Math.max(-s.h / 2, Math.min(SH - s.h / 2, d.oy + dy))) })
      else edit.onShape!(s.id, { w: Math.round(Math.max(24, d.ow + dx)), h: Math.round(Math.max(16, d.oh + dy)) })
    }
    const up = () => {
      drag.current = null
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }
  const shapeBg =
    s.kind === 'triangle' ? { clipPath: 'polygon(50% 0, 100% 100%, 0 100%)', background: fill } : s.kind === 'arrow' ? { clipPath: 'polygon(0 30%, 65% 30%, 65% 0, 100% 50%, 65% 100%, 65% 70%, 0 70%)', background: fill } : s.kind === 'star' ? { clipPath: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)', background: fill } : { background: fill, borderRadius: s.kind === 'ellipse' ? '50%' : s.kind === 'roundRect' ? 16 : 0, border }
  return (
    <div
      data-agent={edit ? `ppt-shape-${s.id}` : undefined}
      className="absolute"
      style={{ ...common, cursor: edit?.onShape ? 'move' : undefined, zIndex: 5 }}
      onPointerDown={(e) => start(e, 'move')}
    >
      <div className="absolute inset-0" style={shapeBg} />
      <div className="absolute inset-0 flex items-center justify-center p-2 text-center" style={{ color: s.color ?? (s.kind === 'text' ? '#262626' : '#fff'), fontSize: s.size ?? 20 }}>
        {selected && edit?.onShape ? (
          <textarea
            autoFocus={s.kind === 'text' && !s.text}
            value={s.text ?? ''}
            onChange={(e) => edit.onShape!(s.id, { text: e.target.value })}
            placeholder={s.kind === 'text' ? 'Click to add text' : ''}
            className="w-full h-full bg-transparent outline-none resize-none text-center placeholder:text-[#9E9E9E]"
            style={{ color: 'inherit', fontSize: 'inherit' }}
          />
        ) : (
          <span className="whitespace-pre-wrap">{s.text}</span>
        )}
      </div>
      {selected && edit?.onShape && (
        <>
          <div className="absolute -inset-[3px] border border-[#7A7A7A] pointer-events-none" />
          <div onPointerDown={(e) => start(e, 'size')} className="absolute -right-[6px] -bottom-[6px] w-[11px] h-[11px] bg-white border border-[#7A7A7A] rounded-full cursor-nwse-resize" />
        </>
      )}
    </div>
  )
}

/** Renders one slide at 960×540 logical pixels. Pass edit handlers to make text editable. */
export const SlideView = memo(function SlideView({ slide, n, footer, edit, theme, build }: { slide: Slide; n: number; footer: string; edit?: Edit; theme?: Theme; build?: { shown: number; effect: string } }) {
  const e = edit ?? {}
  const th = theme ?? THEMES.northwind
  const NAVY = th.navy
  const ACCENT = th.accent
  const TEAL = th.teal
  const FONT = th.font
  const f = slide.fmt ?? {}
  const dark = slide.layout === 'title' || slide.layout === 'closing' || slide.layout === 'section'
  const base = 'absolute inset-0 overflow-hidden'
  const shapes = (
    <>
      {(slide.shapes ?? []).map((s) => (
        <ShapeView key={s.id} s={s} edit={edit} />
      ))}
    </>
  )
  const clickBg = edit?.onSelectShape ? () => edit.onSelectShape!(null) : undefined
  if (dark) {
    return (
      <div className={base} style={{ background: slide.bg ?? NAVY, fontFamily: FONT, width: SW, height: SH }} onPointerDown={clickBg}>
        <div className="absolute right-0 top-0 w-[330px] h-full" style={{ background: `linear-gradient(135deg, ${TEAL}00 0%, ${TEAL}8C 100%)` }} />
        <div className="absolute right-[-120px] top-[-80px] w-[420px] h-[420px] rounded-full border-[46px] border-white/[0.06]" />
        <div className="absolute right-[60px] bottom-[70px] w-[180px] h-[180px] rounded-full" style={{ background: `${ACCENT}29` }} />
        <div className="absolute left-[64px] top-[150px] w-[64px] h-[6px]" style={{ background: ACCENT }} />
        <div className="absolute left-[64px] top-[172px] w-[600px]">
          <EditText value={slide.title} onChange={e.onTitle} onFocus={() => e.onFocusBox?.('title')} agent="ppt-slide-title" label="Slide title" placeholder="Click to add title" className="text-white font-semibold leading-[1.1]" style={{ fontSize: f.title?.size ?? (slide.layout === 'section' ? 40 : 46), height: 112, fontFamily: FONT, ...fmtStyle(f.title), color: f.title?.color ?? undefined }} />
          <EditText value={slide.subtitle ?? ''} onChange={e.onSubtitle} onFocus={() => e.onFocusBox?.('subtitle')} agent="ppt-slide-subtitle" label="Slide subtitle" placeholder="Click to add subtitle" className="text-white/75 leading-[1.45] mt-4" style={{ fontSize: f.subtitle?.size ?? 18, height: 84, fontFamily: FONT, ...fmtStyle(f.subtitle) }} />
        </div>
        <div className="absolute left-[64px] bottom-[40px] flex items-center gap-2 text-white/80 text-[13px] font-semibold tracking-wide">
          <span className="w-6 h-6 rounded bg-white/90 flex items-center justify-center text-[13px] font-bold" style={{ color: NAVY }}>N</span> NORTHWIND GLOBAL
        </div>
        {slide.layout !== 'title' && <Footer footer={footer} n={n} dark />}
        {shapes}
      </div>
    )
  }
  const bodyFmt = f.body
  return (
    <div className={base} style={{ background: slide.bg ?? '#FFFFFF', fontFamily: FONT, width: SW, height: SH }} onPointerDown={clickBg}>
      <div className="absolute left-0 top-0 w-[10px] h-full" style={{ background: TEAL }} />
      <div className="absolute left-[48px] right-[48px] top-[34px]">
        <EditText value={slide.title} onChange={e.onTitle} onFocus={() => e.onFocusBox?.('title')} agent="ppt-slide-title" label="Slide title" placeholder="Click to add title" className="font-semibold leading-[1.15]" style={{ fontSize: f.title?.size ?? 32, color: NAVY, height: 44, fontFamily: FONT, ...fmtStyle(f.title), ...(f.title?.color ? { color: f.title.color } : {}) }} />
        <div className="w-[56px] h-[4px] mt-2" style={{ background: ACCENT, marginLeft: f.title?.align === 'center' ? 'auto' : undefined, marginRight: f.title?.align === 'center' ? 'auto' : undefined }} />
      </div>
      <div className="absolute left-[48px] right-[48px] top-[118px] bottom-[50px]">
        {(slide.layout === 'titleContent' || (slide.layout === 'chart' && !slide.chart) || (slide.layout === 'kpis' && !slide.kpis)) && <Bullets items={slide.bullets} onChange={e.onBullets} onFocus={() => e.onFocusBox?.('body')} height={360} bulletColor={ACCENT} fmt={bodyFmt} font={FONT} build={build} />}
        {slide.layout === 'twoContent' && (
          <div className="grid grid-cols-2 gap-8 h-full">
            {[slide.bullets, slide.bullets2 ?? []].map((b, i) => (
              <div key={i} className="rounded-lg p-5" style={{ background: th === THEMES.northwind ? (i ? '#EEF6F9' : '#FDF1EA') : i ? `${TEAL}14` : `${ACCENT}1A` }}>
                <div className="text-[19px] font-semibold mb-2" style={{ color: i ? TEAL : th === THEMES.northwind ? '#B5531F' : ACCENT }}>{slide.headings?.[i] ?? ''}</div>
                <Bullets items={b} onChange={i === 0 ? e.onBullets : undefined} onFocus={() => e.onFocusBox?.('body')} size={17} height={290} bulletColor={i ? TEAL : ACCENT} fmt={bodyFmt} font={FONT} build={i === 0 ? build : undefined} />
              </div>
            ))}
          </div>
        )}
        {slide.layout === 'kpis' && slide.kpis && (
          <>
            <div className="grid grid-cols-4 gap-4">
              {(slide.kpis ?? []).map((k) => (
                <div key={k.label} className="rounded-lg border border-[#E3E3E3] px-4 pt-3 pb-3" style={{ borderTop: `4px solid ${TEAL}` }}>
                  <div className="text-[13px] text-[#595959]">{k.label}</div>
                  <div className="text-[34px] font-semibold leading-tight" style={{ color: NAVY }}>{k.value}</div>
                  {k.delta && <div className="text-[12.5px] font-semibold" style={{ color: k.delta.startsWith('−') && !/cost|time|days/i.test(k.label) ? '#C00000' : '#2E7D32' }}>{k.delta}</div>}
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Bullets items={slide.bullets} onChange={e.onBullets} onFocus={() => e.onFocusBox?.('body')} size={19} height={150} bulletColor={ACCENT} fmt={bodyFmt} font={FONT} build={build} />
            </div>
          </>
        )}
        {slide.layout === 'chart' && slide.chart && (
          <div className="flex gap-6 h-full">
            <div className="shrink-0">
              <ChartBlock chart={slide.chart} w={560} h={360} th={th} />
            </div>
            <div className="flex-1 pt-4">
              <Bullets items={slide.bullets} onChange={e.onBullets} onFocus={() => e.onFocusBox?.('body')} size={16} height={330} bulletColor={ACCENT} fmt={bodyFmt} font={FONT} build={build} />
            </div>
          </div>
        )}
      </div>
      <Footer footer={footer} n={n} />
      {shapes}
    </div>
  )
})
