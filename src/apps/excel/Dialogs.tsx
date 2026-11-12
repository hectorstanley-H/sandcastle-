import { useMemo, useState } from 'react'
import { Link20Regular, Copy20Regular } from '@fluentui/react-icons'
import { Avatar } from '@/components/Avatar'
import { PEOPLE } from '@/data/people'
import { FUNCTIONS, formatValue } from './formula'
import type { CfType, XCell, XFmt } from './types'
import { PALETTE } from './types'
import { Btn, Field, Modal, inputCls } from './ui'

/* ───────────── Format Cells ───────────── */

const NUM_FMTS: [XFmt, string, number][] = [
  ['general', 'General', 1234.5],
  ['number', 'Number', 1234.5],
  ['currency2', 'Currency', 1234.5],
  ['currency', 'Accounting', 1234.5],
  ['date', 'Short Date', 46000],
  ['longdate', 'Long Date', 46000],
  ['time', 'Time', 46000.5],
  ['percent', 'Percentage', 0.125],
  ['fraction', 'Fraction', 1.25],
  ['scientific', 'Scientific', 123456],
  ['text', 'Text', 1234.5],
  ['int', 'Comma Style', 1234.5],
]
const FONTS = ['Aptos Narrow', 'Aptos', 'Aptos Display', 'Calibri', 'Arial', 'Segoe UI', 'Times New Roman', 'Consolas', 'Georgia']

export function FormatCellsDialog({ cell, onApply, onClose }: { cell: XCell; onApply: (patch: Partial<XCell>) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'Number' | 'Alignment' | 'Font' | 'Border' | 'Fill'>('Number')
  const [p, setP] = useState<Partial<XCell>>({
    fmt: cell.fmt ?? 'general',
    align: cell.align,
    valign: cell.valign,
    wrap: cell.wrap,
    indent: cell.indent,
    font: cell.font,
    size: cell.size,
    bold: cell.bold,
    italic: cell.italic,
    underline: cell.underline,
    strike: cell.strike,
    color: cell.color,
    fill: cell.fill,
    border: cell.border,
  })
  const set = (k: keyof XCell, v: any) => setP((x) => ({ ...x, [k]: v }))
  const sample = NUM_FMTS.find((f) => f[0] === p.fmt)?.[2] ?? 1234.5
  return (
    <Modal
      title="Format Cells"
      width={520}
      onClose={onClose}
      agent="excel-format-cells-dialog"
      footer={
        <>
          <Btn primary agent="excel-format-cells-ok" onClick={() => (onApply({ ...p, fmt: p.fmt === 'general' ? undefined : p.fmt }), onClose())}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <div className="flex gap-4 border-b border-[#E1E1E1] mb-3">
        {(['Number', 'Alignment', 'Font', 'Border', 'Fill'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative h-8 text-[13px] ${tab === t ? 'font-semibold text-[#107C41]' : 'text-[#424242]'}`}>
            {t}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#107C41]" />}
          </button>
        ))}
      </div>
      <div className="min-h-[220px]">
        {tab === 'Number' && (
          <div className="flex gap-4">
            <div className="w-[150px] border border-[#D1D1D1] rounded overflow-auto max-h-[230px]">
              {NUM_FMTS.map(([f, l]) => (
                <button key={f} onClick={() => set('fmt', f)} className={`w-full text-left px-2 h-7 text-[12.5px] ${p.fmt === f ? 'bg-[#D3F0E0] font-semibold' : 'hover:bg-[#F5F5F5]'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex-1">
              <div className="text-[12px] text-[#616161] mb-1">Sample</div>
              <div className="h-8 border border-[#D1D1D1] rounded flex items-center px-2 font-mono text-[13px]">{formatValue(sample, p.fmt)}</div>
              <p className="text-[12px] text-[#616161] mt-3 leading-relaxed">
                {p.fmt === 'general' ? 'General format cells have no specific number format.' : p.fmt === 'text' ? 'Text format cells are treated as text even when a number is in the cell.' : 'Number formats change how a value is displayed without changing the value itself.'}
              </p>
            </div>
          </div>
        )}
        {tab === 'Alignment' && (
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Horizontal">
              <select className={inputCls} value={p.align ?? ''} onChange={(e) => set('align', e.target.value || undefined)}>
                <option value="">General</option>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
            <Field label="Vertical">
              <select className={inputCls} value={p.valign ?? 'bottom'} onChange={(e) => set('valign', e.target.value === 'bottom' ? undefined : e.target.value)}>
                <option value="top">Top</option>
                <option value="middle">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </Field>
            <Field label="Indent">
              <input type="number" min={0} max={10} className={inputCls} value={p.indent ?? 0} onChange={(e) => set('indent', Number(e.target.value) || undefined)} />
            </Field>
            <label className="flex items-center gap-2 mt-6 text-[13px]">
              <input type="checkbox" checked={!!p.wrap} onChange={(e) => set('wrap', e.target.checked || undefined)} /> Wrap text
            </label>
          </div>
        )}
        {tab === 'Font' && (
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Font">
              <select className={inputCls} value={p.font ?? 'Aptos Narrow'} onChange={(e) => set('font', e.target.value === 'Aptos Narrow' ? undefined : e.target.value)}>
                {FONTS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Size">
              <select className={inputCls} value={p.size ?? 11} onChange={(e) => set('size', Number(e.target.value) === 11 ? undefined : Number(e.target.value))}>
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <div className="col-span-2 flex flex-wrap gap-4 mb-3 text-[13px]">
              {(['bold', 'italic', 'underline', 'strike'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={!!p[k]} onChange={(e) => set(k, e.target.checked || undefined)} /> {k === 'strike' ? 'Strikethrough' : k[0].toUpperCase() + k.slice(1)}
                </label>
              ))}
            </div>
            <Field label="Color">
              <Swatches value={p.color} onPick={(c) => set('color', c)} />
            </Field>
            <div className="border border-[#D1D1D1] rounded h-[60px] flex items-center justify-center mt-5" style={{ fontFamily: p.font ?? 'Aptos Narrow', fontSize: (p.size ?? 11) * 1.33, fontWeight: p.bold ? 700 : 400, fontStyle: p.italic ? 'italic' : undefined, textDecoration: [p.underline && 'underline', p.strike && 'line-through'].filter(Boolean).join(' ') || undefined, color: p.color }}>
              AaBbCcYyZz
            </div>
          </div>
        )}
        {tab === 'Border' && (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                [undefined, 'None'],
                ['all', 'All Borders'],
                ['outside', 'Outside Borders'],
                ['bottom', 'Bottom Border'],
                ['top', 'Top Border'],
                ['thickBottom', 'Thick Bottom'],
              ] as [XCell['border'], string][]
            ).map(([b, l]) => (
              <button key={l} onClick={() => set('border', b)} className={`h-[70px] rounded border flex flex-col items-center justify-center gap-1.5 text-[12px] ${p.border === b ? 'border-[#107C41] bg-[#F0FAF4]' : 'border-[#D1D1D1] hover:bg-[#F5F5F5]'}`}>
                <span className="w-8 h-6 bg-white" style={borderPreview(b)} />
                {l}
              </button>
            ))}
          </div>
        )}
        {tab === 'Fill' && (
          <div>
            <div className="text-[12px] font-semibold mb-1">Background Color</div>
            <Swatches value={p.fill} onPick={(c) => set('fill', c)} none />
            <div className="mt-4 text-[12px] text-[#616161]">Sample</div>
            <div className="h-10 rounded border border-[#D1D1D1] mt-1" style={{ background: p.fill ?? '#fff' }} />
          </div>
        )}
      </div>
    </Modal>
  )
}

function borderPreview(b: XCell['border']): React.CSSProperties {
  const l = '1px solid #000'
  if (b === 'all' || b === 'outside') return { border: l }
  if (b === 'bottom') return { borderBottom: l, outline: '1px dashed #CCC' }
  if (b === 'top') return { borderTop: l, outline: '1px dashed #CCC' }
  if (b === 'thickBottom') return { borderBottom: '3px solid #000', outline: '1px dashed #CCC' }
  return { outline: '1px dashed #CCC' }
}

function Swatches({ value, onPick, none }: { value?: string; onPick: (c: string | undefined) => void; none?: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-1 w-fit">
        {PALETTE.map((c) => (
          <button key={c} aria-label={`Color ${c}`} onClick={() => onPick(c)} className={`w-[18px] h-[18px] border ${value === c ? 'outline outline-2 outline-[#107C41]' : 'border-black/15'}`} style={{ background: c }} />
        ))}
      </div>
      {none && (
        <button onClick={() => onPick(undefined)} className="mt-2 text-[12px] text-[#107C41] hover:underline">
          No Color
        </button>
      )}
    </div>
  )
}

/* ───────────── Find & Replace ───────────── */

export function FindReplaceDialog({
  initialTab,
  onFind,
  onReplace,
  onReplaceAll,
  onClose,
}: {
  initialTab: 'find' | 'replace'
  onFind: (q: string, opts: { matchCase: boolean; whole: boolean; all: boolean }) => string
  onReplace: (q: string, r: string, opts: { matchCase: boolean; whole: boolean }) => string
  onReplaceAll: (q: string, r: string, opts: { matchCase: boolean; whole: boolean }) => string
  onClose: () => void
}) {
  const [tab, setTab] = useState(initialTab)
  const [q, setQ] = useState('')
  const [r, setR] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [whole, setWhole] = useState(false)
  const [all, setAll] = useState(false)
  const [msg, setMsg] = useState('')
  return (
    <Modal
      title="Find and Replace"
      width={460}
      onClose={onClose}
      agent="excel-find-dialog"
      footer={
        <>
          {tab === 'replace' && (
            <>
              <Btn onClick={() => setMsg(onReplaceAll(q, r, { matchCase, whole }))} disabled={!q}>
                Replace All
              </Btn>
              <Btn onClick={() => setMsg(onReplace(q, r, { matchCase, whole }))} disabled={!q}>
                Replace
              </Btn>
            </>
          )}
          <Btn primary onClick={() => setMsg(onFind(q, { matchCase, whole, all }))} disabled={!q}>
            Find Next
          </Btn>
          <Btn onClick={onClose}>Close</Btn>
        </>
      }
    >
      <div className="flex gap-4 border-b border-[#E1E1E1] mb-3">
        {(['find', 'replace'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative h-8 text-[13px] ${tab === t ? 'font-semibold text-[#107C41]' : 'text-[#424242]'}`}>
            {t === 'find' ? 'Find' : 'Replace'}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#107C41]" />}
          </button>
        ))}
      </div>
      <Field label="Find what">
        <input autoFocus data-agent="excel-find-what" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q && setMsg(onFind(q, { matchCase, whole, all }))} />
      </Field>
      {tab === 'replace' && (
        <Field label="Replace with">
          <input data-agent="excel-replace-with" className={inputCls} value={r} onChange={(e) => setR(e.target.value)} />
        </Field>
      )}
      <div className="flex flex-wrap gap-4 text-[12.5px]">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} /> Match entire cell contents
        </label>
        {tab === 'find' && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Search all sheets
          </label>
        )}
      </div>
      {msg && <div className="mt-3 text-[12.5px] text-[#424242] bg-[#F5F5F5] rounded px-2 py-1.5">{msg}</div>}
    </Modal>
  )
}

/* ───────────── Share ───────────── */

export function ShareDialog({
  name,
  sharedWith,
  onShare,
  onCopy,
  onClose,
  prefix = 'excel',
  accent = '#107C41',
}: {
  name: string
  sharedWith: string[]
  onShare: (emails: string[], msg: string) => void
  onCopy: () => void
  onClose: () => void
  prefix?: string
  accent?: string
}) {
  const [to, setTo] = useState<string[]>([])
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [perm, setPerm] = useState<'edit' | 'view'>('edit')
  const matches = text.length > 1 ? PEOPLE.filter((p) => (p.name + ' ' + p.email).toLowerCase().includes(text.toLowerCase()) && !to.includes(p.email)).slice(0, 5) : []
  const add = (e: string) => {
    if (e && !to.includes(e)) setTo([...to, e])
    setText('')
  }
  return (
    <Modal
      title={`Share “${name}”`}
      width={480}
      onClose={onClose}
      agent={`${prefix}-share-dialog`}
      footer={
        <>
          <button onClick={onCopy} className="mr-auto flex items-center gap-1.5 text-[13px] text-[#0F6CBD] hover:underline">
            <Copy20Regular className="w-4 h-4" /> Copy link
          </button>
          <Btn primary color={accent} agent={`${prefix}-share-send`} disabled={!to.length} onClick={() => (onShare(to, msg), onClose())}>
            Send
          </Btn>
        </>
      }
    >
      <div className="flex items-center gap-2 h-9 px-3 rounded bg-[#F5F5F5] text-[12.5px] mb-3">
        <Link20Regular className="text-[#0F6CBD] w-4 h-4" /> People in Northwind Global with the link can
        <select value={perm} onChange={(e) => setPerm(e.target.value as any)} className="bg-transparent font-semibold outline-none">
          <option value="edit">edit</option>
          <option value="view">view</option>
        </select>
      </div>
      <div className="relative min-h-[36px] flex flex-wrap items-center gap-1 px-2 py-1 rounded border border-[#C7C7C7] focus-within:border-[#107C41]">
        {to.map((e) => (
          <span key={e} className="flex items-center gap-1.5 h-6 pl-0.5 pr-2 rounded-full bg-[#E6F2EA] text-[12.5px]">
            <Avatar email={e} size={20} /> {PEOPLE.find((p) => p.email === e)?.name ?? e}
            <button aria-label={`Remove ${e}`} onClick={() => setTo(to.filter((x) => x !== e))} className="text-[#616161]">
              ×
            </button>
          </span>
        ))}
        <input
          data-agent={`${prefix}-share-to`}
          aria-label="Add a name, group or email"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const m = matches[0]
              add(m ? m.email : text.includes('@') ? text.trim() : '')
            }
          }}
          placeholder={to.length ? '' : 'Add a name, group or email'}
          className="flex-1 min-w-[160px] h-7 outline-none text-[13px]"
        />
        {matches.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white rounded shadow-[0_6px_16px_rgba(0,0,0,0.16)] py-1">
            {matches.map((p) => (
              <button key={p.id} onClick={() => add(p.email)} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#F5F5F5] text-left">
                <Avatar id={p.id} size={26} />
                <span>
                  <span className="block text-[13px]">{p.name}</span>
                  <span className="block text-[11.5px] text-[#616161]">{p.email}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Add a message (optional)" className="mt-3 w-full h-[80px] resize-none rounded border border-[#C7C7C7] focus:border-[#107C41] outline-none px-2 py-1.5 text-[13px]" />
      {sharedWith.length > 0 && (
        <div className="mt-2 text-[12px] text-[#616161]">
          Shared with {sharedWith.map((e) => PEOPLE.find((p) => p.email === e)?.name ?? e).join(', ')}
        </div>
      )}
    </Modal>
  )
}

/* ───────────── Insert Function ───────────── */

export function InsertFunctionDialog({ onPick, onClose, initialCat }: { onPick: (name: string) => void; onClose: () => void; initialCat?: string }) {
  const cats = ['Most Recently Used', 'All', ...Array.from(new Set(FUNCTIONS.map((f) => f.cat)))]
  const [cat, setCat] = useState(initialCat ?? 'Most Recently Used')
  const [q, setQ] = useState('')
  const recent = ['SUM', 'AVERAGE', 'IF', 'SUMIF', 'VLOOKUP', 'XLOOKUP', 'COUNT', 'MAX']
  const list = useMemo(() => {
    let l = cat === 'All' ? FUNCTIONS : cat === 'Most Recently Used' ? recent.map((n) => FUNCTIONS.find((f) => f.name === n)!).filter(Boolean) : FUNCTIONS.filter((f) => f.cat === cat)
    if (q) l = FUNCTIONS.filter((f) => (f.name + ' ' + f.desc).toLowerCase().includes(q.toLowerCase()))
    return l
  }, [cat, q])
  const [sel, setSel] = useState(list[0]?.name ?? 'SUM')
  const f = FUNCTIONS.find((x) => x.name === sel)
  return (
    <Modal
      title="Insert Function"
      width={500}
      onClose={onClose}
      agent="excel-insert-function-dialog"
      footer={
        <>
          <Btn primary onClick={() => (onPick(sel), onClose())}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <Field label="Search for a function">
        <input autoFocus className={inputCls} value={q} placeholder="Type a brief description of what you want to do" onChange={(e) => setQ(e.target.value)} />
      </Field>
      <Field label="Or select a category">
        <select className={inputCls} value={cat} onChange={(e) => (setCat(e.target.value), setQ(''))}>
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <div className="text-[12px] font-semibold text-[#424242] mb-1">Select a function</div>
      <div className="h-[150px] overflow-auto border border-[#D1D1D1] rounded">
        {list.map((x) => (
          <button key={x.name} onClick={() => setSel(x.name)} onDoubleClick={() => (onPick(x.name), onClose())} className={`w-full text-left px-2 h-6 text-[12.5px] font-mono ${sel === x.name ? 'bg-[#D3F0E0]' : 'hover:bg-[#F5F5F5]'}`}>
            {x.name}
          </button>
        ))}
      </div>
      {f && (
        <div className="mt-3">
          <div className="font-mono text-[12.5px] font-semibold">{f.syntax}</div>
          <div className="text-[12.5px] text-[#424242] mt-1">{f.desc}</div>
        </div>
      )}
    </Modal>
  )
}

/* ───────────── generic prompt ───────────── */

export function PromptDialog({
  title,
  label,
  initial = '',
  onOk,
  onClose,
  type = 'text',
  options,
  help,
}: {
  title: string
  label: string
  initial?: string
  onOk: (v: string) => void
  onClose: () => void
  type?: 'text' | 'number'
  options?: string[]
  help?: string
}) {
  const [v, setV] = useState(initial)
  const ok = () => (onOk(v), onClose())
  return (
    <Modal
      title={title}
      width={360}
      onClose={onClose}
      footer={
        <>
          <Btn primary onClick={ok}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <Field label={label}>
        {options ? (
          <select autoFocus className={inputCls} value={v} onChange={(e) => setV(e.target.value)}>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input autoFocus type={type} className={inputCls} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok()} />
        )}
      </Field>
      {help && <div className="text-[12px] text-[#616161] -mt-1">{help}</div>}
    </Modal>
  )
}

export function MessageDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal title={title} width={380} onClose={onClose} footer={<Btn primary onClick={onClose}>OK</Btn>}>
      <div className="text-[13px] leading-relaxed">{children}</div>
    </Modal>
  )
}

export function ConfirmDialog({ title, children, okLabel = 'OK', onOk, onClose }: { title: string; children: React.ReactNode; okLabel?: string; onOk: () => void; onClose: () => void }) {
  return (
    <Modal
      title={title}
      width={400}
      onClose={onClose}
      footer={
        <>
          <Btn primary onClick={() => (onOk(), onClose())}>
            {okLabel}
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <div className="text-[13px] leading-relaxed">{children}</div>
    </Modal>
  )
}

/* ───────────── Goal Seek ───────────── */

export function GoalSeekDialog({ initialSet, onRun, onClose }: { initialSet: string; onRun: (set: string, to: number, by: string) => string; onClose: () => void }) {
  const [set, setSet] = useState(initialSet)
  const [to, setTo] = useState('')
  const [by, setBy] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <Modal
      title="Goal Seek"
      width={340}
      onClose={onClose}
      agent="excel-goal-seek"
      footer={
        <>
          <Btn primary disabled={!set || !to || !by} onClick={() => setMsg(onRun(set.toUpperCase(), Number(to), by.toUpperCase()))}>
            OK
          </Btn>
          <Btn onClick={onClose}>Close</Btn>
        </>
      }
    >
      <Field label="Set cell">
        <input autoFocus className={inputCls} value={set} onChange={(e) => setSet(e.target.value)} />
      </Field>
      <Field label="To value">
        <input className={inputCls} type="number" value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      <Field label="By changing cell">
        <input className={inputCls} value={by} onChange={(e) => setBy(e.target.value)} placeholder="e.g. B4" />
      </Field>
      {msg && <div className="text-[12.5px] bg-[#F5F5F5] rounded px-2 py-1.5">{msg}</div>}
    </Modal>
  )
}

/* ───────────── Data Validation ───────────── */

export function ValidationDialog({ initial, onOk, onClear, onClose }: { initial: string[]; onOk: (items: string[]) => void; onClear: () => void; onClose: () => void }) {
  const [src, setSrc] = useState(initial.join(', '))
  return (
    <Modal
      title="Data Validation"
      width={400}
      onClose={onClose}
      footer={
        <>
          <button onClick={() => (onClear(), onClose())} className="mr-auto text-[13px] text-[#0F6CBD] hover:underline">
            Clear All
          </button>
          <Btn
            primary
            disabled={!src.trim()}
            onClick={() => {
              onOk(src.split(/[,;]/).map((s) => s.trim()).filter(Boolean))
              onClose()
            }}
          >
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <Field label="Allow">
        <select className={inputCls} defaultValue="List">
          <option>List</option>
        </select>
      </Field>
      <Field label="Source (comma separated)">
        <input autoFocus className={inputCls} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Not started, In progress, Done" />
      </Field>
      <div className="text-[12px] text-[#616161]">A dropdown appears next to the cell, and other values are rejected.</div>
    </Modal>
  )
}

/* ───────────── Text to Columns ───────────── */

export function TextToColumnsDialog({ onOk, onClose }: { onOk: (delim: string) => void; onClose: () => void }) {
  const [d, setD] = useState(',')
  const [other, setOther] = useState('')
  return (
    <Modal
      title="Convert Text to Columns"
      width={380}
      onClose={onClose}
      footer={
        <>
          <Btn primary onClick={() => (onOk(d === 'other' ? other || ' ' : d), onClose())}>
            Finish
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <div className="text-[12.5px] mb-2">Choose the delimiter that separates your data:</div>
      {[
        ['\t', 'Tab'],
        [';', 'Semicolon'],
        [',', 'Comma'],
        [' ', 'Space'],
        ['other', 'Other'],
      ].map(([v, l]) => (
        <label key={l} className="flex items-center gap-2 h-7 text-[13px]">
          <input type="radio" checked={d === v} onChange={() => setD(v)} /> {l}
          {v === 'other' && <input className="w-10 h-6 border border-[#C7C7C7] rounded px-1" value={other} onChange={(e) => (setOther(e.target.value.slice(0, 1)), setD('other'))} />}
        </label>
      ))}
    </Modal>
  )
}

/* ───────────── From Text/CSV ───────────── */

export function ImportDialog({ onOk, onClose }: { onOk: (text: string, newSheet: boolean) => void; onClose: () => void }) {
  const [t, setT] = useState('Region,Units,Revenue\nEast,120,4800\nWest,95,3990\nCentral,143,5577')
  const [ns, setNs] = useState(true)
  const readFile = (f?: File) => f && f.text().then(setT)
  return (
    <Modal
      title="Import Data — From Text/CSV"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Btn primary disabled={!t.trim()} onClick={() => (onOk(t, ns), onClose())}>
            Load
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <div className="text-[12.5px] text-[#424242] mb-2">Paste comma- or tab-separated data, or choose a .csv / .txt file.</div>
      <input type="file" accept=".csv,.txt,.tsv" onChange={(e) => readFile(e.target.files?.[0])} className="text-[12px] mb-2" />
      <textarea value={t} onChange={(e) => setT(e.target.value)} className="w-full h-[180px] font-mono text-[12px] border border-[#C7C7C7] rounded p-2 outline-none focus:border-[#107C41]" />
      <label className="flex items-center gap-2 text-[13px] mt-2">
        <input type="checkbox" checked={ns} onChange={(e) => setNs(e.target.checked)} /> Load to a new worksheet
      </label>
    </Modal>
  )
}

/* ───────────── Name Manager ───────────── */

export function NameManagerDialog({ names, defaultRef, onChange, onClose }: { names: { name: string; ref: string }[]; defaultRef: string; onChange: (n: { name: string; ref: string }[]) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [ref, setRef] = useState(defaultRef)
  const [err, setErr] = useState('')
  const add = () => {
    const n = name.trim()
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) || /^[A-Za-z]{1,2}\d+$/.test(n)) return setErr('That name isn’t valid. Names must start with a letter and can’t look like a cell reference.')
    if (names.some((x) => x.name.toLowerCase() === n.toLowerCase())) return setErr('That name already exists.')
    onChange([...names, { name: n, ref }])
    setName('')
    setErr('')
  }
  return (
    <Modal title="Name Manager" width={520} onClose={onClose} agent="excel-name-manager" footer={<Btn onClick={onClose}>Close</Btn>}>
      <div className="border border-[#D1D1D1] rounded min-h-[110px] max-h-[180px] overflow-auto">
        <div className="grid grid-cols-[140px_1fr_60px] text-[12px] text-[#616161] px-2 h-7 items-center border-b border-[#EDEBE9]">
          <span>Name</span>
          <span>Refers To</span>
          <span />
        </div>
        {names.map((n) => (
          <div key={n.name} className="grid grid-cols-[140px_1fr_60px] text-[12.5px] px-2 h-7 items-center hover:bg-[#F5F5F5]">
            <span className="font-semibold">{n.name}</span>
            <span className="font-mono truncate">={n.ref}</span>
            <button onClick={() => onChange(names.filter((x) => x.name !== n.name))} className="text-[#C42B1C] text-[12px] hover:underline">
              Delete
            </button>
          </div>
        ))}
        {!names.length && <div className="px-2 py-3 text-[12.5px] text-[#616161]">No names defined yet.</div>}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <Field label="New name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3_Actuals" />
        </Field>
        <Field label="Refers to">
          <input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} />
        </Field>
        <div className="mb-3">
          <Btn primary disabled={!name.trim() || !ref.trim()} onClick={add}>
            Add
          </Btn>
        </div>
      </div>
      {err && <div className="text-[12px] text-[#C42B1C]">{err}</div>}
    </Modal>
  )
}

/* ───────────── Conditional formatting value ───────────── */

export const CF_STYLES: Record<string, { fill?: string; color?: string; label: string }> = {
  red: { fill: '#FFC7CE', color: '#9C0006', label: 'Light Red Fill with Dark Red Text' },
  yellow: { fill: '#FFEB9C', color: '#9C5700', label: 'Yellow Fill with Dark Yellow Text' },
  green: { fill: '#C6EFCE', color: '#006100', label: 'Green Fill with Dark Green Text' },
  redText: { color: '#C00000', label: 'Red Text' },
  redBorder: { fill: '#FFC7CE', label: 'Light Red Fill' },
}

export function CfDialog({ type, onOk, onClose }: { type: CfType; onOk: (value: string, style: string) => void; onClose: () => void }) {
  const title = { gt: 'Greater Than', lt: 'Less Than', eq: 'Equal To', text: 'Text That Contains' }[type as 'gt'] ?? 'Rule'
  const [v, setV] = useState('')
  const [st, setSt] = useState('red')
  return (
    <Modal
      title={title}
      width={420}
      onClose={onClose}
      footer={
        <>
          <Btn primary disabled={!v} onClick={() => (onOk(v, st), onClose())}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <Field label={`Format cells that are ${title.toUpperCase()}:`}>
        <input autoFocus className={inputCls} value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
      <Field label="with">
        <select className={inputCls} value={st} onChange={(e) => setSt(e.target.value)}>
          {Object.entries(CF_STYLES).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  )
}

/* ───────────── Custom sort ───────────── */

export function SortDialog({ columns, initialCol, onOk, onClose }: { columns: { idx: number; label: string }[]; initialCol: number; onOk: (col: number, desc: boolean, header: boolean) => void; onClose: () => void }) {
  const [col, setCol] = useState(initialCol)
  const [desc, setDesc] = useState(false)
  const [header, setHeader] = useState(true)
  return (
    <Modal
      title="Sort"
      width={420}
      onClose={onClose}
      footer={
        <>
          <Btn primary onClick={() => (onOk(col, desc, header), onClose())}>
            OK
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </>
      }
    >
      <label className="flex items-center gap-2 text-[13px] mb-3">
        <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} /> My data has headers
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort by">
          <select className={inputCls} value={col} onChange={(e) => setCol(Number(e.target.value))}>
            {columns.map((c) => (
              <option key={c.idx} value={c.idx}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Order">
          <select className={inputCls} value={desc ? 'd' : 'a'} onChange={(e) => setDesc(e.target.value === 'd')}>
            <option value="a">Smallest to Largest / A to Z</option>
            <option value="d">Largest to Smallest / Z to A</option>
          </select>
        </Field>
      </div>
    </Modal>
  )
}
