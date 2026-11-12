import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronUp, CircleCheck, FileText, GripVertical, Info, Plus, Search, Trash2 } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { ME, person } from '@/data/people'
import { Field, HBtn, HLink, HWTag, Initials, Pill, hsDate, inputH, selectH, useHNav } from './ui'
import { LIFECYCLE, submitForm } from './store'
import { OWNERS } from './owners'

const th = 'text-left text-[12px] font-semibold uppercase tracking-wide px-3 h-10 border-b border-[#DFE3EB] bg-[#F5F8FA] whitespace-nowrap'
const td = 'px-3 h-12 border-b border-[#DFE3EB] text-[13.5px] whitespace-nowrap'

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

const FORM_TYPES = ['Embedded', 'Pop-up', 'Standalone page']
/** contact properties a form field can map to */
const FORM_PROPS: { key: string; label: string }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone number' },
  { key: 'company', label: 'Company' },
  { key: 'jobTitle', label: 'Job title' },
]
const propLabel = (key: string) => FORM_PROPS.find((p) => p.key === key)?.label ?? key
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const rate = (f: any) => (f.views ? `${((f.submissions / f.views) * 100).toFixed(2)}%` : '--')

/* ───────────────────────── index ───────────────────────── */

export function FormsIndex() {
  const { go } = useHNav()
  const forms = useCollection<any>('hubspot.forms')
  const [q, setQ] = useState('')
  const [type, setType] = useState('All')
  const rows = forms
    .filter((f) => (type === 'All' || f.type === type) && (!q || f.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  const views = forms.reduce((t, f) => t + (f.views ?? 0), 0)
  const subs = forms.reduce((t, f) => t + (f.submissions ?? 0), 0)
  return (
    <div className="min-h-full bg-white">
      <PageTitle title="Forms" right={<HBtn variant="primary" small agent="hs-form-create" onClick={() => go({ page: 'form', id: 'new' })}><Plus size={14} /> Create form</HBtn>} />
      <div className="flex gap-10 px-6 py-4 border-b border-[#DFE3EB] text-[13px]">
        {[['FORMS', forms.length.toLocaleString()], ['VIEWS', views.toLocaleString()], ['SUBMISSIONS', subs.toLocaleString()], ['CONVERSION RATE', views ? `${((subs / views) * 100).toFixed(2)}%` : '--']].map(([k, v]) => (
          <div key={k}><div className="text-[12px] text-[#516F90]">{k}</div><div className="text-[18px] font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#DFE3EB]">
        <div className="flex items-center h-8 w-[260px] border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5">
          <input data-agent="hs-form-search" aria-label="Search forms" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search forms" className="flex-1 outline-none text-[13px]" />
          <Search size={14} className="text-[#7C98B6]" />
        </div>
        <select data-agent="hs-form-type-filter" aria-label="Form type" value={type} onChange={(e) => setType(e.target.value)} className="h-8 px-2 ml-2 rounded-[3px] border border-[#CBD6E2] text-[13px] bg-white outline-none">
          <option value="All">All form types</option>
          {FORM_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <table className="w-full border-collapse">
        <thead><tr>{['Name', 'Form type', 'Views', 'Submissions', 'Conversion rate', 'Last updated', 'Owner'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id} className={`hover:bg-[#F5F8FA] ${f.createdBy === 'hworker' ? 'flash-new' : ''}`}>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <FileText size={15} className="text-[#7C98B6]" />
                  <HLink agent={`hs-form-row-${f.id}`} onClick={() => go({ page: 'form', id: f.id })}>{f.name}</HLink>
                  {f.createdBy === 'hworker' && <HWTag />}
                </span>
              </td>
              <td className={td}><Pill>{f.type}</Pill></td>
              <td className={td}>{(f.views ?? 0).toLocaleString()}</td>
              <td className={td}>{(f.submissions ?? 0).toLocaleString()}</td>
              <td className={td}>{rate(f)}</td>
              <td className={td}>{hsDate(f.updatedAt, true)}</td>
              <td className={td}>{person(f.ownerId).name}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={7} className="p-10 text-center text-[14px] text-[#516F90]">{forms.length ? 'No forms match your filters.' : 'No forms yet. Create one to capture leads from your website.'}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────────────────── editor ───────────────────────── */

type FField = { key: string; label: string; required: boolean }
type FDraft = { name: string; type: string; fields: FField[]; lifecycleOnSubmit: string; ownerId: string }

const toDraft = (f: any): FDraft =>
  f
    ? { name: f.name ?? '', type: f.type ?? 'Embedded', fields: (f.fields ?? []).map((x: FField) => ({ ...x })), lifecycleOnSubmit: f.lifecycleOnSubmit ?? 'Lead', ownerId: f.ownerId ?? ME.id }
    : { name: '', type: 'Embedded', fields: [{ key: 'email', label: 'Email', required: true }], lifecycleOnSubmit: 'Lead', ownerId: ME.id }
const snapshot = (d: FDraft) => JSON.stringify(d)

/** Remounts per id so the local draft is reloaded when navigating from 'new' to the saved record. */
export function FormEditor({ id }: { id: string }) {
  return <Editor key={id} id={id} />
}

function Editor({ id }: { id: string }) {
  const { go, toast } = useHNav()
  const { isAgent } = useDesk()
  const isNew = id === 'new'
  const form = useRecord<any>('hubspot.forms', isNew ? null : id)
  const contacts = useCollection<any>('hubspot.contacts')
  const [d, setD] = useState<FDraft>(() => toDraft(isNew ? null : db.find('hubspot.forms', id)))
  const [tab, setTab] = useState<'form' | 'options' | 'submissions'>('form')
  const [nameErr, setNameErr] = useState(false)
  // live preview state
  const [vals, setVals] = useState<Record<string, string>>({})
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [done, setDone] = useState<{ contactId: string; created: boolean } | null>(null)

  if (!isNew && !form)
    return (
      <div className="p-8 text-[14px]">
        Form not found. <HLink onClick={() => go({ page: 'forms' })}>Back to forms</HLink>
      </div>
    )

  const dirty = isNew || snapshot(d) !== snapshot(toDraft(form))
  const unused = FORM_PROPS.filter((p) => !d.fields.some((f) => f.key === p.key))

  const patchField = (key: string, patch: Partial<FField>) => setD((s) => ({ ...s, fields: s.fields.map((f) => (f.key === key ? { ...f, ...patch } : f)) }))
  const move = (i: number, dir: -1 | 1) =>
    setD((s) => {
      const j = i + dir
      if (j < 0 || j >= s.fields.length) return s
      const fields = [...s.fields]
      ;[fields[i], fields[j]] = [fields[j], fields[i]]
      return { ...s, fields }
    })
  const addField = (key: string) => {
    if (!key) return
    setD((s) => ({ ...s, fields: [...s.fields, { key, label: propLabel(key), required: false }] }))
  }
  const removeField = (key: string) => {
    if (key === 'email') return
    setD((s) => ({ ...s, fields: s.fields.filter((f) => f.key !== key) }))
    setErrs((e) => {
      const { [key]: _drop, ...rest } = e
      return rest
    })
  }

  const save = () => {
    if (!d.name.trim()) {
      setNameErr(true)
      toast('Give the form a name before saving.')
      return
    }
    setNameErr(false)
    const now = new Date().toISOString()
    const fields = d.fields.map((f) => ({ ...f, label: f.label.trim() || propLabel(f.key), required: f.key === 'email' ? true : f.required }))
    const body = { name: d.name.trim(), type: d.type, fields, lifecycleOnSubmit: d.lifecycleOnSubmit, ownerId: d.ownerId, updatedAt: now }
    if (isNew) {
      const nid = uid('form')
      db.insert('hubspot.forms', { id: nid, ...body, submissions: 0, views: 0, recent: [], createdAt: now, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
      toast('Form created. You can now test it in the preview.')
      go({ page: 'form', id: nid })
      return
    }
    db.update('hubspot.forms', id, body)
    setD((s) => ({ ...s, fields }))
    toast('Form saved.')
  }

  const submit = () => {
    if (isNew) return
    const e: Record<string, string> = {}
    for (const f of d.fields) {
      const v = (vals[f.key] ?? '').trim()
      if ((f.required || f.key === 'email') && !v) e[f.key] = 'Please complete this required field.'
      else if (f.key === 'email' && v && !EMAIL_RE.test(v)) e[f.key] = 'Email must be formatted correctly.'
    }
    setErrs(e)
    if (Object.keys(e).length) return
    const values: Record<string, string> = {}
    for (const f of d.fields) {
      const v = (vals[f.key] ?? '').trim()
      if (v) values[f.key] = v
    }
    const existed = db.get<any>('hubspot.contacts').some((c) => c.email?.toLowerCase() === values.email.toLowerCase())
    const cid = submitForm(id, values)
    if (!cid) {
      toast('Submission failed. Save the form and try again.')
      return
    }
    setDone({ contactId: cid, created: !existed })
    setVals({})
    toast(existed ? 'Form submitted: existing contact updated.' : 'Form submitted: new contact created.')
  }

  const doneContact = done ? contacts.find((c) => c.id === done.contactId) : undefined

  return (
    <div className="h-full min-h-[560px] flex flex-col bg-white">
      {/* header */}
      <div className="h-14 shrink-0 bg-[#213343] text-white flex items-center px-6 gap-4">
        <button onClick={() => go({ page: 'forms' })} className="flex items-center gap-1 text-[14px]" aria-label="Back to forms" data-agent="hs-form-back">
          <ChevronLeft size={16} /> Forms
        </button>
        <input
          data-agent="hs-form-name"
          aria-label="Form name"
          value={d.name}
          onChange={(e) => { setD((s) => ({ ...s, name: e.target.value })); if (e.target.value.trim()) setNameErr(false) }}
          placeholder="Untitled form"
          className={`flex-1 min-w-0 h-9 bg-transparent border-b border-dashed ${nameErr ? 'border-[#F2545B]' : 'border-[#7C98B6]'} outline-none text-[17px] font-medium placeholder:text-[#CBD6E2]`}
        />
        <span className="text-[13px] text-[#CBD6E2]">{d.type} form</span>
        {dirty && !isNew && <span className="text-[12.5px] text-[#FFB000]" data-agent="hs-form-unsaved">Unsaved changes</span>}
        <HBtn variant="primary" small agent="hs-form-save" label="Save form" onClick={save}>{isNew ? 'Create form' : 'Save'}</HBtn>
      </div>

      {/* tabs */}
      <div className="shrink-0 flex items-center gap-6 px-6 border-b border-[#DFE3EB] text-[14px] bg-white">
        {(['form', 'options', 'submissions'] as const).map((t) => (
          <button key={t} data-agent={`hs-form-tab-${t}`} onClick={() => setTab(t)} className={`h-11 relative ${tab === t ? 'font-semibold' : 'text-[#516F90]'}`}>
            {t === 'form' ? 'Form' : t === 'options' ? 'Options' : 'Submissions'}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#33475B]" />}
          </button>
        ))}
        <div className="flex-1" />
        {!isNew && (
          <span className="text-[13px] text-[#516F90]">
            <b className="text-[#33475B]">{(form.submissions ?? 0).toLocaleString()}</b> submissions · {(form.views ?? 0).toLocaleString()} views · {rate(form)} conversion
          </span>
        )}
      </div>

      {tab === 'form' && (
        <div className="flex-1 min-h-0 flex">
          {/* field list */}
          <div className="w-[400px] shrink-0 border-r border-[#DFE3EB] bg-[#F5F8FA] overflow-auto p-5">
            <div className="text-[16px] font-semibold mb-1">Form fields</div>
            <div className="text-[13px] text-[#516F90] mb-4">Each field maps to a contact property. Submissions create or update the contact with a matching email.</div>
            <div className="space-y-2">
              {d.fields.map((f, i) => (
                <div key={f.key} data-agent={`hs-form-edit-${f.key}`} className="bg-white border border-[#CBD6E2] rounded-[4px] p-3">
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-[#CBD6E2] shrink-0" />
                    <input
                      data-agent={`hs-form-label-${f.key}`}
                      aria-label={`${propLabel(f.key)} field label`}
                      value={f.label}
                      onChange={(e) => patchField(f.key, { label: e.target.value })}
                      className={`${inputH} flex-1 min-w-0 !h-8`}
                    />
                    <button data-agent={`hs-form-up-${f.key}`} aria-label={`Move ${propLabel(f.key)} up`} disabled={i === 0} onClick={() => move(i, -1)} className="w-7 h-7 flex items-center justify-center rounded-[3px] hover:bg-[#EAF0F6] disabled:opacity-30"><ChevronUp size={15} /></button>
                    <button data-agent={`hs-form-down-${f.key}`} aria-label={`Move ${propLabel(f.key)} down`} disabled={i === d.fields.length - 1} onClick={() => move(i, 1)} className="w-7 h-7 flex items-center justify-center rounded-[3px] hover:bg-[#EAF0F6] disabled:opacity-30"><ChevronDown size={15} /></button>
                    <button
                      data-agent={`hs-form-remove-${f.key}`}
                      aria-label={f.key === 'email' ? 'Email is required and cannot be removed' : `Remove ${propLabel(f.key)}`}
                      title={f.key === 'email' ? 'Email is required on every form' : undefined}
                      disabled={f.key === 'email'}
                      onClick={() => removeField(f.key)}
                      className="w-7 h-7 flex items-center justify-center rounded-[3px] text-[#7C98B6] hover:text-[#C93B44] hover:bg-[#FDEDEE] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#7C98B6]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pl-6 text-[12px]">
                    <span className="text-[#516F90] flex-1">Property: {propLabel(f.key)}</span>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        data-agent={`hs-form-required-${f.key}`}
                        aria-label={`${propLabel(f.key)} required`}
                        checked={f.key === 'email' || f.required}
                        disabled={f.key === 'email'}
                        onChange={(e) => patchField(f.key, { required: e.target.checked })}
                        className="accent-[#FF5C35]"
                      />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <select
              data-agent="hs-form-add-field"
              aria-label="Add field"
              value=""
              disabled={!unused.length}
              onChange={(e) => addField(e.target.value)}
              className="mt-3 w-full h-9 px-3 rounded-[3px] border border-dashed border-[#7C98B6] text-[13.5px] text-[#0091AE] font-medium bg-white outline-none disabled:opacity-50"
            >
              <option value="">{unused.length ? '+ Add field' : 'All contact properties added'}</option>
              {unused.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>

          {/* live preview */}
          <div className="flex-1 min-w-0 overflow-auto p-8" style={{ background: '#EAF0F6' }}>
            <div className="max-w-[540px] mx-auto">
              <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#516F90]">
                Live preview <Pill>{d.type}</Pill>
              </div>
              {isNew ? (
                <div className="mb-3 flex gap-2 p-3 rounded-[4px] bg-[#FFF8E5] border border-[#F5C26B] text-[13px]" data-agent="hs-form-preview-hint">
                  <Info size={15} className="shrink-0 mt-0.5" /> Save the form to test submissions from this preview.
                </div>
              ) : (
                dirty && (
                  <div className="mb-3 flex gap-2 p-3 rounded-[4px] bg-[#E5F5F8] border border-[#7FD1DE] text-[13px]">
                    <Info size={15} className="shrink-0 mt-0.5" /> Preview shows your unsaved changes. Submissions use the saved lifecycle stage and owner.
                  </div>
                )
              )}
              <div className="bg-white rounded-[6px] shadow-[0_2px_10px_rgba(45,62,80,0.12)] p-8" data-agent="hs-form-preview">
                {done ? (
                  <div className="text-center py-6" data-agent="hs-form-success">
                    <CircleCheck size={40} className="mx-auto text-[#00BDA5]" />
                    <div className="text-[18px] font-semibold mt-3">Thanks for submitting the form.</div>
                    <div className="text-[13px] text-[#516F90] mt-2">
                      {done.created ? 'New contact created: ' : 'Existing contact updated: '}
                      {doneContact ? (
                        <HLink agent="hs-form-success-contact" onClick={() => go({ page: 'contact', id: done.contactId })}>{`${doneContact.firstName} ${doneContact.lastName}`.trim() || doneContact.email}</HLink>
                      ) : (
                        <span>contact #{done.contactId}</span>
                      )}
                    </div>
                    <div className="mt-5">
                      <HLink agent="hs-form-submit-another" onClick={() => { setDone(null); setErrs({}) }}>Submit another response</HLink>
                    </div>
                  </div>
                ) : (
                  <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
                    <div className="text-[20px] font-semibold">{d.name.trim() || 'Untitled form'}</div>
                    {d.fields.map((f) => (
                      <div key={f.key}>
                        <label htmlFor={`hs-pv-${f.key}`} className="block text-[13px] font-semibold mb-1">
                          {f.label || propLabel(f.key)}
                          {(f.required || f.key === 'email') && <span className="text-[#F2545B]"> *</span>}
                        </label>
                        <input
                          id={`hs-pv-${f.key}`}
                          data-agent={`hs-form-field-${f.key}`}
                          aria-label={f.label || propLabel(f.key)}
                          aria-invalid={!!errs[f.key]}
                          type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'}
                          value={vals[f.key] ?? ''}
                          onChange={(e) => {
                            setVals((s) => ({ ...s, [f.key]: e.target.value }))
                            if (errs[f.key]) setErrs((s) => ({ ...s, [f.key]: '' }))
                          }}
                          className={`w-full h-10 px-3 rounded-[3px] border ${errs[f.key] ? 'border-[#F2545B] bg-[#FDEDEE]' : 'border-[#CBD6E2] bg-[#F5F8FA]'} text-[14px] outline-none focus:bg-white focus:border-[#00A4BD]`}
                        />
                        {errs[f.key] && <div className="text-[12px] text-[#F2545B] mt-1" role="alert">{errs[f.key]}</div>}
                      </div>
                    ))}
                    <button
                      type="submit"
                      data-agent="hs-form-submit"
                      aria-label="Submit form"
                      disabled={isNew}
                      title={isNew ? 'Save the form first' : undefined}
                      className="h-10 px-6 rounded-[3px] bg-[#FF7A59] hover:bg-[#FF8F73] text-white text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'options' && (
        <div className="flex-1 min-h-0 overflow-auto bg-[#F5F8FA] p-6">
          <div className="max-w-[640px] bg-white border border-[#DFE3EB] rounded-[4px] p-6 space-y-4">
            <div className="text-[16px] font-semibold">Form options</div>
            <Field label="Form name">
              <input data-agent="hs-form-options-name" aria-label="Form name" value={d.name} onChange={(e) => setD((s) => ({ ...s, name: e.target.value }))} placeholder="Untitled form" className={`${inputH} w-full ${nameErr ? '!border-[#F2545B]' : ''}`} />
            </Field>
            <Field label="Form type">
              <select data-agent="hs-form-type" aria-label="Form type" value={d.type} onChange={(e) => setD((s) => ({ ...s, type: e.target.value }))} className={`${selectH} w-full`}>
                {FORM_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Set lifecycle stage on submit" hint="New contacts get this stage. Existing contacts are only moved forward, never back.">
              <select data-agent="hs-form-lifecycle" aria-label="Lifecycle stage on submit" value={d.lifecycleOnSubmit} onChange={(e) => setD((s) => ({ ...s, lifecycleOnSubmit: e.target.value }))} className={`${selectH} w-full`}>
                {LIFECYCLE.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Contact owner for new contacts">
              <select data-agent="hs-form-owner" aria-label="Contact owner for new contacts" value={d.ownerId} onChange={(e) => setD((s) => ({ ...s, ownerId: e.target.value }))} className={`${selectH} w-full`}>
                {!OWNERS.some((o) => o.id === d.ownerId) && <option value={d.ownerId}>{person(d.ownerId).name}</option>}
                {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <div className="pt-2"><HBtn variant="primary" small onClick={save}>{isNew ? 'Create form' : 'Save'}</HBtn></div>
          </div>
        </div>
      )}

      {tab === 'submissions' && (
        <div className="flex-1 min-h-0 overflow-auto bg-[#F5F8FA] p-6">
          <div className="bg-white border border-[#DFE3EB] rounded-[4px]" data-agent="hs-form-submissions">
            <div className="flex gap-10 px-5 py-4 border-b border-[#DFE3EB] text-[13px]">
              {[['VIEWS', isNew ? '0' : (form.views ?? 0).toLocaleString()], ['SUBMISSIONS', isNew ? '0' : (form.submissions ?? 0).toLocaleString()], ['CONVERSION RATE', isNew ? '--' : rate(form)]].map(([k, v]) => (
                <div key={k}><div className="text-[12px] text-[#516F90]">{k}</div><div className="text-[18px] font-semibold">{v}</div></div>
              ))}
            </div>
            {isNew || !(form.recent ?? []).length ? (
              <div className="p-10 text-center text-[14px] text-[#516F90]">
                <div className="text-[16px] font-semibold text-[#33475B] mb-1">No recent submissions</div>
                {isNew ? 'Save the form to start collecting submissions.' : 'Submissions will appear here. Try the live preview on the Form tab.'}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead><tr>{['Contact', 'Email', 'Submitted'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(form.recent as { contactId: string; date: string }[]).map((r, i) => {
                    const c = contacts.find((x) => x.id === r.contactId)
                    const name = c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email : 'Deleted contact'
                    return (
                      <tr key={i} className="hover:bg-[#F5F8FA]">
                        <td className={td}>
                          <span className="flex items-center gap-2">
                            <Initials name={name} size={24} />
                            {c ? <HLink agent={`hs-form-sub-${i}`} onClick={() => go({ page: 'contact', id: c.id })}>{name}</HLink> : <span className="text-[#516F90]">{name}</span>}
                          </span>
                        </td>
                        <td className={td}>{c?.email ?? '--'}</td>
                        <td className={td}>{hsDate(r.date, true)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
