/** Related-list modals: contact roles, products, quotes, files, notes. */
import { useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME } from '@/data/people'
import { isoDate } from '@/data/time'
import { Btn, inputCls, labelCls, sfDate, usd } from './ui'
import { Modal } from './record'
import { useActions } from './forms'

export const PRICE_BOOK = [
  { name: 'Ops Cloud Enterprise (per seat / yr)', code: 'OPS-ENT', price: 744 },
  { name: 'Ops Cloud Professional (per seat / yr)', code: 'OPS-PRO', price: 480 },
  { name: 'Premier Success Plan', code: 'SUCC-PREM', price: 160_000 },
  { name: 'Implementation Services (per day)', code: 'SVC-IMPL', price: 1_850 },
  { name: 'MES Connector', code: 'INT-MES', price: 24_000 },
  { name: 'SAP PM Connector', code: 'INT-SAP', price: 36_000 },
  { name: 'AI Agents add-on (per seat / yr)', code: 'AI-AGENT', price: 120 },
]

export const ROLES = ['Business User', 'Decision Maker', 'Economic Buyer', 'Economic Decision Maker', 'Evaluator', 'Executive Sponsor', 'Influencer', 'Technical Buyer', 'Other']

export function ContactRoleModal({ oppId, contacts, onClose }: { oppId: string; contacts: any[]; onClose: () => void }) {
  const { toast } = useActions()
  const opp = db.find<any>('salesforce.opportunities', oppId)
  const taken = new Set((opp?.contactRoles ?? []).map((r: any) => r.contactId))
  const avail = contacts.filter((c) => !taken.has(c.id))
  const [cid, setCid] = useState(avail[0]?.id ?? '')
  const [role, setRole] = useState('Influencer')
  const [primary, setPrimary] = useState(false)
  const save = () => {
    if (!cid) return
    db.update('salesforce.opportunities', oppId, (r) => ({
      contactRoles: [...(r.contactRoles ?? []).map((x: any) => (primary ? { ...x, primary: false } : x)), { contactId: cid, role, primary }],
      ...(primary ? { primaryContactId: cid } : {}),
    }))
    toast('Contact role was added.')
    onClose()
  }
  return (
    <Modal title="Add Contact Roles" agent="sf-contact-role-modal" width={560} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!cid} onClick={save}>Save</Btn></>}>
      <div className="p-5 space-y-3 text-[13px]">
        {avail.length === 0 ? (
          <div className="text-[#444]">All contacts on this account already have a role on this opportunity.</div>
        ) : (
          <>
            <div>
              <label className={labelCls}>Contact</label>
              <select value={cid} onChange={(e) => setCid(e.target.value)} className={inputCls}>
                {avail.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Primary</label>
          </>
        )}
      </div>
    </Modal>
  )
}

export function ProductModal({ oppId, index, onClose }: { oppId: string; index?: number; onClose: () => void }) {
  const { toast } = useActions()
  const opp = db.find<any>('salesforce.opportunities', oppId)
  const cur = index != null ? opp?.products?.[index] : undefined
  const [code, setCode] = useState(cur?.code ?? PRICE_BOOK[0].code)
  const pb = PRICE_BOOK.find((p) => p.code === code) ?? PRICE_BOOK[0]
  const [qty, setQty] = useState(String(cur?.qty ?? opp?.seats ?? 1))
  const [price, setPrice] = useState(String(cur?.price ?? pb.price))
  const save = () => {
    const item = { name: cur?.name ?? pb.name, code, qty: Number(qty) || 1, price: Number(String(price).replace(/[^0-9.]/g, '')) || 0 }
    db.update('salesforce.opportunities', oppId, (r) => {
      const list = [...(r.products ?? [])]
      if (index != null) list[index] = item
      else list.push(item)
      return { products: list, lastModified: new Date().toISOString() }
    })
    toast(index != null ? 'Product was updated.' : `${item.name} was added.`)
    onClose()
  }
  const remove = () => {
    db.update('salesforce.opportunities', oppId, (r) => ({ products: (r.products ?? []).filter((_: any, i: number) => i !== index) }))
    toast('Product was removed.')
    onClose()
  }
  return (
    <Modal
      title={cur ? `Edit ${cur.name}` : 'Add Products'}
      agent="sf-product-modal"
      width={620}
      onClose={onClose}
      footer={
        <>
          {cur && <Btn className="mr-auto" onClick={remove}>Delete</Btn>}
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="brand" onClick={save}>Save</Btn>
        </>
      }
    >
      <div className="p-5 space-y-3 text-[13px]">
        <div className="text-[12px] text-[#444]">Price Book: Standard Price Book</div>
        {!cur && (
          <div>
            <label className={labelCls}>Product</label>
            <select
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setPrice(String(PRICE_BOOK.find((p) => p.code === e.target.value)?.price ?? 0))
              }}
              className={inputCls}
            >
              {PRICE_BOOK.map((p) => <option key={p.code} value={p.code}>{p.name} ({p.code}) — {usd(p.price)}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Quantity</label>
            <input value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} inputMode="decimal" />
          </div>
          <div>
            <label className={labelCls}>Sales Price</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} inputMode="decimal" />
          </div>
          <div>
            <label className={labelCls}>Total Price</label>
            <div className={`${inputCls} flex items-center bg-[#F3F3F3]`}>{usd((Number(qty) || 0) * (Number(String(price).replace(/[^0-9.]/g, '')) || 0))}</div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

const QUOTE_STATUS = ['Draft', 'Needs Review', 'In Review', 'Approved', 'Rejected', 'Presented', 'Accepted', 'Denied']

export function QuoteModal({ oppId, quoteId, onClose }: { oppId: string; quoteId?: string; onClose: () => void }) {
  const { toast } = useActions()
  const { isAgent } = useDesk()
  const opp = db.find<any>('salesforce.opportunities', oppId)
  const cur = quoteId ? opp?.quotes?.find((q: any) => q.id === quoteId) : undefined
  const prodTotal = (opp?.products ?? []).reduce((t: number, p: any) => t + p.qty * p.price, 0)
  const [name, setName] = useState(cur?.name ?? `${opp?.name ?? 'Quote'} — Quote ${(opp?.quotes?.length ?? 0) + 1}`)
  const [status, setStatus] = useState(cur?.status ?? 'Draft')
  const [total, setTotal] = useState(String(cur?.total ?? (prodTotal || opp?.amount || 0)))
  const [expires, setExpires] = useState(cur?.expires ?? isoDate(new Date(Date.now() + 30 * 86400000)))
  const save = () => {
    const q = { id: cur?.id ?? uid('0Q0Hs'), name, status, total: Number(String(total).replace(/[^0-9.]/g, '')) || 0, expires, createdBy: cur?.createdBy ?? (isAgent ? 'hworker' : undefined) }
    db.update('salesforce.opportunities', oppId, (r) => ({ quotes: cur ? (r.quotes ?? []).map((x: any) => (x.id === cur.id ? q : x)) : [...(r.quotes ?? []), q], lastModified: new Date().toISOString() }))
    toast(cur ? `Quote "${name}" was saved.` : `Quote "${name}" was created.`)
    onClose()
  }
  const remove = () => {
    db.update('salesforce.opportunities', oppId, (r) => ({ quotes: (r.quotes ?? []).filter((x: any) => x.id !== cur.id) }))
    toast('Quote was deleted.')
    onClose()
  }
  return (
    <Modal
      title={cur ? cur.name : 'New Quote'}
      agent="sf-quote-modal"
      width={640}
      onClose={onClose}
      footer={
        <>
          {cur && <Btn className="mr-auto" onClick={remove}>Delete</Btn>}
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="brand" onClick={save}>Save</Btn>
        </>
      }
    >
      <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
        <div className="col-span-2">
          <label className={labelCls}>Quote Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {QUOTE_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Expiration Date</label>
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Grand Total</label>
          <input value={total} onChange={(e) => setTotal(e.target.value)} className={inputCls} inputMode="decimal" />
        </div>
        <div className="text-[12px] text-[#444] self-end pb-2">{prodTotal ? `Products total: ${usd(prodTotal)}` : 'No products on this opportunity'}</div>
      </div>
    </Modal>
  )
}

const LOCAL_FILES = [
  { name: 'Mutual_Close_Plan.docx', kind: 'docx', size: '48 KB' },
  { name: 'ROI_Model_v2.xlsx', kind: 'xlsx', size: '212 KB' },
  { name: 'Security_Questionnaire_Responses.pdf', kind: 'pdf', size: '1.1 MB' },
  { name: 'Exec_Briefing_Deck.pptx', kind: 'pptx', size: '4.2 MB' },
  { name: 'Order_Form_Draft.pdf', kind: 'pdf', size: '310 KB' },
  { name: 'Rollout_Plan_10_weeks.pdf', kind: 'pdf', size: '640 KB' },
]

/** upload into `col`/`id`.files (opportunities, leads) */
export function UploadModal({ col, id, onClose }: { col: string; id: string; onClose: () => void }) {
  const { toast } = useActions()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const upload = () => {
    const add = LOCAL_FILES.filter((f) => sel.has(f.name)).map((f) => ({ ...f, date: new Date().toISOString() }))
    db.update(col, id, (r) => ({ files: [...(r.files ?? []), ...add] }))
    toast(`${add.length} file${add.length > 1 ? 's were' : ' was'} added.`)
    onClose()
  }
  return (
    <Modal title="Upload Files" agent="sf-upload-modal" width={560} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="brand" disabled={!sel.size} onClick={upload}>Done</Btn></>}>
      <div className="p-5 text-[13px]">
        <div className="rounded border-2 border-dashed border-[#C9C9C9] p-4 text-center text-[#444] mb-3">
          <Upload size={20} className="inline mb-1 text-[#0176D3]" />
          <div>Select files from your computer</div>
        </div>
        {LOCAL_FILES.map((f) => (
          <label key={f.name} className="flex items-center gap-3 py-1.5 border-b border-[#E5E5E5]">
            <input
              type="checkbox"
              checked={sel.has(f.name)}
              onChange={() =>
                setSel((s) => {
                  const n = new Set(s)
                  if (n.has(f.name)) n.delete(f.name)
                  else n.add(f.name)
                  return n
                })
              }
            />
            <FileText size={16} className="text-[#747474]" />
            <span className="flex-1">{f.name}</span>
            <span className="text-[12px] text-[#444]">{f.size}</span>
          </label>
        ))}
      </div>
    </Modal>
  )
}

export function FilePreview({ f, onClose }: { f: any; onClose: () => void }) {
  const { toast } = useActions()
  const { isAgent } = useDesk()
  const download = () => {
    const id = `f-sf-${String(f.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
    db.remove('files', id)
    db.insert('files', { id, name: f.name, folder: 'Downloads', kind: f.kind, size: f.size, modified: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    toast(`${f.name} was downloaded.`)
  }
  return (
    <Modal title={f.name} width={760} onClose={onClose} footer={<><Btn onClick={download}>Download</Btn><Btn variant="brand" onClick={onClose}>Close</Btn></>}>
      <div className="p-5 bg-[#F3F3F3]">
        <div className="mx-auto w-[520px] bg-white shadow p-8 text-[12px] leading-[1.6] text-[#444] min-h-[300px]">
          <div className="text-[16px] font-bold text-[#181818] mb-2">{String(f.name).replace(/[_-]/g, ' ').replace(/\.\w+$/, '')}</div>
          <div className="mb-3">Northwind Global · Confidential</div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-2 rounded bg-[#E5E5E5] mb-2" style={{ width: `${90 - ((i * 17) % 40)}%` }} />
          ))}
          <div className="mt-4 text-[11px]">
            {f.kind?.toUpperCase()} · {f.size} · Last modified {sfDate(f.date)}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function NotesList({ parentId }: { parentId: string }) {
  const notes = useCollection<any>('salesforce.notes').filter((n) => n.parentId === parentId)
  const [open, setOpen] = useState<any>(null)
  return (
    <>
      {notes.map((n) => (
        <div key={n.id} className="py-1.5 text-[12.5px]">
          <button className="text-[13px] text-[#0176D3] hover:underline text-left" onClick={() => setOpen(n)}>
            {n.title}
          </button>
          <div className="text-[#444] truncate">{sfDate(n.date)} • {n.body}</div>
        </div>
      ))}
      {open && <NoteModal note={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function NoteModal({ note, onClose }: { note: any; onClose: () => void }) {
  const { toast } = useActions()
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  return (
    <Modal
      title="Note"
      width={620}
      onClose={onClose}
      footer={
        <>
          <Btn className="mr-auto" onClick={() => { db.remove('salesforce.notes', note.id); toast('Note was deleted.'); onClose() }}>Delete</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="brand" onClick={() => { db.update('salesforce.notes', note.id, { title, body, date: new Date().toISOString(), ownerId: ME.id }); toast('Note was saved.'); onClose() }}>Save</Btn>
        </>
      }
    >
      <div className="p-5 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} text-[16px] font-bold`} aria-label="Title" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={`${inputCls} h-auto py-2`} aria-label="Body" />
      </div>
    </Modal>
  )
}
