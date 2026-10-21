import { useEffect, useState } from 'react'
import { Bell, ChevronDown, Search, HelpCircle, ArrowLeft, Sparkles, X } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin } from '@/os/context'
import { Launchpad } from './Launchpad'
import { CreateInvoice } from './CreateInvoice'
import { InvoiceList, InvoiceObject } from './Invoices'
import { PoList, PoObject } from './POs'
import { SupplierList, SupplierObject } from './Suppliers'
import { JournalList, JournalObject } from './Journals'

export type SapRoute =
  | { app: 'home'; space?: string }
  | { app: 'createInvoice'; poId?: string }
  | { app: 'invoices' }
  | { app: 'invoice'; id: string }
  | { app: 'pos' }
  | { app: 'po'; id: string }
  | { app: 'suppliers' }
  | { app: 'supplier'; id: string }
  | { app: 'journals' }
  | { app: 'journal'; id: string }

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
}

const NOTIFS = [
  ['Purchase order 4500018390 was released', 'Litware Inc. · 3,980.00 USD', '12 days ago'],
  ['Supplier invoice 5105601202 is blocked for payment', 'Price variance on item 00010 exceeds tolerance', '2 days ago'],
  ['Payment run 10/14 completed', '142,918.70 USD paid to 38 suppliers', '7 days ago'],
]

export default function SAP({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [route, setRoute] = useState<SapRoute>({ app: 'home' })
  const [history, setHistory] = useState<SapRoute[]>([])
  const [notif, setNotif] = useState(false)

  const go = (r: SapRoute) => {
    setHistory((h) => [...h, route])
    setRoute(r)
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
    else if (p.app) setRoute(p.app === 'home' ? { app: 'home', space: p.space } : ({ app: p.app, poId: p.poId } as any))
  }, [win.nonce])

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
        <button className="flex items-center gap-1 h-9 px-2 rounded-lg hover:bg-[#eaecee] text-[14px] font-bold text-[#1d2d3e]">
          {title} <ChevronDown className="w-4 h-4 text-[#1d2d3e]" />
        </button>
        <div className="flex-1" />
        <div className="flex items-center w-[400px] h-9 rounded-[18px] bg-[#eff1f2] border border-transparent hover:border-[#bcc3ca] px-3 gap-2 text-[14px]">
          <span className="text-[#556b82] text-[13px] pr-2 border-r border-[#bcc3ca] flex items-center gap-1">Apps <ChevronDown className="w-3.5 h-3.5" /></span>
          <input data-agent="sap-search" aria-label="Search" placeholder="Search in: Apps" className="flex-1 bg-transparent outline-none placeholder:text-[#556b82]" />
          <Search className="w-4 h-4 text-[#556b82]" />
        </div>
        <button className="ml-2 flex items-center gap-1.5 h-9 px-2.5 rounded-lg hover:bg-[#eaecee] text-[14px] font-semibold" style={{ color: '#5d36ff' }} aria-label="Joule">
          <Sparkles className="w-[18px] h-[18px]" /> Joule
        </button>
        <button className="w-9 h-9 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#1d2d3e]" aria-label="Help">
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>
        <button data-agent="sap-notifications" onClick={() => setNotif((n) => !n)} className="relative w-9 h-9 rounded-lg hover:bg-[#eaecee] flex items-center justify-center text-[#1d2d3e]" aria-label="Notifications">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#aa0808] text-white text-[10px] font-bold flex items-center justify-center">3</span>
        </button>
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold ml-1" style={{ background: '#5d36ff' }} aria-label="Alex Morgan">
          AM
        </button>
        {notif && (
          <div className="absolute right-12 top-[50px] w-[380px] bg-white rounded-xl shadow-[0_0_2rem_rgba(34,53,72,0.3)] z-50">
            <div className="h-12 px-4 flex items-center border-b border-[#e5e5e5] text-[16px] font-bold">
              Notifications <div className="flex-1" />
              <button onClick={() => setNotif(false)} className="w-7 h-7 rounded hover:bg-[#eaecee] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            {NOTIFS.map(([t, s, d]) => (
              <div key={t} className="px-4 py-3 border-b border-[#eef0f2] hover:bg-[#f5f6f7]">
                <div className="text-[14px] font-bold">{t}</div>
                <div className="text-[13px] text-[#556b82]">{s}</div>
                <div className="text-[12px] text-[#556b82] mt-1">{d}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col relative">
        {route.app === 'home' && <Launchpad go={go} initialSpace={route.space} />}
        {route.app === 'createInvoice' && <CreateInvoice key={'ci' + win.nonce} go={go} initialPo={route.poId} />}
        {route.app === 'invoices' && <InvoiceList go={go} />}
        {route.app === 'invoice' && <InvoiceObject id={route.id} go={go} />}
        {route.app === 'pos' && <PoList go={go} />}
        {route.app === 'po' && <PoObject id={route.id} go={go} />}
        {route.app === 'suppliers' && <SupplierList go={go} />}
        {route.app === 'supplier' && <SupplierObject id={route.id} go={go} />}
        {route.app === 'journals' && <JournalList go={go} />}
        {route.app === 'journal' && <JournalObject id={route.id} go={go} />}
      </div>
    </div>
  )
}

export type Go = (r: SapRoute) => void
