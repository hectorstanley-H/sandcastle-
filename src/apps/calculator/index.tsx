import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Navigation20Regular,
  History20Regular,
  Backspace20Regular,
  Delete20Regular,
  Calculator20Regular,
  CalculatorMultiple20Regular,
  Calendar20Regular,
  Money20Regular,
  Beaker20Regular,
  Ruler20Regular,
  Scales20Regular,
  Temperature20Regular,
  Flash20Regular,
  SlideSize20Regular,
  TopSpeed20Regular,
  Clock20Regular,
  Database20Regular,
  Gauge20Regular,
  TriangleRight20Regular,
  Settings20Regular,
  ArrowSort20Regular,
  ChevronDown12Regular,
  ArrowExpand20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { db, useRecord } from '@/db/db'

/** calculator.prefs: { id: 'prefs', mode, theme } — remembered like the real app */

type Op = '+' | '−' | '×' | '÷'
type SciOp = Op | 'mod' | '^' | 'yroot' | 'logy'
type Mode = 'standard' | 'scientific' | 'date' | ConvId
type ConvId = 'currency' | 'volume' | 'length' | 'weight' | 'temperature' | 'energy' | 'area' | 'speed' | 'time' | 'power' | 'data' | 'pressure' | 'angle'
type Theme = 'light' | 'dark' | 'system'

const fmt = (n: number) => {
  if (!isFinite(n)) return 'Cannot divide by zero'
  const r = parseFloat(n.toPrecision(16))
  if (Math.abs(r) >= 1e16 || (Math.abs(r) < 1e-9 && r !== 0)) return r.toExponential(9).replace('e+', 'e+')
  const [i, d] = String(r).split('.')
  return Number(i).toLocaleString('en-US') + (d ? '.' + d : '')
}
const fmtEntry = (s: string) => {
  if (/e/i.test(s)) return s
  const neg = s.startsWith('-')
  const [i, d] = s.replace('-', '').split('.')
  return (neg ? '-' : '') + Number(i || '0').toLocaleString('en-US') + (d !== undefined ? '.' + d : '')
}
const apply = (a: number, op: Op, b: number) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b)

/* ───────── scientific expression evaluator (operator precedence, parentheses) ───────── */

type Tok = { t: 'num'; v: number; label: string } | { t: 'op'; v: SciOp } | { t: '(' } | { t: ')' }
const PREC: Record<SciOp, number> = { '+': 1, '−': 1, '×': 2, '÷': 2, mod: 2, '^': 3, yroot: 3, logy: 3 }
const OP_LABEL: Record<SciOp, string> = { '+': '+', '−': '−', '×': '×', '÷': '÷', mod: 'mod', '^': '^', yroot: 'yroot', logy: 'log base' }
const applySci = (a: number, op: SciOp, b: number) => {
  switch (op) {
    case 'mod':
      return a - b * Math.floor(a / b)
    case '^':
      return Math.pow(a, b)
    case 'yroot':
      return a < 0 && Math.round(b) % 2 === 1 ? -Math.pow(-a, 1 / b) : Math.pow(a, 1 / b)
    case 'logy':
      return Math.log(a) / Math.log(b)
    default:
      return apply(a, op, b)
  }
}
function evalTokens(tokens: Tok[]): number {
  const out: number[] = []
  const ops: (SciOp | '(')[] = []
  const reduce = () => {
    const op = ops.pop() as SciOp
    const b = out.pop() ?? 0
    const a = out.pop() ?? 0
    out.push(applySci(a, op, b))
  }
  for (const tk of tokens) {
    if (tk.t === 'num') out.push(tk.v)
    else if (tk.t === '(') ops.push('(')
    else if (tk.t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') reduce()
      ops.pop()
    } else {
      const p = PREC[tk.v]
      const rightAssoc = tk.v === '^' || tk.v === 'yroot'
      while (ops.length) {
        const top = ops[ops.length - 1]
        if (top === '(') break
        const tp = PREC[top]
        if (tp > p || (tp === p && !rightAssoc)) reduce()
        else break
      }
      ops.push(tk.v)
    }
  }
  while (ops.length) {
    if (ops[ops.length - 1] === '(') ops.pop()
    else reduce()
  }
  return out.pop() ?? 0
}
const tokLabel = (tk: Tok) => (tk.t === 'num' ? tk.label : tk.t === 'op' ? OP_LABEL[tk.v] : tk.t)
const factorial = (n: number) => {
  if (n < 0 || !Number.isInteger(n)) return NaN
  if (n > 170) return Infinity
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

/* ───────── unit converters ───────── */

interface Unit {
  name: string
  abbr: string
  toBase: (v: number) => number
  fromBase: (b: number) => number
}
const lin = (name: string, abbr: string, factor: number): Unit => ({ name, abbr, toBase: (v) => v * factor, fromBase: (b) => b / factor })

const CONVERTERS: Record<ConvId, { label: string; icon: any; units: Unit[]; def: [number, number] }> = {
  currency: {
    label: 'Currency',
    icon: Money20Regular,
    units: [
      lin('United States - Dollar', 'USD', 1),
      lin('Europe - Euro', 'EUR', 1.0842),
      lin('United Kingdom - Pound', 'GBP', 1.2731),
      lin('Japan - Yen', 'JPY', 0.006652),
      lin('Canada - Dollar', 'CAD', 0.7298),
      lin('Australia - Dollar', 'AUD', 0.6614),
      lin('Switzerland - Franc', 'CHF', 1.1318),
      lin('China - Yuan', 'CNY', 0.1386),
      lin('India - Rupee', 'INR', 0.01189),
      lin('Mexico - Peso', 'MXN', 0.05791),
    ],
    def: [0, 1],
  },
  volume: {
    label: 'Volume',
    icon: Beaker20Regular,
    units: [
      lin('Milliliters', 'mL', 0.001),
      lin('Liters', 'L', 1),
      lin('Cubic meters', 'm³', 1000),
      lin('Teaspoons (US)', 'tsp', 0.00492892),
      lin('Tablespoons (US)', 'tbsp', 0.0147868),
      lin('Fluid ounces (US)', 'fl oz', 0.0295735),
      lin('Cups (US)', 'cup', 0.236588),
      lin('Pints (US)', 'pt', 0.473176),
      lin('Quarts (US)', 'qt', 0.946353),
      lin('Gallons (US)', 'gal', 3.78541),
    ],
    def: [1, 9],
  },
  length: {
    label: 'Length',
    icon: Ruler20Regular,
    units: [
      lin('Millimeters', 'mm', 0.001),
      lin('Centimeters', 'cm', 0.01),
      lin('Meters', 'm', 1),
      lin('Kilometers', 'km', 1000),
      lin('Inches', 'in', 0.0254),
      lin('Feet', 'ft', 0.3048),
      lin('Yards', 'yd', 0.9144),
      lin('Miles', 'mi', 1609.344),
      lin('Nautical miles', 'NM', 1852),
    ],
    def: [3, 7],
  },
  weight: {
    label: 'Weight and mass',
    icon: Scales20Regular,
    units: [
      lin('Milligrams', 'mg', 0.000001),
      lin('Grams', 'g', 0.001),
      lin('Kilograms', 'kg', 1),
      lin('Metric tonnes', 't', 1000),
      lin('Ounces', 'oz', 0.0283495),
      lin('Pounds', 'lb', 0.453592),
      lin('Stone', 'st', 6.35029),
      lin('Short tons (US)', 'ton', 907.185),
    ],
    def: [2, 5],
  },
  temperature: {
    label: 'Temperature',
    icon: Temperature20Regular,
    units: [
      { name: 'Celsius', abbr: '°C', toBase: (v) => v, fromBase: (b) => b },
      { name: 'Fahrenheit', abbr: '°F', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (b) => (b * 9) / 5 + 32 },
      { name: 'Kelvin', abbr: 'K', toBase: (v) => v - 273.15, fromBase: (b) => b + 273.15 },
    ],
    def: [0, 1],
  },
  energy: {
    label: 'Energy',
    icon: Flash20Regular,
    units: [lin('Joules', 'J', 1), lin('Kilojoules', 'kJ', 1000), lin('Calories', 'cal', 4.184), lin('Food calories', 'kcal', 4184), lin('Watt-hours', 'Wh', 3600), lin('Kilowatt-hours', 'kWh', 3.6e6), lin('British thermal units', 'BTU', 1055.06)],
    def: [3, 1],
  },
  area: {
    label: 'Area',
    icon: SlideSize20Regular,
    units: [lin('Square centimeters', 'cm²', 0.0001), lin('Square meters', 'm²', 1), lin('Hectares', 'ha', 10000), lin('Square kilometers', 'km²', 1e6), lin('Square inches', 'in²', 0.00064516), lin('Square feet', 'ft²', 0.092903), lin('Acres', 'ac', 4046.86), lin('Square miles', 'mi²', 2.59e6)],
    def: [1, 5],
  },
  speed: {
    label: 'Speed',
    icon: TopSpeed20Regular,
    units: [lin('Meters per second', 'm/s', 1), lin('Kilometers per hour', 'km/h', 1 / 3.6), lin('Miles per hour', 'mph', 0.44704), lin('Feet per second', 'ft/s', 0.3048), lin('Knots', 'kn', 0.514444)],
    def: [1, 2],
  },
  time: {
    label: 'Time',
    icon: Clock20Regular,
    units: [lin('Milliseconds', 'ms', 0.001), lin('Seconds', 's', 1), lin('Minutes', 'min', 60), lin('Hours', 'h', 3600), lin('Days', 'd', 86400), lin('Weeks', 'wk', 604800), lin('Years', 'yr', 31557600)],
    def: [3, 2],
  },
  power: {
    label: 'Power',
    icon: Flash20Regular,
    units: [lin('Watts', 'W', 1), lin('Kilowatts', 'kW', 1000), lin('Horsepower (US)', 'hp', 745.7), lin('BTUs per minute', 'BTU/min', 17.5843)],
    def: [1, 2],
  },
  data: {
    label: 'Data',
    icon: Database20Regular,
    units: [lin('Bits', 'b', 0.125), lin('Bytes', 'B', 1), lin('Kilobytes', 'KB', 1e3), lin('Megabytes', 'MB', 1e6), lin('Gigabytes', 'GB', 1e9), lin('Terabytes', 'TB', 1e12), lin('Kibibytes', 'KiB', 1024), lin('Mebibytes', 'MiB', 1048576), lin('Gibibytes', 'GiB', 1073741824)],
    def: [4, 3],
  },
  pressure: {
    label: 'Pressure',
    icon: Gauge20Regular,
    units: [lin('Pascals', 'Pa', 1), lin('Kilopascals', 'kPa', 1000), lin('Bars', 'bar', 100000), lin('Atmospheres', 'atm', 101325), lin('Pounds per square inch', 'psi', 6894.76), lin('Millimeters of mercury', 'mmHg', 133.322)],
    def: [3, 4],
  },
  angle: {
    label: 'Angle',
    icon: TriangleRight20Regular,
    units: [lin('Degrees', 'deg', Math.PI / 180), lin('Radians', 'rad', 1), lin('Gradians', 'grad', Math.PI / 200)],
    def: [0, 1],
  },
}

const MODE_TITLE = (m: Mode) => (m === 'standard' ? 'Standard' : m === 'scientific' ? 'Scientific' : m === 'date' ? 'Date calculation' : CONVERTERS[m].label)

/* ───────── theme ───────── */

const THEMES: Record<'light' | 'dark', Record<string, string>> = {
  light: { '--c-bg': '#F3F3F3', '--c-num': '#FFFFFF', '--c-numh': '#F9F9F9', '--c-fn': '#F9F9F9', '--c-fnh': '#F3F3F3', '--c-tx': '#1A1A1A', '--c-sub': '#5F5F5F', '--c-dis': '#A0A0A0', '--c-panel': '#F9F9F9', '--c-hov': 'rgba(0,0,0,0.05)', '--c-acc': '#005FB8', '--c-acch': '#1A6FC0', '--c-acctx': '#FFFFFF', '--c-bd': 'rgba(0,0,0,0.05)', '--c-in': '#FFFFFF' },
  dark: { '--c-bg': '#202020', '--c-num': '#3B3B3B', '--c-numh': '#323232', '--c-fn': '#323232', '--c-fnh': '#3B3B3B', '--c-tx': '#FFFFFF', '--c-sub': '#C5C5C5', '--c-dis': '#6E6E6E', '--c-panel': '#2B2B2B', '--c-hov': 'rgba(255,255,255,0.07)', '--c-acc': '#4CC2FF', '--c-acch': '#48B1E8', '--c-acctx': '#000000', '--c-bd': 'rgba(255,255,255,0.04)', '--c-in': '#2D2D2D' },
}

function Key({ agent, label, kind, onClick, children, on, small }: { agent?: string; label: string; kind: 'fn' | 'num' | 'eq'; onClick: () => void; children?: React.ReactNode; on?: boolean; small?: boolean }) {
  return (
    <button
      data-agent={agent}
      aria-label={label}
      onClick={onClick}
      className={`rounded-[4px] border border-[var(--c-bd)] shadow-[0_1px_0_rgba(0,0,0,0.06)] ${
        kind === 'eq'
          ? 'bg-[var(--c-acc)] hover:bg-[var(--c-acch)] text-[var(--c-acctx)] text-[20px]'
          : kind === 'num'
            ? `bg-[var(--c-num)] hover:bg-[var(--c-numh)] text-[var(--c-tx)] ${small ? 'text-[14px]' : 'text-[16px]'} font-semibold`
            : `${on ? 'bg-[var(--c-acc)] text-[var(--c-acctx)]' : 'bg-[var(--c-fn)] hover:bg-[var(--c-fnh)] text-[var(--c-tx)]'} ${small ? 'text-[13px]' : 'text-[15px]'}`
      }`}
    >
      {children ?? label}
    </button>
  )
}

export default function Calculator(_: AppProps) {
  const prefs = useRecord('calculator.prefs', 'prefs')
  const mode: Mode = (prefs?.mode as Mode) ?? 'standard'
  const theme: Theme = (prefs?.theme as Theme) ?? 'light'
  const setPrefs = (p: Record<string, any>) => db.upsert('calculator.prefs', { id: 'prefs', mode, theme, ...p })

  const [entry, setEntry] = useState('0')
  const [acc, setAcc] = useState<number | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  const [fresh, setFresh] = useState(true)
  const [expr, setExpr] = useState('')
  const [last, setLast] = useState<{ op: Op; b: number } | null>(null)
  const [mem, setMem] = useState<number[]>([])
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([])
  const [panel, setPanel] = useState<null | 'history' | 'memory'>(null)
  const [nav, setNav] = useState(false)
  const [onTop, setOnTop] = useState(false)
  const [error, setError] = useState(false)
  // scientific
  const [tokens, setTokens] = useState<Tok[]>([])
  const [entryLabel, setEntryLabel] = useState<string | null>(null)
  const [pending, setPending] = useState(true) // the displayed entry still has to be pushed as an operand
  const [justOp, setJustOp] = useState(false)
  const [angle, setAngle] = useState<'DEG' | 'RAD' | 'GRAD'>('DEG')
  const [second, setSecond] = useState(false)
  const [hyp, setHyp] = useState(false)
  const [fe, setFe] = useState(false)
  const [drop, setDrop] = useState<null | 'trig' | 'func'>(null)
  const root = useRef<HTMLDivElement>(null)

  const sci = mode === 'scientific'
  const isCalc = mode === 'standard' || mode === 'scientific'

  const val = () => parseFloat(entry)
  const show = (n: number) => {
    if (!isFinite(n) || isNaN(n)) {
      setError(true)
      setEntry(isNaN(n) ? 'Invalid input' : 'Cannot divide by zero')
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
    setTokens([])
    setEntryLabel(null)
    setPending(true)
    setJustOp(false)
  }
  const pushHistory = (e: string, r: number) => setHistory((h) => [{ expr: e, result: fmt(r) }, ...h].slice(0, 50))

  /* ── shared keys ── */
  const digit = (d: string) => {
    if (error) clearAll()
    if (sci) {
      if (expr.endsWith('=')) {
        setTokens([])
        setExpr('')
      } else if (!pending && tokens.length && tokens[tokens.length - 1].t === ')') {
        // typing a number right after ")" multiplies, like the real app
        setTokens((t) => [...t, { t: 'op', v: '×' }])
      }
      setPending(true)
      setJustOp(false)
      setEntryLabel(null)
    }
    if (fresh || entry === '0') {
      setEntry(d === '.' ? '0.' : d)
      setFresh(false)
      if (!sci && !op && expr.endsWith('=')) setExpr('')
      return
    }
    if (d === '.' && (entry.includes('.') || /e/i.test(entry))) return
    if (entry.replace(/[-.]/g, '').length >= 16) return
    setEntry(entry + d)
  }
  const back = () => {
    if (error) return clearAll()
    if (fresh) {
      if (expr.endsWith('=')) setExpr('')
      return
    }
    const s = entry.length <= 1 || (entry.length === 2 && entry.startsWith('-')) ? '0' : entry.slice(0, -1).replace(/e[+-]?$/i, '')
    setEntry(s)
  }
  const negate = () => {
    if (error || entry === '0') return
    if (/e[+-]/i.test(entry) && !fresh) return setEntry(entry.replace(/e([+-])/i, (_, s) => `e${s === '+' ? '-' : '+'}`))
    setEntry(entry.startsWith('-') ? entry.slice(1) : '-' + entry)
    if (sci) setPending(true)
  }
  const ce = () => {
    if (error) return clearAll()
    setEntry('0')
    setFresh(true)
    setEntryLabel(null)
    if (expr.endsWith('=')) setExpr('')
  }

  /* ── standard engine (immediate execution) ── */
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
      pushHistory(e, r)
      setLast({ op, b })
      setAcc(null)
      setOp(null)
    } else if (last) {
      const a = val()
      const r = apply(a, last.op, last.b)
      const e = `${fmt(a)} ${last.op} ${fmt(last.b)} =`
      setExpr(e)
      show(r)
      pushHistory(e, r)
    } else setExpr(`${fmt(val())} =`)
    setFresh(true)
  }
  const unaryStd = (k: string) => {
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

  /* ── scientific engine (precedence + parentheses) ── */
  const sciExpr = (tks: Tok[], tail?: string | null) => [...tks.map(tokLabel), ...(tail ? [tail] : [])].join(' ').replace(/\( /g, '(').replace(/ \)/g, ')')
  const operand = (): Tok => ({ t: 'num', v: val(), label: entryLabel ?? fmt(val()) })
  const sciOperator = (o: SciOp) => {
    if (error) return
    let tks = expr.endsWith('=') ? [] : tokens
    if (justOp && tks.length && tks[tks.length - 1].t === 'op') tks = tks.slice(0, -1)
    else if (pending) tks = [...tks, operand()]
    tks = [...tks, { t: 'op', v: o }]
    setTokens(tks)
    setExpr(sciExpr(tks))
    // show the running value of the completed part, like Windows does
    const open = tks.filter((t) => t.t === '(').length - tks.filter((t) => t.t === ')').length
    if (!open) {
      const r = evalTokens(tks.slice(0, -1))
      if (isFinite(r)) setEntry(String(parseFloat(r.toPrecision(16))))
    }
    setFresh(true)
    setPending(true)
    setJustOp(true)
    setEntryLabel(null)
  }
  const openParen = () => {
    if (error) clearAll()
    let tks = expr.endsWith('=') ? [] : tokens
    if (!fresh && pending && !justOp && tks.length === 0 && entry !== '0') tks = [operand(), { t: 'op', v: '×' }]
    else if (!justOp && tks.length && (tks[tks.length - 1].t === ')' || (!fresh && pending))) tks = [...tks, ...(pending && !fresh ? [operand()] : []), { t: 'op', v: '×' } as Tok]
    tks = [...tks, { t: '(' }]
    setTokens(tks)
    setExpr(sciExpr(tks))
    setEntry('0')
    setFresh(true)
    setPending(true)
    setJustOp(true)
    setEntryLabel(null)
  }
  const closeParen = () => {
    if (error) return
    const open = tokens.filter((t) => t.t === '(').length - tokens.filter((t) => t.t === ')').length
    if (open <= 0) return
    let tks = tokens
    if (pending) tks = [...tks, operand()]
    tks = [...tks, { t: ')' }]
    // value of the group just closed
    let depth = 0
    let i = tks.length - 1
    for (; i >= 0; i--) {
      if (tks[i].t === ')') depth++
      else if (tks[i].t === '(' && --depth === 0) break
    }
    const r = evalTokens(tks.slice(i + 1, -1))
    setTokens(tks)
    setExpr(sciExpr(tks))
    show(r)
    setFresh(true)
    setPending(false)
    setJustOp(false)
    setEntryLabel(null)
  }
  const sciEquals = () => {
    if (error) return clearAll()
    if (expr.endsWith('=') || (!tokens.length && pending && !entryLabel)) {
      setExpr(`${entryLabel ?? fmt(val())} =`)
      setFresh(true)
      return
    }
    let tks = tokens
    if (pending) tks = [...tks, operand()]
    const open = tks.filter((t) => t.t === '(').length - tks.filter((t) => t.t === ')').length
    for (let i = 0; i < open; i++) tks = [...tks, { t: ')' }]
    const r = evalTokens(tks)
    const e = `${sciExpr(tks)} =`
    setExpr(e)
    show(r)
    if (isFinite(r)) pushHistory(e, r)
    setTokens([])
    setFresh(true)
    setPending(true)
    setJustOp(false)
    setEntryLabel(null)
  }
  const toRad = (x: number) => (angle === 'DEG' ? (x * Math.PI) / 180 : angle === 'GRAD' ? (x * Math.PI) / 200 : x)
  const fromRad = (x: number) => (angle === 'DEG' ? (x * 180) / Math.PI : angle === 'GRAD' ? (x * 200) / Math.PI : x)
  const clean = (x: number) => (Math.abs(x) < 1e-15 ? 0 : x)
  const UNARY: Record<string, [(x: number) => number, (s: string) => string]> = {
    inv: [(x) => 1 / x, (s) => `1/(${s})`],
    sqr: [(x) => x * x, (s) => `sqr(${s})`],
    cube: [(x) => x * x * x, (s) => `cube(${s})`],
    sqrt: [(x) => Math.sqrt(x), (s) => `√(${s})`],
    cbrt: [(x) => Math.cbrt(x), (s) => `cuberoot(${s})`],
    abs: [(x) => Math.abs(x), (s) => `abs(${s})`],
    floor: [(x) => Math.floor(x), (s) => `floor(${s})`],
    ceil: [(x) => Math.ceil(x), (s) => `ceil(${s})`],
    fact: [factorial, (s) => `fact(${s})`],
    pow10: [(x) => Math.pow(10, x), (s) => `10^(${s})`],
    pow2: [(x) => Math.pow(2, x), (s) => `2^(${s})`],
    log: [(x) => Math.log10(x), (s) => `log(${s})`],
    ln: [(x) => Math.log(x), (s) => `ln(${s})`],
    epow: [(x) => Math.exp(x), (s) => `e^(${s})`],
    sin: [(x) => clean(Math.sin(toRad(x))), (s) => `sin${angle === 'DEG' ? '₀' : angle === 'GRAD' ? 'ᵍ' : 'ᵣ'}(${s})`],
    cos: [(x) => clean(Math.cos(toRad(x))), (s) => `cos${angle === 'DEG' ? '₀' : angle === 'GRAD' ? 'ᵍ' : 'ᵣ'}(${s})`],
    tan: [(x) => clean(Math.tan(toRad(x))), (s) => `tan${angle === 'DEG' ? '₀' : angle === 'GRAD' ? 'ᵍ' : 'ᵣ'}(${s})`],
    asin: [(x) => fromRad(Math.asin(x)), (s) => `sin⁻¹(${s})`],
    acos: [(x) => fromRad(Math.acos(x)), (s) => `cos⁻¹(${s})`],
    atan: [(x) => fromRad(Math.atan(x)), (s) => `tan⁻¹(${s})`],
    sinh: [(x) => Math.sinh(x), (s) => `sinh(${s})`],
    cosh: [(x) => Math.cosh(x), (s) => `cosh(${s})`],
    tanh: [(x) => Math.tanh(x), (s) => `tanh(${s})`],
    asinh: [(x) => Math.asinh(x), (s) => `sinh⁻¹(${s})`],
    acosh: [(x) => Math.acosh(x), (s) => `cosh⁻¹(${s})`],
    atanh: [(x) => Math.atanh(x), (s) => `tanh⁻¹(${s})`],
  }
  const sciUnary = (k: string) => {
    if (error) return
    const [f, lab] = UNARY[k]
    let tks = expr.endsWith('=') ? [] : tokens
    let x = val()
    let inner = entryLabel ?? fmt(x)
    if (!pending && tks.length && tks[tks.length - 1].t === ')') {
      // apply to the whole parenthesised group
      let depth = 0
      let i = tks.length - 1
      for (; i >= 0; i--) {
        if (tks[i].t === ')') depth++
        else if (tks[i].t === '(' && --depth === 0) break
      }
      inner = sciExpr(tks.slice(i))
      x = evalTokens(tks.slice(i + 1, -1))
      tks = tks.slice(0, i)
    }
    const r = f(x)
    const label = lab(inner)
    setTokens(tks)
    setExpr(sciExpr(tks, label))
    show(r)
    setEntryLabel(label)
    setFresh(true)
    setPending(true)
    setJustOp(false)
  }
  const constant = (k: 'pi' | 'e' | 'rand') => {
    if (error) clearAll()
    if (expr.endsWith('=')) {
      setTokens([])
      setExpr('')
    }
    const v = k === 'pi' ? Math.PI : k === 'e' ? Math.E : Math.random()
    setEntry(String(v))
    setEntryLabel(k === 'rand' ? null : k === 'pi' ? 'π' : 'e')
    setFresh(true)
    setPending(true)
    setJustOp(false)
  }
  const expKey = () => {
    if (error) return
    if (fresh) {
      setEntry('0e+')
      setFresh(false)
    } else if (!/e/i.test(entry)) setEntry(entry + 'e+')
    setPending(true)
    setJustOp(false)
  }

  /* ── memory (a stack, like the real app) ── */
  const memStore = () => !error && setMem((m) => [val(), ...m])
  const memAdd = (sign: 1 | -1, i = 0) => !error && setMem((m) => (m.length ? m.map((x, j) => (j === i ? x + sign * val() : x)) : [sign * val()]))
  const memRecall = (i = 0) => {
    if (!mem.length) return
    setEntry(String(mem[i]))
    setFresh(true)
    setError(false)
    setEntryLabel(null)
    if (sci) setPending(true)
  }

  const press = (k: string) => {
    if (/^[0-9.]$/.test(k)) digit(k)
    else if (k === 'C') clearAll()
    else if (k === 'CE') ce()
    else if (k === 'back') back()
    else if (k === 'neg') negate()
    else if (sci) {
      if (['+', '−', '×', '÷', 'mod', '^', 'yroot', 'logy'].includes(k)) sciOperator(k as SciOp)
      else if (k === '=') sciEquals()
      else if (k === '(') openParen()
      else if (k === ')') closeParen()
      else if (k === 'pi' || k === 'e' || k === 'rand') constant(k)
      else if (k === 'exp') expKey()
      else if (k === '%') return
      else if (UNARY[k]) sciUnary(k)
    } else {
      if (['+', '−', '×', '÷'].includes(k)) operator(k as Op)
      else if (k === '=') equals()
      else if (k === '%') percent()
      else if (['inv', 'sqr', 'sqrt'].includes(k)) unaryStd(k)
    }
  }

  const switchMode = (m: Mode) => {
    setNav(false)
    setPanel(null)
    setDrop(null)
    if (m !== mode) {
      clearAll()
      setPrefs({ mode: m })
    }
    setTimeout(() => root.current?.focus(), 0)
  }

  useEffect(() => root.current?.focus(), [])
  const onKey = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT') return
    if (e.altKey && /^[1-5]$/.test(e.key)) {
      e.preventDefault()
      const m = ({ '1': 'standard', '2': 'scientific', '5': 'date' } as Record<string, Mode>)[e.key]
      if (m) switchMode(m)
      return
    }
    if (!isCalc) return
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase()
      const act: Record<string, () => void> = { m: memStore, r: () => memRecall(), p: () => memAdd(1), q: () => memAdd(-1), l: () => setMem([]), h: () => setPanel((p) => (p === 'history' ? null : 'history')) }
      if (act[k]) {
        e.preventDefault()
        act[k]()
      }
      return
    }
    const map: Record<string, string> = { '+': '+', '-': '−', '*': '×', x: '×', '/': '÷', Enter: '=', '=': '=', Backspace: 'back', Escape: 'C', Delete: 'CE', '%': '%', r: 'inv', '@': 'sqrt', q: 'sqr', F9: 'neg' }
    if (sci) Object.assign(map, { '(': '(', ')': ')', '^': '^', y: '^', '!': 'fact', s: 'sin', o: 'cos', t: 'tan', l: 'log', n: 'ln', p: 'pi', e: 'e', '#': 'cube', '%': 'mod', '|': 'abs' })
    if (/^[0-9.]$/.test(e.key)) press(e.key)
    else if (map[e.key]) {
      e.preventDefault()
      press(map[e.key])
    }
  }

  const fmtSci = (n: number) => (fe && isFinite(n) ? n.toExponential().replace(/e\+?/, 'e+').replace('e+-', 'e-') : fmt(n))
  const display = error ? entry : fresh ? (sci ? fmtSci(val()) : fmt(val())) : fmtEntry(entry)
  const size = onTop ? (display.length > 13 ? 24 : 30) : display.length > 16 ? 26 : display.length > 13 ? 32 : display.length > 10 ? 38 : 46

  const keys: [string, string, 'fn' | 'num' | 'eq'][] = [
    ['%', '%', 'fn'], ['CE', 'CE', 'fn'], ['C', 'C', 'fn'], ['back', '⌫', 'fn'],
    ['inv', '⅟𝑥', 'fn'], ['sqr', '𝑥²', 'fn'], ['sqrt', '²√𝑥', 'fn'], ['÷', '÷', 'fn'],
    ['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'], ['×', '×', 'fn'],
    ['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'], ['−', '−', 'fn'],
    ['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'], ['+', '+', 'fn'],
    ['neg', '+/−', 'num'], ['0', '0', 'num'], ['.', '.', 'num'], ['=', '=', 'eq'],
  ]
  const sciKeys: [string, string, 'fn' | 'num' | 'eq'][] = [
    ['2nd', '2ⁿᵈ', 'fn'], ['pi', 'π', 'fn'], ['e', 'e', 'fn'], ['C', 'C', 'fn'], ['back', '⌫', 'fn'],
    [second ? 'cube' : 'sqr', second ? '𝑥³' : '𝑥²', 'fn'], ['inv', '⅟𝑥', 'fn'], ['abs', '|𝑥|', 'fn'], ['exp', 'exp', 'fn'], ['mod', 'mod', 'fn'],
    [second ? 'cbrt' : 'sqrt', second ? '³√𝑥' : '²√𝑥', 'fn'], ['(', '(', 'fn'], [')', ')', 'fn'], ['fact', 'n!', 'fn'], ['÷', '÷', 'fn'],
    [second ? 'yroot' : '^', second ? 'ʸ√𝑥' : '𝑥ʸ', 'fn'], ['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'], ['×', '×', 'fn'],
    [second ? 'pow2' : 'pow10', second ? '2ˣ' : '10ˣ', 'fn'], ['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'], ['−', '−', 'fn'],
    [second ? 'logy' : 'log', second ? 'logᵧ𝑥' : 'log', 'fn'], ['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'], ['+', '+', 'fn'],
    [second ? 'epow' : 'ln', second ? 'eˣ' : 'ln', 'fn'], ['neg', '+/−', 'num'], ['0', '0', 'num'], ['.', '.', 'num'], ['=', '=', 'eq'],
  ]
  const agentId = (k: string) => `calc-${({ '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divide', '=': 'equals', '.': 'decimal', '%': 'percent', '(': 'lparen', ')': 'rparen', '^': 'power' } as any)[k] ?? k.toLowerCase()}`
  const openParens = tokens.filter((t) => t.t === '(').length - tokens.filter((t) => t.t === ')').length

  const vars = THEMES[theme === 'dark' ? 'dark' : 'light'] as React.CSSProperties

  const memRow = (
    <div className="flex px-1 mt-1 mb-1 shrink-0">
      {[
        ['MC', () => setMem([]), mem.length === 0],
        ['MR', () => memRecall(), mem.length === 0],
        ['M+', () => memAdd(1), false],
        ['M-', () => memAdd(-1), false],
        ['MS', memStore, false],
        ['M˅', () => setPanel(panel === 'memory' ? null : 'memory'), mem.length === 0],
      ].map(([l, fn, dis]: any) => (
        <button key={l} data-agent={`calc-mem-${String(l).toLowerCase().replace('+', 'plus').replace('-', 'minus').replace('˅', 'list')}`} disabled={dis} onClick={fn} className="flex-1 h-8 rounded-[4px] text-[12px] font-semibold text-[var(--c-tx)] hover:bg-[var(--c-hov)] disabled:text-[var(--c-dis)] disabled:hover:bg-transparent">
          {l}
        </button>
      ))}
    </div>
  )

  return (
    <div ref={root} tabIndex={0} onKeyDown={onKey} onPointerDown={() => setDrop(null)} className="flex-1 min-h-0 flex flex-col bg-[var(--c-bg)] text-[var(--c-tx)] outline-none relative select-none overflow-hidden" style={{ fontFamily: 'var(--font-win)', ...vars }}>
      <div className="flex items-center h-11 px-1.5 shrink-0">
        {!onTop && (
          <button aria-label="Open Navigation" onClick={() => setNav(true)} className="w-10 h-9 rounded-[4px] hover:bg-[var(--c-hov)] flex items-center justify-center"><Navigation20Regular /></button>
        )}
        {!onTop && <span className="text-[20px] font-semibold ml-2 truncate" data-agent="calc-mode-title">{MODE_TITLE(mode)}</span>}
        {mode === 'standard' && (
          <button aria-label={onTop ? 'Back to full view' : 'Keep on top'} title={onTop ? 'Back to full view' : 'Keep on top'} data-agent="calc-keep-on-top" onClick={() => { setOnTop(!onTop); setPanel(null) }} className={`w-8 h-8 ${onTop ? '' : 'ml-2'} rounded-[4px] hover:bg-[var(--c-hov)] flex items-center justify-center`}>
            {onTop ? (
              <ArrowExpand20Regular />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"><rect x="1.5" y="3.5" width="13" height="10" rx="1.5" /><rect x="8" y="3.5" width="6.5" height="5" rx="1" fill="currentColor" /></svg>
            )}
          </button>
        )}
        <div className="flex-1" />
        {isCalc && !onTop && (
          <button data-agent="calc-history" aria-label="History" onClick={() => setPanel(panel === 'history' ? null : 'history')} className="w-10 h-9 rounded-[4px] hover:bg-[var(--c-hov)] flex items-center justify-center"><History20Regular /></button>
        )}
      </div>

      {isCalc && (
        <>
          <div className="px-3 pt-2 text-right shrink-0">
            <div data-agent="calc-expression" className="h-5 text-[14px] text-[var(--c-sub)] truncate">{expr}</div>
            <div data-agent="calc-display" aria-label={`Display is ${display}`} className={`font-semibold text-[var(--c-tx)] truncate ${onTop ? 'leading-[44px] h-[44px]' : 'leading-[64px] h-[64px]'}`} style={{ fontSize: size }}>
              {display}
            </div>
          </div>
          {sci && (
            <div className="flex items-center gap-1 px-1 shrink-0 relative" onPointerDown={(e) => e.stopPropagation()}>
              <button data-agent="calc-angle" aria-label={`Angle unit ${angle}`} onClick={() => setAngle(angle === 'DEG' ? 'RAD' : angle === 'RAD' ? 'GRAD' : 'DEG')} className="h-8 px-3 rounded-[4px] text-[12px] font-semibold hover:bg-[var(--c-hov)]">{angle}</button>
              <button data-agent="calc-fe" aria-pressed={fe} aria-label="Scientific notation" onClick={() => setFe(!fe)} className={`h-8 px-3 rounded-[4px] text-[12px] font-semibold ${fe ? 'text-[var(--c-acc)]' : ''} hover:bg-[var(--c-hov)]`}>F-E</button>
              <button data-agent="calc-trig" onClick={() => setDrop(drop === 'trig' ? null : 'trig')} className={`h-8 px-2.5 rounded-[4px] text-[12px] flex items-center gap-1 ${drop === 'trig' ? 'bg-[var(--c-hov)]' : 'hover:bg-[var(--c-hov)]'}`}>
                <TriangleRight20Regular className="w-4 h-4" /> Trigonometry <ChevronDown12Regular />
              </button>
              <button data-agent="calc-func" onClick={() => setDrop(drop === 'func' ? null : 'func')} className={`h-8 px-2.5 rounded-[4px] text-[12px] flex items-center gap-1 ${drop === 'func' ? 'bg-[var(--c-hov)]' : 'hover:bg-[var(--c-hov)]'}`}>
                <i className="not-italic font-serif">ƒ</i> Function <ChevronDown12Regular />
              </button>
              {drop && (
                <div className="absolute z-30 left-1 right-1 top-9 p-2 rounded-lg bg-[var(--c-panel)] border border-black/10 shadow-[0_8px_16px_rgba(0,0,0,0.18)] grid grid-cols-4 gap-1">
                  {(drop === 'trig'
                    ? [
                        ['2nd', '2ⁿᵈ', second],
                        ...(hyp
                          ? second ? [['asinh', 'sinh⁻¹'], ['acosh', 'cosh⁻¹'], ['atanh', 'tanh⁻¹']] : [['sinh', 'sinh'], ['cosh', 'cosh'], ['tanh', 'tanh']]
                          : second ? [['asin', 'sin⁻¹'], ['acos', 'cos⁻¹'], ['atan', 'tan⁻¹']] : [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']]),
                        ['hyp', 'hyp', hyp],
                      ]
                    : [['abs', '|𝑥|'], ['floor', '⌊𝑥⌋'], ['ceil', '⌈𝑥⌉'], ['rand', 'rand']]
                  ).map(([k, l, on]: any) => (
                    <Key
                      key={k}
                      agent={`calc-${k}`}
                      label={l}
                      kind="fn"
                      small
                      on={!!on}
                      onClick={() => {
                        if (k === '2nd') return setSecond(!second)
                        if (k === 'hyp') return setHyp(!hyp)
                        press(k)
                        setDrop(null)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {!onTop && memRow}
          {sci ? (
            <div className="flex-1 grid grid-cols-5 gap-[2px] px-[3px] pb-[3px]">
              {sciKeys.map(([k, l, kind]) => (
                <Key
                  key={k + l}
                  agent={agentId(k)}
                  label={l}
                  kind={kind}
                  small
                  on={k === '2nd' && second}
                  onClick={() => (k === '2nd' ? setSecond(!second) : press(k))}
                >
                  {k === 'back' ? <Backspace20Regular className="mx-auto" /> : k === '(' && openParens > 0 ? <span>(<sub className="text-[9px] ml-px">{openParens}</sub></span> : l}
                </Key>
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-4 gap-[2px] px-[3px] pb-[3px]">
              {keys.map(([k, l, kind]) => (
                <Key key={k} agent={agentId(k)} label={l} kind={kind} onClick={() => press(k)}>
                  {k === 'back' ? <Backspace20Regular className="mx-auto" /> : l}
                </Key>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'date' && <DateCalc />}
      {mode !== 'standard' && mode !== 'scientific' && mode !== 'date' && <Converter key={mode} id={mode} />}

      {/* history / memory flyout */}
      {panel && isCalc && (
        <div className="absolute left-0 right-0 bottom-0 top-[150px] z-20 bg-[var(--c-panel)] border-t border-black/10 shadow-[0_-8px_16px_rgba(0,0,0,0.1)] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="px-2 pt-2 flex gap-1 text-[14px] font-semibold">
            {(['history', 'memory'] as const).map((p) => (
              <button key={p} data-agent={`calc-panel-${p}`} onClick={() => setPanel(p)} className={`h-8 px-2 rounded-[4px] capitalize ${panel === p ? 'underline underline-offset-[10px] decoration-2 decoration-[var(--c-acc)]' : 'text-[var(--c-sub)] hover:bg-[var(--c-hov)]'}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto px-2 pt-2">
            {panel === 'history' ? (
              history.length === 0 ? (
                <div className="px-2 text-[13px] text-[var(--c-sub)]">There’s no history yet</div>
              ) : (
                history.map((h, i) => (
                  <button key={i} onClick={() => { clearAll(); setEntry(h.result.replace(/,/g, '')); setExpr(h.expr); setFresh(true); setPanel(null) }} className="w-full text-right px-3 py-2 rounded hover:bg-[var(--c-hov)]">
                    <div className="text-[12px] text-[var(--c-sub)]">{h.expr}</div>
                    <div className="text-[20px] font-semibold">{h.result}</div>
                  </button>
                ))
              )
            ) : mem.length === 0 ? (
              <div className="px-2 text-[13px] text-[var(--c-sub)]">There’s nothing saved in memory</div>
            ) : (
              mem.map((m, i) => (
                <div key={i} data-agent={`calc-memory-${i}`} onClick={() => { memRecall(i); setPanel(null) }} className="group w-full text-right px-3 py-2 rounded hover:bg-[var(--c-hov)] cursor-default">
                  <div className="text-[20px] font-semibold">{fmt(m)}</div>
                  <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100">
                    {[
                      ['MC', () => setMem((x) => x.filter((_, j) => j !== i))],
                      ['M+', () => memAdd(1, i)],
                      ['M-', () => memAdd(-1, i)],
                    ].map(([l, fn]: any) => (
                      <button key={l} onClick={(e) => { e.stopPropagation(); fn() }} className="h-6 px-2 rounded-[3px] border border-black/10 text-[11px] font-semibold hover:bg-[var(--c-hov)]">{l}</button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="h-11 flex items-center justify-end px-2 shrink-0">
            <button
              data-agent={panel === 'history' ? 'calc-history-clear' : 'calc-memory-clear'}
              aria-label={panel === 'history' ? 'Clear all history' : 'Clear all memory'}
              title={panel === 'history' ? 'Clear all history' : 'Clear all memory'}
              disabled={panel === 'history' ? !history.length : !mem.length}
              onClick={() => (panel === 'history' ? setHistory([]) : setMem([]))}
              className="w-9 h-9 rounded-[4px] hover:bg-[var(--c-hov)] flex items-center justify-center disabled:opacity-40"
            >
              <Delete20Regular />
            </button>
          </div>
        </div>
      )}

      {/* navigation pane */}
      {nav && (
        <div className="absolute inset-0 z-40 flex" onPointerDown={(e) => e.stopPropagation()}>
          <div className="w-[260px] max-w-[85%] h-full bg-[var(--c-panel)] shadow-[4px_0_16px_rgba(0,0,0,0.2)] flex flex-col menu-open">
            <div className="h-11 flex items-center px-1.5 shrink-0">
              <button aria-label="Close Navigation" onClick={() => setNav(false)} className="w-10 h-9 rounded-[4px] hover:bg-[var(--c-hov)] flex items-center justify-center"><Navigation20Regular /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-1 pb-2 text-[14px]">
              <div className="px-3 pt-1 pb-1 text-[13px] font-semibold">Calculator</div>
              {([
                ['standard', 'Standard', Calculator20Regular],
                ['scientific', 'Scientific', CalculatorMultiple20Regular],
                ['date', 'Date calculation', Calendar20Regular],
              ] as [Mode, string, any][]).map(([m, l, I]) => (
                <NavItem key={m} agent={`calc-nav-${m}`} label={l} icon={I} on={mode === m} onClick={() => switchMode(m)} />
              ))}
              <div className="px-3 pt-3 pb-1 text-[13px] font-semibold">Converter</div>
              {(Object.keys(CONVERTERS) as ConvId[]).map((m) => (
                <NavItem key={m} agent={`calc-nav-${m}`} label={CONVERTERS[m].label} icon={CONVERTERS[m].icon} on={mode === m} onClick={() => switchMode(m)} />
              ))}
            </div>
            <div className="border-t border-black/10 p-1 shrink-0">
              <ThemePicker theme={theme} setTheme={(t) => setPrefs({ theme: t })} />
            </div>
          </div>
          <div className="flex-1" onClick={() => setNav(false)} />
        </div>
      )}
    </div>
  )
}

function NavItem({ agent, label, icon: I, on, onClick }: { agent: string; label: string; icon: any; on: boolean; onClick: () => void }) {
  return (
    <button data-agent={agent} onClick={onClick} className={`relative w-full h-9 flex items-center gap-3 px-3 rounded-[4px] text-left ${on ? 'bg-[var(--c-hov)]' : 'hover:bg-[var(--c-hov)]'}`}>
      {on && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-[var(--c-acc)]" />}
      <I className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function ThemePicker({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button data-agent="calc-nav-settings" onClick={() => setOpen(!open)} className="w-full h-9 flex items-center gap-3 px-3 rounded-[4px] hover:bg-[var(--c-hov)] text-[14px]">
        <Settings20Regular /> Settings
      </button>
      {open && (
        <div className="px-3 pb-2 text-[13px]">
          <div className="font-semibold mt-1 mb-1">App theme</div>
          {(['light', 'dark', 'system'] as Theme[]).map((t) => (
            <label key={t} className="flex items-center gap-2 h-7 cursor-default">
              <input type="radio" name="calc-theme" data-agent={`calc-theme-${t}`} checked={theme === t} onChange={() => setTheme(t)} className="accent-[var(--c-acc)]" />
              {t === 'system' ? 'Use system setting' : t === 'light' ? 'Light' : 'Dark'}
            </label>
          ))}
          <div className="text-[11.5px] text-[var(--c-sub)] mt-2">Calculator 11.2410.0.0 · © Microsoft Corporation</div>
        </div>
      )}
    </div>
  )
}

/* ───────── date calculation ───────── */

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const longDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

function DateCalc() {
  const today = isoDay(new Date())
  const [kind, setKind] = useState<'diff' | 'add'>('diff')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [sign, setSign] = useState<1 | -1>(1)
  const [y, setY] = useState(0)
  const [m, setM] = useState(0)
  const [d, setD] = useState(0)

  const diff = useMemo(() => {
    let a = parseDay(from)
    let b = parseDay(to)
    if (a > b) [a, b] = [b, a]
    const total = Math.round((b.getTime() - a.getTime()) / 86400000)
    let years = b.getFullYear() - a.getFullYear()
    let months = b.getMonth() - a.getMonth()
    let days = b.getDate() - a.getDate()
    if (days < 0) {
      months--
      days += new Date(b.getFullYear(), b.getMonth(), 0).getDate()
    }
    if (months < 0) {
      years--
      months += 12
    }
    const weeks = Math.floor(days / 7)
    days = days % 7
    const parts = [
      years && `${years} year${years > 1 ? 's' : ''}`,
      months && `${months} month${months > 1 ? 's' : ''}`,
      weeks && `${weeks} week${weeks > 1 ? 's' : ''}`,
      days && `${days} day${days > 1 ? 's' : ''}`,
    ].filter(Boolean)
    return { total, text: total === 0 ? 'Same dates' : parts.join(', ') }
  }, [from, to])

  const added = useMemo(() => {
    const a = parseDay(from)
    const r = new Date(a.getFullYear() + sign * y, a.getMonth() + sign * m, a.getDate() + sign * d)
    return longDate(r)
  }, [from, sign, y, m, d])

  const inputCls = 'h-9 px-2 rounded-[4px] bg-[var(--c-in)] border border-black/10 text-[14px] text-[var(--c-tx)] outline-none focus:border-b-2 focus:border-b-[var(--c-acc)]'
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4 text-[14px]">
      <select data-agent="calc-date-kind" value={kind} onChange={(e) => setKind(e.target.value as any)} className={`${inputCls} w-full`} style={{ fontSize: 14 }}>
        <option value="diff">Difference between dates</option>
        <option value="add">Add or subtract days</option>
      </select>
      <div className="mt-4 text-[var(--c-sub)] text-[13px]">From</div>
      <input type="date" data-agent="calc-date-from" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${inputCls} mt-1`} style={{ fontSize: 14 }} />
      {kind === 'diff' ? (
        <>
          <div className="mt-4 text-[var(--c-sub)] text-[13px]">To</div>
          <input type="date" data-agent="calc-date-to" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className={`${inputCls} mt-1`} style={{ fontSize: 14 }} />
          <div className="mt-6 text-[var(--c-sub)] text-[13px]">Difference</div>
          <div data-agent="calc-date-result" className="text-[24px] font-semibold leading-tight mt-1">{diff.text}</div>
          {diff.total > 0 && <div className="text-[var(--c-sub)] mt-1">{diff.total.toLocaleString('en-US')} day{diff.total > 1 ? 's' : ''}</div>}
        </>
      ) : (
        <>
          <div className="flex gap-5 mt-4">
            {([1, -1] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-default">
                <input type="radio" name="calc-date-sign" checked={sign === s} onChange={() => setSign(s)} className="accent-[var(--c-acc)]" /> {s === 1 ? 'Add' : 'Subtract'}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            {([['Years', y, setY], ['Months', m, setM], ['Days', d, setD]] as [string, number, (n: number) => void][]).map(([l, v, set]) => (
              <label key={l} className="flex-1 min-w-0">
                <div className="text-[var(--c-sub)] text-[13px]">{l}</div>
                <input type="number" min={0} max={999} data-agent={`calc-date-${l.toLowerCase()}`} value={v} onChange={(e) => set(Math.max(0, Math.min(999, Number(e.target.value) || 0)))} className={`${inputCls} mt-1 w-full`} style={{ fontSize: 14 }} />
              </label>
            ))}
          </div>
          <div className="mt-6 text-[var(--c-sub)] text-[13px]">Date</div>
          <div data-agent="calc-date-result" className="text-[22px] font-semibold leading-tight mt-1">{added}</div>
        </>
      )}
    </div>
  )
}

/* ───────── unit converter ───────── */

function Converter({ id }: { id: ConvId }) {
  const def = CONVERTERS[id]
  const [fromU, setFromU] = useState(def.def[0])
  const [toU, setToU] = useState(def.def[1])
  const [value, setValue] = useState('0')
  const [fresh, setFresh] = useState(true)
  const [updated, setUpdated] = useState(() => new Date())
  const [updating, setUpdating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => ref.current?.focus(), [])

  const n = parseFloat(value) || 0
  const result = def.units[toU].fromBase(def.units[fromU].toBase(n))
  const shown = (x: number) => {
    if (!isFinite(x)) return '0'
    const r = parseFloat(x.toPrecision(id === 'currency' ? 12 : 10))
    if (Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-7 && r !== 0)) return r.toExponential(6)
    const [i, d] = String(id === 'currency' ? Math.round(r * 100) / 100 : r).split('.')
    return Number(i).toLocaleString('en-US') + (d ? '.' + d : '')
  }

  const key = (k: string) => {
    if (k === 'CE') {
      setValue('0')
      setFresh(true)
    } else if (k === 'back') setValue((v) => (v.length <= 1 || (v.length === 2 && v.startsWith('-')) ? '0' : v.slice(0, -1)))
    else if (k === 'neg') setValue((v) => (v === '0' ? v : v.startsWith('-') ? v.slice(1) : '-' + v))
    else if (k === '.') {
      if (fresh) setValue('0.')
      else if (!value.includes('.')) setValue(value + '.')
      setFresh(false)
    } else {
      if (fresh || value === '0') setValue(k)
      else if (value.replace(/[-.]/g, '').length < 16) setValue(value + k)
      setFresh(false)
    }
  }
  const swap = () => {
    setValue(String(parseFloat(result.toPrecision(12))))
    setFromU(toU)
    setToU(fromU)
    setFresh(true)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'SELECT') return
    if (/^[0-9.]$/.test(e.key)) key(e.key)
    else if (e.key === 'Backspace') key('back')
    else if (e.key === 'Escape' || e.key === 'Delete') key('CE')
    else return
    e.preventDefault()
    e.stopPropagation()
  }
  const selCls = 'h-8 max-w-full px-2 rounded-[4px] bg-transparent hover:bg-[var(--c-hov)] text-[14px] text-[var(--c-tx)] outline-none'
  const pad: [string, string, 'fn' | 'num'][] = [
    ['', '', 'fn'], ['CE', 'CE', 'fn'], ['back', '⌫', 'fn'],
    ['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'],
    ['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'],
    ['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'],
    [id === 'temperature' ? 'neg' : '', id === 'temperature' ? '+/−' : '', 'num'], ['0', '0', 'num'], ['.', '.', 'num'],
  ]
  return (
    <div ref={ref} tabIndex={0} onKeyDown={onKey} className="flex-1 min-h-0 flex flex-col outline-none">
      <div className="px-4 pt-1 shrink-0">
        <div data-agent="calc-conv-from" className="text-[34px] font-semibold leading-tight truncate">{fresh ? shown(n) : value.replace(/^(-?)(\d+)/, (_, s, i) => s + Number(i).toLocaleString('en-US'))}</div>
        <select data-agent="calc-conv-from-unit" value={fromU} onChange={(e) => setFromU(Number(e.target.value))} className={selCls} style={{ fontSize: 14 }}>
          {def.units.map((u, i) => <option key={u.abbr} value={i}>{u.name}</option>)}
        </select>
        <div className="flex items-center mt-2">
          <div className="min-w-0 flex-1">
            <div data-agent="calc-conv-to" className="text-[34px] font-semibold leading-tight truncate">{shown(result)}</div>
            <select data-agent="calc-conv-to-unit" value={toU} onChange={(e) => setToU(Number(e.target.value))} className={selCls} style={{ fontSize: 14 }}>
              {def.units.map((u, i) => <option key={u.abbr} value={i}>{u.name}</option>)}
            </select>
          </div>
          <button data-agent="calc-conv-swap" aria-label="Swap units" title="Swap units" onClick={swap} className="w-9 h-9 rounded-[4px] hover:bg-[var(--c-hov)] flex items-center justify-center"><ArrowSort20Regular /></button>
        </div>
        <div className="text-[12px] text-[var(--c-sub)] mt-1 truncate">
          1 {def.units[fromU].abbr} = {shown(def.units[toU].fromBase(def.units[fromU].toBase(1)))} {def.units[toU].abbr}
        </div>
        {id === 'currency' && (
          <div className="text-[12px] text-[var(--c-sub)] mt-0.5 flex items-center gap-2">
            Updated {updated.toLocaleDateString('en-US')} {updated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            <button
              data-agent="calc-conv-update-rates"
              disabled={updating}
              onClick={() => {
                setUpdating(true)
                setTimeout(() => {
                  setUpdated(new Date())
                  setUpdating(false)
                }, 900)
              }}
              className="text-[var(--c-acc)] hover:underline disabled:opacity-50"
            >
              {updating ? 'Updating…' : 'Update rates'}
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 grid grid-cols-3 gap-[2px] px-[3px] pb-[3px] mt-2 min-h-[220px]">
        {pad.map(([k, l, kind], i) =>
          k ? (
            <Key key={i} agent={`calc-conv-${k === '.' ? 'decimal' : k.toLowerCase()}`} label={l} kind={kind} onClick={() => key(k)}>
              {k === 'back' ? <Backspace20Regular className="mx-auto" /> : l}
            </Key>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
    </div>
  )
}
