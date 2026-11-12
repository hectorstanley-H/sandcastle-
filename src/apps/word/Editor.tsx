import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

export type PStyle = 'title' | 'subtitle' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'normal' | 'bullet' | 'number' | 'pagebreak' | 'table' | 'toc'
export interface Para {
  id: string
  style: PStyle
  text: string
  /* paragraph formatting (all optional) */
  align?: 'left' | 'center' | 'right' | 'justify'
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  sub?: boolean
  sup?: boolean
  caps?: boolean
  color?: string
  highlight?: string
  shading?: string
  border?: 'bottom' | 'box'
  size?: number
  font?: string
  indent?: number
  lineSpacing?: number
  spaceAfter?: number
  /** table blocks */
  table?: string[][]
  /** track changes: text before the first tracked edit / paragraph inserted while tracking */
  orig?: string
  ins?: boolean
  insBy?: string
}

/** Word for Microsoft 365 default style sheet (Aptos), in px at 100% zoom (1pt = 1.333px). */
const BODY = "'Aptos', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
const DISPLAY = "'Aptos Display', 'Aptos', 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
export const STYLE_CSS: Record<PStyle, { font: string; size: number; lh: number; color: string; before: number; after: number; weight?: number; tracking?: number; italic?: boolean }> = {
  title: { font: DISPLAY, size: 37.3, lh: 1.12, color: '#000000', before: 0, after: 5.3, tracking: -0.3 },
  subtitle: { font: BODY, size: 18.7, lh: 1.25, color: '#595959', before: 0, after: 10.7, tracking: 0.4 },
  heading1: { font: DISPLAY, size: 26.7, lh: 1.15, color: '#0F4761', before: 24, after: 5.3 },
  heading2: { font: DISPLAY, size: 21.3, lh: 1.15, color: '#0F4761', before: 10.7, after: 5.3 },
  heading3: { font: BODY, size: 18.7, lh: 1.15, color: '#0F4761', before: 10.7, after: 5.3 },
  quote: { font: BODY, size: 14.67, lh: 1.15, color: '#404040', before: 13.3, after: 10.7, italic: true },
  normal: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 10.7 },
  bullet: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 2.7 },
  number: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 2.7 },
  pagebreak: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 0 },
  table: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 10.7 },
  toc: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 10.7 },
}

export const PAGE_W = 816
export const PAGE_H = 1056
export const MARGIN = 96
const GAP = 18

export interface PageSetup {
  w: number
  h: number
  margin: number
}

export const nextStyle = (s: PStyle): PStyle => (s === 'bullet' || s === 'number' || s === 'normal' ? s : 'normal')
const isBlock = (s: PStyle) => s === 'pagebreak' || s === 'table' || s === 'toc'
const isHeading = (s: PStyle) => s === 'heading1' || s === 'heading2' || s === 'heading3'

function AutoTextarea({
  p,
  active,
  agent,
  onChange,
  onKeyDown,
  onActivate,
  readOnly,
  styleSet,
}: {
  p: Para
  active: boolean
  agent: boolean
  onChange: (v: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onActivate: () => void
  readOnly?: boolean
  styleSet?: { heading?: string; font?: string }
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const s = STYLE_CSS[p.style]
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  })
  const placeholder =
    p.style === 'title' && active && !p.text ? 'Title' : p.style === 'heading1' && active && !p.text ? 'Heading 1' : undefined
  const deco = [p.underline ? 'underline' : '', p.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined
  const headingColor = (isHeading(p.style) || p.style === 'title') && styleSet?.heading ? styleSet.heading : undefined
  return (
    <textarea
      ref={ref}
      data-pid={p.id}
      data-agent={agent ? 'word-body' : undefined}
      aria-label={agent ? 'Document body' : undefined}
      rows={1}
      value={p.text}
      placeholder={placeholder}
      spellCheck={false}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPointerDown={onActivate}
      onClick={onActivate}
      onFocus={onActivate}
      className="block w-full resize-none overflow-hidden bg-transparent outline-none border-0 p-0 m-0 placeholder:text-[#9a9a9a] selection:bg-[#C5DCF5]"
      style={{
        fontFamily: p.font ? `'${p.font}', ${s.font}` : styleSet?.font && !isHeading(p.style) && p.style !== 'title' ? `'${styleSet.font}', ${s.font}` : s.font,
        fontSize: p.size ? (p.size * 4) / 3 : s.size,
        lineHeight: p.lineSpacing ?? s.lh,
        color: p.color ?? headingColor ?? s.color,
        letterSpacing: s.tracking,
        fontWeight: p.bold ? 700 : s.weight,
        fontStyle: p.italic || s.italic ? 'italic' : undefined,
        textDecoration: deco,
        textAlign: p.align,
        background: p.highlight,
        textTransform: p.caps ? 'uppercase' : undefined,
        caretColor: '#000',
      }}
    />
  )
}

function TableBlock({ p, onChange, onActivate, active }: { p: Para; onChange: (t: string[][]) => void; onActivate: () => void; active: boolean }) {
  const t = p.table ?? [['', ''], ['', '']]
  const set = (r: number, c: number, v: string) => onChange(t.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)))
  return (
    <div className="relative" onPointerDown={onActivate}>
      {active && (
        <div className="absolute -top-[26px] left-0 flex items-center gap-1 text-[11.5px] bg-white border border-[#D1D1D1] rounded shadow-sm px-1 h-[22px] z-10" style={{ fontFamily: 'var(--font-win)' }}>
          <button onClick={() => onChange([...t, t[0].map(() => '')])} className="px-1.5 rounded hover:bg-[#F0F0F0]">+ Row</button>
          <button onClick={() => onChange(t.map((row) => [...row, '']))} className="px-1.5 rounded hover:bg-[#F0F0F0]">+ Column</button>
          <button disabled={t.length < 2} onClick={() => onChange(t.slice(0, -1))} className="px-1.5 rounded hover:bg-[#F0F0F0] disabled:opacity-40">− Row</button>
          <button disabled={t[0].length < 2} onClick={() => onChange(t.map((row) => row.slice(0, -1)))} className="px-1.5 rounded hover:bg-[#F0F0F0] disabled:opacity-40">− Column</button>
        </div>
      )}
      <table className="w-full border-collapse" style={{ fontFamily: BODY, fontSize: 14.67 }}>
        <tbody>
          {t.map((row, r) => (
            <tr key={r}>
              {row.map((v, c) => (
                <td key={c} className="border border-[#7F7F7F] p-0 align-top" style={{ background: r === 0 ? '#DCE6F2' : undefined }}>
                  <input
                    value={v}
                    aria-label={`Table cell ${r + 1},${c + 1}`}
                    onFocus={onActivate}
                    onChange={(e) => set(r, c, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey && r === t.length - 1 && c === row.length - 1) {
                        e.preventDefault()
                        onChange([...t, row.map(() => '')])
                        setTimeout(() => {
                          const inputs = (e.target as HTMLElement).closest('table')?.querySelectorAll('input')
                          ;(inputs?.[inputs.length - row.length] as HTMLInputElement | undefined)?.focus()
                        })
                      }
                    }}
                    className="w-full bg-transparent outline-none px-1.5 py-1"
                    style={{ fontWeight: r === 0 ? 700 : 400 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface EditorOptions {
  page?: PageSetup
  marks?: boolean
  watermark?: string
  pageColor?: string
  pageBorder?: boolean
  web?: boolean
  zoom?: number
  hits?: Set<string>
  commented?: Set<string>
  markup?: 'simple' | 'all' | null
  readOnly?: boolean
  styleSet?: { heading?: string; font?: string }
  columns?: number
  lineNumbers?: boolean
}

export function Editor({
  paragraphs,
  activeId,
  setActive,
  onParagraphs,
  onPage,
  opts = {},
}: {
  paragraphs: Para[]
  activeId: string | null
  setActive: (id: string) => void
  /** apply a transform to the paragraph list (persisted by the parent) */
  onParagraphs: (fn: (ps: Para[]) => Para[]) => void
  onPage: (page: number, pages: number) => void
  opts?: EditorOptions
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wrapRefs = useRef(new Map<string, HTMLDivElement>())
  /** paragraphs spawned from a multi-line value typed into a given paragraph (agent typing / paste) */
  const spawned = useRef(new Map<string, string[]>())
  const pendingFocus = useRef<{ id: string; caret: number } | null>(null)
  const [breaks, setBreaks] = useState<{ push: Record<string, number>; pages: number; pageOf: Record<string, number> }>({ push: {}, pages: 1, pageOf: {} })
  const [, setTick] = useState(0)

  const pw = opts.page?.w ?? PAGE_W
  const ph = opts.page?.h ?? PAGE_H
  const margin = opts.page?.margin ?? MARGIN
  const CONTENT_H = ph - margin * 2
  const web = !!opts.web

  const effActive = paragraphs.find((p) => p.id === activeId)?.id ?? paragraphs[paragraphs.length - 1]?.id
  /** don't scroll on open: only once the caret moves */
  const revealFrom = useRef({ a: effActive as string | undefined, n: paragraphs.length })

  // pagination: measure each paragraph and push the ones that cross the bottom margin to the next page
  useLayoutEffect(() => {
    const push: Record<string, number> = {}
    const pageOf: Record<string, number> = {}
    let y = 0
    let page = 0
    for (const p of paragraphs) {
      const el = wrapRefs.current.get(p.id)
      const h = el ? el.offsetHeight : 20
      if (!web && y + h > CONTENT_H && y > 0) {
        push[p.id] = CONTENT_H - y + margin * 2 + GAP
        page++
        y = 0
      }
      pageOf[p.id] = page
      y += h
      if (!web && p.style === 'pagebreak') y = Math.max(y, CONTENT_H)
    }
    const next = { push, pages: page + 1, pageOf }
    if (JSON.stringify(next) !== JSON.stringify(breaks)) setBreaks(next)
  })

  // re-measure once web fonts settle
  useEffect(() => {
    document.fonts?.ready.then(() => setTick((t) => t + 1))
  }, [])

  useEffect(() => {
    onPage((effActive && breaks.pageOf[effActive]) || 0, breaks.pages)
  }, [effActive, breaks])

  // focus / reveal the active paragraph
  useEffect(() => {
    const pf = pendingFocus.current
    if (pf) {
      pendingFocus.current = null
      const ta = scrollRef.current?.querySelector<HTMLTextAreaElement>(`textarea[data-pid="${pf.id}"]`)
      if (ta) {
        ta.focus()
        ta.setSelectionRange(pf.caret, pf.caret)
      }
    }
    if (revealFrom.current.a === effActive && revealFrom.current.n === paragraphs.length) return
    revealFrom.current = { a: '', n: -1 }
    const sc = scrollRef.current
    const el = effActive ? wrapRefs.current.get(effActive) : null
    if (sc && el) {
      const sr = sc.getBoundingClientRect()
      const er = el.getBoundingClientRect()
      if (er.bottom > sr.bottom - 24) sc.scrollTop += er.bottom - sr.bottom + 80
      else if (er.top < sr.top) sc.scrollTop -= sr.top - er.top + 40
    }
  }, [effActive, paragraphs.length])

  /** Insert `np` after paragraph `afterId`, reusing a trailing empty paragraph if there is one. */
  const insertAfter = (ps: Para[], afterId: string, np: Para): [Para[], string] => {
    const i = ps.findIndex((x) => x.id === afterId)
    const nxt = ps[i + 1]
    if (nxt && i + 1 === ps.length - 1 && !nxt.text && !np.text && !isBlock(nxt.style)) {
      return [ps.map((x) => (x.id === nxt.id ? { ...x, style: np.style } : x)), nxt.id]
    }
    const out = [...ps]
    out.splice(i + 1, 0, np)
    return [out, np.id]
  }

  const newId = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

  const change = (p: Para, value: string) => {
    if (opts.readOnly) return
    if (!value.includes('\n')) {
      onParagraphs((ps) => ps.map((x) => (x.id === p.id ? { ...x, text: value } : x)))
      return
    }
    const lines = value.split('\n')
    let lastId = p.id
    onParagraphs((ps0) => {
      let ps = ps0.map((x) => (x.id === p.id ? { ...x, text: lines[0] } : x))
      const kids = [...(spawned.current.get(p.id) ?? [])]
      let prev = p.id
      let style = nextStyle(p.style)
      for (let k = 1; k < lines.length; k++) {
        const kid = kids[k - 1]
        if (kid && ps.some((x) => x.id === kid)) {
          ps = ps.map((x) => (x.id === kid ? { ...x, text: lines[k] } : x))
          prev = kid
        } else {
          const [nps, id] = insertAfter(ps, prev, { id: newId(), style, text: lines[k] })
          ps = nps
          kids[k - 1] = id
          prev = id
        }
        style = nextStyle(style)
      }
      spawned.current.set(p.id, kids)
      lastId = prev
      return ps
    })
    setActive(lastId)
  }

  const keyDown = (p: Para, e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (opts.readOnly) return
    const ta = e.currentTarget
    const human = document.activeElement === ta
    if (e.key === 'Tab' && human && (p.style === 'bullet' || p.style === 'number')) {
      e.preventDefault()
      onParagraphs((ps) => ps.map((x) => (x.id === p.id ? { ...x, indent: Math.max(0, Math.min(6, (x.indent ?? 0) + (e.shiftKey ? -1 : 1))) || undefined } : x)))
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      spawned.current.delete(p.id)
      const base = paragraphs.find((x) => x.id === effActive) ?? p
      let newActive = ''
      if (base.id === p.id) {
        const caret = human ? (ta.selectionStart ?? p.text.length) : p.text.length
        const before = p.text.slice(0, caret)
        const after = p.text.slice(caret)
        // Enter on an empty list item ends the list (Word behaviour)
        if (human && !p.text && (p.style === 'bullet' || p.style === 'number')) {
          onParagraphs((ps) => ps.map((x) => (x.id === p.id ? { ...x, style: 'normal', indent: undefined } : x)))
          return
        }
        onParagraphs((ps0) => {
          const ps = ps0.map((x) => (x.id === p.id ? { ...x, text: before } : x))
          const keep: Partial<Para> = { align: p.align, indent: p.indent, font: p.font, size: p.size, color: p.color }
          const [out, id] = insertAfter(ps, p.id, { id: newId(), style: after ? p.style : nextStyle(p.style), text: after, ...(p.style === 'bullet' || p.style === 'number' || p.style === 'normal' ? keep : {}) })
          newActive = id
          return out
        })
      } else {
        onParagraphs((ps0) => {
          const [out, id] = insertAfter(ps0, base.id, { id: newId(), style: nextStyle(base.style), text: '' })
          newActive = id
          return out
        })
      }
      if (newActive) {
        if (human) pendingFocus.current = { id: newActive, caret: 0 }
        setActive(newActive)
      }
      return
    }
    if (e.key === 'Backspace' && paragraphs.length > 1) {
      const caretAtStart = human ? ta.selectionStart === 0 && ta.selectionEnd === 0 : !p.text
      const idx = paragraphs.findIndex((x) => x.id === p.id)
      if (!caretAtStart || idx < 0) return
      const prevBlock = paragraphs[idx - 1]
      if (prevBlock && isBlock(prevBlock.style)) {
        // Backspace right after a page break / table / TOC removes that block
        e.preventDefault()
        onParagraphs((ps) => ps.filter((x) => x.id !== prevBlock.id))
        return
      }
      if (!p.text) {
        e.preventDefault()
        const target = paragraphs[idx - 1] ?? paragraphs[idx + 1]
        onParagraphs((ps) => ps.filter((x) => x.id !== p.id))
        if (human) pendingFocus.current = { id: target.id, caret: target.text.length }
        setActive(target.id)
      } else if (idx > 0) {
        e.preventDefault()
        const prev = paragraphs[idx - 1]
        onParagraphs((ps) => ps.filter((x) => x.id !== p.id).map((x) => (x.id === prev.id ? { ...x, text: x.text + p.text } : x)))
        if (human) pendingFocus.current = { id: prev.id, caret: prev.text.length }
        setActive(prev.id)
      }
    }
  }

  // list numbering (restarts after any non-numbered paragraph; nested levels count separately)
  const numbers: Record<string, string> = {}
  let counters: number[] = []
  for (const p of paragraphs) {
    if (p.style === 'number') {
      const lvl = p.indent ?? 0
      counters = counters.slice(0, lvl + 1)
      while (counters.length <= lvl) counters.push(0)
      counters[lvl]++
      const n = counters[lvl]
      numbers[p.id] = lvl % 3 === 1 ? `${String.fromCharCode(96 + ((n - 1) % 26) + 1)}.` : lvl % 3 === 2 ? `${['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][(n - 1) % 10]}.` : `${n}.`
    } else if (p.style !== 'bullet') counters = []
  }
  const BULLETS = ['•', '◦', '▪']

  const pages = web ? 1 : breaks.pages
  const zoom = (opts.zoom ?? 100) / 100
  const totalH = web ? undefined : pages * ph + (pages - 1) * GAP
  const contentW = web ? undefined : pw - margin * 2
  const headings = paragraphs.filter((p) => isHeading(p.style) && p.text.trim())

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto" style={{ background: web ? '#FFFFFF' : '#E6E6E6' }}>
      <div className={web ? 'px-10 py-6' : 'py-5 flex justify-center min-w-fit'} style={zoom !== 1 ? { zoom } : undefined}>
        <div className="relative shrink-0" style={{ width: web ? '100%' : pw, height: totalH, minHeight: web ? 400 : undefined }}>
          {!web &&
            Array.from({ length: pages }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 overflow-hidden"
                style={{ top: i * (ph + GAP), width: pw, height: ph, background: opts.pageColor ?? '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1.6px 3.6px rgba(0,0,0,0.13), 0 0.3px 0.9px rgba(0,0,0,0.11)' }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget && i === pages - 1) {
                    const last = paragraphs[paragraphs.length - 1]
                    if (last) setActive(last.id)
                  }
                }}
              >
                {opts.pageBorder && <div className="absolute pointer-events-none border-[3px] border-double border-[#0F4761]" style={{ inset: margin / 2 }} />}
                {opts.watermark && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <span className="text-[110px] font-semibold tracking-wider text-[#000]/[0.07] -rotate-45 whitespace-nowrap" style={{ fontFamily: DISPLAY }}>
                      {opts.watermark}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-[36px] left-0 right-0 text-center text-[11px] text-[#8A8886] pointer-events-none">{pages > 1 ? i + 1 : ''}</div>
              </div>
            ))}
          <div className={web ? 'relative max-w-[900px]' : 'absolute'} style={web ? undefined : { left: margin, top: margin, width: contentW }}>
            {paragraphs.map((p, pi) => {
              const s = STYLE_CSS[p.style]
              const list = p.style === 'bullet' || p.style === 'number'
              const lvl = p.indent ?? 0
              const indentPx = list ? 48 + lvl * 36 : lvl * 48
              const changed = opts.markup && (p.orig !== undefined || p.ins)
              const push = breaks.push[p.id] ?? 0
              return (
                <div
                  key={p.id}
                  ref={(el) => {
                    if (el) wrapRefs.current.set(p.id, el)
                    else wrapRefs.current.delete(p.id)
                  }}
                  data-para={p.id}
                  className="relative"
                  style={{
                    marginTop: web ? 0 : push,
                    paddingTop: s.before,
                    paddingBottom: p.spaceAfter ?? s.after,
                    paddingLeft: indentPx,
                    ...(p.style === 'quote' ? { paddingLeft: indentPx + 40, paddingRight: 40 } : {}),
                    ...(p.border === 'box' ? { outline: '1px solid #000', outlineOffset: 2 } : p.border === 'bottom' ? { boxShadow: 'inset 0 -1px 0 #000' } : {}),
                    background: p.shading ?? (opts.commented?.has(p.id) ? '#FFF4CE' : undefined),
                  }}
                >
                  {opts.hits?.has(p.id) && <span className="absolute -inset-x-1 inset-y-0 bg-[#FFFF00]/35 pointer-events-none" />}
                  {changed && <span className="absolute -left-[22px] top-0 bottom-0 w-[2px]" style={{ background: p.ins ? '#C00000' : '#C00000' }} title={p.ins ? 'Inserted' : `Original: ${p.orig}`} />}
                  {opts.lineNumbers && !isBlock(p.style) && <span className="absolute -left-[40px] w-[24px] text-right text-[11px] text-[#8A8886] select-none" style={{ top: s.before }}>{pi + 1}</span>}
                  {list && (
                    <span className="absolute select-none pointer-events-none" style={{ left: indentPx - 24, top: s.before, fontFamily: s.font, fontSize: p.size ? (p.size * 4) / 3 : s.size, lineHeight: p.lineSpacing ?? s.lh, color: '#000' }}>
                      {p.style === 'bullet' ? BULLETS[lvl % 3] : numbers[p.id]}
                    </span>
                  )}
                  {p.style === 'pagebreak' ? (
                    <div
                      className="relative select-none"
                      style={{ height: opts.marks || web ? 18 : 2 }}
                      onPointerDown={() => setActive(p.id)}
                      title="Page Break"
                    >
                      {(opts.marks || web) && (
                        <div className="absolute inset-x-0 top-1/2 border-t border-dotted border-[#8A8886] text-center">
                          <span className="relative -top-[9px] bg-white px-2 text-[11px] text-[#616161]" style={{ fontFamily: 'var(--font-win)' }}>
                            Page Break
                          </span>
                        </div>
                      )}
                    </div>
                  ) : p.style === 'table' ? (
                    <TableBlock p={p} active={p.id === effActive} onActivate={() => activeId !== p.id && setActive(p.id)} onChange={(t) => onParagraphs((ps) => ps.map((x) => (x.id === p.id ? { ...x, table: t } : x)))} />
                  ) : p.style === 'toc' ? (
                    <div onPointerDown={() => setActive(p.id)} className={`rounded-sm ${p.id === effActive ? 'outline outline-1 outline-[#A0A0A0]' : ''}`}>
                      <div className="text-[21.3px] mb-2" style={{ fontFamily: DISPLAY, color: opts.styleSet?.heading ?? '#0F4761' }}>
                        Contents
                      </div>
                      {headings.length === 0 && <div className="text-[13px] text-[#8A8886] italic">No table of contents entries found. Apply heading styles to text to build one.</div>}
                      {headings.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => {
                            setActive(h.id)
                            pendingFocus.current = { id: h.id, caret: 0 }
                          }}
                          className="w-full flex items-end gap-1 text-left hover:text-[#185ABD]"
                          style={{ paddingLeft: h.style === 'heading2' ? 20 : h.style === 'heading3' ? 40 : 0, fontFamily: BODY, fontSize: 14.67, lineHeight: 1.6 }}
                        >
                          <span className="shrink-0">{h.text}</span>
                          <span className="flex-1 border-b border-dotted border-[#7F7F7F] mb-[6px]" />
                          <span className="shrink-0">{(breaks.pageOf[h.id] ?? 0) + 1}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <AutoTextarea
                        p={p}
                        active={p.id === effActive}
                        agent={p.id === effActive}
                        readOnly={opts.readOnly}
                        styleSet={opts.styleSet}
                        onChange={(v) => change(p, v)}
                        onKeyDown={(e) => keyDown(p, e)}
                        onActivate={() => {
                          if (activeId !== p.id) setActive(p.id)
                          spawned.current.delete(p.id)
                        }}
                      />
                      {opts.marks && <span className="absolute right-[-14px] bottom-[2px] text-[13px] text-[#8A8886] select-none pointer-events-none">¶</span>}
                      {opts.markup === 'all' && p.orig !== undefined && p.orig !== p.text && (
                        <div className="text-[12.5px] text-[#C00000] line-through decoration-[#C00000] select-none" style={{ fontFamily: BODY }} title="Deleted text (tracked)">
                          {p.orig}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
