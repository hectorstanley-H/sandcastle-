import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Mic, Settings, LayoutGrid, Plus, ChevronLeft, ChevronRight, Sun, CloudSun, Cloud, MoreHorizontal, Image as ImageIcon, Video, MapPin, Newspaper, ShoppingBag, Star, StarOff, History as HistoryIcon, Download, BookmarkPlus, FolderOpen, Trash2, X, ArrowRight, ZoomIn, Minus, Play, Gamepad2, FileText, Library, ExternalLink, Check, Copy, Share2 } from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { APPS, logoUrl } from '@/os/registry'
import { useDesk, useWin } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME, COMPANY } from '@/data/people'
import { db, uid, useCollection, useRecord } from '@/db/db'

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


const FEED_CAT: Record<string, number[]> = {
  News: [0, 1, 3, 4, 6, 7],
  Money: [0, 1, 5, 8],
  Watch: [2, 6, 3],
}
const SPORTS: [string, string, string, number][] = [
  ['Celtics hold off Knicks late to stay unbeaten at home', 'ESPN', '2h', 0],
  ['Bruins’ power play finds its rhythm in 4–1 win over Montreal', 'NHL.com', '5h', 0],
  ['Patriots rookie class earns early praise from coaching staff', 'Boston Globe', '7h', 0],
]
const TOPICS = ['Technology', 'Business', 'Supply chain', 'Finance', 'Boston', 'AI', 'Travel', 'Markets']
const GAMES = ['Microsoft Solitaire Collection', 'Microsoft Mahjong', 'Wordament', 'Microsoft Minesweeper']

const APP_SITES: [RegExp, string][] = [
  [/^outlook\.(office|live)\.com$/, 'outlook'],
  [/^teams\.microsoft\.com$/, 'teams'],
  [/(^|\.)slack\.com$/, 'slack'],
  [/(^|\.)zoom\.us$/, 'zoom'],
  [/^northwind\.atlassian\.net$/, 'jira'],
]
/** sites rendered inside Edge (search results, intranet) */
const KNOWN_SITES = /(wikipedia\.org|learn\.microsoft\.com|reuters\.com|reddit\.com|forbes\.com|investopedia\.com|fabrikam\.com|northwind\.com|northwind\.sharepoint\.com|msn\.com|myaccount\.microsoft\.com)$/

type Vertical = 'Copilot' | 'All' | 'Images' | 'Videos' | 'Maps' | 'News' | 'Shopping'
type EdgePage = 'history' | 'downloads' | 'favorites' | 'settings'
type Page =
  | { k: 'ntp' }
  | { k: 'search'; q: string; v: Vertical; p: number }
  | { k: 'site'; url: string; title?: string; snippet?: string }
  | { k: 'article'; i: number; sports?: boolean }
  | { k: 'edge'; name: EdgePage }
  | { k: 'error'; url: string }

const bingUrl = (q: string, extra = '') => `https://www.bing.com/search?q=${encodeURIComponent(q).replace(/%20/g, '+')}${extra}&form=QBLH`
const urlOf = (p: Page): string => {
  switch (p.k) {
    case 'ntp':
      return 'https://www.bing.com/?form=NTPCHB'
    case 'search':
      return p.v === 'All' && p.p === 1 ? bingUrl(p.q) : p.v === 'All' ? bingUrl(p.q, `&first=${(p.p - 1) * 10 + 1}`) : `https://www.bing.com/${p.v.toLowerCase()}/search?q=${encodeURIComponent(p.q).replace(/%20/g, '+')}&form=HDRSC2`
    case 'site':
      return p.url
    case 'article':
      return `https://www.msn.com/en-us/${p.sports ? 'sports' : 'news'}/ar-AA1${(p.i * 7919 + 4243).toString(36).toUpperCase()}`
    case 'edge':
      return `edge://${p.name}/`
    case 'error':
      return p.url
  }
}
const titleOf = (p: Page): string => {
  switch (p.k) {
    case 'ntp':
      return 'New tab'
    case 'search':
      return `${p.q} - Search${p.v !== 'All' ? ` ${p.v}` : ''}`
    case 'site':
      return p.title ?? siteTitle(p.url)
    case 'article':
      return (p.sports ? SPORTS[p.i]?.[0] : FEED[p.i]?.[0]) ?? 'MSN'
    case 'edge':
      return { history: 'History', downloads: 'Downloads', favorites: 'Favorites', settings: 'Settings' }[p.name]
    case 'error':
      return host(p.url)
  }
}
function siteTitle(u: string) {
  const h = host(u)
  if (h === 'northwind.sharepoint.com') return 'Northwind intranet - Home'
  if (h === 'www.fabrikam.com') return 'Fabrikam Supplies | Facilities Management & Maintenance Services'
  if (h === 'www.northwind.com') return 'Northwind Global — Operations, Logistics & Supply Chain'
  if (h === 'myaccount.microsoft.com') return 'My Account'
  return site(u)
}

/** text typed into the address bar / search box → where to go */
function resolveInput(raw: string): { page?: Page; app?: string } {
  const s = raw.trim()
  if (!s) return {}
  const em = /^edge:\/\/(history|downloads|favorites|settings)/i.exec(s)
  if (em) return { page: { k: 'edge', name: em[1].toLowerCase() as EdgePage } }
  const looksUrl = /^https?:\/\//i.test(s) || (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(s) && !/\s/.test(s))
  if (!looksUrl) return { page: { k: 'search', q: s, v: 'All', p: 1 } }
  const url = /^https?:\/\//i.test(s) ? s : `https://${s}`
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return { page: { k: 'search', q: s, v: 'All', p: 1 } }
  }
  const h = u.hostname.toLowerCase()
  if (/(^|\.)bing\.com$/.test(h)) {
    const q = u.searchParams.get('q')
    return { page: q ? { k: 'search', q, v: 'All', p: 1 } : { k: 'ntp' } }
  }
  if (h === 'northwind.atlassian.net' && u.pathname.startsWith('/wiki')) return { app: 'confluence' }
  for (const [re, app] of APP_SITES) if (re.test(h)) return { app }
  const reg = APPS.find((a) => a.id !== 'edge' && a.url && host(a.url) === h)
  if (reg) return { app: reg.id }
  const ar = /msn\.com\/en-us\/(news|sports)\/ar-AA1(\w+)/i.exec(url)
  if (ar) {
    const i = (parseInt(ar[2], 36) - 4243) / 7919
    const sports = ar[1].toLowerCase() === 'sports'
    if (Number.isInteger(i) && i >= 0 && i < (sports ? SPORTS.length : FEED.length)) return { page: { k: 'article', i, sports } }
  }
  if (KNOWN_SITES.test(h)) return { page: { k: 'site', url: u.href } }
  return { page: { k: 'error', url: u.href } }
}

/* ───────── shared bits ───────── */

function useEdgePrefs() {
  const r = useRecord('edge.prefs', 'prefs')
  const get = <T,>(k: string, d: T): T => (r && r[k] !== undefined ? (r[k] as T) : d)
  const set = (k: string, v: any) => db.upsert('edge.prefs', { id: 'prefs', [k]: v })
  return { get, set }
}

function Flyout({ title, children, onClose, right = 8, width = 360, actions }: { title: string; children: React.ReactNode; onClose: () => void; right?: number; width?: number; actions?: React.ReactNode }) {
  return (
    <div className="absolute top-1 z-40 rounded-lg bg-white border border-black/10 shadow-[0_8px_28px_rgba(0,0,0,0.22)] flex flex-col max-h-[70%] menu-open" style={{ right, width }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="h-11 shrink-0 flex items-center pl-4 pr-1.5 gap-1 border-b border-[#EDEDED]">
        <span className="flex-1 text-[14px] font-semibold">{title}</span>
        {actions}
        <button aria-label="Close" onClick={onClose} className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center text-[#444]"><X size={15} /></button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">{children}</div>
    </div>
  )
}
const Favicon = ({ url, size = 16 }: { url: string; size?: number }) => {
  if (url.startsWith('edge://')) return <Settings size={size - 2} className="text-[#555] shrink-0" />
  const h = host(url)
  const app = resolveInput(url).app
  if (app) return <img src={logoUrl(app)} className="shrink-0 object-contain" style={{ width: size, height: size }} alt="" />
  if (/bing\.com$/.test(h)) return <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0"><path d="M5 2l4 1.4v14.3l5.6-3.3-2.7-1.3-1.7-4.3 8.6 3v4.4L9 22l-4-2.2z" fill="#008373" /></svg>
  return <span className="rounded-full bg-[#E8EEF7] text-[#0F6CBD] font-bold flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.55 }}>{site(url)[0]}</span>
}

/* ───────── pages ───────── */

function NewTab({ onSearch, go, openArticle }: { onSearch: (q: string) => void; go: (input: string) => void; openArticle: (i: number, sports?: boolean) => void }) {
  const { open } = useDesk()
  const prefs = useEdgePrefs()
  const custom = useCollection('edge.quicklinks')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('Discover')
  const [menu, setMenu] = useState<null | 'apps' | 'settings' | 'add' | 'mic'>(null)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const showQuick = prefs.get('ntp-quicklinks', true)
  const showImage = prefs.get('ntp-image', true)
  const showFeed = prefs.get('ntp-feed', true)
  const following: string[] = prefs.get('ntp-topics', ['Technology', 'Supply chain'])
  useEffect(() => {
    if (menu !== 'mic') return
    const t = setTimeout(() => setMenu(null), 2600)
    return () => clearTimeout(t)
  }, [menu])

  const feedIdx = tab === 'Discover' || tab === 'Following' ? FEED.map((_, i) => i).filter((i) => i !== 2) : (FEED_CAT[tab] ?? []).filter((i) => i !== 2)
  const addSite = () => {
    const name = addName.trim()
    const url = addUrl.trim()
    if (!url) return
    db.insert('edge.quicklinks', { id: uid('ql'), name: name || site(/^https?:/.test(url) ? url : `https://${url}`), url: /^https?:/.test(url) ? url : `https://${url}` })
    setAddName('')
    setAddUrl('')
    setMenu(null)
  }
  return (
    <div className="flex-1 overflow-y-auto relative" style={{ fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif' }} data-agent="edge-ntp" onPointerDown={() => menu && menu !== 'add' && setMenu(null)}>
      <div className="relative h-[560px]">
        {showImage ? <Hero /> : <div className="absolute inset-0 bg-gradient-to-b from-[#E9EEF6] to-[#F7F7F7]" />}
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex items-center justify-between px-6 pt-4 text-white">
          <button onClick={() => onSearch('weather Boston MA')} className="flex items-center gap-2 text-[13px] bg-black/25 backdrop-blur rounded-full pl-2 pr-3 h-8 hover:bg-black/35">
            <CloudSun size={18} /> Boston <b>62°F</b>
          </button>
          <div className="flex items-center gap-1 relative" onPointerDown={(e) => e.stopPropagation()}>
            <button aria-label="Apps" data-agent="edge-ntp-apps" onClick={() => setMenu(menu === 'apps' ? null : 'apps')} className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center"><LayoutGrid size={18} /></button>
            <button aria-label="Page settings" data-agent="edge-ntp-settings" onClick={() => setMenu(menu === 'settings' ? null : 'settings')} className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center"><Settings size={18} /></button>
            <button aria-label="Profile" onClick={() => go('myaccount.microsoft.com')} className="rounded-full"><Avatar id={ME.id} size={30} /></button>
            {menu === 'apps' && (
              <div className="absolute right-10 top-11 z-30 w-[320px] rounded-xl bg-white text-[#1A1A1A] shadow-[0_8px_28px_rgba(0,0,0,0.25)] p-4 menu-open">
                <div className="text-[13px] font-semibold mb-3">Microsoft 365</div>
                <div className="grid grid-cols-4 gap-2">
                  {['outlook', 'teams', 'word', 'excel', 'powerpoint', 'explorer', 'powerbi', 'calculator'].map((id) => {
                    const a = APPS.find((x) => x.id === id)
                    if (!a) return null
                    return (
                      <button key={id} data-agent={`edge-ntp-app-${id}`} onClick={() => { setMenu(null); open(id) }} className="flex flex-col items-center gap-1.5 py-2 rounded-lg hover:bg-black/5">
                        <img src={a.icon} className="w-8 h-8 object-contain" alt="" />
                        <span className="text-[11.5px] truncate w-full text-center">{a.name.replace('File Explorer', 'OneDrive')}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {menu === 'settings' && (
              <div className="absolute right-0 top-11 z-30 w-[300px] rounded-xl bg-white text-[#1A1A1A] shadow-[0_8px_28px_rgba(0,0,0,0.25)] p-4 menu-open text-[13px]">
                <div className="text-[14px] font-semibold mb-3">Page settings</div>
                {([['ntp-quicklinks', 'Quick links', showQuick], ['ntp-image', 'Background image', showImage], ['ntp-feed', 'Show content', showFeed]] as [string, string, boolean][]).map(([k, l, v]) => (
                  <label key={k} className="flex items-center justify-between h-9">
                    {l}
                    <button role="switch" aria-checked={v} data-agent={`edge-${k}`} onClick={() => prefs.set(k, !v)} className={`relative w-10 h-5 rounded-full border ${v ? 'bg-[#0F6CBD] border-[#0F6CBD]' : 'border-[#666]'}`}>
                      <span className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${v ? 'left-[22px] bg-white' : 'left-[3px] bg-[#666]'}`} />
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="relative flex flex-col items-center mt-[70px]">
          <div className={`flex items-center gap-2 mb-5 ${showImage ? 'text-white' : 'text-[#1A1A1A]'}`}>
            <img src={logoUrl('microsoft')} className="w-6 h-6" alt="" />
            <span className="text-[26px] font-semibold tracking-tight">Microsoft Bing</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (q.trim()) go(q.trim())
            }}
            className="relative w-[640px] max-w-[90%] h-[48px] rounded-full bg-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex items-center px-5 gap-3"
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
            <button type="button" aria-label="Search using voice" onClick={() => setMenu('mic')} className="text-[#555] hover:text-[#0F6CBD]"><Mic size={19} /></button>
            <button type="button" aria-label="Copilot" onClick={() => q.trim() ? onSearch(q.trim()) : go('https://www.bing.com/search?q=Copilot')}><img src={logoUrl('edge')} className="w-6 h-6" alt="Copilot" /></button>
            {menu === 'mic' && (
              <div className="absolute left-0 right-0 top-[56px] rounded-2xl bg-white shadow-lg p-5 flex items-center gap-4 text-[14px] text-[#333]">
                <span className="w-10 h-10 rounded-full bg-[#0F6CBD] text-white flex items-center justify-center animate-pulse"><Mic size={20} /></span>
                Listening… microphone access is blocked by your organization’s policy.
              </div>
            )}
          </form>
          {showQuick && (
            <div className="flex gap-3 mt-8 flex-wrap justify-center max-w-[900px]">
              {QUICK.map(([name, logo, app]) => (
                <button key={name} data-agent={`edge-quicklink-${logo}`} aria-label={name} onClick={() => (app ? open(app) : go('https://northwind.sharepoint.com/sites/intranet'))} className="w-[86px] flex flex-col items-center gap-2 group">
                  <span className="w-[56px] h-[56px] rounded-xl bg-white/85 backdrop-blur group-hover:bg-white flex items-center justify-center shadow">
                    <img src={logoUrl(logo)} className="w-8 h-8 object-contain" alt="" />
                  </span>
                  <span className="text-[12px] text-white drop-shadow truncate w-full text-center">{name}</span>
                </button>
              ))}
              {custom.map((c) => (
                <div key={c.id} className="relative w-[86px] group">
                  <button data-agent={`edge-quicklink-${c.id}`} aria-label={c.name} onClick={() => go(c.url)} className="w-full flex flex-col items-center gap-2">
                    <span className="w-[56px] h-[56px] rounded-xl bg-white/85 backdrop-blur group-hover:bg-white flex items-center justify-center shadow"><Favicon url={c.url} size={30} /></span>
                    <span className="text-[12px] text-white drop-shadow truncate w-full text-center">{c.name}</span>
                  </button>
                  <button aria-label={`Remove ${c.name}`} onClick={() => db.remove('edge.quicklinks', c.id)} className="absolute -top-1 right-2 w-5 h-5 rounded-full bg-white text-[#444] shadow hidden group-hover:flex items-center justify-center"><X size={11} /></button>
                </div>
              ))}
              <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
                <button aria-label="Add a site" data-agent="edge-add-site" onClick={() => setMenu(menu === 'add' ? null : 'add')} className="w-[86px] flex flex-col items-center gap-2">
                  <span className="w-[56px] h-[56px] rounded-xl bg-white/25 backdrop-blur flex items-center justify-center text-white"><Plus size={22} /></span>
                  <span className="text-[12px] text-white drop-shadow">Add site</span>
                </button>
                {menu === 'add' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-[90px] z-30 w-[320px] rounded-xl bg-white text-[#1A1A1A] shadow-[0_8px_28px_rgba(0,0,0,0.25)] p-4 text-[13px] menu-open">
                    <div className="text-[14px] font-semibold mb-3">Add site</div>
                    <label className="block mb-2">Name<input autoFocus data-agent="edge-add-site-name" value={addName} onChange={(e) => setAddName(e.target.value)} className="mt-1 w-full h-8 px-2 rounded border border-[#D0D0D0] outline-none focus:border-[#0F6CBD]" style={{ fontSize: 13 }} /></label>
                    <label className="block">URL<input data-agent="edge-add-site-url" value={addUrl} onChange={(e) => setAddUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSite()} className="mt-1 w-full h-8 px-2 rounded border border-[#D0D0D0] outline-none focus:border-[#0F6CBD]" style={{ fontSize: 13 }} /></label>
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => setMenu(null)} className="h-8 px-4 rounded border border-[#D0D0D0] hover:bg-black/5">Cancel</button>
                      <button data-agent="edge-add-site-save" disabled={!addUrl.trim()} onClick={addSite} className="h-8 px-4 rounded bg-[#0F6CBD] text-white disabled:opacity-50">Add</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {showImage && <div className="absolute bottom-3 right-5 text-[11px] text-white/85">Sunrise over Lake Louise, Banff National Park · © Getty Images</div>}
      </div>
      {/* feed */}
      {showFeed && (
        <div className="relative -mt-12 mx-auto max-w-[1180px] px-6 pb-10">
          <div className="h-12 rounded-t-xl bg-white/95 backdrop-blur flex items-center px-4 gap-1 text-[14px] shadow">
            {['Discover', 'Following', 'News', 'Money', 'Sports', 'Weather', 'Watch', 'Play'].map((t) => (
              <button key={t} data-agent={`edge-feed-${t.toLowerCase()}`} onClick={() => setTab(t)} className={`h-8 px-3 rounded-full ${tab === t ? 'bg-[#E8EEF7] text-[#0F6CBD] font-semibold' : 'hover:bg-black/5 text-[#333]'}`}>
                {t}
              </button>
            ))}
            <div className="flex-1" />
            <button data-agent="edge-personalize" onClick={() => setTab('Following')} className="h-8 px-3 rounded-full hover:bg-black/5 text-[13px] text-[#333]">Personalize</button>
          </div>
          <div className="bg-[#F5F5F5] rounded-b-xl p-4 grid grid-cols-4 gap-4">
            {tab === 'Following' && (
              <div className="col-span-4 rounded-xl bg-white p-4 shadow-sm">
                <div className="text-[14px] font-semibold mb-2">Your interests</div>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((t) => {
                    const on = following.includes(t)
                    return (
                      <button key={t} data-agent={`edge-topic-${t.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => prefs.set('ntp-topics', on ? following.filter((x) => x !== t) : [...following, t])} className={`h-8 px-3 rounded-full border text-[13px] flex items-center gap-1.5 ${on ? 'bg-[#0F6CBD] border-[#0F6CBD] text-white' : 'border-[#D0D0D0] hover:bg-black/5'}`}>
                        {on ? <Check size={13} /> : <Plus size={13} />} {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {tab === 'Sports' &&
              SPORTS.map(([h, s, t], i) => (
                <article key={h} role="link" onClick={() => openArticle(i, true)} className="col-span-2 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4">
                  <div className="text-[11.5px] text-[#666]">{s} · {t}</div>
                  <div className="text-[16px] font-semibold leading-snug mt-1.5">{h}</div>
                </article>
              ))}
            {tab === 'Play' &&
              GAMES.map((g) => (
                <article key={g} role="link" onClick={() => go(`https://www.msn.com/en-us/play/${g.toLowerCase().replace(/\s+/g, '-')}`)} className="rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md cursor-pointer">
                  <div className="h-[110px] bg-gradient-to-br from-[#107C10] to-[#0B5A0B] flex items-center justify-center text-white"><Gamepad2 size={40} /></div>
                  <div className="p-3 text-[14px] font-semibold">{g}</div>
                </article>
              ))}
            {(tab === 'Discover' || tab === 'News' || tab === 'Following') && (
              <article role="link" onClick={() => openArticle(2)} className="col-span-2 row-span-2 rounded-xl overflow-hidden bg-white shadow-sm relative cursor-pointer">
                <div className="h-full min-h-[360px] relative">
                  <div className="absolute inset-0"><Art kind={3} /></div>
                  <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 to-transparent text-white">
                    <div className="text-[12px] opacity-90 flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white/90 text-[#000] text-[9px] font-bold flex items-center justify-center">F</span> Forbes · 1h</div>
                    <div className="text-[22px] font-semibold leading-tight mt-1">{FEED[2][0]}</div>
                  </div>
                </div>
              </article>
            )}
            {(tab === 'Discover' || tab === 'Weather') && (
              <div role="button" onClick={() => onSearch('weather Boston MA')} className={`${tab === 'Weather' ? 'col-span-4' : ''} rounded-xl bg-gradient-to-br from-[#4A90D9] to-[#2D6CB5] text-white p-4 shadow-sm cursor-pointer`}>
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
            )}
            {(tab === 'Discover' || tab === 'Money') && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="text-[13px] font-semibold flex items-center justify-between">Markets <span className="text-[11px] text-[#888] font-normal">Delayed</span></div>
                <div className="mt-2 space-y-2.5">
                  {MARKETS.map(([n, v, c, up]) => (
                    <div key={n} role="button" onClick={() => onSearch(`${n} stock`)} className="flex items-center text-[12.5px] cursor-pointer hover:bg-black/[0.03] rounded">
                      <span className="w-[70px] font-semibold">{n}</span>
                      <svg width="50" height="16" className="mr-2"><path d={up ? 'M0 13 L10 11 L20 12 L30 7 L40 8 L50 3' : 'M0 4 L10 6 L20 5 L30 9 L40 8 L50 12'} stroke={up ? '#0E7A0D' : '#C42B1C'} strokeWidth="1.5" fill="none" /></svg>
                      <span className="flex-1 text-right">{v}</span>
                      <span className={`w-[58px] text-right ${up ? 'text-[#0E7A0D]' : 'text-[#C42B1C]'}`}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab !== 'Sports' && tab !== 'Play' && tab !== 'Weather' &&
              feedIdx.map((fi, i) => {
                const [h, s, t, art] = FEED[fi]
                return (
                  <article key={h} role="link" onClick={() => openArticle(fi)} className="rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="h-[130px] relative">
                      <Art kind={art} />
                      {tab === 'Watch' && <span className="absolute inset-0 flex items-center justify-center"><span className="w-12 h-12 rounded-full bg-black/55 text-white flex items-center justify-center"><Play size={20} /></span></span>}
                    </div>
                    <div className="p-3">
                      <div className="text-[11.5px] text-[#666] flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-[#1F1F1F] text-white text-[9px] font-bold flex items-center justify-center">{s[0]}</span>
                        {s} · {t}
                      </div>
                      <div className="text-[14.5px] font-semibold leading-snug mt-1.5 line-clamp-3">{h}</div>
                      <div className="text-[11.5px] text-[#888] mt-2">{120 + i * 37} reactions</div>
                    </div>
                  </article>
                )
              })}
          </div>
        </div>
      )}
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
/** later result pages: same sources, different angles */
function resultsPage(q: string, p: number): [string, string, string][] {
  if (p === 1) return results(q)
  const angles = ['examples', 'best practices', 'vs alternatives', 'explained', 'checklist', 'FAQ', 'template', 'case study']
  const sites = ['https://learn.microsoft.com/en-us/search/?terms=', 'https://en.wikipedia.org/wiki/', 'https://www.forbes.com/advisor/', 'https://www.reddit.com/search/?q=', 'https://www.reuters.com/site-search/?query=']
  return Array.from({ length: 6 }).map((_, i) => {
    const a = angles[(i + p * 3) % angles.length]
    const s = sites[(i + p) % sites.length]
    const t = `${q} ${a}`
    return [`${t.charAt(0).toUpperCase() + t.slice(1)} — ${site(s)}`, s + encodeURIComponent(t), `A practical look at ${q} ${a}: what it means in day-to-day operations, common pitfalls and what teams in 2026 are doing differently.`] as [string, string, string]
  })
}

function Results({ query, vertical, pageNo, onSearch, onHome, nav, openSite }: { query: string; vertical: Vertical; pageNo: number; onSearch: (q: string) => void; onHome: () => void; nav: (p: Page) => void; openSite: (url: string, title?: string, snippet?: string) => void }) {
  const [q, setQ] = useState(query)
  useEffect(() => setQ(query), [query])
  const list = resultsPage(query, pageNo)
  const v = vertical
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
          {q && <button type="button" aria-label="Clear" onClick={() => setQ('')} className="text-[#666] hover:text-[#111]"><X size={16} /></button>}
          <Mic size={18} className="text-[#0F6CBD]" />
          <button type="submit" aria-label="Search"><Search size={19} className="text-[#0F6CBD]" /></button>
        </form>
        <div className="flex-1" />
        <Avatar id={ME.id} size={30} />
      </div>
      <div className="px-8 flex gap-6 text-[13px] text-[#444] border-b border-[#ECECEC] pl-[178px]">
        {[['Copilot', null], ['All', null], ['Images', ImageIcon], ['Videos', Video], ['Maps', MapPin], ['News', Newspaper], ['Shopping', ShoppingBag]].map(([l, I]: any) => (
          <button key={l} data-agent={`edge-vertical-${l.toLowerCase()}`} onClick={() => nav({ k: 'search', q: query, v: l, p: 1 })} className={`h-10 flex items-center gap-1.5 ${l === v ? 'text-[#111] border-b-[3px] border-[#0F6CBD] font-semibold' : 'hover:text-[#111]'}`}>
            {I && <I size={14} />} {l}
          </button>
        ))}
      </div>
      {v === 'All' && (
        <div className="pl-[218px] pr-8 pt-3 flex gap-10">
          <div className="w-[640px]">
            <div className="text-[12.5px] text-[#666] mb-4">{pageNo > 1 ? `Page ${pageNo} of ` : 'About '}{(1240000 + query.length * 91234).toLocaleString()} results</div>
            {list.map(([t, u, s], i) => (
              <div key={u + i} className="mb-7" data-agent={`edge-result-${i}`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#F1F3F4] border border-[#E5E5E5] text-[11px] font-bold flex items-center justify-center text-[#444]">{site(u)[0]}</span>
                  <div className="leading-tight">
                    <div className="text-[14px] text-[#222]">{site(u)}</div>
                    <div className="text-[12.5px] text-[#666] truncate max-w-[520px]">{u}</div>
                  </div>
                </div>
                <a onClick={() => openSite(u, t, s)} className="block text-[20px] text-[#1A0DAB] hover:underline mt-1.5 leading-snug cursor-pointer">{t}</a>
                <div className="text-[14px] text-[#4D5156] leading-[1.55] mt-1">{s}</div>
              </div>
            ))}
            <div className="flex items-center gap-2 text-[14px] text-[#1A0DAB] pb-10">
              <button aria-label="Previous page" disabled={pageNo === 1} onClick={() => nav({ k: 'search', q: query, v: 'All', p: pageNo - 1 })} className="disabled:text-[#ccc]"><ChevronLeft size={16} /></button>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} data-agent={`edge-results-page-${n}`} onClick={() => nav({ k: 'search', q: query, v: 'All', p: n })} className={`w-8 h-8 rounded-full flex items-center justify-center ${n === pageNo ? 'bg-[#0F6CBD] text-white' : 'hover:bg-[#F1F3F4]'}`}>{n}</button>
              ))}
              <button aria-label="Next page" disabled={pageNo === 5} onClick={() => nav({ k: 'search', q: query, v: 'All', p: pageNo + 1 })} className="disabled:text-[#ccc]"><ChevronRight size={16} /></button>
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
                {list.slice(0, 3).map(([t, u, s], i) => (
                  <button key={u + i} onClick={() => openSite(u, t, s)} className="h-7 px-2.5 rounded-full bg-[#F3F6FB] hover:bg-[#E6EEF9] text-[12px] text-[#0F6CBD] flex items-center">{i + 1}. {host(u).replace('www.', '')}</button>
                ))}
              </div>
              <button onClick={() => nav({ k: 'search', q: query, v: 'Copilot', p: 1 })} className="mt-3 text-[13px] text-[#0F6CBD] hover:underline">Ask Copilot a follow-up</button>
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
      )}
      {v === 'Copilot' && <CopilotChat query={query} openSite={openSite} />}
      {v === 'Images' && (
        <div className="px-8 py-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <button key={i} onClick={() => openSite(`https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`, `${query} - Wikipedia`)} className="h-[150px] rounded-lg overflow-hidden relative group">
              <Art kind={i} />
              <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[11.5px] text-white bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 text-left truncate">{query} · image {i + 1}</span>
            </button>
          ))}
        </div>
      )}
      {v === 'Videos' && (
        <div className="px-8 py-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {['explained in 5 minutes', 'for beginners', 'tutorial', 'webinar recording', 'case study', 'panel discussion'].map((s, i) => (
            <button key={s} onClick={() => openSite('https://learn.microsoft.com/en-us/search/?terms=' + encodeURIComponent(query), `${query} ${s}`)} className="text-left">
              <div className="h-[158px] rounded-lg overflow-hidden relative">
                <Art kind={i + 1} />
                <span className="absolute inset-0 flex items-center justify-center"><span className="w-12 h-12 rounded-full bg-black/55 text-white flex items-center justify-center"><Play size={20} /></span></span>
                <span className="absolute right-2 bottom-2 px-1.5 rounded bg-black/75 text-white text-[11px]">{4 + i * 3}:{String((i * 17) % 60).padStart(2, '0')}</span>
              </div>
              <div className="text-[14px] font-semibold mt-2 leading-snug">{query} {s}</div>
              <div className="text-[12px] text-[#666]">Microsoft Learn · {(12 + i * 7).toLocaleString()}K views</div>
            </button>
          ))}
        </div>
      )}
      {v === 'News' && (
        <div className="pl-[218px] pr-8 py-4 w-[860px]">
          {FEED.slice(0, 6).map(([h, s, t, art], i) => (
            <div key={h} role="link" onClick={() => nav({ k: 'article', i })} className="flex gap-4 mb-5 cursor-pointer group">
              <div className="flex-1">
                <div className="text-[12px] text-[#666]">{s} · {t}</div>
                <div className="text-[17px] text-[#1A0DAB] group-hover:underline leading-snug mt-0.5">{h}</div>
                <div className="text-[13px] text-[#4D5156] mt-1">Coverage related to “{query}” — {i + 2} sources</div>
              </div>
              <div className="w-[140px] h-[88px] rounded-lg overflow-hidden shrink-0"><Art kind={art} /></div>
            </div>
          ))}
        </div>
      )}
      {v === 'Maps' && (
        <div className="px-8 py-4">
          <div className="h-[420px] rounded-xl overflow-hidden relative border border-[#E5E5E5]" style={{ background: 'linear-gradient(135deg,#E8F0E2 0%,#DCE9F5 60%,#C7DDF0 100%)' }}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 420" preserveAspectRatio="none">
              <path d="M0 300 C200 260 260 330 420 280 S700 200 800 230" stroke="#FFFFFF" strokeWidth="10" fill="none" />
              <path d="M150 0 L220 420 M520 0 L460 420 M0 120 L800 160" stroke="#FFFFFF" strokeWidth="6" fill="none" />
              <path d="M600 0 C640 120 700 160 800 180 L800 0z" fill="#A9CBEA" />
            </svg>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
              <span className="px-2 py-1 rounded bg-white shadow text-[12px] font-semibold mb-1">{query}</span>
              <MapPin size={30} className="text-[#C42B1C]" fill="#C42B1C" stroke="#fff" />
            </div>
          </div>
          <div className="text-[13px] text-[#666] mt-2">Map data © 2026 TomTom · Showing results near Boston, MA</div>
        </div>
      )}
      {v === 'Shopping' && (
        <div className="px-8 py-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {['Standard', 'Pro', 'Business', 'Enterprise', 'Starter kit', 'Bundle'].map((s, i) => (
            <button key={s} onClick={() => openSite('https://www.forbes.com/advisor/', `${query} ${s} — reviews`)} className="text-left rounded-xl border border-[#E5E5E5] overflow-hidden hover:shadow-md">
              <div className="h-[130px]"><Art kind={i + 2} /></div>
              <div className="p-3">
                <div className="text-[13.5px] font-semibold leading-snug">{query} — {s}</div>
                <div className="text-[15px] font-semibold mt-1">${(49 + i * 37).toFixed(2)}</div>
                <div className="text-[12px] text-[#666]">{['Contoso Store', 'Adatum Direct', 'Litware Shop'][i % 3]} · Free shipping</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CopilotChat({ query, openSite }: { query: string; openSite: (url: string, title?: string, snippet?: string) => void }) {
  const [msgs, setMsgs] = useState<{ me: boolean; text: string }[]>(() => [
    { me: true, text: query },
    { me: false, text: `Here’s what I found about “${query}”. In short, it’s a topic that comes up often in operations and finance teams — the sources below cover definitions, typical use cases and current best practices. Want me to go deeper on any part?` },
  ])
  const [v, setV] = useState('')
  const send = () => {
    const t = v.trim()
    if (!t) return
    setMsgs((m) => [...m, { me: true, text: t }, { me: false, text: `Good question. Based on the top sources for “${query}”, ${t.toLowerCase().includes('example') ? 'common examples include vendor payment terms, approval workflows and month-end close checklists.' : 'the key consideration is consistency: document the policy, automate the routine steps, and review exceptions weekly.'}` }])
    setV('')
  }
  const src = results(query).slice(0, 3)
  return (
    <div className="max-w-[760px] mx-auto py-6 px-6">
      {msgs.map((m, i) => (
        <div key={i} className={`mb-4 flex ${m.me ? 'justify-end' : ''}`}>
          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-[1.6] ${m.me ? 'bg-[#0F6CBD] text-white' : 'bg-[#F3F6FB] text-[#222]'}`}>
            {m.text}
            {!m.me && i === 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {src.map(([t, u, s], j) => (
                  <button key={u} onClick={() => openSite(u, t, s)} className="h-7 px-2.5 rounded-full bg-white text-[12px] text-[#0F6CBD] border border-[#DCE6F5]">{j + 1}. {host(u).replace('www.', '')}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="mt-6 h-12 rounded-full border border-[#DFE1E5] flex items-center px-4 gap-3 shadow-sm">
        <input data-agent="edge-copilot-input" value={v} onChange={(e) => setV(e.target.value)} placeholder="Ask me anything…" className="flex-1 outline-none text-[14px]" style={{ fontSize: 14 }} />
        <button type="submit" aria-label="Send" className="text-[#0F6CBD]"><ArrowRight size={18} /></button>
      </form>
    </div>
  )
}

function SitePage({ url, title, snippet, go, download }: { url: string; title?: string; snippet?: string; go: (input: string) => void; download: (name: string, url: string, size: string) => void }) {
  const { open } = useDesk()
  const h = host(url)
  const t = title ?? siteTitle(url)
  if (h === 'northwind.sharepoint.com') {
    return (
      <div className="flex-1 overflow-y-auto bg-[#FAF9F8]" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }} data-agent="edge-site">
        <div className="h-12 bg-[#03787C] text-white flex items-center px-6 gap-3 text-[14px]"><img src={logoUrl('sharepoint')} className="w-6 h-6" alt="" /> <b>SharePoint</b> <span className="opacity-80">Northwind intranet</span></div>
        <div className="max-w-[1100px] mx-auto px-6 py-8">
          <div className="text-[30px] font-semibold">Good afternoon, {ME.first}</div>
          <div className="grid grid-cols-3 gap-5 mt-6">
            <div className="col-span-2 rounded-lg bg-white shadow-sm p-5">
              <div className="text-[16px] font-semibold mb-3">News</div>
              {['Ops review moves to Thursday 2 PM — agenda in Teams', 'Milan & Rotterdam rollout: wave 1 complete', 'New expense policy for client dinners takes effect Dec 1', 'H-Worker now handles AP invoice intake end to end'].map((n, i) => (
                <div key={n} className="flex gap-3 py-3 border-b border-[#EDEBE9] last:border-0">
                  <div className="w-[120px] h-[68px] rounded overflow-hidden shrink-0"><Art kind={i + 1} /></div>
                  <div><div className="text-[14px] font-semibold">{n}</div><div className="text-[12px] text-[#605E5C] mt-1">Northwind Communications · {i + 1}d ago</div></div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white shadow-sm p-5">
              <div className="text-[16px] font-semibold mb-3">Quick links</div>
              {([['IT Service Portal', 'servicenow'], ['Expenses', 'concur'], ['HR & payroll', 'workday'], ['Team wiki', 'confluence']] as const).map(([l, app]) => (
                <button key={l} onClick={() => open(app)} className="w-full h-10 flex items-center gap-3 px-2 rounded hover:bg-[#F3F2F1] text-[14px] text-left"><img src={logoUrl(app)} className="w-5 h-5" alt="" /> {l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (h === 'myaccount.microsoft.com') {
    return (
      <div className="flex-1 overflow-y-auto bg-[#F3F2F1]" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }} data-agent="edge-site">
        <div className="max-w-[900px] mx-auto py-10 px-6">
          <div className="rounded-lg bg-white shadow-sm p-6 flex items-center gap-5">
            <Avatar id={ME.id} size={72} />
            <div><div className="text-[22px] font-semibold">{ME.name}</div><div className="text-[14px] text-[#605E5C]">{ME.email} · {COMPANY.name}</div></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {['Security info', 'Devices', 'Password', 'Organizations', 'Settings & Privacy', 'My sign-ins'].map((c) => (
              <div key={c} className="rounded-lg bg-white shadow-sm p-5"><div className="text-[15px] font-semibold">{c}</div><div className="text-[12.5px] text-[#605E5C] mt-1">Managed by {COMPANY.name}</div></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (/\/play\//.test(url)) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0B5A0B] text-white flex flex-col items-center justify-center gap-4" data-agent="edge-site">
        <Gamepad2 size={64} />
        <div className="text-[26px] font-semibold">{GAMES.find((g) => url.includes(g.toLowerCase().replace(/\s+/g, '-'))) ?? 'Microsoft Casual Games'}</div>
        <div className="text-[14px] opacity-85">Games are blocked on this device by your organization’s web content policy.</div>
      </div>
    )
  }
  const sname = site(url)
  const brand = ({ Wikipedia: '#202122', 'Microsoft Learn': '#0F6CBD', Reuters: '#FA6400', Reddit: '#FF4500', Forbes: '#000000', Investopedia: '#1C3D5A', Fabrikam: '#7A2E8E', Northwind: '#0F3D6E' } as Record<string, string>)[sname] ?? '#333'
  const topic = t.replace(/\s+[-—|].*$/, '')
  const paras = [
    snippet ?? `${topic} — an overview from ${sname}.`,
    `${topic} matters most where teams handle volume: accounts payable, procurement and operations. Organizations that standardize the process typically see fewer exceptions, faster cycle times and cleaner audit trails.`,
    `In practice, the work breaks down into a few steps: capture the information, validate it against a source of truth, route exceptions to the right owner, and record the outcome. Automation helps most in the validation and routing steps.`,
    `Looking ahead to 2026, ${sname} expects more teams to move routine steps to software agents while keeping people in the loop for approvals and edge cases.`,
  ]
  return (
    <div className="flex-1 overflow-y-auto bg-white" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }} data-agent="edge-site">
      <div className="h-14 flex items-center px-8 gap-6 text-white" style={{ background: brand, fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
        <span className="text-[20px] font-bold tracking-tight">{sname}</span>
        {['Home', 'Topics', 'Guides', 'About'].map((n) => (
          <button key={n} onClick={() => go(`https://${h}/`)} className="text-[13px] opacity-85 hover:opacity-100">{n}</button>
        ))}
      </div>
      <article className="max-w-[760px] mx-auto px-6 py-10">
        <h1 className="text-[34px] leading-tight font-bold text-[#111]">{t}</h1>
        <div className="text-[13px] text-[#666] mt-2" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>{sname} · Updated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · 6 min read</div>
        <div className="h-[260px] rounded-lg overflow-hidden mt-6"><Art kind={t.length} /></div>
        {paras.map((p, i) => (
          <p key={i} className="text-[17px] leading-[1.75] text-[#222] mt-5">{p}</p>
        ))}
        {sname === 'Investopedia' && (
          <div className="mt-8 rounded-lg border border-[#D6E2EE] bg-[#F4F8FC] p-5 flex items-center gap-4" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
            <FileText size={28} className="text-[#C42B1C]" />
            <div className="flex-1"><div className="text-[15px] font-semibold">Payment terms cheat sheet (PDF)</div><div className="text-[12.5px] text-[#555]">Net 30, Net 45, 2/10 Net 30 and EOM explained · 214 KB</div></div>
            <button data-agent="edge-download-pdf" onClick={() => download('Payment_Terms_Cheat_Sheet.pdf', 'https://www.investopedia.com/files/payment-terms-cheat-sheet.pdf', '214 KB')} className="h-9 px-4 rounded bg-[#1C3D5A] text-white text-[13px] flex items-center gap-2"><Download size={15} /> Download</button>
          </div>
        )}
        {sname === 'Fabrikam' && (
          <div className="mt-8 rounded-lg border border-[#E4D6EA] bg-[#FAF5FC] p-5" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
            <div className="text-[15px] font-semibold">Accounts receivable</div>
            <div className="text-[13px] text-[#555] mt-1">Mike Harrington · mike.harrington@fabrikam.com · +1 (214) 555-0188</div>
            <button onClick={() => download('Fabrikam_W-9_2026.pdf', 'https://www.fabrikam.com/files/w9-2026.pdf', '96 KB')} className="mt-3 h-9 px-4 rounded bg-[#7A2E8E] text-white text-[13px] flex items-center gap-2"><Download size={15} /> Download W-9 (PDF)</button>
          </div>
        )}
      </article>
    </div>
  )
}

function ArticlePage({ i, sports, onSearch }: { i: number; sports?: boolean; onSearch: (q: string) => void }) {
  const [h, s, t, art] = sports ? SPORTS[i] : FEED[i]
  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F7]" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }} data-agent="edge-article">
      <div className="h-12 bg-white border-b border-[#E5E5E5] flex items-center px-6 gap-2 text-[14px]"><img src={logoUrl('microsoft')} className="w-5 h-5" alt="" /> <b>msn</b></div>
      <article className="max-w-[760px] mx-auto bg-white my-6 rounded-xl shadow-sm p-8">
        <div className="text-[13px] text-[#666] flex items-center gap-2"><span className="w-5 h-5 rounded bg-[#1F1F1F] text-white text-[10px] font-bold flex items-center justify-center">{s[0]}</span>{s} · {t} ago</div>
        <h1 className="text-[30px] font-semibold leading-tight mt-2">{h}</h1>
        <div className="h-[300px] rounded-lg overflow-hidden mt-5"><Art kind={art} /></div>
        {[
          `${h}. The development caps a busy week and is being watched closely by analysts and operators alike.`,
          `“We’re seeing the same pattern across the board,” one industry executive said, adding that companies are planning for steady demand into the first quarter.`,
          `Observers note that the shift has practical implications for budgets, staffing and technology roadmaps heading into 2026.`,
        ].map((p, j) => <p key={j} className="text-[16px] leading-[1.75] text-[#222] mt-5">{p}</p>)}
        <div className="mt-8 flex gap-2 flex-wrap">
          {h.split(' ').filter((w) => w.length > 6).slice(0, 3).map((w) => (
            <button key={w} onClick={() => onSearch(w.replace(/[^\w-]/g, ''))} className="h-8 px-3 rounded-full bg-[#F1F3F4] hover:bg-[#E5E7EA] text-[13px]">{w.replace(/[^\w-]/g, '')}</button>
          ))}
        </div>
      </article>
    </div>
  )
}

function ErrorPage({ url, retry }: { url: string; retry: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto bg-white flex items-start justify-center pt-24" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }} data-agent="edge-error">
      <div className="max-w-[560px] px-6">
        <svg width="72" height="72" viewBox="0 0 72 72"><rect x="6" y="14" width="60" height="44" rx="6" fill="#E8EEF7" /><path d="M24 30l8 8M32 30l-8 8M40 30l8 8M48 30l-8 8" stroke="#5B7DB1" strokeWidth="3" strokeLinecap="round" /><path d="M26 50c6-5 14-5 20 0" stroke="#5B7DB1" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
        <div className="text-[26px] font-semibold mt-4">Hmmm… can’t reach this page</div>
        <div className="text-[15px] text-[#444] mt-3">Check if there is a typo in <b>{host(url)}</b>.</div>
        <div className="text-[14px] text-[#444] mt-4">If spelling is correct, try running Windows Network Diagnostics. Some sites are blocked by your organization’s web proxy.</div>
        <div className="text-[12px] text-[#888] mt-3">DNS_PROBE_FINISHED_NXDOMAIN</div>
        <button onClick={retry} className="mt-6 h-9 px-5 rounded bg-[#0F6CBD] text-white text-[14px]">Refresh</button>
      </div>
    </div>
  )
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function InternalPage({ name, go, nav }: { name: EdgePage; go: (input: string) => void; nav: (p: Page) => void }) {
  const history = useCollection('edge.history')
  const downloads = useCollection('edge.downloads')
  const favs = useCollection('edge.favorites')
  const prefs = useEdgePrefs()
  const { open } = useDesk()
  const [q, setQ] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const side: [EdgePage, string, any][] = [
    ['history', 'History', HistoryIcon],
    ['downloads', 'Downloads', Download],
    ['favorites', 'Favorites', Star],
    ['settings', 'Settings', Settings],
  ]
  const ql = q.toLowerCase()
  let body: React.ReactNode = null
  if (name === 'history') {
    const list = history.filter((h) => !q || h.title.toLowerCase().includes(ql) || h.url.toLowerCase().includes(ql))
    const groups: Record<string, typeof list> = {}
    for (const h of list) (groups[dayLabel(h.at)] ??= []).push(h)
    body = (
      <>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[22px] font-semibold flex-1">History</div>
          {confirmClear ? (
            <span className="flex items-center gap-2 text-[13px]">Clear all browsing history?
              <button data-agent="edge-history-clear-yes" onClick={() => { history.forEach((h) => db.remove('edge.history', h.id)); setConfirmClear(false) }} className="h-8 px-3 rounded bg-[#C42B1C] text-white">Clear now</button>
              <button onClick={() => setConfirmClear(false)} className="h-8 px-3 rounded border border-[#D0D0D0]">Cancel</button>
            </span>
          ) : (
            <button data-agent="edge-history-clear" disabled={!history.length} onClick={() => setConfirmClear(true)} className="h-8 px-3 rounded border border-[#D0D0D0] text-[13px] hover:bg-black/5 disabled:opacity-40">Clear browsing data</button>
          )}
        </div>
        {!list.length && <div className="text-[14px] text-[#666] mt-10 text-center">{q ? 'No results found' : 'Pages you visit will show up here'}</div>}
        {Object.entries(groups).map(([d, items]) => (
          <div key={d} className="mb-5">
            <div className="text-[13px] font-semibold text-[#444] mb-1">{d}</div>
            <div className="rounded-lg bg-white border border-[#E5E5E5]">
              {items.map((h) => (
                <div key={h.id} className="group h-11 flex items-center gap-3 px-3 border-b border-[#F0F0F0] last:border-0 hover:bg-[#F7F7F7]">
                  <span className="w-[64px] text-[12px] text-[#666]">{new Date(h.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  <Favicon url={h.url} />
                  <button onClick={() => go(h.url)} className="flex-1 min-w-0 text-left text-[13.5px] truncate hover:underline">{h.title}</button>
                  <span className="text-[12px] text-[#888] truncate max-w-[200px]">{host(h.url)}</span>
                  <button aria-label="Delete" onClick={() => db.remove('edge.history', h.id)} className="w-7 h-7 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 flex items-center justify-center"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    )
  } else if (name === 'downloads') {
    const list = downloads.filter((d) => !q || d.name.toLowerCase().includes(ql))
    body = (
      <>
        <div className="text-[22px] font-semibold mb-4">Downloads</div>
        {!list.length && <div className="text-[14px] text-[#666] mt-10 text-center">{q ? 'No results found' : 'There are no downloads to show'}</div>}
        <div className="space-y-2">
          {list.map((d) => {
            const f = db.find('files', d.fileId)
            return (
              <div key={d.id} className="rounded-lg bg-white border border-[#E5E5E5] p-3 flex items-center gap-3">
                <FileText size={28} className="text-[#C42B1C]" />
                <div className="flex-1 min-w-0">
                  <button onClick={() => f && open('acrobat', { file: f.name })} disabled={!f} className="text-[14px] font-semibold hover:underline disabled:no-underline disabled:text-[#888] truncate block text-left">{d.name}</button>
                  <div className="text-[12px] text-[#666] truncate">{f ? `${d.size} · ${host(d.url)}` : 'Deleted'} · {dayLabel(d.at)}</div>
                </div>
                {f && <button data-agent={`edge-download-show-${d.id}`} onClick={() => open('explorer', { path: f.folder, select: f.id })} className="h-8 px-3 rounded border border-[#D0D0D0] text-[13px] hover:bg-black/5">Show in folder</button>}
                <button aria-label="Remove from list" onClick={() => db.remove('edge.downloads', d.id)} className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center"><X size={15} /></button>
              </div>
            )
          })}
        </div>
      </>
    )
  } else if (name === 'favorites') {
    const list = favs.filter((f) => !q || f.title.toLowerCase().includes(ql) || f.url.toLowerCase().includes(ql))
    body = (
      <>
        <div className="text-[22px] font-semibold mb-4">Favorites</div>
        {!list.length && <div className="text-[14px] text-[#666] mt-10 text-center">No favorites yet</div>}
        <div className="rounded-lg bg-white border border-[#E5E5E5]">
          {list.map((f) => (
            <div key={f.id} className="group h-11 flex items-center gap-3 px-3 border-b border-[#F0F0F0] last:border-0 hover:bg-[#F7F7F7]">
              <Favicon url={f.url} />
              <button onClick={() => go(f.url)} className="flex-1 min-w-0 text-left text-[13.5px] truncate hover:underline">{f.title}</button>
              <button onClick={() => db.update('edge.favorites', f.id, { bar: !f.bar })} className="text-[12px] text-[#0F6CBD] opacity-0 group-hover:opacity-100 hover:underline">{f.bar ? 'Remove from bar' : 'Show on bar'}</button>
              <button aria-label="Delete" onClick={() => db.remove('edge.favorites', f.id)} className="w-7 h-7 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 flex items-center justify-center"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </>
    )
  } else {
    const Row = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
      <div className="min-h-[56px] flex items-center gap-4 px-4 py-2 border-b border-[#F0F0F0] last:border-0">
        <div className="flex-1"><div className="text-[14px]">{title}</div>{sub && <div className="text-[12px] text-[#666]">{sub}</div>}</div>
        {children}
      </div>
    )
    const Sel = ({ k, d, options }: { k: string; d: string; options: string[] }) => (
      <select data-agent={`edge-setting-${k}`} value={prefs.get(k, d)} onChange={(e) => prefs.set(k, e.target.value)} className="h-8 px-2 rounded border border-[#D0D0D0] text-[13px] outline-none" style={{ fontSize: 13 }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    )
    const Sw = ({ k, d }: { k: string; d: boolean }) => {
      const v = prefs.get(k, d)
      return (
        <button role="switch" aria-checked={v} data-agent={`edge-setting-${k}`} onClick={() => prefs.set(k, !v)} className={`relative w-10 h-5 rounded-full border ${v ? 'bg-[#0F6CBD] border-[#0F6CBD]' : 'border-[#666]'}`}>
          <span className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${v ? 'left-[22px] bg-white' : 'left-[3px] bg-[#666]'}`} />
        </button>
      )
    }
    body = (
      <>
        <div className="text-[22px] font-semibold mb-4">Settings</div>
        <div className="text-[15px] font-semibold mb-2">Profiles</div>
        <div className="rounded-lg bg-white border border-[#E5E5E5] p-4 flex items-center gap-4 mb-5">
          <Avatar id={ME.id} size={48} />
          <div className="flex-1"><div className="text-[15px] font-semibold">{ME.name}</div><div className="text-[13px] text-[#666]">{ME.email} · Sync is on · Managed by {COMPANY.name}</div></div>
        </div>
        <div className="text-[15px] font-semibold mb-2">Appearance</div>
        <div className="rounded-lg bg-white border border-[#E5E5E5] mb-5">
          <Row title="Page zoom"><Sel k="zoom" d="100%" options={['50%', '67%', '75%', '80%', '90%', '100%', '110%', '125%', '150%', '175%', '200%']} /></Row>
          <Row title="Show favorites bar"><Sel k="favbar" d="Never" options={['Always', 'Never', 'Only on new tabs']} /></Row>
        </div>
        <div className="text-[15px] font-semibold mb-2">Privacy, search, and services</div>
        <div className="rounded-lg bg-white border border-[#E5E5E5] mb-5">
          <Row title="Tracking prevention" sub="Websites use trackers to collect info about your browsing"><Sel k="tracking" d="Balanced" options={['Basic', 'Balanced', 'Strict']} /></Row>
          <Row title="Send “Do Not Track” requests"><Sw k="dnt" d={false} /></Row>
          <Row title="Search engine used in the address bar" sub="Managed by your organization"><span className="text-[13px] text-[#666]">Bing</span></Row>
        </div>
        <div className="text-[15px] font-semibold mb-2">Downloads</div>
        <div className="rounded-lg bg-white border border-[#E5E5E5] mb-5">
          <Row title="Location" sub="C:\Users\alex.morgan\Downloads"><button onClick={() => open('explorer', { path: 'Downloads' })} className="h-8 px-3 rounded border border-[#D0D0D0] text-[13px] hover:bg-black/5">Open folder</button></Row>
          <Row title="Show downloads menu when a download starts"><Sw k="dl-flyout" d={true} /></Row>
        </div>
        <div className="text-[15px] font-semibold mb-2">About Microsoft Edge</div>
        <div className="rounded-lg bg-white border border-[#E5E5E5] p-4 text-[13px] text-[#444]">Version 142.0.3595.53 (Official build) (arm64) · Microsoft Edge is up to date. · Your browser is managed by your organization</div>
      </>
    )
  }
  return (
    <div className="flex-1 min-h-0 flex bg-[#F7F7F7]" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }} data-agent={`edge-page-${name}`}>
      <div className="w-[240px] shrink-0 py-4 px-2">
        {side.map(([id, l, I]) => (
          <button key={id} data-agent={`edge-side-${id}`} onClick={() => nav({ k: 'edge', name: id })} className={`relative w-full h-9 flex items-center gap-3 px-3 rounded text-[14px] ${name === id ? 'bg-black/[0.06] font-semibold' : 'hover:bg-black/[0.04]'}`}>
            {name === id && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#0F6CBD]" />}
            <I size={16} /> {l}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto py-5 pr-10 pl-4">
        <div className="max-w-[860px]">
          {name !== 'settings' && (
            <div className="mb-4 w-[360px] h-9 flex items-center gap-2 px-3 rounded-full bg-white border border-[#E0E0E0]">
              <Search size={15} className="text-[#666]" />
              <input data-agent={`edge-${name}-search`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${name}`} className="flex-1 outline-none text-[13.5px] bg-transparent" style={{ fontSize: 13.5 }} />
            </div>
          )}
          {body}
        </div>
      </div>
    </div>
  )
}

/* ───────── browser shell ───────── */

const ZOOMS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200]

export default function Edge({ win, params }: AppProps) {
  const { setUrl, setTitle, close } = useWin()
  const { open, isAgent } = useDesk()
  const prefs = useEdgePrefs()
  const favs = useCollection('edge.favorites')
  const initial: Page = params?.q ? { k: 'search', q: params.q, v: 'All', p: 1 } : (params?.url && resolveInput(params.url).page) || { k: 'ntp' }
  const [nav, setNav] = useState<{ stack: Page[]; i: number }>({ stack: [initial], i: 0 })
  const [rev, setRev] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fly, setFly] = useState<null | 'favorites' | 'collections' | 'more' | 'downloads' | 'tabs'>(null)
  const [omni, setOmni] = useState<null | { left: number; top: number; width: number }>(null)
  const [omniVal, setOmniVal] = useState('')
  const [zoom, setZoom] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const page = nav.stack[nav.i]
  const url = urlOf(page)
  const defZoom = parseInt(prefs.get('zoom', '100%')) || 100
  const z = zoom ?? defZoom
  const isFav = favs.some((f) => f.url === url)

  const record = (p: Page) => {
    if (isAgent || p.k === 'ntp') return
    db.insert('edge.history', { id: uid('eh'), title: titleOf(p), url: urlOf(p), at: new Date().toISOString() }, { prepend: true })
  }
  const push = (p: Page) => {
    setNav((n) => ({ stack: [...n.stack.slice(0, n.i + 1), p], i: n.i + 1 }))
    record(p)
    setFly(null)
    setOmni(null)
    setLoading(true)
    setTimeout(() => setLoading(false), 350)
  }
  const goInput = (input: string) => {
    const r = resolveInput(input)
    if (r.app) {
      setOmni(null)
      return open(r.app)
    }
    if (r.page) push(r.page)
  }
  const search = (q: string) => push({ k: 'search', q, v: 'All', p: 1 })
  const back = () => nav.i > 0 && setNav((n) => ({ ...n, i: Math.max(0, n.i - 1) }))
  const forward = () => nav.i < nav.stack.length - 1 && setNav((n) => ({ ...n, i: Math.min(n.stack.length - 1, n.i + 1) }))
  const refresh = () => {
    setRev((r) => r + 1)
    setLoading(true)
    setTimeout(() => setLoading(false), 450)
  }
  const toggleFav = () => {
    const f = favs.find((x) => x.url === url)
    if (f) db.remove('edge.favorites', f.id)
    else db.insert('edge.favorites', { id: uid('fav'), title: titleOf(page), url, bar: false })
  }
  const download = (name: string, src: string, size: string) => {
    const taken = new Set(db.get('files').filter((f) => f.folder === 'Downloads').map((f) => f.name.toLowerCase()))
    let n = name
    for (let i = 1; taken.has(n.toLowerCase()); i++) n = name.replace(/(\.[^.]+)$/, ` (${i})$1`)
    const fileId = uid('f')
    db.insert('files', { id: fileId, name: n, folder: 'Downloads', kind: 'pdf', size, modified: new Date().toISOString(), open: { appId: 'acrobat', params: { file: n } }, createdBy: isAgent ? 'hworker' : undefined })
    db.insert('edge.downloads', { id: uid('dl'), name: n, url: src, size, at: new Date().toISOString(), fileId }, { prepend: true })
    if (prefs.get('dl-flyout', true)) setFly('downloads')
  }
  const zoomBy = (d: 1 | -1) => {
    const i = ZOOMS.indexOf(z)
    setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 5 : i) + d))])
  }

  // deep link: {q} (search) or {url} — the first one is already the initial page
  const firstNonce = useRef(win.nonce)
  useEffect(() => {
    if (win.nonce === firstNonce.current) return
    if (params?.q) push({ k: 'search', q: params.q, v: 'All', p: 1 })
    else if (params?.url) goInput(params.url)
  }, [win.nonce])

  useEffect(() => {
    if (nav.i === 0 && nav.stack.length === 1) record(page)
  }, [])

  useEffect(() => {
    setUrl(url)
    setTitle(titleOf(page))
  }, [url, page])

  /* ── wire up the browser chrome (back/forward/refresh/new tab/favorites/…) of this Edge window ── */
  const act = useRef<Record<string, (e: MouseEvent) => void>>({})
  act.current = {
    Back: () => back(),
    Forward: () => forward(),
    Refresh: () => refresh(),
    'New tab': () => push({ k: 'ntp' }),
    Favorites: () => setFly((f) => (f === 'favorites' ? null : 'favorites')),
    Collections: () => setFly((f) => (f === 'collections' ? null : 'collections')),
    'Settings and more': () => setFly((f) => (f === 'more' ? null : 'more')),
    'Tab actions': () => setFly((f) => (f === 'tabs' ? null : 'tabs')),
    address: (e) => {
      const root = rootRef.current
      const addr = e.currentTarget as unknown as HTMLElement
      if (!root || !addr) return
      const svgs = addr.querySelectorAll(':scope > svg')
      const star = svgs[svgs.length - 1]
      if (star && (e.target as Element).closest('svg') === star) return toggleFav()
      const rr = root.getBoundingClientRect()
      const ar = addr.getBoundingClientRect()
      const s = rr.width / root.offsetWidth || 1
      setOmni({ left: (ar.left - rr.left) / s, top: (ar.top - rr.top) / s, width: ar.width / s })
      setOmniVal(page.k === 'ntp' ? '' : page.k === 'search' ? page.q : url)
      setFly(null)
    },
  }
  useEffect(() => {
    const root = rootRef.current
    const w = root?.closest('[data-win]') as HTMLElement | null
    if (!root || !w) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (root.contains(t)) return
      const b = t.closest('button[aria-label]') as HTMLElement | null
      if (b && w.contains(b)) {
        const fn = act.current[b.getAttribute('aria-label') ?? '']
        if (fn) fn(e)
        return
      }
      const backBtn = Array.from(w.querySelectorAll<HTMLElement>('button[aria-label="Back"]')).find((x) => !root.contains(x))
      const addr = backBtn?.parentElement?.querySelector<HTMLElement>(':scope > div.flex-1')
      if (addr && addr.contains(t)) act.current.address({ ...e, target: t, currentTarget: addr } as any)
    }
    w.addEventListener('click', onClick)
    return () => w.removeEventListener('click', onClick)
  }, [])
  // reflect back/forward availability on the chrome buttons
  useEffect(() => {
    const root = rootRef.current
    const w = root?.closest('[data-win]') as HTMLElement | null
    if (!root || !w) return
    const find = (l: string) => Array.from(w.querySelectorAll<HTMLElement>(`button[aria-label="${l}"]`)).find((x) => !root.contains(x))
    const b = find('Back')
    const f = find('Forward')
    if (b) b.style.opacity = nav.i > 0 ? '' : '0.4'
    if (f) f.style.opacity = nav.i < nav.stack.length - 1 ? '1' : ''
  }, [nav])

  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    const tag = (e.target as HTMLElement).tagName
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    let handled = true
    if (e.altKey && e.key === 'ArrowLeft') back()
    else if (e.altKey && e.key === 'ArrowRight') forward()
    else if (e.key === 'F5' || (mod && k === 'r')) refresh()
    else if (mod && k === 't') push({ k: 'ntp' })
    else if (mod && k === 'h') push({ k: 'edge', name: 'history' })
    else if (mod && k === 'j') push({ k: 'edge', name: 'downloads' })
    else if (mod && e.shiftKey && k === 'o') push({ k: 'edge', name: 'favorites' })
    else if (mod && k === 'd') toggleFav()
    else if (mod && (e.key === '=' || e.key === '+')) zoomBy(1)
    else if (mod && e.key === '-') zoomBy(-1)
    else if (mod && e.key === '0') setZoom(null)
    else if (mod && k === 'w') close()
    else if ((mod && k === 'l') || e.key === 'F6' || (e.altKey && k === 'd')) {
      const root = rootRef.current
      setOmni({ left: 120, top: -40, width: Math.max(300, (root?.offsetWidth ?? 900) - 300) })
      setOmniVal(page.k === 'search' ? page.q : page.k === 'ntp' ? '' : url)
    } else if (e.key === 'Backspace' && !typing) back()
    else handled = false
    if (handled) e.preventDefault()
  }

  const suggestions = useMemo(() => {
    if (!omni) return []
    const v = omniVal.trim().toLowerCase()
    const hist = db.get('edge.history')
    const seen = new Set<string>()
    const out: { label: string; sub: string; input: string; kind: 'fav' | 'hist' | 'search' | 'app' }[] = []
    if (v) out.push({ label: omniVal.trim(), sub: resolveInput(omniVal).page?.k === 'search' ? '— Bing search' : '', input: omniVal.trim(), kind: 'search' })
    for (const a of APPS) if (v && a.url && !a.hidden && a.id !== 'edge' && (a.name.toLowerCase().includes(v) || host(a.url).includes(v))) out.push({ label: a.name, sub: host(a.url), input: a.url, kind: 'app' })
    for (const f of favs) if (!v || f.title.toLowerCase().includes(v) || f.url.toLowerCase().includes(v)) if (!seen.has(f.url)) (seen.add(f.url), out.push({ label: f.title, sub: f.url, input: f.url, kind: 'fav' }))
    for (const h of hist) if (v && (h.title.toLowerCase().includes(v) || h.url.toLowerCase().includes(v)) && !seen.has(h.url)) (seen.add(h.url), out.push({ label: h.title, sub: h.url, input: h.url, kind: 'hist' }))
    return out.slice(0, 8)
  }, [omni, omniVal, favs])

  const barMode = prefs.get<string>('favbar', 'Never')
  const showBar = barMode === 'Always' || (barMode === 'Only on new tabs' && page.k === 'ntp')
  const downloads = useCollection('edge.downloads')
  const collections = useCollection('edge.collections')
  const [newColl, setNewColl] = useState('')

  let body: React.ReactNode
  switch (page.k) {
    case 'ntp':
      body = <NewTab onSearch={search} go={goInput} openArticle={(i, sports) => push({ k: 'article', i, sports })} />
      break
    case 'search':
      body = <Results query={page.q} vertical={page.v} pageNo={page.p} onSearch={search} onHome={() => push({ k: 'ntp' })} nav={push} openSite={(u, t, s) => { const r = resolveInput(u); r.page?.k === 'site' ? push({ k: 'site', url: u, title: t, snippet: s }) : goInput(u) }} />
      break
    case 'site':
      body = <SitePage url={page.url} title={page.title} snippet={page.snippet} go={goInput} download={download} />
      break
    case 'article':
      body = <ArticlePage i={page.i} sports={page.sports} onSearch={search} />
      break
    case 'edge':
      body = <InternalPage name={page.name} go={goInput} nav={push} />
      break
    case 'error':
      body = <ErrorPage url={page.url} retry={refresh} />
      break
  }

  const menuItem = 'w-full h-9 flex items-center gap-3 px-4 text-[13px] hover:bg-black/5 text-left'
  return (
    <div ref={rootRef} tabIndex={-1} onKeyDown={onKey} onPointerDown={() => { setFly(null); setOmni(null) }} className="flex-1 min-h-0 flex flex-col bg-white relative outline-none">
      {loading && <div className="absolute top-0 left-0 h-[2px] bg-[#0F6CBD] z-30 animate-[pulse_0.4s_ease-in-out_infinite]" style={{ width: '70%' }} />}
      {showBar && (
        <div className="h-8 shrink-0 flex items-center gap-1 px-2 bg-[#F7F7F7] border-b border-[#E5E5E5] text-[12px]" data-agent="edge-favbar">
          {favs.filter((f) => f.bar).map((f) => (
            <button key={f.id} onClick={() => goInput(f.url)} className="h-6 px-2 rounded flex items-center gap-1.5 hover:bg-black/5 max-w-[180px]"><Favicon url={f.url} size={14} /><span className="truncate">{f.title}</span></button>
          ))}
        </div>
      )}
      <div key={rev} className="flex-1 min-h-0 flex flex-col" style={z !== 100 ? ({ zoom: z / 100 } as React.CSSProperties) : undefined}>
        {body}
      </div>
      {z !== defZoom && (
        <button onClick={() => setZoom(null)} className="absolute right-3 bottom-3 z-30 h-8 px-3 rounded-full bg-white shadow-lg border border-black/10 text-[12px] flex items-center gap-2"><ZoomIn size={14} /> {z}% · Reset</button>
      )}

      {/* address bar (omnibox) */}
      {omni && (
        <div className="absolute z-50 rounded-xl bg-white shadow-[0_8px_28px_rgba(0,0,0,0.25)] border border-black/10 overflow-hidden" style={{ left: omni.left, top: omni.top - 2, width: omni.width }} onPointerDown={(e) => e.stopPropagation()}>
          <form onSubmit={(e) => { e.preventDefault(); goInput(omniVal) }} className="h-[34px] flex items-center px-3 gap-2 border-b border-[#EEE]">
            <Search size={14} className="text-[#666]" />
            <input autoFocus data-agent="edge-address-input" value={omniVal} onChange={(e) => setOmniVal(e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Escape' && setOmni(null)} placeholder="Search or enter web address" className="flex-1 outline-none text-[13px]" style={{ fontSize: 13 }} />
          </form>
          {suggestions.map((s, i) => (
            <button key={i} data-agent={`edge-suggestion-${i}`} onClick={() => goInput(s.input)} className="w-full h-9 flex items-center gap-3 px-3 text-left hover:bg-[#F3F6FB] text-[13px]">
              {s.kind === 'search' ? <Search size={14} className="text-[#666]" /> : s.kind === 'fav' ? <Star size={14} className="text-[#666]" /> : s.kind === 'hist' ? <HistoryIcon size={14} className="text-[#666]" /> : <Favicon url={s.input} size={14} />}
              <span className="truncate">{s.label}</span>
              <span className="text-[#888] truncate">{s.sub}</span>
            </button>
          ))}
        </div>
      )}

      {/* flyouts anchored under the toolbar buttons */}
      {fly === 'favorites' && (
        <Flyout title="Favorites" onClose={() => setFly(null)} right={90} actions={<button data-agent="edge-fav-toggle" onClick={toggleFav} title={isFav ? 'Remove this page from favorites' : 'Add this page to favorites'} className="h-8 px-2 rounded hover:bg-black/5 flex items-center gap-1.5 text-[12.5px]">{isFav ? <StarOff size={15} /> : <BookmarkPlus size={15} />} {isFav ? 'Remove' : 'Add this page'}</button>}>
          {favs.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-[#666]">No favorites yet. Add this page with Ctrl+D.</div>}
          {favs.map((f) => (
            <div key={f.id} className="group flex items-center">
              <button data-agent={`edge-fav-${f.id}`} onClick={() => goInput(f.url)} className={`${menuItem} flex-1 min-w-0`}><Favicon url={f.url} /> <span className="truncate">{f.title}</span></button>
              <button aria-label={`Delete ${f.title}`} onClick={() => db.remove('edge.favorites', f.id)} className="w-8 h-8 mr-2 rounded hover:bg-black/5 hidden group-hover:flex items-center justify-center"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="h-px bg-[#EEE] my-1" />
          <label className={menuItem}>
            <input type="checkbox" checked={barMode === 'Always'} onChange={() => prefs.set('favbar', barMode === 'Always' ? 'Never' : 'Always')} /> Show favorites bar
          </label>
          <button onClick={() => push({ k: 'edge', name: 'favorites' })} className={menuItem}><FolderOpen size={15} /> Open favorites page</button>
        </Flyout>
      )}
      {fly === 'collections' && (
        <Flyout title="Collections" onClose={() => setFly(null)} right={56}>
          <form onSubmit={(e) => { e.preventDefault(); if (newColl.trim()) { db.insert('edge.collections', { id: uid('col'), name: newColl.trim(), items: [] }); setNewColl('') } }} className="px-3 py-2 flex gap-2">
            <input data-agent="edge-collection-name" value={newColl} onChange={(e) => setNewColl(e.target.value)} placeholder="Start new collection" className="flex-1 h-8 px-2 rounded border border-[#D0D0D0] outline-none text-[13px]" style={{ fontSize: 13 }} />
            <button type="submit" disabled={!newColl.trim()} className="h-8 px-3 rounded bg-[#0F6CBD] text-white text-[13px] disabled:opacity-40">Create</button>
          </form>
          {collections.length === 0 && <div className="px-4 py-4 text-center text-[13px] text-[#666]">Collect ideas from across the web and keep them organized.</div>}
          {collections.map((c) => (
            <div key={c.id} className="px-3 py-2 border-t border-[#F0F0F0]">
              <div className="flex items-center gap-2">
                <Library size={15} />
                <span className="flex-1 text-[13.5px] font-semibold truncate">{c.name}</span>
                <button data-agent={`edge-collection-add-${c.id}`} disabled={page.k === 'ntp' || (c.items ?? []).some((i: any) => i.url === url)} onClick={() => db.update('edge.collections', c.id, { items: [...(c.items ?? []), { title: titleOf(page), url }] })} className="text-[12px] text-[#0F6CBD] hover:underline disabled:text-[#999] disabled:no-underline">+ Add current page</button>
                <button aria-label={`Delete ${c.name}`} onClick={() => db.remove('edge.collections', c.id)} className="w-7 h-7 rounded hover:bg-black/5 flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
              {(c.items ?? []).map((i: any, j: number) => (
                <button key={j} onClick={() => goInput(i.url)} className="w-full h-8 flex items-center gap-2 pl-6 text-[12.5px] hover:bg-black/5 rounded text-left"><Favicon url={i.url} size={14} /><span className="truncate">{i.title}</span></button>
              ))}
            </div>
          ))}
        </Flyout>
      )}
      {fly === 'downloads' && (
        <Flyout title="Downloads" onClose={() => setFly(null)} right={56} actions={<button onClick={() => push({ k: 'edge', name: 'downloads' })} title="Open downloads page" className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center"><ExternalLink size={14} /></button>}>
          {downloads.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-[#666]">No recent downloads</div>}
          {downloads.slice(0, 6).map((d) => {
            const f = db.find('files', d.fileId)
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-2 hover:bg-black/[0.03]">
                <FileText size={22} className="text-[#C42B1C]" />
                <button onClick={() => f && open('acrobat', { file: f.name })} className="flex-1 min-w-0 text-left">
                  <div className="text-[13px] font-semibold truncate">{d.name}</div>
                  <div className="text-[11.5px] text-[#666]">{f ? `${d.size} · Done` : 'Deleted'}</div>
                </button>
                {f && <button aria-label="Show in folder" title="Show in folder" onClick={() => open('explorer', { path: f.folder, select: f.id })} className="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center"><FolderOpen size={15} /></button>}
              </div>
            )
          })}
        </Flyout>
      )}
      {fly === 'tabs' && (
        <div className="absolute left-2 top-1 z-40 w-[260px] py-1 rounded-lg bg-white border border-black/10 shadow-[0_8px_28px_rgba(0,0,0,0.22)] menu-open" onPointerDown={(e) => e.stopPropagation()}>
          <div className="px-4 pt-2 pb-1 text-[12px] font-semibold text-[#666]">Recently closed &amp; history</div>
          {db.get('edge.history').slice(0, 6).map((h) => (
            <button key={h.id} onClick={() => goInput(h.url)} className={menuItem}><Favicon url={h.url} /> <span className="truncate">{h.title}</span></button>
          ))}
          <div className="h-px bg-[#EEE] my-1" />
          <button onClick={() => push({ k: 'edge', name: 'history' })} className={menuItem}><HistoryIcon size={15} /> Show full history</button>
        </div>
      )}
      {fly === 'more' && (
        <div className="absolute right-12 top-1 z-40 w-[300px] py-1 rounded-lg bg-white border border-black/10 shadow-[0_8px_28px_rgba(0,0,0,0.22)] menu-open" onPointerDown={(e) => e.stopPropagation()}>
          <button data-agent="edge-more-newtab" onClick={() => push({ k: 'ntp' })} className={menuItem}><Plus size={15} /> <span className="flex-1">New tab</span><span className="text-[11.5px] text-[#888]">Ctrl+T</span></button>
          <div className="h-px bg-[#EEE] my-1" />
          <div className="h-9 flex items-center gap-3 px-4 text-[13px]">
            <ZoomIn size={15} /> <span className="flex-1">Zoom</span>
            <button aria-label="Zoom out" onClick={() => zoomBy(-1)} className="w-7 h-7 rounded hover:bg-black/5 flex items-center justify-center"><Minus size={14} /></button>
            <span className="w-11 text-center" data-agent="edge-zoom-value">{z}%</span>
            <button aria-label="Zoom in" onClick={() => zoomBy(1)} className="w-7 h-7 rounded hover:bg-black/5 flex items-center justify-center"><Plus size={14} /></button>
          </div>
          <div className="h-px bg-[#EEE] my-1" />
          <button data-agent="edge-more-favorites" onClick={() => setFly('favorites')} className={menuItem}><Star size={15} /> <span className="flex-1">Favorites</span><span className="text-[11.5px] text-[#888]">Ctrl+Shift+O</span></button>
          <button data-agent="edge-more-history" onClick={() => push({ k: 'edge', name: 'history' })} className={menuItem}><HistoryIcon size={15} /> <span className="flex-1">History</span><span className="text-[11.5px] text-[#888]">Ctrl+H</span></button>
          <button data-agent="edge-more-downloads" onClick={() => push({ k: 'edge', name: 'downloads' })} className={menuItem}><Download size={15} /> <span className="flex-1">Downloads</span><span className="text-[11.5px] text-[#888]">Ctrl+J</span></button>
          <button onClick={() => setFly('collections')} className={menuItem}><Library size={15} /> Collections</button>
          <div className="h-px bg-[#EEE] my-1" />
          <button onClick={() => { setFly(null); navigator.clipboard?.writeText(url).catch(() => {}) }} className={menuItem}><Copy size={15} /> Copy link</button>
          <button onClick={() => { setFly(null); open('outlook') }} className={menuItem}><Share2 size={15} /> Share via Outlook</button>
          <div className="h-px bg-[#EEE] my-1" />
          <button data-agent="edge-more-settings" onClick={() => push({ k: 'edge', name: 'settings' })} className={menuItem}><Settings size={15} /> Settings</button>
          <button onClick={() => { setFly(null); close() }} className={menuItem}><X size={15} /> Close Microsoft Edge</button>
        </div>
      )}
    </div>
  )
}

function site(u: string) {
  const p = host(u).split('.')
  const n = p[p.length - 2] ?? p[0]
  return ({ wikipedia: 'Wikipedia', microsoft: 'Microsoft Learn', reddit: 'Reddit', reuters: 'Reuters', forbes: 'Forbes', investopedia: 'Investopedia' } as Record<string, string>)[n] ?? n.charAt(0).toUpperCase() + n.slice(1)
}
