/** Envelope action menu + the dialogs behind it (void, correct, move, view document, certificate). */
import { useState } from 'react'
import { Ban, Copy, Download, FileEdit, FolderInput, History, LayoutTemplate, PenLine, Printer, RotateCcw, Send, Trash2, Award, Plus } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import type { Nav } from './index'
import { Btn, fmtDT, isMine, isWaiting, type Envelope } from './shared'
import { DEFAULT_FOLDERS, env } from './actions'
import { Modal, ConfirmFooter, inputCls, useToast, type MenuItem } from './ui'
import { DocPage } from './Document'

export function useFolders() {
  const extra = useCollection<{ id: string; name: string }>('docusign.folders')
  return [...DEFAULT_FOLDERS, ...extra.map((f) => ({ id: f.id, name: f.name, match: undefined as RegExp | undefined }))]
}

type ModalState = { kind: 'void' | 'correct' | 'move' | 'doc' | 'cert'; ids: string[]; doc?: string } | null

export function useEnvActions(nav: Nav) {
  const toast = useToast()
  const [modal, setModal] = useState<ModalState>(null)

  const run = {
    sign: (e: Envelope) => nav.go({ page: 'sign', id: e.id }),
    continue: (e: Envelope) => nav.send(e.templateId, { envelopeId: e.id }),
    resend: (e: Envelope) => {
      env.resend(e.id)
      toast('Envelope resent', `Reminder emailed to ${e.recipients.filter((r) => r.role !== 'cc' && (r.status === 'sent' || r.status === 'delivered')).map((r) => r.name).join(', ') || 'recipients'}`)
    },
    download: (e: Envelope) => toast('Download started', `${e.documents.map((d) => d.name).join(', ')}${e.status === 'completed' ? ' + Certificate of Completion' : ''}`),
    print: (e: Envelope) => toast('Sent to printer', `${e.documents[0]?.name ?? 'Document'} — ${e.documents[0]?.pages ?? 1} pages`),
    void: (e: Envelope) => setModal({ kind: 'void', ids: [e.id] }),
    correct: (e: Envelope) => setModal({ kind: 'correct', ids: [e.id] }),
    move: (ids: string[]) => setModal({ kind: 'move', ids }),
    view: (e: Envelope, doc?: string) => setModal({ kind: 'doc', ids: [e.id], doc: doc ?? e.documents[0]?.name }),
    cert: (e: Envelope) => setModal({ kind: 'cert', ids: [e.id] }),
    copy: (e: Envelope) => {
      const id = env.copy(e.id)
      if (id) nav.send(e.templateId, { envelopeId: id })
    },
    saveAsTemplate: (e: Envelope) => {
      const id = env.saveAsTemplate(e.id)
      if (id) {
        toast('Template created', 'You can now edit roles and fields before sharing it.')
        nav.go({ page: 'template', id })
      }
    },
    remove: (ids: string[]) => {
      ids.forEach((id) => env.remove(id))
      toast(ids.length > 1 ? `${ids.length} envelopes deleted` : 'Envelope deleted', 'You can restore deleted envelopes from the Deleted folder.')
    },
    restore: (ids: string[]) => {
      ids.forEach((id) => env.restore(id))
      toast(ids.length > 1 ? `${ids.length} envelopes restored` : 'Envelope restored')
    },
    history: (e: Envelope) => nav.go({ page: 'details', id: e.id }),
  }

  const items = (e: Envelope): MenuItem[] => {
    const list: MenuItem[] = []
    if (e.status === 'action') list.push({ label: 'Sign', icon: PenLine, onClick: () => run.sign(e) })
    if (e.status === 'draft') list.push({ label: 'Continue', icon: FileEdit, onClick: () => run.continue(e) })
    if (isWaiting(e) && isMine(e)) {
      list.push({ label: 'Correct', icon: FileEdit, onClick: () => run.correct(e) })
      list.push({ label: 'Resend', icon: Send, onClick: () => run.resend(e) })
    }
    list.push({ label: 'Move', icon: FolderInput, onClick: () => run.move([e.id]) })
    if (e.status !== 'draft') list.push({ label: 'Download', icon: Download, onClick: () => run.download(e) })
    list.push({ label: 'Print', icon: Printer, onClick: () => run.print(e) })
    list.push({ label: 'History', icon: History, onClick: () => run.history(e) })
    if (e.status === 'completed') list.push({ label: 'View Certificate', icon: Award, onClick: () => run.cert(e) })
    list.push('sep')
    list.push({ label: 'Copy', icon: Copy, onClick: () => run.copy(e) })
    list.push({ label: 'Save as Template', icon: LayoutTemplate, onClick: () => run.saveAsTemplate(e) })
    if ((isWaiting(e) || e.status === 'action') && isMine(e)) list.push({ label: 'Void', icon: Ban, danger: true, onClick: () => run.void(e) })
    if (e.deleted) list.push({ label: 'Restore', icon: RotateCcw, onClick: () => run.restore([e.id]) })
    else list.push({ label: 'Delete', icon: Trash2, danger: true, onClick: () => run.remove([e.id]) })
    return list
  }

  const close = () => setModal(null)
  const ui = modal ? (
    modal.kind === 'void' ? (
      <VoidModal id={modal.ids[0]} onClose={close} done={() => toast('Envelope voided', 'Recipients were notified by email.')} />
    ) : modal.kind === 'correct' ? (
      <CorrectModal id={modal.ids[0]} onClose={close} done={() => toast('Envelope corrected', 'Recipients who have not signed yet received the updated envelope.')} />
    ) : modal.kind === 'move' ? (
      <MoveModal ids={modal.ids} onClose={close} done={(n) => toast(`Moved to ${n}`)} />
    ) : modal.kind === 'doc' ? (
      <DocViewer id={modal.ids[0]} doc={modal.doc} onClose={close} onDownload={(e) => run.download(e)} onPrint={(e) => run.print(e)} />
    ) : (
      <Certificate id={modal.ids[0]} onClose={close} onDownload={(e) => run.download(e)} />
    )
  ) : null

  return { run, items, ui }
}

function VoidModal({ id, onClose, done }: { id: string; onClose: () => void; done: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal
      title="Void Envelope"
      onClose={onClose}
      agent="docusign-void-dialog"
      footer={
        <ConfirmFooter
          onCancel={onClose}
          ok="Void"
          danger
          agent="docusign-void-confirm"
          disabled={!reason.trim()}
          onOk={() => {
            env.void(id, reason.trim())
            onClose()
            done()
          }}
        />
      }
    >
      <div className="text-[#3D3551] mb-3">Voiding cancels the envelope. Recipients can no longer view or sign it and will receive an email with your reason.</div>
      <label className="block">
        <span className="block mb-1 text-[13px] font-medium">
          Reason for voiding <span className="text-[#D11F3B]">*</span>
        </span>
        <textarea data-agent="docusign-void-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={`${inputCls} h-24 py-2 resize-none`} />
      </label>
    </Modal>
  )
}

function CorrectModal({ id, onClose, done }: { id: string; onClose: () => void; done: () => void }) {
  const e = db.find<Envelope>('docusign.envelopes', id)
  const [subject, setSubject] = useState(e?.subject ?? '')
  const [message, setMessage] = useState(e?.message ?? '')
  const [rcps, setRcps] = useState(e?.recipients ?? [])
  const [exp, setExp] = useState(e?.expiresAt ? e.expiresAt.slice(0, 10) : '')
  if (!e) return null
  const locked = (r: Envelope['recipients'][number]) => r.status === 'signed' || r.status === 'completed' || r.status === 'declined'
  const set = (i: number, patch: Partial<Envelope['recipients'][number]>) => setRcps((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <Modal
      title="Correct Envelope"
      width={720}
      onClose={onClose}
      agent="docusign-correct-dialog"
      footer={
        <ConfirmFooter
          onCancel={onClose}
          ok="Correct"
          agent="docusign-correct-save"
          disabled={!subject.trim() || rcps.some((r) => !r.name.trim() || !r.email.trim())}
          onOk={() => {
            env.correct(id, { subject, message, recipients: rcps, expiresAt: exp ? new Date(exp + 'T23:59:00').toISOString() : e.expiresAt })
            onClose()
            done()
          }}
        />
      }
    >
      <div className="text-[13px] font-semibold mb-2">Recipients</div>
      <div className="space-y-2 mb-5">
        {rcps.map((r, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_1fr_150px] gap-2 items-center">
            <span className="w-6 h-6 rounded-full border border-[#CBC4D6] text-[12px] flex items-center justify-center text-[#5E5873]">{r.order}</span>
            <input aria-label={`Correct recipient ${i + 1} name`} disabled={locked(r)} value={r.name} onChange={(ev) => set(i, { name: ev.target.value })} className={`${inputCls} disabled:bg-[#F7F6FA] disabled:text-[#8B8698]`} />
            <input aria-label={`Correct recipient ${i + 1} email`} disabled={locked(r)} value={r.email} onChange={(ev) => set(i, { email: ev.target.value })} className={`${inputCls} disabled:bg-[#F7F6FA] disabled:text-[#8B8698]`} />
            <span className="text-[12.5px] text-[#5E5873]">{locked(r) ? `Locked — ${r.status}` : r.role === 'cc' ? 'Receives a Copy' : 'Needs to Sign'}</span>
          </div>
        ))}
      </div>
      <label className="block mb-3">
        <span className="block mb-1 text-[13px] font-medium">Email Subject</span>
        <input value={subject} onChange={(ev) => setSubject(ev.target.value)} maxLength={100} className={inputCls} />
      </label>
      <label className="block mb-3">
        <span className="block mb-1 text-[13px] font-medium">Email Message</span>
        <textarea value={message} onChange={(ev) => setMessage(ev.target.value)} className={`${inputCls} h-24 py-2 resize-none`} />
      </label>
      <label className="block">
        <span className="block mb-1 text-[13px] font-medium">Expires on</span>
        <input type="date" value={exp} onChange={(ev) => setExp(ev.target.value)} className={`${inputCls} w-[200px]`} />
      </label>
    </Modal>
  )
}

function MoveModal({ ids, onClose, done }: { ids: string[]; onClose: () => void; done: (name: string) => void }) {
  const folders = useFolders()
  const [sel, setSel] = useState<string>(folders[0]?.id)
  const [name, setName] = useState('')
  const add = () => {
    if (!name.trim()) return
    const id = uid('fld')
    db.insert('docusign.folders', { id, name: name.trim(), createdBy: ME.email })
    setSel(id)
    setName('')
  }
  return (
    <Modal
      title={`Move ${ids.length > 1 ? `${ids.length} envelopes` : 'envelope'}`}
      onClose={onClose}
      agent="docusign-move-dialog"
      footer={
        <ConfirmFooter
          onCancel={onClose}
          ok="Move"
          agent="docusign-move-confirm"
          disabled={!sel}
          onOk={() => {
            const f = folders.find((x) => x.id === sel)
            if (f) ids.forEach((id) => env.move(id, f.id, f.name))
            onClose()
            if (f) done(f.name)
          }}
        />
      }
    >
      <div className="rounded-md border border-[#E5E1EC] divide-y divide-[#F0EDF4] mb-4">
        {folders.map((f) => (
          <label key={f.id} className="flex items-center gap-3 px-3 h-10 cursor-pointer hover:bg-[#FAF9FC]">
            <input type="radio" checked={sel === f.id} onChange={() => setSel(f.id)} className="accent-[#4C00FF] w-4 h-4" />
            {f.name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="New folder name" className={inputCls} />
        <Btn onClick={add} disabled={!name.trim()}>
          <Plus size={16} /> New Folder
        </Btn>
      </div>
    </Modal>
  )
}

function DocViewer({ id, doc, onClose, onDownload, onPrint }: { id: string; doc?: string; onClose: () => void; onDownload: (e: Envelope) => void; onPrint: (e: Envelope) => void }) {
  const e = db.find<Envelope>('docusign.envelopes', id)
  if (!e) return null
  const d = e.documents.find((x) => x.name === doc) ?? e.documents[0]
  const scale = 0.86
  return (
    <Modal
      title={d?.name ?? 'Document'}
      width={700}
      onClose={onClose}
      agent="docusign-doc-viewer"
      footer={
        <>
          <Btn onClick={() => onPrint(e)}>
            <Printer size={16} /> Print
          </Btn>
          <Btn onClick={() => onDownload(e)}>
            <Download size={16} /> Download
          </Btn>
          <Btn kind="primary" onClick={onClose}>
            Close
          </Btn>
        </>
      }
    >
      <div className="bg-[#F7F6FA] -mx-6 -my-5 py-5 flex flex-col items-center gap-4">
        {Array.from({ length: Math.min(d?.pages ?? 1, 3) }).map((_, i) => (
          <div key={i} style={{ width: 720 * scale, height: 932 * scale }} className="overflow-hidden">
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <DocPage file={d?.name ?? ''} page={i + 1} />
            </div>
          </div>
        ))}
        {(d?.pages ?? 0) > 3 && <div className="text-[12.5px] text-[#5E5873]">Showing 3 of {d?.pages} pages</div>}
      </div>
    </Modal>
  )
}

function Certificate({ id, onClose, onDownload }: { id: string; onClose: () => void; onDownload: (e: Envelope) => void }) {
  const e = db.find<Envelope>('docusign.envelopes', id)
  if (!e) return null
  return (
    <Modal
      title="Certificate of Completion"
      width={720}
      onClose={onClose}
      agent="docusign-certificate"
      footer={
        <>
          <Btn onClick={() => onDownload(e)}>
            <Download size={16} /> Download
          </Btn>
          <Btn kind="primary" onClick={onClose}>
            Close
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[13px] mb-4">
        <span className="text-[#5E5873]">Envelope Id</span>
        <span className="font-mono">{e.id}</span>
        <span className="text-[#5E5873]">Subject</span>
        <span>{e.subject}</span>
        <span className="text-[#5E5873]">Envelope Originator</span>
        <span>
          {e.senderName} ({e.sender})
        </span>
        <span className="text-[#5E5873]">Status</span>
        <span className="font-semibold text-[#00805A]">Completed {fmtDT(e.completedAt)}</span>
        <span className="text-[#5E5873]">Documents</span>
        <span>
          {e.documents.length} · {e.documents.reduce((n, d) => n + d.pages, 0)} pages
        </span>
      </div>
      <table className="w-full text-[13px] mb-4">
        <thead>
          <tr className="text-left text-[12px] text-[#5E5873] border-b border-[#CBC4D6]">
            <th className="py-1.5">Signer Events</th>
            <th className="py-1.5">Signature</th>
            <th className="py-1.5">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {e.recipients
            .filter((r) => r.role !== 'cc')
            .map((r, i) => (
              <tr key={i} className="border-b border-[#F0EDF4]">
                <td className="py-2">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[#5E5873]">{r.email}</div>
                  <div className="text-[11.5px] text-[#8B8698]">Security Level: Email, Account Authentication (None)</div>
                </td>
                <td className="py-2 text-[20px]" style={{ fontFamily: "'Brush Script MT','Segoe Script','Lucida Handwriting',cursive" }}>
                  {r.name}
                </td>
                <td className="py-2 text-[12.5px]">
                  Sent: {fmtDT(e.sentAt)}
                  <br />
                  Signed: {fmtDT(r.at ?? e.completedAt)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <div className="text-[13px] font-semibold mb-1">Envelope Summary Events</div>
      {e.history.map((h, i) => (
        <div key={i} className="flex justify-between gap-4 text-[12.5px] py-1 border-b border-[#F7F6FA]">
          <span>
            <b>{h.action}</b> — {h.detail}
          </span>
          <span className="text-[#8B8698] shrink-0">{fmtDT(h.at)}</span>
        </div>
      ))}
    </Modal>
  )
}

