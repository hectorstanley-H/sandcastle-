import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Search, ShoppingCart, Bell, HelpCircle, ChevronDown, Laptop, Monitor, Keyboard, Mouse, Headphones, Smartphone, FileText, PenLine, NotebookPen, Armchair,
  Table2, Coffee, IdCard, Printer, Presentation, Usb, AppWindow, Package, CheckCircle2, Clock, Circle, XCircle, ArrowRight, Trash2, ExternalLink, Star, FileCheck2,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection, useRecord } from '@/db/db'
import { ME, person } from '@/data/people'
import { isoDate } from '@/data/time'

const NAVY = '#0b2d5b'
const BLUE = '#1a6ebd'
const $ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '')

const IMG: Record<string, [any, string]> = {
  laptop: [Laptop, '#e8f0fb'], monitor: [Monitor, '#eaf6f0'], dock: [Usb, '#f1eefb'], keyboard: [Keyboard, '#fdf1e7'], headset: [Headphones, '#e8f6fb'],
  mouse: [Mouse, '#f4f4f4'], phone: [Smartphone, '#eef1f6'], paper: [FileText, '#fbfaf0'], pen: [PenLine, '#eef1f6'], notebook: [NotebookPen, '#f4f4f4'],
  chair: [Armchair, '#f1eefb'], desk: [Table2, '#fdf1e7'], coffee: [Coffee, '#f6eee8'], badge: [IdCard, '#e8f0fb'], toner: [Printer, '#f4f4f4'],
  board: [Presentation, '#eaf6f0'], software: [AppWindow, '#e8f0fb'],
}
function ProductImg({ kind, size = 120 }: { kind: string; size?: number }) {
  const [I, bg] = IMG[kind] ?? [Package, '#f4f4f4']
  return (
    <div className="rounded-md flex items-center justify-center shrink-0" style={{ width: size, height: size * 0.8, background: bg }}>
      <I style={{ width: size * 0.42, height: size * 0.42 }} className="text-[#3d4f66]" strokeWidth={1.2} />
    </div>
  )
}

function Btn({ primary, children, className = '', ...rest }: any) {
  return (
    <button className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[14px] font-semibold border disabled:opacity-40 ${primary ? 'text-white border-transparent hover:brightness-110' : 'bg-white text-[#1a6ebd] border-[#1a6ebd] hover:bg-[#eef5fc]'} ${className}`} style={primary ? { background: BLUE } : undefined} {...rest}>
      {children}
    </button>
  )
}
const inputCls = 'w-full h-9 rounded border border-[#b8c2cc] bg-white px-2.5 text-[14px] outline-none focus:border-[#1a6ebd] focus:shadow-[0_0_0_2px_#1a6ebd33]'
function Row({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-4 py-2">
      <div className="text-[14px] text-[#4a5a6a] pt-2 text-right">{required && <span className="text-[#c8102e]">* </span>}{label}</div>
      <div>{children}</div>
    </div>
  )
}

function StatusPill({ s }: { s: string }) {
  const m: Record<string, string> = { 'Pending Approval': '#b45f06', Approved: '#2e7d32', Ordered: '#1a6ebd', Rejected: '#c8102e', Draft: '#5f6b7a', Paid: '#2e7d32', Disputed: '#c8102e', 'Pending Receipt': '#b45f06' }
  const c = m[s] ?? '#5f6b7a'
  return <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold" style={{ color: c, background: c + '18' }}>{s}</span>
}

function HW() {
  return <span className="inline-flex items-center gap-1 h-5 pl-0.5 pr-2 rounded-full text-[11px] font-semibold text-white" style={{ background: '#430693', fontFamily: 'var(--font-brand)' }}><img src={logoUrl('hworker')} className="w-4 h-4 rounded-full" alt="" /> H-Worker</span>
}

export function approvalChain(commodity: string, total: number) {
  const chain = [{ name: person('priya').name, role: 'Cost Center Owner (6105)', status: 'pending' }]
  if (commodity === 'IT Hardware' || commodity === 'Software') chain.push({ name: person('grace').name, role: 'IT Commodity Approver', status: 'waiting' })
  if (total > 5000) chain.push({ name: person('sofia').name, role: 'Finance (> $5,000)', status: 'waiting' })
  if (total > 25000) chain.push({ name: person('marcus').name, role: 'CFO (> $25,000)', status: 'waiting' })
  return chain
}

function Chain({ steps, submitter }: { steps: any[]; submitter?: string }) {
  const all = [{ name: submitter ?? ME.name, role: 'Requester', status: 'done' }, ...steps]
  return (
    <div className="flex items-start" data-agent="coupa-approval-chain">
      {all.map((s, i) => (
        <div key={i} className="flex items-start">
          <div className="w-[150px] flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-semibold" style={{ background: ['#1a6ebd', '#7a4fbf', '#0f8a6b', '#c0571a', '#a0303a'][i % 5] }}>
                {s.name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}
              </div>
              <span className="absolute -right-1 -bottom-1 bg-white rounded-full">
                {s.status === 'done' || s.status === 'approved' ? <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" /> : s.status === 'pending' ? <Clock className="w-5 h-5 text-[#b45f06]" /> : s.status === 'rejected' ? <XCircle className="w-5 h-5 text-[#c8102e]" /> : <Circle className="w-5 h-5 text-[#b8c2cc]" />}
              </span>
            </div>
            <div className="text-[13px] font-semibold mt-2">{s.name}</div>
            <div className="text-[12px] text-[#5f6b7a] leading-tight">{s.role}</div>
            <div className="text-[11px] mt-0.5" style={{ color: s.status === 'pending' ? '#b45f06' : '#5f6b7a' }}>{s.status === 'done' ? 'Submitted' : s.status === 'approved' ? 'Approved' : s.status === 'pending' ? 'Pending approval' : s.status === 'rejected' ? 'Rejected' : 'Not yet notified'}</div>
          </div>
          {i < all.length - 1 && <ArrowRight className="w-5 h-5 text-[#b8c2cc] mt-3.5 -mx-3" />}
        </div>
      ))}
    </div>
  )
}

type View = { v: 'home' } | { v: 'search'; q: string; supplier?: string } | { v: 'item'; id: string } | { v: 'cart' } | { v: 'checkout' } | { v: 'req'; id: string } | { v: 'reqs' } | { v: 'approvals' } | { v: 'invoices' }
type CartLine = { itemId: string; qty: number }

const PUNCHOUTS = [
  ['Dell Technologies', 'DELL', '#007db8', 'Dell Premier'],
  ['CDW', 'CDW', '#cc0000', 'CDW·G'],
  ['Staples', 'STAPLES', '#cc0000', 'Staples Advantage'],
  ['Amazon Business', 'amazon business', '#232f3e', 'Amazon Business'],
  ['Grainger', 'GRAINGER', '#d3001c', 'Grainger'],
  ['Insight', 'insight', '#d6001c', 'Insight'],
]

export default function Coupa({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const { isAgent } = useDesk()
  const catalog = useCollection<any>('coupa.catalog')
  const reqs = useCollection<any>('coupa.requisitions')
  const [view, setView] = useState<View>({ v: 'home' })
  const [cart, setCart] = useState<CartLine[]>([])
  const [q, setQ] = useState('')
  const [qty, setQty] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  // checkout form
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (params?.requisitionId) setView({ v: 'req', id: params.requisitionId })
    else if (params?.view) setView({ v: params.view } as any)
  }, [win.nonce])

  useEffect(() => {
    const base = 'https://northwind.coupahost.com'
    const m: Record<string, [string, string]> = {
      home: ['/', 'Home | Coupa'],
      search: [`/order_lines/search?q=${encodeURIComponent((view as any).q ?? '')}`, 'Search Results | Coupa'],
      item: [`/catalog_items/${(view as any).id?.replace('cpi-', '')}`, 'Item Details | Coupa'],
      cart: ['/carts/current', 'Cart | Coupa'],
      checkout: ['/requisition_headers/checkout', 'Checkout | Coupa'],
      req: [`/requisition_headers/${(view as any).id?.replace('creq-', '')}`, `Requisition #${(view as any).id?.replace('creq-', '')} | Coupa`],
      reqs: ['/requisition_headers', 'Requisitions | Coupa'],
      approvals: ['/approvals', 'Approvals | Coupa'],
      invoices: ['/invoices', 'Invoices | Coupa'],
    }
    const [u, t] = m[view.v]
    setUrl(base + u)
    setTitle(t)
  }, [view])

  const flash = (t: string) => {
    setToast(t)
    setTimeout(() => setToast(null), 2600)
  }
  const add = (id: string, n?: number) => {
    const count = n ?? (Number(qty[id]) || 1)
    setCart((c) => (c.some((l) => l.itemId === id) ? c.map((l) => (l.itemId === id ? { ...l, qty: l.qty + count } : l)) : [...c, { itemId: id, qty: count }]))
    const it = catalog.find((x) => x.id === id)
    flash(`Added ${count} × ${it?.name.split(' — ')[0]} to cart`)
  }
  const cartLines = cart.map((l) => ({ ...l, item: catalog.find((x) => x.id === l.itemId)! })).filter((l) => l.item)
  const cartTotal = cartLines.reduce((t, l) => t + l.qty * l.item.price, 0)
  const doSearch = (term: string, supplier?: string) => setView({ v: 'search', q: term, supplier })

  const startCheckout = () => {
    setForm({
      title: '',
      shipTo: 'Northwind Global — Boston HQ, 1 Federal St, Boston, MA 02110',
      needBy: isoDate(new Date(Date.now() + 10 * 86400000)),
      commodity: cartLines[0]?.item.commodity ?? 'IT Hardware',
      costCenter: '6105 — Operations',
      justification: '',
      onBehalf: '',
    })
    setView({ v: 'checkout' })
  }
  const nextNum = () => String(reqs.reduce((m, r) => Math.max(m, Number(r.number) || 0), 4800) + 1)

  const submit = () => {
    const number = nextNum()
    const id = `creq-${number}`
    const lines = cartLines.map((l) => ({ itemId: l.itemId, name: l.item.name, supplier: l.item.supplier, qty: l.qty, price: l.item.price, unit: l.item.unit }))
    const total = Math.round(cartTotal * 100) / 100
    db.insert('coupa.requisitions', {
      id,
      number,
      title: form.title || lines[0]?.name,
      requestedBy: ME.name,
      onBehalfOf: form.onBehalf,
      shipTo: form.shipTo,
      needBy: form.needBy,
      commodity: form.commodity,
      costCenter: form.costCenter,
      justification: form.justification,
      lines,
      total,
      status: 'Pending Approval',
      submittedAt: new Date().toISOString(),
      approvals: approvalChain(form.commodity, total),
      createdBy: isAgent ? 'hworker' : undefined,
    }, { prepend: true })
    setCart([])
    setView({ v: 'req', id })
  }

  const tabs: [string, View['v'], string][] = [['Home', 'home', 'coupa-tab-home'], ['Shop', 'search', 'coupa-tab-shop'], ['Requisitions', 'reqs', 'coupa-tab-requisitions'], ['Approvals', 'approvals', 'coupa-tab-approvals'], ['Invoices', 'invoices', 'coupa-tab-invoices']]
  const pendingMine = reqs.filter((r) => r.status === 'Pending Approval').length

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-[#f3f5f8]" style={{ fontFamily: "'Open Sans', 'Inter', sans-serif", color: '#1f2d3d' }}>
      {/* header */}
      <div className="h-[58px] shrink-0 flex items-center px-5 gap-5 text-white" style={{ background: NAVY }}>
        <button onClick={() => setView({ v: 'home' })} className="flex items-center gap-2" aria-label="Coupa home">
          <img src={logoUrl('coupa-wordmark')} className="h-[26px]" alt="coupa" />
        </button>
        <div className="h-7 w-px bg-white/25" />
        <span className="text-[14px] font-semibold tracking-wide opacity-90">Northwind Global</span>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center w-full max-w-[560px] h-9 rounded-full bg-white text-[#1f2d3d] px-4 gap-2">
            <Search className="w-4 h-4 text-[#5f6b7a]" />
            <input data-agent="coupa-search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch(q)} placeholder="Search for products, services, suppliers…" className="flex-1 bg-transparent outline-none text-[14px]" />
          </div>
        </div>
        <button className="relative" aria-label="Notifications"><Bell className="w-5 h-5" /><span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#f2a900] text-[10px] font-bold text-[#0b2d5b] flex items-center justify-center">5</span></button>
        <button className="" aria-label="Help"><HelpCircle className="w-5 h-5" /></button>
        <button data-agent="coupa-cart" aria-label="Cart" onClick={() => setView({ v: 'cart' })} className="relative flex items-center gap-1.5 text-[14px] font-semibold">
          <ShoppingCart className="w-5 h-5" /> Cart
          {cart.length > 0 && <span className="absolute -top-1.5 left-3 min-w-[16px] h-4 px-1 rounded-full bg-[#f2a900] text-[10px] font-bold text-[#0b2d5b] flex items-center justify-center">{cart.reduce((t, l) => t + l.qty, 0)}</span>}
        </button>
        <button className="flex items-center gap-2 text-[14px]">
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[12px] font-bold">AM</span> Alex Morgan <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <div className="h-11 shrink-0 bg-white border-b border-[#d8dee6] flex items-end px-5 gap-1">
        {tabs.map(([l, v, ag]) => {
          const act = view.v === v || (v === 'search' && ['item', 'cart', 'checkout'].includes(view.v)) || (v === 'reqs' && view.v === 'req')
          return (
            <button key={l} data-agent={ag} onClick={() => (v === 'search' ? doSearch('') : setView({ v } as any))} className={`relative h-full px-4 text-[14px] ${act ? 'font-bold text-[#0b2d5b]' : 'text-[#4a5a6a] hover:text-[#0b2d5b]'}`}>
              {l}
              {v === 'approvals' && pendingMine > 0 && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#c8102e] text-white text-[11px]">{pendingMine}</span>}
              {act && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t" style={{ background: BLUE }} />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {view.v === 'home' && (
          <div className="max-w-[1240px] mx-auto px-6 py-6">
            <div className="rounded-xl p-8 text-white mb-6" style={{ background: `linear-gradient(110deg, ${NAVY}, #1a6ebd)` }}>
              <div className="text-[26px] font-semibold">What do you need today, {ME.first}?</div>
              <div className="text-[14px] opacity-80 mt-1">Shop catalogs and punchouts with Northwind contract pricing, or submit a request.</div>
              <div className="mt-5 flex items-center max-w-[720px] h-11 rounded-full bg-white text-[#1f2d3d] px-4 gap-2">
                <Search className="w-5 h-5 text-[#5f6b7a]" />
                <input data-agent="coupa-home-search" aria-label="What do you need?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch(q)} className="flex-1 outline-none text-[15px] bg-transparent" placeholder="Search for laptops, office supplies, services…" />
                <button onClick={() => doSearch(q)} className="h-8 px-4 rounded-full text-white text-[13px] font-semibold" style={{ background: BLUE }}>Search</button>
              </div>
            </div>
            <div className="text-[17px] font-bold mb-3">Punchouts</div>
            <div className="grid grid-cols-6 gap-4 mb-8">
              {PUNCHOUTS.map(([sup, word, col, label]) => (
                <button key={sup} data-agent={`coupa-punchout-${word.toLowerCase().split(' ')[0]}`} onClick={() => doSearch('', sup)} className="h-[110px] bg-white rounded-lg border border-[#d8dee6] hover:shadow-md flex flex-col items-center justify-center gap-2">
                  <span className="text-[22px] font-black tracking-tight" style={{ color: col, fontFamily: 'Arial, sans-serif' }}>{word}</span>
                  <span className="text-[12px] text-[#5f6b7a] flex items-center gap-1">{label} <ExternalLink className="w-3 h-3" /></span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_360px] gap-6">
              <div>
                <div className="text-[17px] font-bold mb-3">Popular with your team</div>
                <div className="grid grid-cols-3 gap-4">
                  {catalog.filter((c) => c.contract).slice(0, 9).map((c) => (
                    <div key={c.id} className="bg-white rounded-lg border border-[#d8dee6] p-4 flex flex-col">
                      <button onClick={() => setView({ v: 'item', id: c.id })} className="self-center"><ProductImg kind={c.img} size={150} /></button>
                      <button onClick={() => setView({ v: 'item', id: c.id })} className="text-left text-[13.5px] font-semibold mt-3 leading-snug line-clamp-2 text-[#1a6ebd] hover:underline">{c.name}</button>
                      <div className="text-[12px] text-[#5f6b7a] mt-0.5">{c.supplier}</div>
                      <div className="flex items-center mt-2">
                        <span className="text-[16px] font-bold">{$(c.price)}</span><span className="text-[12px] text-[#5f6b7a] ml-1">/ {c.unit}</span>
                        <div className="flex-1" />
                        <button onClick={() => add(c.id, 1)} className="h-7 px-3 rounded-full text-[12px] font-semibold text-white" style={{ background: BLUE }}>Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-[#d8dee6]">
                  <div className="px-4 h-11 flex items-center font-bold text-[15px] border-b border-[#e6ebf0]">My Requisitions</div>
                  {reqs.slice(0, 6).map((r) => (
                    <button key={r.id} onClick={() => setView({ v: 'req', id: r.id })} className="w-full px-4 py-2.5 border-b border-[#f0f2f5] text-left hover:bg-[#f7f9fb]">
                      <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-[#1a6ebd]">#{r.number}</span><span className="text-[13px] truncate flex-1">{r.title}</span></div>
                      <div className="flex items-center gap-2 mt-1"><StatusPill s={r.status} /><span className="text-[12px] text-[#5f6b7a]">{$(r.total)}</span></div>
                    </button>
                  ))}
                </div>
                <div className="bg-white rounded-lg border border-[#d8dee6] p-4">
                  <div className="font-bold text-[15px] mb-2">Forms</div>
                  {['Request a new supplier', 'Software access request', 'Professional services SOW', 'Contractor onboarding', 'Event & sponsorship request'].map((f) => (
                    <div key={f} className="flex items-center gap-2 py-1.5 text-[13.5px] text-[#1a6ebd]"><FileCheck2 className="w-4 h-4" /> {f}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view.v === 'search' && (() => {
          const term = view.q.toLowerCase()
          const words = term.split(/\s+/).filter(Boolean)
          const res = catalog.filter((c) => (!view.supplier || c.supplier === view.supplier) && words.every((w) => (c.name + ' ' + c.supplier + ' ' + c.category + ' ' + c.partNumber).toLowerCase().includes(w)))
          return (
            <div className="max-w-[1240px] mx-auto px-6 py-5 grid grid-cols-[220px_1fr] gap-6">
              <div className="bg-white rounded-lg border border-[#d8dee6] p-4 h-fit text-[13.5px]">
                <div className="font-bold mb-2">Filter results</div>
                <div className="text-[12px] font-semibold uppercase text-[#5f6b7a] mt-3 mb-1">Supplier</div>
                {[...new Set(catalog.map((c) => c.supplier))].map((s) => (
                  <label key={s} className="flex items-center gap-2 py-1"><input type="checkbox" readOnly checked={view.supplier === s} onClick={() => doSearch(view.q, view.supplier === s ? undefined : s)} className="accent-[#1a6ebd]" /> {s}</label>
                ))}
                <div className="text-[12px] font-semibold uppercase text-[#5f6b7a] mt-3 mb-1">Contract</div>
                <label className="flex items-center gap-2 py-1"><input type="checkbox" className="accent-[#1a6ebd]" /> On contract only</label>
              </div>
              <div>
                {view.supplier && (
                  <div className="mb-4 rounded-lg border border-[#b9d4ee] bg-[#eef5fc] px-4 py-3 text-[13.5px] flex items-center gap-2"><ExternalLink className="w-4 h-4 text-[#1a6ebd]" /> Punched out to <b>{view.supplier}</b> — Northwind contract pricing applied. Items return to your Coupa cart.</div>
                )}
                <div className="text-[15px] mb-3"><b>{res.length}</b> results {view.q && <>for “<b>{view.q}</b>”</>}</div>
                <div className="space-y-3">
                  {res.map((c) => (
                    <div key={c.id} data-agent={`coupa-result-${c.id}`} className="bg-white rounded-lg border border-[#d8dee6] p-4 flex gap-4">
                      <button onClick={() => setView({ v: 'item', id: c.id })}><ProductImg kind={c.img} size={110} /></button>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => setView({ v: 'item', id: c.id })} className="text-left text-[15px] font-semibold text-[#1a6ebd] hover:underline leading-snug">{c.name}</button>
                        <div className="text-[13px] text-[#5f6b7a] mt-1">{c.supplier} · Part # {c.partNumber} · {c.category}</div>
                        <div className="text-[13px] text-[#5f6b7a]">Lead time: {c.leadTime}</div>
                        {c.contract && <div className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#2e7d32]"><Star className="w-3.5 h-3.5 fill-[#2e7d32]" /> Preferred · On contract</div>}
                      </div>
                      <div className="w-[200px] flex flex-col items-end gap-2">
                        <div className="text-[20px] font-bold">{$(c.price)}<span className="text-[12px] font-normal text-[#5f6b7a]"> / {c.unit}</span></div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[#5f6b7a]">Qty</span>
                          <input data-agent={`coupa-qty-${c.id}`} aria-label="Quantity" value={qty[c.id] ?? '1'} onChange={(e) => setQty({ ...qty, [c.id]: e.target.value })} className="w-14 h-8 rounded border border-[#b8c2cc] px-2 text-[14px] text-center outline-none" />
                        </div>
                        <Btn primary data-agent={`coupa-add-${c.id}`} onClick={() => add(c.id)}><ShoppingCart className="w-4 h-4" /> Add to Cart</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {view.v === 'item' && (() => {
          const c = catalog.find((x) => x.id === view.id)
          if (!c) return null
          return (
            <div className="max-w-[1100px] mx-auto px-6 py-6">
              <button onClick={() => doSearch('')} className="text-[13px] text-[#1a6ebd] hover:underline mb-3">← Back to results</button>
              <div className="bg-white rounded-lg border border-[#d8dee6] p-6 flex gap-8">
                <ProductImg kind={c.img} size={320} />
                <div className="flex-1">
                  <div className="text-[22px] font-semibold leading-snug">{c.name}</div>
                  <div className="text-[14px] text-[#5f6b7a] mt-1">Sold by <span className="text-[#1a6ebd]">{c.supplier}</span> · Part # {c.partNumber}</div>
                  {c.contract && <div className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2e7d32]"><Star className="w-4 h-4 fill-[#2e7d32]" /> Preferred supplier · Contract NWG-{c.supplier.slice(0, 3).toUpperCase()}-2026</div>}
                  <div className="text-[28px] font-bold mt-4">{$(c.price)} <span className="text-[14px] font-normal text-[#5f6b7a]">per {c.unit}</span></div>
                  <div className="text-[14px] mt-3 leading-relaxed text-[#3d4f66]">{c.description}</div>
                  <div className="grid grid-cols-2 gap-y-1 mt-4 text-[13.5px] max-w-[420px]">
                    <span className="text-[#5f6b7a]">Commodity</span><span>{c.commodity}</span>
                    <span className="text-[#5f6b7a]">Category</span><span>{c.category}</span>
                    <span className="text-[#5f6b7a]">Lead time</span><span>{c.leadTime}</span>
                    <span className="text-[#5f6b7a]">UNSPSC</span><span>43211503</span>
                  </div>
                  <div className="flex items-center gap-3 mt-6">
                    <input aria-label="Quantity" value={qty[c.id] ?? '1'} onChange={(e) => setQty({ ...qty, [c.id]: e.target.value })} className="w-16 h-9 rounded border border-[#b8c2cc] px-2 text-center outline-none" />
                    <Btn primary onClick={() => add(c.id)}><ShoppingCart className="w-4 h-4" /> Add to Cart</Btn>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {view.v === 'cart' && (
          <div className="max-w-[1100px] mx-auto px-6 py-6">
            <div className="text-[22px] font-semibold mb-4">Cart</div>
            <div className="bg-white rounded-lg border border-[#d8dee6]">
              {cartLines.length === 0 && <div className="p-10 text-center text-[14px] text-[#5f6b7a]">Your cart is empty. <button className="text-[#1a6ebd] hover:underline" onClick={() => setView({ v: 'home' })}>Continue shopping</button></div>}
              {cartLines.map((l) => (
                <div key={l.itemId} data-agent={`coupa-cart-line-${l.itemId}`} className="flex items-center gap-4 p-4 border-b border-[#eef1f4]">
                  <ProductImg kind={l.item.img} size={80} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold">{l.item.name}</div>
                    <div className="text-[12.5px] text-[#5f6b7a]">{l.item.supplier} · {$(l.item.price)} / {l.item.unit}</div>
                  </div>
                  <input aria-label="Quantity" value={l.qty} onChange={(e) => setCart((c) => c.map((x) => (x.itemId === l.itemId ? { ...x, qty: Number(e.target.value) || 0 } : x)))} className="w-16 h-8 rounded border border-[#b8c2cc] text-center outline-none" />
                  <div className="w-[120px] text-right font-bold">{$(l.qty * l.item.price)}</div>
                  <button onClick={() => setCart((c) => c.filter((x) => x.itemId !== l.itemId))} className="text-[#5f6b7a] hover:text-[#c8102e]" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {cartLines.length > 0 && (
                <div className="flex items-center p-4 gap-4">
                  <div className="flex-1 text-[14px] text-[#5f6b7a]">{cartLines.length} line(s)</div>
                  <div className="text-[18px]">Total <b data-agent="coupa-cart-total">{$(cartTotal)}</b> USD</div>
                  <Btn primary data-agent="coupa-checkout" onClick={startCheckout}>Checkout</Btn>
                </div>
              )}
            </div>
          </div>
        )}

        {view.v === 'checkout' && (
          <div className="max-w-[1240px] mx-auto px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[22px] font-semibold">Requisition #{nextNum()}</div>
              <StatusPill s="Draft" />
            </div>
            <div className="grid grid-cols-[1fr_380px] gap-6">
              <div className="space-y-5">
                <div className="bg-white rounded-lg border border-[#d8dee6] p-5">
                  <div className="text-[16px] font-bold mb-2">General Info</div>
                  <Row label="Requested by"><div className="pt-2 text-[14px]">{ME.name} ({ME.email})</div></Row>
                  <Row label="On behalf of"><input data-agent="coupa-req-onbehalf" aria-label="On behalf of" className={inputCls} value={form.onBehalf} onChange={(e) => setForm({ ...form, onBehalf: e.target.value })} placeholder="Optional" /></Row>
                  <Row label="Requisition title" required><input data-agent="coupa-req-title" aria-label="Requisition title" className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Row>
                  <Row label="Ship-to address" required>
                    <select data-agent="coupa-req-shipto" aria-label="Ship-to address" className={inputCls} value={form.shipTo} onChange={(e) => setForm({ ...form, shipTo: e.target.value })}>
                      <option>Northwind Global — Boston HQ, 1 Federal St, Boston, MA 02110</option>
                      <option>Northwind Global — Chicago Office, 161 N Clark St, Chicago, IL 60601</option>
                      <option>Northwind Global — Austin IT Depot, 500 W 2nd St, Austin, TX 78701</option>
                    </select>
                  </Row>
                  <Row label="Need-by date" required><input data-agent="coupa-req-needby" type="date" aria-label="Need-by date" className={inputCls + ' max-w-[220px]'} value={form.needBy} onChange={(e) => setForm({ ...form, needBy: e.target.value })} /></Row>
                  <Row label="Commodity" required>
                    <select data-agent="coupa-req-commodity" aria-label="Commodity" className={inputCls} value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })}>
                      {['IT Hardware', 'Software', 'Office Supplies', 'Facilities', 'Professional Services'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Row>
                  <Row label="Justification" required><textarea data-agent="coupa-req-justification" aria-label="Justification" className={`${inputCls} h-24 py-2`} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} /></Row>
                </div>
                <div className="bg-white rounded-lg border border-[#d8dee6] p-5">
                  <div className="text-[16px] font-bold mb-2">Billing</div>
                  <Row label="Cost center" required>
                    <select data-agent="coupa-req-costcenter" aria-label="Cost center" className={inputCls} value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })}>
                      {['6105 — Operations', '4200 — IT Operations', '3100 — Marketing', '5200 — Customer Support', '7100 — Finance'].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Row>
                  <Row label="Account"><div className="pt-2 text-[14px]">NWG-US-1010-{form.costCenter?.slice(0, 4)}-1640 (Computer Equipment)</div></Row>
                </div>
                <div className="bg-white rounded-lg border border-[#d8dee6]">
                  <div className="px-5 h-12 flex items-center text-[16px] font-bold border-b border-[#eef1f4]">Lines</div>
                  <table className="w-full text-[13.5px]">
                    <thead><tr className="h-9 text-left text-[#5f6b7a] border-b border-[#eef1f4]"><th className="pl-5 font-semibold">#</th><th className="px-2 font-semibold">Item</th><th className="px-2 font-semibold">Supplier</th><th className="px-2 font-semibold text-right">Qty</th><th className="px-2 font-semibold text-right">Price</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
                    <tbody>
                      {cartLines.map((l, i) => (
                        <tr key={l.itemId} className="h-11 border-b border-[#f3f5f8]"><td className="pl-5">{i + 1}</td><td className="px-2">{l.item.name.split(' — ')[0]}</td><td className="px-2">{l.item.supplier}</td><td className="px-2 text-right">{l.qty}</td><td className="px-2 text-right">{$(l.item.price)}</td><td className="px-2 pr-5 text-right font-semibold">{$(l.qty * l.item.price)}</td></tr>
                      ))}
                      <tr className="h-11"><td colSpan={5} className="pl-5 text-right font-semibold pr-2">Total</td><td className="pr-5 text-right font-bold text-[15px]">{$(cartTotal)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-[#d8dee6] p-5">
                  <div className="text-[16px] font-bold mb-1">Approvals</div>
                  <div className="text-[13px] text-[#5f6b7a] mb-4">Based on commodity, cost center and total ({$(cartTotal)})</div>
                  <div className="space-y-3">
                    {approvalChain(form.commodity, cartTotal).map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#eef5fc] text-[#1a6ebd] text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
                        <div><div className="text-[14px] font-semibold">{s.name}</div><div className="text-[12px] text-[#5f6b7a]">{s.role}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#d8dee6] p-5 flex flex-col gap-2">
                  <Btn primary data-agent="coupa-req-submit" disabled={!cartLines.length || !form.justification} onClick={submit}>Submit for Approval</Btn>
                  <Btn>Save</Btn>
                  <button onClick={() => setView({ v: 'cart' })} className="text-[13px] text-[#1a6ebd] hover:underline mt-1">Back to cart</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view.v === 'req' && <ReqView id={view.id} />}

        {view.v === 'reqs' && (
          <div className="max-w-[1240px] mx-auto px-6 py-6">
            <div className="text-[22px] font-semibold mb-4">Requisitions</div>
            <div className="bg-white rounded-lg border border-[#d8dee6]">
              <table className="w-full text-[13.5px]">
                <thead><tr className="h-10 text-left text-[#5f6b7a] border-b border-[#e6ebf0]"><th className="pl-5 font-semibold">Req #</th><th className="px-2 font-semibold">Title</th><th className="px-2 font-semibold">Requested By</th><th className="px-2 font-semibold">Submitted</th><th className="px-2 font-semibold">Need By</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
                <tbody>
                  {reqs.map((r) => (
                    <tr key={r.id} data-agent={`coupa-req-row-${r.id}`} onClick={() => setView({ v: 'req', id: r.id })} className={`h-11 border-b border-[#f3f5f8] hover:bg-[#f7f9fb] ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
                      <td className="pl-5 text-[#1a6ebd] font-semibold">{r.number}</td><td className="px-2">{r.title} {r.createdBy === 'hworker' && <HW />}</td><td className="px-2">{r.requestedBy}</td><td className="px-2">{fd(r.submittedAt)}</td><td className="px-2">{fd(r.needBy + 'T12:00:00')}</td><td className="px-2"><StatusPill s={r.status} /></td><td className="px-2 pr-5 text-right font-semibold">{$(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {view.v === 'approvals' && (
          <div className="max-w-[1240px] mx-auto px-6 py-6">
            <div className="text-[22px] font-semibold mb-4">Approvals</div>
            <div className="bg-white rounded-lg border border-[#d8dee6]">
              {reqs.filter((r) => r.status === 'Pending Approval').map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3 border-b border-[#f3f5f8]">
                  <button onClick={() => setView({ v: 'req', id: r.id })} className="text-[#1a6ebd] font-semibold text-[14px]">Requisition #{r.number}</button>
                  <span className="text-[14px] flex-1">{r.title} · {r.requestedBy}</span>
                  <span className="text-[13px] text-[#5f6b7a]">Waiting on {r.approvals.find((a: any) => a.status === 'pending')?.name}</span>
                  <b className="w-[110px] text-right">{$(r.total)}</b>
                </div>
              ))}
            </div>
          </div>
        )}
        {view.v === 'invoices' && <Invoices />}
      </div>
      {toast && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#1f2d3d] text-white text-[14px] px-5 py-2.5 shadow-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#7ddc8a]" /> {toast}</div>}
    </div>
  )
}

function ReqView({ id }: { id: string }) {
  const r = useRecord<any>('coupa.requisitions', id)
  if (!r) return <div className="p-10">Requisition not found.</div>
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="text-[22px] font-semibold" data-agent="coupa-req-header">Requisition #{r.number}</div>
        <StatusPill s={r.status} />
        {r.createdBy === 'hworker' && <HW />}
      </div>
      <div className="text-[14px] text-[#5f6b7a] mb-5">{r.title} · Submitted {new Date(r.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{r.poNumber ? ` · ${r.poNumber}` : ''}</div>
      <div className={`bg-white rounded-lg border border-[#d8dee6] p-5 mb-5 ${r.createdBy === 'hworker' ? 'flash-new' : ''}`}>
        <div className="text-[16px] font-bold mb-4">Approval Chain</div>
        <Chain steps={r.approvals} submitter={r.requestedBy} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-lg border border-[#d8dee6] p-5 text-[14px]">
          <div className="text-[16px] font-bold mb-3">General Info</div>
          {[['Requested by', r.requestedBy], ['On behalf of', r.onBehalfOf || '—'], ['Ship-to', r.shipTo], ['Need-by date', fd(r.needBy + 'T12:00:00')], ['Commodity', r.commodity], ['Cost center', r.costCenter]].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] py-1.5"><span className="text-[#5f6b7a]">{k}</span><span>{v}</span></div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-[#d8dee6] p-5 text-[14px]">
          <div className="text-[16px] font-bold mb-3">Justification</div>
          <div className="whitespace-pre-wrap leading-relaxed">{r.justification || '—'}</div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#d8dee6] mt-5">
        <div className="px-5 h-12 flex items-center text-[16px] font-bold border-b border-[#eef1f4]">Lines</div>
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-9 text-left text-[#5f6b7a] border-b border-[#eef1f4]"><th className="pl-5 font-semibold">#</th><th className="px-2 font-semibold">Item</th><th className="px-2 font-semibold">Supplier</th><th className="px-2 font-semibold text-right">Qty</th><th className="px-2 font-semibold text-right">Price</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
          <tbody>
            {r.lines.map((l: any, i: number) => (
              <tr key={i} className="h-11 border-b border-[#f3f5f8]"><td className="pl-5">{i + 1}</td><td className="px-2">{l.name}</td><td className="px-2">{l.supplier}</td><td className="px-2 text-right">{l.qty}</td><td className="px-2 text-right">{$(l.price)}</td><td className="px-2 pr-5 text-right font-semibold">{$(l.qty * l.price)}</td></tr>
            ))}
            <tr className="h-11"><td colSpan={5} className="text-right font-semibold pr-2">Total</td><td className="pr-5 text-right font-bold text-[15px]" data-agent="coupa-req-total">{$(r.total)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Invoices() {
  const inv = useCollection<any>('coupa.invoices')
  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6">
      <div className="text-[22px] font-semibold mb-4">Invoices</div>
      <div className="bg-white rounded-lg border border-[#d8dee6]">
        <table className="w-full text-[13.5px]">
          <thead><tr className="h-10 text-left text-[#5f6b7a] border-b border-[#e6ebf0]"><th className="pl-5 font-semibold">Invoice #</th><th className="px-2 font-semibold">Supplier</th><th className="px-2 font-semibold">Invoice Date</th><th className="px-2 font-semibold">PO #</th><th className="px-2 font-semibold">Status</th><th className="px-2 pr-5 font-semibold text-right">Total</th></tr></thead>
          <tbody>
            {inv.map((r) => (
              <tr key={r.id} className="h-11 border-b border-[#f3f5f8]"><td className="pl-5 text-[#1a6ebd] font-semibold">{r.number}</td><td className="px-2">{r.supplier}</td><td className="px-2">{fd(r.date)}</td><td className="px-2">{r.poNumber}</td><td className="px-2"><StatusPill s={r.status} /></td><td className="px-2 pr-5 text-right font-semibold">{$(r.total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
