/** Envelope & template mutations (persisted in the demo DB). */
import { db, uid } from '@/db/db'
import { ME } from '@/data/people'
import type { Envelope, Template } from './shared'
import { guidFor } from './seed'

const now = () => new Date().toISOString()
const hist = (action: string, detail: string, by = ME.name) => ({ at: now(), action, by, detail })
const push = (id: string, patch: (e: Envelope) => Partial<Envelope>) => db.update('docusign.envelopes', id, (r) => patch(r as Envelope))

export const newGuid = () => guidFor(Math.floor(Math.random() * 1e7) + 5000)

/** custom envelope folders (shown under "Folders"). The first three exist out of the box. */
export const DEFAULT_FOLDERS: { id: string; name: string; match?: RegExp }[] = [
  { id: 'fld-contoso', name: 'Contoso', match: /contoso/i },
  { id: 'fld-hr', name: 'HR — Onboarding', match: /offer letter|handbook|onboarding form —|contractor agreement/i },
  { id: 'fld-vendor', name: 'Vendor Contracts', match: /vendor|msa|sow|change_order|supply/i },
]

export function inCustomFolder(e: Envelope, f: { id: string; match?: RegExp }) {
  if (e.deleted) return false
  if (e.folderId) return e.folderId === f.id
  return !!f.match && f.match.test(e.subject)
}

export const env = {
  void(id: string, reason: string) {
    push(id, (e) => ({ status: 'voided', voidReason: reason, lastChange: now(), history: [...e.history, hist('Voided', `Envelope voided: ${reason}`)] }))
  },
  resend(id: string) {
    push(id, (e) => {
      const pending = e.recipients.filter((r) => r.role !== 'cc' && (r.status === 'sent' || r.status === 'delivered'))
      return { lastChange: now(), history: [...e.history, hist('Resent', `Envelope resent to ${pending.map((r) => r.name).join(', ') || 'recipients'}`)] }
    })
  },
  correct(id: string, patch: { subject: string; message: string; recipients: Envelope['recipients']; expiresAt?: string }) {
    push(id, (e) => ({ ...patch, lastChange: now(), history: [...e.history, hist('Corrected', 'Envelope corrected and resent to recipients who have not yet signed')] }))
  },
  remove(id: string) {
    push(id, (e) => ({ deleted: true, lastChange: now(), history: [...e.history, hist('Deleted', 'Envelope moved to Deleted')] }))
  },
  restore(id: string) {
    push(id, (e) => ({ deleted: false, lastChange: now(), history: [...e.history, hist('Restored', 'Envelope restored from Deleted')] }))
  },
  move(id: string, folderId: string, folderName: string) {
    push(id, (e) => ({ folderId, deleted: false, history: [...e.history, hist('Moved', `Moved to folder “${folderName}”`)] }))
  },
  /** duplicate as a new draft and return its id */
  copy(id: string) {
    const e = db.find<Envelope>('docusign.envelopes', id)
    if (!e) return null
    const nid = newGuid()
    const t = now()
    db.insert(
      'docusign.envelopes',
      {
        id: nid,
        subject: e.subject,
        message: e.message,
        status: 'draft',
        templateId: e.templateId,
        documents: e.documents,
        recipients: e.recipients.map((r) => ({ ...r, status: 'created', at: undefined })),
        sender: ME.email,
        senderName: ME.name,
        createdAt: t,
        lastChange: t,
        fields: [],
        history: [hist('Created', `Envelope copied from ${e.id}`)],
      },
      { prepend: true },
    )
    return nid
  },
  /** save an envelope as a reusable template and return the template id */
  saveAsTemplate(id: string) {
    const e = db.find<Envelope>('docusign.envelopes', id)
    if (!e) return null
    const tid = uid('tpl')
    const t = now()
    db.insert('docusign.templates', {
      id: tid,
      name: e.subject.replace(/^(Please DocuSign|Complete with Docusign): /, '').replace(/\.pdf$/i, '').replace(/_/g, ' '),
      description: `Created from envelope ${e.id.slice(0, 8)}`,
      documents: e.documents,
      roles: e.recipients.map((r, i) => ({ roleName: r.role === 'cc' ? `Copy ${i + 1}` : `Signer ${i + 1}`, name: '', email: '', role: r.role })),
      subject: e.subject,
      message: e.message,
      owner: ME.name,
      folder: 'Operations',
      createdAt: t,
      updatedAt: t,
      shared: false,
      uses: 0,
    })
    return tid
  },
  /** current user signs. Completes the envelope when every signer is done. */
  sign(id: string) {
    push(id, (e) => {
      const t = now()
      const recipients = e.recipients.map((r) => (r.email === ME.email && r.role !== 'cc' && r.status !== 'signed' && r.status !== 'completed' ? { ...r, status: 'signed', at: t } : r))
      const signers = recipients.filter((r) => r.role !== 'cc')
      const done = signers.every((r) => r.status === 'signed' || r.status === 'completed')
      const history = [...e.history, hist('Viewed', `Viewed by ${ME.name}`), hist('Signed', `Signed by ${ME.name} (${ME.email})`)]
      if (done) {
        history.push(hist('Completed', 'Envelope completed. Certificate of Completion generated.', 'Docusign System'))
        return { status: 'completed', completedAt: t, lastChange: t, history, recipients: recipients.map((r) => ({ ...r, status: 'completed', at: r.at ?? t })) }
      }
      return { status: 'sent', lastChange: t, history, recipients }
    })
  },
  decline(id: string, reason: string) {
    push(id, (e) => {
      const t = now()
      return {
        status: 'declined',
        declineReason: reason,
        lastChange: t,
        recipients: e.recipients.map((r) => (r.email === ME.email && r.role !== 'cc' ? { ...r, status: 'declined', at: t } : r)),
        history: [...e.history, hist('Declined', reason)],
      }
    })
  },
}

export const tpl = {
  save(t: Template) {
    if (db.find('docusign.templates', t.id)) db.update('docusign.templates', t.id, { ...t, updatedAt: now() })
    else db.insert('docusign.templates', { ...t, createdAt: now(), updatedAt: now() }, { prepend: true })
  },
  duplicate(id: string) {
    const t = db.find<Template>('docusign.templates', id)
    if (!t) return null
    const nid = uid('tpl')
    db.insert('docusign.templates', { ...t, id: nid, name: `Copy of ${t.name}`, owner: ME.name, shared: false, uses: 0, createdAt: now(), updatedAt: now(), deleted: false }, { prepend: true })
    return nid
  },
  remove(id: string) {
    db.update('docusign.templates', id, { deleted: true, updatedAt: now() })
  },
  restore(id: string) {
    db.update('docusign.templates', id, { deleted: false, updatedAt: now() })
  },
  toggleFav(t: Template) {
    db.update('docusign.templates', t.id, { favorite: !isFavTemplate(t) })
  },
  toggleShare(t: Template) {
    db.update('docusign.templates', t.id, { shared: !t.shared, updatedAt: now() })
  },
}

export const isFavTemplate = (t: Template) => t.favorite ?? t.uses > 100
