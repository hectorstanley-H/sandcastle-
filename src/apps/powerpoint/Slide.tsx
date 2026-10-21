import { memo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis } from 'recharts'

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
}

export const SW = 960
export const SH = 540
const NAVY = '#14213D'
const ACCENT = '#E97132'
const TEAL = '#156082'
const C = [TEAL, ACCENT, '#0F9ED5', '#196B24', '#A02B93', '#4EA72E']
const FONT = "'Aptos', 'Segoe UI Variable Display', 'Segoe UI', var(--font-win)"

const compact = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n))

interface Edit {
  onTitle?: (v: string) => void
  onSubtitle?: (v: string) => void
  onBullets?: (v: string[]) => void
}

/** A text block that is a real textarea when editable, overlaid on the rendered text so it looks like PowerPoint. */
function EditText({ value, onChange, agent, className, style, placeholder, label }: { value: string; onChange?: (v: string) => void; agent: string; className?: string; style?: React.CSSProperties; placeholder: string; label: string }) {
  if (!onChange) return <div className={className} style={{ ...style, whiteSpace: 'pre-wrap' }}>{value}</div>
  return (
    <textarea
      data-agent={agent}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${className} block w-full resize-none bg-transparent outline-none overflow-hidden hover:outline-dashed hover:outline-1 hover:outline-[#A0A0A0] focus:outline-dashed focus:outline-1 focus:outline-[#7A7A7A] placeholder:text-[#9E9E9E]`}
      style={style}
      rows={1}
    />
  )
}

function Bullets({ items, onChange, agent = 'ppt-slide-bullets', size = 22, color = '#262626', bulletColor = ACCENT, height }: { items: string[]; onChange?: (v: string[]) => void; agent?: string; size?: number; color?: string; bulletColor?: string; height: number }) {
  const lh = size * 1.55
  const text = items.join('\n')
  return (
    <div className="relative" style={{ height, fontSize: size, lineHeight: `${lh}px`, color }}>
      <ul className="absolute inset-0 pointer-events-none">
        {items.map((b, i) => (
          <li key={i} className="relative pl-[1.1em] min-h-[1em]" style={{ whiteSpace: 'pre-wrap' }}>
            {b.trim() && <span className="absolute left-0 top-0" style={{ color: bulletColor }}>•</span>}
            {b || ' '}
          </li>
        ))}
        {!items.length && onChange && <li className="pl-[1.1em] text-[#9E9E9E]">Click to add text</li>}
      </ul>
      {onChange && (
        <textarea
          data-agent={agent}
          aria-label="Slide bullets"
          value={text}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          spellCheck={false}
          className="absolute inset-0 w-full h-full resize-none bg-transparent outline-none pl-[1.1em] hover:outline-dashed hover:outline-1 hover:outline-[#A0A0A0] focus:outline-dashed focus:outline-1 focus:outline-[#7A7A7A]"
          style={{ color: 'transparent', caretColor: '#000', lineHeight: `${lh}px`, fontSize: size, fontFamily: FONT, padding: 0, paddingLeft: '1.1em' }}
        />
      )}
    </div>
  )
}

function Footer({ footer, n, dark }: { footer: string; n: number; dark?: boolean }) {
  return (
    <div className="absolute left-[48px] right-[48px] bottom-[18px] flex items-center text-[11px]" style={{ color: dark ? 'rgba(255,255,255,0.6)' : '#7F7F7F' }}>
      <span>{footer}</span>
      <span className="ml-auto">{n}</span>
    </div>
  )
}

function ChartBlock({ chart, w, h }: { chart: NonNullable<Slide['chart']>; w: number; h: number }) {
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
        <Line dataKey="value" name={series[0]} stroke={TEAL} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
        {chart.data[0]?.value2 !== undefined && <Line dataKey="value2" name={series[1] ?? 'Prior'} stroke="#A6A6A6" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />}
      </LineChart>
    )
  return (
    <BarChart width={w} height={h} data={chart.data} margin={{ top: 22, right: 10, left: 4, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#E5E5E5" />
      <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: '#595959' }} tickLine={false} axisLine={{ stroke: '#BFBFBF' }} interval={0} />
      <YAxis tick={{ fontSize: 12, fill: '#595959' }} tickLine={false} axisLine={false} tickFormatter={compact} width={52} />
      <Bar dataKey="value" name={series[0]} fill={TEAL} radius={[3, 3, 0, 0]} isAnimationActive={false}>
        <LabelList dataKey="value" position="top" formatter={(v: any) => compact(Number(v))} style={{ fontSize: 11, fill: '#404040' }} />
      </Bar>
      {chart.data[0]?.value2 !== undefined && <Bar dataKey="value2" name={series[1] ?? 'Target'} fill={ACCENT} radius={[3, 3, 0, 0]} isAnimationActive={false} />}
    </BarChart>
  )
}

/** Renders one slide at 960×540 logical pixels. Pass edit handlers to make text editable. */
export const SlideView = memo(function SlideView({ slide, n, footer, edit }: { slide: Slide; n: number; footer: string; edit?: Edit }) {
  const e = edit ?? {}
  const dark = slide.layout === 'title' || slide.layout === 'closing' || slide.layout === 'section'
  const base = 'absolute inset-0 overflow-hidden'
  if (dark) {
    return (
      <div className={base} style={{ background: NAVY, fontFamily: FONT, width: SW, height: SH }}>
        <div className="absolute right-0 top-0 w-[330px] h-full" style={{ background: 'linear-gradient(135deg, rgba(21,96,130,0.0) 0%, rgba(21,96,130,0.55) 100%)' }} />
        <div className="absolute right-[-120px] top-[-80px] w-[420px] h-[420px] rounded-full border-[46px] border-white/[0.06]" />
        <div className="absolute right-[60px] bottom-[70px] w-[180px] h-[180px] rounded-full" style={{ background: 'rgba(233,113,50,0.16)' }} />
        <div className="absolute left-[64px] top-[150px] w-[64px] h-[6px]" style={{ background: ACCENT }} />
        <div className="absolute left-[64px] top-[172px] w-[600px]">
          <EditText value={slide.title} onChange={e.onTitle} agent="ppt-slide-title" label="Slide title" placeholder="Click to add title" className="text-white font-semibold leading-[1.1]" style={{ fontSize: slide.layout === 'section' ? 40 : 46, height: 112, fontFamily: FONT }} />
          <EditText value={slide.subtitle ?? ''} onChange={e.onSubtitle} agent="ppt-slide-subtitle" label="Slide subtitle" placeholder="Click to add subtitle" className="text-white/75 leading-[1.45] mt-4" style={{ fontSize: 18, height: 84, fontFamily: FONT }} />
        </div>
        <div className="absolute left-[64px] bottom-[40px] flex items-center gap-2 text-white/80 text-[13px] font-semibold tracking-wide">
          <span className="w-6 h-6 rounded bg-white/90 text-[#14213D] flex items-center justify-center text-[13px] font-bold">N</span> NORTHWIND GLOBAL
        </div>
        {slide.layout !== 'title' && <Footer footer={footer} n={n} dark />}
      </div>
    )
  }
  return (
    <div className={base} style={{ background: '#FFFFFF', fontFamily: FONT, width: SW, height: SH }}>
      <div className="absolute left-0 top-0 w-[10px] h-full" style={{ background: TEAL }} />
      <div className="absolute left-[48px] right-[48px] top-[34px]">
        <EditText value={slide.title} onChange={e.onTitle} agent="ppt-slide-title" label="Slide title" placeholder="Click to add title" className="font-semibold leading-[1.15]" style={{ fontSize: 32, color: NAVY, height: 44, fontFamily: FONT }} />
        <div className="w-[56px] h-[4px] mt-2" style={{ background: ACCENT }} />
      </div>
      <div className="absolute left-[48px] right-[48px] top-[118px] bottom-[50px]">
        {(slide.layout === 'titleContent' || (slide.layout === 'chart' && !slide.chart) || (slide.layout === 'kpis' && !slide.kpis)) && <Bullets items={slide.bullets} onChange={e.onBullets} height={360} />}
        {slide.layout === 'twoContent' && (
          <div className="grid grid-cols-2 gap-8 h-full">
            {[slide.bullets, slide.bullets2 ?? []].map((b, i) => (
              <div key={i} className="rounded-lg p-5" style={{ background: i ? '#EEF6F9' : '#FDF1EA' }}>
                <div className="text-[19px] font-semibold mb-2" style={{ color: i ? TEAL : '#B5531F' }}>{slide.headings?.[i] ?? ''}</div>
                <Bullets items={b} onChange={i === 0 ? e.onBullets : undefined} size={17} height={290} bulletColor={i ? TEAL : ACCENT} />
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
              <Bullets items={slide.bullets} onChange={e.onBullets} size={19} height={150} />
            </div>
          </>
        )}
        {slide.layout === 'chart' && slide.chart && (
          <div className="flex gap-6 h-full">
            <div className="shrink-0">
              <ChartBlock chart={slide.chart} w={560} h={360} />
            </div>
            <div className="flex-1 pt-4">
              <Bullets items={slide.bullets} onChange={e.onBullets} size={16} height={330} />
            </div>
          </div>
        )}
      </div>
      <Footer footer={footer} n={n} />
    </div>
  )
})
