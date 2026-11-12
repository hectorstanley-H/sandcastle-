/**
 * Okta Admin Console pages that were previously only nav labels: group & app detail, devices,
 * authentication policies, networks, administrators, reports, agents, notifications and settings.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { MagnifyingGlass, UsersThree, CaretLeft, Plus, X, Check, Laptop, DeviceMobile, ShieldCheck, Globe, Plugs, Bell, CheckCircle, Circle, ArrowUp, ArrowDown, Lightning, DownloadSimple, ChartBar, Warning, Info, Trash } from '@phosphor-icons/react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import { relative } from '@/data/time'
import { Card, PageHead } from './Admin'
import {
  addLog, appTarget, Btn, fmtOkta, fmtOktaTime, fullName, HWChip, Initials, inputCls, Menu, Modal, Notice, StatusBadge, StatusDot, Toggle, useOktaSetting, userTarget,
  type OktaApp, type OktaAssignment, type OktaLog, type OktaUser, type Route,
} from './shared'

const th = 'px-4 py-2.5 font-semibold'
const thead = 'text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]'
const groupTarget = (g: any) => ({ type: 'UserGroup', displayName: g.name, alternateId: g.id })

function Tabs({ tabs, cur, onChange, prefix }: { tabs: [string, string][]; cur: string; onChange: (t: string) => void; prefix: string }) {
  return (
    <div className="flex gap-6 mt-5 -mb-px">
      {tabs.map(([id, label]) => (
        <button key={id} data-agent={`${prefix}-${id}`} onClick={() => onChange(id)} className={`h-11 text-[14px] border-b-2 ${cur === id ? 'border-[#1662DD] text-[#1662DD] font-semibold' : 'border-transparent text-[#46464F] hover:text-[#1D1D21] font-medium'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

function SearchBox({ value, onChange, placeholder, width = 320 }: { value: string; onChange: (v: string) => void; placeholder: string; width?: number }) {
  return (
    <div className="flex items-center gap-2 h-9 rounded-[4px] border border-[#8C8C96] px-3 focus-within:border-[#1662DD]" style={{ width }}>
      <MagnifyingGlass size={16} className="text-[#6E6E78]" />
      <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent outline-none text-[14px]" />
    </div>
  )
}

/* ═════════════════════ Group detail ═════════════════════ */

export function GroupDetail({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const g = useRecord<any>('okta.groups', route.groupId)
  const users = useCollection<OktaUser>('okta.users')
  const apps = useCollection<OktaApp>('okta.apps')
  const [tab, setTab] = useState(route.tab ?? 'people')
  const [modal, setModal] = useState<null | 'people' | 'apps' | 'delete'>(null)
  const [q, setQ] = useState('')
  const [notice, setNotice] = useState('')
  const [edit, setEdit] = useState<{ name: string; description: string } | null>(null)
  if (!g) return <div className="p-8 text-[14px] text-[#6E6E78]">Group not found.</div>
  const managed = g.type !== 'OKTA_GROUP'
  const members = users.filter((u) => u.groups.includes(g.id))
  const shown = members.filter((u) => !q || `${fullName(u)} ${u.login}`.toLowerCase().includes(q.toLowerCase()))
  const gApps = apps.filter((a) => (g.apps ?? []).includes(a.id))
  const stamp = { updatedBy: isAgent ? 'hworker' : 'alex', updatedAt: new Date().toISOString() }

  const addMember = (u: OktaUser) => {
    db.update('okta.users', u.id, { groups: [...u.groups, g.id], ...stamp })
    addLog(isAgent, 'group.user_membership.add', 'Add user to group membership', [userTarget(u), groupTarget(g)])
    // group app assignments flow down to the new member
    for (const appId of g.apps ?? []) {
      if (!db.get<OktaAssignment>('okta.assignments').some((a) => a.userId === u.id && a.appId === appId))
        db.insert('okta.assignments', { id: uid('okta-as'), userId: u.id, appId, assignedAt: new Date().toISOString(), assignedBy: isAgent ? 'hworker' : 'alex', scope: 'GROUP', group: g.name, appUsername: u.login })
    }
  }
  const removeMember = (u: OktaUser) => {
    db.update('okta.users', u.id, { groups: u.groups.filter((x) => x !== g.id), ...stamp })
    for (const a of db.get<OktaAssignment>('okta.assignments').filter((a) => a.userId === u.id && a.scope === 'GROUP' && a.group === g.name)) db.remove('okta.assignments', a.id)
    addLog(isAgent, 'group.user_membership.remove', 'Remove user from group membership', [userTarget(u), groupTarget(g)])
  }
  const assignApp = (a: OktaApp) => {
    db.update('okta.groups', g.id, { apps: [...(g.apps ?? []), a.id] })
    for (const u of members)
      if (!db.get<OktaAssignment>('okta.assignments').some((x) => x.userId === u.id && x.appId === a.id))
        db.insert('okta.assignments', { id: uid('okta-as'), userId: u.id, appId: a.id, assignedAt: new Date().toISOString(), assignedBy: isAgent ? 'hworker' : 'alex', scope: 'GROUP', group: g.name, appUsername: u.login })
    addLog(isAgent, 'group.application_assignment.add', 'Add assigned application to group', [groupTarget(g), appTarget(a)])
  }
  const unassignApp = (a: OktaApp) => {
    db.update('okta.groups', g.id, { apps: (g.apps ?? []).filter((x: string) => x !== a.id) })
    for (const x of db.get<OktaAssignment>('okta.assignments').filter((x) => x.appId === a.id && x.scope === 'GROUP' && x.group === g.name)) db.remove('okta.assignments', x.id)
    addLog(isAgent, 'group.application_assignment.remove', 'Remove assigned application from group', [groupTarget(g), appTarget(a)])
  }

  return (
    <div className="pb-8">
      <div className="px-8 pt-5 bg-white border-b border-[#E1E1E6]">
        <button onClick={() => go({ area: 'admin', page: 'groups' })} className="flex items-center gap-1 text-[13px] text-[#1662DD] font-medium mb-3">
          <CaretLeft size={12} weight="bold" /> Back to Groups
        </button>
        <div className="flex items-start gap-4">
          <span className="w-14 h-14 rounded-lg bg-[#EEEEF0] text-[#46464F] flex items-center justify-center shrink-0">
            <UsersThree size={28} />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.3px]">{g.name}</h1>
            <div className="text-[14px] text-[#46464F] mt-0.5">{g.description}</div>
            <div className="text-[13px] text-[#6E6E78] mt-0.5">
              {g.type === 'BUILT_IN' ? 'Okta built-in group' : g.source ? `Imported from ${g.source}` : 'Okta group'} · {members.length} people · {gApps.length} apps
            </div>
          </div>
          {!managed && (
            <div className="flex gap-2">
              <Btn label="Edit group" onClick={() => setEdit({ name: g.name, description: g.description })}>Edit</Btn>
              <Btn label="Delete group" onClick={() => setModal('delete')}>Delete</Btn>
            </div>
          )}
        </div>
        {notice && (
          <div className="mt-4">
            <Notice text={notice} onClose={() => setNotice('')} />
          </div>
        )}
        <Tabs prefix="okta-group-tab" tabs={[['people', 'People'], ['apps', 'Applications'], ['profile', 'Profile']]} cur={tab} onChange={setTab} />
      </div>
      <div className="px-8 pt-6">
        {tab === 'people' && (
          <div className="bg-white rounded-lg border border-[#E1E1E6]">
            <div className="flex items-center gap-3 p-4">
              {!managed ? (
                <Btn primary agent="okta-group-assign-people" label="Assign people" onClick={() => setModal('people')}>Assign people</Btn>
              ) : (
                <span className="text-[13px] text-[#6E6E78]">Membership is managed by {g.type === 'BUILT_IN' ? 'Okta' : g.source ?? 'a group rule'}.</span>
              )}
              <div className="flex-1" />
              <SearchBox value={q} onChange={setQ} placeholder="Search members" width={260} />
            </div>
            <table className="w-full text-[14px]">
              <thead>
                <tr className={thead}>
                  <th className={th}>Person &amp; username</th>
                  <th className={th}>Status</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id} className="border-b border-[#EBEBED] last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Initials name={fullName(u)} size={28} />
                        <div>
                          <button onClick={() => go({ area: 'admin', page: 'user', userId: u.id, tab: 'groups' })} className="text-[#1662DD] font-semibold hover:underline">
                            {fullName(u)}
                          </button>
                          <div className="text-[12px] text-[#6E6E78]">{u.login}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <StatusDot status={u.status} />
                    </td>
                    <td className="pr-3">
                      {!managed && (
                        <button aria-label={`Remove ${fullName(u)} from group`} onClick={() => removeMember(u)} className="w-8 h-8 rounded flex items-center justify-center text-[#6E6E78] hover:bg-[#F4F4F4]">
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[#6E6E78]">
                      No members.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'apps' && (
          <div className="bg-white rounded-lg border border-[#E1E1E6]">
            <div className="p-4">
              <Btn primary agent="okta-group-assign-apps" label="Assign applications" onClick={() => setModal('apps')}>Assign applications</Btn>
            </div>
            <table className="w-full text-[14px]">
              <thead>
                <tr className={thead}>
                  <th className={th}>Application</th>
                  <th className={th}>Sign-on</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {gApps.map((a) => (
                  <tr key={a.id} className="border-b border-[#EBEBED] last:border-0">
                    <td className="px-4 py-2.5">
                      <button onClick={() => go({ area: 'admin', page: 'app', appId: a.id })} className="flex items-center gap-3 text-left">
                        <img src={logoUrl(a.logo)} className="w-8 h-8" alt="" />
                        <span className="text-[#1662DD] font-semibold hover:underline">{a.label}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-[13px]">{a.signOn}</td>
                    <td className="pr-3">
                      <button aria-label={`Unassign ${a.label}`} onClick={() => unassignApp(a)} className="w-8 h-8 rounded flex items-center justify-center text-[#6E6E78] hover:bg-[#F4F4F4]">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!gApps.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[#6E6E78]">
                      No applications assigned to this group.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'profile' && (
          <Card title="Group profile">
            <dl className="grid grid-cols-[200px_1fr] gap-y-2.5 text-[14px]">
              <dt className="text-[#6E6E78]">Name</dt>
              <dd>{g.name}</dd>
              <dt className="text-[#6E6E78]">Description</dt>
              <dd>{g.description}</dd>
              <dt className="text-[#6E6E78]">Type</dt>
              <dd>{g.type}</dd>
              <dt className="text-[#6E6E78]">Group ID</dt>
              <dd className="font-mono text-[12px]">{g.id.replace('okta-g-', '00g')}</dd>
            </dl>
          </Card>
        )}
      </div>
      {modal === 'people' && (
        <PickModal
          title={`Assign people to ${g.name}`}
          items={users.filter((u) => u.status !== 'DEPROVISIONED').map((u) => ({ id: u.id, label: fullName(u), sub: u.login, done: u.groups.includes(g.id) }))}
          onPick={(id) => addMember(users.find((u) => u.id === id)!)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'apps' && (
        <PickModal
          title={`Assign applications to ${g.name}`}
          items={apps.map((a) => ({ id: a.id, label: a.label, sub: a.signOn, logo: a.logo, done: (g.apps ?? []).includes(a.id) }))}
          onPick={(id) => assignApp(apps.find((a) => a.id === id)!)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'delete' && (
        <Modal
          title="Delete group"
          onClose={() => setModal(null)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn
                danger
                label="Delete group"
                onClick={() => {
                  for (const u of members) db.update('okta.users', u.id, { groups: u.groups.filter((x) => x !== g.id) })
                  db.remove('okta.groups', g.id)
                  addLog(isAgent, 'group.lifecycle.delete', 'Delete Okta group', [groupTarget(g)])
                  go({ area: 'admin', page: 'groups' })
                }}
              >
                Delete
              </Btn>
            </>
          }
        >
          Delete <b>{g.name}</b>? {members.length} members will be removed from the group. This can’t be undone.
        </Modal>
      )}
      {edit && (
        <Modal
          title="Edit group"
          onClose={() => setEdit(null)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setEdit(null)}>Cancel</Btn>
              <Btn
                primary
                label="Save"
                disabled={!edit.name.trim()}
                onClick={() => {
                  db.update('okta.groups', g.id, { name: edit.name.trim(), description: edit.description })
                  addLog(isAgent, 'group.profile.update', 'Update Okta group profile', [groupTarget(g)])
                  setEdit(null)
                  setNotice('Group profile saved.')
                }}
              >
                Save
              </Btn>
            </>
          }
        >
          <label className="block mb-3">
            <span className="block text-[13px] font-semibold mb-1">Name</span>
            <input aria-label="Group name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1">Description</span>
            <input aria-label="Group description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={inputCls} />
          </label>
        </Modal>
      )}
    </div>
  )
}

/** search list with per-row "Assign" buttons (Okta assign dialogs) */
export function PickModal({ title, items, onPick, onClose, verb = 'Assign' }: { title: string; items: { id: string; label: string; sub?: string; logo?: string; done?: boolean }[]; onPick: (id: string) => void; onClose: () => void; verb?: string }) {
  const [q, setQ] = useState('')
  const rows = items.filter((i) => `${i.label} ${i.sub ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal title={title} onClose={onClose} width={620} footer={<Btn primary label="Done" onClick={onClose}>Done</Btn>}>
      <div className="mb-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search" width={572} />
      </div>
      <ul className="border border-[#E1E1E6] rounded-md divide-y divide-[#EBEBED] max-h-[400px] overflow-auto">
        {rows.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
            {i.logo ? <img src={logoUrl(i.logo)} className="w-8 h-8" alt="" /> : <Initials name={i.label} size={30} />}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold truncate">{i.label}</div>
              {i.sub && <div className="text-[12px] text-[#6E6E78] truncate">{i.sub}</div>}
            </div>
            {i.done ? (
              <span className="h-8 px-3 rounded-[4px] text-[13px] font-semibold text-[#1B6E31] bg-[#E6F4EA] flex items-center gap-1.5">
                <Check size={14} weight="bold" /> {verb === 'Assign' ? 'Assigned' : 'Added'}
              </span>
            ) : (
              <button onClick={() => onPick(i.id)} className="h-8 px-3.5 rounded-[4px] text-[13px] font-semibold border border-[#1662DD] text-[#1662DD] hover:bg-[#E6EEFC]">
                {verb}
              </button>
            )}
          </li>
        ))}
        {!rows.length && <li className="px-3 py-6 text-center text-[#6E6E78]">No matches.</li>}
      </ul>
    </Modal>
  )
}

/* ═════════════════════ App detail ═════════════════════ */

export function AppDetail({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const a = useRecord<OktaApp>('okta.apps', route.appId)
  const users = useCollection<OktaUser>('okta.users')
  const asg = useCollection<OktaAssignment>('okta.assignments')
  const groups = useCollection<any>('okta.groups')
  const [tab, setTab] = useState(route.tab ?? 'assignments')
  const [modal, setModal] = useState<null | 'people' | 'groups'>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [q, setQ] = useState('')
  if (!a) return <div className="p-8 text-[14px] text-[#6E6E78]">Application not found.</div>
  const mine = asg.filter((x) => x.appId === a.id)
  const rows = mine.filter((x) => {
    const u = users.find((y) => y.id === x.userId)
    return u && (!q || `${fullName(u)} ${u.login}`.toLowerCase().includes(q.toLowerCase()))
  })
  const active = a.status !== 'INACTIVE'
  const assign = (u: OktaUser) => {
    if (asg.some((x) => x.userId === u.id && x.appId === a.id)) return
    db.insert('okta.assignments', { id: uid('okta-as'), userId: u.id, appId: a.id, assignedAt: new Date().toISOString(), assignedBy: isAgent ? 'hworker' : 'alex', scope: 'USER', appUsername: u.login })
    addLog(isAgent, 'application.user_membership.add', 'Add user to application membership', [userTarget(u), appTarget(a)])
  }
  return (
    <div className="pb-8">
      <div className="px-8 pt-5 bg-white border-b border-[#E1E1E6]">
        <button onClick={() => go({ area: 'admin', page: 'apps' })} className="flex items-center gap-1 text-[13px] text-[#1662DD] font-medium mb-3">
          <CaretLeft size={12} weight="bold" /> Back to Applications
        </button>
        <div className="flex items-start gap-4">
          <span className="w-14 h-14 rounded-lg border border-[#E1E1E6] bg-white flex items-center justify-center shrink-0">
            <img src={logoUrl(a.logo)} className="w-9 h-9" alt="" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.3px]">{a.label}</h1>
              <span className={`h-6 px-2 rounded text-[12px] font-semibold flex items-center ${active ? 'bg-[#E6F4EA] text-[#1B6E31]' : 'bg-[#EEEEF0] text-[#55555E]'}`}>{active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="text-[13px] text-[#6E6E78] mt-0.5">
              {a.signOn} · {a.oktaId} · {mine.length} assigned
            </div>
          </div>
          <Btn
            label={active ? 'Deactivate' : 'Activate'}
            onClick={() => {
              db.update('okta.apps', a.id, { status: active ? 'INACTIVE' : 'ACTIVE' })
              addLog(isAgent, active ? 'application.lifecycle.deactivate' : 'application.lifecycle.activate', active ? 'Deactivate application' : 'Activate application', [appTarget(a)])
              setNotice(`${a.label} ${active ? 'deactivated — users can no longer sign in to it.' : 'activated.'}`)
            }}
          >
            {active ? 'Deactivate' : 'Activate'}
          </Btn>
        </div>
        {notice && (
          <div className="mt-4">
            <Notice text={notice} onClose={() => setNotice('')} />
          </div>
        )}
        <Tabs prefix="okta-app-tab" tabs={[['general', 'General'], ['signon', 'Sign On'], ['assignments', 'Assignments']]} cur={tab} onChange={setTab} />
      </div>
      <div className="px-8 pt-6">
        {tab === 'general' && (
          <Card title="App Settings" right={label === null ? <Btn small label="Edit app settings" onClick={() => setLabel(a.label)}>Edit</Btn> : undefined}>
            {label === null ? (
              <dl className="grid grid-cols-[220px_1fr] gap-y-2.5 text-[14px]">
                <dt className="text-[#6E6E78]">Application label</dt>
                <dd>{a.label}</dd>
                <dt className="text-[#6E6E78]">Application visibility</dt>
                <dd>Display application icon to users</dd>
                <dt className="text-[#6E6E78]">Provisioning</dt>
                <dd>{a.provisioning ? 'Enabled — Create, Update, Deactivate users' : 'Not configured'}</dd>
                <dt className="text-[#6E6E78]">App instance ID</dt>
                <dd className="font-mono text-[12px]">{a.oktaId}</dd>
              </dl>
            ) : (
              <div className="space-y-3">
                <label className="block max-w-[420px]">
                  <span className="block text-[13px] font-semibold mb-1">Application label</span>
                  <input aria-label="Application label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
                </label>
                <div className="flex gap-2">
                  <Btn
                    primary
                    label="Save"
                    disabled={!label.trim()}
                    onClick={() => {
                      db.update('okta.apps', a.id, { label: label.trim() })
                      addLog(isAgent, 'application.lifecycle.update', 'Update application', [appTarget(a)])
                      setLabel(null)
                      setNotice('App settings saved.')
                    }}
                  >
                    Save
                  </Btn>
                  <Btn label="Cancel" onClick={() => setLabel(null)}>Cancel</Btn>
                </div>
              </div>
            )}
          </Card>
        )}
        {tab === 'signon' && (
          <Card title="Sign on methods">
            <dl className="grid grid-cols-[220px_1fr] gap-y-2.5 text-[14px]">
              <dt className="text-[#6E6E78]">Sign-on method</dt>
              <dd>{a.signOn}</dd>
              <dt className="text-[#6E6E78]">{a.signOn === 'OIDC' ? 'Client ID' : 'Identity Provider Issuer'}</dt>
              <dd className="font-mono text-[12px]">{a.signOn === 'OIDC' ? a.oktaId : `http://www.okta.com/exk${a.oktaId.slice(3)}`}</dd>
              <dt className="text-[#6E6E78]">Signing certificate</dt>
              <dd>SHA-256 · expires {fmtOkta(new Date(Date.now() + 340 * 864e5).toISOString())}</dd>
              <dt className="text-[#6E6E78]">Authentication policy</dt>
              <dd>
                <button onClick={() => go({ area: 'admin', page: 'policies' })} className="text-[#1662DD] font-medium hover:underline">
                  Any two factors
                </button>
              </dd>
              <dt className="text-[#6E6E78]">Username format</dt>
              <dd>Okta username</dd>
            </dl>
          </Card>
        )}
        {tab === 'assignments' && (
          <div className="bg-white rounded-lg border border-[#E1E1E6]">
            <div className="flex items-center gap-2 p-4">
              <Btn primary agent="okta-app-assign-people" label="Assign to People" onClick={() => setModal('people')}>Assign to People</Btn>
              <Btn label="Assign to Groups" onClick={() => setModal('groups')}>Assign to Groups</Btn>
              <div className="flex-1" />
              <SearchBox value={q} onChange={setQ} placeholder="Search assignments" width={260} />
            </div>
            <table className="w-full text-[14px]">
              <thead>
                <tr className={thead}>
                  <th className={th}>Person</th>
                  <th className={th}>Type</th>
                  <th className={th}>Assigned</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const u = users.find((y) => y.id === x.userId)!
                  return (
                    <tr key={x.id} className="border-b border-[#EBEBED] last:border-0">
                      <td className="px-4 py-2">
                        <button onClick={() => go({ area: 'admin', page: 'user', userId: u.id, tab: 'applications' })} className="text-[#1662DD] font-semibold hover:underline">
                          {fullName(u)}
                        </button>
                        <div className="text-[12px] text-[#6E6E78]">{x.appUsername ?? u.login}</div>
                      </td>
                      <td className="px-4 py-2 text-[13px]">{x.scope === 'GROUP' ? `Group: ${x.group ?? 'Everyone'}` : 'Individual'}</td>
                      <td className="px-4 py-2 text-[13px]">{fmtOkta(x.assignedAt)}</td>
                      <td className="pr-3">
                        {x.scope === 'USER' && (
                          <button
                            aria-label={`Unassign ${fullName(u)}`}
                            onClick={() => {
                              db.remove('okta.assignments', x.id)
                              addLog(isAgent, 'application.user_membership.remove', 'Remove user from application membership', [userTarget(u), appTarget(a)])
                            }}
                            className="w-8 h-8 rounded flex items-center justify-center text-[#6E6E78] hover:bg-[#F4F4F4]"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#6E6E78]">
                      No assignments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal === 'people' && (
        <PickModal
          title={`Assign ${a.label} to People`}
          items={users.filter((u) => u.status !== 'DEPROVISIONED').map((u) => ({ id: u.id, label: fullName(u), sub: u.login, done: asg.some((x) => x.userId === u.id && x.appId === a.id) }))}
          onPick={(id) => assign(users.find((u) => u.id === id)!)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'groups' && (
        <PickModal
          title={`Assign ${a.label} to Groups`}
          items={groups.map((g) => ({ id: g.id, label: g.name, sub: g.description, done: (g.apps ?? []).includes(a.id) }))}
          onPick={(id) => {
            const g = groups.find((x) => x.id === id)
            db.update('okta.groups', id, { apps: [...(g.apps ?? []), a.id] })
            for (const u of users.filter((y) => y.groups.includes(id)))
              if (!db.get<OktaAssignment>('okta.assignments').some((x) => x.userId === u.id && x.appId === a.id))
                db.insert('okta.assignments', { id: uid('okta-as'), userId: u.id, appId: a.id, assignedAt: new Date().toISOString(), assignedBy: isAgent ? 'hworker' : 'alex', scope: 'GROUP', group: g.name, appUsername: u.login })
            addLog(isAgent, 'group.application_assignment.add', 'Add assigned application to group', [groupTarget(g), appTarget(a)])
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

/* ═════════════════════ Devices ═════════════════════ */

export function Devices({ go }: { go: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const users = useCollection<OktaUser>('okta.users')
  const [over, setOver] = useOktaSetting<Record<string, string>>('device-status', {})
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const devices = useMemo(
    () =>
      users
        .filter((u) => u.status === 'ACTIVE' && u.mfa.length > 0)
        .flatMap((u) => [
          { id: `${u.id}-laptop`, u, name: `${u.firstName}'s Surface Laptop 6`, os: 'Windows 11 Enterprise 23H2', mgmt: 'Managed (Intune)', icon: Laptop },
          { id: `${u.id}-phone`, u, name: `${u.firstName}'s iPhone 15`, os: 'iOS 18.1', mgmt: 'Not managed', icon: DeviceMobile },
        ]),
    [users],
  )
  const rows = devices.filter((d) => !q || `${d.name} ${fullName(d.u)} ${d.os}`.toLowerCase().includes(q.toLowerCase()))
  const statusOf = (id: string) => over[id] ?? 'ACTIVE'
  const setStatus = (d: (typeof devices)[number], st: string) => {
    setOver({ [d.id]: st })
    addLog(isAgent, st === 'ACTIVE' ? 'device.lifecycle.activate' : st === 'SUSPENDED' ? 'device.lifecycle.suspend' : 'device.lifecycle.deactivate', st === 'ACTIVE' ? 'Activate device' : st === 'SUSPENDED' ? 'Suspend device' : 'Deactivate device', [{ type: 'Device', displayName: d.name, alternateId: d.id }, userTarget(d.u)])
  }
  return (
    <div className="pb-8">
      <PageHead title="Devices" sub="Devices registered with Okta Verify across your org." />
      <div className="px-8">
        <div className="bg-white rounded-lg border border-[#E1E1E6]">
          <div className="flex items-center gap-3 p-4">
            <SearchBox value={q} onChange={setQ} placeholder="Search devices or owners" />
            <span className="text-[13px] text-[#6E6E78]">{rows.length} devices</span>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th}>Device</th>
                <th className={th}>Owner</th>
                <th className={th}>Platform</th>
                <th className={th}>Management</th>
                <th className={th}>Status</th>
                <th className="w-[90px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const st = statusOf(d.id)
                return (
                  <tr key={d.id} className="border-b border-[#EBEBED] last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <d.icon size={20} className="text-[#46464F]" /> <span className="font-medium">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => go({ area: 'admin', page: 'user', userId: d.u.id, tab: 'devices' })} className="text-[#1662DD] hover:underline">
                        {fullName(d.u)}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-[13px]">{d.os}</td>
                    <td className="px-4 py-2.5 text-[13px]">{d.mgmt}</td>
                    <td className="px-4 py-2.5 text-[13px]">
                      <span className={st === 'ACTIVE' ? 'text-[#1E8A3A] font-medium' : st === 'SUSPENDED' ? 'text-[#E08A00] font-medium' : 'text-[#6E6E78]'}>{st === 'ACTIVE' ? 'Active' : st === 'SUSPENDED' ? 'Suspended' : 'Deactivated'}</span>
                    </td>
                    <td className="pr-3 relative">
                      <Btn small label={`Actions for ${d.name}`} onClick={() => setMenu(menu === d.id ? null : d.id)}>Actions</Btn>
                      {menu === d.id && (
                        <Menu
                          className="right-3 top-10"
                          onClose={() => setMenu(null)}
                          items={[
                            { label: 'Activate', disabled: st === 'ACTIVE', onClick: () => setStatus(d, 'ACTIVE') },
                            { label: 'Suspend', disabled: st !== 'ACTIVE', onClick: () => setStatus(d, 'SUSPENDED') },
                            { label: 'Deactivate', danger: true, disabled: st === 'DEACTIVATED', onClick: () => setStatus(d, 'DEACTIVATED') },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════ Authentication policies ═════════════════════ */

type Rule = { id: string; name: string; who: string; network: string; access: string; enabled: boolean }
type Policy = { id: string; name: string; apps: string[]; rules: Rule[] }
const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'pol-any-two',
    name: 'Any two factors',
    apps: ['outlook', 'teams', 'slack', 'workday', 'salesforce', 'servicenow', 'sap'],
    rules: [
      { id: 'r1', name: 'Block anonymizers', who: 'Everyone', network: 'Anonymizers zone', access: 'Denied', enabled: true },
      { id: 'r2', name: 'Boston office — known devices', who: 'Everyone', network: 'Boston HQ zone', access: 'Allowed after 1 factor (Okta FastPass)', enabled: true },
      { id: 'r3', name: 'Catch-all rule', who: 'Everyone', network: 'Any network', access: 'Allowed after 2 factors', enabled: true },
    ],
  },
  {
    id: 'pol-admins',
    name: 'Phishing-resistant MFA for Admins',
    apps: ['okta-admin', 'hworker'],
    rules: [
      { id: 'r1', name: 'Admins — phishing resistant', who: 'Okta Super Admins', network: 'Any network', access: 'Allowed after FIDO2 or Okta FastPass', enabled: true },
      { id: 'r2', name: 'Catch-all rule', who: 'Everyone', network: 'Any network', access: 'Denied', enabled: true },
    ],
  },
  {
    id: 'pol-password',
    name: 'Password only (legacy)',
    apps: ['zoom'],
    rules: [{ id: 'r1', name: 'Catch-all rule', who: 'Everyone', network: 'Any network', access: 'Allowed after 1 factor', enabled: true }],
  },
]

export function Policies() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('authn-policies', { list: DEFAULT_POLICIES })
  const list = v.list
  const [sel, setSel] = useState(list[0]?.id)
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', who: 'Everyone', network: 'Any network', access: 'Allowed after 2 factors' })
  const p = list.find((x) => x.id === sel) ?? list[0]
  const save = (next: Policy[], msg: string) => {
    set({ list: next })
    addLog(isAgent, 'policy.lifecycle.update', msg, [{ type: 'PolicyEntity', displayName: p.name, alternateId: 'Authentication Policy' }])
  }
  const updRules = (rules: Rule[], msg: string) => save(list.map((x) => (x.id === p.id ? { ...x, rules } : x)), msg)
  const move = (i: number, d: -1 | 1) => {
    const r = [...p.rules]
    const j = i + d
    if (j < 0 || j >= r.length - 1 || i >= r.length - 1) return
    ;[r[i], r[j]] = [r[j], r[i]]
    updRules(r, 'Update policy rule priority')
  }
  return (
    <div className="pb-8">
      <PageHead title="Authentication Policies" sub="Rules that decide how users authenticate to each app." />
      <div className="px-8 flex gap-5 items-start">
        <div className="w-[260px] shrink-0 bg-white rounded-lg border border-[#E1E1E6] py-2">
          {list.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`w-full text-left px-4 py-2.5 text-[14px] ${x.id === p.id ? 'bg-[#E6EEFC] text-[#1450B8] font-semibold' : 'hover:bg-[#F4F4F4]'}`}>
              {x.name}
              <div className="text-[12px] text-[#6E6E78] font-normal">{x.apps.length} apps · {x.rules.length} rules</div>
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0 bg-white rounded-lg border border-[#E1E1E6]">
          <div className="flex items-center gap-3 p-4">
            <div className="flex-1 text-[16px] font-semibold">{p.name}</div>
            <Btn primary label="Add rule" agent="okta-policy-add-rule" onClick={() => setAdding(true)}><Plus size={15} /> Add rule</Btn>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th + ' w-14'}>Priority</th>
                <th className={th}>Rule</th>
                <th className={th}>IF</th>
                <th className={th}>THEN</th>
                <th className={th + ' w-[150px]'}>Status</th>
              </tr>
            </thead>
            <tbody>
              {p.rules.map((r, i) => {
                const last = i === p.rules.length - 1
                return (
                  <tr key={r.id} className="border-b border-[#EBEBED] last:border-0">
                    <td className="px-4 py-2.5 text-[13px]">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-[13px]">
                      {r.who} · {r.network}
                    </td>
                    <td className="px-4 py-2.5 text-[13px]">{r.access}</td>
                    <td className="px-4 py-2.5">
                      {last ? (
                        <span className="text-[12px] text-[#6E6E78]">Default rule</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Toggle on={r.enabled} label={`Enable ${r.name}`} onChange={(on) => updRules(p.rules.map((x) => (x.id === r.id ? { ...x, enabled: on } : x)), on ? 'Activate policy rule' : 'Deactivate policy rule')} />
                          <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-[#6E6E78] disabled:opacity-30"><ArrowUp size={14} /></button>
                          <button aria-label="Move down" disabled={i >= p.rules.length - 2} onClick={() => move(i, 1)} className="text-[#6E6E78] disabled:opacity-30"><ArrowDown size={14} /></button>
                          <button aria-label={`Delete ${r.name}`} onClick={() => updRules(p.rules.filter((x) => x.id !== r.id), 'Delete policy rule')} className="text-[#6E6E78] hover:text-[#DA372C]"><Trash size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 text-[13px] text-[#6E6E78]">Applies to: {p.apps.join(', ')}</div>
        </div>
      </div>
      {adding && (
        <Modal
          title="Add rule"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                primary
                label="Save"
                disabled={!f.name.trim()}
                onClick={() => {
                  const r: Rule = { id: uid('rule'), ...f, name: f.name.trim(), enabled: true }
                  updRules([...p.rules.slice(0, -1), r, p.rules[p.rules.length - 1]], 'Add policy rule')
                  setAdding(false)
                  setF({ name: '', who: 'Everyone', network: 'Any network', access: 'Allowed after 2 factors' })
                }}
              >
                Save
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Rule name</span>
              <input aria-label="Rule name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
            </label>
            {(
              [
                ['who', 'User is member of', ['Everyone', 'Okta Super Admins', 'Dept - Operations', 'Dept - Finance', 'Contractors']],
                ['network', 'Network', ['Any network', 'Boston HQ zone', 'Chicago DC zone', 'Anonymizers zone', 'Not in any zone']],
                ['access', 'Access is', ['Allowed after 1 factor', 'Allowed after 2 factors', 'Allowed after FIDO2 or Okta FastPass', 'Denied']],
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
          </div>
        </Modal>
      )}
    </div>
  )
}

export function GlobalSessionPolicy() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('gsp', { lifetime: '12 hours', idle: '2 hours', persistent: false, mfa: 'Required for every sign-in' })
  const [notice, setNotice] = useState('')
  const upd = (patch: any) => {
    set(patch)
    addLog(isAgent, 'policy.lifecycle.update', 'Update policy', [{ type: 'PolicyEntity', displayName: 'Default Policy', alternateId: 'Global Session Policy' }])
    setNotice('Global Session Policy saved.')
  }
  return (
    <div className="pb-8">
      <PageHead title="Global Session Policy" sub="Controls who can access Okta and how long sessions last." />
      <div className="px-8 space-y-4 max-w-[860px]">
        {notice && <Notice text={notice} onClose={() => setNotice('')} />}
        <Card title="Default Policy · Default Rule">
          <div className="space-y-4 text-[14px]">
            {(
              [
                ['lifetime', 'Maximum Okta global session lifetime', ['2 hours', '8 hours', '12 hours', '24 hours', '7 days']],
                ['idle', 'Maximum Okta global session idle time', ['15 minutes', '30 minutes', '2 hours', '8 hours']],
                ['mfa', 'Establish the session with', ['Required for every sign-in', 'Required if device is unknown', 'Not required']],
              ] as const
            ).map(([k, l, opts]) => (
              <label key={k} className="grid grid-cols-[320px_1fr] items-center gap-4">
                <span className="font-medium">{l}</span>
                <select aria-label={l} value={v[k]} onChange={(e) => upd({ [k]: e.target.value })} className={inputCls + ' max-w-[280px]'}>
                  {opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ))}
            <div className="grid grid-cols-[320px_1fr] items-center gap-4">
              <span className="font-medium">Okta global session cookies persist across browser sessions</span>
              <Toggle on={v.persistent} label="Persistent session cookies" onChange={(on) => upd({ persistent: on })} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ═════════════════════ Networks ═════════════════════ */

type Zone = { id: string; name: string; type: string; gateways: string; usage: string; active: boolean; builtIn?: boolean }
const DEFAULT_ZONES: Zone[] = [
  { id: 'z-block', name: 'BlockedIpZone', type: 'IP', gateways: '45.83.64.0/22, 185.220.101.0/24', usage: 'Blocklist', active: true, builtIn: true },
  { id: 'z-legacy', name: 'LegacyIpZone', type: 'IP', gateways: '—', usage: 'Policy', active: true, builtIn: true },
  { id: 'z-anon', name: 'Anonymizers zone', type: 'Dynamic', gateways: 'Any anonymizing proxy', usage: 'Policy', active: true },
  { id: 'z-boston', name: 'Boston HQ zone', type: 'IP', gateways: '73.114.62.0/24', usage: 'Policy', active: true },
  { id: 'z-chicago', name: 'Chicago DC zone', type: 'IP', gateways: '64.124.18.0/25', usage: 'Policy', active: true },
]

export function Networks() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('zones', { list: DEFAULT_ZONES })
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', type: 'IP', gateways: '', usage: 'Policy' })
  const save = (list: Zone[], ev: string, msg: string, z: Zone) => {
    set({ list })
    addLog(isAgent, ev, msg, [{ type: 'NetworkZone', displayName: z.name, alternateId: z.id }])
  }
  return (
    <div className="pb-8">
      <PageHead title="Networks" sub="Network zones used in authentication policies and the blocklist." actions={<Btn primary agent="okta-network-add" label="Add zone" onClick={() => setAdding(true)}><Plus size={15} /> Add zone</Btn>} />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th}>Zone</th>
                <th className={th}>Type</th>
                <th className={th}>Gateways / criteria</th>
                <th className={th}>Usage</th>
                <th className={th + ' w-[150px]'}>Status</th>
              </tr>
            </thead>
            <tbody>
              {v.list.map((z) => (
                <tr key={z.id} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                    <Globe size={16} className="text-[#46464F]" /> {z.name}
                  </td>
                  <td className="px-4 py-2.5 text-[13px]">{z.type}</td>
                  <td className="px-4 py-2.5 text-[13px] font-mono">{z.gateways}</td>
                  <td className="px-4 py-2.5 text-[13px]">{z.usage}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Toggle on={z.active} label={`Activate ${z.name}`} onChange={(on) => save(v.list.map((x) => (x.id === z.id ? { ...x, active: on } : x)), on ? 'zone.activate' : 'zone.deactivate', on ? 'Activate network zone' : 'Deactivate network zone', z)} />
                      {!z.builtIn && (
                        <button aria-label={`Delete ${z.name}`} onClick={() => save(v.list.filter((x) => x.id !== z.id), 'zone.delete', 'Delete network zone', z)} className="text-[#6E6E78] hover:text-[#DA372C]">
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {adding && (
        <Modal
          title="Add network zone"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                primary
                label="Save"
                disabled={!f.name.trim() || (f.type === 'IP' && !f.gateways.trim())}
                onClick={() => {
                  const z: Zone = { id: uid('zone'), ...f, name: f.name.trim(), gateways: f.gateways.trim() || 'Any anonymizing proxy', active: true }
                  save([...v.list, z], 'zone.create', 'Create network zone', z)
                  setAdding(false)
                  setF({ name: '', type: 'IP', gateways: '', usage: 'Policy' })
                }}
              >
                Save
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Zone name</span>
              <input aria-label="Zone name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Zone type</span>
              <select aria-label="Zone type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inputCls}>
                <option>IP</option>
                <option>Dynamic</option>
              </select>
            </label>
            {f.type === 'IP' && (
              <label className="block">
                <span className="block text-[13px] font-semibold mb-1">Gateway IPs (CIDR, comma separated)</span>
                <input aria-label="Gateway IPs" value={f.gateways} onChange={(e) => setF({ ...f, gateways: e.target.value })} placeholder="203.0.113.0/24" className={inputCls + ' font-mono'} />
              </label>
            )}
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Usage</span>
              <select aria-label="Zone usage" value={f.usage} onChange={(e) => setF({ ...f, usage: e.target.value })} className={inputCls}>
                <option>Policy</option>
                <option>Blocklist</option>
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═════════════════════ Administrators ═════════════════════ */

export const ADMIN_ROLES = ['Super Administrator', 'Organization Administrator', 'Application Administrator', 'Group Administrator', 'Help Desk Administrator', 'Read-only Administrator', 'Report Administrator']

export function Administrators({ go }: { go: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const users = useCollection<OktaUser>('okta.users')
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ userId: '', role: 'Help Desk Administrator' })
  const rows = users.flatMap((u) => [
    ...(u.groups.includes('okta-g-admins') ? [{ u, role: 'Super Administrator', via: 'Group: Okta Super Admins' }] : []),
    ...(((u as any).adminRoles ?? []) as string[]).map((role) => ({ u, role, via: 'Individual' })),
  ])
  return (
    <div className="pb-8">
      <PageHead title="Administrators" sub="Admin role assignments in your org." actions={<Btn primary agent="okta-admins-add" label="Add administrator" onClick={() => setAdding(true)}><Plus size={15} /> Add administrator</Btn>} />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th}>Administrator</th>
                <th className={th}>Role</th>
                <th className={th}>Assigned via</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.u.id + r.role} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-4 py-2.5">
                    <button onClick={() => go({ area: 'admin', page: 'user', userId: r.u.id, tab: 'roles' })} className="text-[#1662DD] font-semibold hover:underline">
                      {fullName(r.u)}
                    </button>
                    <div className="text-[12px] text-[#6E6E78]">{r.u.login}</div>
                  </td>
                  <td className="px-4 py-2.5">{r.role}</td>
                  <td className="px-4 py-2.5 text-[13px]">{r.via}</td>
                  <td className="pr-3">
                    {r.via === 'Individual' && (
                      <button
                        aria-label={`Remove ${r.role} from ${fullName(r.u)}`}
                        onClick={() => {
                          db.update('okta.users', r.u.id, { adminRoles: ((r.u as any).adminRoles ?? []).filter((x: string) => x !== r.role) })
                          addLog(isAgent, 'user.account.privilege.revoke', 'User privilege revoked', [userTarget(r.u), { type: 'Role', displayName: r.role, alternateId: r.role }])
                        }}
                        className="w-8 h-8 rounded flex items-center justify-center text-[#6E6E78] hover:bg-[#F4F4F4]"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {adding && (
        <Modal
          title="Add administrator"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                primary
                label="Save changes"
                disabled={!f.userId}
                onClick={() => {
                  const u = users.find((x) => x.id === f.userId)!
                  const cur: string[] = (u as any).adminRoles ?? []
                  if (!cur.includes(f.role)) db.update('okta.users', u.id, { adminRoles: [...cur, f.role] })
                  addLog(isAgent, 'user.account.privilege.grant', 'User privilege granted', [userTarget(u), { type: 'Role', displayName: f.role, alternateId: f.role }])
                  setAdding(false)
                  setF({ userId: '', role: 'Help Desk Administrator' })
                }}
              >
                Save changes
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Admin</span>
              <select aria-label="Admin user" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} className={inputCls}>
                <option value="">Select a person</option>
                {users
                  .filter((u) => u.status === 'ACTIVE')
                  .sort((a, b) => a.firstName.localeCompare(b.firstName))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {fullName(u)} ({u.login})
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Role</span>
              <select aria-label="Admin role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={inputCls}>
                {ADMIN_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═════════════════════ Reports ═════════════════════ */

export function Reports({ go }: { go: (r: Route) => void }) {
  const users = useCollection<OktaUser>('okta.users')
  const apps = useCollection<OktaApp>('okta.apps')
  const asg = useCollection<OktaAssignment>('okta.assignments')
  const logs = useCollection<OktaLog>('okta.logs')
  const [rep, setRep] = useState<'assignments' | 'mfa' | 'sso' | 'inactive'>('assignments')
  const live = users.filter((u) => u.status !== 'DEPROVISIONED')
  const list: [typeof rep, string, string][] = [
    ['assignments', 'Current Assignments', 'Users assigned to each application'],
    ['mfa', 'MFA Usage', 'Authenticator enrollment per user'],
    ['sso', 'App Sign-On Activity', 'SSO events per application (System Log)'],
    ['inactive', 'Inactive Users', 'Active users who haven’t signed in for 30+ days'],
  ]
  return (
    <div className="pb-8">
      <PageHead title="Reports" />
      <div className="px-8 flex gap-5 items-start">
        <div className="w-[260px] shrink-0 bg-white rounded-lg border border-[#E1E1E6] py-2">
          {list.map(([k, t, d]) => (
            <button key={k} data-agent={`okta-report-${k}`} onClick={() => setRep(k)} className={`w-full text-left px-4 py-2.5 ${rep === k ? 'bg-[#E6EEFC]' : 'hover:bg-[#F4F4F4]'}`}>
              <div className={`text-[14px] ${rep === k ? 'text-[#1450B8] font-semibold' : 'font-medium'}`}>{t}</div>
              <div className="text-[12px] text-[#6E6E78]">{d}</div>
            </button>
          ))}
          <button onClick={() => go({ area: 'admin', page: 'logs' })} className="w-full text-left px-4 py-2.5 hover:bg-[#F4F4F4] text-[14px] text-[#1662DD] font-medium">
            System Log →
          </button>
        </div>
        <div className="flex-1 min-w-0 bg-white rounded-lg border border-[#E1E1E6]">
          {rep === 'assignments' && (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-[#46464F] border-b border-[#E1E1E6] bg-[#FAFAFA]">
                  <th className={th}>Application</th>
                  <th className={th + ' text-right'}>Individual</th>
                  <th className={th + ' text-right'}>Via group</th>
                  <th className={th + ' text-right'}>Total</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  const xs = asg.filter((x) => x.appId === a.id)
                  return (
                    <tr key={a.id} className="border-b border-[#EBEBED] last:border-0">
                      <td className="px-4 py-2">
                        <button onClick={() => go({ area: 'admin', page: 'app', appId: a.id })} className="flex items-center gap-2 text-[#1662DD] hover:underline">
                          <img src={logoUrl(a.logo)} className="w-6 h-6" alt="" /> {a.label}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{xs.filter((x) => x.scope === 'USER').length}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{xs.filter((x) => x.scope === 'GROUP').length}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{xs.length}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {rep === 'mfa' && (
            <>
              <div className="p-4 text-[14px]">
                <b>{Math.round((live.filter((u) => u.mfa.length).length / Math.max(1, live.length)) * 100)}%</b> of users have at least one authenticator enrolled.
              </div>
              <table className="w-full text-[14px]">
                <thead>
                  <tr className={thead}>
                    <th className={th}>Person</th>
                    <th className={th}>Authenticators</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((u) => (
                    <tr key={u.id} className="border-b border-[#EBEBED] last:border-0">
                      <td className="px-4 py-2">
                        <button onClick={() => go({ area: 'admin', page: 'user', userId: u.id, tab: 'applications' })} className="text-[#1662DD] hover:underline">
                          {fullName(u)}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-[13px]">{u.mfa.map((m) => m.type).join(', ') || <span className="text-[#DA372C]">None enrolled</span>}</td>
                      <td className="px-4 py-2 text-[13px]">
                        <StatusDot status={u.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {rep === 'sso' && (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-[#46464F] border-b border-[#E1E1E6] bg-[#FAFAFA]">
                  <th className={th}>Application</th>
                  <th className={th + ' text-right'}>SSO events</th>
                  <th className={th}>Last sign-on</th>
                </tr>
              </thead>
              <tbody>
                {apps
                  .map((a) => {
                    const ev = logs.filter((l) => l.eventType === 'user.authentication.sso' && l.target.some((t) => t.alternateId === a.id || t.displayName === a.label))
                    return { a, n: ev.length, last: ev.map((l) => l.published).sort().slice(-1)[0] }
                  })
                  .sort((x, y) => y.n - x.n)
                  .map(({ a, n, last }) => (
                    <tr key={a.id} className="border-b border-[#EBEBED] last:border-0">
                      <td className="px-4 py-2 flex items-center gap-2">
                        <img src={logoUrl(a.logo)} className="w-6 h-6" alt="" /> {a.label}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{n}</td>
                      <td className="px-4 py-2 text-[13px]">{last ? relative(last) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {rep === 'inactive' && (
            <table className="w-full text-[14px]">
              <thead>
                <tr className={thead}>
                  <th className={th}>Person</th>
                  <th className={th}>Last sign in</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => u.status === 'ACTIVE' && (!u.lastLogin || Date.now() - +new Date(u.lastLogin) > 30 * 864e5))
                  .map((u) => (
                    <tr key={u.id} className="border-b border-[#EBEBED] last:border-0">
                      <td className="px-4 py-2">
                        <button onClick={() => go({ area: 'admin', page: 'user', userId: u.id, tab: 'applications' })} className="text-[#1662DD] hover:underline">
                          {fullName(u)}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-[13px]">{fmtOktaTime(u.lastLogin)}</td>
                    </tr>
                  ))}
                {!users.some((u) => u.status === 'ACTIVE' && (!u.lastLogin || Date.now() - +new Date(u.lastLogin) > 30 * 864e5)) && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-[#6E6E78]">
                      No inactive users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════ Agents ═════════════════════ */

export function Agents() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting<Record<string, boolean>>('agents', { 'NW-DC01': true, 'NW-DC02': true, 'NW-RADIUS01': true })
  const rows: [string, string, string, string][] = [
    ['NW-DC01', 'Active Directory agent', 'northwind.local', '3.17.0'],
    ['NW-DC02', 'Active Directory agent', 'northwind.local', '3.17.0'],
    ['NW-RADIUS01', 'RADIUS Server agent', 'VPN — BOS-GW01', '2.21.0'],
  ]
  return (
    <div className="pb-8">
      <PageHead title="Agents" sub="On-premises agents connected to your org." />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th}>Agent</th>
                <th className={th}>Type</th>
                <th className={th}>Directory / app</th>
                <th className={th}>Version</th>
                <th className={th}>Status</th>
                <th className="w-[130px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map(([n, t, d, ver]) => (
                <tr key={n} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                    <Plugs size={16} /> {n}
                  </td>
                  <td className="px-4 py-2.5 text-[13px]">{t}</td>
                  <td className="px-4 py-2.5 text-[13px]">{d}</td>
                  <td className="px-4 py-2.5 text-[13px]">{ver}</td>
                  <td className="px-4 py-2.5 text-[13px]">{v[n] ? <span className="text-[#1E8A3A] font-medium">● Operational</span> : <span className="text-[#6E6E78]">● Deactivated</span>}</td>
                  <td className="pr-4 text-right">
                    <Btn
                      small
                      label={v[n] ? `Deactivate ${n}` : `Activate ${n}`}
                      onClick={() => {
                        set({ [n]: !v[n] })
                        addLog(isAgent, v[n] ? 'system.agent.deactivate' : 'system.agent.activate', v[n] ? 'Agent deactivated' : 'Agent activated', [{ type: 'Agent', displayName: n, alternateId: n }])
                      }}
                    >
                      {v[n] ? 'Deactivate' : 'Activate'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

/* ═════════════════════ Notifications ═════════════════════ */

export function AdminNotifications({ go }: { go: (r: Route) => void }) {
  const users = useCollection<OktaUser>('okta.users')
  const [v, set] = useOktaSetting<{ read: string[] }>('admin-notifications', { read: [] })
  const staged = users.filter((u) => u.status === 'STAGED').length
  const locked = users.filter((u) => u.status === 'LOCKED_OUT').length
  const items: { id: string; icon: any; color: string; title: string; body: string; at: string; to: Route }[] = [
    { id: 'n-import', icon: CheckCircle, color: '#1E8A3A', title: 'Workday import completed', body: '1 user created, 3 updated. New users are Staged until activated.', at: new Date(Date.now() - 19 * 3600e3).toISOString(), to: { area: 'admin', page: 'integrations' } },
    { id: 'n-staged', icon: Info, color: '#1662DD', title: `${staged} staged user${staged === 1 ? '' : 's'} awaiting activation`, body: 'Activate users so they can sign in on their start date.', at: new Date(Date.now() - 18 * 3600e3).toISOString(), to: { area: 'admin', page: 'people', tab: 'STAGED' } },
    { id: 'n-locked', icon: Warning, color: '#DA372C', title: `${locked} locked-out user${locked === 1 ? '' : 's'}`, body: 'Users exceeded the password attempt limit.', at: new Date(Date.now() - 6 * 3600e3).toISOString(), to: { area: 'admin', page: 'people', tab: 'LOCKED_OUT' } },
    { id: 'n-release', icon: Bell, color: '#46464F', title: 'Okta release 2026.10.1 is live', body: 'Identity Threat Protection now supports session revocation for Microsoft 365.', at: new Date(Date.now() - 3 * 864e5).toISOString(), to: { area: 'admin', page: 'itp' } },
  ]
  return (
    <div className="pb-8">
      <PageHead title="Notifications" actions={<Btn label="Mark all as read" onClick={() => set({ read: items.map((i) => i.id) })}>Mark all as read</Btn>} />
      <div className="px-8 space-y-3 max-w-[860px]">
        {items.map((n) => {
          const read = v.read.includes(n.id)
          return (
            <button key={n.id} onClick={() => (set({ read: [...new Set([...v.read, n.id])] }), go(n.to))} className="w-full text-left bg-white rounded-lg border border-[#E1E1E6] p-4 flex gap-3 hover:border-[#1662DD]">
              <n.icon size={22} weight="fill" style={{ color: n.color }} />
              <div className="flex-1">
                <div className={`text-[14px] ${read ? 'font-medium text-[#46464F]' : 'font-semibold'}`}>{n.title}</div>
                <div className="text-[13px] text-[#6E6E78]">{n.body}</div>
              </div>
              <div className="text-[12px] text-[#6E6E78] whitespace-nowrap">{relative(n.at)}</div>
              {!read && <span className="w-2 h-2 rounded-full bg-[#1662DD] mt-1.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═════════════════════ Getting started ═════════════════════ */

export function GettingStarted({ go }: { go: (r: Route) => void }) {
  const [v, set] = useOktaSetting<{ done: string[] }>('getting-started', { done: ['sso', 'directory', 'mfa'] })
  const steps: [string, string, string, Route][] = [
    ['directory', 'Connect a directory', 'Import users from Workday and Active Directory.', { area: 'admin', page: 'integrations' }],
    ['sso', 'Add apps for single sign-on', 'Add integrations from the Okta Integration Network.', { area: 'admin', page: 'apps' }],
    ['mfa', 'Set up multifactor authentication', 'Require Okta Verify or FIDO2 for everyone.', { area: 'admin', page: 'security' }],
    ['policies', 'Review authentication policies', 'Make sure every app uses phishing-resistant MFA.', { area: 'admin', page: 'policies' }],
    ['itp', 'Turn on Identity Threat Protection', 'Continuously evaluate risk during sessions.', { area: 'admin', page: 'itp' }],
    ['branding', 'Customize your brand', 'Add your logo and colors to the sign-in page.', { area: 'admin', page: 'customizations' }],
  ]
  return (
    <div className="pb-8">
      <PageHead title="Getting Started" sub={`${v.done.length} of ${steps.length} setup tasks complete`} />
      <div className="px-8 max-w-[860px]">
        <div className="h-2 rounded-full bg-[#EBEBED] overflow-hidden mb-5">
          <div className="h-full bg-[#1662DD]" style={{ width: `${(v.done.length / steps.length) * 100}%` }} />
        </div>
        <Card pad={false}>
          {steps.map(([id, t, d, r]) => {
            const done = v.done.includes(id)
            return (
              <div key={id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#EBEBED] last:border-0">
                <button aria-label={done ? `Mark ${t} not done` : `Mark ${t} done`} onClick={() => set({ done: done ? v.done.filter((x) => x !== id) : [...v.done, id] })}>
                  {done ? <CheckCircle size={22} weight="fill" className="text-[#1E8A3A]" /> : <Circle size={22} className="text-[#A0A0A8]" />}
                </button>
                <div className="flex-1">
                  <div className={`text-[14px] font-semibold ${done ? 'text-[#6E6E78] line-through' : ''}`}>{t}</div>
                  <div className="text-[13px] text-[#6E6E78]">{d}</div>
                </div>
                <Btn small label={`Go to ${t}`} onClick={() => go(r)}>Go</Btn>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

/* ═════════════════════ Profile sources ═════════════════════ */

export function ProfileSources({ go }: { go: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting<{ order: string[] }>('profile-sources', { order: ['Workday', 'northwind.local'] })
  const users = useCollection<OktaUser>('okta.users')
  const meta: Record<string, [string, string]> = { Workday: ['workday', 'HR as a Source'], 'northwind.local': ['windows', 'Active Directory'] }
  const move = (i: number, d: number) => {
    const o = [...v.order]
    ;[o[i], o[i + d]] = [o[i + d], o[i]]
    set({ order: o })
    addLog(isAgent, 'system.profile_source.reorder', 'Profile source priority updated', [{ type: 'AppInstance', displayName: o[0], alternateId: o[0] }])
  }
  return (
    <div className="pb-8">
      <PageHead title="Profile Sources" sub="When a user comes from more than one source, the highest-priority source masters their profile." />
      <div className="px-8 max-w-[860px]">
        <Card pad={false}>
          {v.order.map((n, i) => (
            <div key={n} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#EBEBED] last:border-0">
              <span className="w-6 text-[14px] font-semibold text-[#6E6E78]">{i + 1}</span>
              <img src={logoUrl(meta[n]?.[0] ?? 'okta')} className="w-8 h-8" alt="" />
              <div className="flex-1">
                <button onClick={() => go({ area: 'admin', page: 'integrations' })} className="text-[14px] font-semibold text-[#1662DD] hover:underline">
                  {n}
                </button>
                <div className="text-[12.5px] text-[#6E6E78]">
                  {meta[n]?.[1]} · {users.filter((u) => (n === 'Workday' ? u.source === 'Workday' : u.source === 'Active Directory')).length} users
                </div>
              </div>
              <button aria-label={`Raise priority of ${n}`} disabled={i === 0} onClick={() => move(i, -1)} className="w-8 h-8 rounded border border-[#D7D7DC] flex items-center justify-center disabled:opacity-30">
                <ArrowUp size={14} />
              </button>
              <button aria-label={`Lower priority of ${n}`} disabled={i === v.order.length - 1} onClick={() => move(i, 1)} className="w-8 h-8 rounded border border-[#D7D7DC] flex items-center justify-center disabled:opacity-30">
                <ArrowDown size={14} />
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

/* ═════════════════════ Generic settings pages ═════════════════════ */

const SETTINGS_DEF: Record<string, { title: string; sub: string; rows: [string, string, string, boolean][] }> = {
  'enduser-settings': {
    title: 'End-User Dashboard',
    sub: 'Choose what people see on their Okta dashboard.',
    rows: [
      ['recent', 'Show “Recently used” section', 'Display the apps each person used most recently.', true],
      ['addApps', 'Allow users to add apps', 'Users can request apps from the catalog (approval required).', true],
      ['sections', 'Allow users to create sections', 'Users can organize tiles into their own sections.', true],
      ['footer', 'Show Okta footer', 'Display “Powered by Okta” on the dashboard.', true],
    ],
  },
  'custom-other': {
    title: 'Other Customizations',
    sub: 'Error pages, IdP discovery and user account settings.',
    rows: [
      ['selfService', 'Self-service account recovery', 'Let users unlock their own accounts via Okta Verify.', true],
      ['customError', 'Custom error pages', 'Use Northwind-branded error pages on login.northwind.com.', false],
      ['idpDiscovery', 'IdP discovery', 'Route contractors to their home identity provider.', false],
    ],
  },
  'security-general': {
    title: 'General',
    sub: 'Org-wide security settings.',
    rows: [
      ['newSignOn', 'New sign-on notification email', 'Email users when they sign in from a new device.', true],
      ['pwChanged', 'Password changed notification email', 'Email users when their password changes.', true],
      ['suspicious', 'Suspicious activity reporting', 'Users can report unrecognized activity from notification emails.', true],
      ['factorEnroll', 'Authenticator enrolled notification email', 'Email users when a new authenticator is enrolled.', true],
      ['threatInsight', 'Okta ThreatInsight', 'Block requests from IPs with suspicious activity.', true],
    ],
  },
  'profile-enrollment': {
    title: 'Profile Enrollment',
    sub: 'Collect profile attributes during sign-up and progressive profiling.',
    rows: [
      ['selfReg', 'Allow self-service registration', 'People can create their own Okta account.', false],
      ['progressive', 'Progressive profiling', 'Ask for missing attributes (mobile phone) at sign-in.', true],
    ],
  },
  itp: {
    title: 'Identity Threat Protection',
    sub: 'Continuously evaluate user and session risk.',
    rows: [
      ['enabled', 'Enable Identity Threat Protection', 'Evaluate risk signals throughout each session.', false],
      ['universalLogout', 'Universal Logout', 'Revoke sessions in Microsoft 365, Slack and Zoom when risk is high.', false],
      ['entityRisk', 'Entity risk policy', 'Require re-authentication when user risk changes to High.', false],
    ],
  },
  features: {
    title: 'Features',
    sub: 'Early access and beta features for your org.',
    rows: [
      ['fastpassPhishing', 'Okta FastPass phishing resistance', 'Require phishing-resistant FastPass on managed devices.', true],
      ['adminSessionBinding', 'Admin session ASN binding', 'End admin sessions when the network changes.', true],
      ['groupPush2', 'Group Push v2', 'Faster group push to downstream apps.', false],
      ['secureIdentityCommander', 'Secure Identity Commander', 'Infrastructure-as-code for Okta configuration (beta).', false],
    ],
  },
}

export function SettingsPage({ page }: { page: string }) {
  const { isAgent } = useDesk()
  const def = SETTINGS_DEF[page]
  const [v, set] = useOktaSetting<Record<string, boolean>>(`settings-${page}`, Object.fromEntries(def.rows.map(([k, , , d]) => [k, d])))
  return (
    <div className="pb-8">
      <PageHead title={def.title} sub={def.sub} />
      <div className="px-8 max-w-[860px]">
        <Card pad={false}>
          {def.rows.map(([k, t, d]) => (
            <div key={k} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#EBEBED] last:border-0">
              <div className="flex-1">
                <div className="text-[14px] font-semibold">{t}</div>
                <div className="text-[13px] text-[#6E6E78]">{d}</div>
              </div>
              <Toggle
                on={!!v[k]}
                label={t}
                agent={`okta-setting-${page}-${k}`}
                onChange={(on) => {
                  set({ [k]: on })
                  addLog(isAgent, 'system.org.feature.update', `${on ? 'Enable' : 'Disable'} ${t}`, [{ type: 'Org', displayName: 'northwind', alternateId: def.title }])
                }}
              />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

/* ═════════════════════ API service integrations ═════════════════════ */

const API_DEFAULTS = [
  { id: 'api-hworker', name: 'H-Worker Agent', logo: 'hworker', scopes: 'okta.users.manage, okta.apps.manage, okta.logs.read', created: new Date(Date.now() - 120 * 864e5).toISOString() },
  { id: 'api-sn', name: 'ServiceNow Identity Sync', logo: 'servicenow', scopes: 'okta.users.read, okta.groups.read', created: new Date(Date.now() - 300 * 864e5).toISOString() },
]

export function ApiIntegrations() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('api-integrations', { list: API_DEFAULTS })
  const [adding, setAdding] = useState(false)
  const catalog = [
    ['Elastic Security', 'okta.logs.read'],
    ['Splunk Cloud', 'okta.logs.read'],
    ['CrowdStrike Falcon', 'okta.users.read, okta.logs.read'],
    ['Zendesk Identity Sync', 'okta.users.read'],
  ]
  return (
    <div className="pb-8">
      <PageHead title="API Service Integrations" sub="OAuth 2.0 service apps with scoped access to the Okta API." actions={<Btn primary label="Add integration" onClick={() => setAdding(true)}><Plus size={15} /> Add integration</Btn>} />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th}>Integration</th>
                <th className={th}>Granted scopes</th>
                <th className={th}>Added</th>
                <th className="w-[110px]" />
              </tr>
            </thead>
            <tbody>
              {v.list.map((x) => (
                <tr key={x.id} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                    <img src={logoUrl(x.logo)} className="w-6 h-6" alt="" /> {x.name}
                  </td>
                  <td className="px-4 py-2.5 text-[12.5px] font-mono">{x.scopes}</td>
                  <td className="px-4 py-2.5 text-[13px]">{fmtOkta(x.created)}</td>
                  <td className="pr-4 text-right">
                    <Btn
                      small
                      label={`Revoke ${x.name}`}
                      onClick={() => {
                        set({ list: v.list.filter((y) => y.id !== x.id) })
                        addLog(isAgent, 'app.oauth2.as.consent.revoke', 'Revoke API service integration', [{ type: 'AppInstance', displayName: x.name, alternateId: x.id }])
                      }}
                    >
                      Revoke
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {adding && (
        <PickModal
          title="Add API service integration"
          verb="Add"
          items={catalog.map(([n, s]) => ({ id: n, label: n, sub: s, done: v.list.some((x) => x.name === n) }))}
          onPick={(n) => {
            const s = catalog.find((c) => c[0] === n)![1]
            set({ list: [...v.list, { id: uid('api'), name: n, logo: 'okta', scopes: s, created: new Date().toISOString() }] })
            addLog(isAgent, 'app.oauth2.as.consent.grant', 'Grant API service integration', [{ type: 'AppInstance', displayName: n, alternateId: n }])
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}

/* ═════════════════════ Event hooks ═════════════════════ */

export function EventHooks() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting('event-hooks', {
    list: [
      { id: 'hook-sn', name: 'ServiceNow — lifecycle events', url: 'https://northwind.service-now.com/api/okta/events', events: 'user.lifecycle.activate, user.lifecycle.deactivate', active: true },
      { id: 'hook-siem', name: 'SIEM — security events', url: 'https://siem.northwind.com/okta', events: 'user.session.start, user.account.lock', active: true },
    ],
  })
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', url: 'https://', events: 'user.lifecycle.create' })
  return (
    <div className="pb-8">
      <PageHead title="Event Hooks" sub="Send Okta events to external services in real time." actions={<Btn primary label="Create Event Hook" onClick={() => setAdding(true)}><Plus size={15} /> Create Event Hook</Btn>} />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th}>Name</th>
                <th className={th}>Endpoint</th>
                <th className={th}>Events</th>
                <th className={th + ' w-[120px]'}>Status</th>
              </tr>
            </thead>
            <tbody>
              {v.list.map((h) => (
                <tr key={h.id} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                    <Lightning size={16} className="text-[#1662DD]" /> {h.name}
                  </td>
                  <td className="px-4 py-2.5 text-[12.5px] font-mono truncate max-w-[260px]">{h.url}</td>
                  <td className="px-4 py-2.5 text-[12.5px] font-mono">{h.events}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Toggle on={h.active} label={`Activate ${h.name}`} onChange={(on) => (set({ list: v.list.map((x) => (x.id === h.id ? { ...x, active: on } : x)) }), addLog(isAgent, on ? 'event_hook.activated' : 'event_hook.deactivated', on ? 'Event hook activated' : 'Event hook deactivated', [{ type: 'EventHook', displayName: h.name, alternateId: h.id }]))} />
                      <button aria-label={`Delete ${h.name}`} onClick={() => set({ list: v.list.filter((x) => x.id !== h.id) })} className="text-[#6E6E78] hover:text-[#DA372C]">
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {adding && (
        <Modal
          title="Create Event Hook"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Btn label="Cancel" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn
                primary
                label="Save & Continue"
                disabled={!f.name.trim() || !/^https:\/\/.+/.test(f.url)}
                onClick={() => {
                  set({ list: [...v.list, { id: uid('hook'), ...f, name: f.name.trim(), active: true }] })
                  addLog(isAgent, 'event_hook.created', 'Event hook created', [{ type: 'EventHook', displayName: f.name.trim(), alternateId: f.url }])
                  setAdding(false)
                  setF({ name: '', url: 'https://', events: 'user.lifecycle.create' })
                }}
              >
                Save &amp; Continue
              </Btn>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Name</span>
              <input aria-label="Hook name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Endpoint URL (HTTPS)</span>
              <input aria-label="Endpoint URL" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className={inputCls + ' font-mono'} />
            </label>
            <label className="block">
              <span className="block text-[13px] font-semibold mb-1">Subscribe to events</span>
              <select aria-label="Events" value={f.events} onChange={(e) => setF({ ...f, events: e.target.value })} className={inputCls}>
                {['user.lifecycle.create', 'user.lifecycle.activate, user.lifecycle.deactivate', 'user.account.lock', 'group.user_membership.add', 'application.user_membership.add'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═════════════════════ Workflows console ═════════════════════ */

export function WorkflowsConsole() {
  const { isAgent } = useDesk()
  const [v, set] = useOktaSetting<Record<string, boolean>>('wf-flows', { onboard: true, offboard: true, slack: true, report: false })
  const flows: [string, string, string, number][] = [
    ['onboard', 'Onboarding — create accounts on Workday hire', 'Workday: Hire → Okta: Create user → Slack: Post welcome', 42],
    ['offboard', 'Offboarding — deprovision on termination', 'Workday: Terminate → Okta: Deactivate → Google: Transfer files', 17],
    ['slack', 'Notify #it-help on lockouts', 'Okta: User locked out → Slack: Post message', 128],
    ['report', 'Weekly MFA enrollment report', 'Schedule: Monday 8 AM → Okta: List users → Email: Send CSV', 0],
  ]
  return (
    <div className="pb-8">
      <PageHead title="Workflows" sub="Okta Workflows · Northwind Automations folder" />
      <div className="px-8 grid grid-cols-2 gap-4">
        {flows.map(([k, t, d, runs]) => (
          <Card key={k}>
            <div className="flex items-start gap-3 pt-4">
              <Lightning size={22} className="text-[#1662DD] mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold">{t}</div>
                <div className="text-[13px] text-[#6E6E78] mt-0.5">{d}</div>
                <div className="text-[12px] text-[#6E6E78] mt-2">{runs} runs in the last 30 days</div>
              </div>
              <Toggle on={!!v[k]} label={`Turn ${t} ${v[k] ? 'off' : 'on'}`} onChange={(on) => (set({ [k]: on }), addLog(isAgent, on ? 'workflows.user.flow.activate' : 'workflows.user.flow.deactivate', on ? 'Flow turned on' : 'Flow turned off', [{ type: 'Flow', displayName: t, alternateId: k }]))} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ═════════════════════ Insights ═════════════════════ */

export function Insights({ go }: { go: (r: Route) => void }) {
  const users = useCollection<OktaUser>('okta.users')
  const noMfa = users.filter((u) => u.status === 'ACTIVE' && !u.mfa.length).length
  const recs: [any, string, string, string, Route][] = [
    [ShieldCheck, 'Enforce phishing-resistant MFA', `${noMfa} active user${noMfa === 1 ? ' has' : 's have'} no authenticator enrolled.`, 'Review MFA usage', { area: 'admin', page: 'reports' }],
    [Warning, 'Turn on Identity Threat Protection', 'Continuously evaluate session risk and revoke sessions automatically.', 'Configure', { area: 'admin', page: 'itp' }],
    [UsersThree, 'Review dormant accounts', 'Accounts with no sign-in in 30 days increase your attack surface.', 'View inactive users', { area: 'admin', page: 'reports' }],
    [ChartBar, 'Tighten the legacy password-only policy', 'Zoom still allows password-only sign-in.', 'Edit policy', { area: 'admin', page: 'policies' }],
  ]
  return (
    <div className="pb-8">
      <PageHead title="Okta Insights" sub="Recommendations based on your org’s configuration and activity." />
      <div className="px-8 grid grid-cols-2 gap-4">
        {recs.map(([I, t, d, cta, r]) => (
          <Card key={t}>
            <div className="pt-4">
              <I size={24} className="text-[#1662DD]" />
              <div className="text-[15px] font-semibold mt-2">{t}</div>
              <div className="text-[13px] text-[#6E6E78] mt-1">{d}</div>
              <div className="mt-3">
                <Btn small label={cta} onClick={() => go(r)}>{cta}</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ═════════════════════ Downloads ═════════════════════ */

export function Downloads() {
  const { toast } = useDesk()
  const rows: [string, string, string][] = [
    ['Okta Active Directory Agent', '3.17.0', 'Windows Server 2016+'],
    ['Okta RADIUS Server Agent', '2.21.0', 'Windows / Linux'],
    ['Okta Verify for Windows', '5.2.1', 'Windows 10 / 11'],
    ['Okta Verify for macOS', '9.30.0', 'macOS 13+'],
    ['Okta Browser Plugin', '6.40.0', 'Chrome, Edge, Firefox'],
    ['Okta LDAP Agent', '5.21.0', 'Linux'],
  ]
  return (
    <div className="pb-8">
      <PageHead title="Downloads" />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className={thead}>
                <th className={th}>Software</th>
                <th className={th}>Version</th>
                <th className={th}>Platform</th>
                <th className="w-[130px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map(([n, ver, plat]) => (
                <tr key={n} className="border-b border-[#EBEBED] last:border-0">
                  <td className="px-4 py-2.5 font-medium">{n}</td>
                  <td className="px-4 py-2.5 text-[13px]">{ver}</td>
                  <td className="px-4 py-2.5 text-[13px]">{plat}</td>
                  <td className="pr-4 text-right">
                    <Btn small label={`Download ${n}`} onClick={() => toast({ appId: 'okta', title: 'Download started', body: `${n} ${ver}` })}>
                      <DownloadSimple size={14} /> Download
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[13px] font-semibold text-[#6E6E78] uppercase tracking-wide mb-2">{title}</div>
      {children}
    </div>
  )
}

export { HWChip, StatusBadge }
