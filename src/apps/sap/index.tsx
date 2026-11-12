import { useEffect, useMemo, useState } from 'react'
import { Bell, ChevronDown, Search, HelpCircle, ArrowLeft, Sparkles, X, Settings, LayoutGrid, LogOut, Info, UserRound, History, BookOpen, Megaphone, LifeBuoy, FileText, ClipboardList, Users } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin, useDesk } from '@/os/context'
import { useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { Launchpad } from './Launchpad'
import { CreateInvoice } from './CreateInvoice'
import { InvoiceList, InvoiceObject } from './Invoices'
import { PoList, PoObject } from './POs'
import { SupplierList, SupplierObject } from './Suppliers'
import { JournalList, JournalObject } from './Journals'
import { PaymentBlocks, PaymentRun, SupplierBalances } from './Payments'
import { PostJournal, TrialBalance, GlAccountItems } from './Ledger'
import { CreatePo, CreateSupplier } from './MasterData'
import { AppFinder, CATALOG, trackRecent, recentApps } from './AppFinder'
import { JoulePanel } from './Joule'
import { Dropdown, MenuItem, MenuSep, Dialog, Btn, Field, Select, Text } from './ui'

export type SapRoute =
  | { app: 'home'; space?: string }
  | { app: 'createInvoice'; poId?: string }
  | { app: 'invoices'; status?: string }
  | { app: 'invoice'; id: string }
  | { app: 'pos'; status?: string }
  | { app: 'po'; id: string }
  | { app: 'suppliers' }
  | { app: 'supplier'; id: string }
  | { app: 'journals' }
  | { app: 'journal'; id: string }
  | { app: 'paymentBlocks' }
  | { app: 'paymentRun' }
  | { app: 'supplierBalances' }
  | { app: 'postJournal'; preset?: 'accrual' }
  | { app: 'trialBalance' }
  | { app: 'glAccount'; id: string }
  | { app: 'createPo'; copyFrom?: string }
  | { app: 'createSupplier' }
  | { app: 'appFinder' }

const BASE = 'https://my401273.s4hana.cloud.sap/ui'

const META: Record<string, [string, (r: any) => string]> = {
  home: ['Home', () => '#Shell-home'],
  createInvoice: ['Create Supplier Invoice', () => '#SupplierInvoice-create'],
  invoices: ['Manage Supplier Invoices', () => '#SupplierInvoice-manage'],
  invoice: ['Supplier Invoice', (r) => `#SupplierInvoice-manage&/C_SupplierInvoiceItemObject(SupplierInvoice='${r.id}',FiscalYear='2026')`],
  pos: ['Manage Purchase Orders', () => '#PurchaseOrder-manage'],
  po: ['Purchase Order', (r) => `#PurchaseOrder-manage&/C_PurchaseOrderTP(PurchaseOrder='${r.id}',DraftUUID=guid'00000000-0000-0000-0000-000000000000',IsActiveEntity=true)`],
  suppliers: ['Display Supplier List', () => '#Supplier-displayList'],
  supplier: ['Supplier', (r) => `#Supplier-displayFactSheet?Supplier=${r.id}`],
  journals: ['Manage Journal Entries', () => '#AccountingDocument-manage'],
  journal: ['Journal Entry', (r) => `#AccountingDocument-manage&/C_JournalEntryItem(CompanyCode='1010',AccountingDocument='${r.id}',FiscalYear='2026')`],
  paymentBlocks: ['Manage Payment Blocks', () => '#SupplierInvoice-managePaymentBlocks'],
  paymentRun: ['Manage Automatic Payments', () => '#AutomaticPayment-manage'],
  supplierBalances: ['Display Supplier Balances', () => '#Supplier-displayBalances'],
  postJournal: ['Post General Journal Entries', (r) => (r.preset === 'accrual' ? '#AccrualObject-post' : '#GLAccount-postGeneralJournalEntry')],
  trialBalance: ['Trial Balance', () => '#GLAccount-showTrialBalance'],
  glAccount: ['G/L Account', (r) => `#GLAccount-displayGLLineItemReportingView?GLAccount=${r.id}&CompanyCode=1010`],
  createPo: ['Create Purchase Order', () => '#PurchaseOrder-create'],
  createSupplier: ['Manage Business Partner Master Data', () => '#BusinessPartner-create'],
  appFinder: ['App Finder', () => '#Shell-appfinder'],
}

const NOTIFS: [string, string, string, SapRoute][] = [
  ['Purchase order 4500018390 was released', 'Litware Inc. · 3,980.00 USD', '12 days ago', { app: 'po', id: '4500018390' }],
  ['Supplier invoice 5105601202 is blocked for payment', 'Price variance on item 00010 exceeds tolerance', '2 days ago', { app: 'invoice', id: '5105601202' }],
  ['Payment run 10/14 completed', '142,918.70 USD paid to 38 suppliers', '7 days ago', { app: 'paymentRun' }],
]
const DISMISS_KEY = 'sap-notifs-dismissed'
const loadDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]')
  } catch {
    return []
  }
}
const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - +new Date(iso)) / 60000))
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`
}

export default function SAP({ win, params }: AppProps) {
  const { setUrl, setTitle, close } = useWin()
  const { toast, open } = useDesk()
  const [route, setRoute] = useState<SapRoute>({ app: 'home' })
  const [history, setHistory] = useState<SapRoute[]>([])
  const [notif, setNotif] = useState(false)
  const [joule, setJoule] = useState(false)
  const [dialog, setDialog] = useState<null | 'settings' | 'about' | 'recent'>(null)
  const [q, setQ] = useState('')
  const [qOpen, setQOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed)
  const invoices = useCollection<any>('sap.invoices')
  const pos = useCollection<any>('sap.pos')
  const suppliers = useCollection<any>('sap.suppliers')

  const [seq, setSeq] = useState(0)
  const go = (r: SapRoute) => {
    setHistory((h) => [...h, route])
    setRoute(r)
    setSeq((n) => n + 1)
    setJoule(false)
    setNotif(false)
  }

  // live notifications: H-Worker postings + POs waiting for release, plus the standing system messages
  const notifs = useMemo(() => {
    const hw = invoices
      .filter((i) => i.createdBy === 'hworker' && i.createdAt)
      .slice(0, 3)
      .map((i) => ({ key: `hw-${i.id}`, title: `Supplier invoice ${i.id} was posted by H-Worker`, sub: `${i.supplierName} · ${i.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, when: ago(i.createdAt), route: { app: 'invoice', id: i.id } as SapRoute }))
    const rel = pos.filter((p) => p.status === 'In Approval')
    const release = rel.length ? [{ key: `rel-${rel.map((p) => p.id).join('.')}`, title: `${rel.length} purchase orders are waiting for your release`, sub: 'Release strategy Z1 · Procurement', when: 'Today', route: { app: 'pos', status: 'In Approval' } as SapRoute }] : []
    const fixed = NOTIFS.map(([t, s, d, r]) => ({ key: t, title: t, sub: s, when: d, route: r }))
    return [...hw, ...release, ...fixed].filter((n) => !dismissed.includes(n.key))
  }, [invoices, pos, dismissed])
  const dismiss = (keys: string[]) => {
    const next = [...new Set([...dismissed, ...keys])]
    setDismissed(next)
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
  }

  // shell search: apps + business documents
  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    const apps = CATALOG.filter((a) => a.name.toLowerCase().includes(t)).slice(0, 5).map((a) => ({ key: 'a' + a.key, label: a.name, sub: 'App', route: a.route }))
    const inv = invoices.filter((i) => i.id.includes(t) || String(i.reference ?? '').toLowerCase().includes(t)).slice(0, 4).map((i) => ({ key: 'i' + i.id, label: `Supplier Invoice ${i.id}`, sub: `${i.supplierName} · ${i.reference}`, route: { app: 'invoice', id: i.id } as SapRoute }))
    const po = pos.filter((p) => p.id.includes(t)).slice(0, 4).map((p) => ({ key: 'p' + p.id, label: `Purchase Order ${p.id}`, sub: p.supplierName, route: { app: 'po', id: p.id } as SapRoute }))
    const sup = suppliers.filter((s) => s.name.toLowerCase().includes(t) || s.id.includes(t)).slice(0, 4).map((s) => ({ key: 's' + s.id, label: s.name, sub: `Supplier ${s.id}`, route: { app: 'supplier', id: s.id } as SapRoute }))
    return [...apps, ...inv, ...po, ...sup]
  }, [q, invoices, pos, suppliers])
  const pick = (r: SapRoute) => {
    go(r)
    setQ('')
    setQOpen(false)
  }
  const back = () => {
    setHistory((h) => {
      const prev = h[h.length - 1]
      setRoute(prev ?? { app: 'home' })
      return h.slice(0, -1)
    })
  }

  useEffect(() => {
    const p = params ?? {}
    if (p.invoiceId) setRoute({ app: 'invoice', id: p.invoiceId })
    else if (p.poId && p.app !== 'createInvoice') setRoute({ app: 'po', id: p.poId })
    else if (p.supplierId) setRoute({ app: 'supplier', id: p.supplierId })
    else if (p.journalId) setRoute({ app: 'journal', id: p.journalId })
    else if (p.app) setRoute(p.app === 'home' ? { app: 'home', space: p.space } : ({ app: p.app, poId: p.poId, ...(p.status ? { status: p.status } : {}) } as any))
  }, [win.nonce])

  useEffect(() => trackRecent(route), [route])

  useEffect(() => {
    const m = META[route.app]
    setUrl(BASE + m[1](route))
    const t = 'id' in route ? `${m[0]} ${route.id}` : m[0]
    setTitle(route.app === 'home' ? 'Home' : t)
  }, [route])

  const title = META[route.app][0]

  return (
    <div className="flex-1 min-h-0 flex flex-col relative" style={{ fontFamily: 'var(--font-sap)', background: '#f5f6f7', color: '#1d2d3e' }}>
      {/* shell bar */}
      <div className="h-[52px] shrink-0 flex items-center px-3 gap-2 bg-white relative z-20 shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.25rem_rgba(34,53,72,0.15)]">
        {route.app !== 'home' && (
          <button data-agent="sap-back" aria-label="Back" onClick={back} className="w-9 h-9 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#0064d9]">
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
        )}
        <button data-agent="sap-home" aria-label="Home" onClick={() => go({ app: 'home' })} className="flex items-center gap-3 h-10 px-1 rounded-lg hover:bg-[#eaecee]">
          <img src={logoUrl('sap')} className="h-[30px]" alt="SAP" />
        </button>
        <Dropdown
          width={300}
          trigger={(_, toggle) => (
            <button onClick={toggle} className="flex items-center gap-1 h-9 px-2 rounded-lg hover:bg-[#eaecee] text-[14px] font-bold text-[#1d2d3e]">
              {title} <ChevronDown className="w-4 h-4 text-[#1d2d3e]" />
            </button>
          )}
        >
          {(closeMenu) => (
            <>
              <div className="px-3 pt-1 pb-1 text-[12px] font-semibold text-[#556b82] uppercase tracking-wide">Navigate to</div>
              <MenuItem icon={<LayoutGrid className="w-4 h-4" />} onClick={() => { closeMenu(); go({ app: 'home' }) }}>My Home</MenuItem>
              {CATALOG.filter((a) => a.key !== 'glBalances').map((a) => (
                <MenuItem key={a.key} active={META[route.app][0] === a.name} icon={<a.icon className="w-4 h-4" />} onClick={() => { closeMenu(); go(a.route) }}>{a.name}</MenuItem>
              ))}
              <MenuSep />
              <MenuItem icon={<Search className="w-4 h-4" />} onClick={() => { closeMenu(); go({ app: 'appFinder' }) }}>App Finder</MenuItem>
            </>
          )}
        </Dropdown>
        <div className="flex-1" />
        <div className="relative">
          <div className="flex items-center w-[400px] h-9 rounded-[18px] bg-[#eff1f2] border border-transparent hover:border-[#bcc3ca] focus-within:border-[#0064d9] px-3 gap-2 text-[14px]">
            <span className="text-[#556b82] text-[13px] pr-2 border-r border-[#bcc3ca] flex items-center gap-1">Apps <ChevronDown className="w-3.5 h-3.5" /></span>
            <input
              data-agent="sap-search"
              aria-label="Search"
              placeholder="Search in: Apps"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setQOpen(true)
              }}
              onFocus={() => setQOpen(true)}
              onBlur={() => setTimeout(() => setQOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) pick(results[0].route)
                if (e.key === 'Escape') setQOpen(false)
              }}
              className="flex-1 bg-transparent outline-none placeholder:text-[#556b82]"
            />
            <Search className="w-4 h-4 text-[#556b82]" />
          </div>
          {qOpen && q.trim() && (
            <div className="absolute left-0 right-0 top-[40px] z-50 bg-white rounded-xl shadow-[0_0_1rem_rgba(34,53,72,0.25)] border border-[#e5e5e5] py-1 max-h-[420px] overflow-auto">
              {results.length === 0 && <div className="px-3 py-3 text-[14px] text-[#556b82]">No results for “{q}”</div>}
              {results.map((r) => (
                <button key={r.key} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r.route)} className="w-full text-left px-3 py-1.5 hover:bg-[#eaecee] flex items-center gap-2">
                  {r.sub === 'App' ? <LayoutGrid className="w-4 h-4 text-[#0064d9]" /> : r.key[0] === 'i' ? <FileText className="w-4 h-4 text-[#556b82]" /> : r.key[0] === 'p' ? <ClipboardList className="w-4 h-4 text-[#556b82]" /> : <Users className="w-4 h-4 text-[#556b82]" />}
                  <span className="min-w-0">
                    <span className="block text-[14px] truncate">{r.label}</span>
                    <span className="block text-[12px] text-[#556b82] truncate">{r.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => { setJoule((j) => !j); setNotif(false) }} className={`ml-2 flex items-center gap-1.5 h-9 px-2.5 rounded-lg hover:bg-[#eaecee] text-[14px] font-semibold ${joule ? 'bg-[#f1ecff]' : ''}`} style={{ color: '#5d36ff' }} aria-label="Joule">
          <Sparkles className="w-[18px] h-[18px]" /> Joule
        </button>
        <Dropdown
          align="right"
          width={260}
          trigger={(_, toggle) => (
            <button onClick={toggle} className="w-9 h-9 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#1d2d3e]" aria-label="Help">
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
          )}
        >
          {(closeMenu) => (
            <>
              <MenuItem icon={<BookOpen className="w-4 h-4" />} onClick={() => { closeMenu(); toast({ appId: 'sap', title: 'SAP Help Portal', body: `Opened help for “${title}” in a new tab.` }) }}>Help for this App</MenuItem>
              <MenuItem icon={<Megaphone className="w-4 h-4" />} onClick={() => { closeMenu(); toast({ appId: 'sap', title: 'What’s New in SAP S/4HANA Cloud 2608', body: 'Payment blocks can now be released in mass from Manage Payment Blocks.' }) }}>What’s New</MenuItem>
              <MenuItem icon={<Sparkles className="w-4 h-4" />} onClick={() => { closeMenu(); setJoule(true) }}>Ask Joule</MenuItem>
              <MenuSep />
              <MenuItem icon={<LifeBuoy className="w-4 h-4" />} onClick={() => { closeMenu(); open('servicenow') }}>Report an Incident</MenuItem>
            </>
          )}
        </Dropdown>
        <button data-agent="sap-notifications" onClick={() => { setNotif((n) => !n); setJoule(false) }} className="relative w-9 h-9 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#1d2d3e]" aria-label="Notifications">
          <Bell className="w-[18px] h-[18px]" />
          {notifs.length > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#aa0808] text-white text-[10px] font-bold flex items-center justify-center">{notifs.length}</span>}
        </button>
        <Dropdown
          align="right"
          width={280}
          trigger={(_, toggle) => (
            <button onClick={toggle} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold ml-1" style={{ background: '#5d36ff' }} aria-label="Alex Morgan">
              AM
            </button>
          )}
        >
          {(closeMenu) => (
            <>
              <div className="px-3 py-2 flex items-center gap-3 border-b border-[#e5e5e5] mb-1">
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold" style={{ background: '#5d36ff' }}>AM</span>
                <div className="min-w-0">
                  <div className="font-bold">{ME.first} Morgan</div>
                  <div className="text-[12px] text-[#556b82] truncate">AP Accountant · Company Code 1010</div>
                </div>
              </div>
              <MenuItem icon={<Settings className="w-4 h-4" />} onClick={() => { closeMenu(); setDialog('settings') }}>Settings</MenuItem>
              <MenuItem icon={<LayoutGrid className="w-4 h-4" />} onClick={() => { closeMenu(); go({ app: 'appFinder' }) }}>App Finder</MenuItem>
              <MenuItem icon={<History className="w-4 h-4" />} onClick={() => { closeMenu(); setDialog('recent') }}>Recent Activity</MenuItem>
              <MenuItem icon={<UserRound className="w-4 h-4" />} onClick={() => { closeMenu(); go({ app: 'home' }) }}>Edit Home Page</MenuItem>
              <MenuItem icon={<Info className="w-4 h-4" />} onClick={() => { closeMenu(); setDialog('about') }}>About</MenuItem>
              <MenuSep />
              <MenuItem icon={<LogOut className="w-4 h-4" />} onClick={() => { closeMenu(); close() }}>Sign Out</MenuItem>
            </>
          )}
        </Dropdown>
        {notif && (
          <div className="absolute right-12 top-[50px] w-[380px] bg-white rounded-xl shadow-[0_0_2rem_rgba(34,53,72,0.3)] z-50">
            <div className="h-12 px-4 flex items-center border-b border-[#e5e5e5] text-[16px] font-bold">
              Notifications <div className="flex-1" />
              {notifs.length > 0 && <button onClick={() => dismiss(notifs.map((n) => n.key))} className="h-7 px-2 rounded text-[13px] font-semibold text-[#0064d9] hover:bg-[#eaecee] mr-1">Clear All</button>}
              <button onClick={() => setNotif(false)} className="w-7 h-7 rounded hover:bg-[#eaecee] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            {notifs.length === 0 && <div className="px-4 py-6 text-center text-[14px] text-[#556b82]">No new notifications</div>}
            <div className="max-h-[420px] overflow-auto">
              {notifs.map((n) => (
                <div key={n.key} onClick={() => go(n.route)} className="group relative px-4 py-3 border-b border-[#eef0f2] hover:bg-[#f5f6f7] cursor-pointer">
                  <div className="text-[14px] font-bold pr-6">{n.title}</div>
                  <div className="text-[13px] text-[#556b82]">{n.sub}</div>
                  <div className="text-[12px] text-[#556b82] mt-1">{n.when}</div>
                  <button
                    aria-label="Dismiss notification"
                    onClick={(e) => {
                      e.stopPropagation()
                      dismiss([n.key])
                    }}
                    className="absolute right-3 top-3 w-6 h-6 rounded hover:bg-[#eaecee] items-center justify-center hidden group-hover:flex"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {joule && <JoulePanel go={go} onClose={() => setJoule(false)} />}
      {dialog === 'settings' && <SettingsDialog onClose={() => setDialog(null)} />}
      {dialog === 'about' && (
        <Dialog title="About" state="info" width={460} footer={<Btn kind="emph" onClick={() => setDialog(null)}>Close</Btn>}>
          <div className="p-5 grid grid-cols-2 gap-y-3 text-[14px]">
            {[['Product', 'SAP S/4HANA Cloud Public Edition'], ['Release', '2608.1'], ['System', 'my401273 (Client 100)'], ['Company Code', '1010 — Northwind Global Inc.'], ['User', 'AMORGAN (Alex Morgan)'], ['UI Theme', 'Morning Horizon'], ['Application', title]].map(([k, v]) => (
              <Field key={k} label={k}><Text>{v}</Text></Field>
            ))}
          </div>
        </Dialog>
      )}
      {dialog === 'recent' && (
        <Dialog title="Recent Activity" width={480} footer={<Btn kind="emph" onClick={() => setDialog(null)}>Close</Btn>}>
          <div className="py-2">
            {recentApps().length === 0 && <div className="px-5 py-4 text-[14px] text-[#556b82]">No recent activity.</div>}
            {recentApps().map((a) => (
              <button key={a.key} onClick={() => { setDialog(null); go(a.route) }} className="w-full px-5 py-2 flex items-center gap-3 hover:bg-[#eaecee] text-left">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.color }}><a.icon className="w-4 h-4 text-white" /></span>
                <span className="text-[14px]">{a.name}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {route.app === 'home' && <Launchpad go={go} initialSpace={route.space} />}
        {route.app === 'createInvoice' && <CreateInvoice key={'ci' + win.nonce + '-' + seq} go={go} initialPo={route.poId} />}
        {route.app === 'invoices' && <InvoiceList key={'il' + (route.status ?? '')} go={go} status={route.status} />}
        {route.app === 'invoice' && <InvoiceObject id={route.id} go={go} />}
        {route.app === 'pos' && <PoList key={'pl' + (route.status ?? '')} go={go} status={route.status} />}
        {route.app === 'po' && <PoObject id={route.id} go={go} />}
        {route.app === 'suppliers' && <SupplierList go={go} />}
        {route.app === 'supplier' && <SupplierObject id={route.id} go={go} />}
        {route.app === 'journals' && <JournalList go={go} />}
        {route.app === 'journal' && <JournalObject id={route.id} go={go} />}
        {route.app === 'paymentBlocks' && <PaymentBlocks go={go} />}
        {route.app === 'paymentRun' && <PaymentRun go={go} />}
        {route.app === 'supplierBalances' && <SupplierBalances go={go} />}
        {route.app === 'postJournal' && <PostJournal key={'pj' + (route.preset ?? '')} go={go} preset={route.preset} title={route.preset === 'accrual' ? 'Post Accruals' : undefined} />}
        {route.app === 'trialBalance' && <TrialBalance go={go} />}
        {route.app === 'glAccount' && <GlAccountItems id={route.id} go={go} />}
        {route.app === 'createPo' && <CreatePo key={'cpo' + (route.copyFrom ?? '')} go={go} copyFrom={route.copyFrom} />}
        {route.app === 'createSupplier' && <CreateSupplier go={go} />}
        {route.app === 'appFinder' && <AppFinder go={go} />}
      </div>
    </div>
  )
}

export type Go = (r: SapRoute) => void

const SETTINGS_KEY = 'sap-user-settings'
function SettingsDialog({ onClose }: { onClose: () => void }) {
  const init = (() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    } catch {
      return {}
    }
  })()
  const [v, setV] = useState<Record<string, string>>({ language: 'English (United States)', dateFormat: 'MMM d, y', numberFormat: '1,234,567.89', timeZone: 'America/New_York', ...init })
  const save = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(v))
    } catch {
      /* storage unavailable */
    }
    onClose()
  }
  const opt: Record<string, string[]> = {
    language: ['English (United States)', 'English (United Kingdom)', 'Deutsch', 'Français', 'Español'],
    dateFormat: ['MMM d, y', 'MM/dd/yyyy', 'dd.MM.yyyy', 'yyyy-MM-dd'],
    numberFormat: ['1,234,567.89', '1.234.567,89', '1 234 567,89'],
    timeZone: ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/Berlin', 'UTC'],
  }
  const labels: Record<string, string> = { language: 'Language', dateFormat: 'Date Format', numberFormat: 'Number Format', timeZone: 'Time Zone' }
  return (
    <Dialog title="Settings" width={520} footer={<><Btn kind="emph" data-agent="sap-settings-save" onClick={save}>Save</Btn><Btn kind="transparent" onClick={onClose}>Cancel</Btn></>}>
      <div className="p-5 space-y-4">
        <div className="text-[14px] text-[#556b82]">User Account · Appearance: <b className="text-[#1d2d3e]">Morning Horizon (Light)</b></div>
        {Object.keys(opt).map((k) => (
          <Field key={k} label={labels[k]}>
            <Select aria-label={labels[k]} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })}>
              {opt[k].map((o) => <option key={o}>{o}</option>)}
            </Select>
          </Field>
        ))}
      </div>
    </Dialog>
  )
}
