import { useEffect, useState } from 'react'
import { Search, ShoppingCart, Bell, HelpCircle, ChevronDown, CheckCircle2, Trash2, ExternalLink, Star, FileCheck2, User, LogOut, Repeat, BookOpen, LifeBuoy, Mail } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { db, useCollection, useRecord } from '@/db/db'
import { ME, person } from '@/data/people'
import { isoDate } from '@/data/time'
import { NAVY, BLUE, $, fd, ProductImg, Btn, inputCls, Row, StatusPill } from './ui'
import { approvalChain, buildNotifs, patchPrefs, PREFS_ID, FORMS, type View } from './data'
import { ReqView, ReqList, Approvals, Invoices, InvoiceView, Orders, POView, Suppliers, SupplierView, FormView, Profile } from './views'

export { approvalChain }

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
  const invoices = useCollection<any>('coupa.invoices')
  const prefs = useRecord<any>('coupa.prefs', PREFS_ID)
  const { close } = useWin()
  const [menu, setMenu] = useState<null | 'notif' | 'help' | 'user'>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contractOnly, setContractOnly] = useState(false)
  const [cats, setCats] = useState<string[]>([])
  const [sort, setSort] = useState('relevance')
  const [view, setView] = useState<View>({ v: 'home' })
  const [cart, setCart] = useState<CartLine[]>([])
  const [q, setQ] = useState('')
  const [qty, setQty] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  // checkout form
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (params?.requisitionId) setView({ v: 'req', id: params.requisitionId })
    else if (params?.invoiceId) setView({ v: 'invoice', id: params.invoiceId })
    else if (params?.poNumber) setView({ v: 'po', id: params.poNumber })
    else if (params?.supplier) setView({ v: 'supplier', name: params.supplier })
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
      invoice: [`/invoices/${(view as any).id?.replace('cinv-', '')}`, 'Invoice | Coupa'],
      orders: ['/order_headers', 'Purchase Orders | Coupa'],
      po: [`/order_headers/${(view as any).id?.replace('PO-', '')}`, `${(view as any).id} | Coupa`],
      suppliers: ['/suppliers', 'Suppliers | Coupa'],
      supplier: [`/suppliers/${encodeURIComponent((view as any).name ?? '')}`, `${(view as any).name} | Coupa`],
      form: [`/requests/new?form=${(view as any).form}`, 'Request | Coupa'],
      profile: ['/user/edit', 'My Profile | Coupa'],
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

  const go = (v: View) => {
    setMenu(null)
    setView(v)
  }
  const copyToCart = (lines: any[]) => {
    const ok = lines.filter((l) => catalog.some((c) => c.id === l.itemId))
    setCart(ok.map((l) => ({ itemId: l.itemId, qty: l.qty })))
    setEditingId(null)
    flash(`${ok.length} line(s) copied to your cart`)
    setView({ v: 'cart' })
  }
  const editReq = (r: any) => {
    setCart(r.lines.filter((l: any) => catalog.some((c) => c.id === l.itemId)).map((l: any) => ({ itemId: l.itemId, qty: l.qty })))
    setForm({ title: r.title ?? '', shipTo: r.shipTo, needBy: r.needBy, commodity: r.commodity, costCenter: r.costCenter, justification: r.justification ?? '', onBehalf: r.onBehalfOf ?? '' })
    setEditingId(r.id)
    setView({ v: 'checkout' })
  }
  const editing = editingId ? reqs.find((r) => r.id === editingId) : undefined

  const startCheckout = () => {
    setEditingId(null)
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

  const draftLines = () => cartLines.map((l) => ({ itemId: l.itemId, name: l.item.name, supplier: l.item.supplier, qty: l.qty, price: l.item.price, unit: l.item.unit }))
  const draftFields = () => ({ title: form.title || draftLines()[0]?.name, onBehalfOf: form.onBehalf, shipTo: form.shipTo, needBy: form.needBy, commodity: form.commodity, costCenter: form.costCenter, justification: form.justification, lines: draftLines(), total: Math.round(cartTotal * 100) / 100 })
  /** Save (draft) — keeps the requisition out of approval */
  const saveDraft = () => {
    if (editing) {
      db.update('coupa.requisitions', editing.id, (r) => ({ ...draftFields(), status: r.status === 'Pending Approval' ? r.status : 'Draft', history: [...(r.history ?? []), { at: new Date().toISOString(), who: ME.name, text: 'Draft saved' }] }))
      flash(`Requisition #${editing.number} saved`)
      setCart([])
      setEditingId(null)
      return setView({ v: 'req', id: editing.id })
    }
    const number = nextNum()
    const id = `creq-${number}`
    db.insert('coupa.requisitions', { id, number, requestedBy: ME.name, ...draftFields(), status: 'Draft', submittedAt: new Date().toISOString(), approvals: [], createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    flash(`Draft requisition #${number} saved`)
    setCart([])
    setView({ v: 'req', id })
  }
  const resubmit = () => {
    if (!editing) return
    const f = draftFields()
    db.update('coupa.requisitions', editing.id, (r) => ({ ...f, status: 'Pending Approval', submittedAt: new Date().toISOString(), approvals: approvalChain(f.commodity, f.total), poNumber: undefined, history: [...(r.history ?? []), { at: new Date().toISOString(), who: ME.name, text: 'Submitted for approval' }] }))
    setCart([])
    setEditingId(null)
    setView({ v: 'req', id: editing.id })
  }

  const submit = () => {
    if (editing) return resubmit()
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

  const tabs: [string, View['v'], string][] = [['Home', 'home', 'coupa-tab-home'], ['Shop', 'search', 'coupa-tab-shop'], ['Requisitions', 'reqs', 'coupa-tab-requisitions'], ['Approvals', 'approvals', 'coupa-tab-approvals'], ['Invoices', 'invoices', 'coupa-tab-invoices'], ['Orders', 'orders', 'coupa-tab-orders'], ['Suppliers', 'suppliers', 'coupa-tab-suppliers']]
  const notifs = buildNotifs(reqs, invoices)
  const read: string[] = prefs?.readNotifs ?? []
  const unread = notifs.filter((n) => !read.includes(n.id)).length
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
        <button data-agent="coupa-notifications" className="relative" aria-label="Notifications" onClick={() => setMenu(menu === 'notif' ? null : 'notif')}><Bell className="w-5 h-5" />{unread > 0 && <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#f2a900] text-[10px] font-bold text-[#0b2d5b] flex items-center justify-center">{unread}</span>}</button>
        <button data-agent="coupa-help" className="" aria-label="Help" onClick={() => setMenu(menu === 'help' ? null : 'help')}><HelpCircle className="w-5 h-5" /></button>
        <button data-agent="coupa-cart" aria-label="Cart" onClick={() => setView({ v: 'cart' })} className="relative flex items-center gap-1.5 text-[14px] font-semibold">
          <ShoppingCart className="w-5 h-5" /> Cart
          {cart.length > 0 && <span className="absolute -top-1.5 left-3 min-w-[16px] h-4 px-1 rounded-full bg-[#f2a900] text-[10px] font-bold text-[#0b2d5b] flex items-center justify-center">{cart.reduce((t, l) => t + l.qty, 0)}</span>}
        </button>
        <button data-agent="coupa-user-menu" className="flex items-center gap-2 text-[14px]" onClick={() => setMenu(menu === 'user' ? null : 'user')}>
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[12px] font-bold">AM</span> Alex Morgan <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <div className="h-11 shrink-0 bg-white border-b border-[#d8dee6] flex items-end px-5 gap-1">
        {tabs.map(([l, v, ag]) => {
          const act = view.v === v || (v === 'search' && ['item', 'cart', 'checkout'].includes(view.v)) || (v === 'reqs' && view.v === 'req') || (v === 'invoices' && view.v === 'invoice') || (v === 'orders' && view.v === 'po') || (v === 'suppliers' && view.v === 'supplier')
          return (
            <button key={l} data-agent={ag} onClick={() => (v === 'search' ? doSearch('') : go({ v } as any))} className={`relative h-full px-4 text-[14px] ${act ? 'font-bold text-[#0b2d5b]' : 'text-[#4a5a6a] hover:text-[#0b2d5b]'}`}>
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
                  <div className="px-4 h-11 flex items-center font-bold text-[15px] border-b border-[#e6ebf0]"><span className="flex-1">My Requisitions</span><button data-agent="coupa-home-view-all" onClick={() => go({ v: 'reqs' })} className="text-[13px] font-semibold text-[#1a6ebd] hover:underline">View all</button></div>
                  {reqs.slice(0, 6).map((r) => (
                    <button key={r.id} onClick={() => setView({ v: 'req', id: r.id })} className="w-full px-4 py-2.5 border-b border-[#f0f2f5] text-left hover:bg-[#f7f9fb]">
                      <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-[#1a6ebd]">#{r.number}</span><span className="text-[13px] truncate flex-1">{r.title}</span></div>
                      <div className="flex items-center gap-2 mt-1"><StatusPill s={r.status} /><span className="text-[12px] text-[#5f6b7a]">{$(r.total)}</span></div>
                    </button>
                  ))}
                </div>
                <div className="bg-white rounded-lg border border-[#d8dee6] p-4">
                  <div className="font-bold text-[15px] mb-2">Forms</div>
                  {FORMS.map((f) => (
                    <button key={f.id} data-agent={`coupa-form-open-${f.id}`} onClick={() => go({ v: 'form', form: f.id })} className="w-full flex items-center gap-2 py-1.5 text-[13.5px] text-[#1a6ebd] hover:underline text-left"><FileCheck2 className="w-4 h-4" /> {f.title}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view.v === 'search' && (() => {
          const term = view.q.toLowerCase()
          const words = term.split(/\s+/).filter(Boolean)
          const matched = catalog.filter((c) => (!view.supplier || c.supplier === view.supplier) && words.every((w) => (c.name + ' ' + c.supplier + ' ' + c.category + ' ' + c.partNumber).toLowerCase().includes(w)))
          const filtered = matched.filter((c) => (!contractOnly || c.contract) && (!cats.length || cats.includes(c.category)))
          const res = sort === 'price-asc' ? [...filtered].sort((a, b) => a.price - b.price) : sort === 'price-desc' ? [...filtered].sort((a, b) => b.price - a.price) : sort === 'name' ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : filtered
          return (
            <div className="max-w-[1240px] mx-auto px-6 py-5 grid grid-cols-[220px_1fr] gap-6">
              <div className="bg-white rounded-lg border border-[#d8dee6] p-4 h-fit text-[13.5px]">
                <div className="font-bold mb-2">Filter results</div>
                <div className="text-[12px] font-semibold uppercase text-[#5f6b7a] mt-3 mb-1">Supplier</div>
                {[...new Set(catalog.map((c) => c.supplier))].map((s) => (
                  <label key={s} className="flex items-center gap-2 py-1"><input type="checkbox" readOnly checked={view.supplier === s} onClick={() => doSearch(view.q, view.supplier === s ? undefined : s)} className="accent-[#1a6ebd]" /> {s}</label>
                ))}
                <div className="text-[12px] font-semibold uppercase text-[#5f6b7a] mt-3 mb-1">Contract</div>
                <label className="flex items-center gap-2 py-1"><input type="checkbox" data-agent="coupa-filter-contract" checked={contractOnly} onChange={(e) => setContractOnly(e.target.checked)} className="accent-[#1a6ebd]" /> On contract only</label>
                <div className="text-[12px] font-semibold uppercase text-[#5f6b7a] mt-3 mb-1">Category</div>
                {[...new Set(matched.map((c) => c.category))].sort().map((c) => (
                  <label key={c} className="flex items-center gap-2 py-1"><input type="checkbox" checked={cats.includes(c)} onChange={(e) => setCats(e.target.checked ? [...cats, c] : cats.filter((x) => x !== c))} className="accent-[#1a6ebd]" /> {c} <span className="text-[#5f6b7a] ml-auto">{matched.filter((m) => m.category === c).length}</span></label>
                ))}
                {(contractOnly || cats.length > 0) && <button onClick={() => { setContractOnly(false); setCats([]) }} className="mt-3 text-[13px] text-[#1a6ebd] hover:underline">Clear filters</button>}
              </div>
              <div>
                {view.supplier && (
                  <div className="mb-4 rounded-lg border border-[#b9d4ee] bg-[#eef5fc] px-4 py-3 text-[13.5px] flex items-center gap-2"><ExternalLink className="w-4 h-4 text-[#1a6ebd]" /> Punched out to <b>{view.supplier}</b> — Northwind contract pricing applied. Items return to your Coupa cart.</div>
                )}
                <div className="text-[15px] mb-3 flex items-center gap-2"><span className="flex-1"><b>{res.length}</b> results {view.q && <>for “<b>{view.q}</b>”</>}</span>
                  <span className="text-[13px] text-[#5f6b7a]">Sort by</span>
                  <select data-agent="coupa-sort" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 rounded border border-[#b8c2cc] bg-white px-2 text-[13px] outline-none">
                    <option value="relevance">Relevance</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option>
                  </select>
                </div>
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
                  <div className="text-[14px] text-[#5f6b7a] mt-1">Sold by <button onClick={() => go({ v: 'supplier', name: c.supplier })} className="text-[#1a6ebd] hover:underline">{c.supplier}</button> · Part # {c.partNumber}</div>
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
                    <Btn data-agent="coupa-item-favorite" onClick={() => { const fav: string[] = prefs?.favorites ?? []; patchPrefs({ favorites: fav.includes(c.id) ? fav.filter((x) => x !== c.id) : [...fav, c.id] }); flash(fav.includes(c.id) ? 'Removed from favorites' : 'Added to favorites') }}>
                      <Star className={`w-4 h-4 ${(prefs?.favorites ?? []).includes(c.id) ? 'fill-[#1a6ebd]' : ''}`} /> {(prefs?.favorites ?? []).includes(c.id) ? 'Favorited' : 'Favorite'}
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {view.v === 'cart' && (
          <div className="max-w-[1100px] mx-auto px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[22px] font-semibold flex-1">Cart</div>
              {cartLines.length > 0 && <Btn data-agent="coupa-cart-continue" onClick={() => doSearch('')}>Continue Shopping</Btn>}
              {cartLines.length > 0 && <Btn danger data-agent="coupa-cart-empty" onClick={() => { setCart([]); flash('Cart emptied') }}><Trash2 className="w-4 h-4" /> Empty Cart</Btn>}
            </div>
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
              <div className="text-[22px] font-semibold">Requisition #{editing ? editing.number : nextNum()}</div>
              <StatusPill s={editing ? editing.status : 'Draft'} />
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
                  <Btn data-agent="coupa-req-save" disabled={!cartLines.length} onClick={saveDraft}>Save</Btn>
                  <button onClick={() => setView({ v: 'cart' })} className="text-[13px] text-[#1a6ebd] hover:underline mt-1">Back to cart</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view.v === 'req' && <ReqView id={view.id} go={go} flash={flash} copyToCart={copyToCart} editReq={editReq} />}
        {view.v === 'reqs' && <ReqList go={go} />}
        {view.v === 'approvals' && <Approvals go={go} flash={flash} />}
        {view.v === 'invoices' && <Invoices go={go} />}
        {view.v === 'invoice' && <InvoiceView id={view.id} go={go} flash={flash} />}
        {view.v === 'orders' && <Orders go={go} />}
        {view.v === 'po' && <POView id={view.id} go={go} flash={flash} />}
        {view.v === 'suppliers' && <Suppliers go={go} />}
        {view.v === 'supplier' && <SupplierView name={view.name} go={go} add={add} />}
        {view.v === 'form' && <FormView key={view.form} form={view.form} go={go} flash={flash} />}
        {view.v === 'profile' && <Profile flash={flash} />}
      </div>
      {menu && <div className="absolute inset-0 z-40" onMouseDown={() => setMenu(null)} />}
      {menu === 'notif' && (
        <div data-agent="coupa-notif-panel" className="absolute right-[200px] top-[54px] z-50 w-[380px] bg-white rounded-lg shadow-2xl border border-[#d8dee6] overflow-hidden">
          <div className="h-11 px-4 flex items-center border-b border-[#eef1f4]"><span className="font-bold text-[15px] flex-1">Notifications</span><button data-agent="coupa-notif-read-all" disabled={!unread} onClick={() => patchPrefs({ readNotifs: notifs.map((n) => n.id) })} className="text-[13px] font-semibold text-[#1a6ebd] hover:underline disabled:opacity-40">Mark all as read</button></div>
          <div className="max-h-[420px] overflow-auto">
            {notifs.map((n) => (
              <button key={n.id} onClick={() => { patchPrefs({ readNotifs: [...new Set([...read, n.id])] }); go(n.go) }} className="w-full flex gap-3 px-4 py-3 border-b border-[#f3f5f8] text-left hover:bg-[#f7f9fb]">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${read.includes(n.id) ? 'bg-transparent' : 'bg-[#1a6ebd]'}`} />
                <span className="flex-1 min-w-0"><span className={`block text-[13.5px] ${read.includes(n.id) ? '' : 'font-semibold'}`}>{n.title}</span><span className="block text-[12.5px] text-[#5f6b7a] truncate">{n.body}</span><span className="block text-[11.5px] text-[#5f6b7a] mt-0.5">{fd(n.at)}</span></span>
              </button>
            ))}
            {notifs.length === 0 && <div className="p-6 text-center text-[13.5px] text-[#5f6b7a]">No notifications.</div>}
          </div>
        </div>
      )}
      {menu === 'help' && (
        <div className="absolute right-[170px] top-[54px] z-50 w-[260px] bg-white rounded-lg shadow-2xl border border-[#d8dee6] py-1 text-[14px]">
          {[[BookOpen, 'How to buy', () => { setMenu(null); doSearch('') }, 'Search the catalog, add to cart, check out'], [LifeBuoy, 'Coupa Success Portal', () => { setMenu(null); flash('Opening the Coupa Success Portal in a new tab…') }], [Mail, `Contact Procurement (${person('lucas').name})`, () => { setMenu(null); flash(`Message sent to ${person('lucas').name} in Procurement`) }]].map(([I, l, fn, sub]: any) => (
            <button key={l} onClick={fn} className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[#f3f5f8]"><I className="w-4 h-4 mt-0.5 text-[#1a6ebd]" /><span><span className="block">{l}</span>{sub && <span className="block text-[12px] text-[#5f6b7a]">{sub}</span>}</span></button>
          ))}
        </div>
      )}
      {menu === 'user' && (
        <div data-agent="coupa-user-panel" className="absolute right-4 top-[54px] z-50 w-[260px] bg-white rounded-lg shadow-2xl border border-[#d8dee6] py-1 text-[14px]">
          <div className="px-4 py-3 border-b border-[#eef1f4]"><div className="font-semibold">{ME.name}</div><div className="text-[12.5px] text-[#5f6b7a]">{ME.email}</div></div>
          <button data-agent="coupa-user-profile" onClick={() => go({ v: 'profile' })} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f3f5f8]"><User className="w-4 h-4 text-[#1a6ebd]" /> My Profile &amp; Settings</button>
          <button onClick={() => go({ v: 'reqs' })} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f3f5f8]"><FileCheck2 className="w-4 h-4 text-[#1a6ebd]" /> My Requisitions</button>
          <button onClick={() => { setMenu(null); flash('Switched to Coupa Supplier Portal view (read-only)') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f3f5f8]"><Repeat className="w-4 h-4 text-[#1a6ebd]" /> Switch to Supplier Portal</button>
          <button data-agent="coupa-user-signout" onClick={() => { setMenu(null); close() }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f3f5f8] border-t border-[#eef1f4]"><LogOut className="w-4 h-4 text-[#1a6ebd]" /> Sign Out</button>
        </div>
      )}
      {toast && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#1f2d3d] text-white text-[14px] px-5 py-2.5 shadow-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#7ddc8a]" /> {toast}</div>}
    </div>
  )
}

