import { useMemo } from 'react'
import { CheckCircle, Users, UsersThree, SquaresFour, ShieldWarning, ArrowRight, Info, Warning, LockKey } from '@phosphor-icons/react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Card, PageHead } from './Admin'
import { addLog, Btn, fullName, HWChip, isFresh, StatusDot, userTarget, type OktaApp, type OktaLog, type OktaUser, type Route } from './shared'
import { relative } from '@/data/time'

export function Dashboard({ go }: { go: (r: Route) => void }) {
  const users = useCollection<OktaUser>('okta.users')
  const groups = useCollection('okta.groups')
  const apps = useCollection<OktaApp>('okta.apps')
  const logs = useCollection<OktaLog>('okta.logs')
  const staged = users.filter((u) => u.status === 'STAGED')
  const locked = users.filter((u) => u.status === 'LOCKED_OUT')
  const pwd = users.filter((u) => u.status === 'PASSWORD_EXPIRED')
  const pending = useCollection<any>('okta.requests').filter((r) => r.status === 'PENDING')

  const chart = useMemo(() => {
    const out: { day: string; sso: number; fail: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toDateString()
      const day = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dayLogs = logs.filter((l) => new Date(l.published).toDateString() === key)
      out.push({ day, sso: dayLogs.filter((l) => l.eventType === 'user.authentication.sso' || l.eventType === 'user.session.start').length * 37, fail: dayLogs.filter((l) => l.outcome !== 'SUCCESS').length * 9 })
    }
    return out
  }, [logs])

  const changes = logs.filter((l) => !['user.session.start', 'user.authentication.sso', 'policy.evaluate_sign_on', 'user.authentication.auth_via_mfa'].includes(l.eventType)).slice(0, 7)

  const Stat = ({ icon, label, value, onClick }: any) => (
    <button onClick={onClick} className="flex-1 text-left rounded-lg border border-[#E1E1E6] p-4 hover:border-[#1662DD] bg-white">
      <div className="flex items-center gap-2 text-[13px] text-[#6E6E78]">{icon}{label}</div>
      <div className="mt-2 text-[28px] font-semibold leading-none">{value}</div>
    </button>
  )

  return (
    <div className="pb-8">
      <PageHead title="Dashboard" />
      <div className="px-8 grid grid-cols-3 gap-4">
        <Card title="Overview" className="col-span-2" right={<span className="text-[12px] text-[#6E6E78]">Last 7 days</span>}>
          <div className="flex gap-3">
            <Stat icon={<Users size={16} />} label="Users" value={users.filter((u) => u.status !== 'DEPROVISIONED').length} onClick={() => go({ area: 'admin', page: 'people' })} />
            <Stat icon={<UsersThree size={16} />} label="Groups" value={groups.length} onClick={() => go({ area: 'admin', page: 'groups' })} />
            <Stat icon={<SquaresFour size={16} />} label="SSO apps" value={apps.length} onClick={() => go({ area: 'admin', page: 'apps' })} />
            <Stat icon={<LockKey size={16} />} label="MFA enrollment" value={Math.round((users.filter((u) => u.mfa.length).length / users.length) * 100) + '%'} onClick={() => go({ area: 'admin', page: 'reports' })} />
          </div>
          <div className="mt-5 text-[13px] font-semibold">Sign-in activity</div>
          <div className="h-[170px] mt-1 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="okg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#1662DD" stopOpacity={0.25} />
                    <stop offset="1" stopColor="#1662DD" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EBEBED" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6E6E78' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6E6E78' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Area type="monotone" dataKey="sso" name="Successful sign-ins" stroke="#1662DD" strokeWidth={2} fill="url(#okg)" />
                <Area type="monotone" dataKey="fail" name="Failed sign-ins" stroke="#DA372C" strokeWidth={1.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Status">
          <div className="space-y-3 text-[14px]">
            <div className="flex items-center gap-2"><CheckCircle size={20} weight="fill" className="text-[#1E8A3A]" /> <span className="flex-1">Okta service</span><span className="text-[#1E8A3A] font-medium">Operational</span></div>
            <button onClick={() => go({ area: 'admin', page: 'agents' })} className="w-full flex items-center gap-2 text-left"><CheckCircle size={20} weight="fill" className="text-[#1E8A3A]" /> <span className="flex-1 hover:text-[#1662DD]">AD agents (2)</span><span className="text-[#1E8A3A] font-medium">Connected</span></button>
            <button onClick={() => go({ area: 'admin', page: 'integrations' })} className="w-full flex items-center gap-2 text-left"><CheckCircle size={20} weight="fill" className="text-[#1E8A3A]" /> <span className="flex-1 hover:text-[#1662DD]">Workday import</span><span className="text-[#6E6E78]">19h ago</span></button>
            <div className="flex items-center gap-2"><Warning size={20} weight="fill" className="text-[#E08A00]" /> <span className="flex-1">Push errors</span><span className="text-[#6E6E78]">0</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#EBEBED] text-[13px] text-[#6E6E78]">
            Org: <span className="text-[#1D1D21] font-medium">northwind</span> · Cell OK14 · Release 2026.10.1
          </div>
        </Card>

        <Card title="Tasks" right={<button onClick={() => go({ area: 'admin', page: 'tasks' })} className="text-[13px] text-[#1662DD] font-medium">View all</button>}>
          <ul className="text-[14px] divide-y divide-[#EBEBED]">
            <li className="py-2.5 flex items-center gap-2"><Info size={18} className="text-[#1662DD]" /> <button onClick={() => go({ area: 'admin', page: 'people' })} className="flex-1 text-left text-[#1662DD]">{staged.length} staged user{staged.length !== 1 ? 's' : ''} to activate</button></li>
            <li className="py-2.5 flex items-center gap-2"><ShieldWarning size={18} className="text-[#DA372C]" /> <button onClick={() => go({ area: 'admin', page: 'people', tab: 'LOCKED_OUT' })} className="flex-1 text-left text-[#1662DD]">{locked.length} locked-out user{locked.length !== 1 ? 's' : ''}</button></li>
            <li className="py-2.5 flex items-center gap-2"><Warning size={18} className="text-[#E08A00]" /> <button onClick={() => go({ area: 'admin', page: 'people', tab: 'PASSWORD_EXPIRED' })} className="flex-1 text-left text-[#1662DD]">{pwd.length} user{pwd.length !== 1 ? 's' : ''} with expired password</button></li>
            <li className="py-2.5 flex items-center gap-2"><Info size={18} className="text-[#1662DD]" /> <button onClick={() => go({ area: 'admin', page: 'selfservice' })} className="flex-1 text-left text-[#1662DD]">{pending.length} app assignment{pending.length === 1 ? '' : 's'} pending approval</button></li>
          </ul>
        </Card>

        <Card title="Org changes" className="col-span-2" right={<button onClick={() => go({ area: 'admin', page: 'logs' })} className="text-[13px] text-[#1662DD] font-medium flex items-center gap-1">View System Log <ArrowRight size={12} /></button>}>
          <ul className="text-[13px] divide-y divide-[#EBEBED]">
            {changes.map((l) => (
              <li key={l.id} className={`py-2 flex items-center gap-3 ${isFresh(l.published) ? 'flash-new' : ''}`}>
                <span className="w-[86px] shrink-0 text-[#6E6E78]">{relative(l.published)}</span>
                <span className="flex-1 min-w-0 truncate"><span className="font-medium">{l.displayMessage}</span> <span className="text-[#6E6E78]">· {l.target.map((t) => t.displayName).join(', ')}</span></span>
                {l.by === 'hworker' ? <HWChip text="H-Worker (API)" /> : <span className="text-[#6E6E78] truncate max-w-[160px]">{l.actor.displayName}</span>}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Security monitoring" className="col-span-3" right={<span className="text-[12px] text-[#6E6E78]">HealthInsight</span>}>
          <div className="grid grid-cols-4 gap-3 text-[13px]">
            {[
              ['Phishing-resistant MFA for admins', 'Complete', true],
              ['New sign-on notification email', 'Complete', true],
              ['Block access from anonymizing proxies', 'Complete', true],
              ['Require MFA for Okta Admin Console', 'Complete', true],
              ['Enable Identity Threat Protection', 'Recommended', false],
              ['Session lifetime ≤ 12 hours', 'Complete', true],
              ['Suspicious activity reporting', 'Complete', true],
              ['Review 3 inactive users', 'Recommended', false],
            ].map(([t, s, ok]) => (
              <button
                key={t as string}
                onClick={() => go({ area: 'admin', page: String(t).includes('Threat') ? 'itp' : String(t).includes('inactive') ? 'reports' : String(t).includes('MFA') ? 'policies' : String(t).includes('Session') ? 'gsp' : String(t).includes('proxies') ? 'networks' : 'security-general' })}
                className="text-left rounded-md border border-[#EBEBED] p-3 hover:border-[#1662DD]"
              >
                <div className="font-medium">{t}</div>
                <div className={`mt-1 text-[12px] font-semibold ${ok ? 'text-[#1E8A3A]' : 'text-[#E08A00]'}`}>{s}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export function Tasks({ go }: { go: (r: Route) => void }) {
  const { isAgent } = useDesk()
  const users = useCollection<OktaUser>('okta.users')
  const fix = (u: OktaUser) => {
    const stamp = { updatedBy: isAgent ? 'hworker' : 'alex', updatedAt: new Date().toISOString() }
    if (u.status === 'LOCKED_OUT') {
      db.update('okta.users', u.id, { status: 'ACTIVE', ...stamp })
      addLog(isAgent, 'user.account.unlock', 'Unlock user account', [userTarget(u)])
    } else if (u.status === 'SUSPENDED') {
      db.update('okta.users', u.id, { status: 'ACTIVE', ...stamp })
      addLog(isAgent, 'user.lifecycle.unsuspend', 'Unsuspend Okta user', [userTarget(u)])
    } else if (u.status === 'PROVISIONED') {
      addLog(isAgent, 'system.email.send_activation', 'Send user activation email', [userTarget(u)])
    } else if (u.status === 'PASSWORD_EXPIRED') {
      addLog(isAgent, 'user.account.reset_password', 'Fired when the user’s Okta password is reset', [userTarget(u)])
    } else go({ area: 'admin', page: 'user', userId: u.id, tab: 'applications' })
  }
  const verb = (st: string) => (st === 'LOCKED_OUT' ? 'Unlock' : st === 'SUSPENDED' ? 'Unsuspend' : st === 'PROVISIONED' ? 'Resend email' : st === 'PASSWORD_EXPIRED' ? 'Send reset email' : 'Review')
  const rows = users.filter((u) => ['STAGED', 'LOCKED_OUT', 'PASSWORD_EXPIRED', 'PROVISIONED', 'SUSPENDED'].includes(u.status))
  return (
    <div className="pb-8">
      <PageHead title="Tasks" sub="Items that need an administrator's attention." />
      <div className="px-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-[#6E6E78] border-b border-[#E1E1E6]">
                <th className="px-5 py-3 font-semibold">Task</th>
                <th className="px-5 py-3 font-semibold">Person</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-[#EBEBED] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3">{u.status === 'STAGED' ? 'Activate staged user' : u.status === 'LOCKED_OUT' ? 'Unlock user' : u.status === 'PROVISIONED' ? 'Awaiting user activation' : u.status === 'SUSPENDED' ? 'Review suspended user' : 'Password expired'}</td>
                  <td className="px-5 py-3"><button className="text-[#1662DD] font-medium" onClick={() => go({ area: 'admin', page: 'user', userId: u.id, tab: 'applications' })}>{fullName(u)}</button></td>
                  <td className="px-5 py-3"><StatusDot status={u.status} /></td>
                  <td className="px-5 py-3 text-right"><Btn small label={`${verb(u.status)} ${fullName(u)}`} onClick={() => fix(u)}>{verb(u.status)}</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
