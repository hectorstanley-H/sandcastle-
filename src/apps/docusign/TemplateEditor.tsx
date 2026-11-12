/** Create / edit an envelope template (documents, roles with routing order, default message). */
import { useState } from 'react'
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Send } from 'lucide-react'
import { uid, useRecord } from '@/db/db'
import { ME } from '@/data/people'
import type { Nav } from './index'
import { Btn, RCOLORS, type Template } from './shared'
import { DocThumb } from './Document'
import { tpl as tplActions } from './actions'
import { inputCls, useToast } from './ui'

export const TEMPLATE_FOLDERS = ['Sales / Renewals', 'Legal', 'HR', 'Procurement', 'Operations', 'Finance']
const DOC_LIBRARY: [string, number][] = [
  ['Northwind_Mutual_NDA.pdf', 3],
  ['Northwind_Order_Form.pdf', 4],
  ['Northwind_SOW_Template.pdf', 6],
  ['Northwind_Change_Order.pdf', 2],
  ['Northwind_Offer_Letter.pdf', 3],
  ['Vendor_Onboarding_Form.pdf', 5],
  ['Equipment_Lease_Agreement.pdf', 5],
]
const ROLE_OPTS = [
  ['signer', 'Needs to Sign'],
  ['cc', 'Receives a Copy'],
  ['inperson', 'In Person Signer'],
  ['viewer', 'Needs to View'],
]

export function TemplateEditor({ nav, id }: { nav: Nav; id?: string }) {
  const existing = useRecord<Template>('docusign.templates', id)
  const toast = useToast()
  const [t, setT] = useState<Template>(
    () =>
      existing ?? {
        id: uid('tpl'),
        name: '',
        description: '',
        documents: [],
        roles: [{ roleName: 'Signer 1', name: '', email: '', role: 'signer' }],
        subject: '',
        message: '',
        owner: ME.name,
        folder: 'Operations',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shared: false,
        uses: 0,
      },
  )
  const [err, setErr] = useState('')
  const set = (p: Partial<Template>) => setT((x) => ({ ...x, ...p }))
  const setRole = (i: number, p: Partial<Template['roles'][number]>) => set({ roles: t.roles.map((r, j) => (j === i ? { ...r, ...p } : r)) })
  const moveRole = (i: number, d: number) => {
    const r = [...t.roles]
    const j = i + d
    if (j < 0 || j >= r.length) return
    ;[r[i], r[j]] = [r[j], r[i]]
    set({ roles: r })
  }
  const save = (thenUse?: boolean) => {
    if (!t.name.trim()) return setErr('Enter a template name.')
    if (!t.documents.length) return setErr('Add at least one document.')
    if (!t.roles.some((r) => r.roleName.trim())) return setErr('Add at least one recipient role.')
    setErr('')
    tplActions.save({ ...t, subject: t.subject || `Complete with Docusign: ${t.documents[0].name}` })
    toast(existing ? 'Template saved' : 'Template created', t.name)
    if (thenUse) nav.send(t.id)
    else nav.go({ page: 'templates' })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto bg-[#F7F6FA]">
        <div className="max-w-[920px] mx-auto py-6 px-6 space-y-5">
          <button onClick={() => nav.go({ page: 'templates' })} className="flex items-center gap-1 text-[14px] font-semibold text-[#4C00FF] hover:underline">
            <ChevronLeft size={17} /> Templates
          </button>
          <h1 className="text-[24px] font-semibold tracking-tight">{existing ? `Edit “${existing.name}”` : 'Create Template'}</h1>
          {err && <div className="rounded border border-[#D11F3B] bg-[#FDECEF] px-4 py-2.5 text-[14px] text-[#A3122B]">{err}</div>}

          <section className="bg-white rounded-md border border-[#E5E1EC] p-6 grid grid-cols-2 gap-4">
            <label className="col-span-2 text-[13px]">
              <span className="block mb-1 font-medium">
                Template name <span className="text-[#D11F3B]">*</span>
              </span>
              <input data-agent="docusign-tpl-name" value={t.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
            </label>
            <label className="col-span-2 text-[13px]">
              <span className="block mb-1 font-medium">Description</span>
              <textarea value={t.description} onChange={(e) => set({ description: e.target.value })} className={`${inputCls} h-20 py-2 resize-none`} />
            </label>
            <label className="text-[13px]">
              <span className="block mb-1 font-medium">Folder</span>
              <select value={t.folder} onChange={(e) => set({ folder: e.target.value })} className={inputCls}>
                {TEMPLATE_FOLDERS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="text-[13px] flex items-end gap-2 pb-2">
              <input type="checkbox" checked={t.shared} onChange={(e) => set({ shared: e.target.checked })} className="accent-[#4C00FF] w-4 h-4" /> Share with everyone in Northwind Global
            </label>
          </section>

          <section className="bg-white rounded-md border border-[#E5E1EC] p-6">
            <h2 className="text-[18px] font-semibold mb-4">Documents</h2>
            <div className="flex flex-wrap gap-4 mb-4">
              {t.documents.map((d) => (
                <div key={d.name} className="flex items-start gap-3 rounded border border-[#E5E1EC] p-3 w-[280px]">
                  <DocThumb file={d.name} width={60} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold break-all">{d.name}</div>
                    <div className="text-[12px] text-[#5E5873]">{d.pages} pages</div>
                  </div>
                  <button aria-label={`Remove ${d.name}`} onClick={() => set({ documents: t.documents.filter((x) => x.name !== d.name) })} className="text-[#8B8698] hover:text-[#D11F3B]">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-[#5E5873]">Add from library:</span>
              <select
                value=""
                onChange={(e) => {
                  const d = DOC_LIBRARY.find((x) => x[0] === e.target.value)
                  if (d && !t.documents.some((x) => x.name === d[0])) set({ documents: [...t.documents, { name: d[0], pages: d[1] }] })
                }}
                className="h-9 px-2 rounded-[4px] border border-[#CBC4D6] bg-white"
                data-agent="docusign-tpl-add-doc"
              >
                <option value="">Choose a document…</option>
                {DOC_LIBRARY.map(([n]) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="bg-white rounded-md border border-[#E5E1EC] p-6">
            <h2 className="text-[18px] font-semibold mb-1">Recipient roles</h2>
            <div className="text-[13px] text-[#5E5873] mb-4">Roles are filled in when the template is used. Leave name and email blank to fill them each time. Order sets the routing order.</div>
            <div className="space-y-3">
              {t.roles.map((r, i) => (
                <div key={i} className="flex rounded border border-[#CBC4D6] overflow-hidden">
                  <span className="w-1.5 shrink-0" style={{ background: RCOLORS[i % RCOLORS.length].solid }} />
                  <div className="flex flex-col justify-center px-2 gap-1 text-[#5E5873]">
                    <button aria-label="Move role up" disabled={i === 0} onClick={() => moveRole(i, -1)} className="disabled:opacity-30">
                      <ArrowUp size={14} />
                    </button>
                    <span className="text-[12px] text-center">{i + 1}</span>
                    <button aria-label="Move role down" disabled={i === t.roles.length - 1} onClick={() => moveRole(i, 1)} className="disabled:opacity-30">
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1 py-3 pr-3 grid grid-cols-[1fr_1fr_1fr_160px] gap-2 items-end text-[13px]">
                    <label>
                      <span className="block mb-1 font-medium">Role</span>
                      <input value={r.roleName} onChange={(e) => setRole(i, { roleName: e.target.value })} className={inputCls} />
                    </label>
                    <label>
                      <span className="block mb-1 font-medium">Name</span>
                      <input value={r.name} onChange={(e) => setRole(i, { name: e.target.value })} className={inputCls} />
                    </label>
                    <label>
                      <span className="block mb-1 font-medium">Email</span>
                      <input value={r.email} onChange={(e) => setRole(i, { email: e.target.value })} className={inputCls} />
                    </label>
                    <label>
                      <span className="block mb-1 font-medium">Action</span>
                      <select value={r.role} onChange={(e) => setRole(i, { role: e.target.value })} className={inputCls}>
                        {ROLE_OPTS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button aria-label="Remove role" onClick={() => t.roles.length > 1 && set({ roles: t.roles.filter((_, j) => j !== i) })} className="px-3 text-[#8B8698] hover:text-[#D11F3B]">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Btn className="mt-4" onClick={() => set({ roles: [...t.roles, { roleName: `Signer ${t.roles.length + 1}`, name: '', email: '', role: 'signer' }] })}>
              <Plus size={16} /> Add Role
            </Btn>
          </section>

          <section className="bg-white rounded-md border border-[#E5E1EC] p-6">
            <h2 className="text-[18px] font-semibold mb-4">Default message</h2>
            <label className="block text-[13px] mb-4">
              <span className="block mb-1 font-medium">Email Subject</span>
              <input value={t.subject} onChange={(e) => set({ subject: e.target.value })} maxLength={100} className={inputCls} placeholder={t.documents[0] ? `Complete with Docusign: ${t.documents[0].name}` : ''} />
            </label>
            <label className="block text-[13px]">
              <span className="block mb-1 font-medium">Email Message</span>
              <textarea value={t.message} onChange={(e) => set({ message: e.target.value })} className={`${inputCls} h-28 py-2 resize-none`} />
            </label>
          </section>
        </div>
      </div>
      <div className="h-[64px] shrink-0 bg-white border-t border-[#E5E1EC] flex items-center justify-end gap-3 px-8">
        <Btn onClick={() => nav.go({ page: 'templates' })}>Cancel</Btn>
        <Btn onClick={() => save(true)}>
          <Send size={15} /> Save and Use
        </Btn>
        <Btn kind="primary" data-agent="docusign-tpl-save" onClick={() => save()} className="px-8">
          Save Template
        </Btn>
      </div>
    </div>
  )
}
