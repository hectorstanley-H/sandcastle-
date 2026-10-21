import { useEffect, useState } from 'react'
import { Search, Mic, Settings, LayoutGrid, Plus, ChevronLeft, ChevronRight, Sun, CloudSun, Cloud, MoreHorizontal, Image as ImageIcon, Video, MapPin, Newspaper, ShoppingBag } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'

/* ───────── art ───────── */

function Hero() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="eg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B3A6B" />
          <stop offset=".45" stopColor="#E8956B" />
          <stop offset=".62" stopColor="#F6C88F" />
          <stop offset="1" stopColor="#2B4C6F" />
        </linearGradient>
        <linearGradient id="eg-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2B983" />
          <stop offset="1" stopColor="#1A3350" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#eg-sky)" />
      <circle cx="1280" cy="500" r="60" fill="#FFE2B0" opacity=".85" />
      <path d="M0 560 L180 380 L300 470 L470 290 L640 470 L760 400 L900 520 L1050 340 L1220 480 L1380 360 L1600 520 V600 H0z" fill="#3B3F63" opacity=".85" />
      <path d="M0 600 L220 470 L380 560 L560 450 L720 560 L880 500 L1040 580 L1200 470 L1400 560 L1600 500 V620 H0z" fill="#23284A" />
      <rect y="600" width="1600" height="300" fill="url(#eg-lake)" />
      <path d="M1240 610h80M1200 640h160M1260 680h40M1180 720h200" stroke="#FFE2B0" strokeWidth="3" opacity=".5" />
      <path d="M0 900 L0 760 Q200 700 420 780 T900 820 T1600 760 V900z" fill="#0F1C2E" />
    </svg>
  )
}

function Art({ kind }: { kind: number }) {
  const scenes = [
    // skyline
    <svg key="a" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" className="w-full h-full"><rect width="300" height="170" fill="#7FA8D6" /><rect y="110" width="300" height="60" fill="#3E5C80" />{[10, 40, 62, 95, 130, 160, 190, 225, 255].map((x, i) => <rect key={x} x={x} y={50 + ((i * 23) % 50)} width={24 + (i % 3) * 6} height={120} fill={['#2A3F5C', '#344C6E', '#22344D'][i % 3]} />)}{[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={20 + i * 38} y={80} width="4" height="4" fill="#FFE9A8" />)}</svg>,
    // chart
    <svg key="b" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" className="w-full h-full"><rect width="300" height="170" fill="#0E2238" />{[0, 1, 2, 3].map((i) => <path key={i} d={`M0 ${40 + i * 35}h300`} stroke="#1E3A5A" />)}<path d="M0 130 L40 118 L80 124 L120 90 L160 98 L200 60 L240 72 L300 30" stroke="#3CCB7F" strokeWidth="3" fill="none" /><path d="M0 130 L40 118 L80 124 L120 90 L160 98 L200 60 L240 72 L300 30 V170 H0z" fill="#3CCB7F" opacity=".15" /></svg>,
    // port/containers
    <svg key="c" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" className="w-full h-full"><rect width="300" height="170" fill="#9CC9E8" /><rect y="120" width="300" height="50" fill="#2F6E9A" />{Array.from({ length: 18 }).map((_, i) => <rect key={i} x={20 + (i % 9) * 28} y={84 + Math.floor(i / 9) * 18} width="26" height="16" fill={['#D9534F', '#F0AD4E', '#5BC0DE', '#5CB85C', '#3E6FB0'][i % 5]} />)}<path d="M230 20v100M200 30h60" stroke="#E5A82E" strokeWidth="5" /></svg>,
    // data center
    <svg key="d" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" className="w-full h-full"><rect width="300" height="170" fill="#101826" />{[0, 1, 2, 3, 4].map((i) => <g key={i}><rect x={20 + i * 56} y="20" width="44" height="140" fill="#1C2A3E" />{[0, 1, 2, 3, 4, 5, 6].map((j) => <rect key={j} x={26 + i * 56} y={30 + j * 18} width="32" height="8" fill="#243852" />)}{[0, 1, 2, 3, 4, 5, 6].map((j) => <circle key={j} cx={54 + i * 56} cy={34 + j * 18} r="1.6" fill={j % 3 ? '#3CCB7F' : '#4FC3F7'} />)}</g>)}</svg>,
    // airplane
    <svg key="e" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" className="w-full h-full"><rect width="300" height="170" fill="#BFE0F7" /><ellipse cx="80" cy="130" rx="90" ry="20" fill="#fff" opacity=".8" /><ellipse cx="240" cy="40" rx="60" ry="14" fill="#fff" opacity=".8" /><g transform="translate(150 85) rotate(-12)"><path d="M-70 0 L60 -6 Q80 0 60 6 Z" fill="#E9EEF3" stroke="#8796A6" /><path d="M-10 -2 L-40 -40 L-20 -40 L20 -3z M-10 2 L-40 40 L-20 40 L20 3z" fill="#C7D2DD" /><path d="M-66 -1 L-80 -20 L-70 -20 L-56 -2z" fill="#C8102E" /></g></svg>,
    // office meeting
    <svg key="f" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" className="w-full h-full"><rect width="300" height="170" fill="#E9E2D6" /><rect x="40" y="100" width="220" height="16" rx="4" fill="#8B6B4A" />{[70, 120, 170, 220].map((x, i) => <g key={x}><circle cx={x} cy="70" r="12" fill="#E8C3A0" /><path d={`M${x - 16} 104v-14a16 16 0 0 1 32 0v14z`} fill={['#2F5D8A', '#7A3E65', '#3E7A5A', '#444'][i]} /></g>)}<rect x="110" y="20" width="80" height="34" fill="#fff" stroke="#bbb" /><path d="M118 44l14-10 12 6 18-12 18 8" stroke="#0F6CBD" strokeWidth="2" fill="none" /></svg>,
  ]
  return scenes[kind % scenes.length]
}

/* ───────── data ───────── */

const QUICK: [string, string, string?][] = [
  ['Outlook', 'outlook', 'outlook'],
  ['Teams', 'teams', 'teams'],
  ['SharePoint', 'sharepoint'],
  ['Salesforce', 'salesforce', 'salesforce'],
  ['ServiceNow', 'servicenow', 'servicenow'],
  ['Workday', 'workday', 'workday'],
  ['Concur', 'concur', 'concur'],
  ['Jira', 'jira', 'jira'],
]

const FEED: [string, string, string, number][] = [
  ['Fed signals patience on rates as inflation cools to 2.6%', 'Reuters', '2h', 1],
  ['Container rates on Asia–US routes fall for a fourth straight week', 'The Wall Street Journal', '3h', 2],
  ['Enterprises shift AI budgets from pilots to production agents, survey finds', 'Forbes', '1h', 3],
  ['Delta adds nonstop Boston–Chicago frequencies ahead of the holiday season', 'Boston Globe', '5h', 4],
  ['Boston office leasing hits its strongest quarter since 2019', 'Bloomberg', '4h', 0],
  ['Why CFOs are rethinking accounts payable in 2026', 'CFO Dive', '6h', 5],
  ['Microsoft unveils new Copilot features for Windows 11 business users', 'The Verge', '7h', 3],
  ['Supply chain execs expect steady freight demand through Q1', 'Supply Chain Dive', '8h', 2],
  ['S&P 500 closes at a record as tech and industrials rally', 'CNBC', '1h', 1],
]

const MARKETS: [string, string, string, boolean][] = [
  ['DOW', '44,912.38', '+0.42%', true],
  ['S&P 500', '6,284.15', '+0.61%', true],
  ['NASDAQ', '20,961.72', '+0.88%', true],
  ['MSFT', '512.37', '+1.12%', true],
  ['USD/EUR', '0.9214', '-0.08%', false],
]

/* ───────── pages ───────── */

function NewTab({ onSearch }: { onSearch: (q: string) => void }) {
  const { open } = useDesk()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('Discover')
  return (
    <div className="flex-1 overflow-y-auto relative" style={{ fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif' }} data-agent="edge-ntp">
      <div className="relative h-[560px]">
        <Hero />
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-center justify-between px-6 pt-4 text-white">
          <div className="flex items-center gap-2 text-[13px] bg-black/25 backdrop-blur rounded-full pl-2 pr-3 h-8">
            <CloudSun size={18} /> Boston <b>62°F</b>
          </div>
          <div className="flex items-center gap-1">
            <button aria-label="Apps" className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center"><LayoutGrid size={18} /></button>
            <button aria-label="Page settings" className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center"><Settings size={18} /></button>
            <Avatar id={ME.id} size={30} />
          </div>
        </div>
        <div className="relative flex flex-col items-center mt-[70px]">
          <div className="flex items-center gap-2 text-white mb-5">
            <img src={logoUrl('microsoft')} className="w-6 h-6" alt="" />
            <span className="text-[26px] font-semibold tracking-tight">Microsoft Bing</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (q.trim()) onSearch(q.trim())
            }}
            className="w-[640px] max-w-[90%] h-[48px] rounded-full bg-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex items-center px-5 gap-3"
          >
            <Search size={20} className="text-[#555]" />
            <input
              data-agent="edge-search"
              aria-label="Search the web"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the web"
              className="flex-1 outline-none bg-transparent text-[16px]"
              style={{ fontSize: 16 }}
            />
            <Mic size={19} className="text-[#555]" />
            <img src={logoUrl('edge')} className="w-6 h-6" alt="Copilot" />
          </form>
          <div className="flex gap-3 mt-8">
            {QUICK.map(([name, logo, app]) => (
              <button key={name} data-agent={`edge-quicklink-${logo}`} aria-label={name} onClick={() => app && open(app)} className="w-[86px] flex flex-col items-center gap-2 group">
                <span className="w-[56px] h-[56px] rounded-xl bg-white/85 backdrop-blur group-hover:bg-white flex items-center justify-center shadow">
                  <img src={logoUrl(logo)} className="w-8 h-8 object-contain" alt="" />
                </span>
                <span className="text-[12px] text-white drop-shadow truncate w-full text-center">{name}</span>
              </button>
            ))}
            <button aria-label="Add a site" className="w-[86px] flex flex-col items-center gap-2">
              <span className="w-[56px] h-[56px] rounded-xl bg-white/25 backdrop-blur flex items-center justify-center text-white"><Plus size={22} /></span>
              <span className="text-[12px] text-white drop-shadow">Add site</span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-3 right-5 text-[11px] text-white/85">Sunrise over Lake Louise, Banff National Park · © Getty Images</div>
      </div>
      {/* feed */}
      <div className="relative -mt-12 mx-auto max-w-[1180px] px-6 pb-10">
        <div className="h-12 rounded-t-xl bg-white/95 backdrop-blur flex items-center px-4 gap-1 text-[14px] shadow">
          {['Discover', 'Following', 'News', 'Money', 'Sports', 'Weather', 'Watch', 'Play'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 rounded-full ${tab === t ? 'bg-[#E8EEF7] text-[#0F6CBD] font-semibold' : 'hover:bg-black/5 text-[#333]'}`}>
              {t}
            </button>
          ))}
          <div className="flex-1" />
          <button className="h-8 px-3 rounded-full hover:bg-black/5 text-[13px] text-[#333]">Personalize</button>
        </div>
        <div className="bg-[#F5F5F5] rounded-b-xl p-4 grid grid-cols-4 gap-4">
          {/* lead story */}
          <article className="col-span-2 row-span-2 rounded-xl overflow-hidden bg-white shadow-sm relative">
            <div className="h-full min-h-[360px] relative">
              <div className="absolute inset-0"><Art kind={3} /></div>
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 to-transparent text-white">
                <div className="text-[12px] opacity-90 flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white/90 text-[#000] text-[9px] font-bold flex items-center justify-center">F</span> Forbes · 1h</div>
                <div className="text-[22px] font-semibold leading-tight mt-1">{FEED[2][0]}</div>
              </div>
            </div>
          </article>
          {/* weather */}
          <div className="rounded-xl bg-gradient-to-br from-[#4A90D9] to-[#2D6CB5] text-white p-4 shadow-sm">
            <div className="text-[13px] font-semibold flex items-center justify-between">Boston, MA <MoreHorizontal size={16} /></div>
            <div className="flex items-center gap-3 mt-3">
              <Sun size={40} className="text-[#FFD45C]" />
              <div className="text-[40px] font-light leading-none">62°</div>
              <div className="text-[12px] opacity-90">Mostly sunny<br />Feels like 60°</div>
            </div>
            <div className="flex justify-between mt-5 text-[12px] text-center">
              {[['Now', Sun, '62°'], ['4 PM', CloudSun, '61°'], ['5 PM', CloudSun, '59°'], ['6 PM', Cloud, '56°'], ['7 PM', Cloud, '54°']].map(([t, I, v]: any) => (
                <div key={t} className="flex flex-col items-center gap-1">
                  <span className="opacity-80">{t}</span>
                  <I size={18} />
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* markets */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-[13px] font-semibold flex items-center justify-between">Markets <span className="text-[11px] text-[#888] font-normal">Delayed</span></div>
            <div className="mt-2 space-y-2.5">
              {MARKETS.map(([n, v, c, up]) => (
                <div key={n} className="flex items-center text-[12.5px]">
                  <span className="w-[70px] font-semibold">{n}</span>
                  <svg width="50" height="16" className="mr-2"><path d={up ? 'M0 13 L10 11 L20 12 L30 7 L40 8 L50 3' : 'M0 4 L10 6 L20 5 L30 9 L40 8 L50 12'} stroke={up ? '#0E7A0D' : '#C42B1C'} strokeWidth="1.5" fill="none" /></svg>
                  <span className="flex-1 text-right">{v}</span>
                  <span className={`w-[58px] text-right ${up ? 'text-[#0E7A0D]' : 'text-[#C42B1C]'}`}>{c}</span>
                </div>
              ))}
            </div>
          </div>
          {FEED.filter((_, i) => i !== 2).map(([h, s, t, art], i) => (
            <article key={h} className="rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="h-[130px]"><Art kind={art} /></div>
              <div className="p-3">
                <div className="text-[11.5px] text-[#666] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-[#1F1F1F] text-white text-[9px] font-bold flex items-center justify-center">{s[0]}</span>
                  {s} · {t}
                </div>
                <div className="text-[14.5px] font-semibold leading-snug mt-1.5 line-clamp-3">{h}</div>
                <div className="text-[11.5px] text-[#888] mt-2">{120 + i * 37} reactions</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function host(u: string) {
  return u.replace(/^https?:\/\//, '').split('/')[0]
}

function results(q: string) {
  const enc = encodeURIComponent(q.replace(/\s+/g, '_'))
  const lq = q.toLowerCase()
  const base: [string, string, string][] = []
  if (/fabrikam/.test(lq))
    base.push(['Fabrikam Supplies | Facilities Management & Maintenance Services', 'https://www.fabrikam.com/services/facilities', 'Fabrikam Supplies delivers HVAC, janitorial, elevator and life-safety services for corporate campuses across North America. 24/7 service desk, SLA-backed response.'])
  if (/net ?30|payment terms|invoice/.test(lq))
    base.push(['Net 30: What It Means and How It Works — Investopedia', 'https://www.investopedia.com/terms/n/net30.asp', 'Net 30 is a credit term which indicates that payment is expected 30 days after the invoice date. Variations include Net 45 and 2/10 Net 30, which offers a discount for early payment.'])
  if (/northwind/.test(lq))
    base.push(['Northwind Global — Operations, Logistics & Supply Chain', 'https://www.northwind.com/', 'Northwind Global is a Boston-based operations and logistics company serving customers in 40 countries. Careers, investors, newsroom.'])
  base.push(
    [`${q} - Wikipedia`, `https://en.wikipedia.org/wiki/${enc}`, `${q.charAt(0).toUpperCase() + q.slice(1)} refers to a range of concepts. This article covers its history, key characteristics, and common uses in business and technology.`],
    [`What is ${q}? | Microsoft Learn`, `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(q)}`, `Learn how ${q} works across Microsoft 365, Azure and Windows. Step-by-step guidance, best practices and reference documentation.`],
    [`${q} — latest news and analysis`, `https://www.reuters.com/site-search/?query=${encodeURIComponent(q)}`, `Get the latest news, analysis and updates on ${q} from Reuters journalists around the world.`],
    [`Top questions about ${q} — Reddit`, `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`, `Community discussions, tips and first-hand experiences about ${q}. 1.2k comments.`],
    [`${q}: a complete guide for 2026 — Forbes Advisor`, 'https://www.forbes.com/advisor/', `Everything you need to know about ${q}, including costs, pros and cons, and how to choose the right option for your business.`],
  )
  return base
}

function Results({ query, onSearch, onHome }: { query: string; onSearch: (q: string) => void; onHome: () => void }) {
  const [q, setQ] = useState(query)
  useEffect(() => setQ(query), [query])
  const list = results(query)
  return (
    <div className="flex-1 overflow-y-auto bg-white" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }} data-agent="edge-results">
      <div className="px-8 pt-4 flex items-center gap-6 border-b border-[#ECECEC]">
        <button onClick={onHome} aria-label="Microsoft Bing home" className="flex items-center gap-1.5 shrink-0 mb-3">
          <svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 2l4 1.4v14.3l5.6-3.3-2.7-1.3-1.7-4.3 8.6 3v4.4L9 22l-4-2.2z" fill="#008373" /></svg>
          <span className="text-[20px] text-[#444] font-semibold">Microsoft Bing</span>
        </button>
        <form
          className="w-[640px] h-[44px] mb-3 rounded-full border border-[#DFE1E5] shadow-[0_1px_6px_rgba(32,33,36,0.15)] flex items-center px-4 gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) onSearch(q.trim())
          }}
        >
          <input data-agent="edge-results-search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 outline-none text-[16px]" style={{ fontSize: 16 }} />
          <Mic size={18} className="text-[#0F6CBD]" />
          <Search size={19} className="text-[#0F6CBD]" />
        </form>
        <div className="flex-1" />
        <Avatar id={ME.id} size={30} />
      </div>
      <div className="px-8 flex gap-6 text-[13px] text-[#444] border-b border-[#ECECEC] pl-[178px]">
        {[['Copilot', null], ['All', null], ['Images', ImageIcon], ['Videos', Video], ['Maps', MapPin], ['News', Newspaper], ['Shopping', ShoppingBag]].map(([l, I]: any) => (
          <button key={l} className={`h-10 flex items-center gap-1.5 ${l === 'All' ? 'text-[#111] border-b-[3px] border-[#0F6CBD] font-semibold' : 'hover:text-[#111]'}`}>
            {I && <I size={14} />} {l}
          </button>
        ))}
      </div>
      <div className="pl-[218px] pr-8 pt-3 flex gap-10">
        <div className="w-[640px]">
          <div className="text-[12.5px] text-[#666] mb-4">About {(1240000 + query.length * 91234).toLocaleString()} results</div>
          {list.map(([t, u, s], i) => (
            <div key={u} className="mb-7" data-agent={`edge-result-${i}`}>
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-[#F1F3F4] border border-[#E5E5E5] text-[11px] font-bold flex items-center justify-center text-[#444]">{site(u)[0]}</span>
                <div className="leading-tight">
                  <div className="text-[14px] text-[#222]">{site(u)}</div>
                  <div className="text-[12.5px] text-[#666] truncate max-w-[520px]">{u}</div>
                </div>
              </div>
              <a className="block text-[20px] text-[#1A0DAB] hover:underline mt-1.5 leading-snug cursor-pointer">{t}</a>
              <div className="text-[14px] text-[#4D5156] leading-[1.55] mt-1">{s}</div>
            </div>
          ))}
          <div className="flex items-center gap-2 text-[14px] text-[#1A0DAB] pb-10">
            <ChevronLeft size={16} className="text-[#ccc]" />
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`w-8 h-8 rounded-full flex items-center justify-center ${n === 1 ? 'bg-[#0F6CBD] text-white' : 'hover:bg-[#F1F3F4]'}`}>{n}</span>
            ))}
            <ChevronRight size={16} />
          </div>
        </div>
        <aside className="w-[360px] shrink-0">
          <div className="rounded-xl border border-[#E5E5E5] p-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              <img src={logoUrl('edge')} className="w-5 h-5" alt="" /> Copilot answer
            </div>
            <div className="text-[13.5px] text-[#333] leading-[1.6] mt-2">
              Here’s a quick summary of <b>{query}</b>: it’s commonly discussed in business operations and finance contexts. The top sources below explain the key terms, typical use cases, and current best practices.
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {list.slice(0, 3).map(([, u], i) => (
                <span key={u} className="h-7 px-2.5 rounded-full bg-[#F3F6FB] text-[12px] text-[#0F6CBD] flex items-center">{i + 1}. {host(u).replace('www.', '')}</span>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#E5E5E5] p-4">
            <div className="text-[14px] font-semibold mb-2">Related searches</div>
            {[`${query} meaning`, `${query} examples`, `${query} 2026`, `how does ${query} work`].map((r) => (
              <button key={r} onClick={() => onSearch(r)} className="w-full text-left flex items-center gap-2 h-9 text-[13.5px] text-[#1A0DAB] hover:underline">
                <Search size={14} className="text-[#666]" /> {r}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function Edge({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [query, setQuery] = useState<string | null>(params?.q ?? null)

  useEffect(() => {
    if (params?.q) setQuery(params.q)
  }, [win.nonce])

  useEffect(() => {
    if (query) {
      setUrl(`https://www.bing.com/search?q=${encodeURIComponent(query).replace(/%20/g, '+')}&form=QBLH`)
      setTitle(`${query} - Search`)
    } else {
      setUrl('https://www.bing.com/?form=NTPCHB')
      setTitle('New tab')
    }
  }, [query])

  return <div className="flex-1 min-h-0 flex flex-col bg-white">{query ? <Results query={query} onSearch={setQuery} onHome={() => setQuery(null)} /> : <NewTab onSearch={setQuery} />}</div>
}

function site(u: string) {
  const p = host(u).split('.')
  const n = p[p.length - 2] ?? p[0]
  return ({ wikipedia: 'Wikipedia', microsoft: 'Microsoft Learn', reddit: 'Reddit', reuters: 'Reuters', forbes: 'Forbes', investopedia: 'Investopedia' } as Record<string, string>)[n] ?? n.charAt(0).toUpperCase() + n.slice(1)
}
