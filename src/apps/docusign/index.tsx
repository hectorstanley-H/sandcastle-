import { useEffect, useMemo, useState } from 'react'
import { HelpCircle, Bell, Grid3x3, PenTool, FileStack, Workflow, Settings, Library, LifeBuoy, BookOpen, Keyboard, MessageSquare, User, PenLine, SlidersHorizontal, Repeat, LogOut } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { useWin } from '@/os/context'
import { db, useCollection, useDB, useRecord } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { C, FONT, Wordmark, fmtDT, type Envelope } from './shared'
import { Home } from './Home'
import { Agreements, EnvelopeDetails } from './Agreements'
import { Templates } from './Templates'
import { TemplateEditor } from './TemplateEditor'
import { Reports } from './Reports'
import { SendFlow } from './Send'
import { SigningView } from './Sign'
import { Admin, Profile, Forms } from './Admin'
import { Menu, Modal, ConfirmFooter, inputCls, useOutside, useToast } from './ui'
import { newGuid } from './actions'

export type Route =
  | { page: 'home' }
  | { page: 'agreements'; folder: string }
  | { page: 'details'; id: string; justSent?: boolean; from?: string }
  | { page: 'templates' }
  | { page: 'template'; id?: string }
  | { page: 'reports'; report?: string }
  | { page: 'send'; templateId?: string; key: number; envelopeId?: string; self?: boolean }
  | { page: 'sign'; id: string }
  | { page: 'admin'; section?: string }
  | { page: 'profile' }
  | { page: 'forms'; kind: 'powerforms' | 'webforms' | 'bulk' }

export interface StartProps {
  onSend: () => void
  onTemplate: () => void
  onSign: () => void
  onBulk: () => void
  onWebForm: () => void
  onUpload: () => void
}

export interface Nav {
  go: (r: Route) => void
  send: (templateId?: string, opts?: { envelopeId?: string; self?: boolean }) => void
  /** handlers for the Start dropdown */
  start: StartProps
}

function routeFromParams(params: any): Route | null {
  if (!params) return null
  if (params.envelopeId) return { page: 'details', id: params.envelopeId }
  if (params.page === 'send' || params.templateId) return { page: 'send', templateId: params.templateId, key: Date.now() }
  if (params.page === 'agreements') return { page: 'agreements', folder: params.folder ?? 'inbox' }
  if (params.page === 'templates') return { page: 'templates' }
  if (params.page === 'reports') return { page: 'reports' }
  if (params.page === 'home') return { page: 'home' }
  if (params.page === 'admin') return { page: 'admin' }
  if (params.folder) return { page: 'agreements', folder: params.folder }
  return null
}

const SAMPLE_COMPLETED = ['Contoso_Signed_Order_Form_Scan.pdf', 'Fabrikam_Facilities_Agreement_Signed.pdf', 'Litware_Software_License_Executed.pdf', 'Adatum_Amendment_No1_Countersigned.pdf']

function UploadCompleted({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [file, setFile] = useState(SAMPLE_COMPLETED[0])
  const [party, setParty] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const save = () => {
    const id = newGuid()
    const at = new Date(date + 'T12:00:00').toISOString()
    const now = new Date().toISOString()
    db.insert(
      'docusign.envelopes',
      {
        id,
        subject: file,
        message: '',
        status: 'completed',
        documents: [{ name: file, pages: 4 }],
        recipients: [
          { name: party || 'External Party', email: '', role: 'signer', status: 'completed', order: 1, at },
          { name: ME.name, email: ME.email, role: 'signer', status: 'completed', order: 1, at },
        ],
        sender: ME.email,
        senderName: ME.name,
        createdAt: now,
        sentAt: at,
        completedAt: at,
        lastChange: now,
        fields: [],
        history: [{ at: now, action: 'Uploaded', by: ME.name, detail: `Completed agreement uploaded (${file})` }],
      },
      { prepend: true },
    )
    onDone(id)
  }
  return (
    <Modal title="Upload a Completed Agreement" onClose={onClose} footer={<ConfirmFooter onCancel={onClose} onOk={save} ok="Upload" agent="docusign-upload-save" />}>
      <div className="text-[13px] text-[#5E5873] mb-4">Store an agreement that was signed outside Docusign so you can find it alongside your other agreements.</div>
      <label className="block mb-3">
        <span className="block mb-1 text-[13px] font-medium">File</span>
        <select value={file} onChange={(e) => setFile(e.target.value)} className={inputCls}>
          {SAMPLE_COMPLETED.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <label className="block mb-3">
        <span className="block mb-1 text-[13px] font-medium">Other party</span>
        <input value={party} onChange={(e) => setParty(e.target.value)} placeholder="e.g. Contoso Ltd" className={inputCls} />
      </label>
      <label className="block">
        <span className="block mb-1 text-[13px] font-medium">Date signed</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </label>
    </Modal>
  )
}

function Notifications({ nav }: { nav: Nav }) {
  const envs = useCollection<Envelope>('docusign.envelopes')
  const prof = useRecord<any>('docusign.profile', 'me')
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  const items = useMemo(
    () =>
      envs
        .filter((e) => !e.deleted)
        .flatMap((e) => e.history.filter((h) => h.by !== ME.name && ['Signed', 'Completed', 'Viewed', 'Declined', 'Sent'].includes(h.action)).map((h) => ({ ...h, env: e })))
        .filter((h) => h.action !== 'Sent' || h.env.recipients.some((r) => r.email === ME.email))
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))
        .slice(0, 10),
    [envs],
  )
  const seen = prof?.notifSeen ? +new Date(prof.notifSeen) : 0
  const unread = items.filter((i) => +new Date(i.at) > seen).length
  const markSeen = () => db.upsert('docusign.profile', { id: 'me', notifSeen: new Date().toISOString() })
  return (
    <div ref={ref} className="relative">
      <button
        data-agent="docusign-notifications"
        className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F0F5]"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={19} />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#D11F3B] text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-[42px] z-50 w-[380px] bg-white rounded-md shadow-[0_8px_24px_rgba(19,0,50,0.18),0_0_0_1px_rgba(19,0,50,0.06)]">
          <div className="flex items-center justify-between px-4 h-12 border-b border-[#E5E1EC]">
            <span className="text-[15px] font-semibold">Notifications</span>
            <button onClick={markSeen} className="text-[13px] font-semibold text-[#4C00FF] hover:underline">
              Mark all as read
            </button>
          </div>
          <div className="max-h-[380px] overflow-auto">
            {items.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  setOpen(false)
                  nav.go({ page: 'details', id: h.env.id })
                }}
                className={`w-full text-left px-4 py-3 border-b border-[#F0EDF4] hover:bg-[#FAF9FC] ${+new Date(h.at) > seen ? 'bg-[#F7F4FF]' : ''}`}
              >
                <div className="text-[13.5px]">
                  <b>{h.by}</b> {h.action === 'Sent' ? 'sent you' : h.action.toLowerCase()} <span className="text-[#3D3551]">{h.env.subject.replace(/^(Please DocuSign|Complete with Docusign): /, '')}</span>
                </div>
                <div className="text-[12px] text-[#8B8698] mt-0.5">{fmtDT(h.at)}</div>
              </button>
            ))}
            {items.length === 0 && <div className="p-6 text-center text-[13px] text-[#5E5873]">You’re all caught up.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Docusign({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const epoch = useDB((s) => s.epoch)
  const toast = useToast()
  const [route, setRoute] = useState<Route>(() => routeFromParams(params) ?? { page: 'home' })
  const [upload, setUpload] = useState(false)

  useEffect(() => {
    const r = routeFromParams(params)
    if (r) setRoute(r)
  }, [win.nonce])

  useEffect(() => {
    const base = 'https://apps.docusign.com/send'
    switch (route.page) {
      case 'home':
        setUrl(`${base}/home`)
        setTitle('Home | Docusign')
        break
      case 'agreements':
        setUrl(`${base}/documents?type=envelopes&folder=${route.folder}`)
        setTitle('Agreements | Docusign')
        break
      case 'details':
        setUrl(`${base}/documents/details/${route.id.toLowerCase()}`)
        setTitle('Envelope Details | Docusign')
        break
      case 'templates':
        setUrl(`${base}/templates`)
        setTitle('Templates | Docusign')
        break
      case 'template':
        setUrl(`${base}/templates/details/${route.id ?? 'new'}`)
        setTitle('Edit Template | Docusign')
        break
      case 'reports':
        setUrl(`${base}/reports${route.report ? `/${route.report}` : ''}`)
        setTitle('Reports | Docusign')
        break
      case 'send':
        setTitle('Prepare | Docusign')
        break
      case 'sign':
        setUrl(`https://apps.docusign.com/signing/${route.id.toLowerCase()}`)
        setTitle('Docusign')
        break
      case 'admin':
        setUrl(`https://apps.docusign.com/admin/${route.section ?? 'overview'}`)
        setTitle('Admin | Docusign')
        break
      case 'profile':
        setUrl('https://apps.docusign.com/send/profile')
        setTitle('My Profile | Docusign')
        break
      case 'forms':
        setUrl(`${base}/${route.kind}`)
        setTitle(`${route.kind === 'powerforms' ? 'PowerForms' : route.kind === 'webforms' ? 'Web Forms' : 'Bulk Send'} | Docusign`)
        break
    }
  }, [route])

  const send: Nav['send'] = (templateId, opts) => setRoute({ page: 'send', templateId, key: Date.now(), ...opts })
  const nav: Nav = {
    go: setRoute,
    send,
    start: {
      onSend: () => send(),
      onTemplate: () => setRoute({ page: 'templates' }),
      onSign: () => send(undefined, { self: true }),
      onBulk: () => setRoute({ page: 'forms', kind: 'bulk' }),
      onWebForm: () => setRoute({ page: 'forms', kind: 'webforms' }),
      onUpload: () => setUpload(true),
    },
  }

  const top = route.page === 'details' || route.page === 'agreements' || route.page === 'forms' ? 'agreements' : route.page === 'template' ? 'templates' : route.page

  if (route.page === 'send')
    return (
      <div key={`${epoch}-${route.key}`} className="relative flex-1 min-h-0 flex flex-col bg-white" style={{ fontFamily: FONT, color: C.text }}>
        <SendFlow templateId={route.templateId} envelopeId={route.envelopeId} self={route.self} nav={nav} setUrl={setUrl} />
      </div>
    )

  if (route.page === 'sign')
    return (
      <div key={`${epoch}-sign`} className="relative flex-1 min-h-0 flex flex-col bg-white" style={{ fontFamily: FONT, color: C.text }}>
        <SigningView id={route.id} nav={nav} />
      </div>
    )

  const tabs: [string, string, Route][] = [
    ['home', 'Home', { page: 'home' }],
    ['agreements', 'Agreements', { page: 'agreements', folder: 'inbox' }],
    ['templates', 'Templates', { page: 'templates' }],
    ['reports', 'Reports', { page: 'reports' }],
    ['admin', 'Admin', { page: 'admin' }],
  ]

  return (
    <div key={epoch} className="relative flex-1 min-h-0 flex flex-col bg-white" style={{ fontFamily: FONT, color: C.text }}>
      <header className="h-[60px] shrink-0 flex items-center px-6 bg-white border-b border-[#E5E1EC] relative z-20">
        <button onClick={() => setRoute({ page: 'home' })} className="mr-8 flex items-center" aria-label="Docusign home">
          <Wordmark height={22} />
        </button>
        <nav className="flex items-stretch h-full">
          {tabs.map(([id, label, r]) => {
            const active = top === id
            return (
              <button
                key={id}
                data-agent={`docusign-nav-${id}`}
                aria-label={label}
                onClick={() => setRoute(r)}
                className={`relative px-4 h-full text-[15px] ${active ? 'font-semibold text-[#130032]' : 'text-[#3D3551] hover:text-[#130032]'}`}
              >
                {label}
                {active && <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t bg-[#130032]" />}
              </button>
            )
          })}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[#3D3551]">
          <Menu
            width={260}
            trigger={(t) => (
              <button onClick={t} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F0F5]" aria-label="Apps">
                <Grid3x3 size={19} />
              </button>
            )}
            items={[
              { header: 'Docusign apps' },
              { label: 'eSignature', icon: PenTool, onClick: () => setRoute({ page: 'home' }) },
              { label: 'Navigator', icon: FileStack, onClick: () => setRoute({ page: 'agreements', folder: 'completed' }) },
              { label: 'Maestro', icon: Workflow, onClick: () => toast('Maestro', 'Opening Docusign Maestro workflow builder in a new tab') },
              { label: 'CLM', icon: Library, onClick: () => toast('Docusign CLM', 'Your account is not licensed for CLM. Contact your administrator.') },
              'sep',
              { label: 'Admin', icon: Settings, onClick: () => setRoute({ page: 'admin' }) },
            ]}
          />
          <Notifications nav={nav} />
          <Menu
            width={250}
            trigger={(t) => (
              <button onClick={t} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F2F0F5]" aria-label="Help">
                <HelpCircle size={20} />
              </button>
            )}
            items={[
              { label: 'Docusign Support', icon: LifeBuoy, onClick: () => toast('Docusign Support', 'Opening support.docusign.com in a new tab') },
              { label: 'eSignature User Guide', icon: BookOpen, onClick: () => toast('User Guide', 'Opening the eSignature User Guide in a new tab') },
              { label: 'Keyboard shortcuts', icon: Keyboard, onClick: () => toast('Keyboard shortcuts', 'Alt+N new envelope · Alt+T templates · Alt+R reports') },
              { label: 'Give feedback', icon: MessageSquare, onClick: () => toast('Thanks for your feedback', 'Your feedback was sent to the Docusign product team.') },
            ]}
          />
          <Menu
            width={280}
            trigger={(t) => (
              <button onClick={t} className="ml-2 flex items-center" aria-label="Profile">
                <Avatar id={ME.id} size={34} />
              </button>
            )}
            items={[
              { header: `${ME.name} · ${ME.email}` },
              { label: 'Manage Profile', icon: User, onClick: () => setRoute({ page: 'profile' }), agent: 'docusign-profile-manage' },
              { label: 'Signatures', icon: PenLine, onClick: () => setRoute({ page: 'profile' }) },
              { label: 'My Preferences', icon: SlidersHorizontal, onClick: () => setRoute({ page: 'admin', section: 'preferences' }) },
              'sep',
              { label: 'Switch Account', icon: Repeat, onClick: () => toast('Switch Account', 'Northwind Global (Account 48210735) is your only account.') },
              { label: 'Log Out', icon: LogOut, onClick: () => toast('Single sign-on', 'Your Docusign session is managed by Okta. Sign out from Okta to end it.') },
            ]}
          />
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        {route.page === 'home' && <Home nav={nav} />}
        {route.page === 'agreements' && <Agreements nav={nav} folder={route.folder} />}
        {route.page === 'details' && <EnvelopeDetails nav={nav} id={route.id} justSent={route.justSent} />}
        {route.page === 'templates' && <Templates nav={nav} />}
        {route.page === 'template' && <TemplateEditor key={route.id ?? 'new'} nav={nav} id={route.id} />}
        {route.page === 'reports' && <Reports nav={nav} report={route.report} />}
        {route.page === 'admin' && <Admin section={route.section} nav={nav} />}
        {route.page === 'profile' && <Profile />}
        {route.page === 'forms' && <Forms nav={nav} kind={route.kind} />}
      </div>
      {upload && (
        <UploadCompleted
          onClose={() => setUpload(false)}
          onDone={(id) => {
            setUpload(false)
            setRoute({ page: 'details', id })
          }}
        />
      )}
    </div>
  )
}
