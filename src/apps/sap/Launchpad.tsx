import { useState, type ReactNode } from 'react'
import {
  FilePlus2, FileText, ClipboardList, Users, BookOpen, PenLine, Upload, Landmark, Ban, Wallet, CalendarClock, ShoppingCart, PackageSearch,
  FileSpreadsheet, Scale, BarChart3, ArrowUp, ArrowDown, ListChecks, Building2, Receipt, CircleDollarSign, Banknote, ChevronRight, MoreHorizontal, Pencil,
} from 'lucide-react'
import { useCollection } from '@/db/db'
import { ME } from '@/data/people'
import type { Go, SapRoute } from './index'
import { Dropdown, MenuItem, MenuSep } from './ui'
import { recentApps } from './AppFinder'

import { PENDING_SAP_INVOICES } from './data'
export { PENDING_SAP_INVOICES }

const tileShadow = 'shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] hover:shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.5rem_1rem_rgba(34,53,72,0.15)]'

function Tile({ title, subtitle, icon: Icon, footer, onClick, agent, kpi, info }: { title: string; subtitle?: string; icon?: any; footer?: string; onClick?: () => void; agent?: string; kpi?: { value: string; unit?: string; color?: string; arrow?: 'up' | 'down' }; info?: string }) {
  return (
    <button data-agent={agent} aria-label={title} onClick={onClick} className={`w-[176px] h-[176px] shrink-0 bg-white rounded-2xl ${tileShadow} p-4 flex flex-col text-left transition-shadow`}>
      <div className="text-[14px] font-bold text-[#1d2d3e] leading-[1.25] line-clamp-3">{title}</div>
      {subtitle && <div className="text-[14px] text-[#556b82] leading-[1.25] mt-0.5 line-clamp-2">{subtitle}</div>}
      <div className="flex-1" />
      {kpi ? (
        <div className="flex items-end gap-1">
          <span className="text-[36px] leading-none font-light" style={{ color: kpi.color ?? '#1d2d3e', fontWeight: 300 }}>{kpi.value}</span>
          <div className="flex flex-col items-start pb-[3px]">
            {kpi.arrow && (kpi.arrow === 'up' ? <ArrowUp className="w-4 h-4" style={{ color: kpi.color }} /> : <ArrowDown className="w-4 h-4" style={{ color: kpi.color }} />)}
            {kpi.unit && <span className="text-[12px] text-[#556b82] font-semibold">{kpi.unit}</span>}
          </div>
        </div>
      ) : (
        Icon && <Icon className="w-8 h-8 text-[#0064d9] mb-1" strokeWidth={1.5} />
      )}
      <div className="flex items-center mt-2 h-4">
        <span className="text-[12px] text-[#556b82] truncate flex-1">{footer}</span>
        {info && <span className="text-[12px] text-[#556b82]">{info}</span>}
      </div>
    </button>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <div className="text-[16px] font-bold text-[#1d2d3e] mb-3 px-1">{title}</div>
      <div className="flex flex-wrap gap-4">{children}</div>
    </div>
  )
}

const SPACES = ['My Home', 'Accounts Payable', 'General Ledger', 'Procurement', 'Cash Management', 'Financial Close']

export function Launchpad({ go, initialSpace }: { go: Go; initialSpace?: string }) {
  const [space, setSpace] = useState(initialSpace ?? 'My Home')
  const invoices = useCollection<any>('sap.invoices')
  const pos = useCollection<any>('sap.pos')
  const journals = useCollection<any>('sap.journals')
  const pending = PENDING_SAP_INVOICES.filter((p) => !invoices.some((i) => i.supplierId === p.supplierId && i.reference === p.reference)).length
  const toPost = 10 + pending
  const blocked = invoices.filter((i) => i.status === 'Blocked for Payment').length
  const parked = invoices.filter((i) => i.status === 'Parked').length
  const inApproval = pos.filter((p) => p.status === 'In Approval').length
  const openPos = pos.filter((p) => p.status === 'Sent' || p.status === 'Partially Invoiced').length
  const t = (r: SapRoute) => () => go(r)

  const AP = (
    <>
      <Group title="Supplier Invoices">
        <Tile agent="sap-tile-to-post" title="Supplier Invoices to Post" subtitle="Company Code 1010" kpi={{ value: String(toPost), color: '#e76500' }} footer="Received in last 7 days" onClick={t({ app: 'invoices' })} />
        <Tile agent="sap-tile-overdue" title="Overdue Payables" subtitle="Northwind Global Inc." kpi={{ value: '1.2', unit: 'M USD', color: '#aa0808', arrow: 'up' }} footer="As of today" onClick={t({ app: 'invoices' })} />
        <Tile title="Invoices Blocked for Payment" subtitle="Price & quantity variances" kpi={{ value: String(blocked), color: '#aa0808' }} footer="Blocking reason R" onClick={t({ app: 'paymentBlocks' })} />
        <Tile agent="sap-tile-create-invoice" title="Create Supplier Invoice" icon={FilePlus2} footer="Logistics invoice verification" onClick={t({ app: 'createInvoice' })} />
        <Tile agent="sap-tile-manage-invoices" title="Manage Supplier Invoices" icon={FileText} footer={`${parked} parked`} onClick={t({ app: 'invoices' })} />
        <Tile title="Upload Supplier Invoices" icon={Upload} footer="OCR · PDF" onClick={t({ app: 'createInvoice' })} />
        <Tile title="Supplier Invoices List" subtitle="Advanced" icon={FileSpreadsheet} footer={`${parked} parked`} onClick={t({ app: 'invoices', status: 'Parked' })} />
      </Group>
      <Group title="Payments">
        <Tile title="Days Payable Outstanding" subtitle="Indirect DPO" kpi={{ value: '38.4', unit: 'Days', color: '#256f3a', arrow: 'up' }} footer="Last 12 months" onClick={t({ app: 'invoices' })} />
        <Tile title="Manage Automatic Payments" icon={CalendarClock} footer="Next run: Friday" onClick={t({ app: 'paymentRun' })} />
        <Tile title="Manage Payment Blocks" icon={Ban} footer={`${blocked} blocked`} onClick={t({ app: 'paymentBlocks' })} />
        <Tile title="Display Supplier Balances" icon={Wallet} onClick={t({ app: 'supplierBalances' })} />
      </Group>
      <Group title="Supplier Master Data">
        <Tile agent="sap-tile-suppliers" title="Display Supplier List" icon={Users} footer={`${26} suppliers`} onClick={t({ app: 'suppliers' })} />
        <Tile title="Manage Business Partner Master Data" icon={Building2} footer="Create supplier" onClick={t({ app: 'createSupplier' })} />
      </Group>
    </>
  )
  const GLs = (
    <>
      <Group title="Journal Entries">
        <Tile title="Journal Entries to Be Verified" subtitle="Workflow" kpi={{ value: '4', color: '#e76500' }} footer="Assigned to me" onClick={t({ app: 'journals' })} />
        <Tile agent="sap-tile-journals" title="Manage Journal Entries" icon={BookOpen} footer={`${journals.length} this period`} onClick={t({ app: 'journals' })} />
        <Tile title="Post General Journal Entries" icon={PenLine} onClick={t({ app: 'postJournal' })} />
        <Tile title="Upload General Journal Entries" icon={Upload} onClick={t({ app: 'postJournal' })} />
      </Group>
      <Group title="Reporting">
        <Tile title="Trial Balance" icon={Scale} footer="Fiscal period 010/2026" onClick={t({ app: 'trialBalance' })} />
        <Tile title="Display G/L Account Balances" icon={BarChart3} onClick={t({ app: 'trialBalance' })} />
        <Tile title="Days to Close" subtitle="Period-end close" kpi={{ value: '3', unit: 'Days', color: '#256f3a', arrow: 'down' }} footer="Target: 4 days" onClick={t({ app: 'journals' })} />
      </Group>
    </>
  )
  const PROC = (
    <>
      <Group title="Purchase Orders">
        <Tile title="Purchase Orders in Approval" kpi={{ value: String(inApproval), color: '#e76500' }} footer="Waiting for release" onClick={t({ app: 'pos', status: 'In Approval' })} />
        <Tile title="Open Purchase Orders" subtitle="Not fully invoiced" kpi={{ value: String(openPos), color: '#0064d9' }} footer="Company Code 1010" onClick={t({ app: 'pos', status: 'Sent' })} />
        <Tile agent="sap-tile-pos" title="Manage Purchase Orders" icon={ClipboardList} onClick={t({ app: 'pos' })} />
        <Tile title="Create Purchase Order" subtitle="Advanced" icon={ShoppingCart} onClick={t({ app: 'createPo' })} />
        <Tile title="Monitor Purchase Order Items" icon={PackageSearch} onClick={t({ app: 'pos' })} />
      </Group>
      <Group title="Spend Analytics">
        <Tile title="Purchase Order Spend" subtitle="Year to date" kpi={{ value: '14.8', unit: 'M USD', color: '#1d2d3e', arrow: 'up' }} footer="vs. 13.1M last year" onClick={t({ app: 'pos' })} />
        <Tile title="Off-Contract Spend" kpi={{ value: '6.2', unit: '%', color: '#256f3a', arrow: 'down' }} footer="Last 90 days" onClick={t({ app: 'pos' })} />
        <Tile title="Display Supplier List" icon={Users} onClick={t({ app: 'suppliers' })} />
        <Tile title="Supplier Balances" subtitle="Open payables" icon={Wallet} onClick={t({ app: 'supplierBalances' })} />
      </Group>
    </>
  )
  const CASH = (
    <Group title="Cash Operations">
      <Tile title="Cash Position" subtitle="All bank accounts" kpi={{ value: '28.6', unit: 'M USD', color: '#256f3a' }} footer="Today, 9:00 AM" onClick={t({ app: 'journals' })} />
      <Tile title="Manage Bank Statements" icon={Landmark} onClick={t({ app: 'journals' })} />
      <Tile title="Reprocess Bank Statement Items" icon={Banknote} onClick={t({ app: 'journals' })} />
      <Tile title="Manage Automatic Payments" icon={CircleDollarSign} onClick={t({ app: 'paymentRun' })} />
    </Group>
  )
  const CLOSE = (
    <Group title="Period-End Closing">
      <Tile title="Closing Tasks Completed" subtitle="Period 010/2026" kpi={{ value: '72', unit: '%', color: '#0064d9', arrow: 'up' }} footer="42 of 58 tasks" onClick={t({ app: 'journals' })} />
      <Tile title="Manage Closing Tasks" icon={ListChecks} onClick={t({ app: 'journals' })} />
      <Tile title="Trial Balance" icon={Scale} footer="Fiscal period 010/2026" onClick={t({ app: 'trialBalance' })} />
      <Tile title="Post Accruals" icon={Receipt} onClick={t({ app: 'postJournal', preset: 'accrual' })} />
      <Tile title="Manage Journal Entries" icon={BookOpen} onClick={t({ app: 'journals' })} />
    </Group>
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-11 shrink-0 bg-white flex items-end px-4 gap-1 border-b border-[#d9d9d9] shadow-[0_0.125rem_0.25rem_rgba(34,53,72,0.06)]">
        {SPACES.map((s) => (
          <button key={s} data-agent={`sap-space-${s.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setSpace(s)} className={`relative h-full px-3 text-[14px] ${space === s ? 'text-[#0064d9] font-bold' : 'text-[#1d2d3e] hover:text-[#0064d9]'}`}>
            {s}
            {space === s && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t bg-[#0064d9]" />}
          </button>
        ))}
        <Dropdown
          className="h-full"
          width={240}
          trigger={(_, toggle) => (
            <button onClick={toggle} aria-label="More" className="h-full px-3 text-[14px] text-[#1d2d3e] flex items-center"><MoreHorizontal className="w-4 h-4" /></button>
          )}
        >
          {(close) => (
            <>
              {SPACES.map((sp) => (
                <MenuItem key={sp} active={space === sp} onClick={() => { setSpace(sp); close() }}>{sp}</MenuItem>
              ))}
              <MenuSep />
              <MenuItem onClick={() => { close(); go({ app: 'appFinder' }) }}>App Finder</MenuItem>
            </>
          )}
        </Dropdown>
      </div>
      <div className="flex-1 overflow-auto px-12 py-6">
        {space === 'My Home' && <MyHome go={go} toPost={toPost} inApproval={inApproval} blocked={blocked} />}
        {space === 'Accounts Payable' && AP}
        {space === 'General Ledger' && GLs}
        {space === 'Procurement' && PROC}
        {space === 'Cash Management' && CASH}
        {space === 'Financial Close' && CLOSE}
      </div>
    </div>
  )
}

function MyHome({ go, toPost, inApproval, blocked }: { go: Go; toPost: number; inApproval: number; blocked: number }) {
  const [tab, setTab] = useState('Favorites')
  const apps: [string, any, string, SapRoute, string?][] = [
    ['Create Supplier Invoice', FilePlus2, '#0070f2', { app: 'createInvoice' }, 'sap-app-create-invoice'],
    ['Manage Supplier Invoices', FileText, '#7858ff', { app: 'invoices' }, 'sap-app-invoices'],
    ['Manage Purchase Orders', ClipboardList, '#df1278', { app: 'pos' }, 'sap-app-pos'],
    ['Display Supplier List', Users, '#07838f', { app: 'suppliers' }, 'sap-app-suppliers'],
    ['Manage Journal Entries', BookOpen, '#c35500', { app: 'journals' }, 'sap-app-journals'],
    ['Post General Journal Entries', PenLine, '#3c8cdd', { app: 'postJournal' }],
    ['Trial Balance', Scale, '#188918', { app: 'trialBalance' }],
    ['Manage Payment Blocks', Ban, '#aa0808', { app: 'paymentBlocks' }],
  ]
  const [prefs, setPrefs] = useState<{ todos: boolean; insights: boolean }>(() => {
    try {
      return { todos: true, insights: true, ...JSON.parse(localStorage.getItem('sap-myhome') ?? '{}') }
    } catch {
      return { todos: true, insights: true }
    }
  })
  const [editing, setEditing] = useState(false)
  const savePrefs = (p: { todos: boolean; insights: boolean }) => {
    setPrefs(p)
    try {
      localStorage.setItem('sap-myhome', JSON.stringify(p))
    } catch {
      /* storage unavailable */
    }
  }
  const recent = recentApps()
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="max-w-[1320px]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[16px] font-bold" style={{ background: '#5d36ff' }}>AM</div>
        <div>
          <div className="text-[24px] font-bold text-[#1d2d3e] leading-tight">{greeting}, {ME.first}</div>
          <div className="text-[14px] text-[#556b82]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div className="flex-1" />
        <button onClick={() => setEditing((e) => !e)} className={`h-9 px-3 rounded-lg text-[14px] font-semibold text-[#0064d9] hover:bg-[#eaecee] flex items-center gap-1.5 ${editing ? 'bg-[#e1f4ff]' : ''}`}><Pencil className="w-4 h-4" /> Edit My Home</button>
      </div>
      {editing && (
        <div className="mb-6 bg-white rounded-2xl p-4 shadow-[0_0_0.125rem_rgba(34,53,72,0.15),0_0.125rem_0.5rem_rgba(34,53,72,0.15)] flex items-center gap-6 text-[14px]">
          <span className="font-bold">Sections</span>
          <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 accent-[#0064d9]" checked={prefs.todos} onChange={(e) => savePrefs({ ...prefs, todos: e.target.checked })} /> To-Dos</label>
          <label className="flex items-center gap-2 opacity-60"><input type="checkbox" className="w-4 h-4 accent-[#0064d9]" checked readOnly /> Apps</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 accent-[#0064d9]" checked={prefs.insights} onChange={(e) => savePrefs({ ...prefs, insights: e.target.checked })} /> Insights</label>
          <div className="flex-1" />
          <button onClick={() => savePrefs({ todos: true, insights: true })} className="h-8 px-3 rounded-lg font-semibold text-[#0064d9] hover:bg-[#eaecee]">Reset</button>
          <button onClick={() => setEditing(false)} className="h-8 px-3 rounded-lg font-semibold text-white bg-[#0070f2] hover:bg-[#0064d9]">Done</button>
        </div>
      )}

      {prefs.todos && <div className="text-[20px] font-bold mb-3">To-Dos</div>}
      {prefs.todos && <div className="flex gap-4 mb-8">
        {[
          ['Supplier invoices waiting to be posted', `${toPost} invoices`, 'Accounts Payable · High', '#e76500', { app: 'invoices' } as SapRoute],
          ['Release purchase orders', `${inApproval} purchase orders`, 'Procurement · Medium', '#0064d9', { app: 'pos', status: 'In Approval' } as SapRoute],
          ['Invoices blocked for payment', `${blocked} invoices`, 'Price variance > 5%', '#aa0808', { app: 'paymentBlocks' } as SapRoute],
          ['Verify general journal entries', '4 journal entries', 'Submitted by Sofia Martinez', '#7858ff', { app: 'journals' } as SapRoute],
        ].map(([a, b, c, col, r]: any) => (
          <button key={a} onClick={() => go(r)} className={`w-[300px] h-[128px] bg-white rounded-2xl ${tileShadow} p-4 text-left flex flex-col`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: col }} />
              <span className="text-[12px] font-semibold text-[#556b82] uppercase tracking-wide">Task</span>
            </div>
            <div className="text-[14px] font-bold mt-2 leading-tight">{a}</div>
            <div className="text-[14px] text-[#556b82] mt-0.5">{c}</div>
            <div className="flex-1" />
            <div className="flex items-center text-[14px] font-semibold text-[#0064d9]">{b} <ChevronRight className="w-4 h-4 ml-auto" /></div>
          </button>
        ))}
      </div>}

      <div className="flex items-center gap-6 mb-3">
        <div className="text-[20px] font-bold">Apps</div>
        <div className="flex gap-1">
          {['Favorites', 'Most Used', 'Recently Used', 'Recommended'].map((x) => (
            <button key={x} onClick={() => setTab(x)} className={`relative h-9 px-3 text-[14px] ${tab === x ? 'text-[#0064d9] font-bold' : 'text-[#1d2d3e]'}`}>
              {x}
              {tab === x && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t bg-[#0064d9]" />}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {(tab === 'Recently Used' ? (recent.length ? recent.map((a) => [a.name, a.icon, a.color, a.route] as (typeof apps)[number]) : apps.slice(0, 5).reverse()) : tab === 'Recommended' ? apps.slice(3) : tab === 'Most Used' ? [...apps.slice(0, 3), ...apps.slice(4, 6), apps[3], ...apps.slice(6)] : apps).map(([name, I, col, r, agent]) => (
          <button key={name} data-agent={agent} aria-label={name} onClick={() => go(r)} className={`h-[72px] bg-white rounded-2xl ${tileShadow} px-4 flex items-center gap-3 text-left`}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: col }}>
              <I className="w-5 h-5 text-white" />
            </span>
            <span className="text-[14px] font-bold leading-tight">{name}</span>
          </button>
        ))}
      </div>

      {prefs.insights && <div className="text-[20px] font-bold mb-3">Insights</div>}
      {prefs.insights && <div className="flex flex-wrap gap-4">
        <Tile agent="sap-home-to-post" title="Supplier Invoices to Post" subtitle="Company Code 1010" kpi={{ value: String(toPost), color: '#e76500' }} footer="Received in last 7 days" onClick={() => go({ app: 'invoices' })} />
        <Tile title="Overdue Payables" subtitle="Northwind Global Inc." kpi={{ value: '1.2', unit: 'M USD', color: '#aa0808', arrow: 'up' }} footer="As of today" onClick={() => go({ app: 'invoices' })} />
        <Tile title="Days Payable Outstanding" subtitle="Indirect DPO" kpi={{ value: '38.4', unit: 'Days', color: '#256f3a', arrow: 'up' }} footer="Last 12 months" onClick={() => go({ app: 'invoices' })} />
        <Tile title="Purchase Order Spend" subtitle="Year to date" kpi={{ value: '14.8', unit: 'M USD', arrow: 'up', color: '#1d2d3e' }} footer="vs. 13.1M last year" onClick={() => go({ app: 'pos' })} />
        <Tile title="Cash Position" subtitle="All bank accounts" kpi={{ value: '28.6', unit: 'M USD', color: '#256f3a' }} footer="Today, 9:00 AM" onClick={() => go({ app: 'journals' })} />
        <Tile title="Closing Tasks Completed" subtitle="Period 010/2026" kpi={{ value: '72', unit: '%', color: '#0064d9', arrow: 'up' }} footer="42 of 58 tasks" onClick={() => go({ app: 'journals' })} />
      </div>}
    </div>
  )
}
