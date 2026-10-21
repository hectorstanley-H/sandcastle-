import { useMemo, useState } from 'react'
import { CaretDown, CaretLeft, MagnifyingGlass, X, CheckCircle, DeviceMobile, Laptop, UsersThree, ClockCounterClockwise, User, Check } from '@phosphor-icons/react'
import { db, uid, useCollection, useRecord } from '@/db/db'
import { useDesk } from '@/os/context'
import { logoUrl } from '@/os/registry'
import {
  addLog, appTarget, Btn, fmtOkta, fmtOktaTime, fullName, HWChip, isFresh, Modal, StatusBadge, userTarget,
  type OktaApp, type OktaAssignment, type OktaUser, type Route,
} from './shared'

const TABS: [string, string][] = [
  ['applications', 'Applications'],
  ['groups', 'Groups'],
  ['profile', 'Profile'],
  ['devices', 'Devices'],
  ['roles', 'Admin roles'],
]

export function UserProfile({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const u = useRecord<OktaUser>('okta.users', route.userId)
  const tab = route.tab ?? 'applications'
  const [modal, setModal] = useState<null | 'activate' | 'assign' | 'mfa' | 'suspend' | 'password'>(null)
  const [more, setMore] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (!u) return <div className="p-8 text-[14px] text-[#6E6E78]">User not found.</div>
  const name = fullName(u)
  const stamp = () => ({ updatedBy: isAgent ? 'hworker' : 'alex', updatedAt: new Date().toISOString() })

  const activate = (sendEmail: boolean) => {
    db.update('okta.users', u.id, { status: 'ACTIVE', activated: new Date().toISOString(), ...stamp() })
    addLog(isAgent, 'user.lifecycle.activate', 'Activate Okta user', [userTarget(u)])
    if (sendEmail) addLog(isAgent, 'system.email.send_activation', 'Send user activation email', [userTarget(u)], { actor: { id: 'okta-system', type: 'SystemPrincipal', displayName: 'Okta System', alternateId: 'system@okta.com' }, by: undefined })
    setModal(null)
    setNotice(`${name} has been activated.${sendEmail ? ` An activation email was sent to ${u.email}.` : ''}`)
  }

  const isActiveLike = ['ACTIVE', 'PASSWORD_EXPIRED', 'LOCKED_OUT'].includes(u.status)

  return (
    <div className="pb-8">
      {/* header */}
      <div className="px-8 pt-5 pb-0 bg-white border-b border-[#E1E1E6]">
        <button onClick={() => go({ area: 'admin', page: 'people' })} className="flex items-center gap-1 text-[13px] text-[#1662DD] font-medium mb-3">
          <CaretLeft size={12} weight="bold" /> Back to People
        </button>
        <div className="flex items-start gap-4">
          <span className="w-14 h-14 rounded-full bg-[#EEEEF0] text-[#46464F] flex items-center justify-center text-[20px] font-semibold shrink-0">{u.firstName[0]}{u.lastName[0]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.3px]">{name}</h1>
              <StatusBadge status={u.status} />
              {u.updatedBy === 'hworker' && <HWChip text="Updated by H-Worker" />}
            </div>
            <div className="text-[14px] text-[#46464F] mt-0.5">{u.login}</div>
            <div className="text-[13px] text-[#6E6E78] mt-0.5">{u.title} · {u.department}{u.source ? ` · Profile source: ${u.source}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {(u.status === 'STAGED' || u.status === 'PROVISIONED') && (
            <Btn primary agent="okta-user-activate" label={u.status === 'STAGED' ? 'Activate' : 'Resend activation email'} onClick={() => setModal('activate')}>
              {u.status === 'STAGED' ? 'Activate' : 'Resend Activation Email'}
            </Btn>
          )}
          {isActiveLike && (
            <>
              <Btn agent="okta-reset-password" label="Reset Password" onClick={() => setModal('password')}>Reset Password</Btn>
              <Btn agent="okta-reset-mfa" label="Reset Multifactor" onClick={() => setModal('mfa')}>Reset Multifactor</Btn>
              <Btn agent="okta-user-suspend" label="Suspend" onClick={() => setModal('suspend')}>Suspend</Btn>
            </>
          )}
          {u.status === 'SUSPENDED' && (
            <Btn primary agent="okta-user-unsuspend" label="Unsuspend" onClick={() => { db.update('okta.users', u.id, { status: 'ACTIVE', ...stamp() }); addLog(isAgent, 'user.lifecycle.unsuspend', 'Unsuspend Okta user', [userTarget(u)]) }}>Unsuspend</Btn>
          )}
          <Btn label="View Logs" onClick={() => go({ area: 'admin', page: 'logs' })}><ClockCounterClockwise size={15} /> View Logs</Btn>
          <div className="relative">
            <Btn agent="okta-user-more" label="More Actions" onClick={() => setMore(!more)}>More Actions <CaretDown size={13} /></Btn>
            {more && (
              <div className="absolute left-0 top-10 z-20 w-56 bg-white rounded-md border border-[#E1E1E6] shadow-[0_8px_24px_rgba(29,29,33,0.16)] py-1 text-[14px]">
                {['Clear User Sessions', 'Expire Password', 'Set Password', 'Deactivate'].map((x) => (
                  <button key={x} onClick={() => setMore(false)} className={`w-full text-left px-4 h-9 hover:bg-[#F4F4F4] ${x === 'Deactivate' ? 'text-[#DA372C]' : ''}`}>{x}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        {notice && (
          <div className="flash-new mt-4 flex items-center gap-2 rounded-md bg-[#E6F4EA] border border-[#B7DEC1] px-4 py-2.5 text-[14px] text-[#1B6E31]">
            <CheckCircle size={18} weight="fill" /> <span className="flex-1">{notice}</span>
            <button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={14} /></button>
          </div>
        )}
        {/* tabs */}
        <div className="flex gap-6 mt-5 -mb-px">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              data-agent={`okta-user-tab-${id}`}
              aria-label={`${label} tab`}
              onClick={() => go({ ...route, tab: id })}
              className={`h-11 text-[14px] border-b-2 ${tab === id ? 'border-[#1662DD] text-[#1662DD] font-semibold' : 'border-transparent text-[#46464F] hover:text-[#1D1D21] font-medium'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 pt-6 flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          {tab === 'applications' && <AppsTab u={u} onAssign={() => setModal('assign')} />}
          {tab === 'groups' && <GroupsTab u={u} />}
          {tab === 'profile' && <ProfileTab u={u} />}
          {tab === 'devices' && <DevicesTab u={u} />}
          {tab === 'roles' && <RolesTab u={u} />}
        </div>
        <SidePanel u={u} />
      </div>

      {modal === 'activate' && <ActivateModal u={u} onClose={() => setModal(null)} onConfirm={activate} />}
      {modal === 'assign' && <AssignModal u={u} onClose={() => setModal(null)} />}
      {modal === 'mfa' && <ResetMfaModal u={u} onClose={() => setModal(null)} onDone={(n) => setNotice(n)} />}
      {modal === 'suspend' && (
        <Modal
          title="Suspend Person"
          onClose={() => setModal(null)}
          footer={<><Btn label="Cancel" onClick={() => setModal(null)}>Cancel</Btn><Btn primary agent="okta-suspend-confirm" label="Suspend" onClick={() => { db.update('okta.users', u.id, { status: 'SUSPENDED', ...stamp() }); addLog(isAgent, 'user.lifecycle.suspend', 'Suspend Okta user', [userTarget(u)]); setModal(null); setNotice(`${name} has been suspended.`) }}>Suspend</Btn></>}
        >
          Are you sure you want to suspend <b>{name}</b>? They won't be able to sign in until unsuspended. Their app assignments are kept.
        </Modal>
      )}
      {modal === 'password' && (
        <Modal
          title="Reset Password"
          onClose={() => setModal(null)}
          footer={<><Btn label="Cancel" onClick={() => setModal(null)}>Cancel</Btn><Btn primary agent="okta-reset-password-confirm" label="Send reset email" onClick={() => { db.update('okta.users', u.id, { status: u.status === 'LOCKED_OUT' ? 'ACTIVE' : 'PASSWORD_EXPIRED', ...stamp() }); addLog(isAgent, 'user.account.reset_password', 'Fired when the user’s Okta password is reset', [userTarget(u)]); setModal(null); setNotice(`A password reset email was sent to ${u.email}.`) }}>Send password reset email</Btn></>}
        >
          An email with a link to reset their password will be sent to <b>{u.email}</b>. The link expires in 1 hour.
        </Modal>
      )}
    </div>
  )
}

/* ─────────────── tabs ─────────────── */

function AppsTab({ u, onAssign }: { u: OktaUser; onAssign: () => void }) {
  const { isAgent } = useDesk()
  const apps = useCollection<OktaApp>('okta.apps')
  const all = useCollection<OktaAssignment>('okta.assignments')
  const [q, setQ] = useState('')
  const mine = all.filter((a) => a.userId === u.id).sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1))
  const rows = mine.filter((a) => (apps.find((x) => x.id === a.appId)?.label ?? '').toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="bg-white rounded-lg border border-[#E1E1E6]">
      <div className="flex items-center gap-3 p-4">
        <Btn primary agent="okta-assign-apps" label="Assign Applications" onClick={onAssign}>Assign Applications</Btn>
        <div className="flex-1" />
        <div className="flex items-center gap-2 h-9 w-[260px] rounded-[4px] border border-[#8C8C96] px-3">
          <MagnifyingGlass size={16} className="text-[#6E6E78]" />
          <input aria-label="Search assigned applications" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 bg-transparent outline-none text-[14px]" />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="border-t border-[#E1E1E6] py-14 flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-full bg-[#F4F4F4] flex items-center justify-center mb-3"><img src={logoUrl('okta')} className="w-7 h-7 opacity-40" alt="" /></span>
          <div className="text-[16px] font-semibold">No applications assigned</div>
          <div className="text-[14px] text-[#6E6E78] mt-1 max-w-[380px]">{u.firstName} has no apps yet. Assign applications to give {u.firstName} single sign-on access.</div>
        </div>
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]">
              <th className="px-4 py-2.5 font-semibold">Application</th>
              <th className="px-3 py-2.5 font-semibold">Assignment &amp; App username</th>
              <th className="px-3 py-2.5 font-semibold w-[150px]">Assigned</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const app = apps.find((x) => x.id === a.appId)
              if (!app) return null
              return (
                <tr key={a.id} data-agent={`okta-user-app-${a.appId}`} className={`border-b border-[#EBEBED] last:border-0 hover:bg-[#FAFAFA] ${isFresh(a.assignedAt) ? 'flash-new' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <img src={logoUrl(app.logo)} className="w-8 h-8" alt="" />
                      <div>
                        <div className="text-[#1662DD] font-semibold">{app.label}</div>
                        <div className="text-[12px] text-[#6E6E78]">{app.signOn}{app.provisioning ? ' · Provisioning' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {a.scope === 'GROUP' ? <span className="text-[13px]">Group: <span className="font-medium">{a.group ?? 'Everyone'}</span></span> : <span className="text-[13px] font-medium">Individual</span>}
                      {a.assignedBy === 'hworker' && <HWChip text="Assigned by H-Worker" />}
                    </div>
                    <div className="text-[12px] text-[#6E6E78]">{a.appUsername ?? u.login}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-[#46464F]">{fmtOkta(a.assignedAt)}</td>
                  <td className="pr-3">
                    {a.scope === 'USER' && (
                      <button
                        aria-label={`Unassign ${app.label}`}
                        onClick={() => {
                          db.remove('okta.assignments', a.id)
                          addLog(isAgent, 'application.user_membership.remove', 'Remove user from application membership', [userTarget(u), appTarget(app)])
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
          </tbody>
        </table>
      )}
    </div>
  )
}

function GroupsTab({ u }: { u: OktaUser }) {
  const groups = useCollection('okta.groups')
  const mine = groups.filter((g) => u.groups.includes(g.id))
  return (
    <div className="bg-white rounded-lg border border-[#E1E1E6]">
      <div className="p-4 flex items-center"><Btn primary label="Assign to group">Assign to group</Btn></div>
      <table className="w-full text-[14px]">
        <thead><tr className="text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]"><th className="px-4 py-2.5 font-semibold">Group</th><th className="px-3 py-2.5 font-semibold">Membership</th><th className="px-3 py-2.5 font-semibold">Source</th></tr></thead>
        <tbody>
          {mine.map((g) => (
            <tr key={g.id} className="border-b border-[#EBEBED] last:border-0">
              <td className="px-4 py-2.5"><div className="flex items-center gap-3"><span className="w-8 h-8 rounded-md bg-[#EEEEF0] flex items-center justify-center"><UsersThree size={17} /></span><div><div className="text-[#1662DD] font-semibold">{g.name}</div><div className="text-[12px] text-[#6E6E78]">{g.description}</div></div></div></td>
              <td className="px-3 py-2.5 text-[13px]">{g.type === 'APP_GROUP' ? 'Pushed by app' : g.type === 'BUILT_IN' ? 'Built-in' : 'Rule / manual'}</td>
              <td className="px-3 py-2.5 text-[13px]">{g.source ?? 'Okta'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProfileTab({ u }: { u: OktaUser }) {
  const rows: [string, string, string][] = [
    ['Username', 'login', u.login],
    ['First name', 'firstName', u.firstName],
    ['Last name', 'lastName', u.lastName],
    ['Primary email', 'email', u.email],
    ['Secondary email', 'secondEmail', ''],
    ['Title', 'title', u.title],
    ['Department', 'department', u.department],
    ['Manager', 'manager', u.manager],
    ['Employee number', 'employeeNumber', (u as any).employeeNumber ?? ''],
    ['Mobile phone', 'mobilePhone', (u as any).mobilePhone ?? ''],
    ['City', 'city', ((u as any).location ?? '').split(',')[0]],
    ['State', 'state', ((u as any).location ?? '').split(', ')[1] ?? ''],
    ['Country code', 'countryCode', 'US'],
    ['Organization', 'organization', 'Northwind Global'],
    ['User type', 'userType', 'Employee'],
    ['Start date', 'startDate', (u as any).startDate ?? fmtOkta(u.created)],
  ]
  return (
    <div className="bg-white rounded-lg border border-[#E1E1E6]">
      <div className="flex items-center px-5 py-4">
        <div className="flex-1">
          <div className="text-[16px] font-semibold">Attributes</div>
          <div className="text-[13px] text-[#6E6E78]">Some attributes are mastered by {(u as any).source ?? 'Okta'} and can't be edited here.</div>
        </div>
        <Btn small label="Edit">Edit</Btn>
      </div>
      <dl className="border-t border-[#E1E1E6]">
        {rows.map(([k, v, val]) => (
          <div key={v} className="grid grid-cols-[260px_1fr] border-b border-[#EBEBED] last:border-0 px-5 py-2.5 text-[14px]">
            <dt>
              <div className="font-medium">{k}</div>
              <div className="text-[12px] text-[#6E6E78] font-mono">{v}</div>
            </dt>
            <dd className="text-[#1D1D21] self-center">{val || <span className="text-[#A0A0A8]">—</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function DevicesTab({ u }: { u: OktaUser }) {
  const has = u.status === 'ACTIVE' && u.mfa.length > 0
  const devices = has
    ? [
        { icon: Laptop, name: `${u.firstName}'s Surface Laptop 6`, os: 'Windows 11 Enterprise 23H2', status: 'Active', mgmt: 'Managed (Intune)', last: u.lastLogin },
        { icon: DeviceMobile, name: `${u.firstName}'s iPhone 15`, os: 'iOS 18.1', status: 'Active', mgmt: 'Not managed', last: u.lastLogin },
      ]
    : []
  return (
    <div className="bg-white rounded-lg border border-[#E1E1E6]">
      {devices.length ? (
        <table className="w-full text-[14px]">
          <thead><tr className="text-left text-[12px] text-[#46464F] border-b border-[#E1E1E6] bg-[#FAFAFA]"><th className="px-4 py-2.5 font-semibold">Device</th><th className="px-3 py-2.5 font-semibold">Platform</th><th className="px-3 py-2.5 font-semibold">Management</th><th className="px-3 py-2.5 font-semibold">Last used</th></tr></thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.name} className="border-b border-[#EBEBED] last:border-0">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><d.icon size={22} className="text-[#46464F]" /><div><div className="font-semibold">{d.name}</div><div className="text-[12px] text-[#1E8A3A]">● {d.status} · Okta Verify registered</div></div></div></td>
                <td className="px-3 py-3 text-[13px]">{d.os}</td>
                <td className="px-3 py-3 text-[13px]">{d.mgmt}</td>
                <td className="px-3 py-3 text-[13px]">{fmtOktaTime(d.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-14 text-center">
          <Laptop size={36} className="mx-auto text-[#A0A0A8]" />
          <div className="text-[16px] font-semibold mt-2">No devices</div>
          <div className="text-[14px] text-[#6E6E78]">Devices appear here once {u.firstName} enrolls Okta Verify.</div>
        </div>
      )}
    </div>
  )
}

function RolesTab({ u }: { u: OktaUser }) {
  const admin = u.groups.includes('okta-g-admins')
  return (
    <div className="bg-white rounded-lg border border-[#E1E1E6]">
      <div className="p-4 flex items-center"><div className="flex-1 text-[16px] font-semibold">Admin roles</div><Btn small label="Edit individual assignments">Edit individual assignments</Btn></div>
      <table className="w-full text-[14px]">
        <thead><tr className="text-left text-[12px] text-[#46464F] border-y border-[#E1E1E6] bg-[#FAFAFA]"><th className="px-4 py-2.5 font-semibold">Role</th><th className="px-3 py-2.5 font-semibold">Resource set</th><th className="px-3 py-2.5 font-semibold">Assigned via</th></tr></thead>
        <tbody>
          {admin ? (
            <tr><td className="px-4 py-3 font-semibold">Super Administrator</td><td className="px-3 py-3">All resources</td><td className="px-3 py-3">Group: Okta Super Admins</td></tr>
          ) : (
            <tr><td colSpan={3} className="px-4 py-8 text-center text-[#6E6E78]">{u.firstName} has no admin roles. Standard end-user access only.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SidePanel({ u }: { u: OktaUser }) {
  const items: [string, string][] = [
    ['Created', fmtOktaTime(u.created)],
    ['Activated', u.activated ? fmtOktaTime(u.activated) : '—'],
    ['Last sign in', fmtOktaTime(u.lastLogin)],
    ['Password changed', fmtOktaTime((u as any).passwordChanged)],
    ['Okta ID', u.oktaId],
  ]
  return (
    <aside className="w-[280px] shrink-0 space-y-4">
      <div className="bg-white rounded-lg border border-[#E1E1E6] p-4">
        <div className="text-[14px] font-semibold mb-3 flex items-center gap-2"><User size={16} /> User details</div>
        <dl className="space-y-2.5 text-[13px]">
          {items.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[#6E6E78]">{k}</dt>
              <dd className={k === 'Okta ID' ? 'font-mono text-[12px] break-all' : ''}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="bg-white rounded-lg border border-[#E1E1E6] p-4">
        <div className="text-[14px] font-semibold mb-3">Authenticators</div>
        {u.mfa.length ? (
          <ul className="space-y-2 text-[13px]">
            {u.mfa.map((m) => (
              <li key={m.type} className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[#1E8A3A]" /><span className="flex-1">{m.type}</span><span className="text-[#6E6E78] text-[12px]">{fmtOkta(m.enrolled)}</span></li>
            ))}
          </ul>
        ) : (
          <div className="text-[13px] text-[#6E6E78]">No authenticators enrolled.</div>
        )}
      </div>
    </aside>
  )
}

/* ─────────────── modals ─────────────── */

function ActivateModal({ u, onClose, onConfirm }: { u: OktaUser; onClose: () => void; onConfirm: (send: boolean) => void }) {
  const [send, setSend] = useState(true)
  return (
    <Modal
      title="Activate Person"
      onClose={onClose}
      footer={
        <>
          <Btn label="Cancel" onClick={onClose}>Cancel</Btn>
          <Btn primary agent="okta-activate-confirm" label="Activate" onClick={() => onConfirm(send)}>Activate</Btn>
        </>
      }
    >
      <p className="mb-4">Are you sure you want to activate <b>{fullName(u)}</b>?</p>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" data-agent="okta-activate-send-email" aria-label="Send activation email to user" checked={send} onChange={(e) => setSend(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1662DD]" />
        <span>
          <span className="font-medium">Send activation email to user</span>
          <span className="block text-[13px] text-[#6E6E78]">{u.firstName} will receive an email at {u.email} with a link to set up their account. The link expires in 7 days.</span>
        </span>
      </label>
    </Modal>
  )
}

function AssignModal({ u, onClose }: { u: OktaUser; onClose: () => void }) {
  const { isAgent } = useDesk()
  const apps = useCollection<OktaApp>('okta.apps')
  const all = useCollection<OktaAssignment>('okta.assignments')
  const [q, setQ] = useState('')
  const assigned = useMemo(() => new Set(all.filter((a) => a.userId === u.id).map((a) => a.appId)), [all, u.id])
  const rows = apps.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()) || (a.tile ?? '').toLowerCase().includes(q.toLowerCase()))

  const assign = (app: OktaApp) => {
    if (assigned.has(app.id)) return
    db.insert('okta.assignments', {
      id: uid('okta-as'),
      userId: u.id,
      appId: app.id,
      assignedAt: new Date().toISOString(),
      assignedBy: isAgent ? 'hworker' : 'alex',
      scope: 'USER',
      appUsername: u.login,
    })
    addLog(isAgent, 'application.user_membership.add', 'Add user to application membership', [userTarget(u), appTarget(app)])
    if (app.provisioning) addLog(isAgent, 'application.provision.user.push', 'Push new user to external application', [userTarget(u), appTarget(app)])
    db.update('okta.users', u.id, { updatedBy: isAgent ? 'hworker' : 'alex', updatedAt: new Date().toISOString() })
  }

  return (
    <Modal
      title={`Assign Applications to ${fullName(u)}`}
      onClose={onClose}
      width={640}
      footer={<Btn primary agent="okta-assign-done" label="Done" onClick={onClose}>Done</Btn>}
    >
      <div className="flex items-center gap-2 h-9 rounded-[4px] border border-[#8C8C96] px-3 mb-3 focus-within:border-[#1662DD] focus-within:shadow-[0_0_0_2px_#C4D7F7]">
        <MagnifyingGlass size={16} className="text-[#6E6E78]" />
        <input data-agent="okta-assign-search" aria-label="Search applications" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applications" className="flex-1 bg-transparent outline-none text-[14px]" autoFocus />
      </div>
      <ul className="border border-[#E1E1E6] rounded-md divide-y divide-[#EBEBED] max-h-[420px] overflow-auto">
        {rows.map((a) => {
          const done = assigned.has(a.id)
          return (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <img src={logoUrl(a.logo)} className="w-8 h-8" alt="" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold truncate">{a.label}</div>
                <div className="text-[12px] text-[#6E6E78]">{a.signOn}</div>
              </div>
              {done ? (
                <button data-agent={`okta-assign-app-${a.id}`} aria-label={`${a.label} assigned`} disabled className="h-8 px-3 rounded-[4px] text-[13px] font-semibold text-[#1B6E31] bg-[#E6F4EA] flex items-center gap-1.5 cursor-default">
                  <Check size={14} weight="bold" /> Assigned
                </button>
              ) : (
                <button data-agent={`okta-assign-app-${a.id}`} aria-label={`Assign ${a.label}`} onClick={() => assign(a)} className="h-8 px-3.5 rounded-[4px] text-[13px] font-semibold border border-[#1662DD] text-[#1662DD] hover:bg-[#E6EEFC]">
                  Assign
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

function ResetMfaModal({ u, onClose, onDone }: { u: OktaUser; onClose: () => void; onDone: (n: string) => void }) {
  const { isAgent } = useDesk()
  const [sel, setSel] = useState<Set<string>>(() => new Set(u.mfa.map((m) => m.type)))
  const toggle = (t: string) => setSel((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n })
  const confirm = () => {
    const keep = u.mfa.filter((m) => !sel.has(m.type))
    db.update('okta.users', u.id, { mfa: keep, updatedBy: isAgent ? 'hworker' : 'alex', updatedAt: new Date().toISOString() })
    addLog(isAgent, keep.length ? 'user.mfa.factor.deactivate' : 'user.mfa.factor.reset_all', keep.length ? 'Reset factor for user' : 'Reset all factors for user', [userTarget(u), ...[...sel].map((t) => ({ type: 'AuthenticatorEnrollment', displayName: t, alternateId: t }))])
    onClose()
    onDone(`${sel.size} authenticator${sel.size !== 1 ? 's' : ''} reset for ${fullName(u)}. They'll be prompted to enroll at next sign-in.`)
  }
  return (
    <Modal
      title="Reset Multifactor"
      onClose={onClose}
      footer={<><Btn label="Cancel" onClick={onClose}>Cancel</Btn><Btn primary agent="okta-reset-mfa-confirm" label="Reset Selected Factors" disabled={!sel.size} onClick={confirm}>Reset Selected Factors</Btn></>}
    >
      <p className="mb-3">Select the authenticators to reset for <b>{fullName(u)}</b>. They'll need to set them up again the next time they sign in.</p>
      {u.mfa.length ? (
        <ul className="border border-[#E1E1E6] rounded-md divide-y divide-[#EBEBED]">
          {u.mfa.map((m) => (
            <li key={m.type}>
              <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                <input type="checkbox" data-agent={`okta-reset-mfa-factor-${m.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} aria-label={m.type} checked={sel.has(m.type)} onChange={() => toggle(m.type)} className="w-4 h-4 accent-[#1662DD]" />
                <span className="flex-1 font-medium">{m.type}</span>
                <span className="text-[12px] text-[#6E6E78]">Enrolled {fmtOkta(m.enrolled)}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[#6E6E78]">No authenticators are enrolled.</div>
      )}
    </Modal>
  )
}
