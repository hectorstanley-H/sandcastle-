import { useEffect, useState } from 'react'
import { X, Upload, LayoutTemplate, Trash2, Plus, ChevronDown, PenLine, Calendar, User, Type, CheckSquare, Mail, Building2, BadgeCheck, CaseSensitive, ArrowLeft, FileText, MoreVertical, GripVertical, Search } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME } from '@/data/people'
import type { Nav } from './index'
import { Btn, C, RCOLORS, type Template, Wordmark } from './shared'
import { DocPage, DocThumb } from './Document'
import { guidFor } from './seed'

interface Rcp {
  name: string
  email: string
  role: string
}
interface Placed {
  id: string
  type: string
  recipient: number
  slot: string
}

const PALETTE: [string, string, any][] = [
  ['signature', 'Signature', PenLine],
  ['initial', 'Initial', CaseSensitive],
  ['date', 'Date Signed', Calendar],
  ['name', 'Name', User],
  ['email', 'Email', Mail],
  ['company', 'Company', Building2],
  ['title', 'Title', BadgeCheck],
  ['text', 'Text', Type],
  ['checkbox', 'Checkbox', CheckSquare],
]

const ROLE_OPTS = [
  ['signer', 'Needs to Sign'],
  ['cc', 'Receives a Copy'],
  ['inperson', 'In Person Signer'],
  ['viewer', 'Needs to View'],
]

export function SendFlow({ templateId, nav, setUrl }: { templateId?: string; nav: Nav; setUrl: (u: string) => void }) {
  const { isAgent } = useDesk()
  const templates = useCollection<Template>('docusign.templates')
  const [step, setStep] = useState<'setup' | 'fields'>('setup')
  const [tplId, setTplId] = useState<string | undefined>(templateId)
  const [picker, setPicker] = useState(false)
  const [pick, setPick] = useState<string | undefined>()
  const [q, setQ] = useState('')
  const [rcps, setRcps] = useState<Rcp[]>([{ name: '', email: '', role: 'signer' }])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [order, setOrder] = useState(false)
  const [tool, setTool] = useState<string | null>(null)
  const [activeR, setActiveR] = useState(0)
  const [placed, setPlaced] = useState<Placed[]>([])
  const [err, setErr] = useState('')
  const [draftId] = useState(() => guidFor(Math.floor(Math.random() * 1e6) + 1000))
  const tpl = templates.find((t) => t.id === tplId)

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setTplId(id)
    setSubject(t.subject)
    setMessage(t.message)
    const named = t.roles.filter((r) => r.name || r.email).map((r) => ({ name: r.name, email: r.email, role: r.role }))
    setRcps(t.roles[0] && !t.roles[0].name ? [{ name: '', email: '', role: t.roles[0].role ?? 'signer' }, ...named] : named.length ? named : [{ name: '', email: '', role: 'signer' }])
  }
  useEffect(() => {
    if (templateId) applyTemplate(templateId)
  }, [])
  useEffect(() => {
    setUrl(`https://apps.docusign.com/send/prepare/${draftId.toLowerCase()}/${step === 'setup' ? 'add-recipients' : 'add-fields'}`)
  }, [step])

  const doc = tpl?.documents[0]
  const setR = (i: number, patch: Partial<Rcp>) => setRcps((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const next = () => {
    if (!doc) return setErr('Add at least one document.')
    if (!rcps.some((r) => r.name && r.email)) return setErr('Add at least one recipient with a name and email.')
    setErr('')
    setStep('fields')
  }

  const send = () => {
    const now = new Date().toISOString()
    const list = rcps.filter((r) => r.name && r.email)
    const env = {
      id: draftId,
      subject: subject || `Complete with Docusign: ${doc?.name}`,
      message,
      status: 'sent',
      templateId: tplId,
      documents: tpl?.documents ?? [],
      recipients: list.map((r, i) => ({ name: r.name, email: r.email, role: r.role, status: 'sent', order: order ? i + 1 : 1, at: now })),
      sender: ME.email,
      senderName: ME.name,
      createdAt: now,
      sentAt: now,
      lastChange: now,
      expiresAt: new Date(Date.now() + 120 * 864e5).toISOString(),
      fields: placed.map((p, i) => ({ id: p.id, type: p.type, page: 1, x: 80 + i * 10, y: 700, recipient: p.recipient })),
      history: [
        { at: now, action: 'Created', by: ME.name, detail: `Envelope created from template “${tpl?.name}”${isAgent ? ' (via H-Worker)' : ''}` },
        { at: now, action: 'Sent', by: ME.name, detail: `Envelope sent to ${list.filter((r) => r.role !== 'cc').map((r) => `${r.name} [${r.email}]`).join(', ')}` },
        ...list.filter((r) => r.role === 'cc').map((r) => ({ at: now, action: 'Copy Sent', by: ME.name, detail: `Carbon copy sent to ${r.name} [${r.email}]` })),
      ],
      createdBy: isAgent ? 'hworker' : undefined,
    }
    db.insert('docusign.envelopes', env, { prepend: true })
    if (tpl) db.update('docusign.templates', tpl.id, (t) => ({ uses: (t.uses ?? 0) + 1 }))
    nav.go({ page: 'details', id: draftId, justSent: true })
  }

  const place = (slot: string) => {
    if (!tool) return
    setPlaced((p) => [...p.filter((x) => x.slot !== slot), { id: `f${Date.now()}${slot}`, type: tool, recipient: activeR, slot }])
    setTool(null)
  }

  const drop = (type: string, label: string) => {
    const f = placed.find((p) => p.slot === type)
    const col = RCOLORS[f?.recipient ?? activeR]
    if (f) {
      const lbl = PALETTE.find((x) => x[0] === f.type)
      const I = lbl?.[2] ?? PenLine
      return (
        <div data-agent={`docusign-placed-${type}`} className="flex items-center gap-1 h-[26px] px-1.5 rounded-[3px] text-[10px] font-semibold shadow-sm" style={{ background: col.bg, border: `1px solid ${col.border}` }}>
          {f.type === 'signature' ? (
            <span className="flex flex-col items-center leading-none px-1">
              <span className="text-[9px] font-bold">Sign</span>
              <PenLine size={10} />
            </span>
          ) : (
            <>
              <I size={11} /> {lbl?.[1]}
            </>
          )}
        </div>
      )
    }
    return (
      <button
        data-agent={`docusign-drop-${type}`}
        aria-label={`Place field on ${label}`}
        onClick={() => place(type)}
        className={`h-[24px] w-[150px] rounded-[3px] border border-dashed text-[9px] text-left px-1.5 ${tool ? 'border-[#4C00FF] bg-[#4C00FF]/10 text-[#4C00FF] animate-pulse' : 'border-transparent text-transparent hover:border-[#CBC4D6]'}`}
      >
        {tool ? `Drop ${PALETTE.find((x) => x[0] === tool)?.[1]} here` : '.'}
      </button>
    )
  }

  /* ───────── header ───────── */
  const header = (
    <div className="h-[60px] shrink-0 flex items-center gap-4 px-5 border-b border-[#E5E1EC] bg-white">
      <button aria-label="Close" onClick={() => nav.go({ page: 'home' })} className="w-9 h-9 rounded hover:bg-[#F2F0F5] flex items-center justify-center">
        <X size={20} />
      </button>
      <Wordmark height={18} />
      <span className="w-px h-6 bg-[#E5E1EC]" />
      <div className="text-[15px] font-semibold truncate max-w-[420px]">{subject || 'Untitled envelope'}</div>
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 text-[13px]">
          {['Setup', 'Add Fields', 'Review & Send'].map((s, i) => {
            const cur = (step === 'setup' ? 0 : 1) === i
            const done = (step === 'setup' ? 0 : 1) > i
            return (
              <span key={s} className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${cur ? 'bg-[#130032] text-white' : done ? 'bg-[#00805A] text-white' : 'bg-[#E5E1EC] text-[#5E5873]'}`}>{done ? '✓' : i + 1}</span>
                <span className={cur ? 'font-semibold' : 'text-[#5E5873]'}>{s}</span>
                {i < 2 && <span className="w-8 h-px bg-[#CBC4D6]" />}
              </span>
            )
          })}
        </div>
      </div>
      {step === 'fields' ? (
        <>
          <Btn onClick={() => setStep('setup')}>
            <ArrowLeft size={16} /> Back
          </Btn>
          <Btn kind="primary" data-agent="docusign-send" aria-label="Send" onClick={send} className="px-6">
            Send
          </Btn>
        </>
      ) : (
        <Btn>Save and Close</Btn>
      )}
    </div>
  )

  if (step === 'fields' && doc)
    return (
      <>
        {header}
        <div className="flex-1 min-h-0 flex bg-[#F7F6FA]">
          {/* palette */}
          <div className="w-[250px] shrink-0 bg-white border-r border-[#E5E1EC] overflow-auto">
            <div className="p-3 border-b border-[#E5E1EC]">
              <div className="text-[12px] text-[#5E5873] mb-1.5">Recipient</div>
              {rcps
                .filter((r) => r.name)
                .map((r, i) => (
                  <button key={i} data-agent={`docusign-field-recipient-${i}`} onClick={() => setActiveR(i)} className={`w-full flex items-center gap-2 h-9 px-2 rounded text-left text-[13px] ${activeR === i ? 'bg-[#F2EDFF] font-semibold' : 'hover:bg-[#F5F3F8]'}`}>
                    <span className="w-3 h-3 rounded-sm" style={{ background: RCOLORS[i].solid }} />
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="text-[11px] text-[#8B8698]">{r.role === 'cc' ? 'CC' : 'Signer'}</span>
                  </button>
                ))}
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 h-9 px-2 rounded border border-[#CBC4D6] text-[13px] text-[#8B8698] mb-3">
                <Search size={15} /> Search fields
              </div>
              <div className="text-[11px] font-bold text-[#5E5873] uppercase tracking-wide mb-1.5">Standard Fields</div>
              {PALETTE.map(([k, l, I]) => (
                <button
                  key={k}
                  data-agent={`docusign-field-${k}`}
                  aria-label={`${l} field`}
                  onClick={() => setTool(tool === k ? null : k)}
                  className={`w-full flex items-center gap-2.5 h-10 px-2 rounded text-[14px] text-left ${tool === k ? 'bg-[#4C00FF] text-white' : 'hover:bg-[#F5F3F8]'}`}
                >
                  <GripVertical size={14} className={tool === k ? 'text-white/70' : 'text-[#CBC4D6]'} />
                  <span className="w-6 h-6 rounded flex items-center justify-center" style={{ background: tool === k ? 'rgba(255,255,255,.2)' : RCOLORS[activeR].bg }}>
                    <I size={14} />
                  </span>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* doc */}
          <div className="flex-1 min-w-0 overflow-auto" data-agent="docusign-canvas">
            <div className="flex items-center justify-center gap-3 h-11 text-[13px] text-[#5E5873] sticky top-0 bg-[#F7F6FA] z-10">
              <FileText size={15} /> {doc.name} · Page 1 of {doc.pages}
              {tool && <span className="ml-3 px-2 h-6 rounded bg-[#4C00FF] text-white text-[12px] font-semibold flex items-center">Click on the document to place the field</span>}
            </div>
            <div className="flex flex-col items-center gap-5 pb-10">
              <DocPage file={doc.name} page={1} drop={drop as any} />
              {Array.from({ length: Math.min(doc.pages - 1, 2) }).map((_, i) => (
                <DocPage key={i} file={doc.name} page={i + 2} />
              ))}
            </div>
          </div>
          {/* right panel */}
          <div className="w-[260px] shrink-0 bg-white border-l border-[#E5E1EC] p-4 overflow-auto">
            <div className="text-[14px] font-semibold mb-3">Fields ({placed.length})</div>
            {placed.length === 0 && <div className="text-[13px] text-[#8B8698]">Select a field type, then click the document to place it.</div>}
            {placed.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-2 border-b border-[#F0EDF4] text-[13px]">
                <span className="w-3 h-3 rounded-sm" style={{ background: RCOLORS[p.recipient].solid }} />
                <span className="flex-1">{PALETTE.find((x) => x[0] === p.type)?.[1]}</span>
                <span className="text-[#8B8698] truncate max-w-[90px]">{rcps[p.recipient]?.name}</span>
                <button aria-label="Remove field" onClick={() => setPlaced((ps) => ps.filter((x) => x.id !== p.id))} className="text-[#8B8698] hover:text-[#D11F3B]">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="mt-5 text-[12px] text-[#5E5873] leading-relaxed">
              <b>Required</b> fields must be completed by the recipient before they can finish signing.
            </div>
          </div>
        </div>
      </>
    )

  /* ───────── setup ───────── */
  return (
    <>
      {header}
      <div className="flex-1 min-h-0 overflow-auto bg-[#F7F6FA]">
        <div className="max-w-[920px] mx-auto py-7 px-6 space-y-5">
          {err && <div className="rounded border border-[#D11F3B] bg-[#FDECEF] px-4 py-2.5 text-[14px] text-[#A3122B]">{err}</div>}
          <section className="bg-white rounded-md border border-[#E5E1EC] p-6">
            <h2 className="text-[18px] font-semibold mb-4">Add documents</h2>
            {doc ? (
              <div className="flex items-start gap-4" data-agent="docusign-doc-card">
                <DocThumb file={doc.name} width={110} />
                <div className="flex-1">
                  <div className="text-[14px] font-semibold">{doc.name}</div>
                  <div className="text-[13px] text-[#5E5873] mt-0.5">
                    {doc.pages} pages · from template “{tpl?.name}”
                  </div>
                </div>
                <button aria-label="Document options" className="w-8 h-8 rounded hover:bg-[#F2F0F5] flex items-center justify-center">
                  <MoreVertical size={18} />
                </button>
              </div>
            ) : (
              <div className="h-[170px] rounded border-2 border-dashed border-[#CBC4D6] flex flex-col items-center justify-center gap-3 bg-[#FBFAFD]">
                <Upload size={28} className="text-[#5E5873]" />
                <div className="text-[14px] text-[#5E5873]">Drop your files here or</div>
                <div className="flex gap-2">
                  <Btn kind="primary">
                    Upload <ChevronDown size={16} />
                  </Btn>
                  <Btn data-agent="docusign-use-template" aria-label="Use a Template" onClick={() => setPicker(true)}>
                    <LayoutTemplate size={16} /> Use a Template
                  </Btn>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-md border border-[#E5E1EC] p-6">
            <h2 className="text-[18px] font-semibold mb-2">Add recipients</h2>
            <label className="flex items-center gap-2 text-[14px] mb-4">
              <input type="checkbox" checked={order} onChange={(e) => setOrder(e.target.checked)} className="accent-[#4C00FF] w-4 h-4" /> Set signing order
            </label>
            <div className="space-y-3">
              {rcps.map((r, i) => (
                <div key={i} className="flex rounded border border-[#CBC4D6] overflow-hidden">
                  <span className="w-1.5 shrink-0" style={{ background: RCOLORS[i % RCOLORS.length].solid }} />
                  <div className="flex-1 p-4 grid grid-cols-[1fr_1fr_190px] gap-3 items-end">
                    <label className="text-[13px]">
                      <span className="block mb-1 font-medium">
                        Name <span className="text-[#D11F3B]">*</span>
                      </span>
                      <input data-agent={`docusign-recipient-name-${i}`} aria-label={`Recipient ${i + 1} name`} value={r.name} onChange={(e) => setR(i, { name: e.target.value })} className="w-full h-9 px-2.5 rounded-[4px] border border-[#CBC4D6] outline-none focus:border-[#4C00FF] text-[14px]" />
                    </label>
                    <label className="text-[13px]">
                      <span className="block mb-1 font-medium">
                        Email <span className="text-[#D11F3B]">*</span>
                      </span>
                      <input data-agent={`docusign-recipient-email-${i}`} aria-label={`Recipient ${i + 1} email`} value={r.email} onChange={(e) => setR(i, { email: e.target.value })} className="w-full h-9 px-2.5 rounded-[4px] border border-[#CBC4D6] outline-none focus:border-[#4C00FF] text-[14px]" />
                    </label>
                    <label className="text-[13px]">
                      <span className="block mb-1 font-medium">Action</span>
                      <select data-agent={`docusign-recipient-role-${i}`} aria-label={`Recipient ${i + 1} action`} value={r.role} onChange={(e) => setR(i, { role: e.target.value })} className="w-full h-9 px-2 rounded-[4px] border border-[#CBC4D6] bg-white text-[14px] outline-none focus:border-[#4C00FF]">
                        {ROLE_OPTS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button aria-label="Remove recipient" onClick={() => setRcps((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))} className="px-3 text-[#8B8698] hover:text-[#D11F3B]">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Btn data-agent="docusign-add-recipient" aria-label="Add Recipient" className="mt-4" onClick={() => setRcps((rs) => [...rs, { name: '', email: '', role: 'signer' }])}>
              <Plus size={16} /> Add Recipient
            </Btn>
          </section>

          <section className="bg-white rounded-md border border-[#E5E1EC] p-6">
            <h2 className="text-[18px] font-semibold mb-4">Add message</h2>
            <label className="block text-[13px] mb-4">
              <span className="block mb-1 font-medium">
                Email Subject <span className="text-[#D11F3B]">*</span>
              </span>
              <input data-agent="docusign-subject" aria-label="Email Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} className="w-full h-9 px-2.5 rounded-[4px] border border-[#CBC4D6] outline-none focus:border-[#4C00FF] text-[14px]" />
              <span className="block text-right text-[12px] text-[#8B8698] mt-1">Characters remaining: {100 - subject.length}</span>
            </label>
            <label className="block text-[13px]">
              <span className="block mb-1 font-medium">Email Message</span>
              <textarea data-agent="docusign-message" aria-label="Email Message" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full h-32 px-2.5 py-2 rounded-[4px] border border-[#CBC4D6] outline-none focus:border-[#4C00FF] text-[14px] resize-none" />
            </label>
          </section>
        </div>
      </div>
      <div className="h-[64px] shrink-0 bg-white border-t border-[#E5E1EC] flex items-center justify-end gap-3 px-8">
        <Btn onClick={() => nav.go({ page: 'home' })}>Cancel</Btn>
        <Btn kind="primary" data-agent="docusign-next" aria-label="Next" onClick={next} className="px-8">
          Next
        </Btn>
      </div>

      {picker && (
        <div className="absolute inset-0 z-40 bg-[#130032]/40 flex items-start justify-center pt-16">
          <div className="w-[760px] max-h-[calc(100%-100px)] flex flex-col bg-white rounded-md shadow-[0_16px_48px_rgba(19,0,50,0.3)]" data-agent="docusign-template-picker">
            <div className="flex items-center justify-between px-6 h-14 border-b border-[#E5E1EC]">
              <div className="text-[18px] font-semibold">Select Templates</div>
              <button aria-label="Close" onClick={() => setPicker(false)} className="w-8 h-8 rounded hover:bg-[#F2F0F5] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-3 border-b border-[#E5E1EC]">
              <div className="flex items-center gap-2 h-9 px-3 rounded-[4px] border border-[#CBC4D6]">
                <Search size={16} className="text-[#8B8698]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" className="flex-1 outline-none text-[14px]" />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {templates
                .filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
                .map((t) => (
                  <button key={t.id} data-agent={`docusign-template-${t.id}`} aria-label={t.name} onClick={() => setPick(t.id)} className={`w-full flex items-center gap-4 px-6 py-3 border-b border-[#F0EDF4] text-left ${pick === t.id ? 'bg-[#F2EDFF]' : 'hover:bg-[#F7F6FA]'}`}>
                    <input type="radio" readOnly checked={pick === t.id} className="accent-[#4C00FF] w-4 h-4" />
                    <DocThumb file={t.documents[0].name} width={40} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{t.name}</div>
                      <div className="text-[12.5px] text-[#5E5873] truncate">{t.description}</div>
                    </div>
                    <div className="text-[12px] text-[#8B8698] text-right shrink-0">
                      {t.owner}
                      <br />
                      {t.folder}
                    </div>
                  </button>
                ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-3 border-t border-[#E5E1EC]">
              <Btn onClick={() => setPicker(false)}>Cancel</Btn>
              <Btn
                kind="primary"
                data-agent="docusign-template-add"
                aria-label="Add"
                disabled={!pick}
                onClick={() => {
                  if (pick) applyTemplate(pick)
                  setPicker(false)
                }}
              >
                Add
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export const SEND_COLOR = C.purple
