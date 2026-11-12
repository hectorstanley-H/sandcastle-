/** HubSpot › global chrome: Upgrade, Marketplace, Help, Copilot, account menu and Settings. */
import { useMemo, useState } from 'react'
import { Check, ChevronDown, Copy, LogOut, Search, Send, Sparkles, User, X } from 'lucide-react'
import { db, useCollection, useRecord } from '@/db/db'
import { useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { Field, HBtn, Modal, PORTAL, hsDate, hsMoney, inputH, useHNav, type HRoute } from './ui'
import { OWNERS } from './owners'
import { isOpenDeal, weighted } from './store'

/* ───────────────────────── upgrade ───────────────────────── */

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { toast } = useHNav()
  const settings = useRecord<any>('hubspot.settings', 'portal')
  const plans: [string, string, string[]][] = [
    ['Starter', '$20/seat/mo', ['Email marketing', 'Forms & landing pages', 'Simple automation']],
    ['Professional', '$100/seat/mo', ['Sequences', 'Workflows', 'Custom reporting', 'Playbooks']],
    ['Enterprise', '$150/seat/mo', ['Custom objects', 'Predictive lead scoring', 'Sandboxes', 'Advanced permissions']],
  ]
  const trial = settings?.trial
  return (
    <Modal title="Upgrade your HubSpot plan" onClose={onClose} width={760} agent="hs-upgrade-modal">
      <div className="text-[13.5px] text-[#516F90]">Northwind Global is on <b className="text-[#33475B]">Sales Hub Professional</b>{trial ? ` · Enterprise trial active until ${hsDate(trial)}` : ''}.</div>
      <div className="grid grid-cols-3 gap-3">
        {plans.map(([name, price, feats]) => (
          <div key={name} className={`rounded-[4px] border p-4 ${name === 'Professional' ? 'border-[#00A4BD] bg-[#F0FAFC]' : 'border-[#CBD6E2]'}`}>
            <div className="text-[16px] font-semibold">{name}</div>
            <div className="text-[13px] text-[#516F90]">{price}</div>
            <ul className="mt-3 space-y-1.5 text-[13px]">{feats.map((f) => <li key={f} className="flex items-center gap-1.5"><Check size={13} className="text-[#00BDA5]" /> {f}</li>)}</ul>
            <div className="mt-4">
              {name === 'Professional' ? (
                <span className="text-[12.5px] font-semibold text-[#007A8C]">Current plan</span>
              ) : name === 'Enterprise' ? (
                <HBtn small variant="primary" agent="hs-upgrade-trial" disabled={!!trial} onClick={() => { db.upsert('hubspot.settings', { id: 'portal', trial: new Date(Date.now() + 14 * 86400000).toISOString() }); toast('Your 14-day Enterprise trial has started.') }}>{trial ? 'Trial active' : 'Start free trial'}</HBtn>
              ) : (
                <span className="text-[12.5px] text-[#7C98B6]">Included</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <HBtn small agent="hs-upgrade-sales" onClick={() => { toast('Thanks! A HubSpot product specialist will email you within one business day.'); onClose() }}>Talk to sales</HBtn>
        <span className="text-[12.5px] text-[#7C98B6]">Prices billed annually.</span>
      </div>
    </Modal>
  )
}

/* ───────────────────────── marketplace ───────────────────────── */

const APPS: [string, string, string, string][] = [
  ['salesforce', 'Salesforce', 'Sync contacts, companies and deals with Salesforce.', 'CRM'],
  ['zoom', 'Zoom', 'Log Zoom meetings and recordings on the timeline.', 'Video conferencing'],
  ['outlook', 'Outlook', 'Track emails and log them to records.', 'Email'],
  ['slack', 'Slack', 'Get deal and ticket notifications in Slack.', 'Productivity'],
  ['docusign', 'Docusign', 'Send quotes and contracts for e-signature.', 'Sales'],
  ['linkedin', 'LinkedIn Sales Navigator', 'See LinkedIn insights on contact records.', 'Sales'],
  ['stripe', 'Stripe', 'Collect payments and sync invoices.', 'Commerce'],
  ['zendesk', 'Zendesk', 'Bring support tickets into the CRM.', 'Customer service'],
  ['tableau', 'Tableau', 'Analyze HubSpot data in Tableau dashboards.', 'Analytics'],
]
const DEFAULT_INSTALLED = ['salesforce', 'zoom', 'outlook', 'slack']

export function MarketplaceModal({ onClose }: { onClose: () => void }) {
  const { toast } = useHNav()
  const recs = useCollection<any>('hubspot.installedApps')
  const [q, setQ] = useState('')
  const [only, setOnly] = useState(false)
  const installed = (id: string) => {
    const r = recs.find((x) => x.id === id)
    return r ? !!r.installed : DEFAULT_INSTALLED.includes(id)
  }
  const list = APPS.filter(([id, n, d]) => (!only || installed(id)) && (!q || `${n} ${d}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <Modal title="App Marketplace" onClose={onClose} width={760} agent="hs-marketplace-modal">
      <div className="flex items-center gap-3">
        <div className="flex items-center h-9 flex-1 border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><Search size={14} className="text-[#7C98B6]" /><input data-agent="hs-marketplace-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" className="flex-1 outline-none text-[13.5px]" /></div>
        <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="accent-[#FF5C35]" /> Connected apps only</label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {list.map(([id, name, desc, cat]) => {
          const on = installed(id)
          return (
            <div key={id} className="rounded-[4px] border border-[#CBD6E2] p-3 flex flex-col">
              <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-[4px] bg-[#EAF0F6] flex items-center justify-center text-[13px] font-bold">{name[0]}</span><div><div className="text-[14px] font-semibold">{name}</div><div className="text-[11.5px] text-[#7C98B6]">{cat}</div></div></div>
              <div className="text-[12.5px] text-[#516F90] mt-2 flex-1">{desc}</div>
              <div className="mt-3">
                <HBtn small variant={on ? 'ghost' : 'primary'} agent={`hs-marketplace-${id}`} onClick={() => { db.upsert('hubspot.installedApps', { id, installed: !on, at: new Date().toISOString() }); toast(on ? `${name} disconnected.` : `${name} connected.`) }}>{on ? 'Disconnect' : 'Connect app'}</HBtn>
              </div>
            </div>
          )
        })}
      </div>
      {!list.length && <div className="text-[13px] text-[#516F90]">No apps match “{q}”.</div>}
    </Modal>
  )
}

/* ───────────────────────── help ───────────────────────── */

const HELP: [string, string][] = [
  ['Create an active list', 'Go to CRM › Lists › Create list, add filters and save. Active lists update automatically as contacts match.'],
  ['Enroll contacts in a sequence', 'Open a sequence, click Enroll and pick a list or individual contacts. Step 1 sends on the next business day.'],
  ['Log a call', 'Use the phone icon in the top bar or the Call button on any record to dial and log the outcome.'],
  ['Build a workflow', 'Automation › Workflows › Create workflow. Choose a trigger, then add actions such as tasks or property updates.'],
  ['Send a quote', 'Commerce › Quotes › Create quote, add line items from the product library and click Send.'],
  ['Import contacts', 'CRM › Lists › Import lets you paste emails to create a static list from existing contacts.'],
]

export function HelpMenu({ onClose }: { onClose: () => void }) {
  const { toast, go } = useHNav()
  const [q, setQ] = useState('')
  const [openI, setOpenI] = useState<number | null>(null)
  const list = HELP.map((h, i) => [h, i] as const).filter(([[t, b]]) => !q || `${t} ${b}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-10 w-[360px] bg-white text-[#33475B] rounded shadow-xl border border-[#CBD6E2] z-50" data-agent="hs-help-panel">
        <div className="px-4 h-11 flex items-center border-b border-[#DFE3EB] text-[15px] font-semibold">Help</div>
        <div className="p-3">
          <div className="flex items-center h-8 border border-[#CBD6E2] rounded-[3px] px-2 gap-1.5"><Search size={14} className="text-[#7C98B6]" /><input data-agent="hs-help-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the knowledge base" className="flex-1 outline-none text-[13px]" /></div>
        </div>
        <div className="max-h-[300px] overflow-auto">
          {list.map(([[t, b], i]) => (
            <div key={t} className="border-t border-[#EAF0F6]">
              <button onClick={() => setOpenI(openI === i ? null : i)} className="w-full text-left px-4 h-9 text-[13.5px] hover:bg-[#F5F8FA] flex items-center justify-between">{t}<ChevronDown size={13} className={openI === i ? 'rotate-180' : ''} /></button>
              {openI === i && <div className="px-4 pb-3 text-[12.5px] text-[#516F90] leading-[1.5]">{b}</div>}
            </div>
          ))}
          {!list.length && <div className="px-4 py-4 text-[13px] text-[#516F90]">No articles found.</div>}
        </div>
        <div className="p-3 border-t border-[#DFE3EB] flex gap-2">
          <HBtn small agent="hs-help-support" onClick={() => { toast('Support case opened — a HubSpot specialist will reply by email.'); onClose() }}>Contact support</HBtn>
          <HBtn small variant="ghost" onClick={() => { go({ page: 'kb' }); onClose() }}>Knowledge base</HBtn>
        </div>
      </div>
    </>
  )
}

/* ───────────────────────── account menu ───────────────────────── */

export function AccountMenu({ onClose }: { onClose: () => void }) {
  const { toast, go } = useHNav()
  const { close } = useWin()
  const settings = useRecord<any>('hubspot.settings', 'portal')
  const copy = () => {
    navigator.clipboard?.writeText(PORTAL).catch(() => {})
    toast(`Hub ID ${PORTAL} copied to clipboard.`)
    onClose()
  }
  const item = 'w-full text-left px-4 h-9 text-[13.5px] hover:bg-[#F5F8FA] flex items-center gap-2'
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-10 w-[300px] bg-white text-[#33475B] rounded shadow-xl border border-[#CBD6E2] z-50 py-2" data-agent="hs-account-menu">
        <div className="flex items-center gap-3 px-4 pb-3 border-b border-[#DFE3EB]">
          <Avatar id={ME.id} size={40} />
          <div className="min-w-0"><div className="text-[14px] font-semibold">{ME.name}</div><div className="text-[12.5px] text-[#516F90] truncate">{ME.email}</div></div>
        </div>
        <button className={item} data-agent="hs-account-profile" onClick={() => { go({ page: 'settings', tab: 'Profile' }); onClose() }}><User size={14} /> Profile &amp; preferences</button>
        <div className="px-4 pt-2 pb-1 text-[11.5px] font-semibold uppercase text-[#7C98B6]">Account</div>
        <div className="px-4 py-1 text-[13.5px] flex items-center gap-2"><Check size={14} className="text-[#00BDA5]" /> {settings?.companyName || 'Northwind Global'}</div>
        <button className={item} data-agent="hs-account-copy-hub" onClick={copy}><Copy size={14} /> Hub ID: {PORTAL}</button>
        <button className={item} onClick={() => { go({ page: 'settings', tab: 'Account defaults' }); onClose() }}>Account settings</button>
        <div className="border-t border-[#DFE3EB] mt-2 pt-2">
          <button className={item} data-agent="hs-account-signout" onClick={() => close()}><LogOut size={14} /> Sign out</button>
        </div>
      </div>
    </>
  )
}

/* ───────────────────────── copilot ───────────────────────── */

type Msg = { me: boolean; text: string; links?: [string, HRoute][] }

export function CopilotPanel({ onClose }: { onClose: () => void }) {
  const { go } = useHNav()
  const deals = useCollection<any>('hubspot.deals')
  const contacts = useCollection<any>('hubspot.contacts')
  const tickets = useCollection<any>('hubspot.tickets')
  const tasks = useCollection<any>('hubspot.tasks')
  const seqs = useCollection<any>('hubspot.sequences')
  const [msgs, setMsgs] = useState<Msg[]>([{ me: false, text: `Hi ${ME.first}! I’m Copilot. Ask me about your pipeline, deals closing this month, open tickets, your tasks or webinar follow-up.` }])
  const [t, setT] = useState('')
  const answer = useMemo(
    () => (q: string): Msg => {
      const s = q.toLowerCase()
      const open = deals.filter(isOpenDeal)
      if (/clos|this month/.test(s)) {
        const now = new Date()
        const l = open.filter((d) => { const x = new Date(d.closeDate + 'T12:00'); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear() }).sort((a, b) => b.amount - a.amount)
        return { me: false, text: l.length ? `${l.length} open deals are set to close this month (${hsMoney(l.reduce((a, d) => a + d.amount, 0))}):\n${l.slice(0, 5).map((d) => `• ${d.name} — ${hsMoney(d.amount)}, ${d.stage}`).join('\n')}` : 'No open deals are set to close this month.', links: l.slice(0, 3).map((d) => [d.name, { page: 'deal', id: d.id }] as [string, HRoute]) }
      }
      if (/pipeline|deal|forecast/.test(s)) {
        const top = [...open].sort((a, b) => b.amount - a.amount).slice(0, 3)
        return { me: false, text: `You have ${open.length} open deals worth ${hsMoney(open.reduce((a, d) => a + d.amount, 0))} (${hsMoney(open.reduce((a, d) => a + weighted(d), 0))} weighted). Biggest: ${top.map((d) => `${d.name} (${hsMoney(d.amount)})`).join(', ')}.`, links: [['Open deals board', { page: 'deals' }], ['Forecast report', { page: 'reports', tab: 'Forecast' }]] }
      }
      if (/ticket|support|service/.test(s)) {
        const o = tickets.filter((x) => x.status !== 'Closed')
        const hi = o.filter((x) => x.priority === 'High')
        return { me: false, text: `${o.length} tickets are open, ${hi.length} of them high priority${hi.length ? `: ${hi.map((x) => x.subject).slice(0, 3).join('; ')}` : ''}.`, links: [['Go to tickets', { page: 'tickets' }]] }
      }
      if (/task|to.?do|overdue/.test(s)) {
        const mine = tasks.filter((x) => x.ownerId === ME.id && x.status !== 'Completed')
        const overdue = mine.filter((x) => new Date(x.dueDate) < new Date(new Date().toDateString()))
        return { me: false, text: `You have ${mine.length} open tasks, ${overdue.length} overdue.${mine[0] ? ` Next up: “${mine[0].title}”.` : ''}`, links: [['View tasks', { page: 'tasks' }]] }
      }
      if (/webinar|attend|sequence|nurture/.test(s)) {
        const att = contacts.filter((c) => c.webinarStatus === 'Attended')
        const enrolled = att.filter((c) => (c.sequences ?? []).length)
        return { me: false, text: `${att.length} contacts attended the AI-Powered Ops Summit; ${enrolled.length} are enrolled in a sequence. ${seqs.length} sequences exist in the portal.`, links: [['Sequences', { page: 'sequences' }], ['Lists', { page: 'lists' }]] }
      }
      if (/contact|lead|mql|lifecycle/.test(s)) {
        const by: Record<string, number> = {}
        for (const c of contacts) by[c.lifecycleStage] = (by[c.lifecycleStage] ?? 0) + 1
        return { me: false, text: `${contacts.length} contacts: ${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ')}.`, links: [['Contacts', { page: 'contacts' }]] }
      }
      return { me: false, text: 'I can summarize your pipeline, deals closing this month, open tickets, your tasks, webinar follow-up and contact lifecycle stages. Try one of the suggestions below.' }
    },
    [deals, contacts, tickets, tasks, seqs],
  )
  const ask = (q: string) => {
    if (!q.trim()) return
    setMsgs((m) => [...m, { me: true, text: q }, answer(q)])
    setT('')
  }
  return (
    <div className="absolute right-0 top-12 bottom-0 w-[360px] z-40 bg-white border-l border-[#CBD6E2] shadow-[-4px_0_12px_rgba(0,0,0,0.12)] flex flex-col" data-agent="hs-copilot-panel">
      <div className="h-12 px-4 flex items-center gap-2 border-b border-[#DFE3EB]"><Sparkles size={16} className="text-[#FF5C35]" /><span className="font-semibold flex-1">Copilot</span><button aria-label="Close Copilot" onClick={onClose}><X size={18} /></button></div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[88%] ${m.me ? 'ml-auto' : ''}`}>
            <div className={`px-3 py-2 rounded-[8px] text-[13px] leading-[1.5] whitespace-pre-wrap ${m.me ? 'bg-[#33475B] text-white' : 'bg-[#F5F8FA] border border-[#DFE3EB]'}`}>{m.text}</div>
            {m.links && <div className="flex flex-wrap gap-1.5 mt-1">{m.links.map(([l, r]) => <button key={l} onClick={() => go(r)} className="text-[12px] text-[#0091AE] hover:underline font-medium">{l} →</button>)}</div>}
          </div>
        ))}
      </div>
      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {['Summarize my pipeline', 'Deals closing this month', 'Open tickets', 'My tasks'].map((s) => <button key={s} data-agent={`hs-copilot-suggest-${s.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => ask(s)} className="h-7 px-2.5 rounded-full border border-[#CBD6E2] text-[12px] hover:bg-[#F5F8FA]">{s}</button>)}
      </div>
      <div className="p-3 border-t border-[#DFE3EB] flex gap-2">
        <input data-agent="hs-copilot-input" aria-label="Ask Copilot" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(t)} placeholder="Ask Copilot anything" className={`${inputH} flex-1 h-9`} />
        <button data-agent="hs-copilot-send" aria-label="Send" onClick={() => ask(t)} className="w-9 h-9 rounded-[3px] bg-[#FF5C35] text-white flex items-center justify-center"><Send size={15} /></button>
      </div>
    </div>
  )
}

/* ───────────────────────── settings ───────────────────────── */

const DEFAULTS = { companyName: 'Northwind Global', timezone: '(GMT-05:00) Eastern Time', currency: 'USD', fiscalYear: 'January', dateFormat: 'MM/DD/YYYY', notifyEmail: true, notifyDesktop: true, notifyDigest: false, signature: `${ME.name}\n${ME.title} · Northwind Global` }

export function SettingsPage({ tab: initial }: { tab?: string }) {
  const { toast, go } = useHNav()
  const rec = useRecord<any>('hubspot.settings', 'portal')
  const s = { ...DEFAULTS, ...(rec ?? {}) }
  const [tab, setTab] = useState(initial ?? 'Account defaults')
  const [draft, setDraft] = useState<any>(s)
  const [mkt, setMkt] = useState(false)
  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }))
  const save = () => {
    db.upsert('hubspot.settings', { id: 'portal', ...draft })
    toast('Settings saved.')
  }
  const tabs = ['Account defaults', 'Profile', 'Notifications', 'Users & Teams', 'Integrations', 'Properties']
  return (
    <div className="min-h-full bg-white flex" data-agent="hs-settings-page">
      <div className="w-[230px] shrink-0 border-r border-[#DFE3EB] py-5">
        <div className="px-5 pb-3 text-[18px] font-medium">Settings</div>
        {tabs.map((t) => (
          <button key={t} data-agent={`hs-settings-tab-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={() => (t === 'Properties' ? go({ page: 'properties' }) : t === 'Integrations' ? setMkt(true) : setTab(t))} className={`w-full text-left px-5 h-9 text-[14px] ${tab === t ? 'bg-[#EAF0F6] font-semibold border-l-[3px] border-[#33475B]' : 'hover:bg-[#F5F8FA]'}`}>{t}</button>
        ))}
      </div>
      <div className="flex-1 p-8 max-w-[720px] space-y-4">
        <h1 className="text-[22px] font-medium">{tab}</h1>
        {tab === 'Account defaults' && (
          <>
            <Field label="Account name"><input data-agent="hs-settings-company" value={draft.companyName} onChange={(e) => set('companyName', e.target.value)} className={`${inputH} w-full`} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Time zone"><select value={draft.timezone} onChange={(e) => set('timezone', e.target.value)} className={`${inputH} w-full`}>{['(GMT-08:00) Pacific Time', '(GMT-06:00) Central Time', '(GMT-05:00) Eastern Time', '(GMT+00:00) London', '(GMT+01:00) Paris'].map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Company currency"><select value={draft.currency} onChange={(e) => set('currency', e.target.value)} className={`${inputH} w-full`}>{['USD', 'EUR', 'GBP', 'CAD'].map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Fiscal year starts"><select value={draft.fiscalYear} onChange={(e) => set('fiscalYear', e.target.value)} className={`${inputH} w-full`}>{['January', 'February', 'April', 'July', 'October'].map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Date format"><select value={draft.dateFormat} onChange={(e) => set('dateFormat', e.target.value)} className={`${inputH} w-full`}>{['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].map((x) => <option key={x}>{x}</option>)}</select></Field>
            </div>
            <div className="text-[12.5px] text-[#516F90]">Hub ID {PORTAL} · Data hosted in the United States</div>
          </>
        )}
        {tab === 'Profile' && (
          <>
            <div className="flex items-center gap-4"><Avatar id={ME.id} size={56} /><div><div className="text-[16px] font-semibold">{ME.name}</div><div className="text-[13px] text-[#516F90]">{ME.email} · {ME.title}</div></div></div>
            <Field label="Email signature"><textarea rows={4} value={draft.signature} onChange={(e) => set('signature', e.target.value)} className={`${inputH} h-auto py-2 w-full`} /></Field>
          </>
        )}
        {tab === 'Notifications' && (
          <div className="space-y-3">
            {[['notifyEmail', 'Email notifications', 'Deal assignments, mentions and task reminders'], ['notifyDesktop', 'Desktop notifications', 'Show a pop-up in the browser'], ['notifyDigest', 'Daily digest', 'One email each morning summarizing activity']].map(([k, l, d]) => (
              <label key={k} className="flex items-start gap-3 p-3 border border-[#DFE3EB] rounded-[4px]"><input type="checkbox" data-agent={`hs-settings-${k}`} checked={!!draft[k]} onChange={(e) => set(k, e.target.checked)} className="mt-1 accent-[#FF5C35]" /><span><span className="block text-[14px] font-medium">{l}</span><span className="block text-[12.5px] text-[#516F90]">{d}</span></span></label>
            ))}
          </div>
        )}
        {tab === 'Users & Teams' && (
          <table className="w-full border border-[#DFE3EB]">
            <thead><tr>{['User', 'Email', 'Seat', 'Last active'].map((h) => <th key={h} className="text-left text-[12px] font-semibold uppercase px-3 h-10 bg-[#F5F8FA] border-b border-[#DFE3EB]">{h}</th>)}</tr></thead>
            <tbody>{OWNERS.map((o, i) => <tr key={o.id}><td className="px-3 h-12 border-b border-[#DFE3EB] text-[13.5px]"><span className="flex items-center gap-2"><Avatar id={o.id} size={24} />{o.name}</span></td><td className="px-3 border-b border-[#DFE3EB] text-[13.5px]">{person(o.id).email}</td><td className="px-3 border-b border-[#DFE3EB] text-[13.5px]">{i === 1 ? 'Marketing Hub Professional' : 'Sales Hub Professional'}</td><td className="px-3 border-b border-[#DFE3EB] text-[13.5px]">{i ? `${i * 2} hours ago` : 'Now'}</td></tr>)}</tbody>
          </table>
        )}
        {tab !== 'Users & Teams' && <div className="pt-2 flex gap-2"><HBtn variant="primary" small agent="hs-settings-save" onClick={save}>Save</HBtn><HBtn small onClick={() => setDraft(s)}>Discard changes</HBtn></div>}
      </div>
      {mkt && <MarketplaceModal onClose={() => setMkt(false)} />}
    </div>
  )
}

