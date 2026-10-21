import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

export type PStyle = 'title' | 'subtitle' | 'heading1' | 'heading2' | 'normal' | 'bullet' | 'number'
export interface Para {
  id: string
  style: PStyle
  text: string
}

/** Word for Microsoft 365 default style sheet (Aptos), in px at 100% zoom (1pt = 1.333px). */
const BODY = "'Aptos', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
const DISPLAY = "'Aptos Display', 'Aptos', 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
export const STYLE_CSS: Record<PStyle, { font: string; size: number; lh: number; color: string; before: number; after: number; weight?: number; tracking?: number }> = {
  title: { font: DISPLAY, size: 37.3, lh: 1.12, color: '#000000', before: 0, after: 5.3, tracking: -0.3 },
  subtitle: { font: BODY, size: 18.7, lh: 1.25, color: '#595959', before: 0, after: 10.7, tracking: 0.4 },
  heading1: { font: DISPLAY, size: 26.7, lh: 1.15, color: '#0F4761', before: 24, after: 5.3 },
  heading2: { font: DISPLAY, size: 21.3, lh: 1.15, color: '#0F4761', before: 10.7, after: 5.3 },
  normal: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 10.7 },
  bullet: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 2.7 },
  number: { font: BODY, size: 14.67, lh: 1.15, color: '#000000', before: 0, after: 2.7 },
}

export const PAGE_W = 816
export const PAGE_H = 1056
export const MARGIN = 96
const CONTENT_H = PAGE_H - MARGIN * 2
const GAP = 18

export const nextStyle = (s: PStyle): PStyle => (s === 'bullet' || s === 'number' || s === 'normal' ? s : 'normal')

function AutoTextarea({
  p,
  active,
  agent,
  onChange,
  onKeyDown,
  onActivate,
}: {
  p: Para
  active: boolean
  agent: boolean
  onChange: (v: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onActivate: () => void
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
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPointerDown={onActivate}
      onClick={onActivate}
      onFocus={onActivate}
      className="block w-full resize-none overflow-hidden bg-transparent outline-none border-0 p-0 m-0 placeholder:text-[#9a9a9a] selection:bg-[#C5DCF5]"
      style={{
        fontFamily: s.font,
        fontSize: s.size,
        lineHeight: s.lh,
        color: s.color,
        letterSpacing: s.tracking,
        fontWeight: s.weight,
        caretColor: '#000',
      }}
    />
  )
}

export function Editor({
  paragraphs,
  activeId,
  setActive,
  onParagraphs,
  onPage,
}: {
  paragraphs: Para[]
  activeId: string | null
  setActive: (id: string) => void
  /** apply a transform to the paragraph list (persisted by the parent) */
  onParagraphs: (fn: (ps: Para[]) => Para[]) => void
  onPage: (page: number, pages: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wrapRefs = useRef(new Map<string, HTMLDivElement>())
  /** paragraphs spawned from a multi-line value typed into a given paragraph (agent typing / paste) */
  const spawned = useRef(new Map<string, string[]>())
  const pendingFocus = useRef<{ id: string; caret: number } | null>(null)
  const [breaks, setBreaks] = useState<{ push: Record<string, number>; pages: number; pageOf: Record<string, number> }>({ push: {}, pages: 1, pageOf: {} })
  const [, setTick] = useState(0)


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
      if (y + h > CONTENT_H && y > 0) {
        push[p.id] = CONTENT_H - y + MARGIN * 2 + GAP
        page++
        y = 0
      }
      pageOf[p.id] = page
      y += h
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
    if (nxt && i + 1 === ps.length - 1 && !nxt.text && !np.text) {
      return [ps.map((x) => (x.id === nxt.id ? { ...x, style: np.style } : x)), nxt.id]
    }
    const out = [...ps]
    out.splice(i + 1, 0, np)
    return [out, np.id]
  }

  const newId = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

  const change = (p: Para, value: string) => {
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
    const ta = e.currentTarget
    const human = document.activeElement === ta
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      spawned.current.delete(p.id)
      const base = paragraphs.find((x) => x.id === effActive) ?? p
      let newActive = ''
      if (base.id === p.id) {
        const caret = human ? (ta.selectionStart ?? p.text.length) : p.text.length
        const before = p.text.slice(0, caret)
        const after = p.text.slice(caret)
        onParagraphs((ps0) => {
          const ps = ps0.map((x) => (x.id === p.id ? { ...x, text: before } : x))
          const [out, id] = insertAfter(ps, p.id, { id: newId(), style: after ? p.style : nextStyle(p.style), text: after })
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

  // list numbering (restarts after any non-numbered paragraph)
  const numbers: Record<string, number> = {}
  let n = 0
  for (const p of paragraphs) {
    if (p.style === 'number') numbers[p.id] = ++n
    else n = 0
  }

  const pages = breaks.pages
  const totalH = pages * PAGE_H + (pages - 1) * GAP

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-[#E6E6E6]">
      <div className="py-5 flex justify-center min-w-fit">
        <div className="relative shrink-0" style={{ width: PAGE_W, height: totalH }}>
          {Array.from({ length: pages }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 bg-white"
              style={{ top: i * (PAGE_H + GAP), width: PAGE_W, height: PAGE_H, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 1.6px 3.6px rgba(0,0,0,0.13), 0 0.3px 0.9px rgba(0,0,0,0.11)' }}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget && i === pages - 1) {
                  const last = paragraphs[paragraphs.length - 1]
                  if (last) setActive(last.id)
                }
              }}
            >
            </div>
          ))}
          <div className="absolute" style={{ left: MARGIN, top: MARGIN, width: PAGE_W - MARGIN * 2 }}>
            {paragraphs.map((p) => {
              const s = STYLE_CSS[p.style]
              const list = p.style === 'bullet' || p.style === 'number'
              return (
                <div
                  key={p.id}
                  ref={(el) => {
                    if (el) wrapRefs.current.set(p.id, el)
                    else wrapRefs.current.delete(p.id)
                  }}
                  className="relative"
                  style={{ marginTop: breaks.push[p.id] ?? 0, paddingTop: s.before, paddingBottom: s.after, paddingLeft: list ? 48 : 0 }}
                >
                  {list && (
                    <span
                      className="absolute select-none pointer-events-none"
                      style={{ left: 24, top: s.before, fontFamily: s.font, fontSize: s.size, lineHeight: s.lh, color: '#000' }}
                    >
                      {p.style === 'bullet' ? '•' : `${numbers[p.id]}.`}
                    </span>
                  )}
                  <AutoTextarea
                    p={p}
                    active={p.id === effActive}
                    agent={p.id === effActive}
                    onChange={(v) => change(p, v)}
                    onKeyDown={(e) => keyDown(p, e)}
                    onActivate={() => {
                      if (activeId !== p.id) setActive(p.id)
                      spawned.current.delete(p.id)
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
