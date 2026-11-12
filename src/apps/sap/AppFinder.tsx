/** App catalog (used by the shell search, navigation menu, App Finder and "Recently Used"). */
import { useState } from 'react'
import {
  FilePlus2, FileText, ClipboardList, Users, BookOpen, PenLine, Ban, Wallet, CalendarClock, ShoppingCart, Scale, Building2, BarChart3, Receipt, Search, Home,
} from 'lucide-react'
import { Input, PageHeader } from './ui'
import type { Go, SapRoute } from './index'

export type CatalogApp = { key: string; name: string; sub: string; icon: any; color: string; group: string; route: SapRoute }

export const CATALOG: CatalogApp[] = [
  { key: 'createInvoice', name: 'Create Supplier Invoice', sub: 'Logistics invoice verification', icon: FilePlus2, color: '#0070f2', group: 'Accounts Payable', route: { app: 'createInvoice' } },
  { key: 'invoices', name: 'Manage Supplier Invoices', sub: 'Display, park, post, cancel', icon: FileText, color: '#7858ff', group: 'Accounts Payable', route: { app: 'invoices' } },
  { key: 'paymentBlocks', name: 'Manage Payment Blocks', sub: 'Release blocked invoices', icon: Ban, color: '#aa0808', group: 'Accounts Payable', route: { app: 'paymentBlocks' } },
  { key: 'paymentRun', name: 'Manage Automatic Payments', sub: 'Payment program F110', icon: CalendarClock, color: '#0057d2', group: 'Accounts Payable', route: { app: 'paymentRun' } },
  { key: 'supplierBalances', name: 'Display Supplier Balances', sub: 'Open items by supplier', icon: Wallet, color: '#07838f', group: 'Accounts Payable', route: { app: 'supplierBalances' } },
  { key: 'pos', name: 'Manage Purchase Orders', sub: 'Release, edit, print', icon: ClipboardList, color: '#df1278', group: 'Procurement', route: { app: 'pos' } },
  { key: 'createPo', name: 'Create Purchase Order', sub: 'Advanced', icon: ShoppingCart, color: '#c0399f', group: 'Procurement', route: { app: 'createPo' } },
  { key: 'suppliers', name: 'Display Supplier List', sub: 'Supplier fact sheets', icon: Users, color: '#07838f', group: 'Master Data', route: { app: 'suppliers' } },
  { key: 'createSupplier', name: 'Manage Business Partner Master Data', sub: 'Create supplier', icon: Building2, color: '#5d36ff', group: 'Master Data', route: { app: 'createSupplier' } },
  { key: 'journals', name: 'Manage Journal Entries', sub: 'Display, reverse', icon: BookOpen, color: '#c35500', group: 'General Ledger', route: { app: 'journals' } },
  { key: 'postJournal', name: 'Post General Journal Entries', sub: 'Manual G/L postings', icon: PenLine, color: '#3c8cdd', group: 'General Ledger', route: { app: 'postJournal' } },
  { key: 'trialBalance', name: 'Trial Balance', sub: 'Ledger 0L', icon: Scale, color: '#188918', group: 'General Ledger', route: { app: 'trialBalance' } },
  { key: 'glBalances', name: 'Display G/L Account Balances', sub: 'Balances and line items', icon: BarChart3, color: '#1c6b9e', group: 'General Ledger', route: { app: 'trialBalance' } },
  { key: 'accruals', name: 'Post Accruals', sub: 'Period-end closing', icon: Receipt, color: '#8d2a00', group: 'Financial Close', route: { app: 'postJournal', preset: 'accrual' } },
]

export const appOf = (r: SapRoute) => CATALOG.find((c) => c.route.app === r.app && (c.route as any).preset === (r as any).preset)

/** remember the last apps opened (Recently Used on My Home) */
const RECENT_KEY = 'sap-recent-apps'
export function trackRecent(r: SapRoute) {
  const a = appOf(r)
  if (!a) return
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    localStorage.setItem(RECENT_KEY, JSON.stringify([a.key, ...cur.filter((k) => k !== a.key)].slice(0, 8)))
  } catch {
    /* storage unavailable */
  }
}
export function recentApps(): CatalogApp[] {
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return cur.map((k) => CATALOG.find((c) => c.key === k)).filter(Boolean) as CatalogApp[]
  } catch {
    return []
  }
}

export function AppFinder({ go }: { go: Go }) {
  const [q, setQ] = useState('')
  const list = CATALOG.filter((a) => !q || `${a.name} ${a.sub} ${a.group}`.toLowerCase().includes(q.toLowerCase()))
  const groups = [...new Set(list.map((a) => a.group))]
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader
        crumb={{ label: 'Home', onClick: () => go({ app: 'home' }) }}
        title="App Finder"
        subtitle={`${CATALOG.length} apps assigned to your business roles (AP Accountant, General Ledger Accountant, Purchaser)`}
        right={
          <div className="relative w-[280px]">
            <Input autoFocus aria-label="Search apps" placeholder="Search in catalog" value={q} onChange={(e) => setQ(e.target.value)} data-agent="sap-finder-search" />
            <Search className="w-4 h-4 absolute right-2 top-[5px] text-[#556b82]" />
          </div>
        }
      />
      <div className="flex-1 overflow-auto px-8 py-6">
        <button onClick={() => go({ app: 'home' })} className="mb-6 h-[72px] w-[300px] bg-white rounded-2xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] px-4 flex items-center gap-3 text-left">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1d2d3e]"><Home className="w-5 h-5 text-white" /></span>
          <span className="text-[14px] font-bold">My Home</span>
        </button>
        {groups.length === 0 && <div className="text-[14px] text-[#556b82]">No apps found for “{q}”.</div>}
        {groups.map((g) => (
          <div key={g} className="mb-8">
            <div className="text-[16px] font-bold mb-3">{g}</div>
            <div className="grid grid-cols-4 gap-4">
              {list.filter((a) => a.group === g).map((a) => (
                <button key={a.key} aria-label={a.name} onClick={() => go(a.route)} className="h-[72px] bg-white rounded-2xl shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] hover:shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.5rem_1rem_rgba(34,53,72,0.15)] px-4 flex items-center gap-3 text-left">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: a.color }}><a.icon className="w-5 h-5 text-white" /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-tight">{a.name}</span>
                    <span className="block text-[12px] text-[#556b82] truncate">{a.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
