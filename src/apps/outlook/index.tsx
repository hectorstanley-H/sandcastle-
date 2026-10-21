import { useEffect, useState } from 'react'
import {
  Mail24Regular,
  Mail24Filled,
  Calendar24Regular,
  Calendar24Filled,
  People24Regular,
  People24Filled,
  PeopleTeam24Regular,
  Attach24Regular,
  CheckmarkCircle24Regular,
  Apps24Regular,
  Search20Regular,
  Alert20Regular,
  Settings20Regular,
  Lightbulb20Regular,
  Video20Regular,
  Grid20Regular,
  Mail20Regular,
  Call20Regular,
  Chat20Regular,
} from '@fluentui/react-icons'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE } from '@/data/people'
import { MailView } from './Mail'
import { CalendarView } from './Calendar'

type View = 'mail' | 'calendar' | 'people'

function PeopleView() {
  const [sel, setSel] = useState(PEOPLE[1].id)
  const p = PEOPLE.find((x) => x.id === sel)!
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="w-[320px] shrink-0 m-2 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] overflow-auto">
        <div className="px-4 h-11 flex items-center text-[14px] font-semibold border-b border-[#F0F0F0]">Contacts · {PEOPLE.length}</div>
        {PEOPLE.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className={`w-full flex items-center gap-3 px-4 py-2 text-left ${sel === x.id ? 'bg-[#EBF3FC]' : 'hover:bg-[#F5F5F5]'}`}>
            <Avatar id={x.id} size={32} />
            <div className="min-w-0">
              <div className="text-[13.5px] truncate">{x.name}</div>
              <div className="text-[12px] text-[#616161] truncate">{x.title} · {x.company}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 m-2 ml-0 bg-white rounded-lg shadow-[0_0_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.14)] p-8">
        <div className="flex items-center gap-5">
          <Avatar id={p.id} size={88} />
          <div>
            <div className="text-[24px] font-semibold">{p.name}</div>
            <div className="text-[14px] text-[#616161]">{p.title} · {p.dept}</div>
            <div className="text-[14px] text-[#616161]">{p.company}</div>
            <div className="flex gap-2 mt-3">
              {[Mail20Regular, Chat20Regular, Call20Regular, Video20Regular].map((I, i) => (
                <button key={i} className="w-9 h-9 rounded-full bg-[#EBF3FC] text-[#0F6CBD] flex items-center justify-center hover:bg-[#CFE4FA]"><I /></button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-6 max-w-[640px] text-[13.5px]">
          {[['Email', p.email], ['Work phone', p.phone], ['Office location', p.location], ['Department', p.dept]].map(([k, v]) => (
            <div key={k}>
              <div className="text-[12px] text-[#616161]">{k}</div>
              <div className={k === 'Email' ? 'text-[#0F6CBD]' : ''}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Outlook({ win, params }: AppProps) {
  const [view, setView] = useState<View>('mail')
  const [search, setSearch] = useState('')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    if (params?.view) setView(params.view)
    else if (params?.eventId || params?.newEvent) setView('calendar')
    else if (params?.emailId || params?.folder || params?.compose) setView('mail')
  }, [win.nonce])

  const rail: [View | string, any, any, string][] = [
    ['mail', Mail24Regular, Mail24Filled, 'Mail'],
    ['calendar', Calendar24Regular, Calendar24Filled, 'Calendar'],
    ['people', People24Regular, People24Filled, 'People'],
    ['groups', PeopleTeam24Regular, PeopleTeam24Regular, 'Groups'],
    ['files', Attach24Regular, Attach24Regular, 'Files'],
    ['todo', CheckmarkCircle24Regular, CheckmarkCircle24Regular, 'To Do'],
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F0F0F0]" style={{ fontFamily: 'var(--font-win)' }}>
      {/* header */}
      <div data-drag-handle className="h-12 shrink-0 flex items-center bg-[#0F6CBD] text-white">
        <button className="w-12 h-12 flex items-center justify-center hover:bg-white/10" aria-label="App launcher"><Grid20Regular /></button>
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
              }}
              placeholder="Search"
              className="flex-1 outline-none text-[13.5px] bg-transparent"
            />
          </div>
        </div>
        <div className="flex items-center" data-no-drag>
          <button className="flex items-center gap-1.5 h-8 px-2.5 mr-1 rounded hover:bg-white/10 text-[13px]"><Video20Regular /> Meet Now</button>
          <button className="w-10 h-12 flex items-center justify-center hover:bg-white/10"><Alert20Regular /></button>
          <button className="w-10 h-12 flex items-center justify-center hover:bg-white/10"><Settings20Regular /></button>
          <button className="w-10 h-12 flex items-center justify-center hover:bg-white/10"><Lightbulb20Regular /></button>
          <button className="w-12 h-12 flex items-center justify-center hover:bg-white/10"><Avatar id={ME.id} size={30} ring="rgba(255,255,255,0.6)" /></button>
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
                onClick={() => (id === 'mail' || id === 'calendar' || id === 'people') && setView(id as View)}
                className={`relative w-11 h-12 rounded-md flex flex-col items-center justify-center gap-0.5 ${active ? 'text-[#0F6CBD]' : 'text-[#424242] hover:bg-[#E5E5E5]'}`}
              >
                {active && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#0F6CBD]" />}
                {active ? <IF /> : <I />}
              </button>
            )
          })}
          <div className="w-6 h-px bg-[#D1D1D1] my-1" />
          {['word', 'excel', 'powerpoint', 'onedrive'].map((a) => (
            <button key={a} className="w-11 h-10 rounded-md flex items-center justify-center hover:bg-[#E5E5E5]">
              <img src={logoUrl(a)} className="w-5 h-5" alt="" />
            </button>
          ))}
          <button className="w-11 h-10 rounded-md flex items-center justify-center hover:bg-[#E5E5E5] text-[#424242]"><Apps24Regular /></button>
        </div>
        {view === 'mail' && <MailView params={params} nonce={win.nonce} search={search} />}
        {view === 'calendar' && <CalendarView params={params} nonce={win.nonce} />}
        {view === 'people' && <PeopleView />}
      </div>
    </div>
  )
}
