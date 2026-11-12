/** Global header widgets: favorites, global actions, guidance, help, setup, notifications, profile, app launcher. */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Bell, BookOpen, CheckCircle2, ChevronDown, CircleHelp, Cloud, ExternalLink, Plus, Search, Settings, Star, X } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk, useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { Btn, Link, Menu, OBJ, ObjIcon, sfDate, useNav, useOutside, type Route } from './ui'
import { Modal } from './record'
import { useActions } from './forms'

const iconBtn = 'w-8 h-8 rounded flex items-center justify-center hover:bg-[#F3F3F3]'

/** label + route for the current page (used by favorites) */
export function useCurrent(route: Route) {
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const contacts = useCollection<any>('salesforce.contacts')
  const leads = useCollection<any>('salesforce.leads')
  const cases = useCollection<any>('salesforce.cases')
  if (route.page === 'record') {
    const r = [...opps, ...accts, ...contacts, ...leads, ...cases].find((x) => x.id === route.id)
    return { id: route.id, name: r?.name ?? (r ? `${r.caseNumber} — ${r.subject}` : route.object), object: route.object, route }
  }
  if (route.page === 'list') return { id: `list-${route.object}`, name: OBJ[route.object]?.plural ?? route.object, object: route.object, route }
  if (route.page === 'home') return { id: 'page-home', name: 'Home', object: 'Home', route }
  if (route.page === 'report') return { id: `report-${route.id}`, name: 'Report', object: 'Report', route }
  return null
}

export function Favorites({ route }: { route: Route }) {
  const { go } = useNav()
  const favs = useCollection<any>('salesforce.favorites')
  const cur = useCurrent(route)
  const [open, setOpen] = useState(false)
  const isFav = !!cur && favs.some((f) => f.id === cur.id)
  const toggle = () => {
    if (!cur) return
    if (isFav) db.remove('salesforce.favorites', cur.id)
    else db.insert('salesforce.favorites', { id: cur.id, name: cur.name, object: cur.object, route: cur.route, date: new Date().toISOString() })
  }
  return (
    <div className="flex items-center relative">
      <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Favorites" title={isFav ? 'Remove from favorites' : 'Add to favorites'} onClick={toggle}>
        <Star size={18} className={isFav ? 'fill-[#FCC003] text-[#DD7A01]' : ''} />
      </button>
      <button className="w-4 h-7 flex items-center justify-center" aria-label="Favorites list" onClick={() => setOpen(!open)}>
        <ChevronDown size={12} />
      </button>
      {open && (
        <Menu
          className="right-0 top-9"
          width={300}
          onClose={() => setOpen(false)}
          items={[
            { label: 'Favorites', header: true },
            ...(favs.length ? favs.map((f) => ({ label: f.name, icon: <ObjIcon type={f.object} size={18} />, onClick: () => go(f.route) })) : [{ label: 'Click the star to add the current page to your favorites.', disabled: true }]),
            ...(cur ? [{ divider: true, label: '' }, { label: isFav ? 'Remove from Favorites' : 'Add to Favorites', onClick: toggle }] : []),
          ]}
        />
      )}
    </div>
  )
}

export function GlobalActions() {
  const { run } = useActions()
  const [open, setOpen] = useState(false)
  const items: [string, string][] = [
    ['New Event', 'Event'],
    ['New Task', 'Task'],
    ['Log a Call', 'Call'],
    ['New Note', 'Note'],
    ['New Contact', 'Contact'],
    ['New Opportunity', 'Opportunity'],
    ['New Lead', 'Lead'],
    ['New Account', 'Account'],
    ['New Case', 'Case'],
  ]
  return (
    <span className="relative">
      <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-[#F3F3F3]" aria-label="Global Actions" onClick={() => setOpen(!open)}>
        <span className="w-[18px] h-[18px] rounded-[3px] border-[1.5px] border-[#747474] flex items-center justify-center">
          <Plus size={12} strokeWidth={3} />
        </span>
      </button>
      {open && <Menu className="right-0 top-9" width={200} onClose={() => setOpen(false)} items={items.map(([l, o]) => ({ label: l, agent: `sf-global-${o.toLowerCase()}`, icon: <ObjIcon type={o === 'Call' ? 'Call' : o} size={18} />, onClick: () => run({ kind: 'new', object: o, stay: ['Event', 'Task', 'Call', 'Note'].includes(o) }) }))} />}
    </span>
  )
}

function Panel({ title, onClose, children, width = 340 }: { title: ReactNode; onClose: () => void; children: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, onClose, true, true)
  return (
    <div ref={ref} className="absolute right-0 top-10 z-50 bg-white rounded-[4px] border border-[#E5E5E5] text-[#181818] text-left" style={{ width, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
      <div className="h-11 px-4 flex items-center border-b border-[#E5E5E5]">
        <span className="flex-1 text-[15px] font-bold">{title}</span>
        <button onClick={onClose} aria-label="Close" className="text-[#747474]">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  )
}

const GUIDES = [
  { id: 'g1', title: 'Work your pipeline with Kanban', body: 'Open Opportunities, click the Display As button and choose Kanban to drag deals between stages.', mins: 3 },
  { id: 'g2', title: 'Log calls from the activity timeline', body: 'Use Log a Call on any record. Calls appear in the timeline and roll up to the account.', mins: 2 },
  { id: 'g3', title: 'Build a report in Lightning', body: 'Reports → New Report. Pick a report type, group rows and save it to a folder.', mins: 5 },
  { id: 'g4', title: 'Collaborate in Chatter', body: 'Mention teammates with @, post polls and questions, and bookmark posts to follow up later.', mins: 2 },
  { id: 'g5', title: 'Convert qualified leads', body: 'Convert a lead to create the account, contact and opportunity in one step.', mins: 3 },
]

export function Guidance() {
  const [open, setOpen] = useState(false)
  const done = useCollection<any>('salesforce.guidance')
  const [sel, setSel] = useState<string | null>(null)
  const pct = Math.round((done.filter((d) => GUIDES.some((g) => g.id === d.id)).length / GUIDES.length) * 100)
  return (
    <span className="relative">
      <button className={iconBtn} aria-label="Guidance Center" onClick={() => setOpen(!open)}>
        <Cloud size={19} />
      </button>
      {open && (
        <Panel title="Guidance Center" onClose={() => setOpen(false)} width={360}>
          <div className="p-4 text-[13px]">
            <div className="text-[12px] text-[#444] mb-1">Your learning progress · {pct}%</div>
            <div className="h-2 rounded bg-[#E5E5E5] mb-3">
              <div className="h-full rounded bg-[#2E844A]" style={{ width: `${pct}%` }} />
            </div>
            {GUIDES.map((g) => {
              const isDone = done.some((d) => d.id === g.id)
              return (
                <div key={g.id} className="border-b border-[#E5E5E5] py-2">
                  <button className="w-full flex items-center gap-2 text-left" onClick={() => setSel(sel === g.id ? null : g.id)}>
                    {isDone ? <CheckCircle2 size={16} className="text-[#2E844A] shrink-0" /> : <BookOpen size={16} className="text-[#0176D3] shrink-0" />}
                    <span className={`flex-1 ${isDone ? 'text-[#444]' : 'font-bold'}`}>{g.title}</span>
                    <span className="text-[11px] text-[#444]">{g.mins} min</span>
                  </button>
                  {sel === g.id && (
                    <div className="pl-6 pt-1 text-[12.5px] text-[#444]">
                      {g.body}
                      <div className="mt-1.5">
                        <Link onClick={() => (isDone ? db.remove('salesforce.guidance', g.id) : db.insert('salesforce.guidance', { id: g.id, date: new Date().toISOString() }))}>{isDone ? 'Mark as not done' : 'Mark as done'}</Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>
      )}
    </span>
  )
}

const HELP = [
  ['Create and manage list views', 'List views let you see a filtered list of records. Use the gear icon to rename a view, choose fields and clear filters.'],
  ['Opportunity stages and Path', 'Use Path to move an opportunity through its stages. Mark Stage as Complete advances one step; select Closed to close it won or lost.'],
  ['Convert a lead', 'Converting a lead creates an account, contact and (optionally) an opportunity from the lead’s information.'],
  ['Forecast categories', 'Pipeline, Best Case, Commit and Closed roll up from the stage of each opportunity.'],
  ['Chatter basics', 'Post updates, polls and questions on records, mention colleagues with @ and like or comment on posts.'],
  ['Import data', 'Use Import on a list view to paste CSV data. The first row is used to map columns to fields.'],
]

export function Help() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const list = HELP.map((h, i) => [...h, i] as [string, string, number]).filter(([t, b]) => !q || (t + b).toLowerCase().includes(q.toLowerCase()))
  return (
    <span className="relative">
      <button className={iconBtn} aria-label="Help" onClick={() => setOpen(!open)}>
        <CircleHelp size={19} />
      </button>
      {open && (
        <Panel title="Help" onClose={() => setOpen(false)} width={380}>
          <div className="p-4 text-[13px]">
            <div className="flex items-center h-8 border border-[#C9C9C9] rounded-[4px] px-2 gap-1.5 mb-3">
              <Search size={13} className="text-[#747474]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Help" className="flex-1 outline-none text-[13px]" aria-label="Search Help" />
            </div>
            <div className="text-[11px] font-bold uppercase text-[#444] mb-1">Help for this page</div>
            {list.map(([t, b, i]) => (
              <div key={i} className="py-1.5 border-b border-[#E5E5E5]">
                <Link onClick={() => setSel(sel === i ? null : i)}>{t}</Link>
                {sel === i && <div className="text-[12.5px] text-[#444] mt-1 leading-[1.45]">{b}</div>}
              </div>
            ))}
            {!list.length && <div className="text-[#444]">No results for “{q}”.</div>}
            <div className="mt-3 flex items-center gap-1 text-[12px] text-[#444]">
              <ExternalLink size={12} /> More help is available in Salesforce Help and Trailhead.
            </div>
          </div>
        </Panel>
      )}
    </span>
  )
}

export function SetupMenu() {
  const { go, route } = useNav()
  const { run } = useActions()
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <button className={iconBtn} aria-label="Setup" onClick={() => setOpen(!open)}>
        <Settings size={19} />
      </button>
      {open && (
        <Menu
          className="right-0 top-10"
          width={220}
          onClose={() => setOpen(false)}
          items={[
            { label: 'Setup', agent: 'sf-setup-open', onClick: () => go({ page: 'setup' }) },
            { label: 'Object Manager', onClick: () => go({ page: 'setup', tab: 'objects' }) },
            { label: 'Users', onClick: () => go({ page: 'setup', tab: 'users' }) },
            { label: 'Company Information', onClick: () => go({ page: 'setup', tab: 'company' }) },
            { divider: true, label: '' },
            { label: 'Edit Object', disabled: route.page !== 'record' && route.page !== 'list', onClick: () => go({ page: 'setup', tab: 'objects' }) },
            { label: 'New Task', onClick: () => run({ kind: 'new', object: 'Task', stay: true }) },
          ]}
        />
      )}
    </span>
  )
}

/** notifications are derived from live data; read state is persisted */
export function Notifications() {
  const { go } = useNav()
  const [open, setOpen] = useState(false)
  const read = useCollection<any>('salesforce.notifRead')
  const opps = useCollection<any>('salesforce.opportunities')
  const tasks = useCollection<any>('salesforce.tasks')
  const chatter = useCollection<any>('salesforce.chatter')
  const items = useMemo(() => {
    const contoso = opps.find((o) => o.name.startsWith('Contoso Ltd - Renewal'))
    const overdue = tasks.filter((t) => t.ownerId === ME.id && t.status !== 'Completed' && t.dueDate < new Date().toISOString().slice(0, 10))
    const mentions = chatter.filter((p) => p.authorId !== ME.id && (p.body.includes(`@${ME.name}`) || p.comments?.some((c: any) => c.authorId !== ME.id)))
    const list: { id: string; title: string; body: string; when: string; route: Route; who?: string }[] = []
    if (contoso) list.push({ id: 'n-contoso', title: 'Deal Desk approved your request', body: `Price lock approved on ${contoso.name}.`, when: new Date(Date.now() - 4 * 86400000).toISOString(), route: { page: 'record', object: 'Opportunity', id: contoso.id }, who: 'marcus' })
    for (const t of overdue.slice(0, 2)) list.push({ id: `n-task-${t.id}`, title: 'Overdue task', body: t.subject, when: t.dueDate + 'T09:00:00', route: t.whatId ? { page: 'record', object: 'Opportunity', id: t.whatId } : { page: 'list', object: 'Task' } })
    for (const p of mentions.slice(0, 3)) list.push({ id: `n-post-${p.id}`, title: `${p.authorId === 'rachel' ? 'Rachel Goldberg' : 'A teammate'} commented on a post you follow`, body: p.body.slice(0, 90), when: p.date, route: p.parentId ? { page: 'record', object: 'Opportunity', id: p.parentId } : { page: 'list', object: 'Chatter' }, who: p.authorId })
    return list
  }, [opps, tasks, chatter])
  const unread = items.filter((n) => !read.some((r) => r.id === n.id)).length
  return (
    <span className="relative">
      <button className={`relative ${iconBtn}`} aria-label="Notifications" onClick={() => setOpen(!open)}>
        <Bell size={19} />
        {unread > 0 && <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#BA0517] text-white text-[10px] font-bold leading-[15px]">{unread}</span>}
      </button>
      {open && (
        <Panel
          title={
            <span className="flex items-center">
              <span className="flex-1">Notifications</span>
              {unread > 0 && (
                <button className="text-[12px] font-normal text-[#0176D3] hover:underline mr-3" onClick={() => items.forEach((n) => db.upsert('salesforce.notifRead', { id: n.id }))}>
                  Mark all as read
                </button>
              )}
            </span>
          }
          onClose={() => setOpen(false)}
          width={380}
        >
          <div className="max-h-[420px] overflow-auto">
            {items.map((n) => {
              const isRead = read.some((r) => r.id === n.id)
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    db.upsert('salesforce.notifRead', { id: n.id })
                    setOpen(false)
                    go(n.route)
                  }}
                  className={`w-full flex gap-3 px-4 py-3 text-left border-b border-[#E5E5E5] hover:bg-[#F3F3F3] ${isRead ? '' : 'bg-[#EEF4FF]'}`}
                >
                  {n.who ? <Avatar id={n.who} size={32} /> : <ObjIcon type="Task" size={32} />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold">{n.title}</span>
                    <span className="block text-[12.5px] text-[#444] truncate">{n.body}</span>
                    <span className="block text-[11.5px] text-[#747474]">{sfDate(n.when)}</span>
                  </span>
                  {!isRead && <span className="w-2 h-2 mt-1.5 rounded-full bg-[#0176D3] shrink-0" />}
                </button>
              )
            })}
            {!items.length && <div className="p-6 text-center text-[13px] text-[#444]">You’re all caught up.</div>}
          </div>
        </Panel>
      )}
    </span>
  )
}

export function Profile() {
  const { close } = useWin()
  const { go } = useNav()
  const { toast } = useActions()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useOutside(ref, () => setOpen(false), open)
  return (
    <span className="relative" ref={ref}>
      <button className="ml-1" aria-label="View profile" onClick={() => setOpen(!open)}>
        <Avatar id={ME.id} size={32} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-[300px] bg-white rounded-[4px] border border-[#E5E5E5] text-[#181818] text-left" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
          <div className="p-4 flex items-center gap-3 border-b border-[#E5E5E5]">
            <Avatar id={ME.id} size={48} />
            <div className="min-w-0">
              <div className="text-[15px] font-bold">{ME.name}</div>
              <div className="text-[12px] text-[#444] truncate">northwind.lightning.force.com</div>
              <Link className="text-[12px]" onClick={() => { setOpen(false); go({ page: 'setup', tab: 'users' }) }}>Settings</Link>
              <span className="text-[#747474] mx-1">|</span>
              <Link className="text-[12px]" onClick={() => { setOpen(false); close() }}>Log Out</Link>
            </div>
          </div>
          <div className="py-1 text-[13px]">
            {([
              ['Switch to Salesforce Classic', () => toast('Salesforce Classic isn’t enabled for your profile.')],
              ['Add Username', () => toast('Add Username is available after single sign-on is configured.')],
              ['Display Density: Comfy', () => toast('Display density is set to Comfy.')],
            ] as [string, () => void][]).map(([l, f]) => (
              <button key={l} onClick={() => { setOpen(false); f() }} className="w-full h-8 px-4 text-left hover:bg-[#F3F3F3]">
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}

const APPS = [
  ['Sales', 'Manage your sales process with accounts, leads, opportunities, and more', '#0176D3'],
  ['Service', 'Manage customer service with accounts, contacts, cases, and more', '#7F56D9'],
  ['Marketing CRM Classic', 'Track sales and marketing efforts with CRM objects', '#F49756'],
  ['Sales Console', '(Lightning Experience) Lets sales reps work with multiple records on one screen', '#3BA755'],
  ['Platform', 'The fundamental Lightning Platform', '#2ECBBE'],
  ['Community', 'Salesforce CRM Communities', '#EF6E64'],
]
const ITEMS: [string, Route][] = [
  ['Accounts', { page: 'list', object: 'Account' }],
  ['Campaigns', { page: 'list', object: 'Campaign' }],
  ['Cases', { page: 'list', object: 'Case' }],
  ['Chatter', { page: 'list', object: 'Chatter' }],
  ['Contacts', { page: 'list', object: 'Contact' }],
  ['Dashboards', { page: 'list', object: 'Dashboard' }],
  ['Files', { page: 'list', object: 'File' }],
  ['Forecasts', { page: 'list', object: 'Forecasts' }],
  ['Leads', { page: 'list', object: 'Lead' }],
  ['Opportunities', { page: 'list', object: 'Opportunity' }],
  ['Reports', { page: 'list', object: 'Report' }],
  ['Tasks', { page: 'list', object: 'Task' }],
  ['Setup', { page: 'setup' }],
]

export function AppLauncher({ onClose }: { onClose: () => void }) {
  const { go } = useNav()
  const { toast } = useActions()
  const [q, setQ] = useState('')
  const f = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())
  return (
    <Modal title="App Launcher" agent="sf-app-launcher-modal" width={860} onClose={onClose} footer={<Btn onClick={onClose}>Close</Btn>}>
      <div className="p-5">
        <div className="flex items-center h-8 w-[360px] mx-auto border border-[#C9C9C9] rounded-[4px] px-2 gap-1.5 mb-4">
          <Search size={13} className="text-[#747474]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps or items..." className="flex-1 outline-none text-[13px]" aria-label="Search apps or items" />
        </div>
        <div className="text-[14px] font-bold mb-2">All Apps</div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {APPS.filter(([n, d]) => f(n + d)).map(([n, d, c]) => (
            <button
              key={n}
              onClick={() => {
                onClose()
                if (n === 'Sales' || n === 'Sales Console') go({ page: 'home' })
                else if (n === 'Service') go({ page: 'list', object: 'Case' })
                else if (n === 'Marketing CRM Classic') go({ page: 'list', object: 'Campaign' })
                else toast(`${n} isn’t assigned to your profile.`)
              }}
              className="flex gap-3 p-3 rounded-[4px] border border-[#E5E5E5] text-left hover:bg-[#F3F3F3]"
            >
              <span className="w-10 h-10 rounded-[4px] shrink-0 flex items-center justify-center text-white font-bold" style={{ background: c }}>
                {n.slice(0, 2)}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-[#0176D3] font-bold">{n}</span>
                <span className="block text-[12px] text-[#444] leading-tight">{d}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="text-[14px] font-bold mb-2">All Items</div>
        <div className="grid grid-cols-4 gap-x-4 gap-y-1">
          {ITEMS.filter(([n]) => f(n)).map(([n, r]) => (
            <Link key={n} className="text-[13px] py-1" onClick={() => { onClose(); go(r) }}>
              {n}
            </Link>
          ))}
        </div>
      </div>
    </Modal>
  )
}

/** extra nav items the user can add after the standard ones (never moves or hides the standard tabs) */
export const EXTRA_NAV: [string, string][] = [
  ['Case', 'Cases'],
  ['Setup', 'Setup'],
]

export function EditNav({ onClose }: { onClose: () => void }) {
  const prefs = useCollection<any>('salesforce.prefs')
  const cur: string[] = prefs.find((p) => p.id === 'navExtra')?.items ?? []
  const [sel, setSel] = useState<string[]>(cur)
  return (
    <Modal
      title="Edit Sales App Navigation Items"
      width={560}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="brand" onClick={() => { db.upsert('salesforce.prefs', { id: 'navExtra', items: sel }); onClose() }}>Save</Btn>
        </>
      }
    >
      <div className="p-5 text-[13px] space-y-2">
        <p className="text-[#444]">Personalize your nav bar for this app. Standard items stay in place; add more items to the end.</p>
        {EXTRA_NAV.map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 h-8 px-2 rounded border border-[#E5E5E5]">
            <input type="checkbox" checked={sel.includes(k)} onChange={() => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k])} />
            <ObjIcon type={k === 'Setup' ? 'Report' : k} size={20} /> {l}
          </label>
        ))}
        <div className="text-[12px] text-[#444]">Reset: <Link onClick={() => setSel([])}>Restore default items</Link></div>
      </div>
    </Modal>
  )
}

