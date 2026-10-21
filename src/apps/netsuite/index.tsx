import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Search, Bell, HelpCircle, ChevronDown, Home, Star, Plus, X, CheckCircle2, AlertTriangle, Link2, Settings, Clock, User } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection, useRecord } from '@/db/db'
import { isoDate } from '@/data/time'

const BAR = '#13212c'
const MENU = '#26394a'
const BTN = '#3a75c4'
const n2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '')

export const NS_ACCOUNTS = [
  '1010 Woodgrove Operating Checking', '1020 Woodgrove Payroll Account', '1200 Accounts Receivable', '1300 Prepaid Expenses', '1590 Accumulated Depreciation',
  '2000 Accounts Payable', '2100 Accrued Payroll', '2150 Accrued Liabilities', '2400 Deferred Revenue', '4000 Revenue',
  '6000 Salaries & Wages', '6110 Office Supplies', '6120 Facilities Maintenance', '6130 Utilities', '6200 Professional Services', '6401 Software Subscriptions',
  '6403 Cloud Hosting', '6810 Bank Service Charges', '6900 Depreciation Expense', '7100 Unrealized FX Gain/Loss', '8100 Interest Income',
]
const DEPTS = ['Finance', 'Operations', 'Sales', 'IT', 'G&A']

type View = { v: 'home' } | { v: 'match' } | { v: 'recon' } | { v: 'je'; id?: string } | { v: 'jes' } | { v: 'bill'; id?: string } | { v: 'bills' } | { v: 'search' }

function Btn({ primary, children, className = '', ...rest }: any) {
  return (
    <button className={`inline-flex items-center gap-1 h-[28px] px-3 rounded-[3px] text-[13px] font-semibold border disabled:opacity-50 ${primary ? 'text-white border-[#2b5fa6]' : 'bg-[#f0f0f0] text-[#333] border-[#b9b9b9] hover:bg-[#e4e4e4]'} ${className}`} style={primary ? { background: `linear-gradient(#4a86d4, ${BTN})` } : undefined} {...rest}>
      {children}
    </button>
  )
}
const inp = 'h-[26px] w-full rounded-[3px] border border-[#b9b9b9] bg-white px-1.5 text-[13px] outline-none focus:border-[#3a75c4] focus:shadow-[0_0_0_1px_#3a75c4]'
function F({ label, req, children }: { label: string; req?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase text-[#666] mb-0.5 tracking-wide">{label}{req && <span className="text-[#c00]"> *</span>}</div>
      {children}
    </div>
  )
}
function Portlet({ title, children, agent, right }: { title: string; children: ReactNode; agent?: string; right?: ReactNode }) {
  return (
    <div className="bg-white rounded-[4px] border border-[#d5d5d5] shadow-[0_1px_2px_rgba(0,0,0,0.06)]" data-agent={agent}>
      <div className="h-9 px-3 flex items-center border-b border-[#e4e4e4]">
        <div className="text-[13px] font-bold text-[#24385b] uppercase tracking-wide flex-1">{title}</div>
        {right}
        <Settings className="w-3.5 h-3.5 text-[#999] ml-2" />
      </div>
      <div>{children}</div>
    </div>
  )
}
function HW() {
  return <span className="inline-flex items-center gap-1 h-[18px] pl-0.5 pr-1.5 rounded-full text-[10.5px] font-semibold text-white align-middle" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}><img src={logoUrl('hworker')} className="w-3.5 h-3.5 rounded-full" alt="" /> H-Worker</span>
}
function PageHead({ kind, title, children, status }: { kind: string; title: ReactNode; children?: ReactNode; status?: ReactNode }) {
  return (
    <div className="px-6 pt-4 pb-3 bg-white border-b border-[#d5d5d5]">
      <div className="flex items-center gap-3">
        <div className="text-[22px] text-[#24385b] font-semibold">{kind}</div>
        {status}
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[12px] text-[#3a75c4]"><span>List</span><span>Search</span><span>Customize</span></div>
      </div>
      {title && <div className="text-[14px] text-[#555] mt-0.5">{title}</div>}
      {children && <div className="flex items-center gap-2 mt-3">{children}</div>}
    </div>
  )
}

const MENU_ITEMS: Record<string, [string, [string, View, string][]][]> = {
  Transactions: [
    ['Bank', [['Match Bank Data', { v: 'match' }, 'ns-menu-match'], ['Reconcile Account Statement', { v: 'recon' }, 'ns-menu-recon']]],
    ['Financial', [['Make Journal Entries', { v: 'je' }, 'ns-menu-make-je'], ['Journal Entries', { v: 'jes' }, 'ns-menu-jes']]],
    ['Payables', [['Enter Bills', { v: 'bill' }, 'ns-menu-enter-bills'], ['Approve Bills', { v: 'bills' }, 'ns-menu-approve-bills']]],
  ],
  Lists: [['Search', [['Saved Searches', { v: 'search' }, 'ns-menu-saved-searches']]], ['Accounting', [['Journal Entries', { v: 'jes' }, 'ns-menu-list-jes']]]],
  Reports: [['Saved Reports', [['Open Bills by Vendor', { v: 'search' }, 'ns-menu-report-bills']]]],
}

export default function NetSuite({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [view, setView] = useState<View>({ v: 'home' })
  const [menu, setMenu] = useState<string | null>(null)
  const go = (v: View) => {
    setView(v)
    setMenu(null)
  }
  useEffect(() => {
    if (params?.journalId) setView({ v: 'je', id: params.journalId })
    else if (params?.billId) setView({ v: 'bill', id: params.billId })
    else if (params?.view) setView({ v: params.view } as any)
  }, [win.nonce])
  useEffect(() => {
    const b = 'https://4820193.app.netsuite.com/app'
    const m: Record<string, [string, string]> = {
      home: ['/center/card.nl?sc=-29', 'Home - NetSuite (Northwind Global Inc.)'],
      match: ['/accounting/bankfeeds/matchbankdata.nl?account=1010', 'Match Bank Data - NetSuite (Northwind Global Inc.)'],
      recon: ['/accounting/transactions/reconcile.nl?account=1010', 'Reconcile Account Statement - NetSuite (Northwind Global Inc.)'],
      je: [(view as any).id ? `/accounting/transactions/journal.nl?id=${(view as any).id.replace('nsj-', '')}` : '/accounting/transactions/journal.nl?whence=', 'Journal Entry - NetSuite (Northwind Global Inc.)'],
      jes: ['/accounting/transactions/transactionlist.nl?Transaction_TYPE=Journal', 'Journal Entries - NetSuite (Northwind Global Inc.)'],
      bill: [(view as any).id ? `/accounting/transactions/vendbill.nl?id=${(view as any).id.replace('nsb-', '')}` : '/accounting/transactions/vendbill.nl?whence=', 'Bill - NetSuite (Northwind Global Inc.)'],
      bills: ['/accounting/transactions/vendbillapproval.nl', 'Approve Bills - NetSuite (Northwind Global Inc.)'],
      search: ['/common/search/searchresults.nl?searchid=1842', 'Open Bills by Vendor - NetSuite (Northwind Global Inc.)'],
    }
    setUrl(b + m[view.v][0])
    setTitle(m[view.v][1])
  }, [view])

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-[#f2f1ef]" style={{ fontFamily: "'Open Sans', Helvetica, Arial, sans-serif", color: '#333' }} onClick={() => menu && setMenu(null)}>
      <div className="h-[46px] shrink-0 flex items-center px-4 gap-4 text-white" style={{ background: BAR }}>
        <button onClick={() => go({ v: 'home' })} className="flex items-baseline gap-1.5" aria-label="NetSuite home">
          <span className="text-[17px] font-bold tracking-[0.12em]" style={{ color: '#fff' }}>ORACLE</span>
          <span className="text-[17px] font-light tracking-[0.08em]">NETSUITE</span>
        </button>
        <div className="h-6 w-px bg-white/20" />
        <span className="text-[13px] opacity-80">Northwind Global Inc.</span>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center w-[420px] h-[30px] rounded-[3px] bg-white/10 border border-white/20 px-2 gap-2">
            <Search className="w-4 h-4 opacity-70" />
            <input placeholder="Search" aria-label="Global search" className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/60" />
          </div>
        </div>
        <HelpCircle className="w-[18px] h-[18px] opacity-80" />
        <div className="relative"><Bell className="w-[18px] h-[18px] opacity-80" /><span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#e8632b] text-[9px] font-bold flex items-center justify-center">4</span></div>
        <div className="flex items-center gap-2 text-[12px] leading-tight">
          <span className="w-7 h-7 rounded-full bg-[#4a6a85] flex items-center justify-center"><User className="w-4 h-4" /></span>
          <span><span className="block font-semibold">Alex Morgan</span><span className="block opacity-70">Northwind Global Inc. — Controller</span></span>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </div>
      </div>
      <div className="h-[36px] shrink-0 flex items-stretch px-2 text-white text-[13px] relative z-30" style={{ background: MENU }}>
        <button onClick={() => go({ v: 'home' })} className="px-3 hover:bg-white/10 flex items-center" aria-label="Home"><Home className="w-4 h-4" /></button>
        <button className="px-3 hover:bg-white/10 flex items-center"><Star className="w-4 h-4" /></button>
        {['Activities', 'Transactions', 'Lists', 'Reports', 'Analytics', 'Documents', 'Setup', 'Customization', 'Support'].map((t) => (
          <div key={t} className="relative">
            <button data-agent={`ns-tab-${t.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); setMenu(menu === t ? null : t) }} className={`h-full px-3.5 hover:bg-white/10 ${menu === t ? 'bg-white/15' : ''}`}>{t}</button>
            {menu === t && MENU_ITEMS[t] && (
              <div className="absolute left-0 top-[36px] w-[280px] bg-white text-[#333] shadow-[0_4px_16px_rgba(0,0,0,0.25)] border border-[#ccc] py-1" onClick={(e) => e.stopPropagation()}>
                {MENU_ITEMS[t].map(([g, items]) => (
                  <div key={g}>
                    <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase text-[#888]">{g}</div>
                    {items.map(([l, v, ag]) => (
                      <button key={l} data-agent={ag} onClick={() => go(v)} className="block w-full text-left px-5 py-1.5 text-[13px] hover:bg-[#e8f0fb]">{l}</button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {view.v === 'home' && <Dashboard go={go} />}
        {view.v === 'match' && <MatchBank go={go} />}
        {view.v === 'recon' && <Reconcile go={go} />}
        {view.v === 'je' && (view.id ? <JournalView id={view.id} go={go} /> : <JournalForm go={go} />)}
        {view.v === 'jes' && <JournalList go={go} />}
        {view.v === 'bill' && (view.id ? <BillView id={view.id} /> : <BillForm go={go} />)}
        {view.v === 'bills' && <ApproveBills go={go} />}
        {view.v === 'search' && <SavedSearch go={go} />}
      </div>
    </div>
  )
}

/* ───────────── Dashboard ───────────── */

function Gauge({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const a = Math.min(1, value / max) * Math.PI
  const x = 60 - 48 * Math.cos(a)
  const y = 60 - 48 * Math.sin(a)
  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="74" viewBox="0 0 120 68">
        <path d="M12 60 A48 48 0 0 1 108 60" fill="none" stroke="#e6e6e6" strokeWidth="11" />
        <path d={`M12 60 A48 48 0 0 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth="11" />
        <text x="60" y="58" textAnchor="middle" fontSize="15" fontWeight="700" fill="#24385b">{value}%</text>
      </svg>
      <div className="text-[12px] text-[#555] -mt-1">{label}</div>
    </div>
  )
}

function Dashboard({ go }: { go: (v: View) => void }) {
  const bills = useCollection<any>('netsuite.bills')
  const jes = useCollection<any>('netsuite.journals')
  const bank = useCollection<any>('netsuite.bankLines')
  const toApprove = bills.filter((b) => b.approvalStatus === 'Pending Approval').length
  const jeApprove = jes.filter((j) => j.status === 'Pending Approval').length
  const unrec = bank.filter((b) => b.status !== 'reconciled').length
  const trend = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((m, i) => ({ m, cash: [24.1, 25.8, 23.9, 26.4, 27.2, 28.6][i], ap: [3.1, 3.4, 2.9, 3.6, 3.3, 3.8][i] }))
  const rem: [string, number | string, View | null, string][] = [
    ['Bills to Approve', toApprove, { v: 'bills' }, 'ns-reminder-bills'],
    ['Journal Entries to Approve', jeApprove, { v: 'jes' }, 'ns-reminder-jes'],
    ['Bank Account Lines to Reconcile', unrec, { v: 'match' }, 'ns-reminder-bank'],
    ['Purchase Orders to Approve', 4, null, 'ns-reminder-pos'],
    ['Overdue Invoices', 7, null, 'ns-reminder-overdue'],
    ['Vendor Returns to Approve', 1, null, 'ns-reminder-returns'],
  ]
  return (
    <div className="p-4">
      <div className="flex items-center mb-3">
        <div className="text-[20px] text-[#24385b] font-semibold">Home</div>
        <span className="ml-3 text-[12px] text-[#666]">Controller Dashboard · Period: Oct 2026</span>
        <div className="flex-1" />
        <button className="text-[12px] text-[#3a75c4]">Personalize</button>
        <button className="ml-3 text-[12px] text-[#3a75c4]">Layout</button>
      </div>
      <div className="grid grid-cols-[300px_1fr_300px] gap-4">
        <div className="space-y-4">
          <Portlet title="Reminders">
            {rem.map(([l, n, v, ag]) => (
              <button key={l} data-agent={ag} onClick={() => v && go(v)} className="w-full flex items-center gap-3 px-3 py-2 border-b border-[#f0f0f0] hover:bg-[#f5f8fc] text-left">
                <span className={`min-w-[38px] h-[26px] rounded-[3px] text-[15px] font-bold flex items-center justify-center ${Number(n) > 0 ? 'text-[#c0392b] bg-[#fdf0ee]' : 'text-[#1e7b34] bg-[#eef8f0]'}`}>{n}</span>
                <span className="text-[13px] text-[#3a75c4]">{l}</span>
              </button>
            ))}
          </Portlet>
          <Portlet title="Navigation Shortcuts">
            {([['Match Bank Data', { v: 'match' }], ['Reconcile Account Statement', { v: 'recon' }], ['Make Journal Entries', { v: 'je' }], ['Enter Bills', { v: 'bill' }], ['Open Bills by Vendor', { v: 'search' }]] as [string, View][]).map(([l, v]) => (
              <button key={l} onClick={() => go(v)} className="block w-full text-left px-3 py-1.5 text-[13px] text-[#3a75c4] hover:underline">{l}</button>
            ))}
          </Portlet>
        </div>
        <div className="space-y-4 min-w-0">
          <Portlet title="Key Performance Indicators">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] uppercase text-[#777] border-b border-[#eee]"><th className="px-3 py-1.5">Indicator</th><th className="px-3 text-right">Period</th><th className="px-3 text-right">Current</th><th className="px-3 text-right">Previous</th><th className="px-3 text-right">Change</th></tr></thead>
              <tbody>
                {[['Revenue', 'This Month', 4218400, 3982150, 5.9], ['Expenses', 'This Month', 2961225, 2874010, 3.0], ['Bank Balance — Operating', 'Today', 28612480, 27195330, 5.2], ['A/R Balance', 'Today', 6840220, 7106490, -3.7], ['A/P Balance', 'Today', 3802115, 3305190, 15.0]].map(([k, p, c, pr, ch]: any) => (
                  <tr key={k} className="border-b border-[#f3f3f3]"><td className="px-3 py-2 text-[#3a75c4]">{k}</td><td className="px-3 text-right text-[#666]">{p}</td><td className="px-3 text-right font-semibold">${n2(c)}</td><td className="px-3 text-right">${n2(pr)}</td><td className={`px-3 text-right font-semibold ${ch >= 0 ? 'text-[#1e7b34]' : 'text-[#c0392b]'}`}>{ch > 0 ? '▲' : '▼'} {Math.abs(ch)}%</td></tr>
                ))}
              </tbody>
            </table>
          </Portlet>
          <Portlet title="KPI Meter">
            <div className="flex justify-around py-3">
              <Gauge label="Close Tasks Complete" value={68} max={100} color="#3a75c4" />
              <Gauge label="Bills Paid On Time" value={94} max={100} color="#1e7b34" />
              <Gauge label="Budget Utilization" value={81} max={100} color="#e8632b" />
            </div>
          </Portlet>
          <Portlet title="Trend Graph — Cash vs. A/P ($M)">
            <div className="h-[190px] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#eee" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area dataKey="cash" stroke="#3a75c4" fill="#3a75c4" fillOpacity={0.18} strokeWidth={2} name="Cash" />
                  <Area dataKey="ap" stroke="#e8632b" fill="#e8632b" fillOpacity={0.15} strokeWidth={2} name="A/P" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Portlet>
        </div>
        <div className="space-y-4">
          <Portlet title="Recent Records">
            {jes.slice(0, 4).map((j) => (
              <button key={j.id} onClick={() => go({ v: 'je', id: j.id })} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[#f5f8fc]"><Clock className="w-3.5 h-3.5 text-[#999]" /><span className="text-[#3a75c4]">Journal #{j.number}</span></button>
            ))}
            {bills.slice(0, 3).map((b) => (
              <button key={b.id} onClick={() => go({ v: 'bill', id: b.id })} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[#f5f8fc]"><Clock className="w-3.5 h-3.5 text-[#999]" /><span className="text-[#3a75c4]">Bill #{b.number} — {b.vendor}</span></button>
            ))}
          </Portlet>
          <Portlet title="Quick Add">
            <div className="p-3 grid grid-cols-2 gap-2">
              {([['Journal', { v: 'je' }], ['Bill', { v: 'bill' }], ['Customer', null], ['Vendor', null]] as [string, View | null][]).map(([l, v]) => (
                <button key={l} onClick={() => v && go(v)} className="h-8 rounded-[3px] border border-[#d5d5d5] text-[12.5px] text-[#3a75c4] hover:bg-[#f5f8fc] flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> {l}</button>
              ))}
            </div>
          </Portlet>
          <Portlet title="Announcements">
            <div className="p-3 text-[12.5px] leading-relaxed text-[#555]">October soft close: bank recs and accruals due <b>Friday 5 PM ET</b>. — Sofia Martinez</div>
          </Portlet>
        </div>
      </div>
    </div>
  )
}

/* ───────────── Match Bank Data ───────────── */

function MatchBank({ go }: { go: (v: View) => void }) {
  const { isAgent } = useDesk()
  const bank = useCollection<any>('netsuite.bankLines')
  const book = useCollection<any>('netsuite.bookTxns')
  const [tab, setTab] = useState<'open' | 'matched'>('open')
  const [selB, setSelB] = useState<Set<string>>(new Set())
  const [selT, setSelT] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const openB = bank.filter((b) => (tab === 'open' ? b.status === 'unmatched' : b.status !== 'unmatched')).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const openT = book.filter((b) => (tab === 'open' ? b.status === 'unmatched' : b.status !== 'unmatched')).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const sb = bank.filter((b) => selB.has(b.id)).reduce((t, b) => t + b.amount, 0)
  const st = book.filter((b) => selT.has(b.id)).reduce((t, b) => t + b.amount, 0)
  const diff = Math.round((sb - st) * 100) / 100
  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, id: string) => {
    const n = new Set(set)
    n.has(id) ? n.delete(id) : n.add(id)
    fn(n)
  }
  const match = () => {
    if (!selB.size || !selT.size) return
    if (diff !== 0) return setMsg({ ok: false, t: `Selected amounts differ by $${n2(Math.abs(diff))}. Bank data and account transactions must total the same amount to match.` })
    const mid = 'm-' + Date.now().toString(36)
    selB.forEach((id) => db.update('netsuite.bankLines', id, { status: 'matched', matchId: mid, matchedBy: isAgent ? 'hworker' : undefined }))
    selT.forEach((id) => db.update('netsuite.bookTxns', id, { status: 'matched', matchId: mid }))
    setMsg({ ok: true, t: `Matched ${selB.size} bank line(s) to ${selT.size} transaction(s) — $${n2(sb)}.` })
    setSelB(new Set())
    setSelT(new Set())
  }
  const submit = () => {
    bank.filter((b) => b.status === 'matched').forEach((b) => db.update('netsuite.bankLines', b.id, { status: 'reconciled', reconciledAt: new Date().toISOString(), reconciledBy: isAgent ? 'hworker' : undefined }))
    book.filter((b) => b.status === 'matched').forEach((b) => db.update('netsuite.bookTxns', b.id, { status: 'reconciled' }))
    go({ v: 'recon' })
  }
  const matchedCount = bank.filter((b) => b.status === 'matched').length
  const Side = ({ title, rows, sel, onToggle, prefix, amountKey }: any) => (
    <div className="bg-white border border-[#d5d5d5] rounded-[4px] flex-1 min-w-0">
      <div className="h-9 px-3 flex items-center border-b border-[#e4e4e4] text-[13px] font-bold text-[#24385b] uppercase tracking-wide">{title} ({rows.length})</div>
      <table className="w-full text-[12.5px]">
        <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="w-8" /><th className="px-2 py-1.5">Date</th><th className="px-2">{prefix === 'ns-bank' ? 'Description' : 'Type / Number / Name'}</th><th className="px-2 text-right">Amount</th></tr></thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} data-agent={`${prefix}-${r.id}`} aria-label={`${r.description ?? r.name} ${n2(r[amountKey])}`} onClick={() => tab === 'open' && onToggle(r.id)} className={`h-[34px] border-b border-[#f0f0f0] ${sel.has(r.id) ? 'bg-[#dfeafa]' : 'hover:bg-[#f5f8fc]'} ${r.status === 'reconciled' ? 'text-[#888]' : ''}`}>
              <td className="text-center"><input type="checkbox" readOnly checked={sel.has(r.id) || r.status !== 'unmatched'} className="accent-[#3a75c4]" aria-label="Select" /></td>
              <td className="px-2 whitespace-nowrap">{fd(r.date)}</td>
              <td className="px-2">{prefix === 'ns-bank' ? r.description : <span><span className="text-[#777]">{r.type}</span> · <span className="text-[#3a75c4]">{r.number}</span> · {r.name}</span>}</td>
              <td className={`px-2 text-right font-semibold whitespace-nowrap ${r[amountKey] < 0 ? 'text-[#c0392b]' : ''}`}>{r[amountKey] < 0 ? `(${n2(-r[amountKey])})` : n2(r[amountKey])}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="h-14 text-center text-[#888]">No records to show.</td></tr>}
        </tbody>
      </table>
    </div>
  )
  return (
    <div>
      <PageHead kind="Match Bank Data" title="Account: 1010 Woodgrove Operating Checking (••••4410) · Bank feed imported today 6:02 AM">
        <Btn primary data-agent="ns-match-submit" disabled={!matchedCount} onClick={submit}>Submit ({matchedCount})</Btn>
        <Btn onClick={() => go({ v: 'recon' })} data-agent="ns-goto-recon">Reconcile Account Statement</Btn>
        <Btn onClick={() => go({ v: 'je' })}>Create Journal Entry</Btn>
      </PageHead>
      <div className="px-6 pt-3 flex gap-5 text-[13px] border-b border-[#d5d5d5] bg-white">
        {([['open', 'To Be Matched'], ['matched', 'Matched / Reconciled']] as const).map(([k, l]) => (
          <button key={k} data-agent={`ns-match-tab-${k}`} onClick={() => setTab(k)} className={`pb-2 border-b-[3px] ${tab === k ? 'border-[#3a75c4] font-bold text-[#24385b]' : 'border-transparent text-[#555]'}`}>{l}</button>
        ))}
      </div>
      {msg && (
        <div className={`mx-6 mt-3 px-3 py-2 rounded-[3px] border text-[13px] flex items-center gap-2 ${msg.ok ? 'bg-[#eef8f0] border-[#9fd3ab] text-[#1e5b2b]' : 'bg-[#fdf0ee] border-[#efb3a9] text-[#8a2a1c]'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {msg.t}
          <button className="ml-auto" onClick={() => setMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      <div className="p-6 flex gap-4 items-start">
        <Side title="Bank Data" rows={openB} sel={selB} onToggle={(id: string) => toggle(selB, setSelB, id)} prefix="ns-bank" amountKey="amount" />
        <Side title="Account Transactions" rows={openT} sel={selT} onToggle={(id: string) => toggle(selT, setSelT, id)} prefix="ns-txn" amountKey="amount" />
      </div>
      {tab === 'open' && (
        <div className="sticky bottom-0 mx-6 mb-4 bg-white border border-[#d5d5d5] rounded-[4px] shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-4 h-12 flex items-center gap-6 text-[13px]">
          <span>Bank selected: <b>{n2(sb)}</b></span>
          <span>Transactions selected: <b>{n2(st)}</b></span>
          <span>Difference: <b className={diff === 0 ? 'text-[#1e7b34]' : 'text-[#c0392b]'} data-agent="ns-match-diff">{n2(diff)}</b></span>
          <div className="flex-1" />
          <Btn onClick={() => { setSelB(new Set()); setSelT(new Set()) }}>Clear</Btn>
          <Btn primary data-agent="ns-match" onClick={match} disabled={!selB.size || !selT.size}><Link2 className="w-3.5 h-3.5" /> Match</Btn>
        </div>
      )}
    </div>
  )
}

function Reconcile({ go }: { go: (v: View) => void }) {
  const bank = useCollection<any>('netsuite.bankLines')
  const book = useCollection<any>('netsuite.bookTxns')
  const opening = 182450.12
  const stmtEnd = opening + bank.reduce((t, b) => t + b.amount, 0)
  const cleared = opening + book.filter((b) => b.status !== 'unmatched').reduce((t, b) => t + b.amount, 0)
  const outstanding = book.filter((b) => b.status === 'unmatched' && (b.type === 'Check' || b.type === 'Deposit'))
  const unmatchedBook = book.filter((b) => b.status === 'unmatched' && !(b.type === 'Check' || b.type === 'Deposit'))
  const unmatchedBank = bank.filter((b) => b.status === 'unmatched')
  const diff = Math.round((unmatchedBank.reduce((t, b) => t + b.amount, 0) - unmatchedBook.reduce((t, b) => t + b.amount, 0)) * 100) / 100
  const rec = bank.filter((b) => b.status === 'reconciled').length
  return (
    <div>
      <PageHead kind="Reconcile Account Statement" title="1010 Woodgrove Operating Checking · Statement date Oct 20, 2026" status={rec === bank.length ? <span className="text-[12px] font-bold text-[#1e7b34] bg-[#eef8f0] px-2 py-0.5 rounded">RECONCILED</span> : <span className="text-[12px] font-bold text-[#b45f06] bg-[#fff4e5] px-2 py-0.5 rounded">IN PROGRESS</span>}>
        <Btn onClick={() => go({ v: 'match' })}>Match Bank Data</Btn>
        <Btn>Print</Btn>
      </PageHead>
      <div className="p-6 grid grid-cols-4 gap-4" data-agent="ns-recon-summary">
        {[['Opening Balance', opening], ['Statement Ending Balance', stmtEnd], ['Reconciled (Cleared) Balance', cleared], ['Unmatched Bank Lines', unmatchedBank.reduce((t, b) => t + b.amount, 0)]].map(([k, v]: any) => (
          <div key={k} className="bg-white border border-[#d5d5d5] rounded-[4px] p-4">
            <div className="text-[11px] font-semibold uppercase text-[#777]">{k}</div>
            <div className="text-[22px] font-semibold text-[#24385b] mt-1">${n2(v)}</div>
          </div>
        ))}
      </div>
      <div className="px-6 grid grid-cols-2 gap-4">
        <Portlet title={`Reconciled Bank Lines (${rec} of ${bank.length})`}>
          <table className="w-full text-[12.5px]"><tbody>
            {bank.filter((b) => b.status === 'reconciled').map((b) => (
              <tr key={b.id} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3"><CheckCircle2 className="w-3.5 h-3.5 text-[#1e7b34]" /></td><td className="px-2">{fd(b.date)}</td><td className="px-2">{b.description} {b.reconciledBy === 'hworker' && <HW />}</td><td className="px-3 text-right">{n2(b.amount)}</td></tr>
            ))}
          </tbody></table>
        </Portlet>
        <div className="space-y-4">
          <Portlet title="Unmatched Bank Lines">
            <table className="w-full text-[12.5px]"><tbody>
              {unmatchedBank.map((b) => <tr key={b.id} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3"><AlertTriangle className="w-3.5 h-3.5 text-[#e8632b]" /></td><td className="px-2">{fd(b.date)}</td><td className="px-2">{b.description}</td><td className="px-3 text-right font-semibold">{n2(b.amount)}</td></tr>)}
              {unmatchedBank.length === 0 && <tr><td className="px-3 py-3 text-[#888]">None</td></tr>}
            </tbody></table>
          </Portlet>
          <Portlet title="Outstanding Transactions (not yet cleared)">
            <table className="w-full text-[12.5px]"><tbody>
              {outstanding.map((b) => <tr key={b.id} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3">{fd(b.date)}</td><td className="px-2">{b.type} {b.number} · {b.name}</td><td className="px-3 text-right font-semibold">{n2(b.amount)}</td></tr>)}
            </tbody></table>
          </Portlet>
          <div className="bg-white border border-[#d5d5d5] rounded-[4px] p-4 text-[13px] flex items-center gap-3">
            <span>Unexplained difference (bank vs. book, excl. items in transit):</span> <b data-agent="ns-recon-diff" className={diff === 0 ? 'text-[#1e7b34]' : 'text-[#c0392b]'}>${n2(diff)}</b>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────── Journal entries ───────────── */

function nextJe() {
  const max = db.get<any>('netsuite.journals').reduce((m, j) => Math.max(m, Number(String(j.number).slice(-4)) || 0), 1041)
  return `JE-2026-${max + 1}`
}

function JournalForm({ go }: { go: (v: View) => void }) {
  const { isAgent } = useDesk()
  const [date, setDate] = useState(isoDate(new Date()))
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<any[]>([])
  const [cur, setCur] = useState({ account: '', debit: '', credit: '', memo: '', department: 'Finance' })
  const [err, setErr] = useState<string | null>(null)
  const dr = lines.reduce((t, l) => t + l.debit, 0)
  const cr = lines.reduce((t, l) => t + l.credit, 0)
  const add = () => {
    if (!cur.account || (!Number(cur.debit) && !Number(cur.credit))) return setErr('Please enter a value for Account and an amount (Debit or Credit).')
    setLines((l) => [...l, { ...cur, debit: Number(cur.debit) || 0, credit: Number(cur.credit) || 0 }])
    setCur({ account: '', debit: '', credit: '', memo: '', department: cur.department })
    setErr(null)
  }
  const save = () => {
    if (lines.length < 2) return setErr('A journal entry must have at least two lines.')
    if (Math.round((dr - cr) * 100) !== 0) return setErr(`This transaction is not in balance. Debits ($${n2(dr)}) must equal credits ($${n2(cr)}).`)
    const number = nextJe()
    const id = `nsj-${number.slice(-4)}`
    db.insert('netsuite.journals', {
      id, number, date: new Date(date + 'T12:00:00').toISOString(), period: 'Oct 2026', memo, status: 'Pending Approval', subsidiary: 'Northwind Global Inc.', currency: 'USD', lines, createdByName: 'Alex Morgan', createdBy: isAgent ? 'hworker' : undefined, createdAt: new Date().toISOString(),
    }, { prepend: true })
    lines.filter((l) => l.account.startsWith('1010')).forEach((l, i) =>
      db.insert('netsuite.bookTxns', { id: `nbt-${id}-${i}`, date: new Date(date + 'T12:00:00').toISOString(), type: 'Journal', number, name: '', memo: l.memo, amount: Math.round((l.debit - l.credit) * 100) / 100, status: 'unmatched' }),
    )
    go({ v: 'je', id })
  }
  return (
    <div>
      <PageHead kind="Journal Entry" title="">
        <Btn primary data-agent="ns-je-save" onClick={save}>Save</Btn>
        <Btn onClick={() => go({ v: 'home' })}>Cancel</Btn>
        <Btn>Reset</Btn>
      </PageHead>
      {err && <div className="mx-6 mt-3 px-3 py-2 rounded-[3px] border bg-[#fdf0ee] border-[#efb3a9] text-[#8a2a1c] text-[13px] flex items-center gap-2" data-agent="ns-je-error"><AlertTriangle className="w-4 h-4" /> {err}</div>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5">
        <div className="text-[13px] font-bold text-[#24385b] uppercase mb-3">Primary Information</div>
        <div className="grid grid-cols-4 gap-x-8 gap-y-3">
          <F label="Entry No."><div className="text-[13px] h-[26px] flex items-center text-[#777]">To Be Generated</div></F>
          <F label="Subsidiary" req><select className={inp} aria-label="Subsidiary"><option>Northwind Global Inc.</option><option>Northwind Global EMEA B.V.</option></select></F>
          <F label="Date" req><input data-agent="ns-je-date" type="date" className={inp} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" /></F>
          <F label="Posting Period" req><select className={inp} aria-label="Posting Period"><option>Oct 2026</option><option>Nov 2026</option></select></F>
          <F label="Currency"><select className={inp} aria-label="Currency"><option>USD</option></select></F>
          <F label="Reversal Date"><input type="date" className={inp} aria-label="Reversal Date" /></F>
          <div className="col-span-2"><F label="Memo"><input data-agent="ns-je-memo-header" className={inp} value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="Memo" /></F></div>
        </div>
      </div>
      <div className="mx-6 mb-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <div className="px-4 pt-3 flex gap-5 text-[13px] border-b border-[#e4e4e4]">
          <span className="pb-2 border-b-[3px] border-[#3a75c4] font-bold text-[#24385b]">Lines</span>
          <span className="pb-2 text-[#555]">Communication</span><span className="pb-2 text-[#555]">Custom</span>
        </div>
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="px-3 py-1.5 w-[340px]">Account</th><th className="px-2 text-right w-[130px]">Debit</th><th className="px-2 text-right w-[130px]">Credit</th><th className="px-2">Memo</th><th className="px-2 w-[140px]">Department</th><th className="w-20" /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} data-agent={`ns-je-line-${i}`} className="h-[32px] border-b border-[#f0f0f0] flash-new">
                <td className="px-3">{l.account}</td><td className="px-2 text-right">{l.debit ? n2(l.debit) : ''}</td><td className="px-2 text-right">{l.credit ? n2(l.credit) : ''}</td><td className="px-2">{l.memo}</td><td className="px-2">{l.department}</td>
                <td className="px-2"><button className="text-[#999] hover:text-[#c0392b]" onClick={() => setLines((x) => x.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
            <tr className="bg-[#fffbe6] border-b border-[#e4e4e4]">
              <td className="px-3 py-1.5"><select data-agent="ns-je-account" aria-label="Account" className={inp} value={cur.account} onChange={(e) => setCur({ ...cur, account: e.target.value })}><option value="" />{NS_ACCOUNTS.map((a) => <option key={a}>{a}</option>)}</select></td>
              <td className="px-2"><input data-agent="ns-je-debit" aria-label="Debit" className={`${inp} text-right`} value={cur.debit} onChange={(e) => setCur({ ...cur, debit: e.target.value })} /></td>
              <td className="px-2"><input data-agent="ns-je-credit" aria-label="Credit" className={`${inp} text-right`} value={cur.credit} onChange={(e) => setCur({ ...cur, credit: e.target.value })} /></td>
              <td className="px-2"><input data-agent="ns-je-memo" aria-label="Line memo" className={inp} value={cur.memo} onChange={(e) => setCur({ ...cur, memo: e.target.value })} /></td>
              <td className="px-2"><select aria-label="Department" className={inp} value={cur.department} onChange={(e) => setCur({ ...cur, department: e.target.value })}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></td>
              <td className="px-2"><Btn data-agent="ns-je-line-add" onClick={add}>Add</Btn></td>
            </tr>
            <tr className="h-[34px] font-bold">
              <td className="px-3 text-right">Totals</td><td className="px-2 text-right" data-agent="ns-je-total-debit">{n2(dr)}</td><td className="px-2 text-right">{n2(cr)}</td>
              <td className="px-2" colSpan={3}>{lines.length > 0 && (Math.round((dr - cr) * 100) === 0 ? <span className="text-[#1e7b34] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> In balance</span> : <span className="text-[#c0392b]">Out of balance by {n2(Math.abs(dr - cr))}</span>)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function JournalView({ id, go }: { id: string; go: (v: View) => void }) {
  const j = useRecord<any>('netsuite.journals', id)
  if (!j) return <div className="p-6">Record not found.</div>
  const dr = j.lines.reduce((t: number, l: any) => t + l.debit, 0)
  return (
    <div>
      <PageHead kind="Journal Entry" title={<span data-agent="ns-je-title">#{j.number} · {j.memo}</span>} status={<span className={`text-[12px] font-bold px-2 py-0.5 rounded ${j.status === 'Approved' ? 'text-[#1e7b34] bg-[#eef8f0]' : 'text-[#b45f06] bg-[#fff4e5]'}`}>{j.status.toUpperCase()}</span>}>
        <Btn primary>Edit</Btn><Btn onClick={() => go({ v: 'jes' })}>Back</Btn><Btn>Reverse</Btn><Btn>Actions ▾</Btn>
        {j.createdBy === 'hworker' && <HW />}
      </PageHead>
      {j.createdBy === 'hworker' && Date.now() - +new Date(j.createdAt) < 10 * 60000 && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-[3px] border bg-[#eef8f0] border-[#9fd3ab] text-[#1e5b2b] text-[13px] flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Transaction successfully saved. Routed to Sofia Martinez for approval.</div>
      )}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-4 text-[13px]">
        {[['Entry No.', j.number], ['Subsidiary', j.subsidiary], ['Date', fd(j.date)], ['Posting Period', j.period], ['Currency', j.currency], ['Created By', j.createdByName + (j.createdBy === 'hworker' ? ' (via H-Worker)' : '')], ['Approval Status', j.status], ['Memo', j.memo]].map(([k, v]) => (
          <div key={k}><div className="text-[11px] font-semibold uppercase text-[#777]">{k}</div><div>{v}</div></div>
        ))}
      </div>
      <div className="mx-6 mb-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="px-3 py-1.5">Account</th><th className="px-2 text-right">Debit</th><th className="px-2 text-right">Credit</th><th className="px-2">Memo</th><th className="px-2">Department</th></tr></thead>
          <tbody>
            {j.lines.map((l: any, i: number) => <tr key={i} className="h-[32px] border-b border-[#f0f0f0]"><td className="px-3">{l.account}</td><td className="px-2 text-right">{l.debit ? n2(l.debit) : ''}</td><td className="px-2 text-right">{l.credit ? n2(l.credit) : ''}</td><td className="px-2">{l.memo}</td><td className="px-2">{l.department}</td></tr>)}
            <tr className="h-[32px] font-bold"><td className="px-3 text-right">Totals</td><td className="px-2 text-right">{n2(dr)}</td><td className="px-2 text-right">{n2(dr)}</td><td colSpan={2} /></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function JournalList({ go }: { go: (v: View) => void }) {
  const jes = useCollection<any>('netsuite.journals')
  return (
    <div>
      <PageHead kind="Journal Entries" title="Transactions › Financial › Make Journal Entries › List"><Btn primary onClick={() => go({ v: 'je' })}>New Journal Entry</Btn></PageHead>
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="px-3 py-1.5">Date</th><th className="px-2">Number</th><th className="px-2">Memo</th><th className="px-2">Status</th><th className="px-2">Created By</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {jes.map((j) => (
              <tr key={j.id} data-agent={`ns-je-row-${j.id}`} onClick={() => go({ v: 'je', id: j.id })} className={`h-[32px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc] ${j.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                <td className="px-3">{fd(j.date)}</td><td className="px-2 text-[#3a75c4]">{j.number}</td><td className="px-2">{j.memo} {j.createdBy === 'hworker' && <HW />}</td><td className="px-2">{j.status}</td><td className="px-2">{j.createdByName}</td><td className="px-3 text-right">{n2(j.lines.reduce((t: number, l: any) => t + l.debit, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ───────────── Bills ───────────── */

function BillForm({ go }: { go: (v: View) => void }) {
  const { isAgent } = useDesk()
  const [f, setF] = useState({ vendor: '', refNo: '', date: isoDate(new Date()), amount: '', memo: '', account: '6120 Facilities Maintenance' })
  const [err, setErr] = useState<string | null>(null)
  const vendors = useMemo(() => [...new Set(db.get<any>('netsuite.bills').map((b) => b.vendor))].sort(), [])
  const save = () => {
    if (!f.vendor || !Number(f.amount)) return setErr('Please enter value(s) for: Vendor, Amount')
    const bills = db.get<any>('netsuite.bills')
    const num = bills.reduce((m, b) => Math.max(m, Number(b.number.replace('BILL', ''))), 10500) + 1
    const id = `nsb-${num}`
    const date = new Date(f.date + 'T12:00:00').toISOString()
    db.insert('netsuite.bills', { id, number: `BILL${num}`, vendor: f.vendor, date, dueDate: new Date(+new Date(date) + 30 * 86400000).toISOString(), amount: Number(f.amount), memo: f.memo, status: 'Pending Approval', approvalStatus: 'Pending Approval', account: '2000 Accounts Payable', refNo: f.refNo, lines: [{ account: f.account, amount: Number(f.amount), memo: f.memo, department: 'Operations' }], createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    go({ v: 'bill', id })
  }
  return (
    <div>
      <PageHead kind="Bill" title=""><Btn primary data-agent="ns-bill-save" onClick={save}>Save</Btn><Btn onClick={() => go({ v: 'home' })}>Cancel</Btn></PageHead>
      {err && <div className="mx-6 mt-3 px-3 py-2 rounded-[3px] border bg-[#fdf0ee] border-[#efb3a9] text-[#8a2a1c] text-[13px]">{err}</div>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-x-8 gap-y-3">
        <F label="Vendor" req><select data-agent="ns-bill-vendor" className={inp} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} aria-label="Vendor"><option value="" />{vendors.map((v) => <option key={v}>{v}</option>)}</select></F>
        <F label="Reference No."><input data-agent="ns-bill-ref" className={inp} value={f.refNo} onChange={(e) => setF({ ...f, refNo: e.target.value })} aria-label="Reference No." /></F>
        <F label="Date" req><input type="date" className={inp} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Date" /></F>
        <F label="Amount" req><input data-agent="ns-bill-amount" className={inp} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-label="Amount" /></F>
        <F label="Account"><select className={inp} aria-label="AP Account"><option>2000 Accounts Payable</option></select></F>
        <F label="Terms"><select className={inp} aria-label="Terms"><option>Net 30</option><option>Net 45</option></select></F>
        <div className="col-span-2"><F label="Memo"><input data-agent="ns-bill-memo" className={inp} value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} aria-label="Memo" /></F></div>
        <div className="col-span-2"><F label="Expense Account"><select className={inp} value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })} aria-label="Expense Account">{NS_ACCOUNTS.filter((a) => a[0] === '6').map((a) => <option key={a}>{a}</option>)}</select></F></div>
      </div>
    </div>
  )
}

function BillView({ id }: { id: string }) {
  const b = useRecord<any>('netsuite.bills', id)
  if (!b) return <div className="p-6">Record not found.</div>
  return (
    <div>
      <PageHead kind="Bill" title={`#${b.number} · ${b.vendor}`} status={<span className="text-[12px] font-bold px-2 py-0.5 rounded text-[#b45f06] bg-[#fff4e5]">{b.status.toUpperCase()}</span>}><Btn primary>Edit</Btn><Btn>Make Payment</Btn>{b.createdBy === 'hworker' && <HW />}</PageHead>
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-4 text-[13px]">
        {[['Vendor', b.vendor], ['Reference No.', b.refNo], ['Date', fd(b.date)], ['Due Date', fd(b.dueDate)], ['Amount', '$' + n2(b.amount)], ['Account', b.account], ['Approval Status', b.approvalStatus], ['Memo', b.memo]].map(([k, v]) => (
          <div key={k}><div className="text-[11px] font-semibold uppercase text-[#777]">{k}</div><div>{v}</div></div>
        ))}
      </div>
    </div>
  )
}

function ApproveBills({ go }: { go: (v: View) => void }) {
  const bills = useCollection<any>('netsuite.bills').filter((b) => b.approvalStatus === 'Pending Approval')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const approve = () => {
    sel.forEach((id) => db.update('netsuite.bills', id, { approvalStatus: 'Approved', status: 'Open' }))
    setSel(new Set())
  }
  return (
    <div>
      <PageHead kind="Approve Bills" title="Bills pending your approval"><Btn primary data-agent="ns-bills-approve" disabled={!sel.size} onClick={approve}>Approve</Btn><Btn disabled={!sel.size}>Reject</Btn><Btn onClick={() => go({ v: 'bill' })}>Enter Bill</Btn></PageHead>
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="w-8" /><th className="px-2 py-1.5">Date</th><th className="px-2">Number</th><th className="px-2">Vendor</th><th className="px-2">Memo</th><th className="px-2">Due</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} data-agent={`ns-bill-row-${b.id}`} onClick={() => setSel((s) => { const n = new Set(s); n.has(b.id) ? n.delete(b.id) : n.add(b.id); return n })} className={`h-[32px] border-b border-[#f0f0f0] ${sel.has(b.id) ? 'bg-[#dfeafa]' : 'hover:bg-[#f5f8fc]'}`}>
                <td className="text-center"><input type="checkbox" readOnly checked={sel.has(b.id)} className="accent-[#3a75c4]" /></td><td className="px-2">{fd(b.date)}</td><td className="px-2 text-[#3a75c4]">{b.number}</td><td className="px-2">{b.vendor}</td><td className="px-2">{b.memo}</td><td className="px-2">{fd(b.dueDate)}</td><td className="px-3 text-right font-semibold">{n2(b.amount)}</td>
              </tr>
            ))}
            {bills.length === 0 && <tr><td colSpan={7} className="h-14 text-center text-[#888]">No bills pending approval.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SavedSearch({ go }: { go: (v: View) => void }) {
  const bills = useCollection<any>('netsuite.bills').filter((b) => b.status !== 'Paid In Full')
  const total = bills.reduce((t, b) => t + b.amount, 0)
  return (
    <div>
      <PageHead kind="Open Bills by Vendor" title="Saved Search · Results"><Btn>Edit this Search</Btn><Btn>Export — CSV</Btn></PageHead>
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="px-3 py-1.5">Vendor</th><th className="px-2">Document Number</th><th className="px-2">Date</th><th className="px-2">Due Date</th><th className="px-2">Status</th><th className="px-2">Days Open</th><th className="px-3 text-right">Amount Remaining</th></tr></thead>
          <tbody>
            {[...bills].sort((a, b) => a.vendor.localeCompare(b.vendor)).map((b) => (
              <tr key={b.id} onClick={() => go({ v: 'bill', id: b.id })} className="h-[30px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc]"><td className="px-3">{b.vendor}</td><td className="px-2 text-[#3a75c4]">{b.number}</td><td className="px-2">{fd(b.date)}</td><td className="px-2">{fd(b.dueDate)}</td><td className="px-2">{b.status}</td><td className="px-2">{Math.round((Date.now() - +new Date(b.date)) / 86400000)}</td><td className="px-3 text-right">{n2(b.amount)}</td></tr>
            ))}
            <tr className="h-[32px] font-bold bg-[#f7f7f7]"><td className="px-3" colSpan={6}>Total</td><td className="px-3 text-right">{n2(total)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
