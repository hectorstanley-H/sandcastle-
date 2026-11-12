import { useState } from 'react'
import { ShieldCheck, DeviceMobile, Key, Fingerprint, EnvelopeSimple, ChatText, Lightning, PaintBrush, Buildings, Trash } from '@phosphor-icons/react'
import { uid } from '@/db/db'
import { useDesk } from '@/os/context'
import { Card, PageHead } from './Admin'
import { addLog, Btn, inputCls, Menu, Modal, Notice, Toggle, useOktaSetting } from './shared'

const ICONS: Record<string, any> = { DeviceMobile, Fingerprint, Key, ChatText, EnvelopeSimple, ShieldCheck }
type Auth = { name: string; icon: string; desc: string; enroll: string }
const DEFAULT_AUTH: Auth[] = [
  { name: 'Okta Verify', icon: 'DeviceMobile', desc: 'Push notification, OTP, FastPass', enroll: 'Required' },
  { name: 'FIDO2 (WebAuthn)', icon: 'Fingerprint', desc: 'Security keys and biometrics', enroll: 'Optional' },
  { name: 'Password', icon: 'Key', desc: 'Okta password policy — 12+ chars, 90 days', enroll: 'Required' },
  { name: 'Phone', icon: 'ChatText', desc: 'SMS and voice call', enroll: 'Optional' },
  { name: 'Email', icon: 'EnvelopeSimple', desc: 'Recovery only', enroll: 'Recovery' },
  { name: 'Google Authenticator', icon: 'ShieldCheck', desc: 'Time-based OTP', enroll: 'Optional' },
]
const AVAILABLE: Auth[] = [
  { name: 'Duo Security', icon: 'ShieldCheck', desc: 'Duo push and passcodes', enroll: 'Optional' },
  { name: 'YubiKey OTP', icon: 'Key', desc: 'YubiKey one-time passwords', enroll: 'Optional' },
  { name: 'Smart Card (PIV / CAC)', icon: 'Fingerprint', desc: 'Certificate-based authentication', enroll: 'Optional' },
  { name: 'Security Question', icon: 'ChatText', desc: 'Knowledge-based recovery', enroll: 'Recovery' },
]

const orgEvent = (name: string) => [{ type: 'Org', displayName: 'northwind', alternateId: name }]

export function Authenticators() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('authenticators', { list: DEFAULT_AUTH })
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const upd = (list: Auth[], ev: string, msg: string, name: string) => {
    set({ list })
    addLog(isAgent, ev, msg, orgEvent(name))
  }
  return (
    <div>
      <PageHead title="Authenticators" actions={<Btn primary agent="okta-auth-add" label="Add authenticator" onClick={() => setAdding(true)}>Add authenticator</Btn>} />
      <div className="px-8 pb-8 space-y-4">
        {notice && <Notice text={notice} onClose={() => setNotice('')} />}
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead><tr className="text-left text-[12px] uppercase tracking-wide text-[#6E6E78] border-b border-[#EBEBED]"><th className="px-5 h-10 font-semibold">Name</th><th className="font-semibold">Characteristics</th><th className="font-semibold">Used for</th><th className="font-semibold">Enrollment</th><th className="w-[110px]" /></tr></thead>
            <tbody>
              {v.list.map((a) => {
                const I = ICONS[a.icon] ?? ShieldCheck
                return (
                  <tr key={a.name} className="border-b border-[#F1F1F3]">
                    <td className="px-5 h-14"><div className="flex items-center gap-3"><I size={22} className="text-[#1662DD]" /><b>{a.name}</b></div></td>
                    <td className="text-[#46464F]">{a.desc}</td>
                    <td>{a.enroll === 'Recovery' ? 'Recovery' : 'Authentication, Recovery'}</td>
                    <td className={a.enroll === 'Disabled' ? 'text-[#6E6E78]' : ''}>{a.enroll}</td>
                    <td className="relative pr-4 text-right">
                      <Btn small label={`Actions for ${a.name}`} onClick={() => setMenu(menu === a.name ? null : a.name)}>Actions</Btn>
                      {menu === a.name && (
                        <Menu
                          className="right-4 top-11"
                          onClose={() => setMenu(null)}
                          items={[
                            ...(['Required', 'Optional', 'Disabled'] as const).map((e) => ({
                              label: `Set enrollment: ${e}`,
                              disabled: a.enroll === e || (a.name === 'Password' && e === 'Disabled'),
                              onClick: () => {
                                upd(v.list.map((x) => (x.name === a.name ? { ...x, enroll: e } : x)), 'security.authenticator.lifecycle.update', `Update authenticator: ${a.name}`, a.name)
                                setNotice(`${a.name} enrollment set to ${e}.`)
                              },
                            })),
                            ...(DEFAULT_AUTH.some((d) => d.name === a.name)
                              ? []
                              : [{ label: 'Delete', danger: true, onClick: () => (upd(v.list.filter((x) => x.name !== a.name), 'security.authenticator.lifecycle.delete', `Delete authenticator: ${a.name}`, a.name), setNotice(`${a.name} was removed.`)) }]),
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
      {adding && (
        <Modal title="Add authenticator" onClose={() => setAdding(false)} footer={<Btn primary label="Done" onClick={() => setAdding(false)}>Done</Btn>}>
          <ul className="border border-[#E1E1E6] rounded-md divide-y divide-[#EBEBED]">
            {AVAILABLE.map((a) => {
              const has = v.list.some((x) => x.name === a.name)
              const I = ICONS[a.icon] ?? ShieldCheck
              return (
                <li key={a.name} className="flex items-center gap-3 px-3 py-2.5">
                  <I size={22} className="text-[#1662DD]" />
                  <div className="flex-1">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-[12px] text-[#6E6E78]">{a.desc}</div>
                  </div>
                  <Btn small primary={!has} disabled={has} label={has ? `${a.name} added` : `Add ${a.name}`} onClick={() => (upd([...v.list, a], 'security.authenticator.lifecycle.create', `Add authenticator: ${a.name}`, a.name), setNotice(`${a.name} was added.`))}>
                    {has ? 'Added' : 'Add'}
                  </Btn>
                </li>
              )
            })}
          </ul>
        </Modal>
      )}
    </div>
  )
}

type Auto = { id: string; name: string; desc: string; active: boolean }
const DEFAULT_AUTOS: Auto[] = [
  { id: 'a1', name: 'Deactivate inactive contractors', desc: 'Schedule: Daily · Users inactive 90 days', active: true },
  { id: 'a2', name: 'Workday new hire import', desc: 'Trigger: Workday import · Stage then activate on start date', active: true },
  { id: 'a3', name: 'Password expiry reminder', desc: 'Schedule: Daily · 7 days before expiry', active: true },
  { id: 'a4', name: 'Suspend after termination', desc: 'Trigger: Workday termination event', active: true },
]

export function Automations() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('automations', { list: DEFAULT_AUTOS })
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', trigger: 'Schedule: Daily', condition: 'User inactivity: 30 days', action: 'Change user lifecycle state to Suspended' })
  return (
    <div>
      <PageHead title="Automations" actions={<Btn primary agent="okta-automation-add" label="Add Automation" onClick={() => setAdding(true)}>Add Automation</Btn>} />
      <div className="px-8 pb-8 grid grid-cols-2 gap-5">
        {v.list.map((a) => (
          <Card key={a.id} title={<span className="flex items-center gap-2"><Lightning size={18} className="text-[#1662DD]" />{a.name}</span>} right={<Toggle on={a.active} label={`Activate ${a.name}`} onChange={(on) => (set({ list: v.list.map((x) => (x.id === a.id ? { ...x, active: on } : x)) }), addLog(isAgent, on ? 'automation.activate' : 'automation.deactivate', on ? 'Activate automation' : 'Deactivate automation', orgEvent(a.name)))} />}>
            <div className="text-[14px] text-[#46464F]">{a.desc}</div>
            <div className="mt-2 flex items-center">
              <span className={`flex-1 text-[13px] font-semibold ${a.active ? 'text-[#1E8A3A]' : 'text-[#6E6E78]'}`}>{a.active ? 'Active' : 'Inactive'}</span>
              {!DEFAULT_AUTOS.some((d) => d.id === a.id) && (
                <button aria-label={`Delete ${a.name}`} onClick={() => set({ list: v.list.filter((x) => x.id !== a.id) })} className="text-[#6E6E78] hover:text-[#DA372C]">
                  <Trash size={15} />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {adding && (
        <Modal
          title="Add Automation"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                primary
                label="Save"
                disabled={!f.name.trim()}
                onClick={() => {
                  set({ list: [...v.list, { id: uid('auto'), name: f.name.trim(), desc: `${f.trigger} · ${f.condition} → ${f.action}`, active: false }] })
                  addLog(isAgent, 'automation.create', 'Create automation', orgEvent(f.name.trim()))
                  setAdding(false)
                  setF({ ...f, name: '' })
                }}
              >
                Save
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Name</span>
              <input aria-label="Automation name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
            </label>
            {(
              [
                ['trigger', 'Trigger', ['Schedule: Daily', 'Schedule: Weekly', 'Trigger: Workday import', 'Trigger: Workday termination event']],
                ['condition', 'Condition', ['User inactivity: 30 days', 'User inactivity: 90 days', 'Password expires in 7 days', 'Group membership: Contractors']],
                ['action', 'Action', ['Change user lifecycle state to Suspended', 'Change user lifecycle state to Deactivated', 'Send email to user', 'Run Okta Workflow']],
              ] as const
            ).map(([k, l, opts]) => (
              <label key={k} className="block">
                <span className="block text-[13px] font-semibold mb-1">{l}</span>
                <select aria-label={l} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls}>
                  {opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ))}
            <div className="text-[12px] text-[#6E6E78]">New automations start inactive — turn them on from the card.</div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function Brands() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('brands', { list: [{ id: 'b1', name: 'Northwind Global', domain: 'login.northwind.com', color: '#1F3A5F' }] })
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', domain: '', color: '#1662DD' })
  return (
    <div>
      <PageHead title="Brands" actions={<Btn primary label="Add brand" onClick={() => setAdding(true)}>Add brand</Btn>} />
      <div className="px-8 pb-8 space-y-4">
        {v.list.map((b) => (
          <Card key={b.id} title={<span className="flex items-center gap-2"><PaintBrush size={18} className="text-[#1662DD]" />{b.name}</span>} right={<span className="w-6 h-6 rounded border border-[#E1E1E6]" style={{ background: b.color }} />}>
            <div className="text-[14px] text-[#46464F]">Custom domain: {b.domain || 'northwind.okta.com'} · Primary color {b.color} · Sign-in page: Okta-hosted (Gen3)</div>
          </Card>
        ))}
      </div>
      {adding && (
        <Modal
          title="Add brand"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                primary
                label="Create brand"
                disabled={!f.name.trim()}
                onClick={() => {
                  set({ list: [...v.list, { id: uid('brand'), name: f.name.trim(), domain: f.domain.trim(), color: f.color }] })
                  addLog(isAgent, 'system.brand.create', 'Create brand', orgEvent(f.name.trim()))
                  setAdding(false)
                  setF({ name: '', domain: '', color: '#1662DD' })
                }}
              >
                Create brand
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Brand name</span>
              <input aria-label="Brand name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Custom domain (optional)</span>
              <input aria-label="Custom domain" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} placeholder="login.example.com" className={inputCls} />
            </label>
            <label className="flex items-center gap-3">
              <span className="text-[13px] font-semibold">Primary color</span>
              <input type="color" aria-label="Primary color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="w-10 h-8" />
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function Account() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('account', { contact: 'Grace Holloway', email: 'it-admins@northwind.com', phone: '+1 617 555 0144' })
  const [edit, setEdit] = useState<typeof v | null>(null)
  return (
    <div>
      <PageHead title="Account" />
      <div className="px-8 pb-8 space-y-4">
        <Card title={<span className="flex items-center gap-2"><Buildings size={18} className="text-[#1662DD]" />Organization</span>}><div className="grid grid-cols-2 gap-y-2 text-[14px]"><span className="text-[#6E6E78]">Company</span><span>Northwind Global Inc.</span><span className="text-[#6E6E78]">Okta domain</span><span>northwind.okta.com</span><span className="text-[#6E6E78]">Org ID</span><span>00o1nw2k8dXfQ4Lhq697</span><span className="text-[#6E6E78]">Edition</span><span>Okta Identity Engine · Workforce Identity</span></div></Card>
        <Card title="Technical contact" right={!edit ? <Btn small label="Edit technical contact" onClick={() => setEdit(v)}>Edit</Btn> : undefined}>
          {edit ? (
            <div className="space-y-3 max-w-[420px]">
              {(['contact', 'email', 'phone'] as const).map((k) => (
                <label key={k} className="block">
                  <span className="block text-[13px] font-semibold mb-1 capitalize">{k}</span>
                  <input aria-label={k} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} className={inputCls} />
                </label>
              ))}
              <div className="flex gap-2">
                <Btn primary label="Save" onClick={() => (set(edit), addLog(isAgent, 'system.org.contact.update', 'Update org technical contact', orgEvent('Technical contact')), setEdit(null))}>Save</Btn>
                <Btn label="Cancel" onClick={() => setEdit(null)}>Cancel</Btn>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-2 text-[14px]">
              <span className="text-[#6E6E78]">Name</span>
              <span>{v.contact}</span>
              <span className="text-[#6E6E78]">Email</span>
              <span>{v.email}</span>
              <span className="text-[#6E6E78]">Phone</span>
              <span>{v.phone}</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
