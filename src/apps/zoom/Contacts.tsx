import { useState } from 'react'
import { CalendarPlus, Mail, MapPin, MessageCircle, Phone, Search, Star, Video } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { usePrefs, useZoom } from './shared'

export function ContactsTab() {
  const { openChat, startMeeting, schedule } = useZoom()
  const [prefs, setPrefs] = usePrefs()
  const [q, setQ] = useState('')
  const [f, setF] = useState<'all' | 'starred' | 'company' | 'external'>('all')
  const [sel, setSel] = useState<string | null>(null)
  const starred = prefs.starredContacts ?? []
  const list = PEOPLE.filter((p) => p.id !== ME.id)
    .filter((p) => (f === 'starred' ? starred.includes(p.id) : f === 'company' ? !p.external : f === 'external' ? p.external : true))
    .filter((p) => `${p.name} ${p.email} ${p.title} ${p.dept} ${p.company ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const p = sel ? person(sel) : null
  const toggleStar = (id: string) => setPrefs({ starredContacts: starred.includes(id) ? starred.filter((x) => x !== id) : [...starred, id] })
  return (
    <div className="flex-1 min-w-0 flex">
      <div className="w-[320px] shrink-0 border-r border-[#E4E4ED] flex flex-col">
        <div className="h-12 px-4 flex items-center"><span className="text-[16px] font-bold">Contacts</span></div>
        <div className="mx-4 flex items-center h-8 rounded-[8px] border border-[#D5D7E0] px-3 gap-2 text-[#6E7680]"><Search size={14} /><input data-agent="zoom-contacts-search" aria-label="Search contacts" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" className="flex-1 outline-none text-[13px] text-[#131619] bg-transparent" /></div>
        <div className="mx-4 mt-2 mb-1 flex gap-1 text-[12px] font-medium">
          {([['all', 'All'], ['starred', 'Starred'], ['company', 'Northwind'], ['external', 'External']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setF(k)} className={`h-7 px-2.5 rounded-full ${f === k ? 'bg-[#0B5CFF] text-white' : 'bg-[#ECECF2] text-[#3F4752]'}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto py-1">
          {list.map((x) => (
            <button key={x.id} data-agent={`zoom-contact-${x.id}`} onClick={() => setSel(x.id)} className={`w-full px-4 h-12 flex items-center gap-3 text-left ${sel === x.id ? 'bg-[#DCE8FF]' : 'hover:bg-[#F7F7FA]'}`}>
              <Avatar id={x.id} size={32} presence={x.external ? undefined : x.id.length % 3 === 0 ? 'away' : 'available'} />
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold truncate">{x.name}</span><span className="block text-[12px] text-[#6E7680] truncate">{x.external ? x.company : x.title}</span></span>
              {starred.includes(x.id) && <Star size={12} className="fill-[#F5A623] text-[#F5A623]" />}
            </button>
          ))}
          {!list.length && <div className="p-8 text-center text-[13px] text-[#6E7680]">{f === 'starred' ? 'No starred contacts yet.' : 'No contacts found.'}</div>}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-auto">
        {!p ? (
          <div className="h-full flex flex-col items-center justify-center text-[#6E7680] gap-2"><div className="text-[15px] font-semibold text-[#131619]">Northwind Global directory</div><div className="text-[13px]">{PEOPLE.length - 1} contacts · select someone to chat or meet</div></div>
        ) : (
          <div className="p-10 max-w-[620px]" data-agent="zoom-contact-detail">
            <div className="flex items-center gap-5">
              <Avatar id={p.id} size={84} />
              <div className="flex-1 min-w-0">
                <div className="text-[24px] font-bold flex items-center gap-2">{p.name}
                  <button data-agent="zoom-contact-star" aria-label={starred.includes(p.id) ? 'Unstar contact' : 'Star contact'} onClick={() => toggleStar(p.id)}><Star size={18} className={starred.includes(p.id) ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#6E7680]'} /></button>
                </div>
                <div className="text-[14px] text-[#3F4752]">{p.title}{p.external ? ` · ${p.company}` : ` · ${p.dept}`}</div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {[
                ['Chat', MessageCircle, 'zoom-contact-chat', () => openChat(p.id)],
                ['Meet', Video, 'zoom-contact-meet', () => startMeeting({ topic: `${ME.name} and ${p.name}`, participants: [p.id] })],
                ['Schedule', CalendarPlus, 'zoom-contact-schedule', () => schedule({ attendees: p.email, topic: `${ME.first} / ${p.first} — sync` })],
              ].map(([l, I, a, fn]: any) => (
                <button key={l} data-agent={a} onClick={fn} className="flex flex-col items-center gap-1 w-[80px]">
                  <span className="w-12 h-12 rounded-[14px] bg-[#0B5CFF] text-white flex items-center justify-center"><I size={20} /></span>
                  <span className="text-[12.5px] text-[#3F4752]">{l}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-[12px] border border-[#E4E4ED] divide-y divide-[#E4E4ED] text-[14px]">
              {[[Mail, 'Email', p.email], [Phone, 'Phone', p.phone], [MapPin, 'Location', p.location], ...(p.managerId ? [[MessageCircle, 'Manager', person(p.managerId).name]] : [])].map(([I, k, v]: any) => (
                <div key={k} className="flex items-center px-5 py-3 gap-3"><I size={15} className="text-[#6E7680]" /><div className="w-[90px] text-[#6E7680]">{k}</div><div className="break-all">{v}</div></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
