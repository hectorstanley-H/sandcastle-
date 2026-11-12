/** General ledger apps: Post General Journal Entries, Trial Balance, G/L account line items. */
import { useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle, Plus, Trash2, Search } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { isoDate } from '@/data/time'
import { Btn, Field, Input, Select, MessageStrip, Dialog, Table, usd, sapDate, PageHeader, Footer, Card, Text } from './ui'
import { GL_ACCOUNTS, COST_CENTERS, glName, nextId, round2 } from './gl'
import type { Go } from './index'

type Line = { gl: string; debit: string; credit: string; costCenter: string; text: string }
const emptyLine = (): Line => ({ gl: '', debit: '', credit: '', costCenter: '', text: '' })
const num = (s: string) => Number(String(s).replace(/,/g, '')) || 0

/* ───────────── Post General Journal Entries ───────────── */

export function PostJournal({ go, title = 'Post General Journal Entries', preset }: { go: Go; title?: string; preset?: 'accrual' }) {
  const today = isoDate(new Date())
  const [docDate, setDocDate] = useState(today)
  const [postDate, setPostDate] = useState(today)
  const [type, setType] = useState('SA')
  const [header, setHeader] = useState(preset === 'accrual' ? 'Accrual — ' : '')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<Line[]>(
    preset === 'accrual'
      ? [{ gl: '613000', debit: '', credit: '', costCenter: '10101501', text: 'Accrual' }, { gl: '219000', debit: '', credit: '', costCenter: '', text: 'Accrual' }]
      : [emptyLine(), emptyLine()],
  )
  const [msg, setMsg] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null)
  const [posted, setPosted] = useState<string | null>(null)
  const [simulate, setSimulate] = useState(false)

  const debit = round2(lines.reduce((t, l) => t + num(l.debit), 0))
  const credit = round2(lines.reduce((t, l) => t + num(l.credit), 0))
  const balance = round2(debit - credit)
  const valid = lines.filter((l) => l.gl && (num(l.debit) || num(l.credit)))
  const set = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))

  const check = () => {
    if (!header.trim()) return 'Enter a journal entry header text'
    if (valid.length < 2) return 'Enter at least two line items with a G/L account and amount'
    if (lines.some((l) => num(l.debit) && num(l.credit))) return 'A line item cannot have both a debit and a credit amount'
    if (balance !== 0) return `Balance is not zero: ${usd(balance)} USD`
    return null
  }

  const post = () => {
    const err = check()
    if (err) return setMsg({ type: 'error', text: err })
    const id = nextId('sap.journals', 100004500)
    db.insert(
      'sap.journals',
      {
        id,
        fiscalYear: '2026',
        companyCode: '1010',
        type,
        typeText: type === 'SA' ? 'G/L Account Document' : type === 'AB' ? 'Accounting Document' : 'Accrual / Deferral',
        postingDate: new Date(postDate + 'T12:00:00').toISOString(),
        docDate: new Date(docDate + 'T12:00:00').toISOString(),
        reference: reference || header.slice(0, 16).toUpperCase().replace(/\s+/g, '-'),
        header,
        amount: debit,
        currency: 'USD',
        lines: valid.map((l) => ({ gl: l.gl, glName: glName(l.gl), debit: num(l.debit), credit: num(l.credit), costCenter: l.costCenter || undefined, text: l.text || undefined })),
        createdByName: 'Alex Morgan',
      },
      { prepend: true },
    )
    setMsg(null)
    setPosted(id)
  }

  const reset = () => {
    setHeader('')
    setReference('')
    setLines([emptyLine(), emptyLine()])
    setMsg(null)
    setPosted(null)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <PageHeader
        crumb={{ label: 'General Ledger', onClick: () => go({ app: 'home', space: 'General Ledger' }) }}
        title={title}
        subtitle="Company Code 1010 (Northwind Global Inc.) · Ledger Group: All"
        right={
          <div className="flex gap-10 pr-2">
            <div><div className="text-[14px] text-[#556b82]">Debit</div><div className="text-[20px] font-light">{usd(debit)} <span className="text-[14px] text-[#556b82]">USD</span></div></div>
            <div><div className="text-[14px] text-[#556b82]">Credit</div><div className="text-[20px] font-light">{usd(credit)} <span className="text-[14px] text-[#556b82]">USD</span></div></div>
            <div data-agent="sap-je-new-balance">
              <div className="text-[14px] text-[#556b82]">Balance</div>
              <div className="flex items-center gap-1.5 text-[20px] font-light" style={{ color: debit && balance === 0 ? '#256f3a' : debit || credit ? '#aa0808' : '#1d2d3e' }}>
                {debit && balance === 0 ? <CheckCircle2 className="w-5 h-5 text-[#30914c]" /> : debit || credit ? <AlertCircle className="w-5 h-5" /> : null}
                {usd(balance)}
              </div>
            </div>
          </div>
        }
      />
      <div className="flex-1 overflow-auto px-8 pt-5 pb-20 space-y-5">
        {msg && <MessageStrip type={msg.type} onClose={() => setMsg(null)}>{msg.text}</MessageStrip>}
        <Card title="Header">
          <div className="p-5 grid grid-cols-3 gap-x-10 gap-y-4 max-w-[1240px]">
            <Field label="Journal Entry Type" required>
              <Select aria-label="Journal Entry Type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="SA">SA (G/L Account Document)</option>
                <option value="AB">AB (Accounting Document)</option>
                <option value="AA">AA (Accrual / Deferral)</option>
              </Select>
            </Field>
            <Field label="Journal Entry Date" required><Input type="date" aria-label="Journal Entry Date" value={docDate} onChange={(e) => setDocDate(e.target.value)} /></Field>
            <Field label="Posting Date" required><Input type="date" aria-label="Posting Date" value={postDate} onChange={(e) => setPostDate(e.target.value)} /></Field>
            <Field label="Header Text" required><Input data-agent="sap-je-new-header" aria-label="Header Text" value={header} onChange={(e) => setHeader(e.target.value)} /></Field>
            <Field label="Reference"><Input aria-label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
            <Field label="Company Code / Currency"><Text>1010 · USD</Text></Field>
          </div>
        </Card>
        <Card
          title={`Line Items (${lines.length})`}
          toolbar={
            <>
              <Btn kind="transparent" icon={<Plus className="w-4 h-4" />} data-agent="sap-je-new-add-line" onClick={() => setLines((l) => [...l, emptyLine()])}>Add Line</Btn>
              <Btn kind="transparent" disabled={!debit && !credit} onClick={() => { const i = lines.findIndex((l) => !num(l.debit) && !num(l.credit)); if (i >= 0 && balance) set(i, balance > 0 ? { credit: String(balance), debit: '' } : { debit: String(-balance), credit: '' }) }}>Balance Remaining</Btn>
            </>
          }
        >
          <Table cols={[{ label: 'Item', w: '60px' }, { label: 'G/L Account' }, { label: 'Debit', align: 'right', w: '150px' }, { label: 'Credit', align: 'right', w: '150px' }, { label: 'Cost Center' }, { label: 'Item Text' }, { label: '', w: '44px' }]}>
            {lines.map((l, i) => (
              <tr key={i} className="h-[40px] border-b border-[#e5e5e5]">
                <td className="px-2">{String(i + 1).padStart(3, '0')}</td>
                <td className="px-2 min-w-[240px]">
                  <Select aria-label={`G/L Account ${i + 1}`} data-agent={`sap-je-new-gl-${i}`} value={l.gl} onChange={(e) => set(i, { gl: e.target.value })}>
                    <option value="" />
                    {GL_ACCOUNTS.map(([id, n]) => <option key={id} value={id}>{id} {n}</option>)}
                  </Select>
                </td>
                <td className="px-2"><Input aria-label={`Debit ${i + 1}`} data-agent={`sap-je-new-debit-${i}`} className="text-right" value={l.debit} onChange={(e) => set(i, { debit: e.target.value })} /></td>
                <td className="px-2"><Input aria-label={`Credit ${i + 1}`} data-agent={`sap-je-new-credit-${i}`} className="text-right" value={l.credit} onChange={(e) => set(i, { credit: e.target.value })} /></td>
                <td className="px-2 min-w-[200px]">
                  <Select aria-label={`Cost Center ${i + 1}`} value={l.costCenter} onChange={(e) => set(i, { costCenter: e.target.value })}>
                    <option value="" />
                    {COST_CENTERS.map(([id, n]) => <option key={id} value={id}>{id} {n}</option>)}
                  </Select>
                </td>
                <td className="px-2"><Input aria-label={`Item Text ${i + 1}`} value={l.text} onChange={(e) => set(i, { text: e.target.value })} /></td>
                <td className="px-2">
                  <button aria-label="Delete line" disabled={lines.length <= 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9] disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Footer
        left={msg?.type === 'error' ? <span className="h-[26px] px-2 rounded-lg bg-[#ffeaf4] text-[#aa0808] border border-[#aa0808]/40 flex items-center gap-1 text-[14px] font-semibold"><AlertCircle className="w-4 h-4" /> 1</span> : null}
      >
        <Btn kind="emph" data-agent="sap-je-new-post" onClick={post}>Post</Btn>
        <Btn kind="default" onClick={() => { const e = check(); setMsg(e ? { type: 'error', text: e } : { type: 'success', text: 'No errors. The journal entry can be posted.' }) }}>Check</Btn>
        <Btn kind="default" onClick={() => setSimulate(true)}>Simulate</Btn>
        <Btn kind="transparent" onClick={() => go({ app: 'journals' })}>Cancel</Btn>
      </Footer>

      {simulate && (
        <Dialog title="Simulate Journal Entry" width={760} footer={<Btn kind="emph" onClick={() => setSimulate(false)}>Close</Btn>}>
          <div className="p-4">
            <Table cols={[{ label: 'Item' }, { label: 'G/L Account' }, { label: 'Account Name' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }, { label: 'Cost Center' }]}>
              {valid.map((l, i) => (
                <tr key={i} className="h-[33px] border-b border-[#e5e5e5]">
                  <td className="px-2">{i + 1}</td><td className="px-2">{l.gl}</td><td className="px-2">{glName(l.gl)}</td>
                  <td className="px-2 text-right">{num(l.debit) ? usd(num(l.debit)) : ''}</td><td className="px-2 text-right">{num(l.credit) ? usd(num(l.credit)) : ''}</td><td className="px-2">{l.costCenter}</td>
                </tr>
              ))}
              <tr className="h-[33px] font-bold"><td className="px-2" colSpan={3}>Total</td><td className="px-2 text-right">{usd(debit)}</td><td className="px-2 text-right">{usd(credit)}</td><td /></tr>
            </Table>
            <div className="mt-3">{check() ? <MessageStrip type="error">{check()}</MessageStrip> : <MessageStrip type="success">No errors. The journal entry can be posted.</MessageStrip>}</div>
          </div>
        </Dialog>
      )}
      {posted && (
        <Dialog
          title="Success"
          state="success"
          width={460}
          agent="sap-je-new-success"
          footer={
            <>
              <Btn kind="emph" onClick={() => go({ app: 'journal', id: posted })}>Display Journal Entry</Btn>
              <Btn kind="default" onClick={reset}>Post Another</Btn>
              <Btn kind="transparent" onClick={() => go({ app: 'journals' })}>Close</Btn>
            </>
          }
        >
          <div className="px-5 py-5 text-[14px]">Journal entry <b>{posted}</b> was posted in company code 1010 ({usd(debit)} USD).</div>
        </Dialog>
      )}
    </div>
  )
}

/* ───────────── Trial Balance ───────────── */

export function TrialBalance({ go, title = 'Trial Balance' }: { go: Go; title?: string }) {
  const journals = useCollection<any>('sap.journals')
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const rows = useMemo(() => {
    const m = new Map<string, { debit: number; credit: number; n: number }>()
    for (const j of journals) for (const l of j.lines ?? []) {
      const r = m.get(l.gl) ?? { debit: 0, credit: 0, n: 0 }
      r.debit += l.debit || 0
      r.credit += l.credit || 0
      r.n++
      m.set(l.gl, r)
    }
    return [...m.entries()]
      .map(([gl, v]) => ({ gl, name: glName(gl), group: GL_ACCOUNTS.find((a) => a[0] === gl)?.[2] ?? 'Other', debit: round2(v.debit), credit: round2(v.credit), balance: round2(v.debit - v.credit), n: v.n }))
      .filter((r) => (!q || `${r.gl} ${r.name}`.toLowerCase().includes(q.toLowerCase())) && (!group || r.group === group))
      .sort((a, b) => a.gl.localeCompare(b.gl))
  }, [journals, q, group])
  const tot = (k: 'debit' | 'credit' | 'balance') => usd(rows.reduce((t, r) => t + r[k], 0))
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader
        crumb={{ label: 'General Ledger', onClick: () => go({ app: 'home', space: 'General Ledger' }) }}
        title={title}
        subtitle="Company Code 1010 · Ledger 0L · Fiscal Year 2026 · Periods 001–012"
      />
      <div className="flex-1 overflow-auto px-8 py-5">
        <Card
          title={`G/L Accounts (${rows.length})`}
          toolbar={
            <div className="flex items-center gap-3">
              <Select className="w-[160px]" aria-label="Account Group" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">All account groups</option>
                <option>Assets</option><option>Liabilities</option><option>Expenses</option>
              </Select>
              <div className="relative w-[220px]">
                <Input aria-label="Search G/L accounts" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} data-agent="sap-tb-search" />
                <Search className="w-4 h-4 absolute right-2 top-[5px] text-[#556b82]" />
              </div>
            </div>
          }
        >
          <Table cols={[{ label: 'G/L Account' }, { label: 'Account Name' }, { label: 'Group' }, { label: 'Items', align: 'right' }, { label: 'Debit Balance', align: 'right' }, { label: 'Credit Balance', align: 'right' }, { label: 'Ending Balance', align: 'right' }]}>
            {rows.map((r) => (
              <tr key={r.gl} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] cursor-pointer" onClick={() => go({ app: 'glAccount', id: r.gl })}>
                <td className="px-2 text-[#0064d9] font-semibold">{r.gl}</td>
                <td className="px-2">{r.name}</td>
                <td className="px-2 text-[#556b82]">{r.group}</td>
                <td className="px-2 text-right">{r.n}</td>
                <td className="px-2 text-right">{usd(r.debit)}</td>
                <td className="px-2 text-right">{usd(r.credit)}</td>
                <td className="px-2 text-right font-semibold" style={{ color: r.balance < 0 ? '#aa0808' : undefined }}>{usd(r.balance)}</td>
              </tr>
            ))}
            <tr className="h-[33px] font-bold">
              <td className="px-2" colSpan={4}>Total</td>
              <td className="px-2 text-right">{tot('debit')}</td>
              <td className="px-2 text-right">{tot('credit')}</td>
              <td className="px-2 text-right">{tot('balance')}</td>
            </tr>
          </Table>
        </Card>
      </div>
    </div>
  )
}

export function GlAccountItems({ id, go }: { id: string; go: Go }) {
  const journals = useCollection<any>('sap.journals')
  const items = useMemo(
    () => journals.flatMap((j) => (j.lines ?? []).filter((l: any) => l.gl === id).map((l: any, i: number) => ({ key: `${j.id}-${i}`, je: j, l }))).sort((a, b) => +new Date(b.je.postingDate) - +new Date(a.je.postingDate)),
    [journals, id],
  )
  const bal = round2(items.reduce((t, x) => t + (x.l.debit || 0) - (x.l.credit || 0), 0))
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader
        crumb={{ label: 'Trial Balance', onClick: () => go({ app: 'trialBalance' }) }}
        title={`G/L Account ${id} — ${glName(id)}`}
        subtitle="Display Line Items · Company Code 1010 · Fiscal Year 2026"
        right={<div className="pr-2"><div className="text-[14px] text-[#556b82]">Balance</div><div className="text-[20px] font-light" style={{ color: bal < 0 ? '#aa0808' : undefined }}>{usd(bal)} <span className="text-[14px] text-[#556b82]">USD</span></div></div>}
      />
      <div className="flex-1 overflow-auto px-8 py-5">
        <Card title={`Line Items (${items.length})`}>
          <Table cols={[{ label: 'Journal Entry' }, { label: 'Type' }, { label: 'Posting Date' }, { label: 'Header Text' }, { label: 'Item Text' }, { label: 'Debit', align: 'right' }, { label: 'Credit', align: 'right' }]}>
            {items.map(({ key, je, l }) => (
              <tr key={key} className="h-[33px] border-b border-[#e5e5e5] hover:bg-[#eaecee] cursor-pointer" onClick={() => go({ app: 'journal', id: je.id })}>
                <td className="px-2 text-[#0064d9] font-semibold">{je.id}</td>
                <td className="px-2">{je.type}</td>
                <td className="px-2">{sapDate(je.postingDate)}</td>
                <td className="px-2 truncate max-w-[280px]">{je.header}</td>
                <td className="px-2 text-[#556b82]">{l.text ?? ''}</td>
                <td className="px-2 text-right">{l.debit ? usd(l.debit) : ''}</td>
                <td className="px-2 text-right">{l.credit ? usd(l.credit) : ''}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}
