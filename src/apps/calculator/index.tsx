import { useEffect, useRef, useState } from 'react'
import { Navigation20Regular, History20Regular, Backspace20Regular } from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'

type Op = '+' | '−' | '×' | '÷'

const fmt = (n: number) => {
  if (!isFinite(n)) return 'Cannot divide by zero'
  const r = parseFloat(n.toPrecision(16))
  if (Math.abs(r) >= 1e16 || (Math.abs(r) < 1e-9 && r !== 0)) return r.toExponential(9).replace('e+', 'e+')
  const [i, d] = String(r).split('.')
  return Number(i).toLocaleString('en-US') + (d ? '.' + d : '')
}
const fmtEntry = (s: string) => {
  const neg = s.startsWith('-')
  const [i, d] = s.replace('-', '').split('.')
  return (neg ? '-' : '') + Number(i || '0').toLocaleString('en-US') + (d !== undefined ? '.' + d : '')
}
const apply = (a: number, op: Op, b: number) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b)

export default function Calculator(_: AppProps) {
  const [entry, setEntry] = useState('0')
  const [acc, setAcc] = useState<number | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  const [fresh, setFresh] = useState(true)
  const [expr, setExpr] = useState('')
  const [last, setLast] = useState<{ op: Op; b: number } | null>(null)
  const [mem, setMem] = useState<number | null>(null)
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([])
  const [showHist, setShowHist] = useState(false)
  const [error, setError] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  const val = () => parseFloat(entry)
  const show = (n: number) => {
    if (!isFinite(n)) {
      setError(true)
      setEntry('Cannot divide by zero')
    } else setEntry(String(parseFloat(n.toPrecision(16))))
  }
  const clearAll = () => {
    setEntry('0')
    setAcc(null)
    setOp(null)
    setExpr('')
    setFresh(true)
    setError(false)
    setLast(null)
  }

  const digit = (d: string) => {
    if (error) clearAll()
    if (fresh || entry === '0') {
      setEntry(d === '.' ? '0.' : d)
      setFresh(false)
      if (!op && expr.endsWith('=')) setExpr('')
      return
    }
    if (d === '.' && entry.includes('.')) return
    if (entry.replace(/[-.]/g, '').length >= 16) return
    setEntry(entry + d)
  }
  const operator = (o: Op) => {
    if (error) return
    let a = val()
    if (op && acc !== null && !fresh) {
      a = apply(acc, op, val())
      show(a)
    } else if (op && fresh) a = acc ?? a
    setAcc(a)
    setOp(o)
    setExpr(`${fmt(a)} ${o}`)
    setFresh(true)
  }
  const equals = () => {
    if (error) return clearAll()
    if (op && acc !== null) {
      const b = val()
      const r = apply(acc, op, b)
      const e = `${fmt(acc)} ${op} ${fmt(b)} =`
      setExpr(e)
      show(r)
      setHistory((h) => [{ expr: e, result: fmt(r) }, ...h].slice(0, 20))
      setLast({ op, b })
      setAcc(null)
      setOp(null)
    } else if (last) {
      const a = val()
      const r = apply(a, last.op, last.b)
      const e = `${fmt(a)} ${last.op} ${fmt(last.b)} =`
      setExpr(e)
      show(r)
      setHistory((h) => [{ expr: e, result: fmt(r) }, ...h].slice(0, 20))
    } else setExpr(`${fmt(val())} =`)
    setFresh(true)
  }
  const unary = (k: string) => {
    if (error) return
    const x = val()
    let r = x
    let label = ''
    if (k === 'inv') {
      r = 1 / x
      label = `1/(${fmt(x)})`
    } else if (k === 'sqr') {
      r = x * x
      label = `sqr(${fmt(x)})`
    } else if (k === 'sqrt') {
      r = Math.sqrt(x)
      label = `√(${fmt(x)})`
    }
    setExpr(op && acc !== null ? `${fmt(acc)} ${op} ${label}` : label)
    show(r)
    setFresh(true)
  }
  const percent = () => {
    if (error) return
    const x = val()
    const r = op && acc !== null ? (op === '+' || op === '−' ? (acc * x) / 100 : x / 100) : 0
    show(r)
    setExpr(op && acc !== null ? `${fmt(acc)} ${op} ${fmt(r)}` : fmt(r))
    setFresh(true)
  }
  const back = () => {
    if (error) return clearAll()
    if (fresh) {
      if (expr.endsWith('=')) setExpr('')
      return
    }
    const s = entry.length <= 1 || (entry.length === 2 && entry.startsWith('-')) ? '0' : entry.slice(0, -1)
    setEntry(s)
  }
  const negate = () => {
    if (error || entry === '0') return
    setEntry(entry.startsWith('-') ? entry.slice(1) : '-' + entry)
  }
  const ce = () => {
    if (error) return clearAll()
    setEntry('0')
    setFresh(true)
    if (expr.endsWith('=')) setExpr('')
  }

  const press = (k: string) => {
    if (/^[0-9.]$/.test(k)) digit(k)
    else if (['+', '−', '×', '÷'].includes(k)) operator(k as Op)
    else if (k === '=') equals()
    else if (k === 'C') clearAll()
    else if (k === 'CE') ce()
    else if (k === 'back') back()
    else if (k === 'neg') negate()
    else if (k === '%') percent()
    else unary(k)
  }

  useEffect(() => root.current?.focus(), [])
  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, string> = { '+': '+', '-': '−', '*': '×', x: '×', '/': '÷', Enter: '=', '=': '=', Backspace: 'back', Escape: 'C', Delete: 'CE', '%': '%', r: 'inv', '@': 'sqrt', q: 'sqr' }
    if (/^[0-9.]$/.test(e.key)) press(e.key)
    else if (map[e.key]) {
      e.preventDefault()
      press(map[e.key])
    }
  }

  const display = error ? entry : fresh ? fmt(val()) : fmtEntry(entry)
  const size = display.length > 16 ? 26 : display.length > 13 ? 32 : display.length > 10 ? 38 : 46

  const keys: [string, string, 'fn' | 'num' | 'eq'][] = [
    ['%', '%', 'fn'], ['CE', 'CE', 'fn'], ['C', 'C', 'fn'], ['back', '⌫', 'fn'],
    ['inv', '⅟𝑥', 'fn'], ['sqr', '𝑥²', 'fn'], ['sqrt', '²√𝑥', 'fn'], ['÷', '÷', 'fn'],
    ['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'], ['×', '×', 'fn'],
    ['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'], ['−', '−', 'fn'],
    ['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'], ['+', '+', 'fn'],
    ['neg', '+/−', 'num'], ['0', '0', 'num'], ['.', '.', 'num'], ['=', '=', 'eq'],
  ]
  const agentId = (k: string) => `calc-${({ '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divide', '=': 'equals', '.': 'decimal', '%': 'percent' } as any)[k] ?? k.toLowerCase()}`

  return (
    <div ref={root} tabIndex={0} onKeyDown={onKey} className="flex-1 min-h-0 flex flex-col bg-[#F3F3F3] outline-none relative select-none" style={{ fontFamily: 'var(--font-win)' }}>
      <div className="flex items-center h-11 px-1.5 shrink-0">
        <button aria-label="Open Navigation" className="w-10 h-9 rounded-[4px] hover:bg-black/[0.05] flex items-center justify-center"><Navigation20Regular /></button>
        <span className="text-[20px] font-semibold ml-2">Standard</span>
        <button aria-label="Keep on top" className="w-8 h-8 ml-2 rounded-[4px] hover:bg-black/[0.05] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"><rect x="1.5" y="3.5" width="13" height="10" rx="1.5" /><rect x="8" y="3.5" width="6.5" height="5" rx="1" fill="currentColor" /></svg>
        </button>
        <div className="flex-1" />
        <button data-agent="calc-history" aria-label="History" onClick={() => setShowHist(!showHist)} className="w-10 h-9 rounded-[4px] hover:bg-black/[0.05] flex items-center justify-center"><History20Regular /></button>
      </div>
      <div className="px-3 pt-2 text-right shrink-0">
        <div data-agent="calc-expression" className="h-5 text-[14px] text-[#5F5F5F] truncate">{expr}</div>
        <div data-agent="calc-display" aria-label={`Display is ${display}`} className="font-semibold text-[#1A1A1A] leading-[64px] h-[64px] truncate" style={{ fontSize: size }}>
          {display}
        </div>
      </div>
      <div className="flex px-1 mt-1 mb-1 shrink-0">
        {[
          ['MC', () => setMem(null), mem === null],
          ['MR', () => mem !== null && (setEntry(String(mem)), setFresh(true)), mem === null],
          ['M+', () => setMem((mem ?? 0) + val()), false],
          ['M-', () => setMem((mem ?? 0) - val()), false],
          ['MS', () => setMem(val()), false],
          ['M˅', () => {}, mem === null],
        ].map(([l, fn, dis]: any) => (
          <button key={l} data-agent={`calc-mem-${String(l).toLowerCase().replace('+', 'plus').replace('-', 'minus').replace('˅', 'list')}`} disabled={dis} onClick={fn} className="flex-1 h-8 rounded-[4px] text-[12px] font-semibold hover:bg-black/[0.05] disabled:text-[#A0A0A0] disabled:hover:bg-transparent">
            {l}
          </button>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-4 gap-[2px] px-[3px] pb-[3px]">
        {keys.map(([k, l, kind]) => (
          <button
            key={k}
            data-agent={agentId(k)}
            aria-label={l}
            onClick={() => press(k)}
            className={`rounded-[4px] border border-black/[0.05] shadow-[0_1px_0_rgba(0,0,0,0.06)] ${
              kind === 'eq'
                ? 'bg-[#005FB8] hover:bg-[#1A6FC0] text-white text-[20px]'
                : kind === 'num'
                  ? 'bg-[#FFFFFF] hover:bg-[#F9F9F9] text-[#1A1A1A] text-[16px] font-semibold'
                  : 'bg-[#F9F9F9] hover:bg-[#F3F3F3] text-[#1A1A1A] text-[15px]'
            }`}
          >
            {k === 'back' ? <Backspace20Regular className="mx-auto" /> : l}
          </button>
        ))}
      </div>
      {showHist && (
        <div className="absolute left-0 right-0 bottom-0 top-[150px] bg-[#F9F9F9] border-t border-black/10 shadow-[0_-8px_16px_rgba(0,0,0,0.1)] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-4 pt-3 pb-2 text-[14px] font-semibold">History</div>
          <div className="flex-1 overflow-auto px-2">
            {history.length === 0 ? (
              <div className="px-2 text-[13px] text-[#5F5F5F]">There’s no history yet</div>
            ) : (
              history.map((h, i) => (
                <button key={i} onClick={() => { setEntry(h.result.replace(/,/g, '')); setFresh(true); setShowHist(false) }} className="w-full text-right px-3 py-2 rounded hover:bg-black/[0.05]">
                  <div className="text-[12px] text-[#5F5F5F]">{h.expr}</div>
                  <div className="text-[20px] font-semibold">{h.result}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
