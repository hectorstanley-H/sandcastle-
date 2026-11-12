import { useEffect, useState } from 'react'
import {
  Mail24Regular,
  Mail24Filled,
  Calendar24Regular,
  Calendar24Filled,
  People24Regular,
  People24Filled,
  PeopleTeam24Regular,
  PeopleTeam24Filled,
  Attach24Regular,
  Attach24Filled,
  CheckmarkCircle24Regular,
  CheckmarkCircle24Filled,
  Apps24Regular,
  Search20Regular,
  Alert20Regular,
  Settings20Regular,
  Lightbulb20Regular,
  Video20Regular,
  Grid20Regular,
  Dismiss20Regular,
  Person20Regular,
  MailUnread20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { MailView } from './Mail'
import { CalendarView } from './Calendar'
import { FilesView, GroupsView, NotificationsPanel, PeopleView, SettingsFlyout, TIPS, TodoView } from './Panels'
import { MenuItem, MenuPanel, MenuSep, useMenu, usePrefs } from './ui'

type View = 'mail' | 'calendar' | 'people' | 'groups' | 'files' | 'todo'

const LAUNCH: [string, string, string][] = [
  ['outlook', 'Outlook', 'outlook'],
  ['teams', 'Teams', 'teams'],
  ['word', 'Word', 'word'],
  ['excel', 'Excel', 'excel'],
  ['powerpoint', 'PowerPoint', 'powerpoint'],
  ['onedrive', 'OneDrive', 'explorer'],
  ['powerbi', 'Power BI', 'powerbi'],
  ['edge', 'Edge', 'edge'],
]

function Launcher({ onPick }: { onPick: (appId: string) => void }) {
  return (
    <MenuPanel className="left-1 top-12 w-[300px] p-3">
      <div className="text-[13px] font-semibold mb-2 px-1">Apps</div>
      <div className="grid grid-cols-4 gap-1">
        {LAUNCH.map(([logo, name, app]) => (
          <button key={name} data-agent={`outlook-launch-${logo}`} onClick={() => onPick(app)} className="flex flex-col items-center gap-1 py-2 rounded hover:bg-[#F5F5F5]">
            <img src={logoUrl(logo)} className="w-7 h-7" alt="" />
            <span className="text-[11.5px] text-[#424242]">{name}</span>
          </button>
        ))}
      </div>
    </MenuPanel>
  )
}

export default function Outlook({ win, params }: AppProps) {
  const { open } = useDesk()
  const [prefs] = usePrefs()
  const [view, setView] = useState<View>('mail')
  const [search, setSearch] = useState('')
  const [searchText, setSearchText] = useState('')
  const [settings, setSettings] = useState(false)
  const [peopleInit, setPeopleInit] = useState<{ id?: string; n: number }>({ n: 0 })
  const [groupInit, setGroupInit] = useState<string | undefined>()
  const launcher = useMenu()
  const railLauncher = useMenu()
  const bell = useMenu()
  const tips = useMenu()
  const account = useMenu()

  useEffect(() => {
    if (params?.view) setView(params.view)
    else if (params?.eventId || params?.newEvent) setView('calendar')
    else if (params?.emailId || params?.folder || params?.compose) setView('mail')
  }, [win.nonce])

  const rail: [View, any, any, string][] = [
    ['mail', Mail24Regular, Mail24Filled, 'Mail'],
    ['calendar', Calendar24Regular, Calendar24Filled, 'Calendar'],
    ['people', People24Regular, People24Filled, 'People'],
    ['groups', PeopleTeam24Regular, PeopleTeam24Filled, 'Groups'],
    ['files', Attach24Regular, Attach24Filled, 'Files'],
    ['todo', CheckmarkCircle24Regular, CheckmarkCircle24Filled, 'To Do'],
  ]

  const onNav = (v: string, extra?: any) => {
    if (v === 'settings') return setSettings(true)
    if (v === 'tips') return tips.setOpen(true)
    if (v === 'calendar') return open('outlook', { view: 'calendar', ...(extra ?? {}) })
    if (v === 'groups') setGroupInit(extra?.groupId)
    setView(v as View)
  }
  const launch = (app: string) => {
    if (app === 'outlook') setView('mail')
    else open(app)
    launcher.close()
    railLauncher.close()
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-[#F0F0F0]" style={{ fontFamily: 'var(--font-win)' }}>
      {/* header */}
      <div data-drag-handle className="h-12 shrink-0 flex items-center bg-[#0F6CBD] text-white">
        <div className="relative" ref={launcher.ref} data-no-drag>
          <button className="w-12 h-12 flex items-center justify-center hover:bg-white/10" aria-label="App launcher" onClick={launcher.toggle}><Grid20Regular /></button>
          {launcher.open && <Launcher onPick={launch} />}
        </div>
        <div className="flex items-center gap-2 w-[200px]">
          <span className="text-[16px] font-semibold">Outlook</span>
        </div>
        <div className="flex-1 flex justify-center px-4" data-no-drag>
          <div className="flex items-center w-full max-w-[520px] h-8 rounded bg-white text-[#242424] px-2 gap-2">
            <Search20Regular className="text-[#0F6CBD]" />
            <input
              data-agent="outlook-search"
              aria-label="Search"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                if (!e.target.value) setSearch('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchText)
                  setView('mail')
                }
                if (e.key === 'Escape') {
                  setSearchText('')
                  setSearch('')
                }
              }}
              placeholder="Search"
              className="flex-1 outline-none text-[13.5px] bg-transparent"
            />
            {searchText && (
              <button
                aria-label="Clear search"
                className="w-6 h-6 rounded hover:bg-[#F0F0F0] flex items-center justify-center text-[#616161]"
                onClick={() => {
                  setSearchText('')
                  setSearch('')
                }}
              >
                <Dismiss20Regular className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center" data-no-drag>
          <button data-agent="outlook-meet-now" className="flex items-center gap-1.5 h-8 px-2.5 mr-1 rounded hover:bg-white/10 text-[13px]" onClick={() => open('teams', { meetNow: true })}><Video20Regular /> Meet Now</button>
          <div className="relative" ref={bell.ref}>
            <button data-agent="outlook-notifications-button" className="w-10 h-12 flex items-center justify-center hover:bg-white/10" aria-label="Notifications" title="Notifications" onClick={bell.toggle}><Alert20Regular /></button>
            {bell.open && <NotificationsPanel onClose={bell.close} />}
          </div>
          <button data-agent="outlook-settings-button" className={`w-10 h-12 flex items-center justify-center hover:bg-white/10 ${settings ? 'bg-white/15' : ''}`} aria-label="Settings" title="Settings" onClick={() => setSettings((s) => !s)}><Settings20Regular /></button>
          <div className="relative" ref={tips.ref}>
            <button className="w-10 h-12 flex items-center justify-center hover:bg-white/10" aria-label="Tips" title="Tips" onClick={tips.toggle}><Lightbulb20Regular /></button>
            {tips.open && (
              <MenuPanel className="right-0 top-12 w-[320px] p-1">
                <div className="px-3 pt-2 pb-1 text-[14px] font-semibold">Tips for Outlook</div>
                {TIPS.map(([t, d]) => (
                  <div key={t} className="px-3 py-2 rounded hover:bg-[#F5F5F5]">
                    <div className="text-[13px] font-semibold">{t}</div>
                    <div className="text-[12.5px] text-[#616161]">{d}</div>
                  </div>
                ))}
              </MenuPanel>
            )}
          </div>
          <div className="relative" ref={account.ref}>
            <button className="w-12 h-12 flex items-center justify-center hover:bg-white/10" aria-label="Account manager" onClick={account.toggle}><Avatar id={ME.id} size={30} ring="rgba(255,255,255,0.6)" /></button>
            {account.open && (
              <MenuPanel className="right-0 top-12 w-[280px]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Avatar id={ME.id} size={48} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold truncate">{ME.name}</div>
                    <div className="text-[12.5px] text-[#616161] truncate">{ME.email}</div>
                    {prefs.autoReply && <div className="text-[11.5px] text-[#8A5A00]">Automatic replies on</div>}
                  </div>
                </div>
                <MenuSep />
                <MenuItem icon={<Person20Regular />} label="My profile" onClick={() => { setPeopleInit((p) => ({ id: ME.id, n: p.n + 1 })); setView('people'); account.close() }} />
                <MenuItem icon={<MailUnread20Regular />} label="Automatic replies" onClick={() => { setSettings(true); account.close() }} />
                <MenuItem icon={<Settings20Regular />} label="Settings" onClick={() => { setSettings(true); account.close() }} />
              </MenuPanel>
            )}
          </div>
        </div>
        <WindowControls dark height={48} />
      </div>
      <div className="flex-1 min-h-0 flex">
        {/* app rail */}
        <div className="w-[52px] shrink-0 flex flex-col items-center py-1 gap-0.5">
          {rail.map(([id, I, IF, label]) => {
            const active = view === id
            return (
              <button
                key={id}
                data-agent={`outlook-nav-${id}`}
                aria-label={label}
                title={label}
                onClick={() => setView(id)}
                className={`relative w-11 h-12 rounded-md flex flex-col items-center justify-center gap-0.5 ${active ? 'text-[#0F6CBD]' : 'text-[#424242] hover:bg-[#E5E5E5]'}`}
              >
                {active && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#0F6CBD]" />}
                {active ? <IF /> : <I />}
              </button>
            )
          })}
          <div className="w-6 h-px bg-[#D1D1D1] my-1" />
          {['word', 'excel', 'powerpoint', 'onedrive'].map((a) => (
            <button key={a} title={a === 'onedrive' ? 'OneDrive' : a[0].toUpperCase() + a.slice(1)} onClick={() => open(a === 'onedrive' ? 'explorer' : a)} className="w-11 h-10 rounded-md flex items-center justify-center hover:bg-[#E5E5E5]">
              <img src={logoUrl(a)} className="w-5 h-5" alt="" />
            </button>
          ))}
          <div className="relative" ref={railLauncher.ref}>
            <button title="More apps" aria-label="More apps" onClick={railLauncher.toggle} className="w-11 h-10 rounded-md flex items-center justify-center hover:bg-[#E5E5E5] text-[#424242]"><Apps24Regular /></button>
            {railLauncher.open && (
              <div className="absolute left-12 -top-40">
                <Launcher onPick={launch} />
              </div>
            )}
          </div>
        </div>
        {view === 'mail' && <MailView params={params} nonce={win.nonce} search={search} onNav={onNav} />}
        {view === 'calendar' && <CalendarView params={params} nonce={win.nonce} />}
        {view === 'people' && <PeopleView key={peopleInit.n} initial={peopleInit.id} />}
        {view === 'groups' && <GroupsView key={groupInit ?? 'g'} initial={groupInit} />}
        {view === 'files' && <FilesView />}
        {view === 'todo' && <TodoView />}
      </div>
      {settings && <SettingsFlyout onClose={() => setSettings(false)} />}
    </div>
  )
}
