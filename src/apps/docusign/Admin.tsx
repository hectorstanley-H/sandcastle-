/** Admin (users, account settings, integrations, audit log), My Profile, and PowerForms / Web Forms / Bulk Send. */
import { useMemo, useState } from 'react'
import { LayoutDashboard, Users, Settings, Plug, ScrollText, Plus, Search, Copy, Trash2, Link2, PenLine, Send, CheckCircle2 } from 'lucide-react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { ME, PEOPLE } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import type { Nav } from './index'
import { Btn, fmtD, fmtDT, type Envelope, type Template } from './shared'
import { Modal, ConfirmFooter, inputCls, useToast, copyText } from './ui'
import { AdoptSignature, SIG_FONTS, useProfile } from './Sign'
import { newGuid } from './actions'

const SECTIONS: [string, string, any][] = [
  ['overview', 'Overview', LayoutDashboard],
  ['users', 'Users', Users],
  ['preferences', 'Signing Settings', Settings],
  ['connect', 'Integrations', Plug],
  ['audit', 'Audit Logs', ScrollText],
]

const PERM: Record<string, string> = { alex: 'DS Admin', priya: 'DS Sender', james: 'DS Sender', sofia: 'DS Sender', rachel: 'DS Sender', liam: 'DS Sender', nina: 'DS Sender', grace: 'DS Admin' }

const DEFAULT_SETTINGS = { reminderDays: 2, expireDays: 120, warnDays: 7, signingOrder: false, allowDecline: true, allowMobile: true, envelopeId: true }
const INTEGRATIONS: [string, string, boolean][] = [
  ['salesforce', 'Salesforce', true],
  ['workday', 'Workday', true],
  ['slack', 'Slack', false],
  ['m365', 'Microsoft 365', true],
  ['servicenow', 'ServiceNow', false],
  ['hworker', 'H-Worker', true],
]

function Toggle({ on, onChange, agent }: { on: boolean; onChange: (v: boolean) => void; agent?: string }) {
  return (
    <button role="switch" aria-checked={on} data-agent={agent} onClick={() => onChange(!on)} className={`w-10 h-[22px] rounded-full relative transition-colors ${on ? 'bg-[#4C00FF]' : 'bg-[#CBC4D6]'}`}>
      <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[21px]' : 'left-[3px]'}`} />
    </button>
  )
}

export function Admin({ section = 'overview', nav }: { section?: string; nav: Nav }) {
  const envs = useCollection<Envelope>('docusign.envelopes')
  const extraUsers = useCollection<any>('docusign.users')
  const settingsRec = useRecord<any>('docusign.settings', 'account')
  const settings = { ...DEFAULT_SETTINGS, ...(settingsRec ?? {}) }
  const toast = useToast()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [nu, setNu] = useState({ name: '', email: '', perm: 'DS Sender' })
  const setS = (patch: any) => db.upsert('docusign.settings', { id: 'account', ...settings, ...patch })

  const users = useMemo(() => {
    const base = PEOPLE.filter((p) => !p.external)
      .slice(0, 14)
      .map((p) => ({ id: `u-${p.id}`, name: p.name, email: p.email, perm: PERM[p.id] ?? 'DS Viewer', status: 'Active', lastLogin: new Date(Date.now() - (p.name.length % 7) * 86400_000).toISOString() }))
    const overrides = new Map(extraUsers.map((u) => [u.id, u]))
    const merged = base.map((u) => ({ ...u, ...(overrides.get(u.id) ?? {}) }))
    return [...merged, ...extraUsers.filter((u) => !base.some((b) => b.id === u.id))].filter((u) => !q || (u.name + u.email).toLowerCase().includes(q.toLowerCase()))
  }, [extraUsers, q])

  const audit = useMemo(
    () =>
      envs
        .flatMap((e) => e.history.map((h) => ({ ...h, subject: e.subject, id: e.id })))
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))
        .slice(0, 60),
    [envs],
  )
  const integ = (k: string, def: boolean) => (settings.integrations?.[k] ?? def) as boolean

  return (
    <div className="flex-1 min-h-0 flex">
      <aside className="w-[248px] shrink-0 border-r border-[#E5E1EC] py-6 px-4">
        <div className="px-2 mb-1 text-[15px] font-semibold">Northwind Global</div>
        <div className="px-2 mb-4 text-[12px] text-[#8B8698]">Account 48210735 · Enterprise Pro</div>
        {SECTIONS.map(([k, l, I]) => (
          <button
            key={k}
            data-agent={`docusign-admin-${k}`}
            onClick={() => nav.go({ page: 'admin', section: k })}
            className={`w-full flex items-center gap-3 h-9 px-2 rounded-[4px] text-[14px] ${section === k ? 'bg-[#F0EBFF] font-semibold' : 'text-[#3D3551] hover:bg-[#F5F3F8]'}`}
          >
            <I size={17} className={section === k ? 'text-[#4C00FF]' : 'text-[#5E5873]'} /> {l}
          </button>
        ))}
      </aside>
      <main className="flex-1 min-w-0 overflow-auto bg-[#F7F6FA] px-8 py-6">
        {section === 'overview' && (
          <>
            <h1 className="text-[24px] font-semibold tracking-tight">Overview</h1>
            <div className="grid grid-cols-4 gap-4 mt-5">
              {[
                ['Active users', users.filter((u) => u.status === 'Active').length, () => nav.go({ page: 'admin', section: 'users' })],
                ['Envelopes this month', envs.filter((e) => e.sentAt && new Date(e.sentAt).getMonth() === new Date().getMonth()).length, () => nav.go({ page: 'reports', report: 'envelope' })],
                ['Envelope allowance used', '1,284 / 5,000', () => nav.go({ page: 'reports' })],
                ['Connected apps', INTEGRATIONS.filter(([k, , d]) => integ(k, d)).length, () => nav.go({ page: 'admin', section: 'connect' })],
              ].map(([l, v, fn]: any) => (
                <button key={l} onClick={fn} className="text-left bg-white rounded-lg border border-[#E5E1EC] p-4 hover:border-[#4C00FF]">
                  <div className="text-[13px] text-[#5E5873]">{l}</div>
                  <div className="text-[26px] font-semibold mt-1">{v}</div>
                </button>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-[#E5E1EC] mt-4 p-5">
              <div className="text-[15px] font-semibold mb-2">Recent account activity</div>
              {audit.slice(0, 6).map((h, i) => (
                <div key={i} className="flex justify-between gap-4 py-2 border-b border-[#F0EDF4] last:border-0 text-[13px]">
                  <span>
                    <b>{h.by}</b> · {h.action} · <span className="text-[#5E5873]">{h.subject}</span>
                  </span>
                  <span className="text-[#8B8698] shrink-0">{fmtDT(h.at)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'users' && (
          <>
            <div className="flex items-center gap-4">
              <h1 className="text-[24px] font-semibold tracking-tight">Users</h1>
              <div className="flex-1" />
              <div className="flex items-center gap-2 w-[280px] h-9 px-3 rounded-[4px] border border-[#CBC4D6] bg-white">
                <Search size={16} className="text-[#5E5873]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" aria-label="Search users" className="flex-1 outline-none text-[14px]" />
              </div>
              <Btn kind="primary" data-agent="docusign-admin-add-user" onClick={() => setAdding(true)}>
                <Plus size={16} /> Add User
              </Btn>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E1EC] mt-5 overflow-hidden">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12px] text-[#5E5873] border-b border-[#CBC4D6] bg-[#FAF9FC]">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Permission Profile</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Last login</th>
                    <th className="px-4 py-2.5 w-[130px]" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-[#F0EDF4]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar email={u.email} name={u.name} size={30} />
                          <div>
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-[12.5px] text-[#5E5873]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <select value={u.perm} onChange={(e) => db.upsert('docusign.users', { ...u, perm: e.target.value })} className="h-8 px-2 rounded-[4px] border border-[#CBC4D6] bg-white">
                          {['DS Admin', 'DS Sender', 'DS Viewer'].map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center h-6 px-2 rounded-full text-[12px] font-semibold ${u.status === 'Active' ? 'bg-[#E6F4EE] text-[#00805A]' : u.status === 'Pending' ? 'bg-[#FFF4D6] text-[#8A5A00]' : 'bg-[#F2F0F5] text-[#5E5873]'}`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[#5E5873]">{u.lastLogin ? fmtD(u.lastLogin) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        {u.email !== ME.email && (
                          <button
                            onClick={() => {
                              db.upsert('docusign.users', { ...u, status: u.status === 'Closed' ? 'Active' : 'Closed' })
                              toast(u.status === 'Closed' ? 'User reactivated' : 'User closed', u.name)
                            }}
                            className="text-[13px] font-semibold text-[#4C00FF] hover:underline"
                          >
                            {u.status === 'Closed' ? 'Reactivate' : 'Close user'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {section === 'preferences' && (
          <>
            <h1 className="text-[24px] font-semibold tracking-tight">Signing Settings</h1>
            <div className="bg-white rounded-lg border border-[#E5E1EC] mt-5 divide-y divide-[#F0EDF4]">
              {[
                ['Send reminders every (days)', 'reminderDays'],
                ['Envelopes expire after (days)', 'expireDays'],
                ['Warn signers before expiration (days)', 'warnDays'],
              ].map(([l, k]) => (
                <div key={k} className="flex items-center px-5 py-3.5 text-[14px]">
                  <span className="flex-1">{l}</span>
                  <input type="number" min={1} value={settings[k as keyof typeof settings] as number} onChange={(e) => setS({ [k]: Number(e.target.value) || 1 })} className="w-24 h-9 px-2 rounded-[4px] border border-[#CBC4D6] text-right" />
                </div>
              ))}
              {[
                ['Set signing order by default', 'signingOrder'],
                ['Allow recipients to decline to sign', 'allowDecline'],
                ['Allow signing on mobile devices', 'allowMobile'],
                ['Stamp Envelope ID on documents', 'envelopeId'],
              ].map(([l, k]) => (
                <div key={k} className="flex items-center px-5 py-3.5 text-[14px]">
                  <span className="flex-1">{l}</span>
                  <Toggle on={!!settings[k as keyof typeof settings]} onChange={(v) => setS({ [k]: v })} agent={`docusign-setting-${k}`} />
                </div>
              ))}
            </div>
            <div className="text-[12.5px] text-[#8B8698] mt-3">Changes are saved automatically and apply to new envelopes.</div>
          </>
        )}

        {section === 'connect' && (
          <>
            <h1 className="text-[24px] font-semibold tracking-tight">Integrations</h1>
            <div className="grid grid-cols-2 gap-4 mt-5">
              {INTEGRATIONS.map(([k, l, d]) => (
                <div key={k} className="bg-white rounded-lg border border-[#E5E1EC] p-4 flex items-center gap-3">
                  <Plug size={20} className="text-[#4C00FF]" />
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold">{l}</div>
                    <div className="text-[12.5px] text-[#5E5873]">{integ(k, d) ? 'Connected · syncing envelope status' : 'Not connected'}</div>
                  </div>
                  <Toggle
                    on={integ(k, d)}
                    agent={`docusign-integration-${k}`}
                    onChange={(v) => {
                      setS({ integrations: { ...(settings.integrations ?? {}), [k]: v } })
                      toast(v ? `${l} connected` : `${l} disconnected`)
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'audit' && (
          <>
            <h1 className="text-[24px] font-semibold tracking-tight">Audit Logs</h1>
            <div className="bg-white rounded-lg border border-[#E5E1EC] mt-5 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-[#5E5873] border-b border-[#CBC4D6] bg-[#FAF9FC]">
                    <th className="px-4 py-2.5 w-[180px]">Time</th>
                    <th className="px-4 py-2.5 w-[180px]">User</th>
                    <th className="px-4 py-2.5 w-[110px]">Action</th>
                    <th className="px-4 py-2.5">Envelope</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((h, i) => (
                    <tr key={i} onClick={() => nav.go({ page: 'details', id: h.id })} className="border-b border-[#F0EDF4] hover:bg-[#FAF9FC] cursor-pointer">
                      <td className="px-4 py-2">{fmtDT(h.at)}</td>
                      <td className="px-4 py-2">{h.by}</td>
                      <td className="px-4 py-2">{h.action}</td>
                      <td className="px-4 py-2 truncate max-w-[420px]">{h.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
      {adding && (
        <Modal
          title="Add User"
          onClose={() => setAdding(false)}
          footer={
            <ConfirmFooter
              onCancel={() => setAdding(false)}
              ok="Add User"
              disabled={!nu.name.trim() || !/.+@.+\..+/.test(nu.email)}
              onOk={() => {
                db.insert('docusign.users', { id: uid('u'), name: nu.name.trim(), email: nu.email.trim(), perm: nu.perm, status: 'Pending' })
                toast('Activation email sent', nu.email)
                setNu({ name: '', email: '', perm: 'DS Sender' })
                setAdding(false)
              }}
            />
          }
        >
          <label className="block mb-3">
            <span className="block mb-1 text-[13px] font-medium">Name</span>
            <input value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} className={inputCls} />
          </label>
          <label className="block mb-3">
            <span className="block mb-1 text-[13px] font-medium">Email</span>
            <input value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="block mb-1 text-[13px] font-medium">Permission profile</span>
            <select value={nu.perm} onChange={(e) => setNu({ ...nu, perm: e.target.value })} className={inputCls}>
              {['DS Admin', 'DS Sender', 'DS Viewer'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </Modal>
      )}
    </div>
  )
}

export function Profile() {
  const prof = useProfile()
  const toast = useToast()
  const [adopt, setAdopt] = useState(false)
  const notif = prof.raw?.notify ?? { signed: true, completed: true, declined: true, viewed: false }
  const setN = (k: string, v: boolean) => db.upsert('docusign.profile', { id: 'me', notify: { ...notif, [k]: v } })
  const font = SIG_FONTS[prof.sigStyle] ?? SIG_FONTS[0]
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F7F6FA] relative">
      <div className="max-w-[860px] mx-auto px-8 py-6 space-y-5">
        <h1 className="text-[24px] font-semibold tracking-tight">My Profile</h1>
        <div className="bg-white rounded-lg border border-[#E5E1EC] p-6 flex items-center gap-5">
          <Avatar id={ME.id} size={64} />
          <div className="flex-1">
            <div className="text-[18px] font-semibold">{ME.name}</div>
            <div className="text-[14px] text-[#5E5873]">
              {ME.title} · Northwind Global Inc.
            </div>
            <div className="text-[14px] text-[#5E5873]">{ME.email}</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E1EC] p-6">
          <div className="flex items-center mb-4">
            <div className="text-[17px] font-semibold flex-1">Signatures</div>
            <Btn data-agent="docusign-profile-signature" onClick={() => setAdopt(true)}>
              <PenLine size={15} /> {prof.adopted ? 'Edit' : 'Add Signature'}
            </Btn>
          </div>
          <div className="flex gap-8 items-end">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#8B8698]">Signature</div>
              <div className="text-[32px] leading-tight text-[#1F2D7A] border-b border-[#CBC4D6] pr-6" style={{ fontFamily: font }}>
                {prof.sigName}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#8B8698]">Initials</div>
              <div className="text-[28px] leading-tight text-[#1F2D7A] border-b border-[#CBC4D6] pr-4" style={{ fontFamily: font }}>
                {prof.initials}
              </div>
            </div>
            {!prof.adopted && <div className="text-[12.5px] text-[#8B8698] pb-2">Not adopted yet — you’ll be asked the first time you sign.</div>}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E1EC] p-6">
          <div className="text-[17px] font-semibold mb-3">Email notifications</div>
          {[
            ['signed', 'A recipient signs an envelope I sent'],
            ['completed', 'An envelope I sent is completed'],
            ['declined', 'A recipient declines to sign'],
            ['viewed', 'A recipient views an envelope'],
          ].map(([k, l]) => (
            <div key={k} className="flex items-center py-2.5 text-[14px] border-b border-[#F0EDF4] last:border-0">
              <span className="flex-1">{l}</span>
              <Toggle on={!!notif[k]} onChange={(v) => setN(k, v)} />
            </div>
          ))}
        </div>
      </div>
      {adopt && (
        <AdoptSignature
          onClose={() => setAdopt(false)}
          onAdopt={() => {
            setAdopt(false)
            toast('Signature saved')
          }}
        />
      )}
    </div>
  )
}

/* ───────────── PowerForms / Web Forms / Bulk Send ───────────── */

export function Forms({ nav, kind }: { nav: Nav; kind: 'powerforms' | 'webforms' | 'bulk' }) {
  const forms = useCollection<any>('docusign.forms')
  const batches = useCollection<any>('docusign.bulkBatches')
  const templates = useCollection<Template>('docusign.templates').filter((t) => !t.deleted)
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [tplId, setTplId] = useState('')
  const [name, setName] = useState('')
  const [list, setList] = useState('')
  const title = kind === 'powerforms' ? 'PowerForms' : kind === 'webforms' ? 'Web Forms' : 'Bulk Send'
  const mine = forms.filter((f) => f.kind === kind)
  const parsed = list
    .split('\n')
    .map((l) => l.split(',').map((x) => x.trim()))
    .filter(([n, e]) => n && e && /.+@.+/.test(e))

  const create = () => {
    const t = templates.find((x) => x.id === tplId)
    if (!t) return
    if (kind === 'bulk') {
      const now = new Date().toISOString()
      const bid = uid('bulk')
      parsed.forEach(([n, e]) => {
        const roles = t.roles.map((r, i) => (i === 0 ? { name: n, email: e, role: r.role } : { name: r.name, email: r.email, role: r.role })).filter((r) => r.name && r.email)
        db.insert(
          'docusign.envelopes',
          {
            id: newGuid(),
            subject: t.subject,
            message: t.message,
            status: 'sent',
            templateId: t.id,
            documents: t.documents,
            recipients: roles.map((r, i) => ({ ...r, status: 'sent', order: i + 1, at: now })),
            sender: ME.email,
            senderName: ME.name,
            createdAt: now,
            sentAt: now,
            lastChange: now,
            expiresAt: new Date(Date.now() + 120 * 864e5).toISOString(),
            fields: [],
            bulkBatchId: bid,
            history: [
              { at: now, action: 'Created', by: ME.name, detail: `Bulk send “${name || t.name}”` },
              { at: now, action: 'Sent', by: ME.name, detail: `Envelope sent to ${n} [${e}]` },
            ],
          },
          { prepend: true },
        )
      })
      db.insert('docusign.bulkBatches', { id: bid, name: name || t.name, templateName: t.name, count: parsed.length, at: now }, { prepend: true })
      toast('Bulk send started', `${parsed.length} envelopes sent from “${t.name}”`)
    } else {
      const id = uid(kind === 'powerforms' ? 'pf' : 'wf')
      db.insert('docusign.forms', { id, kind, name: name || t.name, templateId: t.id, templateName: t.name, active: true, uses: 0, createdAt: new Date().toISOString(), url: `https://${kind === 'powerforms' ? 'powerforms' : 'webforms'}.docusign.net/${newGuid().toLowerCase()}` }, { prepend: true })
      toast(`${kind === 'powerforms' ? 'PowerForm' : 'Web Form'} created`, name || t.name)
    }
    setCreating(false)
    setName('')
    setTplId('')
    setList('')
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F7F6FA] relative">
      <div className="max-w-[1100px] mx-auto px-8 py-6">
        <button onClick={() => nav.go({ page: 'agreements', folder: 'inbox' })} className="text-[14px] font-semibold text-[#4C00FF] hover:underline">
          ‹ Agreements
        </button>
        <div className="flex items-center mt-3">
          <h1 className="text-[24px] font-semibold tracking-tight flex-1">{title}</h1>
          <Btn kind="primary" data-agent={`docusign-${kind}-new`} onClick={() => setCreating(true)}>
            <Plus size={16} /> {kind === 'bulk' ? 'New Bulk Send' : kind === 'powerforms' ? 'New PowerForm' : 'Create Web Form'}
          </Btn>
        </div>
        <div className="text-[13.5px] text-[#5E5873] mt-1">
          {kind === 'powerforms'
            ? 'Self-service signing links: anyone with the link can fill and sign the template.'
            : kind === 'webforms'
              ? 'Interactive forms that collect data and generate an agreement for signature.'
              : 'Send the same template to many recipients at once — one envelope per recipient.'}
        </div>
        <div className="bg-white rounded-lg border border-[#E5E1EC] mt-5 overflow-hidden">
          {kind === 'bulk' ? (
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-[#5E5873] border-b border-[#CBC4D6] bg-[#FAF9FC]">
                  <th className="px-4 py-2.5">Batch</th>
                  <th className="px-4 py-2.5">Template</th>
                  <th className="px-4 py-2.5">Envelopes</th>
                  <th className="px-4 py-2.5">Sent</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-[#F0EDF4]">
                    <td className="px-4 py-2.5 font-semibold">{b.name}</td>
                    <td className="px-4 py-2.5">{b.templateName}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-[#00805A]">
                        <CheckCircle2 size={14} /> {b.count} sent
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#5E5873]">{fmtDT(b.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-[#5E5873] border-b border-[#CBC4D6] bg-[#FAF9FC]">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Template</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5 w-[220px]" />
                </tr>
              </thead>
              <tbody>
                {mine.map((f) => (
                  <tr key={f.id} className="border-b border-[#F0EDF4]">
                    <td className="px-4 py-2.5 font-semibold">{f.name}</td>
                    <td className="px-4 py-2.5">{f.templateName}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => db.update('docusign.forms', f.id, { active: !f.active })} className={`inline-flex items-center h-6 px-2 rounded-full text-[12px] font-semibold ${f.active ? 'bg-[#E6F4EE] text-[#00805A]' : 'bg-[#F2F0F5] text-[#5E5873]'}`}>
                        {f.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-[#5E5873]">{fmtD(f.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          copyText(f.url)
                          toast('Link copied', f.url)
                        }}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#4C00FF] hover:underline mr-4"
                      >
                        <Link2 size={14} /> Copy link
                      </button>
                      <button onClick={() => nav.send(f.templateId)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#4C00FF] hover:underline mr-4">
                        <Send size={14} /> Send
                      </button>
                      <button aria-label={`Delete ${f.name}`} onClick={() => db.remove('docusign.forms', f.id)} className="text-[#8B8698] hover:text-[#D11F3B] align-middle">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(kind === 'bulk' ? batches.length : mine.length) === 0 && (
            <div className="py-14 text-center">
              <Copy size={26} className="mx-auto text-[#CBC4D6]" />
              <div className="text-[15px] font-semibold mt-3">No {title} yet</div>
              <div className="text-[13px] text-[#5E5873] mt-1">Create one from any of your templates.</div>
            </div>
          )}
        </div>
      </div>
      {creating && (
        <Modal
          title={kind === 'bulk' ? 'New Bulk Send' : kind === 'powerforms' ? 'New PowerForm' : 'Create Web Form'}
          width={580}
          onClose={() => setCreating(false)}
          footer={<ConfirmFooter onCancel={() => setCreating(false)} onOk={create} ok={kind === 'bulk' ? `Send ${parsed.length || ''}`.trim() : 'Create'} disabled={!tplId || (kind === 'bulk' && !parsed.length)} agent={`docusign-${kind}-create`} />}
        >
          <label className="block mb-3">
            <span className="block mb-1 text-[13px] font-medium">Template</span>
            <select value={tplId} onChange={(e) => setTplId(e.target.value)} className={inputCls}>
              <option value="">Choose a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block mb-3">
            <span className="block mb-1 text-[13px] font-medium">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={templates.find((t) => t.id === tplId)?.name ?? ''} className={inputCls} />
          </label>
          {kind === 'bulk' && (
            <label className="block">
              <span className="block mb-1 text-[13px] font-medium">Recipients — one per line: Name, email</span>
              <textarea value={list} onChange={(e) => setList(e.target.value)} placeholder={'Jane Doe, jane@example.com\nJohn Roe, john@example.com'} className={`${inputCls} h-32 py-2 resize-none font-mono text-[13px]`} />
              <span className="block text-[12px] text-[#8B8698] mt-1">{parsed.length} valid recipient{parsed.length === 1 ? '' : 's'}</span>
            </label>
          )}
        </Modal>
      )}
    </div>
  )
}
