import { useMemo, useState } from 'react'
import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronLeft,
  Folder,
  Plus,
  SlidersHorizontal,
  Download,
  Eye,
  PenLine,
  Copy,
  Printer,
  History,
  X,
  Mail,
  User,
} from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import type { Nav } from './index'
import { Btn, C, HWorkerChip, StartButton, StatusLabel, fmtD, fmtDT, fmtT, inInbox, isExpiring, isMine, isWaiting, type Envelope, type Template } from './shared'
import { DocThumb } from './Document'
import { inCustomFolder } from './actions'
import { useEnvActions, useFolders } from './envActions'
import { ConfirmFooter, Menu, Modal, inputCls } from './ui'

export const FOLDERS: { key: string; label: string; Icon: any; test: (e: Envelope) => boolean; group: string }[] = [
  { key: 'inbox', label: 'Inbox', Icon: Inbox, test: (e) => !e.deleted && inInbox(e), group: 'Envelopes' },
  { key: 'sent', label: 'Sent', Icon: Send, test: (e) => !e.deleted && isMine(e) && e.status !== 'draft', group: 'Envelopes' },
  { key: 'drafts', label: 'Drafts', Icon: FileEdit, test: (e) => !e.deleted && e.status === 'draft', group: 'Envelopes' },
  { key: 'deleted', label: 'Deleted', Icon: Trash2, test: (e) => !!e.deleted, group: 'Envelopes' },
  { key: 'action', label: 'Action Required', Icon: AlertCircle, test: (e) => !e.deleted && e.status === 'action', group: 'Quick Views' },
  { key: 'waiting', label: 'Waiting for Others', Icon: Clock, test: (e) => !e.deleted && isWaiting(e) && isMine(e), group: 'Quick Views' },
  { key: 'expiring', label: 'Expiring Soon', Icon: AlertTriangle, test: (e) => !e.deleted && isExpiring(e), group: 'Quick Views' },
  { key: 'completed', label: 'Completed', Icon: CheckCircle2, test: (e) => !e.deleted && e.status === 'completed', group: 'Quick Views' },
  { key: 'authfailed', label: 'Authentication Failed', Icon: ShieldAlert, test: () => false, group: 'Quick Views' },
]

function NewFolderModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const save = () => {
    if (!name.trim()) return
    db.insert('docusign.folders', { id: uid('fld'), name: name.trim(), createdBy: ME.email })
    onClose()
  }
  return (
    <Modal title="New Folder" onClose={onClose} footer={<ConfirmFooter onCancel={onClose} onOk={save} ok="Create" disabled={!name.trim()} agent="docusign-folder-create" />}>
      <label className="block">
        <span className="block mb-1 text-[13px] font-medium">Folder name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className={inputCls} />
      </label>
    </Modal>
  )
}

function Sidebar({ nav, folder, envs }: { nav: Nav; folder: string; envs: Envelope[] }) {
  const groups = ['Envelopes', 'Quick Views']
  const folders = useFolders()
  const [creating, setCreating] = useState(false)
  return (
    <aside className="w-[248px] shrink-0 border-r border-[#E5E1EC] bg-white overflow-auto py-5 px-4">
      <StartButton wide {...nav.start} />
      {groups.map((g) => (
        <div key={g} className="mt-6">
          <div className="px-2 mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8B8698]">{g}</div>
          {FOLDERS.filter((f) => f.group === g).map((f) => {
            const active = f.key === folder
            const n = envs.filter(f.test).length
            const showCount = ['inbox', 'action', 'waiting', 'expiring', 'drafts'].includes(f.key) && n > 0
            return (
              <button
                key={f.key}
                data-agent={`docusign-folder-${f.key}`}
                aria-label={f.label}
                onClick={() => nav.go({ page: 'agreements', folder: f.key })}
                className={`w-full flex items-center gap-3 h-9 px-2 rounded-[4px] text-[14px] ${active ? 'bg-[#F0EBFF] text-[#130032] font-semibold' : 'text-[#3D3551] hover:bg-[#F5F3F8]'}`}
              >
                <f.Icon size={17} className={active ? 'text-[#4C00FF]' : 'text-[#5E5873]'} />
                <span className="flex-1 text-left truncate">{f.label}</span>
                {showCount && <span className={`text-[12.5px] ${f.key === 'action' ? 'font-semibold text-[#4C00FF]' : 'text-[#5E5873]'}`}>{n}</span>}
              </button>
            )
          })}
        </div>
      ))}
      <div className="mt-6">
        <div className="px-2 mb-1.5 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide text-[#8B8698]">
          Folders
          <button data-agent="docusign-folder-new" aria-label="New folder" onClick={() => setCreating(true)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#F2F0F5] text-[#5E5873]">
            <Plus size={15} />
          </button>
        </div>
        {folders.map((f) => {
          const key = `f:${f.id}`
          const active = folder === key
          const n = envs.filter((e) => inCustomFolder(e, f)).length
          return (
            <button
              key={f.id}
              data-agent={`docusign-custom-folder-${f.id}`}
              onClick={() => nav.go({ page: 'agreements', folder: key })}
              className={`w-full flex items-center gap-3 h-9 px-2 rounded-[4px] text-[14px] ${active ? 'bg-[#F0EBFF] text-[#130032] font-semibold' : 'text-[#3D3551] hover:bg-[#F5F3F8]'}`}
            >
              <Folder size={17} className={active ? 'text-[#4C00FF]' : 'text-[#5E5873]'} />
              <span className="flex-1 text-left truncate">{f.name}</span>
              {n > 0 && <span className="text-[12.5px] text-[#8B8698]">{n}</span>}
            </button>
          )
        })}
      </div>
      <div className="mt-6 px-2 text-[12px] font-semibold uppercase tracking-wide text-[#8B8698]">More</div>
      {(
        [
          ['PowerForms', 'powerforms'],
          ['Bulk Send', 'bulk'],
          ['Web Forms', 'webforms'],
        ] as const
      ).map(([l, k]) => (
        <button key={k} data-agent={`docusign-more-${k}`} onClick={() => nav.go({ page: 'forms', kind: k })} className="w-full flex items-center h-9 px-2 rounded-[4px] text-[14px] text-[#3D3551] hover:bg-[#F5F3F8]">
          {l}
        </button>
      ))}
      {creating && <NewFolderModal onClose={() => setCreating(false)} />}
    </aside>
  )
}

function rowAction(e: Envelope): string {
  if (e.status === 'action') return 'Sign'
  if (e.status === 'draft') return 'Continue'
  if (isWaiting(e)) return 'Resend'
  if (e.status === 'completed') return 'Download'
  return 'Move'
}

const DATE_OPTS: [string, number][] = [
  ['Last 7 Days', 7],
  ['Last 30 Days', 30],
  ['Last 6 Months', 183],
  ['Last 12 Months', 365],
  ['All', 0],
]
const STATUS_OPTS: [string, (e: Envelope) => boolean][] = [
  ['All', () => true],
  ['Need to Sign', (e) => e.status === 'action'],
  ['Waiting for Others', isWaiting],
  ['Completed', (e) => e.status === 'completed'],
  ['Draft', (e) => e.status === 'draft'],
  ['Declined', (e) => e.status === 'declined'],
  ['Voided', (e) => e.status === 'voided'],
]
const SENDER_OPTS: [string, (e: Envelope) => boolean][] = [
  ['All', () => true],
  ['Me', isMine],
  ['Others', (e) => !isMine(e)],
]

function Chip({ label, value, def, options, onPick, agent }: { label: string; value: string; def: string; options: string[]; onPick: (v: string) => void; agent: string }) {
  return (
    <Menu
      align="left"
      width={200}
      trigger={(t, open) => (
        <button data-agent={agent} onClick={t} className={`h-8 px-3 rounded-full border text-[13px] flex items-center gap-1.5 hover:bg-[#F5F3F8] ${open || value !== def ? 'border-[#4C00FF] text-[#4C00FF]' : 'border-[#CBC4D6]'}`}>
          {label}: {value} <ChevronDown size={14} />
        </button>
      )}
      items={options.map((o) => ({ label: o === value ? `✓  ${o}` : `    ${o}`, onClick: () => onPick(o) }))}
    />
  )
}

export function Agreements({ nav, folder }: { nav: Nav; folder: string }) {
  const envs = useCollection<Envelope>('docusign.envelopes')
  const templates = useCollection<Template>('docusign.templates')
  const folders = useFolders()
  const acts = useEnvActions(nav)
  const [q, setQ] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [date, setDate] = useState('Last 6 Months')
  const [status, setStatus] = useState('All')
  const [sender, setSender] = useState('All')
  const [adv, setAdv] = useState(false)
  const [tplF, setTplF] = useState('')
  const [hwOnly, setHwOnly] = useState(false)
  const custom = folder.startsWith('f:') ? folders.find((x) => `f:${x.id}` === folder) : undefined
  const f = custom
    ? { key: folder, label: custom.name, Icon: Folder, test: (e: Envelope) => inCustomFolder(e, custom), group: 'Folders' }
    : (FOLDERS.find((x) => x.key === folder) ?? FOLDERS[0])
  const rows = useMemo(() => {
    const days = DATE_OPTS.find((d) => d[0] === date)?.[1] ?? 0
    const st = STATUS_OPTS.find((s) => s[0] === status)?.[1] ?? (() => true)
    const sd = SENDER_OPTS.find((s) => s[0] === sender)?.[1] ?? (() => true)
    return envs
      .filter(f.test)
      .filter((e) => !days || !!q || e.status === 'action' || +new Date(e.lastChange) > Date.now() - days * 86400_000)
      .filter(st)
      .filter(sd)
      .filter((e) => !tplF || e.templateId === tplF)
      .filter((e) => !hwOnly || e.createdBy === 'hworker')
      .filter((e) => !q || (e.subject + ' ' + e.recipients.map((r) => r.name + ' ' + r.email).join(' ')).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => +new Date(b.lastChange) - +new Date(a.lastChange))
  }, [envs, folder, q, date, status, sender, tplF, hwOnly, folders.length])
  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const sel = rows.filter((r) => checked.has(r.id))
  const filtered = date !== 'Last 6 Months' || status !== 'All' || sender !== 'All' || !!tplF || hwOnly
  const primary = (e: Envelope, act: string) => {
    if (act === 'Sign') acts.run.sign(e)
    else if (act === 'Continue') acts.run.continue(e)
    else if (act === 'Resend') acts.run.resend(e)
    else if (act === 'Download') acts.run.download(e)
    else acts.run.move([e.id])
  }

  return (
    <div className="flex-1 min-h-0 flex relative">
      <Sidebar nav={nav} folder={folder} envs={envs} />
      <main className="flex-1 min-w-0 flex flex-col bg-white">
        <div className="px-8 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-[24px] font-semibold tracking-tight">{f.label}</h1>
            <div className="flex-1" />
            <div className="flex items-center gap-2 w-[340px] h-9 px-3 rounded-[4px] border border-[#CBC4D6] focus-within:border-[#4C00FF] focus-within:shadow-[0_0_0_1px_#4C00FF]">
              <Search size={16} className="text-[#5E5873]" />
              <input
                data-agent="docusign-search"
                aria-label="Search Inbox and Folders"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search Inbox and Folders"
                className="flex-1 outline-none text-[14px] bg-transparent placeholder:text-[#8B8698]"
              />
              {q && (
                <button aria-label="Clear search" onClick={() => setQ('')} className="text-[#8B8698] hover:text-[#130032]">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Chip agent="docusign-filter-date" label="Date" value={date} def="Last 6 Months" options={DATE_OPTS.map((d) => d[0])} onPick={setDate} />
            <Chip agent="docusign-filter-status" label="Status" value={status} def="All" options={STATUS_OPTS.map((d) => d[0])} onPick={setStatus} />
            <Chip agent="docusign-filter-sender" label="Sender" value={sender} def="All" options={SENDER_OPTS.map((d) => d[0])} onPick={setSender} />
            <button data-agent="docusign-filter-more" onClick={() => setAdv((a) => !a)} className={`h-8 px-3 rounded-full text-[13px] font-semibold text-[#4C00FF] flex items-center gap-1.5 hover:bg-[#F2EDFF] ${adv ? 'bg-[#F2EDFF]' : ''}`}>
              <SlidersHorizontal size={14} /> Filters
            </button>
            {filtered && (
              <button
                onClick={() => {
                  setDate('Last 6 Months')
                  setStatus('All')
                  setSender('All')
                  setTplF('')
                  setHwOnly(false)
                }}
                className="h-8 px-2 text-[13px] text-[#5E5873] hover:underline"
              >
                Clear
              </button>
            )}
            <div className="flex-1" />
            {checked.size > 0 && (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-[#5E5873]">{sel.length} selected</span>
                <Btn className="h-8 text-[13px]" onClick={() => acts.run.move(sel.map((e) => e.id))}>
                  Move
                </Btn>
                <Btn className="h-8 text-[13px]" onClick={() => sel.forEach((e) => acts.run.download(e))}>
                  Download
                </Btn>
                {folder === 'deleted' ? (
                  <Btn
                    className="h-8 text-[13px]"
                    onClick={() => {
                      acts.run.restore(sel.map((e) => e.id))
                      setChecked(new Set())
                    }}
                  >
                    Restore
                  </Btn>
                ) : (
                  <Btn
                    className="h-8 text-[13px]"
                    onClick={() => {
                      acts.run.remove(sel.map((e) => e.id))
                      setChecked(new Set())
                    }}
                  >
                    Delete
                  </Btn>
                )}
              </div>
            )}
          </div>
          {adv && (
            <div className="mt-3 flex items-center gap-4 rounded-md bg-[#F7F6FA] px-4 py-3 text-[13px]">
              <label className="flex items-center gap-2">
                Template
                <select value={tplF} onChange={(e) => setTplF(e.target.value)} className="h-8 px-2 rounded-[4px] border border-[#CBC4D6] bg-white">
                  <option value="">Any template</option>
                  {templates
                    .filter((t) => !t.deleted)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={hwOnly} onChange={(e) => setHwOnly(e.target.checked)} className="accent-[#4C00FF] w-4 h-4" /> Sent by H-Worker
              </label>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-8 pb-8">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-[12.5px] font-semibold text-[#5E5873] border-b border-[#CBC4D6]">
                <th className="w-10 py-2.5">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#4C00FF]"
                    aria-label="Select all"
                    checked={rows.length > 0 && sel.length === rows.length}
                    onChange={(e) => setChecked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                  />
                </th>
                <th className="py-2.5">Name</th>
                <th className="py-2.5 w-[220px]">Status</th>
                <th className="py-2.5 w-[150px]">Last Change ↓</th>
                <th className="py-2.5 w-[150px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const fresh = e.createdBy === 'hworker' && Date.now() - +new Date(e.createdAt) < 90_000
                const to = e.recipients.filter((r) => r.role !== 'cc')
                const waitingOn = e.recipients.find((r) => r.role !== 'cc' && (r.status === 'sent' || r.status === 'delivered'))
                const act = rowAction(e)
                return (
                  <tr
                    key={e.id}
                    data-agent={`docusign-envelope-${e.id}`}
                    aria-label={e.subject}
                    onClick={() => nav.go({ page: 'details', id: e.id, from: folder })}
                    className={`border-b border-[#E5E1EC] hover:bg-[#FAF9FC] cursor-pointer ${fresh ? 'flash-new' : ''}`}
                  >
                    <td className="py-3.5 align-top" onClick={(ev) => ev.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 mt-0.5 accent-[#4C00FF]" checked={checked.has(e.id)} onChange={() => toggle(e.id)} aria-label="Select envelope" />
                    </td>
                    <td className="py-3.5 pr-4 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[14.5px] truncate ${e.status === 'action' ? 'font-bold' : 'font-semibold'}`}>{e.subject}</span>
                        {e.createdBy === 'hworker' && <HWorkerChip small />}
                      </div>
                      <div className="text-[13px] text-[#5E5873] truncate mt-0.5">
                        {isMine(e) || folder === 'sent' ? `To: ${to.map((r) => r.name).join(', ')}` : `From: ${e.senderName}`}
                      </div>
                    </td>
                    <td className="py-3.5 align-top">
                      <StatusLabel e={e} small />
                      <div className="text-[12.5px] text-[#5E5873] mt-0.5 pl-[22px] truncate">
                        {e.status === 'action'
                          ? 'Your signature is required'
                          : isWaiting(e) && waitingOn
                            ? `Waiting for ${waitingOn.name}`
                            : e.status === 'completed'
                              ? `${e.recipients.filter((r) => r.role !== 'cc').length} of ${e.recipients.filter((r) => r.role !== 'cc').length} signed`
                              : e.status === 'declined'
                                ? `Declined by ${e.recipients.find((r) => r.status === 'declined')?.name ?? ''}`
                                : ''}
                      </div>
                      {isExpiring(e) && (
                        <div className="text-[12px] text-[#B35C00] mt-0.5 pl-[22px] flex items-center gap-1">
                          <AlertTriangle size={12} /> Expires {fmtD(e.expiresAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 align-top">
                      <div className="text-[13.5px]">{fmtD(e.lastChange)}</div>
                      <div className="text-[12px] text-[#8B8698]">{fmtT(e.lastChange)}</div>
                    </td>
                    <td className="py-3.5 align-top text-right" onClick={(ev) => ev.stopPropagation()}>
                      <div className="inline-flex">
                        <button
                          data-agent={`docusign-row-action-${e.id}`}
                          onClick={() => primary(e, act)}
                          className={`h-8 px-4 text-[13px] font-semibold rounded-l-[4px] border ${act === 'Sign' ? 'bg-[#FFCC22] border-[#FFCC22] text-[#130032]' : 'bg-white border-[#CBC4D6] text-[#130032] hover:bg-[#F5F3F8]'}`}
                        >
                          {act}
                        </button>
                        <Menu
                          width={210}
                          items={acts.items(e)}
                          trigger={(t) => (
                            <button
                              onClick={t}
                              className={`h-8 w-8 flex items-center justify-center rounded-r-[4px] border border-l-0 ${act === 'Sign' ? 'bg-[#FFCC22] border-[#FFCC22] border-l-[#E0B400]' : 'border-[#CBC4D6] hover:bg-[#F5F3F8]'}`}
                              aria-label="More actions"
                            >
                              <ChevronDown size={15} />
                            </button>
                          )}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#F0EBFF] flex items-center justify-center text-[#4C00FF]">
                <f.Icon size={26} />
              </div>
              <div className="text-[17px] font-semibold mt-4">No envelopes</div>
              <div className="text-[14px] text-[#5E5873] mt-1">{q || filtered ? 'Try a different search or filter.' : `There are no envelopes in ${f.label}.`}</div>
            </div>
          )}
          {rows.length > 0 && <div className="text-[13px] text-[#5E5873] pt-4">1–{rows.length} of {rows.length}</div>}
        </div>
      </main>
      {acts.ui}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Envelope details

const ROLE_LABEL: Record<string, string> = { signer: 'Needs to Sign', cc: 'Receives a Copy', inperson: 'In Person Signer', viewer: 'Needs to View' }

function recipientStatus(e: Envelope, r: Envelope['recipients'][number]) {
  if (r.role === 'cc') return e.status === 'completed' ? { t: 'Completed', d: fmtDT(e.completedAt), I: CheckCircle2, c: C.green } : { t: e.status === 'draft' ? 'Not sent' : 'Will receive a copy', d: '', I: Mail, c: '#5E5873' }
  switch (r.status) {
    case 'signed':
    case 'completed':
      return { t: 'Signed', d: fmtDT(r.at), I: CheckCircle2, c: C.green }
    case 'delivered':
      return { t: 'Viewed', d: fmtDT(r.at), I: Eye, c: '#5E5873' }
    case 'sent':
      return e.status === 'voided' ? { t: 'Voided', d: '', I: X, c: '#5E5873' } : { t: 'Sent', d: fmtDT(r.at ?? e.sentAt), I: Send, c: '#5E5873' }
    case 'declined':
      return { t: 'Declined', d: fmtDT(r.at), I: X, c: C.red }
    default:
      return { t: e.status === 'draft' ? 'Not sent' : 'Waiting', d: '', I: Clock, c: '#8B8698' }
  }
}

const HIST_ICON: Record<string, any> = { Created: FileEdit, Sent: Send, Resent: Send, Viewed: Eye, Signed: PenLine, Completed: CheckCircle2, Voided: X, Declined: X, Delivered: Mail, Corrected: FileEdit, Moved: Folder, Deleted: Trash2, Restored: Inbox }

export function EnvelopeDetails({ nav, id, justSent }: { nav: Nav; id: string; justSent?: boolean }) {
  const e = useRecord<Envelope>('docusign.envelopes', id)
  const acts = useEnvActions(nav)
  const [banner, setBanner] = useState(!!justSent)
  const [tab, setTab] = useState<'details' | 'history'>('details')
  if (!e)
    return (
      <div className="flex-1 flex items-center justify-center text-[#5E5873]">
        Envelope not found.{' '}
        <button className="ml-2 text-[#4C00FF] underline" onClick={() => nav.go({ page: 'agreements', folder: 'inbox' })}>
          Back to Agreements
        </button>
      </div>
    )
  const waiting = e.recipients.filter((r) => r.role !== 'cc' && (r.status === 'sent' || r.status === 'delivered'))
  const fresh = e.createdBy === 'hworker' && Date.now() - +new Date(e.createdAt) < 90_000
  const history = [...e.history].sort((a, b) => +new Date(b.at) - +new Date(a.at))

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-white relative">
      {acts.ui}
      {banner && (
        <div data-agent="docusign-sent-banner" className="bg-[#E6F4EE] border-b border-[#9ED3BC] px-8 py-3 flex items-center gap-3 text-[14px]">
          <CheckCircle2 size={20} className="text-[#00805A]" />
          <span className="flex-1">
            <b>Your envelope was sent.</b> We’ll email you when {waiting[0]?.name ?? 'all recipients'} {waiting.length > 1 ? 'and others have' : 'has'} signed.
          </span>
          <button onClick={() => setBanner(false)} aria-label="Dismiss" className="w-7 h-7 rounded hover:bg-black/5 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
      )}
      <div className="max-w-[1240px] mx-auto px-8 py-5">
        <button data-agent="docusign-details-back" onClick={() => nav.go({ page: 'agreements', folder: isMine(e) ? 'sent' : 'inbox' })} className="flex items-center gap-1 text-[14px] font-semibold text-[#4C00FF] hover:underline">
          <ChevronLeft size={17} /> Back
        </button>
        <div className={`mt-4 flex items-start gap-6 ${fresh ? 'flash-new rounded-md' : ''}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[26px] font-semibold tracking-tight leading-tight">{e.subject}</h1>
              {e.createdBy === 'hworker' && <HWorkerChip />}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <StatusLabel e={e} />
              {waiting.length > 0 && e.status !== 'voided' && <span className="text-[14px] text-[#5E5873]">Waiting for: {waiting.map((w) => w.name).join(', ')}</span>}
              {e.status === 'voided' && e.voidReason && <span className="text-[14px] text-[#5E5873]">Reason: {e.voidReason}</span>}
              {e.status === 'declined' && e.declineReason && <span className="text-[14px] text-[#5E5873]">Reason: “{e.declineReason}”</span>}
            </div>
            <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[13.5px]">
              <span className="text-[#5E5873]">Envelope ID</span>
              <span className="font-mono text-[13px]" data-agent="docusign-envelope-id">{e.id}</span>
              <span className="text-[#5E5873]">From</span>
              <span>
                {e.senderName} <span className="text-[#5E5873]">({e.sender})</span>
                {e.createdBy === 'hworker' && <span className="text-[#5E5873]"> · sent via H-Worker</span>}
              </span>
              {e.sentAt && (
                <>
                  <span className="text-[#5E5873]">Sent</span>
                  <span>{fmtDT(e.sentAt)}</span>
                </>
              )}
              <span className="text-[#5E5873]">Last change</span>
              <span>{fmtDT(e.lastChange)}</span>
              {e.expiresAt && e.status !== 'completed' && e.status !== 'voided' && (
                <>
                  <span className="text-[#5E5873]">Expires</span>
                  <span className={isExpiring(e) ? 'text-[#B35C00] font-semibold' : ''}>{fmtD(e.expiresAt)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-1">
            {e.status === 'action' && (
              <Btn kind="yellow" data-agent="docusign-details-sign" onClick={() => acts.run.sign(e)}>
                Sign
              </Btn>
            )}
            {e.status === 'draft' && (
              <Btn kind="primary" data-agent="docusign-details-continue" onClick={() => acts.run.continue(e)}>
                Continue
              </Btn>
            )}
            {isWaiting(e) && (
              <>
                <Btn data-agent="docusign-correct" onClick={() => acts.run.correct(e)}>
                  Correct
                </Btn>
                <Btn data-agent="docusign-resend" onClick={() => acts.run.resend(e)}>
                  Resend
                </Btn>
              </>
            )}
            {e.status === 'completed' && (
              <Btn onClick={() => acts.run.download(e)}>
                <Download size={16} /> Download
              </Btn>
            )}
            <Btn onClick={() => acts.run.move([e.id])}>Move</Btn>
            <Menu
              width={220}
              items={acts.items(e)}
              trigger={(t) => (
                <Btn onClick={t} data-agent="docusign-details-more">
                  More <ChevronDown size={15} />
                </Btn>
              )}
            />
          </div>
        </div>

        <div className="mt-6 border-b border-[#E5E1EC] flex gap-6">
          {(['details', 'history'] as const).map((t) => (
            <button key={t} data-agent={`docusign-details-tab-${t}`} onClick={() => setTab(t)} className={`relative pb-2.5 text-[14.5px] ${tab === t ? 'font-semibold' : 'text-[#5E5873]'}`}>
              {t === 'details' ? 'Details' : 'History'}
              {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t bg-[#130032]" />}
            </button>
          ))}
        </div>

        {tab === 'details' ? (
          <div className="grid grid-cols-[1fr_340px] gap-8 mt-6">
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold">Recipients</h2>
                <span className="text-[13px] text-[#5E5873]">Set signing order: {e.recipients.some((r) => r.order > 1) ? 'On' : 'Off'}</span>
              </div>
              <div className="rounded-md border border-[#E5E1EC] divide-y divide-[#E5E1EC]">
                {e.recipients.map((r, i) => {
                  const s = recipientStatus(e, r)
                  return (
                    <div key={i} data-agent={`docusign-details-recipient-${i}`} className="flex items-center gap-4 px-4 py-3.5">
                      <span className="w-6 h-6 rounded-full border border-[#CBC4D6] text-[12px] flex items-center justify-center text-[#5E5873] shrink-0">{r.order}</span>
                      <Avatar email={r.email} name={r.name} size={34} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-semibold truncate">
                          {r.name}
                          {r.email === ME.email && <span className="ml-1.5 text-[12px] font-normal text-[#5E5873]">(you)</span>}
                        </div>
                        <div className="text-[13px] text-[#5E5873] truncate">{r.email}</div>
                      </div>
                      <div className="w-[150px] text-[13px] text-[#5E5873] flex items-center gap-1.5">
                        {r.role === 'cc' ? <Copy size={14} /> : <PenLine size={14} />} {ROLE_LABEL[r.role] ?? r.role}
                      </div>
                      <div className="w-[190px]">
                        <div className="flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: s.c }}>
                          <s.I size={15} /> {s.t}
                        </div>
                        {s.d && <div className="text-[12px] text-[#5E5873] pl-[21px]">{s.d}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <h2 className="text-[17px] font-semibold mt-7 mb-3">Message</h2>
              <div className="rounded-md border border-[#E5E1EC] p-4 text-[14px]">
                <div className="font-semibold">{e.subject}</div>
                <div className="text-[#3D3551] mt-1.5 whitespace-pre-line">{e.message || <span className="text-[#8B8698]">No message</span>}</div>
              </div>

              <h2 className="text-[17px] font-semibold mt-7 mb-3 flex items-center gap-2">
                <History size={18} /> Recent activity
              </h2>
              <ol className="relative border-l-2 border-[#E5E1EC] ml-3">
                {history.slice(0, 6).map((h, i) => {
                  const I = HIST_ICON[h.action] ?? FileEdit
                  return (
                    <li key={i} className="ml-6 pb-4 relative">
                      <span className={`absolute -left-[37px] top-0 w-6 h-6 rounded-full flex items-center justify-center ${h.action === 'Completed' || h.action === 'Signed' ? 'bg-[#E6F4EE] text-[#00805A]' : h.action === 'Sent' ? 'bg-[#F0EBFF] text-[#4C00FF]' : 'bg-[#F2F0F5] text-[#5E5873]'}`}>
                        <I size={13} />
                      </span>
                      <div className="text-[14px] font-semibold">{h.action}</div>
                      <div className="text-[13px] text-[#3D3551]">{h.detail}</div>
                      <div className="text-[12px] text-[#8B8698]">{fmtDT(h.at)}</div>
                    </li>
                  )
                })}
              </ol>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold mb-3">Documents</h2>
              {e.documents.map((d) => (
                <div key={d.name} className="rounded-md border border-[#E5E1EC] p-4 flex gap-4">
                  <DocThumb file={d.name} width={110} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold break-all">{d.name}</div>
                    <div className="text-[13px] text-[#5E5873] mt-0.5">{d.pages} pages</div>
                    <div className="flex gap-2 mt-3 text-[#5E5873]">
                      {(
                        [
                          [Eye, 'View', () => acts.run.view(e, d.name)],
                          [Download, 'Download', () => acts.run.download(e)],
                          [Printer, 'Print', () => acts.run.print(e)],
                        ] as const
                      ).map(([I, l, fn]) => (
                        <button key={l} title={l} aria-label={`${l} ${d.name}`} onClick={fn} className="w-8 h-8 rounded-[4px] border border-[#CBC4D6] flex items-center justify-center hover:bg-[#F5F3F8]">
                          <I size={15} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {e.status === 'completed' && (
                <div className="mt-3 rounded-md border border-[#E5E1EC] p-4 flex items-center gap-3 text-[13.5px]">
                  <CheckCircle2 size={18} className="text-[#00805A]" />
                  <span className="flex-1">Certificate of Completion</span>
                  <button onClick={() => acts.run.cert(e)} className="text-[#4C00FF] font-semibold hover:underline">
                    View
                  </button>
                </div>
              )}
              <h2 className="text-[17px] font-semibold mt-7 mb-3">Envelope details</h2>
              <div className="rounded-md border border-[#E5E1EC] p-4 text-[13px] space-y-1.5">
                {[
                  ['Created', fmtDT(e.createdAt)],
                  ['Template', e.templateId ? 'Yes' : 'No'],
                  ['Fields', String(e.fields?.length ?? 0) || '—'],
                  ['Signing order', e.recipients.some((r) => r.order > 1) ? 'Sequential' : 'Parallel'],
                  ['Reminders', 'Every 2 days'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-[#5E5873]">{k}</span>
                    <span className="text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[12.5px] text-[#5E5873] border-b border-[#CBC4D6]">
                  <th className="py-2 w-[190px]">Time</th>
                  <th className="py-2 w-[200px]">User</th>
                  <th className="py-2 w-[140px]">Action</th>
                  <th className="py-2">Activity</th>
                  <th className="py-2 w-[150px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-[#E5E1EC]">
                    <td className="py-2.5">{fmtDT(h.at)}</td>
                    <td className="py-2.5 flex items-center gap-1.5">
                      <User size={14} className="text-[#8B8698]" /> {h.by}
                    </td>
                    <td className="py-2.5">{h.action}</td>
                    <td className="py-2.5 text-[#3D3551]">{h.detail}</td>
                    <td className="py-2.5 text-[#5E5873]">{h.action === 'Completed' ? 'Completed' : h.action === 'Voided' ? 'Voided' : h.action === 'Declined' ? 'Declined' : h.action === 'Created' && e.status === 'draft' ? 'Created' : 'Sent'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

