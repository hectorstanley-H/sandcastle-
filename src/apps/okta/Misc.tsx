import { ShieldCheck, DeviceMobile, Key, Fingerprint, EnvelopeSimple, ChatText, Lightning, PaintBrush, Buildings } from '@phosphor-icons/react'
import { Card, PageHead } from './Admin'
import { Btn } from './shared'

export function Authenticators() {
  const rows: [any, string, string, string][] = [
    [DeviceMobile, 'Okta Verify', 'Push notification, OTP, FastPass', 'Required'],
    [Fingerprint, 'FIDO2 (WebAuthn)', 'Security keys and biometrics', 'Optional'],
    [Key, 'Password', 'Okta password policy — 12+ chars, 90 days', 'Required'],
    [ChatText, 'Phone', 'SMS and voice call', 'Optional'],
    [EnvelopeSimple, 'Email', 'Recovery only', 'Recovery'],
    [ShieldCheck, 'Google Authenticator', 'Time-based OTP', 'Optional'],
  ]
  return (
    <div>
      <PageHead title="Authenticators" actions={<Btn primary>Add authenticator</Btn>} />
      <div className="px-8 pb-8">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead><tr className="text-left text-[12px] uppercase tracking-wide text-[#6E6E78] border-b border-[#EBEBED]"><th className="px-5 h-10 font-semibold">Name</th><th className="font-semibold">Characteristics</th><th className="font-semibold">Used for</th><th className="font-semibold">Enrollment</th></tr></thead>
            <tbody>{rows.map(([I, n, c, e]) => <tr key={n} className="border-b border-[#F1F1F3]"><td className="px-5 h-14"><div className="flex items-center gap-3"><I size={22} className="text-[#1662DD]" /><b>{n}</b></div></td><td className="text-[#46464F]">{c}</td><td>Authentication, Recovery</td><td>{e}</td></tr>)}</tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export function Automations() {
  return (
    <div>
      <PageHead title="Automations" actions={<Btn primary>Add Automation</Btn>} />
      <div className="px-8 pb-8 grid grid-cols-2 gap-5">
        {[['Deactivate inactive contractors', 'Schedule: Daily · Users inactive 90 days', 'Active'], ['Workday new hire import', 'Trigger: Workday import · Stage then activate on start date', 'Active'], ['Password expiry reminder', 'Schedule: Daily · 7 days before expiry', 'Active'], ['Suspend after termination', 'Trigger: Workday termination event', 'Active']].map(([t, d, s]) => (
          <Card key={t} title={<span className="flex items-center gap-2"><Lightning size={18} className="text-[#1662DD]" />{t}</span>}><div className="text-[14px] text-[#46464F]">{d}</div><div className="mt-2 text-[13px] text-[#1E8A3A] font-semibold">{s}</div></Card>
        ))}
      </div>
    </div>
  )
}

export function Brands() {
  return (
    <div>
      <PageHead title="Brands" actions={<Btn primary>Add brand</Btn>} />
      <div className="px-8 pb-8"><Card title={<span className="flex items-center gap-2"><PaintBrush size={18} className="text-[#1662DD]" />Northwind Global</span>}><div className="text-[14px] text-[#46464F]">Custom domain: login.northwind.com · Primary color #1F3A5F · Sign-in page: Okta-hosted (Gen3)</div></Card></div>
    </div>
  )
}

export function Account() {
  return (
    <div>
      <PageHead title="Account" />
      <div className="px-8 pb-8"><Card title={<span className="flex items-center gap-2"><Buildings size={18} className="text-[#1662DD]" />Organization</span>}><div className="grid grid-cols-2 gap-y-2 text-[14px]"><span className="text-[#6E6E78]">Company</span><span>Northwind Global Inc.</span><span className="text-[#6E6E78]">Okta domain</span><span>northwind.okta.com</span><span className="text-[#6E6E78]">Org ID</span><span>00o1nw2k8dXfQ4Lhq697</span><span className="text-[#6E6E78]">Edition</span><span>Okta Identity Engine · Workforce Identity</span></div></Card></div>
    </div>
  )
}
