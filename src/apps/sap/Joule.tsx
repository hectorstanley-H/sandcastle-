/** Joule copilot side panel — answers questions from the live S/4HANA data. */
import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, SendHorizontal } from 'lucide-react'
import { db } from '@/db/db'
import { usd, sapDate } from './ui'
import type { Go, SapRoute } from './index'

type Msg = { from: 'me' | 'joule'; text: string; actions?: { label: string; route: SapRoute }[] }

const SUGGESTIONS = ['Which invoices are blocked for payment?', 'Show overdue payables', 'Status of PO 4500018234', 'What is due in the next payment run?']

function answer(q: string): Msg {
  const t = q.toLowerCase()
  const inv = db.get<any>('sap.invoices')
  const pos = db.get<any>('sap.pos')
  const poNum = t.match(/45000\d{5}/)?.[0]
  const invNum = t.match(/51056\d{5}/)?.[0]
  if (poNum) {
    const po = pos.find((p) => p.id === poNum)
    if (!po) return { from: 'joule', text: `I couldn't find purchase order ${poNum} in company code 1010.` }
    const invs = inv.filter((i) => i.poId === po.id && i.status !== 'Cancelled')
    return {
      from: 'joule',
      text: `Purchase order ${po.id} from ${po.supplierName} is **${po.status}** — net value ${usd(po.netAmount)} USD across ${po.items.length} item${po.items.length > 1 ? 's' : ''}. ${invs.length ? `${invs.length} supplier invoice${invs.length > 1 ? 's' : ''} posted against it (${invs.map((i) => i.id).join(', ')}).` : 'No supplier invoice has been posted against it yet.'}`,
      actions: [{ label: `Open PO ${po.id}`, route: { app: 'po', id: po.id } }, ...(invs.length ? [] : [{ label: 'Create Supplier Invoice', route: { app: 'createInvoice', poId: po.id } as SapRoute }])],
    }
  }
  if (invNum) {
    const i = inv.find((x) => x.id === invNum)
    if (!i) return { from: 'joule', text: `Supplier invoice ${invNum} doesn't exist in fiscal year 2026.` }
    return { from: 'joule', text: `Supplier invoice ${i.id} from ${i.supplierName} (${i.reference}) is **${i.status}**: ${usd(i.gross)} USD, due ${sapDate(i.dueDate)}.${i.paymentBlock ? ` Payment block: ${i.paymentBlock}.` : ''}`, actions: [{ label: `Open ${i.id}`, route: { app: 'invoice', id: i.id } }] }
  }
  if (/block/.test(t)) {
    const b = inv.filter((i) => i.status === 'Blocked for Payment')
    return {
      from: 'joule',
      text: b.length ? `${b.length} invoices are blocked for payment, ${usd(b.reduce((s, i) => s + i.gross, 0))} USD in total. The largest is ${[...b].sort((x, y) => y.gross - x.gross)[0].id} from ${[...b].sort((x, y) => y.gross - x.gross)[0].supplierName}.` : 'No invoices are blocked for payment right now.',
      actions: [{ label: 'Manage Payment Blocks', route: { app: 'paymentBlocks' } }],
    }
  }
  if (/overdue|late|past due/.test(t)) {
    const o = inv.filter((i) => (i.status === 'Posted' || i.status === 'Blocked for Payment') && +new Date(i.dueDate) < Date.now())
    return { from: 'joule', text: `${o.length} open invoices are past their due date, ${usd(o.reduce((s, i) => s + i.gross, 0))} USD in total.`, actions: [{ label: 'Display Supplier Balances', route: { app: 'supplierBalances' } }] }
  }
  if (/payment run|due|pay/.test(t)) {
    const lim = Date.now() + 7 * 86400000
    const d = inv.filter((i) => i.status === 'Posted' && +new Date(i.dueDate) <= lim)
    return { from: 'joule', text: `${d.length} posted invoices are due within 7 days (${usd(d.reduce((s, i) => s + i.gross, 0))} USD). I can prepare the proposal in Manage Automatic Payments.`, actions: [{ label: 'Manage Automatic Payments', route: { app: 'paymentRun' } }] }
  }
  if (/approval|release/.test(t)) {
    const a = pos.filter((p) => p.status === 'In Approval')
    return { from: 'joule', text: `${a.length} purchase orders are waiting for release: ${a.slice(0, 4).map((p) => p.id).join(', ')}${a.length > 4 ? '…' : ''}.`, actions: [{ label: 'Purchase Orders in Approval', route: { app: 'pos', status: 'In Approval' } }] }
  }
  if (/create|post|new/.test(t) && /invoice/.test(t)) return { from: 'joule', text: 'Sure — open Create Supplier Invoice, enter the invoicing party and reference the purchase order; I’ll check the balance for you.', actions: [{ label: 'Create Supplier Invoice', route: { app: 'createInvoice' } }] }
  if (/journal|trial|balance|g\/l/.test(t)) return { from: 'joule', text: 'The trial balance for company code 1010 is built from all posted journal entries in fiscal year 2026.', actions: [{ label: 'Trial Balance', route: { app: 'trialBalance' } }, { label: 'Manage Journal Entries', route: { app: 'journals' } }] }
  const sup = db.get<any>('sap.suppliers').find((s) => t.includes(s.name.toLowerCase().split(/[ ,.]/)[0]))
  if (sup) {
    const open = inv.filter((i) => i.supplierId === sup.id && (i.status === 'Posted' || i.status === 'Blocked for Payment'))
    return { from: 'joule', text: `${sup.name} (${sup.id}), ${sup.city}: payment terms ${sup.paymentTerms}, ${open.length} open invoices totalling ${usd(open.reduce((s, i) => s + i.gross, 0))} USD.`, actions: [{ label: 'Supplier Fact Sheet', route: { app: 'supplier', id: sup.id } }] }
  }
  return { from: 'joule', text: 'I can look up purchase orders and supplier invoices by number, summarize blocked or overdue payables, and take you to the right app. Try one of the suggestions below.' }
}

export function JoulePanel({ go, onClose }: { go: Go; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'joule', text: 'Hi Alex, I’m Joule. How can I help with accounts payable today?' }])
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs])
  const ask = (text: string) => {
    if (!text.trim()) return
    setMsgs((m) => [...m, { from: 'me', text }, answer(text)])
    setQ('')
  }
  return (
    <div className="absolute right-0 top-[52px] bottom-0 w-[380px] z-40 bg-white border-l border-[#d9d9d9] shadow-[-0.5rem_0_1.5rem_rgba(34,53,72,0.15)] flex flex-col" data-agent="sap-joule-panel">
      <div className="h-12 px-4 flex items-center gap-2 border-b border-[#e5e5e5]">
        <Sparkles className="w-5 h-5" style={{ color: '#5d36ff' }} />
        <div className="text-[16px] font-bold flex-1">Joule</div>
        <button aria-label="Close Joule" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#eaecee] flex items-center justify-center"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3 text-[14px]">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'me' ? 'flex justify-end' : ''}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 leading-[1.45] ${m.from === 'me' ? 'bg-[#5d36ff] text-white' : 'bg-[#f5f6f7]'}`}>
              {m.text.split('**').map((p, j) => (j % 2 ? <b key={j}>{p}</b> : <span key={j}>{p}</span>))}
              {m.actions && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {m.actions.map((a) => (
                    <button key={a.label} onClick={() => go(a.route)} className="h-7 px-2.5 rounded-lg border border-[#5d36ff] text-[#5d36ff] bg-white text-[13px] font-semibold hover:bg-[#f1ecff]">{a.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} className="h-7 px-2.5 rounded-full bg-[#f1ecff] text-[#5d36ff] text-[12px] font-semibold hover:bg-[#e4dbff]">{s}</button>
        ))}
      </div>
      <div className="p-3 border-t border-[#e5e5e5] flex gap-2">
        <input
          aria-label="Message Joule"
          data-agent="sap-joule-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(q)}
          placeholder="Message Joule…"
          className="flex-1 h-9 rounded-[18px] bg-[#eff1f2] px-3 text-[14px] outline-none focus:ring-2 focus:ring-[#5d36ff]/40"
        />
        <button aria-label="Send" onClick={() => ask(q)} className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: '#5d36ff' }}><SendHorizontal className="w-4 h-4" /></button>
      </div>
    </div>
  )
}
