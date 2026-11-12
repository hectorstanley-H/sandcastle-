/** HubSpot Commerce Hub: product library, quotes index, quote builder and quote record. */
import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronLeft, Copy, Download, Eye, FileText, Link2, Pencil, Plus, Search, Send, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { COMPANY, ME, person } from '@/data/people'
import { Field, HBtn, HLink, Initials, Modal, Pill, hsDate, hsMoney, inputH, selectH, useHNav } from './ui'
import { lineTotal, logActivity, notify, quoteTotals, setDealStage, type QuoteLine } from './store'

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'
const textareaH = 'w-full p-3 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] outline-none text-[14px] focus:border-[#00A4BD] focus:bg-white'

const BILLING = ['One-time', 'Monthly', 'Annually']
const STATUSES = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired']
const statusColor: Record<string, [string, string]> = {
  Draft: ['#EAF0F6', '#516F90'],
  Sent: ['#E5F5F8', '#007A8C'],
  Viewed: ['#EFEAFB', '#6A4FC6'],
  Accepted: ['#E5F8F6', '#00826F'],
  Declined: ['#FDEDEE', '#C93B44'],
  Expired: ['#FFF4DC', '#9B6A00'],
}
const termLabel: Record<string, string> = { 'One-time': 'One-time', Monthly: 'Monthly × 12 mo', Annually: 'Annually × 1 yr' }

const money2 = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayISO = () => localISO(new Date())
const plusDays = (n: number) => localISO(new Date(Date.now() + n * 86_400_000))

/** status as displayed: open quotes past their expiration date read as "Expired" */
export const quoteStatus = (q: { status: string; expires?: string }) =>
  q.status !== 'Accepted' && q.status !== 'Declined' && q.expires && q.expires < todayISO() ? 'Expired' : q.status

const contactName = (c: any) => (c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : '--')

function nextQuoteNumber() {
  const max = db.get<any>('hubspot.quotes').reduce((m, q) => Math.max(m, parseInt(String(q.number ?? '').replace(/\D/g, ''), 10) || 0), 1000)
  return `Q-${max + 1}`
}

function pushHistory(id: string, text: string, patch: Record<string, any> = {}) {
  const date = new Date().toISOString()
  db.update('hubspot.quotes', id, (r) => ({ ...patch, updatedAt: date, history: [{ date, text, by: ME.id }, ...(r.history ?? [])] }))
}

function PageTitle({ title, right, sub }: { title: string; right?: ReactNode; sub?: string }) {
  return (
    <div className="bg-white border-b border-[#DFE3EB] px-6 pt-5 pb-4 flex items-center gap-3">
      <div className="flex-1">
        <h1 className="text-[22px] font-medium">{title}</h1>
        {sub && <div className="text-[13px] text-[#516F90] mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const [bg, fg] = statusColor[status] ?? statusColor.Draft
  return <Pill color={bg} text={fg}>{status}</Pill>
}

function IconBtn({ label, onClick, children, agent }: { label: string; onClick: () => void; children: ReactNode; agent?: string }) {
  return (
    <button aria-label={label} title={label} data-agent={agent} onClick={onClick} className="w-8 h-8 inline-flex items-center justify-center rounded-[3px] text-[#516F90] hover:bg-[#EAF0F6] hover:text-[#33475B]">
      {children}
    </button>
  )
}

function ConfirmModal({ title, body, confirm, onConfirm, agent }: { title: string; body: ReactNode; confirm: string; onConfirm: () => void; agent?: string }) {
  const { open } = useHNav()
  return (
    <Modal title={title} onClose={() => open(null)} width={460} footer={<><button data-agent={agent} onClick={onConfirm} className="h-8 px-3 rounded-[3px] bg-[#F2545B] border border-[#F2545B] text-white text-[13px] font-medium hover:bg-[#F37D82]">{confirm}</button><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}>
      <div>{body}</div>
    </Modal>
  )
}

/* ───────────────────────── product library ───────────────────────── */

export function ProductsIndex() {
  const { open, toast } = useHNav()
  const products = useCollection<any>('hubspot.products')
  const [q, setQ] = useState('')
  const [billing, setBilling] = useState('')
  const rows = products
    .filter((p) => (!billing || p.billing === billing) && (!q || `${p.name} ${p.sku} ${p.description}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const edit = (p?: any) => open(<ProductModal product={p} />)
  const clone = (p: any) => {
    db.insert('hubspot.products', { ...p, id: uid('hsprod'), name: `${p.name} (copy)`, sku: `${p.sku}-COPY`, createdAt: new Date().toISOString() }, { prepend: true })
    toast(`Cloned “${p.name}”.`)
  }
  const remove = (p: any) =>
    open(
      <ConfirmModal
        title="Delete product?"
        agent="hs-product-delete-confirm"
        confirm="Delete product"
        body={<>“{p.name}” will be removed from the product library. Existing quotes keep their line items.</>}
        onConfirm={() => { db.remove('hubspot.products', p.id); open(null); toast('Product deleted.') }}
      />,
    )
  return (
    <div className="min-h-full bg-[#F5F8FA]">
      <PageTitle
        title="Product library"
        sub={`${products.length} products`}
        right={<><HBtn variant="ghost" small>Import</HBtn><HBtn variant="primary" small agent="hs-product-create" label="Create product" onClick={() => edit()}><Plus size={14} /> Create product</HBtn></>}
      />
      <div className="p-6">
        <div className="bg-white border border-[#DFE3EB] rounded-[3px]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#DFE3EB]">
            <div className="flex items-center h-8 w-[280px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5">
              <input aria-label="Search products" data-agent="hs-product-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or description" className="flex-1 outline-none text-[13px]" />
              <Search size={14} className="text-[#7C98B6]" />
            </div>
            <select aria-label="Billing frequency" data-agent="hs-product-billing-filter" value={billing} onChange={(e) => setBilling(e.target.value)} className={`${selectH} h-8 text-[13px]`}>
              <option value="">All billing frequencies</option>
              {BILLING.map((b) => <option key={b}>{b}</option>)}
            </select>
            <div className="flex-1" />
            <span className="text-[13px] text-[#516F90]">{rows.length} result{rows.length === 1 ? '' : 's'}</span>
          </div>
          <table className="w-full border-collapse">
            <thead><tr>{['Name', 'SKU', 'Description', 'Unit price', 'Billing frequency', 'Created', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} data-agent={`hs-product-row-${p.id}`} className="hover:bg-[#F5F8FA] group">
                  <td className={td}><HLink onClick={() => edit(p)}>{p.name}</HLink></td>
                  <td className={`${td} font-mono text-[12.5px]`}>{p.sku}</td>
                  <td className={`${td} max-w-[320px] truncate text-[#516F90]`} title={p.description}>{p.description}</td>
                  <td className={td}>{money2(Number(p.price) || 0)}</td>
                  <td className={td}>{p.billing}</td>
                  <td className={td}>{hsDate(p.createdAt)}</td>
                  <td className={`${td} text-right`}>
                    <span className="inline-flex opacity-60 group-hover:opacity-100">
                      <IconBtn label={`Edit ${p.name}`} agent={`hs-product-edit-${p.id}`} onClick={() => edit(p)}><Pencil size={14} /></IconBtn>
                      <IconBtn label={`Clone ${p.name}`} agent={`hs-product-clone-${p.id}`} onClick={() => clone(p)}><Copy size={14} /></IconBtn>
                      <IconBtn label={`Delete ${p.name}`} agent={`hs-product-delete-${p.id}`} onClick={() => remove(p)}><Trash2 size={14} /></IconBtn>
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-[13.5px] text-[#516F90]">No products match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProductModal({ product }: { product?: any }) {
  const { open, toast } = useHNav()
  const [v, setV] = useState({ name: product?.name ?? '', sku: product?.sku ?? '', description: product?.description ?? '', price: String(product?.price ?? ''), billing: product?.billing ?? 'One-time' })
  const set = (k: keyof typeof v, x: string) => setV((s) => ({ ...s, [k]: x }))
  const price = Number(v.price)
  const valid = v.name.trim() && v.price !== '' && !isNaN(price) && price >= 0
  const save = () => {
    const rec = { name: v.name.trim(), sku: v.sku.trim(), description: v.description.trim(), price, billing: v.billing }
    if (product) {
      db.update('hubspot.products', product.id, rec)
      toast('Product updated.')
    } else {
      db.insert('hubspot.products', { id: uid('hsprod'), ...rec, createdAt: new Date().toISOString() }, { prepend: true })
      toast('Product created.')
    }
    open(null)
  }
  return (
    <Modal
      title={product ? 'Edit product' : 'Create product'}
      agent="hs-product-modal"
      onClose={() => open(null)}
      footer={<><HBtn variant="primary" small agent="hs-product-save" label="Save product" disabled={!valid} onClick={save}>{product ? 'Save' : 'Create'}</HBtn><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}
    >
      <Field label="Name *"><input data-agent="hs-product-name" aria-label="Product name" value={v.name} onChange={(e) => set('name', e.target.value)} className={`${inputH} w-full`} /></Field>
      <Field label="SKU"><input data-agent="hs-product-sku" aria-label="SKU" value={v.sku} onChange={(e) => set('sku', e.target.value)} className={`${inputH} w-full font-mono`} /></Field>
      <Field label="Description"><textarea data-agent="hs-product-description" aria-label="Description" rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} className={textareaH} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit price (USD) *"><input data-agent="hs-product-price" aria-label="Unit price" type="number" min={0} step="0.01" value={v.price} onChange={(e) => set('price', e.target.value)} className={`${inputH} w-full`} /></Field>
        <Field label="Billing frequency"><select data-agent="hs-product-billing" aria-label="Billing frequency" value={v.billing} onChange={(e) => set('billing', e.target.value)} className={`${selectH} w-full`}>{BILLING.map((b) => <option key={b}>{b}</option>)}</select></Field>
      </div>
    </Modal>
  )
}

/* ───────────────────────── quotes index ───────────────────────── */

export function QuotesIndex() {
  const { go } = useHNav()
  const quotes = useCollection<any>('hubspot.quotes')
  const deals = useCollection<any>('hubspot.deals')
  const contacts = useCollection<any>('hubspot.contacts')
  const [tab, setTab] = useState('All')
  const [q, setQ] = useState('')
  const deal = (id: string) => deals.find((d) => d.id === id)
  const contact = (id: string) => contacts.find((c) => c.id === id)
  const all = useMemo(() => quotes.map((x) => ({ ...x, eff: quoteStatus(x), total: quoteTotals(x.lines ?? []).total })), [quotes])

  const month = todayISO().slice(0, 7)
  const openValue = all.filter((x) => x.status === 'Sent' || x.status === 'Viewed').reduce((t, x) => t + x.total, 0)
  const acceptedMonth = all.filter((x) => x.status === 'Accepted' && String(x.updatedAt ?? '').slice(0, 7) === month)
  const decided = all.filter((x) => x.status === 'Accepted' || x.status === 'Declined')
  const rate = decided.length ? Math.round((all.filter((x) => x.status === 'Accepted').length / decided.length) * 100) : 0

  const rows = all
    .filter((x) => tab === 'All' || x.eff === tab)
    .filter((x) => !q || `${x.number} ${x.title} ${deal(x.dealId)?.name ?? ''} ${contactName(contact(x.contactId))}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const count = (s: string) => (s === 'All' ? all.length : all.filter((x) => x.eff === s).length)

  const kpi = (label: string, value: string, sub: string, agent: string) => (
    <div className="bg-white border border-[#DFE3EB] rounded-[3px] px-5 py-4" data-agent={agent}>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-[#516F90]">{label}</div>
      <div className="text-[24px] font-light mt-1">{value}</div>
      <div className="text-[12.5px] text-[#516F90]">{sub}</div>
    </div>
  )

  return (
    <div className="min-h-full bg-[#F5F8FA]">
      <PageTitle title="Quotes" sub="Create, send and track quotes for your deals." right={<><HBtn variant="ghost" small onClick={() => go({ page: 'products' })}>Product library</HBtn><HBtn variant="primary" small agent="hs-quote-create" label="Create quote" onClick={() => go({ page: 'quote-new' })}><Plus size={14} /> Create quote</HBtn></>} />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {kpi('Open quotes value', hsMoney(openValue), `${all.filter((x) => x.status === 'Sent' || x.status === 'Viewed').length} sent or viewed`, 'hs-quotes-kpi-open')}
          {kpi('Accepted this month', hsMoney(acceptedMonth.reduce((t, x) => t + x.total, 0)), `${acceptedMonth.length} quote${acceptedMonth.length === 1 ? '' : 's'}`, 'hs-quotes-kpi-accepted')}
          {kpi('Acceptance rate', `${rate}%`, `${decided.length} quotes decided`, 'hs-quotes-kpi-rate')}
        </div>
        <div className="bg-white border border-[#DFE3EB] rounded-[3px]">
          <div className="flex items-end gap-1 px-4 border-b border-[#DFE3EB]" role="tablist">
            {['All', ...STATUSES].map((s) => (
              <button key={s} role="tab" aria-selected={tab === s} data-agent={`hs-quotes-tab-${s.toLowerCase()}`} onClick={() => setTab(s)} className={`h-11 px-3 text-[13.5px] border-b-[3px] -mb-px ${tab === s ? 'border-[#33475B] font-semibold' : 'border-transparent text-[#516F90] hover:text-[#33475B]'}`}>
                {s} <span className="ml-1 text-[12px] text-[#7C98B6]">{count(s)}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#DFE3EB]">
            <div className="flex items-center h-8 w-[280px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5">
              <input aria-label="Search quotes" data-agent="hs-quotes-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quotes" className="flex-1 outline-none text-[13px]" />
              <Search size={14} className="text-[#7C98B6]" />
            </div>
            <div className="flex-1" />
            <span className="text-[13px] text-[#516F90]">{rows.length} quote{rows.length === 1 ? '' : 's'}</span>
          </div>
          <table className="w-full border-collapse">
            <thead><tr>{['Quote', 'Deal', 'Contact', 'Owner', 'Amount', 'Status', 'Expiration date'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((x) => {
                const d = deal(x.dealId)
                const c = contact(x.contactId)
                return (
                  <tr key={x.id} data-agent={`hs-quote-row-${x.id}`} className="hover:bg-[#F5F8FA]">
                    <td className={td}>
                      <HLink onClick={() => go({ page: 'quote', id: x.id })}><span className="text-[#516F90] font-normal mr-1.5">{x.number}</span>{x.title}</HLink>
                    </td>
                    <td className={td}>{d ? <HLink onClick={() => go({ page: 'deal', id: d.id })}>{d.name}</HLink> : '--'}</td>
                    <td className={td}>{c ? <HLink onClick={() => go({ page: 'contact', id: c.id })}>{contactName(c)}</HLink> : '--'}</td>
                    <td className={td}><span className="inline-flex items-center gap-2"><Initials name={person(x.ownerId).name} size={22} />{person(x.ownerId).name}</span></td>
                    <td className={td}>{hsMoney(x.total)}</td>
                    <td className={td}><StatusPill status={x.eff} /></td>
                    <td className={`${td} ${x.eff === 'Expired' ? 'text-[#C93B44]' : ''}`}>{hsDate(x.expires)}</td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-[13.5px] text-[#516F90]">No quotes in this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── shared line items / totals ───────────────────────── */

function LineItems({ lines, onChange, editable }: { lines: QuoteLine[]; onChange?: (l: QuoteLine[]) => void; editable: boolean }) {
  const products = useCollection<any>('hubspot.products')
  const [pick, setPick] = useState('')
  const upd = (i: number, patch: Partial<QuoteLine>) => onChange?.(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const add = () => {
    const p = products.find((x) => x.id === pick)
    if (!p) return
    onChange?.([...lines, { productId: p.id, name: p.name, price: Number(p.price) || 0, qty: 1, discount: 0, billing: p.billing }])
    setPick('')
  }
  const num = 'h-8 w-[72px] px-2 rounded-[3px] border border-[#CBD6E2] bg-[#F5F8FA] text-[13px] outline-none focus:border-[#00A4BD] focus:bg-white'
  return (
    <div>
      <table className="w-full border-collapse" data-agent="hs-quote-lines">
        <thead><tr>{['Product', 'Unit price', 'Quantity', 'Discount %', 'Term', 'Total', ...(editable ? [''] : [])].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={`${l.productId}-${i}`} data-agent={`hs-quote-line-${i}`}>
              <td className={`${td} whitespace-normal`}>{l.name}</td>
              <td className={td}>{money2(l.price)}</td>
              <td className={td}>{editable ? <input aria-label={`Quantity for ${l.name}`} data-agent={`hs-quote-line-qty-${i}`} type="number" min={1} value={l.qty} onChange={(e) => upd(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className={num} /> : l.qty}</td>
              <td className={td}>{editable ? <input aria-label={`Discount for ${l.name}`} data-agent={`hs-quote-line-discount-${i}`} type="number" min={0} max={100} value={l.discount} onChange={(e) => upd(i, { discount: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className={num} /> : `${l.discount || 0}%`}</td>
              <td className={`${td} text-[#516F90]`}>{termLabel[l.billing] ?? l.billing}</td>
              <td className={`${td} font-medium`}>{money2(lineTotal(l))}</td>
              {editable && <td className={`${td} text-right`}><IconBtn label={`Remove ${l.name}`} agent={`hs-quote-line-remove-${i}`} onClick={() => onChange?.(lines.filter((_, j) => j !== i))}><X size={14} /></IconBtn></td>}
            </tr>
          ))}
          {!lines.length && <tr><td colSpan={editable ? 7 : 6} className="px-3 py-8 text-center text-[13.5px] text-[#516F90]">No line items yet. Add products from your product library.</td></tr>}
        </tbody>
      </table>
      {editable && (
        <div className="flex items-center gap-2 px-3 py-3 bg-[#F5F8FA] border-b border-[#DFE3EB]">
          <select aria-label="Select product" data-agent="hs-quote-product-select" value={pick} onChange={(e) => setPick(e.target.value)} className={`${selectH} h-8 text-[13px] w-[360px] bg-white`}>
            <option value="">Select a product from the library</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {money2(Number(p.price) || 0)} {p.billing === 'One-time' ? '' : `/ ${p.billing === 'Monthly' ? 'mo' : 'yr'}`}</option>)}
          </select>
          <HBtn small variant="secondary" agent="hs-quote-add-line" label="Add line item" disabled={!pick} onClick={add}><Plus size={14} /> Add</HBtn>
        </div>
      )}
    </div>
  )
}

function TotalsBox({ lines, className = '' }: { lines: QuoteLine[]; className?: string }) {
  const t = quoteTotals(lines)
  const row = (label: string, v: string, strong = false) => (
    <div className={`flex justify-between py-1 ${strong ? 'text-[16px] font-semibold border-t border-[#DFE3EB] mt-1 pt-2' : 'text-[13.5px]'}`}><span>{label}</span><span>{v}</span></div>
  )
  return (
    <div className={`w-[300px] ${className}`} data-agent="hs-quote-totals">
      {row('One-time subtotal', money2(t.oneTime))}
      {row('Recurring subtotal (annual)', money2(t.recurring))}
      {row('Total discount', t.discount ? `−${money2(t.discount)}` : money2(0))}
      {row('Total', money2(t.total), true)}
    </div>
  )
}

/* ───────────────────────── quote builder ───────────────────────── */

const defaultContact = (dealId: string) => {
  const d = db.find<any>('hubspot.deals', dealId)
  const contacts = db.get<any>('hubspot.contacts')
  if (!d) return contacts[0]?.id ?? ''
  const co = String(d.companyName ?? '').toLowerCase()
  return (contacts.find((c) => co && String(c.company ?? '').toLowerCase() === co) ?? contacts.find((c) => co && String(c.company ?? '').toLowerCase().includes(co.split(' ')[0])) ?? contacts[0])?.id ?? ''
}

export function QuoteEditor({ dealId }: { dealId?: string }) {
  const { go, toast } = useHNav()
  const deals = useCollection<any>('hubspot.deals')
  const contacts = useCollection<any>('hubspot.contacts')
  const init = dealId ? db.find<any>('hubspot.deals', dealId) : undefined
  const [v, setV] = useState({
    dealId: init?.id ?? '',
    contactId: init ? defaultContact(init.id) : '',
    title: init?.name ?? '',
    expires: plusDays(30),
    terms: 'Net 30. Prices valid until the expiration date above.',
    comments: '',
  })
  const [titleTouched, setTitleTouched] = useState(false)
  const [lines, setLines] = useState<QuoteLine[]>([])
  const [tried, setTried] = useState(false)
  const set = (k: keyof typeof v, x: string) => setV((s) => ({ ...s, [k]: x }))
  const deal = deals.find((d) => d.id === v.dealId)
  const pickDeal = (id: string) => {
    const d = deals.find((x) => x.id === id)
    setV((s) => ({ ...s, dealId: id, contactId: id ? defaultContact(id) : '', title: titleTouched ? s.title : d?.name ?? '' }))
  }
  const errors = [!v.dealId && 'Select a deal.', !lines.length && 'Add at least one line item.'].filter(Boolean) as string[]
  const save = () => {
    setTried(true)
    if (errors.length) return
    const id = uid('hsq')
    const now = new Date().toISOString()
    const number = nextQuoteNumber()
    db.insert('hubspot.quotes', {
      id, number, title: v.title.trim() || deal?.name || 'Untitled quote', dealId: v.dealId, contactId: v.contactId, ownerId: deal?.ownerId ?? ME.id,
      status: 'Draft', expires: v.expires, createdAt: now, updatedAt: now, lines, terms: v.terms, comments: v.comments,
      history: [{ date: now, text: 'Quote created as draft', by: ME.id }],
    }, { prepend: true })
    toast(`Quote ${number} saved as draft.`)
    go({ page: 'quote', id })
  }
  return (
    <div className="min-h-full bg-[#F5F8FA]">
      <div className="bg-white border-b border-[#DFE3EB] px-6 pt-4 pb-4">
        <HLink onClick={() => go(dealId ? { page: 'deal', id: dealId } : { page: 'quotes' })} className="text-[13px]"><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> {dealId ? 'Back to deal' : 'Quotes'}</span></HLink>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-[22px] font-medium flex-1">Create quote</h1>
          <HBtn small variant="ghost" onClick={() => go({ page: 'quotes' })}>Cancel</HBtn>
          <HBtn small variant="primary" agent="hs-quote-save" label="Save as draft" onClick={save}>Save as draft</HBtn>
        </div>
      </div>
      <div className="p-6 space-y-4 max-w-[1100px]">
        {tried && errors.length > 0 && (
          <div className="bg-[#FDEDEE] border border-[#F2545B] text-[#C93B44] rounded-[3px] px-4 py-3 text-[13.5px]" role="alert" data-agent="hs-quote-errors">{errors.join(' ')}</div>
        )}
        <section className="bg-white border border-[#DFE3EB] rounded-[3px] p-5">
          <h2 className="text-[16px] font-semibold mb-4">Deal & buyer</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Associated deal *">
              <select aria-label="Deal" data-agent="hs-quote-deal" value={v.dealId} onChange={(e) => pickDeal(e.target.value)} className={`${selectH} w-full`}>
                <option value="">Select a deal</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.name} — {hsMoney(Number(d.amount) || 0)}</option>)}
              </select>
            </Field>
            <Field label="Contact (recipient)">
              <select aria-label="Contact" data-agent="hs-quote-contact" value={v.contactId} onChange={(e) => set('contactId', e.target.value)} className={`${selectH} w-full`}>
                <option value="">Select a contact</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{contactName(c)}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Quote title"><input aria-label="Quote title" data-agent="hs-quote-title" value={v.title} onChange={(e) => { setTitleTouched(true); set('title', e.target.value) }} className={`${inputH} w-full`} /></Field>
            <Field label="Expiration date"><input aria-label="Expiration date" data-agent="hs-quote-expires" type="date" value={v.expires} onChange={(e) => set('expires', e.target.value)} className={`${inputH} w-full`} /></Field>
          </div>
          {deal && <div className="text-[12.5px] text-[#516F90] mt-3">Deal owner: {person(deal.ownerId).name} · Stage: {deal.stage} · Company: {deal.companyName}</div>}
        </section>
        <section className="bg-white border border-[#DFE3EB] rounded-[3px]">
          <h2 className="text-[16px] font-semibold px-5 pt-5 pb-3">Line items</h2>
          <LineItems lines={lines} onChange={setLines} editable />
          <div className="flex justify-end px-5 py-4"><TotalsBox lines={lines} /></div>
        </section>
        <section className="bg-white border border-[#DFE3EB] rounded-[3px] p-5 grid grid-cols-2 gap-4">
          <Field label="Terms"><textarea aria-label="Terms" data-agent="hs-quote-terms" rows={4} value={v.terms} onChange={(e) => set('terms', e.target.value)} className={textareaH} /></Field>
          <Field label="Comments to buyer"><textarea aria-label="Comments" data-agent="hs-quote-comments" rows={4} value={v.comments} onChange={(e) => set('comments', e.target.value)} className={textareaH} /></Field>
        </section>
      </div>
    </div>
  )
}

/* ───────────────────────── quote record ───────────────────────── */

function AcceptModal({ quote, total }: { quote: any; total: number }) {
  const { open, toast } = useHNav()
  const deal = db.find<any>('hubspot.deals', quote.dealId)
  const [won, setWon] = useState(true)
  const [amount, setAmount] = useState(true)
  const confirm = () => {
    pushHistory(quote.id, 'Marked as accepted', { status: 'Accepted' })
    const ev = { type: 'note' as const, title: `Quote accepted: ${quote.number}`, body: `${quote.title} — ${hsMoney(total)} accepted by the buyer.` }
    if (deal) logActivity('hubspot.deals', deal.id, ev)
    if (quote.contactId) logActivity('hubspot.contacts', quote.contactId, ev)
    notify({ title: `Quote ${quote.number} accepted`, body: `${quote.title} — ${hsMoney(total)}`, route: { page: 'quote', id: quote.id } })
    if (deal && won) setDealStage(deal.id, 'Closed Won')
    if (deal && amount) db.update('hubspot.deals', deal.id, { amount: Math.round(total) })
    open(null)
    toast(deal && won ? `Quote accepted. ${deal.name} moved to Closed Won.` : 'Quote marked as accepted.')
  }
  return (
    <Modal
      title="Mark quote as accepted"
      agent="hs-quote-accept-modal"
      width={500}
      onClose={() => open(null)}
      footer={<><HBtn variant="primary" small agent="hs-quote-accept-confirm" label="Confirm acceptance" onClick={confirm}>Mark accepted</HBtn><HBtn small onClick={() => open(null)}>Cancel</HBtn></>}
    >
      <p>{quote.number} · {quote.title} will be marked as accepted ({hsMoney(total)}).</p>
      {deal ? (
        <div className="space-y-2">
          <label className="flex items-start gap-2"><input type="checkbox" data-agent="hs-quote-accept-closewon" aria-label="Move deal to Closed Won" checked={won} onChange={(e) => setWon(e.target.checked)} className="mt-1" /><span>Also move <b>{deal.name}</b> to <b>Closed Won</b> <span className="text-[#516F90]">(currently {deal.stage})</span></span></label>
          <label className="flex items-start gap-2"><input type="checkbox" data-agent="hs-quote-accept-amount" aria-label="Update deal amount" checked={amount} onChange={(e) => setAmount(e.target.checked)} className="mt-1" /><span>Update deal amount from {hsMoney(Number(deal.amount) || 0)} to <b>{hsMoney(total)}</b></span></label>
        </div>
      ) : <p className="text-[#516F90]">This quote isn't associated with a deal.</p>}
    </Modal>
  )
}

export function QuoteDetail({ id }: { id: string }) {
  const { go, open, toast } = useHNav()
  const quote = useRecord<any>('hubspot.quotes', id)
  const deal = useRecord<any>('hubspot.deals', quote?.dealId)
  const contact = useRecord<any>('hubspot.contacts', quote?.contactId)
  const [editing, setEditing] = useState(false)
  const [draftLines, setDraftLines] = useState<QuoteLine[]>([])
  if (!quote) return <div className="p-8 text-[14px]">Quote not found. <HLink onClick={() => go({ page: 'quotes' })}>Back to quotes</HLink></div>

  const lines: QuoteLine[] = editing ? draftLines : quote.lines ?? []
  const totals = quoteTotals(lines)
  const eff = quoteStatus(quote)
  const owner = person(quote.ownerId)
  const company = contact?.company || deal?.companyName || ''

  const startEdit = () => { setDraftLines((quote.lines ?? []).map((l: QuoteLine) => ({ ...l }))); setEditing(true) }
  const saveLines = () => {
    if (!draftLines.length) { toast('A quote needs at least one line item.'); return }
    pushHistory(id, 'Line items updated', { lines: draftLines })
    setEditing(false)
    toast('Line items saved.')
  }
  const send = () => {
    pushHistory(id, `Sent to ${contactName(contact)}`, { status: 'Sent' })
    const ev = { type: 'email' as const, title: `Quote sent: ${quote.number}`, body: `${quote.title} — ${hsMoney(quoteTotals(quote.lines ?? []).total)} sent to ${contactName(contact)}${contact?.email ? ` <${contact.email}>` : ''}. Expires ${hsDate(quote.expires)}.` }
    if (quote.dealId) logActivity('hubspot.deals', quote.dealId, ev)
    if (quote.contactId) logActivity('hubspot.contacts', quote.contactId, ev)
    toast(`Quote ${quote.number} sent to ${contactName(contact)}.`)
  }
  const viewed = () => { pushHistory(id, `Viewed by ${contactName(contact)}`, { status: 'Viewed' }); toast('Quote marked as viewed.') }
  const decline = () => {
    pushHistory(id, 'Marked as declined', { status: 'Declined' })
    const ev = { type: 'note' as const, title: `Quote declined: ${quote.number}`, body: `${quote.title} was declined by the buyer.` }
    if (quote.dealId) logActivity('hubspot.deals', quote.dealId, ev)
    if (quote.contactId) logActivity('hubspot.contacts', quote.contactId, ev)
    toast('Quote marked as declined.')
  }
  const copyLink = () => {
    const url = `https://northwind.hs-sites.com/q/${quote.id}`
    try { void navigator.clipboard?.writeText(url) } catch { /* clipboard unavailable */ }
    toast(`Link copied: ${url}`)
  }
  const clone = () => {
    const nid = uid('hsq')
    const now = new Date().toISOString()
    const number = nextQuoteNumber()
    db.insert('hubspot.quotes', {
      ...quote, id: nid, number, title: `${quote.title} (copy)`, status: 'Draft', createdAt: now, updatedAt: now, expires: plusDays(30),
      lines: (quote.lines ?? []).map((l: QuoteLine) => ({ ...l })), history: [{ date: now, text: `Cloned from ${quote.number}`, by: ME.id }],
    }, { prepend: true })
    toast(`Cloned as ${number}.`)
    go({ page: 'quote', id: nid })
  }
  const remove = () =>
    open(
      <ConfirmModal
        title="Delete quote?"
        agent="hs-quote-delete-confirm"
        confirm="Delete quote"
        body={<>{quote.number} · “{quote.title}” will be permanently deleted.</>}
        onConfirm={() => { db.remove('hubspot.quotes', id); open(null); toast('Quote deleted.'); go({ page: 'quotes' }) }}
      />,
    )

  /* activity derived from stored history, falling back to createdAt / updatedAt / status for seeded quotes */
  const history: { date: string; text: string; by?: string }[] = quote.history?.length
    ? [...quote.history]
    : [
        ...(quote.status !== 'Draft' && quote.updatedAt !== quote.createdAt ? [{ date: quote.updatedAt, text: quote.status === 'Sent' ? 'Sent to buyer' : `Status changed to ${quote.status}`, by: quote.ownerId }] : []),
        { date: quote.createdAt, text: 'Quote created', by: quote.ownerId },
      ]
  if (eff === 'Expired') history.unshift({ date: `${quote.expires}T23:59:00`, text: 'Quote expired' })
  if (quote.history?.length && !quote.history.some((h: any) => /created|Cloned/i.test(h.text))) history.push({ date: quote.createdAt, text: 'Quote created', by: quote.ownerId })

  const prop = (label: string, value: ReactNode) => (
    <div className="py-2 border-b border-[#EAF0F6] last:border-0">
      <div className="text-[12px] text-[#516F90]">{label}</div>
      <div className="text-[13.5px] mt-0.5">{value}</div>
    </div>
  )

  return (
    <div className="min-h-full bg-[#F5F8FA]">
      <div className="bg-white border-b border-[#DFE3EB] px-6 pt-4 pb-4">
        <HLink onClick={() => go({ page: 'quotes' })} className="text-[13px]"><span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Quotes</span></HLink>
        <div className="flex items-center gap-3 mt-2">
          <FileText size={22} className="text-[#516F90]" />
          <h1 className="text-[22px] font-medium" data-agent="hs-quote-title">{quote.title}</h1>
          <span className="text-[14px] text-[#516F90]">{quote.number}</span>
          <StatusPill status={eff} />
        </div>
      </div>
      <div className="flex gap-5 p-6 items-start">
        {/* buyer-facing document preview */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-[#DFE3EB] rounded-[3px] shadow-[0_1px_3px_rgba(45,62,80,0.12)] max-w-[860px] mx-auto" data-agent="hs-quote-preview">
            <div className="px-10 pt-10 pb-6 flex items-start border-b-4 border-[#FF5C35]">
              <div>
                <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-[4px] bg-[#213343] text-white flex items-center justify-center font-bold">N</span><span className="text-[20px] font-semibold">{COMPANY.name}</span></div>
                <div className="text-[12.5px] text-[#516F90] mt-2 leading-5">{COMPANY.legalEntity}<br />{COMPANY.hq}<br />sales@{COMPANY.domain}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-[26px] font-light tracking-wide">QUOTE</div>
                <div className="text-[13px] text-[#516F90] mt-1 leading-5">
                  Quote # <b className="text-[#33475B]">{quote.number}</b><br />
                  Created {hsDate(quote.createdAt)}<br />
                  Expires {hsDate(quote.expires)}
                </div>
              </div>
            </div>
            <div className="px-10 py-6 grid grid-cols-2 gap-6 text-[13.5px]">
              <div>
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[#516F90] mb-1">Prepared for</div>
                <div className="font-semibold">{contactName(contact)}</div>
                {contact?.jobTitle && <div>{contact.jobTitle}</div>}
                <div>{company}</div>
                {contact?.email && <div className="text-[#516F90]">{contact.email}</div>}
              </div>
              <div>
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[#516F90] mb-1">Prepared by</div>
                <div className="font-semibold">{owner.name}</div>
                <div>{COMPANY.name}</div>
                <div className="text-[#516F90]">{owner.id}@{COMPANY.domain}</div>
              </div>
            </div>
            <div className="px-10 pb-2">
              <div className="text-[18px] font-semibold mb-3">{quote.title}</div>
              {quote.comments && <p className="text-[13.5px] text-[#516F90] mb-4 whitespace-pre-wrap">{quote.comments}</p>}
            </div>
            <div className="px-10">
              {editing ? (
                <div className="border border-[#00A4BD] rounded-[3px]" data-agent="hs-quote-line-editor">
                  <LineItems lines={draftLines} onChange={setDraftLines} editable />
                  <div className="flex justify-end gap-2 px-3 py-3">
                    <HBtn small onClick={() => setEditing(false)}>Cancel</HBtn>
                    <HBtn small variant="primary" agent="hs-quote-lines-save" label="Save line items" onClick={saveLines}><Check size={14} /> Save</HBtn>
                  </div>
                </div>
              ) : (
                <LineItems lines={lines} editable={false} />
              )}
            </div>
            <div className="px-10 py-5 flex justify-end"><TotalsBox lines={lines} /></div>
            {quote.terms && (
              <div className="px-10 pb-6">
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[#516F90] mb-1">Terms</div>
                <p className="text-[13px] whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
            <div className="px-10 pb-10 pt-2 grid grid-cols-2 gap-10" data-agent="hs-quote-signature">
              {['Customer signature', `${COMPANY.name} signature`].map((s) => (
                <div key={s}>
                  <div className="h-12 border-b border-[#33475B]">
                    {eff === 'Accepted' && s === 'Customer signature' && <span className="font-[cursive] text-[22px] text-[#213343] italic">{contactName(contact)}</span>}
                  </div>
                  <div className="text-[12px] text-[#516F90] mt-1 flex justify-between"><span>{s}</span><span>Date</span></div>
                  <div className="h-8 border-b border-[#CBD6E2] mt-3" />
                  <div className="text-[12px] text-[#516F90] mt-1">Printed name</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right panel */}
        <aside className="w-[320px] shrink-0 space-y-4">
          <div className="bg-white border border-[#DFE3EB] rounded-[3px] p-4">
            <div className="text-[15px] font-semibold mb-2">About this quote</div>
            {prop('Status', <StatusPill status={eff} />)}
            {prop('Deal', deal ? <HLink agent="hs-quote-deal-link" onClick={() => go({ page: 'deal', id: deal.id })}>{deal.name}</HLink> : '--')}
            {prop('Contact', contact ? <HLink agent="hs-quote-contact-link" onClick={() => go({ page: 'contact', id: contact.id })}>{contactName(contact)}</HLink> : '--')}
            {prop('Quote owner', <span className="inline-flex items-center gap-2"><Initials name={owner.name} size={22} />{owner.name}</span>)}
            {prop('Expiration date', <span className={eff === 'Expired' ? 'text-[#C93B44]' : ''}>{hsDate(quote.expires)}</span>)}
            {prop('One-time', money2(totals.oneTime))}
            {prop('Recurring (annual)', money2(totals.recurring))}
            {prop('Discount', totals.discount ? `−${money2(totals.discount)}` : money2(0))}
            {prop('Total', <b className="text-[16px]">{money2(totals.total)}</b>)}
          </div>

          <div className="bg-white border border-[#DFE3EB] rounded-[3px] p-4 space-y-2" data-agent="hs-quote-actions">
            <div className="text-[15px] font-semibold mb-1">Actions</div>
            {quote.status === 'Draft' && (
              <>
                {!editing && <HBtn small variant="secondary" className="w-full" agent="hs-quote-edit-lines" label="Edit line items" onClick={startEdit}><Pencil size={14} /> Edit line items</HBtn>}
                <HBtn small variant="primary" className="w-full" agent="hs-quote-send" label="Send to buyer" disabled={editing || !(quote.lines ?? []).length} onClick={send}><Send size={14} /> Send to buyer</HBtn>
              </>
            )}
            {(quote.status === 'Sent' || quote.status === 'Viewed') && (
              <>
                {quote.status === 'Sent' && <HBtn small variant="ghost" className="w-full" agent="hs-quote-viewed" label="Mark as viewed" onClick={viewed}><Eye size={14} /> Mark as viewed</HBtn>}
                <HBtn small variant="primary" className="w-full" agent="hs-quote-accept" label="Mark accepted" onClick={() => open(<AcceptModal quote={quote} total={quoteTotals(quote.lines ?? []).total} />)}><ThumbsUp size={14} /> Mark accepted</HBtn>
                <HBtn small variant="secondary" className="w-full" agent="hs-quote-decline" label="Mark declined" onClick={decline}><ThumbsDown size={14} /> Mark declined</HBtn>
                <HBtn small variant="ghost" className="w-full" agent="hs-quote-copy-link" label="Copy link" onClick={copyLink}><Link2 size={14} /> Copy link</HBtn>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <HBtn small variant="ghost" className="flex-1" agent="hs-quote-clone" label="Clone quote" onClick={clone}><Copy size={14} /> Clone</HBtn>
              <HBtn small variant="ghost" className="flex-1" agent="hs-quote-download" label="Download PDF" onClick={() => toast(`PDF downloaded: ${quote.number}.pdf`)}><Download size={14} /> PDF</HBtn>
              <HBtn small variant="ghost" agent="hs-quote-delete" label="Delete quote" onClick={remove}><Trash2 size={14} /></HBtn>
            </div>
          </div>

          <div className="bg-white border border-[#DFE3EB] rounded-[3px] p-4" data-agent="hs-quote-activity">
            <div className="text-[15px] font-semibold mb-2">Activity</div>
            <ol className="relative border-l border-[#DFE3EB] ml-1.5 space-y-3">
              {history.map((h, i) => (
                <li key={i} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#CBD6E2]" />
                  <div className="text-[13px]">{h.text}</div>
                  <div className="text-[12px] text-[#516F90]">{hsDate(h.date, true)}{h.by ? ` · ${person(h.by).name}` : ''}</div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
