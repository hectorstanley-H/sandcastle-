/** Reports, saved searches, transaction list, chart of accounts and global search. */
import { useMemo, useState, type ReactNode } from 'react'
import { Search, FileText, BookOpen, Users, Landmark, ChevronRight, Folder, FileSpreadsheet } from 'lucide-react'
import { useCollection } from '@/db/db'
import { Btn, Card, PageHead, TH, inp, n2, fd, money, downloadCsv, mergeVendors, NS_ACCOUNTS, type Go, type ReportId, type View } from './ui'

/* ───────────── general ledger built from the transactions in the DB ───────────── */

function useLedger(includePending: boolean) {
  const jes = useCollection<any>('netsuite.journals')
  const bills = useCollection<any>('netsuite.bills')
  const invoices = useCollection<any>('netsuite.invoices')
  return useMemo(() => {
    const m = new Map<string, { dr: number; cr: number }>()
    const post = (acct: string, dr: number, cr: number) => {
      const r = m.get(acct) ?? { dr: 0, cr: 0 }
      r.dr += dr
      r.cr += cr
      m.set(acct, r)
    }
    post('1010 Woodgrove Operating Checking', 182450.12, 0)
    post('3000 Retained Earnings', 0, 182450.12)
    for (const j of jes) {
      if (j.status === 'Rejected' || (!includePending && j.status !== 'Approved')) continue
      for (const l of j.lines) post(l.account, l.debit || 0, l.credit || 0)
    }
    for (const b of bills) {
      if (b.status === 'Rejected' || (!includePending && b.approvalStatus !== 'Approved')) continue
      for (const l of b.lines ?? []) post(l.account, l.amount, 0)
      post('2000 Accounts Payable', 0, b.amount)
      if (b.status === 'Paid In Full') {
        post('2000 Accounts Payable', b.amount, 0)
        post('1010 Woodgrove Operating Checking', 0, b.amount)
      }
    }
    for (const i of invoices) {
      post('1200 Accounts Receivable', i.amount, 0)
      post('4000 Revenue', 0, i.amount)
      if (i.status === 'Paid In Full') {
        post('1010 Woodgrove Operating Checking', i.amount, 0)
        post('1200 Accounts Receivable', 0, i.amount)
      }
    }
    return [...m.entries()].map(([account, v]) => ({ account, dr: v.dr, cr: v.cr, net: Math.round((v.dr - v.cr) * 100) / 100 })).sort((a, b) => a.account.localeCompare(b.account))
  }, [jes, bills, invoices, includePending])
}

const REPORT_TITLES: Record<ReportId, string> = { tb: 'Trial Balance', is: 'Income Statement', bs: 'Balance Sheet', ap: 'A/P Aging Summary' }

export function Report({ id, go }: { id: ReportId; go: Go }) {
  const [pending, setPending] = useState(false)
  const ledger = useLedger(pending)
  const bills = useCollection<any>('netsuite.bills')
  const title = REPORT_TITLES[id]
  let head: string[] = []
  let body: (string | number)[][] = []
  let content: ReactNode = null

  if (id === 'tb') {
    const rows = ledger.filter((r) => r.net !== 0)
    const dr = rows.reduce((t, r) => t + Math.max(0, r.net), 0)
    const cr = rows.reduce((t, r) => t + Math.max(0, -r.net), 0)
    head = ['Account', 'Debit', 'Credit']
    body = rows.map((r) => [r.account, r.net > 0 ? r.net.toFixed(2) : '', r.net < 0 ? (-r.net).toFixed(2) : ''])
    content = (
      <table className="w-full text-[13px]">
        <thead><tr className={TH}><th className="px-3 py-1.5">Account</th><th className="px-3 text-right">Debit</th><th className="px-3 text-right">Credit</th></tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.account} className="h-[28px] border-b border-[#f0f0f0]"><td className="px-3 text-[#3a75c4]">{r.account}</td><td className="px-3 text-right">{r.net > 0 ? n2(r.net) : ''}</td><td className="px-3 text-right">{r.net < 0 ? n2(-r.net) : ''}</td></tr>)}
          <tr className="h-[32px] font-bold bg-[#f7f7f7]"><td className="px-3">Total</td><td className="px-3 text-right">{n2(dr)}</td><td className="px-3 text-right">{n2(cr)}</td></tr>
        </tbody>
      </table>
    )
  } else if (id === 'is' || id === 'bs') {
    const sec = (pred: (a: string) => boolean, sign: 1 | -1) => ledger.filter((r) => pred(r.account) && r.net !== 0).map((r) => ({ ...r, v: r.net * sign }))
    const ni = -ledger.filter((r) => /^[4-8]/.test(r.account)).reduce((t, r) => t + r.net, 0)
    const groups: [string, { account: string; v: number }[]][] =
      id === 'is'
        ? [['Income', sec((a) => a[0] === '4' || a[0] === '8', -1)], ['Expense', sec((a) => /^[5-7]/.test(a), 1)]]
        : [['Assets', sec((a) => a[0] === '1', 1)], ['Liabilities', sec((a) => a[0] === '2', -1)], ['Equity', [...sec((a) => a[0] === '3', -1), { account: 'Net Income', v: ni }]]]
    head = ['Section', 'Account', 'Amount']
    body = groups.flatMap(([g, rows]) => rows.map((r) => [g, r.account, r.v.toFixed(2)]))
    content = (
      <table className="w-full text-[13px]">
        <tbody>
          {groups.map(([g, rows]) => (
            <FragmentRows key={g} title={g} rows={rows} />
          ))}
          <tr className="h-[34px] font-bold bg-[#eef3fb]">
            <td className="px-3">{id === 'is' ? 'Net Income' : 'Total Liabilities & Equity'}</td>
            <td className="px-3 text-right">{money(id === 'is' ? ni : groups.slice(1).flatMap(([, r]) => r).reduce((t, r) => t + r.v, 0))}</td>
          </tr>
        </tbody>
      </table>
    )
  } else {
    const open = bills.filter((b) => b.status === 'Open' || b.status === 'Pending Approval')
    const buckets = ['Current', '1–30', '31–60', '61–90', '> 90']
    const bucket = (b: any) => {
      const d = Math.floor((Date.now() - +new Date(b.dueDate)) / 86400000)
      return d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4
    }
    const vendors = [...new Set(open.map((b) => b.vendor))].sort()
    const grid = vendors.map((v) => {
      const row = [0, 0, 0, 0, 0]
      open.filter((b) => b.vendor === v).forEach((b) => (row[bucket(b)] += b.amount))
      return { v, row, total: row.reduce((a, c) => a + c, 0) }
    })
    const tot = [0, 1, 2, 3, 4].map((i) => grid.reduce((t, g) => t + g.row[i], 0))
    head = ['Vendor', ...buckets, 'Total']
    body = grid.map((g) => [g.v, ...g.row.map((x) => x.toFixed(2)), g.total.toFixed(2)])
    content = (
      <table className="w-full text-[13px]">
        <thead><tr className={TH}><th className="px-3 py-1.5">Vendor</th>{buckets.map((b) => <th key={b} className="px-3 text-right">{b}</th>)}<th className="px-3 text-right">Total</th></tr></thead>
        <tbody>
          {grid.map((g) => (
            <tr key={g.v} className="h-[28px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]" onClick={() => go({ v: 'search' })}>
              <td className="px-3 text-[#3a75c4]">{g.v}</td>{g.row.map((x, i) => <td key={i} className="px-3 text-right">{x ? n2(x) : ''}</td>)}<td className="px-3 text-right font-semibold">{n2(g.total)}</td>
            </tr>
          ))}
          <tr className="h-[32px] font-bold bg-[#f7f7f7]"><td className="px-3">Total</td>{tot.map((x, i) => <td key={i} className="px-3 text-right">{n2(x)}</td>)}<td className="px-3 text-right">{n2(tot.reduce((a, c) => a + c, 0))}</td></tr>
        </tbody>
      </table>
    )
  }

  return (
    <div>
      <PageHead kind={title} title={`Northwind Global Inc. · ${id === 'ap' || id === 'bs' ? `As of ${fd(new Date().toISOString())}` : 'Period: Oct 2026'}`} go={go}>
        <Btn onClick={() => downloadCsv(`${title.replace(/[^A-Za-z]+/g, '')}.csv`, head, body)}>Export — CSV</Btn>
        {id !== 'ap' && <label className="ml-2 flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={pending} onChange={(e) => setPending(e.target.checked)} className="accent-[#3a75c4]" /> Include pending approval</label>}
        <div className="flex-1" />
        {(Object.keys(REPORT_TITLES) as ReportId[]).filter((r) => r !== id).map((r) => <Btn key={r} onClick={() => go({ v: 'report', id: r })}>{REPORT_TITLES[r]}</Btn>)}
      </PageHead>
      <Card>{content}</Card>
    </div>
  )
}
function FragmentRows({ title, rows }: { title: string; rows: { account: string; v: number }[] }) {
  return (
    <>
      <tr className="h-[30px] bg-[#f7f7f7] border-b border-[#e4e4e4]"><td className="px-3 font-bold text-[#24385b]" colSpan={2}>{title}</td></tr>
      {rows.map((r) => <tr key={r.account} className="h-[28px] border-b border-[#f0f0f0]"><td className="pl-8 pr-3">{r.account}</td><td className="px-3 text-right">{money(r.v)}</td></tr>)}
      <tr className="h-[30px] font-semibold border-b border-[#e4e4e4]"><td className="px-3">Total {title}</td><td className="px-3 text-right">{money(rows.reduce((t, r) => t + r.v, 0))}</td></tr>
    </>
  )
}

/* ───────────── Chart of accounts ───────────── */

export function ChartOfAccounts({ go }: { go: Go }) {
  const ledger = useLedger(true)
  const all = [...new Set([...NS_ACCOUNTS, ...ledger.map((l) => l.account)])].sort()
  const type = (a: string) => ({ '1': 'Bank / Asset', '2': 'Liability', '3': 'Equity', '4': 'Income', '5': 'Cost of Goods Sold', '6': 'Expense', '7': 'Other Expense', '8': 'Other Income' } as Record<string, string>)[a[0]] ?? 'Other'
  return (
    <div>
      <PageHead kind="Chart of Accounts" title="Lists › Accounting › Accounts" go={go}><Btn onClick={() => go({ v: 'report', id: 'tb' })}>Trial Balance</Btn></PageHead>
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Number</th><th className="px-2">Name</th><th className="px-2">Type</th><th className="px-3 text-right">Balance</th></tr></thead>
          <tbody>
            {all.map((a) => {
              const bal = ledger.find((l) => l.account === a)?.net ?? 0
              return (
                <tr key={a} className="h-[28px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]" onClick={() => a.startsWith('1010') && go({ v: 'recon' })}>
                  <td className="px-3">{a.slice(0, 4)}</td><td className="px-2 text-[#3a75c4]">{a.slice(5)}</td><td className="px-2">{type(a)}</td><td className="px-3 text-right">{money(bal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ───────────── Saved searches ───────────── */

/** "Open Bills by Vendor" — the original saved search results page */
export function SavedSearch({ go }: { go: Go }) {
  const allBills = useCollection<any>('netsuite.bills').filter((b) => b.status !== 'Paid In Full')
  const [editing, setEditing] = useState(false)
  const [vendor, setVendor] = useState('')
  const [status, setStatus] = useState('')
  const bills = allBills.filter((b) => (!vendor || b.vendor === vendor) && (!status || b.status === status))
  const total = bills.reduce((t, b) => t + b.amount, 0)
  const sorted = [...bills].sort((a, b) => a.vendor.localeCompare(b.vendor))
  const exportCsv = () => downloadCsv('OpenBillsbyVendor.csv', ['Vendor', 'Document Number', 'Date', 'Due Date', 'Status', 'Days Open', 'Amount Remaining'], sorted.map((b) => [b.vendor, b.number, fd(b.date), fd(b.dueDate), b.status, Math.round((Date.now() - +new Date(b.date)) / 86400000), b.amount.toFixed(2)]))
  return (
    <div>
      <PageHead kind="Open Bills by Vendor" title="Saved Search · Results" go={go} list={{ v: 'searches' }}><Btn onClick={() => setEditing((e) => !e)}>Edit this Search</Btn><Btn onClick={exportCsv}>Export — CSV</Btn></PageHead>
      {editing && (
        <div className="mx-6 mt-3 bg-white border border-[#d5d5d5] rounded-[4px] p-4 flex items-end gap-4">
          <div className="w-[260px]"><div className="text-[11px] font-semibold uppercase text-[#666] mb-0.5">Vendor</div><select className={inp} value={vendor} onChange={(e) => setVendor(e.target.value)} aria-label="Vendor filter"><option value="">- All -</option>{[...new Set(allBills.map((b) => b.vendor))].sort().map((v) => <option key={v}>{v}</option>)}</select></div>
          <div className="w-[200px]"><div className="text-[11px] font-semibold uppercase text-[#666] mb-0.5">Status</div><select className={inp} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option value="">- All -</option><option>Open</option><option>Pending Approval</option><option>Rejected</option></select></div>
          <Btn onClick={() => { setVendor(''); setStatus('') }}>Reset</Btn>
        </div>
      )}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Vendor</th><th className="px-2">Document Number</th><th className="px-2">Date</th><th className="px-2">Due Date</th><th className="px-2">Status</th><th className="px-2">Days Open</th><th className="px-3 text-right">Amount Remaining</th></tr></thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} onClick={() => go({ v: 'bill', id: b.id })} className="h-[30px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]"><td className="px-3">{b.vendor}</td><td className="px-2 text-[#3a75c4]">{b.number}</td><td className="px-2">{fd(b.date)}</td><td className="px-2">{fd(b.dueDate)}</td><td className="px-2">{b.status}</td><td className="px-2">{Math.round((Date.now() - +new Date(b.date)) / 86400000)}</td><td className="px-3 text-right">{n2(b.amount)}</td></tr>
            ))}
            <tr className="h-[32px] font-bold bg-[#f7f7f7]"><td className="px-3" colSpan={6}>Total</td><td className="px-3 text-right">{n2(total)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface SSDef { id: string; title: string; type: string; owner: string; desc: string }
export const SAVED_SEARCHES: SSDef[] = [
  { id: 'open-bills', title: 'Open Bills by Vendor', type: 'Transaction', owner: 'Sofia Martinez', desc: 'Unpaid vendor bills grouped by vendor' },
  { id: 'unapproved-je', title: 'Journal Entries Pending Approval', type: 'Transaction', owner: 'Sofia Martinez', desc: 'Manual journals waiting for controller approval' },
  { id: 'unmatched-bank', title: 'Unmatched Bank Lines — Woodgrove ••••4410', type: 'Bank Data', owner: 'Alex Morgan', desc: 'Imported bank lines not yet matched to the register' },
  { id: 'vendor-spend', title: 'Vendor Spend — Last 90 Days', type: 'Transaction', owner: 'Alex Morgan', desc: 'Billed spend summarized by vendor' },
  { id: 'overdue-ar', title: 'Overdue Customer Invoices', type: 'Transaction', owner: 'Liam Carter', desc: 'Open A/R past due date' },
]

export function SavedSearchList({ go }: { go: Go }) {
  return (
    <div>
      <PageHead kind="Saved Searches" title="Lists › Search › Saved Searches" go={go} />
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Title</th><th className="px-2">Search Type</th><th className="px-2">Description</th><th className="px-2">Owner</th><th className="w-8" /></tr></thead>
          <tbody>
            {SAVED_SEARCHES.map((s) => (
              <tr key={s.id} onClick={() => go(s.id === 'open-bills' ? { v: 'search' } : { v: 'ss', id: s.id })} className="h-[32px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]">
                <td className="px-3 text-[#3a75c4]">{s.title}</td><td className="px-2">{s.type}</td><td className="px-2 text-[#555]">{s.desc}</td><td className="px-2">{s.owner}</td><td><ChevronRight className="w-4 h-4 text-[#999]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function SavedSearchResults({ id, go }: { id: string; go: Go }) {
  const jes = useCollection<any>('netsuite.journals')
  const bank = useCollection<any>('netsuite.bankLines')
  const bills = useCollection<any>('netsuite.bills')
  const invoices = useCollection<any>('netsuite.invoices')
  const [q, setQ] = useState('')
  const def = SAVED_SEARCHES.find((s) => s.id === id)
  let head: string[] = []
  let rows: { key: string; cells: (string | number)[]; open?: View }[] = []
  if (id === 'unapproved-je') {
    head = ['Date', 'Number', 'Memo', 'Created By', 'Amount']
    rows = jes.filter((j) => j.status === 'Pending Approval').map((j) => ({ key: j.id, cells: [fd(j.date), j.number, j.memo, j.createdByName, n2(j.lines.reduce((t: number, l: any) => t + l.debit, 0))], open: { v: 'je', id: j.id } }))
  } else if (id === 'unmatched-bank') {
    head = ['Date', 'Description', 'Type', 'Amount']
    rows = bank.filter((b) => b.status === 'unmatched').map((b) => ({ key: b.id, cells: [fd(b.date), b.description, b.type, money(b.amount)], open: { v: 'match' } }))
  } else if (id === 'vendor-spend') {
    head = ['Vendor', 'Bills', 'Amount']
    const since = Date.now() - 90 * 86400000
    const m = new Map<string, { n: number; t: number }>()
    bills.filter((b) => +new Date(b.date) >= since && b.status !== 'Rejected').forEach((b) => { const r = m.get(b.vendor) ?? { n: 0, t: 0 }; r.n++; r.t += b.amount; m.set(b.vendor, r) })
    rows = [...m.entries()].sort((a, b) => b[1].t - a[1].t).map(([v, r]) => ({ key: v, cells: [v, r.n, n2(r.t)], open: { v: 'vendors' } }))
  } else if (id === 'overdue-ar') {
    head = ['Number', 'Customer', 'Due Date', 'Days Overdue', 'Amount']
    rows = invoices.filter((i) => i.status === 'Open' && +new Date(i.dueDate) < Date.now()).map((i) => ({ key: i.id, cells: [i.number, i.customer, fd(i.dueDate), Math.floor((Date.now() - +new Date(i.dueDate)) / 86400000), n2(i.amount)], open: { v: 'invoices', overdue: true } }))
  }
  const shown = rows.filter((r) => !q || r.cells.join(' ').toLowerCase().includes(q.toLowerCase()))
  if (!def) return <div className="p-6">Saved search not found.</div>
  return (
    <div>
      <PageHead kind={def.title} title={`Saved Search · Results · ${shown.length} result(s)`} go={go} list={{ v: 'searches' }}>
        <input className={`${inp} !w-[240px]`} placeholder="Filter results" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter results" />
        <Btn onClick={() => downloadCsv(`${def.title.replace(/[^A-Za-z0-9]+/g, '')}.csv`, head, shown.map((r) => r.cells))}>Export — CSV</Btn>
      </PageHead>
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}>{head.map((h, i) => <th key={h} className={`px-3 py-1.5 ${i === head.length - 1 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => <tr key={r.key} onClick={() => r.open && go(r.open)} className="h-[30px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]">{r.cells.map((c, i) => <td key={i} className={`px-3 ${i === r.cells.length - 1 ? 'text-right' : ''} ${i === 1 ? 'text-[#3a75c4]' : ''}`}>{c}</td>)}</tr>)}
            {shown.length === 0 && <tr><td colSpan={head.length} className="h-14 text-center text-[#888]">No results.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ───────────── Transaction list ───────────── */

export function TxnList({ go, type: initialType }: { go: Go; type?: string }) {
  const jes = useCollection<any>('netsuite.journals')
  const bills = useCollection<any>('netsuite.bills')
  const book = useCollection<any>('netsuite.bookTxns')
  const payments = useCollection<any>('netsuite.payments')
  const invoices = useCollection<any>('netsuite.invoices')
  const [type, setType] = useState(initialType ?? '')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const all = useMemo(() => {
    const r: { key: string; date: string; type: string; number: string; name: string; memo: string; status: string; amount: number; open?: View }[] = []
    jes.forEach((j) => r.push({ key: j.id, date: j.date, type: 'Journal', number: j.number, name: '', memo: j.memo, status: j.status, amount: j.lines.reduce((t: number, l: any) => t + l.debit, 0), open: { v: 'je', id: j.id } }))
    bills.forEach((b) => r.push({ key: b.id, date: b.date, type: 'Bill', number: b.number, name: b.vendor, memo: b.memo, status: b.status, amount: b.amount, open: { v: 'bill', id: b.id } }))
    payments.forEach((p) => r.push({ key: p.id, date: p.date, type: 'Bill Payment', number: p.number, name: p.vendors.join(', '), memo: 'ACH', status: 'Paid', amount: -p.amount }))
    invoices.forEach((i) => r.push({ key: i.id, date: i.date, type: 'Invoice', number: i.number, name: i.customer, memo: i.memo, status: i.status, amount: i.amount, open: { v: 'invoices' } }))
    book.filter((t) => t.type !== 'Journal').forEach((t) => r.push({ key: t.id, date: t.date, type: t.type, number: t.number, name: t.name, memo: t.memo, status: t.status === 'unmatched' ? 'Not Cleared' : 'Cleared', amount: t.amount, open: { v: 'match' } }))
    return r.sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [jes, bills, book, payments, invoices])
  const types = [...new Set(all.map((r) => r.type))].sort()
  const statuses = [...new Set(all.filter((r) => !type || r.type === type).map((r) => r.status))].sort()
  const rows = all.filter((r) => (!type || r.type === type) && (!status || r.status === status) && (!q || `${r.number} ${r.name} ${r.memo}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div>
      <PageHead kind="Transactions" title={`${rows.length} record(s)`} go={go}>
        <select className={`${inp} !w-[170px]`} value={type} onChange={(e) => { setType(e.target.value); setStatus('') }} aria-label="Type"><option value="">Type: - All -</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
        <select className={`${inp} !w-[170px]`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Status: - All -</option>{statuses.map((t) => <option key={t}>{t}</option>)}</select>
        <input className={`${inp} !w-[220px]`} placeholder="Number, name or memo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter transactions" />
        <Btn onClick={() => downloadCsv('Transactions.csv', ['Date', 'Type', 'Number', 'Name', 'Memo', 'Status', 'Amount'], rows.map((r) => [fd(r.date), r.type, r.number, r.name, r.memo, r.status, r.amount.toFixed(2)]))}>Export — CSV</Btn>
      </PageHead>
      <Card>
        <table className="w-full text-[13px]">
          <thead><tr className={TH}><th className="px-3 py-1.5">Date</th><th className="px-2">Type</th><th className="px-2">Number</th><th className="px-2">Name</th><th className="px-2">Memo</th><th className="px-2">Status</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type + r.key} onClick={() => r.open && go(r.open)} className="h-[30px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]">
                <td className="px-3 whitespace-nowrap">{fd(r.date)}</td><td className="px-2">{r.type}</td><td className="px-2 text-[#3a75c4]">{r.number}</td><td className="px-2">{r.name}</td><td className="px-2 truncate max-w-[260px]">{r.memo}</td><td className="px-2">{r.status}</td><td className={`px-3 text-right ${r.amount < 0 ? 'text-[#c0392b]' : ''}`}>{money(r.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="h-14 text-center text-[#888]">No records to show.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

/* ───────────── Global search ───────────── */

export const PAGES: [string, View][] = [
  ['Match Bank Data', { v: 'match' }], ['Reconcile Account Statement', { v: 'recon' }], ['Make Journal Entries', { v: 'je' }], ['Journal Entries', { v: 'jes' }],
  ['Enter Bills', { v: 'bill' }], ['Approve Bills', { v: 'bills' }], ['Pay Bills', { v: 'pay' }], ['Saved Searches', { v: 'searches' }], ['Vendors', { v: 'vendors' }],
  ['Customers', { v: 'customers' }], ['Chart of Accounts', { v: 'coa' }], ['Trial Balance', { v: 'report', id: 'tb' }], ['Income Statement', { v: 'report', id: 'is' }],
  ['Balance Sheet', { v: 'report', id: 'bs' }], ['A/P Aging Summary', { v: 'report', id: 'ap' }], ['Tasks', { v: 'tasks' }], ['Transactions', { v: 'txns' }],
  ['Approve Purchase Orders', { v: 'pos' }], ['Invoices', { v: 'invoices' }], ['Company Information', { v: 'company' }],
]

export function GlobalSearch({ q, go }: { q: string; go: Go }) {
  const jes = useCollection<any>('netsuite.journals')
  const bills = useCollection<any>('netsuite.bills')
  const bank = useCollection<any>('netsuite.bankLines')
  const vendors = mergeVendors(useCollection<any>('netsuite.vendors'), bills)
  const customers = useCollection<any>('netsuite.customers')
  const s = q.trim().toLowerCase()
  const has = (...xs: any[]) => xs.join(' ').toLowerCase().includes(s)
  const groups: [string, any, { key: string; label: string; sub: string; view: View }[]][] = [
    ['Pages', FileText, PAGES.filter(([l]) => has(l)).map(([l, v]) => ({ key: l, label: l, sub: 'Page', view: v }))],
    ['Journal Entries', BookOpen, jes.filter((j) => has(j.number, j.memo)).map((j) => ({ key: j.id, label: `Journal #${j.number}`, sub: `${j.memo} · ${j.status}`, view: { v: 'je', id: j.id } }))],
    ['Bills', FileSpreadsheet, bills.filter((b) => has(b.number, b.vendor, b.memo, b.refNo)).map((b) => ({ key: b.id, label: `Bill #${b.number} — ${b.vendor}`, sub: `$${n2(b.amount)} · ${b.status}`, view: { v: 'bill', id: b.id } }))],
    ['Vendors', Users, vendors.filter((v) => has(v.name, v.email)).map((v) => ({ key: v.id, label: v.name, sub: v.category, view: { v: 'vendor', id: v.id } }))],
    ['Customers', Users, customers.filter((c) => has(c.name)).map((c) => ({ key: c.id, label: c.name, sub: `Sales rep ${c.salesRep}`, view: { v: 'customers' } }))],
    ['Bank Data', Landmark, bank.filter((b) => has(b.description, b.amount)).map((b) => ({ key: b.id, label: b.description, sub: `${fd(b.date)} · ${money(b.amount)} · ${b.status}`, view: { v: 'match' } }))],
  ]
  const total = groups.reduce((t, g) => t + g[2].length, 0)
  return (
    <div>
      <PageHead kind="Global Search" title={`${total} result(s) for “${q}”`} go={go} />
      {!s || total === 0 ? (
        <Card><div className="h-20 flex items-center justify-center text-[13px] text-[#888] gap-2"><Search className="w-4 h-4" /> No records match “{q}”. Try a document number, vendor or amount.</div></Card>
      ) : (
        groups.filter(([, , r]) => r.length).map(([title, Icon, rows]) => (
          <Card key={title} className="!mb-0">
            <div className="px-4 pt-3 pb-2 text-[13px] font-bold text-[#24385b] uppercase flex items-center gap-2"><Icon className="w-4 h-4" /> {title} ({rows.length})</div>
            {rows.slice(0, 12).map((r) => (
              <button key={r.key} onClick={() => go(r.view)} className="w-full text-left px-4 py-1.5 border-t border-[#f0f0f0] hover:bg-[#f5f8fc] text-[13px] flex items-center gap-3">
                <span className="text-[#3a75c4]">{r.label}</span><span className="text-[#777] truncate">{r.sub}</span>
              </button>
            ))}
          </Card>
        ))
      )}
      <div className="h-6" />
    </div>
  )
}

/* ───────────── File cabinet (read-only) ───────────── */

export function FileCabinet({ go }: { go: Go }) {
  const [open, setOpen] = useState('Bank Statements')
  const FOLDERS: Record<string, [string, string, string][]> = {
    'Bank Statements': [['Woodgrove_4410_Oct2026.bai2', 'Today 6:02 AM', '18 KB'], ['Woodgrove_4410_Sep2026.bai2', 'Oct 1, 2026', '21 KB'], ['Woodgrove_4410_Aug2026.bai2', 'Sep 1, 2026', '19 KB']],
    'Vendor Invoices': [['INV-20931_Fabrikam.pdf', 'Yesterday', '214 KB'], ['LW-7781_Litware.pdf', 'Yesterday', '96 KB'], ['RC-OCT-2026_Relecloud.pdf', 'Oct 6, 2026', '132 KB']],
    'Month-End Close': [['Oct2026_Close_Checklist.xlsx', '2 days ago', '48 KB'], ['Sep2026_Flux_Analysis.xlsx', 'Oct 8, 2026', '77 KB']],
    'Templates': [['JE_Import_Template.csv', 'Mar 3, 2026', '2 KB'], ['Vendor_Setup_Form.pdf', 'Jan 14, 2026', '88 KB']],
  }
  return (
    <div>
      <PageHead kind="File Cabinet" title="Documents › Files › File Cabinet" go={go} />
      <div className="m-6 grid grid-cols-[240px_1fr] gap-4">
        <div className="bg-white border border-[#d5d5d5] rounded-[4px] py-2">
          {Object.keys(FOLDERS).map((f) => (
            <button key={f} onClick={() => setOpen(f)} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left ${open === f ? 'bg-[#dfeafa] font-semibold' : 'hover:bg-[#f5f8fc]'}`}><Folder className="w-4 h-4 text-[#e0a526]" /> {f}</button>
          ))}
        </div>
        <div className="bg-white border border-[#d5d5d5] rounded-[4px]">
          <table className="w-full text-[13px]">
            <thead><tr className={TH}><th className="px-3 py-1.5">Name</th><th className="px-2">Modified</th><th className="px-3 text-right">Size</th></tr></thead>
            <tbody>{FOLDERS[open].map(([n, d, s]) => <tr key={n} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3 flex items-center gap-2 h-[30px]"><FileText className="w-4 h-4 text-[#888]" /> {n}</td><td className="px-2">{d}</td><td className="px-3 text-right">{s}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
