import { useEffect, useState, type MouseEvent } from 'react'
import { Search, Bell, HelpCircle, ChevronDown, Home, Star, Plus, X, CheckCircle2, AlertTriangle, Link2, Clock, User, LogOut, Wand2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { AppProps } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection, useRecord } from '@/db/db'
import { isoDate } from '@/data/time'
import { BAR, MENU, Btn, inp, F, Portlet, HW, PageHead, Banner, n2, fd, NS_ACCOUNTS, DEPTS, ROLES, TH, usePrefs, setPrefs, mergeVendors, type View, type Go } from './ui'
import { BillForm, BillView, ApproveBills, PayBills, VendorList, VendorView, EntityForm, CustomerList, InvoiceList, PurchaseOrders, VendorReturns, Tasks } from './records'
import { Report, ChartOfAccounts, SavedSearch, SavedSearchList, SavedSearchResults, TxnList, GlobalSearch, FileCabinet, PAGES } from './reports'
import { Personalize, CompanyInfo, UsersRoles, Help } from './setup'

export { NS_ACCOUNTS }

const MENU_ITEMS: Record<string, [string, [string, View, string][]][]> = {
  Activities: [
    ['Scheduling', [['Tasks', { v: 'tasks' }, 'ns-menu-tasks']]],
    ['Period Close', [['Reconcile Account Statement', { v: 'recon' }, 'ns-menu-act-recon'], ['Journal Entries to Approve', { v: 'jes', status: 'Pending Approval' }, 'ns-menu-act-jes']]],
  ],
  Transactions: [
    ['Bank', [['Match Bank Data', { v: 'match' }, 'ns-menu-match'], ['Reconcile Account Statement', { v: 'recon' }, 'ns-menu-recon']]],
    ['Financial', [['Make Journal Entries', { v: 'je' }, 'ns-menu-make-je'], ['Journal Entries', { v: 'jes' }, 'ns-menu-jes']]],
    ['Payables', [['Enter Bills', { v: 'bill' }, 'ns-menu-enter-bills'], ['Approve Bills', { v: 'bills' }, 'ns-menu-approve-bills'], ['Pay Bills', { v: 'pay' }, 'ns-menu-pay-bills']]],
    ['Purchases', [['Approve Purchase Orders', { v: 'pos' }, 'ns-menu-approve-pos'], ['Approve Vendor Returns', { v: 'returns' }, 'ns-menu-approve-returns']]],
    ['Customers', [['Invoices', { v: 'invoices' }, 'ns-menu-invoices']]],
    ['Management', [['Transaction List', { v: 'txns' }, 'ns-menu-txns']]],
  ],
  Lists: [
    ['Search', [['Saved Searches', { v: 'search' }, 'ns-menu-saved-searches'], ['All Saved Searches', { v: 'searches' }, 'ns-menu-all-searches']]],
    ['Accounting', [['Journal Entries', { v: 'jes' }, 'ns-menu-list-jes'], ['Chart of Accounts', { v: 'coa' }, 'ns-menu-coa'], ['Transactions', { v: 'txns' }, 'ns-menu-list-txns']]],
    ['Relationships', [['Vendors', { v: 'vendors' }, 'ns-menu-vendors'], ['Customers', { v: 'customers' }, 'ns-menu-customers']]],
  ],
  Reports: [
    ['Saved Reports', [['Open Bills by Vendor', { v: 'search' }, 'ns-menu-report-bills']]],
    ['Financial', [['Income Statement', { v: 'report', id: 'is' }, 'ns-menu-report-is'], ['Balance Sheet', { v: 'report', id: 'bs' }, 'ns-menu-report-bs'], ['Trial Balance', { v: 'report', id: 'tb' }, 'ns-menu-report-tb']]],
    ['Vendors/Payables', [['A/P Aging Summary', { v: 'report', id: 'ap' }, 'ns-menu-report-ap']]],
  ],
  Analytics: [
    ['Dashboards', [['Controller Dashboard', { v: 'home' }, 'ns-menu-dashboard']]],
    ['Searches', [['Saved Searches', { v: 'searches' }, 'ns-menu-an-searches'], ['Transaction List', { v: 'txns' }, 'ns-menu-an-txns']]],
  ],
  Documents: [['Files', [['File Cabinet', { v: 'files' }, 'ns-menu-files']]]],
  Setup: [
    ['Company', [['Company Information', { v: 'company' }, 'ns-menu-company']]],
    ['Users/Roles', [['Manage Users', { v: 'users' }, 'ns-menu-users']]],
    ['Accounting', [['Chart of Accounts', { v: 'coa' }, 'ns-menu-setup-coa']]],
  ],
  Customization: [
    ['Centers and Dashboards', [['Personalize Dashboard', { v: 'personalize' }, 'ns-menu-personalize']]],
    ['Lists, Records & Fields', [['Saved Searches', { v: 'searches' }, 'ns-menu-cust-searches']]],
  ],
  Support: [['Help', [['Help Center', { v: 'help' }, 'ns-menu-help'], ['SuiteAnswers', { v: 'help' }, 'ns-menu-suiteanswers']]]],
}

const B = 'https://4820193.app.netsuite.com/app'
const T = (s: string) => `${s} - NetSuite (Northwind Global Inc.)`
function meta(view: View): [string, string] {
  const id = (view as any).id as string | undefined
  switch (view.v) {
    case 'home': return ['/center/card.nl?sc=-29', 'Home - NetSuite (Northwind Global Inc.)']
    case 'match': return ['/accounting/bankfeeds/matchbankdata.nl?account=1010', T('Match Bank Data')]
    case 'recon': return ['/accounting/transactions/reconcile.nl?account=1010', T('Reconcile Account Statement')]
    case 'je': return [id ? `/accounting/transactions/journal.nl?id=${id.replace('nsj-', '')}` : '/accounting/transactions/journal.nl?whence=', T('Journal Entry')]
    case 'jes': return ['/accounting/transactions/transactionlist.nl?Transaction_TYPE=Journal', T('Journal Entries')]
    case 'bill': return [id ? `/accounting/transactions/vendbill.nl?id=${id.replace('nsb-', '')}` : '/accounting/transactions/vendbill.nl?whence=', T('Bill')]
    case 'bills': return ['/accounting/transactions/vendbillapproval.nl', T('Approve Bills')]
    case 'search': return ['/common/search/searchresults.nl?searchid=1842', T('Open Bills by Vendor')]
    case 'searches': return ['/common/search/savedsearchlist.nl', T('Saved Searches')]
    case 'ss': return [`/common/search/searchresults.nl?searchid=${view.id}`, T('Saved Search')]
    case 'txns': return ['/accounting/transactions/transactionlist.nl', T('Transactions')]
    case 'vendors': return ['/common/entity/vendorlist.nl', T('Vendors')]
    case 'vendor': return [`/common/entity/vendor.nl?id=${view.id}`, T('Vendor')]
    case 'customers': return ['/common/entity/custjoblist.nl', T('Customers')]
    case 'entity': return [`/common/entity/${view.kind}.nl?whence=`, T(view.kind === 'vendor' ? 'Vendor' : 'Customer')]
    case 'coa': return ['/accounting/account/accounts.nl', T('Chart of Accounts')]
    case 'report': return [`/reporting/reportrunner.nl?cr=${view.id}`, T({ tb: 'Trial Balance', is: 'Income Statement', bs: 'Balance Sheet', ap: 'A/P Aging Summary' }[view.id])]
    case 'tasks': return ['/crm/calendar/tasks.nl', T('Tasks')]
    case 'pos': return ['/accounting/transactions/purchordapproval.nl', T('Approve Purchase Orders')]
    case 'invoices': return ['/accounting/transactions/transactionlist.nl?Transaction_TYPE=CustInvc', T('Invoices')]
    case 'returns': return ['/accounting/transactions/vendauthapproval.nl', T('Approve Vendor Returns')]
    case 'pay': return ['/accounting/transactions/vendpymts.nl', T('Pay Bills')]
    case 'gsearch': return [`/common/search/ubersearchresults.nl?quicksearch=T&searchtype=Uber&frame=be&Uber_NAMEtype=KEYWORDSTARTSWITH&Uber_NAME=${encodeURIComponent(view.q)}`, T('Global Search')]
    case 'help': return ['/help/helpcenter.nl', T('Help Center')]
    case 'company': return ['/setup/general.nl', T('Company Information')]
    case 'personalize': return ['/center/setup/personalize.nl', T('Personalize Dashboard')]
    case 'users': return ['/setup/listusers.nl', T('Manage Users')]
    case 'files': return ['/common/media/mediaitemfolders.nl', T('File Cabinet')]
  }
}

function viewLabel(view: View) {
  const p = PAGES.find(([, v]) => JSON.stringify(v) === JSON.stringify(view))
  if (p) return p[0]
  return meta(view)[1].replace(' - NetSuite (Northwind Global Inc.)', '').replace('Home', 'Home Dashboard')
}

export default function NetSuite({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [view, setView] = useState<View>({ v: 'home' })
  const [menu, setMenu] = useState<string | null>(null)
  const [gq, setGq] = useState('')
  const [loggedOut, setLoggedOut] = useState(false)
  const prefs = usePrefs()
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
    const m = meta(view) ?? meta({ v: 'home' })
    setUrl(B + m[0])
    setTitle(m[1])
    // recent records (Recent Records portlet)
    const id = (view as any).id as string | undefined
    if (id && (view.v === 'je' || view.v === 'bill' || view.v === 'vendor')) {
      db.upsert('netsuite.recent', { id: `${view.v}:${id}`, v: view.v, refId: id, at: Date.now() })
      const rec = [...db.get<any>('netsuite.recent')].sort((a, b) => b.at - a.at)
      rec.slice(12).forEach((r) => db.remove('netsuite.recent', r.id))
    }
  }, [view])

  const toggleMenu = (k: string) => (e: MouseEvent) => {
    e.stopPropagation()
    setMenu(menu === k ? null : k)
  }
  const search = () => gq.trim() && go({ v: 'gsearch', q: gq.trim() })

  if (loggedOut) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#f2f1ef]" style={{ fontFamily: "'Open Sans', Helvetica, Arial, sans-serif", color: '#333' }}>
        <div className="w-[380px] bg-white border border-[#d5d5d5] rounded-[4px] p-6 text-center shadow">
          <div className="flex items-baseline justify-center gap-1.5 mb-4 text-[#13212c]"><span className="text-[18px] font-bold tracking-[0.12em]">ORACLE</span><span className="text-[18px] font-light tracking-[0.08em]">NETSUITE</span></div>
          <div className="text-[14px] mb-1">You have been logged out.</div>
          <div className="text-[12.5px] text-[#777] mb-5">Your session for Northwind Global Inc. has ended.</div>
          <Btn primary onClick={() => { setLoggedOut(false); go({ v: 'home' }) }}>Log In Again</Btn>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-[#f2f1ef]" style={{ fontFamily: "'Open Sans', Helvetica, Arial, sans-serif", color: '#333' }} onClick={() => menu && setMenu(null)}>
      <div className="h-[46px] shrink-0 flex items-center px-4 gap-4 text-white relative z-40" style={{ background: BAR }}>
        <button onClick={() => go({ v: 'home' })} className="flex items-baseline gap-1.5" aria-label="NetSuite home">
          <span className="text-[17px] font-bold tracking-[0.12em]" style={{ color: '#fff' }}>ORACLE</span>
          <span className="text-[17px] font-light tracking-[0.08em]">NETSUITE</span>
        </button>
        <div className="h-6 w-px bg-white/20" />
        <span className="text-[13px] opacity-80">{prefs.company?.name ?? 'Northwind Global Inc.'}</span>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center w-[420px] h-[30px] rounded-[3px] bg-white/10 border border-white/20 px-2 gap-2">
            <button onClick={search} aria-label="Run search" className="opacity-70 hover:opacity-100"><Search className="w-4 h-4" /></button>
            <input placeholder="Search" aria-label="Global search" value={gq} onChange={(e) => setGq(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/60" />
            {gq && <button onClick={() => setGq('')} aria-label="Clear search" className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>
        <button onClick={() => go({ v: 'help' })} aria-label="Help" title="Help"><HelpCircle className="w-[18px] h-[18px] opacity-80 hover:opacity-100" /></button>
        <Notifications open={menu === 'bell'} onToggle={toggleMenu('bell')} go={go} />
        <div className="relative">
          <button onClick={toggleMenu('user')} className="flex items-center gap-2 text-[12px] leading-tight text-left" aria-label="User menu">
            <span className="w-7 h-7 rounded-full bg-[#4a6a85] flex items-center justify-center"><User className="w-4 h-4" /></span>
            <span><span className="block font-semibold">Alex Morgan</span><span className="block opacity-70">{prefs.company?.name ?? 'Northwind Global Inc.'} — {prefs.role ?? 'Controller'}</span></span>
            <ChevronDown className="w-4 h-4 opacity-70" />
          </button>
          {menu === 'user' && (
            <div className="absolute right-0 top-[38px] w-[280px] bg-white text-[#333] shadow-[0_4px_16px_rgba(0,0,0,0.25)] border border-[#ccc] py-1" onClick={(e) => e.stopPropagation()}>
              <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase text-[#888]">Switch Role</div>
              {ROLES.map((r) => (
                <button key={r} onClick={() => { setPrefs({ role: r }); setMenu(null) }} className="w-full flex items-center gap-2 text-left px-5 py-1.5 text-[13px] hover:bg-[#e8f0fb]">
                  <span className="w-4">{(prefs.role ?? 'Controller') === r && <CheckCircle2 className="w-3.5 h-3.5 text-[#3a75c4]" />}</span>Northwind Global Inc. — {r}
                </button>
              ))}
              <div className="border-t border-[#eee] my-1" />
              <button onClick={() => go({ v: 'personalize' })} className="block w-full text-left px-5 py-1.5 text-[13px] hover:bg-[#e8f0fb]">Set Preferences</button>
              <button onClick={() => go({ v: 'help' })} className="block w-full text-left px-5 py-1.5 text-[13px] hover:bg-[#e8f0fb]">Help Center</button>
              <button onClick={() => { setMenu(null); setLoggedOut(true) }} className="w-full flex items-center gap-2 text-left px-5 py-1.5 text-[13px] hover:bg-[#e8f0fb]"><LogOut className="w-3.5 h-3.5" /> Log Out</button>
            </div>
          )}
        </div>
      </div>
      <div className="h-[36px] shrink-0 flex items-stretch px-2 text-white text-[13px] relative z-30" style={{ background: MENU }}>
        <button onClick={() => go({ v: 'home' })} className="px-3 hover:bg-white/10 flex items-center" aria-label="Home"><Home className="w-4 h-4" /></button>
        <div className="relative">
          <button onClick={toggleMenu('star')} className={`h-full px-3 hover:bg-white/10 flex items-center ${menu === 'star' ? 'bg-white/15' : ''}`} aria-label="Shortcuts"><Star className="w-4 h-4" /></button>
          {menu === 'star' && <ShortcutsMenu view={view} go={go} close={() => setMenu(null)} />}
        </div>
        {['Activities', 'Transactions', 'Lists', 'Reports', 'Analytics', 'Documents', 'Setup', 'Customization', 'Support'].map((t) => (
          <div key={t} className="relative">
            <button data-agent={`ns-tab-${t.toLowerCase()}`} onClick={(e) => { e.stopPropagation(); setMenu(menu === t ? null : t) }} className={`h-full px-3.5 hover:bg-white/10 ${menu === t ? 'bg-white/15' : ''}`}>{t}</button>
            {menu === t && MENU_ITEMS[t] && (
              <div className={`absolute ${['Setup', 'Customization', 'Support'].includes(t) ? 'right-0' : 'left-0'} top-[36px] w-[280px] bg-white text-[#333] shadow-[0_4px_16px_rgba(0,0,0,0.25)] border border-[#ccc] py-1`} onClick={(e) => e.stopPropagation()}>
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
        {view.v === 'je' && (view.id ? <JournalView key={view.id} id={view.id} go={go} /> : <JournalForm key={view.copyOf ?? 'new'} go={go} copyOf={view.copyOf} />)}
        {view.v === 'jes' && <JournalList key={view.status ?? 'all'} go={go} status={view.status} />}
        {view.v === 'bill' && (view.id ? <BillView key={view.id} id={view.id} go={go} /> : <BillForm key={view.vendor ?? 'new'} go={go} vendor={view.vendor} />)}
        {view.v === 'bills' && <ApproveBills go={go} />}
        {view.v === 'search' && <SavedSearch go={go} />}
        {view.v === 'searches' && <SavedSearchList go={go} />}
        {view.v === 'ss' && <SavedSearchResults key={view.id} id={view.id} go={go} />}
        {view.v === 'txns' && <TxnList key={view.type ?? 'all'} go={go} type={view.type} />}
        {view.v === 'vendors' && <VendorList go={go} />}
        {view.v === 'vendor' && <VendorView key={view.id} id={view.id} go={go} />}
        {view.v === 'customers' && <CustomerList go={go} />}
        {view.v === 'entity' && <EntityForm key={view.kind} kind={view.kind} go={go} />}
        {view.v === 'coa' && <ChartOfAccounts go={go} />}
        {view.v === 'report' && <Report key={view.id} id={view.id} go={go} />}
        {view.v === 'tasks' && <Tasks go={go} />}
        {view.v === 'pos' && <PurchaseOrders go={go} />}
        {view.v === 'invoices' && <InvoiceList key={String(!!view.overdue)} go={go} overdue={view.overdue} />}
        {view.v === 'returns' && <VendorReturns go={go} />}
        {view.v === 'pay' && <PayBills go={go} />}
        {view.v === 'gsearch' && <GlobalSearch q={view.q} go={go} />}
        {view.v === 'help' && <Help go={go} />}
        {view.v === 'company' && <CompanyInfo go={go} />}
        {view.v === 'personalize' && <Personalize go={go} />}
        {view.v === 'users' && <UsersRoles go={go} />}
        {view.v === 'files' && <FileCabinet go={go} />}
      </div>
    </div>
  )
}

/* ───────────── Header dropdowns ───────────── */

function Notifications({ open, onToggle, go }: { open: boolean; onToggle: (e: MouseEvent) => void; go: Go }) {
  const jes = useCollection<any>('netsuite.journals')
  const bills = useCollection<any>('netsuite.bills')
  const bank = useCollection<any>('netsuite.bankLines')
  const tasks = useCollection<any>('netsuite.tasks')
  const items: [string, string, View][] = []
  const pj = jes.filter((j) => j.status === 'Pending Approval').length
  const pb = bills.filter((b) => b.approvalStatus === 'Pending Approval').length
  const ub = bank.filter((b) => b.status === 'unmatched').length
  const dt = tasks.filter((t) => t.status !== 'Completed' && +new Date(t.due) < Date.now() + 2 * 86400000).length
  if (pj) items.push([`${pj} journal entries awaiting approval`, 'Approval routing · Controller', { v: 'jes', status: 'Pending Approval' }])
  if (pb) items.push([`${pb} bills awaiting approval`, 'Accounts payable', { v: 'bills' }])
  if (ub) items.push([`${ub} bank lines imported and not matched`, 'Woodgrove ••••4410 bank feed · today 6:02 AM', { v: 'match' }])
  if (dt) items.push([`${dt} tasks due in the next 2 days`, 'Activities', { v: 'tasks' }])
  items.push(['October soft close due Friday 5 PM ET', 'Announcement from Sofia Martinez', { v: 'home' }])
  return (
    <div className="relative">
      <button onClick={onToggle} aria-label="Notifications" className="relative block"><Bell className="w-[18px] h-[18px] opacity-80 hover:opacity-100" /><span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#e8632b] text-[9px] font-bold flex items-center justify-center">{items.length}</span></button>
      {open && (
        <div className="absolute right-0 top-[34px] w-[340px] bg-white text-[#333] shadow-[0_4px_16px_rgba(0,0,0,0.25)] border border-[#ccc]" onClick={(e) => e.stopPropagation()}>
          <div className="px-3 h-9 flex items-center text-[12px] font-bold uppercase text-[#24385b] border-b border-[#eee]">Notifications</div>
          {items.map(([t, s, v]) => (
            <button key={t} onClick={() => go(v)} className="block w-full text-left px-3 py-2 border-b border-[#f3f3f3] hover:bg-[#f5f8fc]">
              <div className="text-[13px] text-[#3a75c4]">{t}</div><div className="text-[11.5px] text-[#777]">{s}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ShortcutsMenu({ view, go, close }: { view: View; go: Go; close: () => void }) {
  const prefs = usePrefs()
  const list = prefs.shortcuts ?? []
  const key = JSON.stringify(view)
  const has = list.some((s) => JSON.stringify(s.view) === key)
  const label = viewLabel(view)
  return (
    <div className="absolute left-0 top-[36px] w-[300px] bg-white text-[#333] shadow-[0_4px_16px_rgba(0,0,0,0.25)] border border-[#ccc] py-1" onClick={(e) => e.stopPropagation()}>
      <button disabled={has} onClick={() => { setPrefs((p) => ({ shortcuts: [...(p.shortcuts ?? []), { label, view }] })); close() }} className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-[13px] hover:bg-[#e8f0fb] disabled:text-[#aaa] disabled:hover:bg-transparent">
        <Plus className="w-3.5 h-3.5" /> {has ? 'Page is in your shortcuts' : `Add “${label}” to Shortcuts`}
      </button>
      <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase text-[#888]">Shortcuts</div>
      {list.length === 0 && <div className="px-5 py-1.5 text-[12.5px] text-[#999]">No shortcuts yet.</div>}
      {list.map((s, i) => (
        <div key={i} className="flex items-center hover:bg-[#e8f0fb]">
          <button onClick={() => go(s.view)} className="flex-1 text-left px-5 py-1.5 text-[13px] text-[#3a75c4]">{s.label}</button>
          <button aria-label={`Remove ${s.label}`} onClick={() => setPrefs((p) => ({ shortcuts: (p.shortcuts ?? []).filter((_, j) => j !== i) }))} className="px-2 text-[#999] hover:text-[#c0392b]"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
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

function Dashboard({ go }: { go: Go }) {
  const prefs = usePrefs()
  const hidden = prefs.hidden ?? []
  const show = (k: string) => !hidden.includes(k)
  const bills = useCollection<any>('netsuite.bills')
  const jes = useCollection<any>('netsuite.journals')
  const bank = useCollection<any>('netsuite.bankLines')
  const pos = useCollection<any>('netsuite.purchaseOrders')
  const invoices = useCollection<any>('netsuite.invoices')
  const returns = useCollection<any>('netsuite.vendorReturns')
  const tasks = useCollection<any>('netsuite.tasks')
  const recent = useCollection<any>('netsuite.recent')
  const vendors = mergeVendors(useCollection<any>('netsuite.vendors'), bills)
  const toApprove = bills.filter((b) => b.approvalStatus === 'Pending Approval').length
  const jeApprove = jes.filter((j) => j.status === 'Pending Approval').length
  const unrec = bank.filter((b) => b.status !== 'reconciled').length
  const poCount = pos.length ? pos.filter((p) => p.status === 'Pending Supervisor Approval').length : 4
  const overdue = invoices.length ? invoices.filter((i) => i.status === 'Open' && +new Date(i.dueDate) < Date.now()).length : 7
  const retCount = returns.length ? returns.filter((r) => r.status === 'Pending Approval').length : 1
  const trend = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((m, i) => ({ m, cash: [24.1, 25.8, 23.9, 26.4, 27.2, 28.6][i], ap: [3.1, 3.4, 2.9, 3.6, 3.3, 3.8][i] }))
  const rem: [string, number | string, View | null, string][] = [
    ['Bills to Approve', toApprove, { v: 'bills' }, 'ns-reminder-bills'],
    ['Journal Entries to Approve', jeApprove, { v: 'jes', status: 'Pending Approval' }, 'ns-reminder-jes'],
    ['Bank Account Lines to Reconcile', unrec, { v: 'match' }, 'ns-reminder-bank'],
    ['Purchase Orders to Approve', poCount, { v: 'pos' }, 'ns-reminder-pos'],
    ['Overdue Invoices', overdue, { v: 'invoices', overdue: true }, 'ns-reminder-overdue'],
    ['Vendor Returns to Approve', retCount, { v: 'returns' }, 'ns-reminder-returns'],
  ]
  const kpis: [string, string, number, number, number, View][] = [
    ['Revenue', 'This Month', 4218400, 3982150, 5.9, { v: 'report', id: 'is' }],
    ['Expenses', 'This Month', 2961225, 2874010, 3.0, { v: 'report', id: 'is' }],
    ['Bank Balance — Operating', 'Today', 28612480, 27195330, 5.2, { v: 'recon' }],
    ['A/R Balance', 'Today', 6840220, 7106490, -3.7, { v: 'invoices' }],
    ['A/P Balance', 'Today', 3802115, 3305190, 15.0, { v: 'report', id: 'ap' }],
  ]
  const recentRows: { key: string; label: string; view: View }[] = [...recent]
    .sort((a, b) => b.at - a.at)
    .map((r) => {
      if (r.v === 'je') { const j = jes.find((x) => x.id === r.refId); return j && { key: r.id, label: `Journal #${j.number}`, view: { v: 'je', id: j.id } as View } }
      if (r.v === 'bill') { const b = bills.find((x) => x.id === r.refId); return b && { key: r.id, label: `Bill #${b.number} — ${b.vendor}`, view: { v: 'bill', id: b.id } as View } }
      const v = vendors.find((x) => x.id === r.refId)
      return v && { key: r.id, label: `Vendor: ${v.name}`, view: { v: 'vendor', id: v.id } as View }
    })
    .filter(Boolean)
    .slice(0, 7) as any
  const fallback = [...jes.slice(0, 4).map((j) => ({ key: j.id, label: `Journal #${j.number}`, view: { v: 'je', id: j.id } as View })), ...bills.slice(0, 3).map((b) => ({ key: b.id, label: `Bill #${b.number} — ${b.vendor}`, view: { v: 'bill', id: b.id } as View }))]
  const openTasks = tasks.filter((t) => t.status !== 'Completed').sort((a, b) => +new Date(a.due) - +new Date(b.due))

  const left = (
    <div className="space-y-4">
      <Portlet title="Reminders">
        {rem.map(([l, n, v, ag]) => (
          <button key={l} data-agent={ag} onClick={() => v && go(v)} className="w-full flex items-center gap-3 px-3 py-2 border-b border-[#f0f0f0] hover:bg-[#f5f8fc] text-left">
            <span className={`min-w-[38px] h-[26px] rounded-[3px] text-[15px] font-bold flex items-center justify-center ${Number(n) > 0 ? 'text-[#c0392b] bg-[#fdf0ee]' : 'text-[#1e7b34] bg-[#eef8f0]'}`}>{n}</span>
            <span className="text-[13px] text-[#3a75c4]">{l}</span>
          </button>
        ))}
      </Portlet>
      {show('shortcuts') && (
        <Portlet title="Navigation Shortcuts" collapseKey="shortcuts">
          {([['Match Bank Data', { v: 'match' }], ['Reconcile Account Statement', { v: 'recon' }], ['Make Journal Entries', { v: 'je' }], ['Enter Bills', { v: 'bill' }], ['Open Bills by Vendor', { v: 'search' }]] as [string, View][]).map(([l, v]) => (
            <button key={l} onClick={() => go(v)} className="block w-full text-left px-3 py-1.5 text-[13px] text-[#3a75c4] hover:underline">{l}</button>
          ))}
          {(prefs.shortcuts ?? []).map((s, i) => (
            <button key={'u' + i} onClick={() => go(s.view)} className="flex items-center gap-1.5 w-full text-left px-3 py-1.5 text-[13px] text-[#3a75c4] hover:underline"><Star className="w-3 h-3 text-[#e0a526]" /> {s.label}</button>
          ))}
        </Portlet>
      )}
    </div>
  )
  const middle = (
    <div className="space-y-4 min-w-0">
      {show('kpi') && (
        <Portlet title="Key Performance Indicators" collapseKey="kpi">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase text-[#777] border-b border-[#eee]"><th className="px-3 py-1.5">Indicator</th><th className="px-3 text-right">Period</th><th className="px-3 text-right">Current</th><th className="px-3 text-right">Previous</th><th className="px-3 text-right">Change</th></tr></thead>
            <tbody>
              {kpis.map(([k, p, c, pr, ch, v]) => (
                <tr key={k} className="border-b border-[#f3f3f3]"><td className="px-3 py-2"><button onClick={() => go(v)} className="text-[#3a75c4] hover:underline">{k}</button></td><td className="px-3 text-right text-[#666]">{p}</td><td className="px-3 text-right font-semibold">${n2(c)}</td><td className="px-3 text-right">${n2(pr)}</td><td className={`px-3 text-right font-semibold ${ch >= 0 ? 'text-[#1e7b34]' : 'text-[#c0392b]'}`}>{ch > 0 ? '▲' : '▼'} {Math.abs(ch)}%</td></tr>
              ))}
            </tbody>
          </table>
        </Portlet>
      )}
      {show('meter') && (
        <Portlet title="KPI Meter" collapseKey="meter">
          <div className="flex justify-around py-3">
            <Gauge label="Close Tasks Complete" value={68} max={100} color="#3a75c4" />
            <Gauge label="Bills Paid On Time" value={94} max={100} color="#1e7b34" />
            <Gauge label="Budget Utilization" value={81} max={100} color="#e8632b" />
          </div>
        </Portlet>
      )}
      {show('trend') && (
        <Portlet title="Trend Graph — Cash vs. A/P ($M)" collapseKey="trend">
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
      )}
    </div>
  )
  const right = (
    <div className="space-y-4">
      {show('recent') && (
        <Portlet title="Recent Records" collapseKey="recent">
          {(recentRows.length ? recentRows : fallback).map((r) => (
            <button key={r.key} onClick={() => go(r.view)} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[#f5f8fc]"><Clock className="w-3.5 h-3.5 text-[#999]" /><span className="text-[#3a75c4] truncate">{r.label}</span></button>
          ))}
        </Portlet>
      )}
      {show('quickadd') && (
        <Portlet title="Quick Add" collapseKey="quickadd">
          <div className="p-3 grid grid-cols-2 gap-2">
            {([['Journal', { v: 'je' }], ['Bill', { v: 'bill' }], ['Customer', { v: 'entity', kind: 'customer' }], ['Vendor', { v: 'entity', kind: 'vendor' }]] as [string, View][]).map(([l, v]) => (
              <button key={l} onClick={() => go(v)} className="h-8 rounded-[3px] border border-[#d5d5d5] text-[12.5px] text-[#3a75c4] hover:bg-[#f5f8fc] flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> {l}</button>
            ))}
          </div>
        </Portlet>
      )}
      {show('tasks') && openTasks.length > 0 && (
        <Portlet title="My Tasks" collapseKey="tasks" right={<button onClick={() => go({ v: 'tasks' })} className="text-[11px] text-[#3a75c4] hover:underline">View All</button>}>
          {openTasks.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-[13px] border-b border-[#f6f6f6]">
              <input type="checkbox" aria-label={`Complete ${t.title}`} onChange={() => db.update('netsuite.tasks', t.id, { status: 'Completed' })} className="accent-[#3a75c4]" />
              <span className="flex-1 truncate">{t.title}</span>
              <span className={`text-[11.5px] ${+new Date(t.due) < Date.now() ? 'text-[#c0392b]' : 'text-[#777]'}`}>{fd(t.due)}</span>
            </div>
          ))}
        </Portlet>
      )}
      {show('announce') && (
        <Portlet title="Announcements" collapseKey="announce">
          <div className="p-3 text-[12.5px] leading-relaxed text-[#555]">October soft close: bank recs and accruals due <b>Friday 5 PM ET</b>. — Sofia Martinez</div>
        </Portlet>
      )}
    </div>
  )
  const two = prefs.layout === '2col'
  return (
    <div className="p-4">
      <div className="flex items-center mb-3">
        <div className="text-[20px] text-[#24385b] font-semibold">Home</div>
        <span className="ml-3 text-[12px] text-[#666]">Controller Dashboard · Period: Oct 2026</span>
        <div className="flex-1" />
        <button className="text-[12px] text-[#3a75c4] hover:underline" onClick={() => go({ v: 'personalize' })}>Personalize</button>
        <button className="ml-3 text-[12px] text-[#3a75c4] hover:underline" onClick={() => go({ v: 'personalize' })}>Layout</button>
      </div>
      {two ? (
        <div className="grid grid-cols-[300px_1fr] gap-4">{left}<div className="space-y-4 min-w-0">{middle}{right}</div></div>
      ) : (
        <div className="grid grid-cols-[300px_1fr_300px] gap-4">{left}{middle}{right}</div>
      )}
    </div>
  )
}

/* ───────────── Match Bank Data ───────────── */

function MatchBank({ go }: { go: Go }) {
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
  /** pair every unmatched bank line with the single unmatched transaction of exactly the same amount */
  const autoMatch = () => {
    const ub = bank.filter((b) => b.status === 'unmatched')
    const ut = book.filter((t) => t.status === 'unmatched')
    const used = new Set<string>()
    let n = 0
    for (const b of ub) {
      const cands = ut.filter((t) => !used.has(t.id) && Math.round((t.amount - b.amount) * 100) === 0)
      if (cands.length !== 1) continue
      const t = cands[0]
      used.add(t.id)
      const mid = 'm-' + Date.now().toString(36) + n
      db.update('netsuite.bankLines', b.id, { status: 'matched', matchId: mid, matchedBy: isAgent ? 'hworker' : undefined })
      db.update('netsuite.bookTxns', t.id, { status: 'matched', matchId: mid })
      n++
    }
    setSelB(new Set())
    setSelT(new Set())
    setMsg(n ? { ok: true, t: `Auto Match matched ${n} bank line(s) on exact amount. Review the Matched / Reconciled tab, then Submit.` } : { ok: false, t: 'Auto Match found no bank lines with exactly one transaction of the same amount.' })
  }
  const submit = () => {
    bank.filter((b) => b.status === 'matched').forEach((b) => db.update('netsuite.bankLines', b.id, { status: 'reconciled', reconciledAt: new Date().toISOString(), reconciledBy: isAgent ? 'hworker' : undefined }))
    book.filter((b) => b.status === 'matched').forEach((b) => db.update('netsuite.bookTxns', b.id, { status: 'reconciled' }))
    go({ v: 'recon' })
  }
  const unmatch = (r: any) => {
    if (r.status !== 'matched' || !r.matchId) return
    bank.filter((b) => b.matchId === r.matchId && b.status === 'matched').forEach((b) => db.update('netsuite.bankLines', b.id, { status: 'unmatched', matchId: undefined, matchedBy: undefined }))
    book.filter((b) => b.matchId === r.matchId && b.status === 'matched').forEach((b) => db.update('netsuite.bookTxns', b.id, { status: 'unmatched', matchId: undefined }))
    setMsg({ ok: true, t: 'Match removed. The lines are back in To Be Matched.' })
  }
  const matchedCount = bank.filter((b) => b.status === 'matched').length
  const Side = ({ title, rows, sel, onToggle, prefix, amountKey }: any) => (
    <div className="bg-white border border-[#d5d5d5] rounded-[4px] flex-1 min-w-0">
      <div className="h-9 px-3 flex items-center border-b border-[#e4e4e4] text-[13px] font-bold text-[#24385b] uppercase tracking-wide">{title} ({rows.length})</div>
      <table className="w-full text-[12.5px]">
        <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="w-8" /><th className="px-2 py-1.5">Date</th><th className="px-2">{prefix === 'ns-bank' ? 'Description' : 'Type / Number / Name'}</th><th className="px-2 text-right">Amount</th>{tab === 'matched' && <th className="w-16" />}</tr></thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} data-agent={`${prefix}-${r.id}`} aria-label={`${r.description ?? r.name} ${n2(r[amountKey])}`} onClick={() => tab === 'open' && onToggle(r.id)} className={`h-[34px] border-b border-[#f0f0f0] ${sel.has(r.id) ? 'bg-[#dfeafa]' : 'hover:bg-[#f5f8fc]'} ${r.status === 'reconciled' ? 'text-[#888]' : ''}`}>
              <td className="text-center"><input type="checkbox" readOnly checked={sel.has(r.id) || r.status !== 'unmatched'} className="accent-[#3a75c4]" aria-label="Select" /></td>
              <td className="px-2 whitespace-nowrap">{fd(r.date)}</td>
              <td className="px-2">{prefix === 'ns-bank' ? r.description : <span><span className="text-[#777]">{r.type}</span> · <span className="text-[#3a75c4]">{r.number}</span> · {r.name}</span>}</td>
              <td className={`px-2 text-right font-semibold whitespace-nowrap ${r[amountKey] < 0 ? 'text-[#c0392b]' : ''}`}>{r[amountKey] < 0 ? `(${n2(-r[amountKey])})` : n2(r[amountKey])}</td>
              {tab === 'matched' && <td className="px-2 text-right">{r.status === 'matched' ? <button onClick={(e) => { e.stopPropagation(); unmatch(r) }} className="text-[11.5px] text-[#3a75c4] hover:underline">Unmatch</button> : <span className="text-[11px] text-[#1e7b34]">Reconciled</span>}</td>}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="h-14 text-center text-[#888]">No records to show.</td></tr>}
        </tbody>
      </table>
    </div>
  )
  return (
    <div>
      <PageHead kind="Match Bank Data" title="Account: 1010 Woodgrove Operating Checking (••••4410) · Bank feed imported today 6:02 AM" go={go} list={{ v: 'ss', id: 'unmatched-bank' }}>
        <Btn primary data-agent="ns-match-submit" disabled={!matchedCount} onClick={submit}>Submit ({matchedCount})</Btn>
        <Btn onClick={() => go({ v: 'recon' })} data-agent="ns-goto-recon">Reconcile Account Statement</Btn>
        <Btn onClick={() => go({ v: 'je' })}>Create Journal Entry</Btn>
        <Btn onClick={autoMatch} data-agent="ns-auto-match"><Wand2 className="w-3.5 h-3.5" /> Auto Match</Btn>
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

function Reconcile({ go }: { go: Go }) {
  const bank = useCollection<any>('netsuite.bankLines')
  const book = useCollection<any>('netsuite.bookTxns')
  const [print, setPrint] = useState(false)
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
      <PageHead kind="Reconcile Account Statement" title="1010 Woodgrove Operating Checking · Statement date Oct 20, 2026" status={rec === bank.length ? <span className="text-[12px] font-bold text-[#1e7b34] bg-[#eef8f0] px-2 py-0.5 rounded">RECONCILED</span> : <span className="text-[12px] font-bold text-[#b45f06] bg-[#fff4e5] px-2 py-0.5 rounded">IN PROGRESS</span>} go={go} list={{ v: 'coa' }}>
        <Btn onClick={() => go({ v: 'match' })}>Match Bank Data</Btn>
        <Btn onClick={() => setPrint(true)}>Print</Btn>
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
      {print && (
        <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setPrint(false)}>
          <div className="w-[640px] max-h-[85%] overflow-auto bg-white rounded-[4px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="h-10 px-4 flex items-center border-b border-[#e4e4e4] text-[13px] font-bold text-[#24385b] uppercase">Print Preview — Reconciliation Summary<div className="flex-1" /><button onClick={() => setPrint(false)} aria-label="Close preview"><X className="w-4 h-4" /></button></div>
            <div className="p-6 text-[12.5px] font-mono leading-relaxed">
              <div className="font-bold text-[14px] font-sans mb-1">Northwind Global Inc.</div>
              <div className="font-sans text-[#555] mb-4">Reconciliation Summary · 1010 Woodgrove Operating Checking · Statement Oct 20, 2026</div>
              {[['Opening balance', opening], ['Statement ending balance', stmtEnd], ['Cleared balance', cleared], ['Unexplained difference', diff]].map(([k, v]: any) => <div key={k} className="flex"><span className="flex-1">{k}</span><span>{n2(v)}</span></div>)}
              <div className="mt-4 font-bold font-sans">Outstanding items</div>
              {outstanding.map((b) => <div key={b.id} className="flex"><span className="flex-1">{fd(b.date)} {b.type} {b.number} {b.name}</span><span>{n2(b.amount)}</span></div>)}
              <div className="mt-4 font-bold font-sans">Unmatched bank lines</div>
              {unmatchedBank.map((b) => <div key={b.id} className="flex"><span className="flex-1">{fd(b.date)} {b.description}</span><span>{n2(b.amount)}</span></div>)}
              {unmatchedBank.length === 0 && <div>None</div>}
            </div>
            <div className="h-12 px-4 flex items-center justify-end gap-2 border-t border-[#e4e4e4]"><Btn primary onClick={() => { try { window.print() } catch { /* ignore */ } }}>Print</Btn><Btn onClick={() => setPrint(false)}>Close</Btn></div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────── Journal entries ───────────── */

function nextJe() {
  const max = db.get<any>('netsuite.journals').reduce((m, j) => Math.max(m, Number(String(j.number).slice(-4)) || 0), 1041)
  return `JE-2026-${max + 1}`
}

/** save a journal and mirror its bank-account lines into the bank register */
function insertJournal(rec: any) {
  db.insert('netsuite.journals', rec, { prepend: true })
  rec.lines.filter((l: any) => l.account.startsWith('1010')).forEach((l: any, i: number) =>
    db.insert('netsuite.bookTxns', { id: `nbt-${rec.id}-${i}`, date: rec.date, type: 'Journal', number: rec.number, name: '', memo: l.memo, amount: Math.round((l.debit - l.credit) * 100) / 100, status: 'unmatched' }),
  )
}

function JournalForm({ go, copyOf }: { go: Go; copyOf?: string }) {
  const { isAgent } = useDesk()
  const src = copyOf ? db.find<any>('netsuite.journals', copyOf) : undefined
  const [date, setDate] = useState(isoDate(new Date()))
  const [memo, setMemo] = useState(src ? src.memo : '')
  const [lines, setLines] = useState<any[]>(src ? src.lines.map((l: any) => ({ ...l })) : [])
  const [cur, setCur] = useState({ account: '', debit: '', credit: '', memo: '', department: 'Finance' })
  const [err, setErr] = useState<string | null>(null)
  const [subsidiary, setSubsidiary] = useState('Northwind Global Inc.')
  const [period, setPeriod] = useState('Oct 2026')
  const [reversal, setReversal] = useState('')
  const [sub, setSub] = useState<'Lines' | 'Communication' | 'Custom'>('Lines')
  const [note, setNote] = useState('')
  const dr = lines.reduce((t, l) => t + l.debit, 0)
  const cr = lines.reduce((t, l) => t + l.credit, 0)
  const add = () => {
    if (!cur.account || (!Number(cur.debit) && !Number(cur.credit))) return setErr('Please enter a value for Account and an amount (Debit or Credit).')
    setLines((l) => [...l, { ...cur, debit: Number(cur.debit) || 0, credit: Number(cur.credit) || 0 }])
    setCur({ account: '', debit: '', credit: '', memo: '', department: cur.department })
    setErr(null)
  }
  const reset = () => {
    setDate(isoDate(new Date()))
    setMemo('')
    setLines([])
    setCur({ account: '', debit: '', credit: '', memo: '', department: 'Finance' })
    setSubsidiary('Northwind Global Inc.')
    setPeriod('Oct 2026')
    setReversal('')
    setNote('')
    setErr(null)
  }
  const save = () => {
    if (lines.length < 2) return setErr('A journal entry must have at least two lines.')
    if (Math.round((dr - cr) * 100) !== 0) return setErr(`This transaction is not in balance. Debits ($${n2(dr)}) must equal credits ($${n2(cr)}).`)
    const number = nextJe()
    const id = `nsj-${number.slice(-4)}`
    insertJournal({
      id, number, date: new Date(date + 'T12:00:00').toISOString(), period, memo, status: 'Pending Approval', subsidiary, currency: 'USD', lines, createdByName: 'Alex Morgan', createdBy: isAgent ? 'hworker' : undefined, createdAt: new Date().toISOString(),
      ...(reversal ? { reversalDate: new Date(reversal + 'T12:00:00').toISOString() } : {}), ...(note ? { note } : {}),
    })
    go({ v: 'je', id })
  }
  return (
    <div>
      <PageHead kind="Journal Entry" title="" go={go} list={{ v: 'jes' }}>
        <Btn primary data-agent="ns-je-save" onClick={save}>Save</Btn>
        <Btn onClick={() => go({ v: 'home' })}>Cancel</Btn>
        <Btn onClick={reset}>Reset</Btn>
      </PageHead>
      {err && <div className="mx-6 mt-3 px-3 py-2 rounded-[3px] border bg-[#fdf0ee] border-[#efb3a9] text-[#8a2a1c] text-[13px] flex items-center gap-2" data-agent="ns-je-error"><AlertTriangle className="w-4 h-4" /> {err}</div>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5">
        <div className="text-[13px] font-bold text-[#24385b] uppercase mb-3">Primary Information</div>
        <div className="grid grid-cols-4 gap-x-8 gap-y-3">
          <F label="Entry No."><div className="text-[13px] h-[26px] flex items-center text-[#777]">To Be Generated</div></F>
          <F label="Subsidiary" req><select className={inp} aria-label="Subsidiary" value={subsidiary} onChange={(e) => setSubsidiary(e.target.value)}><option>Northwind Global Inc.</option><option>Northwind Global EMEA B.V.</option></select></F>
          <F label="Date" req><input data-agent="ns-je-date" type="date" className={inp} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" /></F>
          <F label="Posting Period" req><select className={inp} aria-label="Posting Period" value={period} onChange={(e) => setPeriod(e.target.value)}><option>Oct 2026</option><option>Nov 2026</option></select></F>
          <F label="Currency"><select className={inp} aria-label="Currency"><option>USD</option></select></F>
          <F label="Reversal Date"><input type="date" className={inp} aria-label="Reversal Date" value={reversal} onChange={(e) => setReversal(e.target.value)} /></F>
          <div className="col-span-2"><F label="Memo"><input data-agent="ns-je-memo-header" className={inp} value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="Memo" /></F></div>
        </div>
      </div>
      <div className="mx-6 mb-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <div className="px-4 pt-3 flex gap-5 text-[13px] border-b border-[#e4e4e4]">
          {(['Lines', 'Communication', 'Custom'] as const).map((t) => (
            <button key={t} onClick={() => setSub(t)} className={`pb-2 ${sub === t ? 'border-b-[3px] border-[#3a75c4] font-bold text-[#24385b]' : 'text-[#555]'}`}>{t}</button>
          ))}
        </div>
        {sub === 'Communication' && (
          <div className="p-4">
            <F label="Note to Approver"><textarea className={`${inp} !h-20 py-1`} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note to approver" placeholder="Saved with the journal and shown to the approver" /></F>
          </div>
        )}
        {sub === 'Custom' && (
          <div className="p-4 grid grid-cols-3 gap-4 text-[13px]">
            <F label="Approval Routing"><div className="h-[26px] flex items-center">Controller → Sofia Martinez (CFO)</div></F>
            <F label="Source"><div className="h-[26px] flex items-center">Manual Entry</div></F>
            <F label="Close Checklist Task"><div className="h-[26px] flex items-center">Oct 2026 — Bank reconciliation</div></F>
          </div>
        )}
        {sub === 'Lines' && (
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
        )}
      </div>
    </div>
  )
}

function JournalView({ id, go }: { id: string; go: Go }) {
  const { isAgent } = useDesk()
  const j = useRecord<any>('netsuite.journals', id)
  const [actions, setActions] = useState(false)
  const [gl, setGl] = useState(false)
  const [edit, setEdit] = useState<{ memo: string; date: string; period: string } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  if (!j) return <div className="p-6">Record not found.</div>
  const dr = j.lines.reduce((t: number, l: any) => t + l.debit, 0)
  const pending = j.status === 'Pending Approval'
  const setStatus = (status: string) => {
    db.update('netsuite.journals', j.id, { status, approvedBy: status === 'Approved' ? 'Alex Morgan' : undefined, decidedAt: new Date().toISOString() })
    setActions(false)
    setMsg({ ok: status === 'Approved', t: `Journal #${j.number} ${status.toLowerCase()}.` })
  }
  const reverse = () => {
    if (j.reversedBy) return
    const number = nextJe()
    const rid = `nsj-${number.slice(-4)}`
    insertJournal({
      id: rid, number, date: new Date().toISOString(), period: j.period, memo: `Reversal of ${j.number}${j.memo ? ` — ${j.memo}` : ''}`, status: 'Pending Approval', subsidiary: j.subsidiary, currency: j.currency,
      lines: j.lines.map((l: any) => ({ ...l, debit: l.credit, credit: l.debit })), createdByName: 'Alex Morgan', createdBy: isAgent ? 'hworker' : undefined, createdAt: new Date().toISOString(), reverses: j.id,
    })
    db.update('netsuite.journals', j.id, { reversedBy: rid })
    go({ v: 'je', id: rid })
  }
  const saveEdit = () => {
    if (!edit) return
    db.update('netsuite.journals', j.id, { memo: edit.memo, date: new Date(edit.date + 'T12:00:00').toISOString(), period: edit.period })
    setEdit(null)
    setMsg({ ok: true, t: 'Transaction successfully saved.' })
  }
  return (
    <div>
      <PageHead kind="Journal Entry" title={<span data-agent="ns-je-title">#{j.number} · {j.memo}</span>} status={<span className={`text-[12px] font-bold px-2 py-0.5 rounded ${j.status === 'Approved' ? 'text-[#1e7b34] bg-[#eef8f0]' : j.status === 'Rejected' ? 'text-[#c0392b] bg-[#fdf0ee]' : 'text-[#b45f06] bg-[#fff4e5]'}`}>{j.status.toUpperCase()}</span>} go={go} list={{ v: 'jes' }}>
        {edit ? (
          <><Btn primary onClick={saveEdit}>Save</Btn><Btn onClick={() => setEdit(null)}>Cancel</Btn></>
        ) : (
          <>
            <Btn primary onClick={() => setEdit({ memo: j.memo ?? '', date: isoDate(j.date), period: j.period ?? 'Oct 2026' })}>Edit</Btn><Btn onClick={() => go({ v: 'jes' })}>Back</Btn><Btn onClick={reverse} disabled={!!j.reversedBy}>Reverse</Btn>
            <div className="relative">
              <Btn onClick={() => setActions((a) => !a)}>Actions ▾</Btn>
              {actions && (
                <div className="absolute left-0 top-[30px] z-20 w-[200px] bg-white border border-[#ccc] shadow-[0_4px_16px_rgba(0,0,0,0.2)] py-1 text-[13px]">
                  {pending && <button onClick={() => setStatus('Approved')} className="block w-full text-left px-3 py-1.5 hover:bg-[#e8f0fb]">Approve</button>}
                  {pending && <button onClick={() => setStatus('Rejected')} className="block w-full text-left px-3 py-1.5 hover:bg-[#e8f0fb]">Reject</button>}
                  <button onClick={() => go({ v: 'je', copyOf: j.id })} className="block w-full text-left px-3 py-1.5 hover:bg-[#e8f0fb]">Make Copy</button>
                  <button onClick={() => { setGl((g) => !g); setActions(false) }} className="block w-full text-left px-3 py-1.5 hover:bg-[#e8f0fb]">{gl ? 'Hide GL Impact' : 'GL Impact'}</button>
                </div>
              )}
            </div>
          </>
        )}
        {j.createdBy === 'hworker' && <HW />}
      </PageHead>
      {j.createdBy === 'hworker' && Date.now() - +new Date(j.createdAt) < 10 * 60000 && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-[3px] border bg-[#eef8f0] border-[#9fd3ab] text-[#1e5b2b] text-[13px] flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Transaction successfully saved. Routed to Sofia Martinez for approval.</div>
      )}
      {msg && <Banner ok={msg.ok} onClose={() => setMsg(null)}>{msg.t}</Banner>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px] p-5 grid grid-cols-4 gap-4 text-[13px]">
        {edit ? (
          <>
            <F label="Entry No."><div className="h-[26px] flex items-center">{j.number}</div></F>
            <F label="Date"><input type="date" className={inp} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} aria-label="Date" /></F>
            <F label="Posting Period"><select className={inp} value={edit.period} onChange={(e) => setEdit({ ...edit, period: e.target.value })} aria-label="Posting Period">{[...new Set([edit.period, 'Oct 2026', 'Nov 2026'])].map((p) => <option key={p}>{p}</option>)}</select></F>
            <div />
            <div className="col-span-4"><F label="Memo"><input className={inp} value={edit.memo} onChange={(e) => setEdit({ ...edit, memo: e.target.value })} aria-label="Memo" /></F></div>
          </>
        ) : (
          [['Entry No.', j.number], ['Subsidiary', j.subsidiary], ['Date', fd(j.date)], ['Posting Period', j.period], ['Currency', j.currency], ['Created By', j.createdByName + (j.createdBy === 'hworker' ? ' (via H-Worker)' : '')], ['Approval Status', j.status], ['Memo', j.memo],
            ...(j.reversalDate ? [['Reversal Date', fd(j.reversalDate)]] : []), ...(j.note ? [['Note to Approver', j.note]] : [])].map(([k, v]) => (
            <div key={k}><div className="text-[11px] font-semibold uppercase text-[#777]">{k}</div><div>{v}</div></div>
          ))
        )}
        {(j.reversedBy || j.reverses) && (
          <div className="col-span-4 text-[12.5px]">
            {j.reversedBy && <span>Reversed by <button className="text-[#3a75c4] hover:underline" onClick={() => go({ v: 'je', id: j.reversedBy })}>{db.find<any>('netsuite.journals', j.reversedBy)?.number ?? j.reversedBy}</button></span>}
            {j.reverses && <span>Reverses <button className="text-[#3a75c4] hover:underline" onClick={() => go({ v: 'je', id: j.reverses })}>{db.find<any>('netsuite.journals', j.reverses)?.number ?? j.reverses}</button></span>}
          </div>
        )}
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
      {gl && (
        <div className="mx-6 mb-6 bg-white border border-[#d5d5d5] rounded-[4px]">
          <div className="px-4 pt-3 pb-2 text-[13px] font-bold text-[#24385b] uppercase">GL Impact</div>
          <table className="w-full text-[13px]">
            <thead><tr className={TH}><th className="px-3 py-1.5">Book</th><th className="px-2">Account</th><th className="px-2 text-right">Amount (Debit)</th><th className="px-2 text-right">Amount (Credit)</th><th className="px-2">Posting</th><th className="px-2">Subsidiary</th></tr></thead>
            <tbody>{j.lines.map((l: any, i: number) => <tr key={i} className="h-[30px] border-b border-[#f0f0f0]"><td className="px-3">Primary Book</td><td className="px-2">{l.account}</td><td className="px-2 text-right">{l.debit ? n2(l.debit) : ''}</td><td className="px-2 text-right">{l.credit ? n2(l.credit) : ''}</td><td className="px-2">{j.status === 'Approved' ? 'Yes' : 'No (pending approval)'}</td><td className="px-2">{j.subsidiary}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function JournalList({ go, status: initial }: { go: Go; status?: string }) {
  const jes = useCollection<any>('netsuite.journals')
  const [status, setStatus] = useState(initial ?? '')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const rows = jes.filter((j) => (!status || j.status === status) && (!q || `${j.number} ${j.memo} ${j.createdByName}`.toLowerCase().includes(q.toLowerCase())))
  const decide = (s: string) => {
    sel.forEach((id) => db.update('netsuite.journals', id, { status: s, approvedBy: s === 'Approved' ? 'Alex Morgan' : undefined, decidedAt: new Date().toISOString() }))
    setMsg(`${sel.size} journal entr${sel.size === 1 ? 'y' : 'ies'} ${s.toLowerCase()}.`)
    setSel(new Set())
  }
  return (
    <div>
      <PageHead kind="Journal Entries" title="Transactions › Financial › Make Journal Entries › List" go={go} list={{ v: 'jes' }}>
        <Btn primary onClick={() => go({ v: 'je' })}>New Journal Entry</Btn>
        <Btn disabled={!sel.size} onClick={() => decide('Approved')}>Approve</Btn>
        <Btn disabled={!sel.size} onClick={() => decide('Rejected')}>Reject</Btn>
        <select className={`${inp} !w-[190px] ml-3`} value={status} onChange={(e) => { setStatus(e.target.value); setSel(new Set()) }} aria-label="Status filter"><option value="">Status: - All -</option><option>Pending Approval</option><option>Approved</option><option>Rejected</option></select>
        <input className={`${inp} !w-[220px]`} placeholder="Number, memo or creator" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter journal entries" />
      </PageHead>
      {msg && <Banner ok onClose={() => setMsg(null)}>{msg}</Banner>}
      <div className="m-6 bg-white border border-[#d5d5d5] rounded-[4px]">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase text-[#777] bg-[#f7f7f7] border-b border-[#e4e4e4]"><th className="w-8" /><th className="px-3 py-1.5">Date</th><th className="px-2">Number</th><th className="px-2">Memo</th><th className="px-2">Status</th><th className="px-2">Created By</th><th className="px-3 text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id} data-agent={`ns-je-row-${j.id}`} onClick={() => go({ v: 'je', id: j.id })} className={`h-[32px] border-b border-[#f0f0f0] hover:bg-[#f5f8fc] ${j.createdBy === 'hworker' ? 'flash-new' : ''} ${sel.has(j.id) ? 'bg-[#dfeafa]' : ''}`}>
                <td className="text-center" onClick={(e) => e.stopPropagation()}>{j.status === 'Pending Approval' && <input type="checkbox" aria-label={`Select ${j.number}`} checked={sel.has(j.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(j.id) ? n.delete(j.id) : n.add(j.id); return n })} className="accent-[#3a75c4]" />}</td>
                <td className="px-3">{fd(j.date)}</td><td className="px-2 text-[#3a75c4]">{j.number}</td><td className="px-2">{j.memo} {j.createdBy === 'hworker' && <HW />}</td><td className="px-2">{j.status}</td><td className="px-2">{j.createdByName}</td><td className="px-3 text-right">{n2(j.lines.reduce((t: number, l: any) => t + l.debit, 0))}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="h-14 text-center text-[#888]">No journal entries to show.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
