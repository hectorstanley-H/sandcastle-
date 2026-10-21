import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Download,
  Eye,
  FolderOpen,
  Grid3x3,
  House,
  LayoutGrid,
  List,
  Maximize2,
  MessageSquare,
  Pause,
  Pencil,
  RefreshCw,
  Redo2,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Star,
  Undo2,
  Users,
  X,
  Mail,
  Activity,
  FileText,
  Image as ImageIcon,
  Table2,
  Presentation,
} from 'lucide-react'
import type { AppProps } from '@/os/registry'
import { logoUrl } from '@/os/registry'
import { useWin, useDesk } from '@/os/context'
import { db, useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { computeMetrics, T10, k } from './metrics'

type Page = 'home' | 'explore' | 'favorites' | 'recents' | 'shared' | 'workbook'
const HOST = 'https://prod-useast-b.online.tableau.com/#/site/northwind'

export default function Tableau({ win, params }: AppProps) {
  const { setUrl, setTitle } = useWin()
  const [page, setPage] = useState<Page>('home')
  const [wbId, setWbId] = useState('wb-pipeline')
  const wbs = useCollection<any>('tableau.workbooks')
  useEffect(() => {
    if (!params) return
    if (params.workbookId) {
      setWbId(params.workbookId)
      setPage('workbook')
    } else if (params.page) setPage(params.page)
  }, [win.nonce])
  const wb = wbs.find((w) => w.id === wbId)
  useEffect(() => {
    if (page === 'workbook') {
      setUrl(`${HOST}/views/${(wb?.name ?? '').replace(/\s+/g, '')}/PipelineOverview?:iid=1`)
      setTitle(`${wb?.name ?? 'Workbook'} - Tableau Cloud`)
    } else {
      setUrl(`${HOST}/${page === 'home' ? 'home' : page === 'explore' ? 'explore' : page}`)
      setTitle(`${page === 'home' ? 'Home' : page[0].toUpperCase() + page.slice(1)} - Tableau Cloud`)
    }
  }, [page, wbId, win.id])
  const openWb = (id: string) => {
    setWbId(id)
    setPage('workbook')
  }

  const nav: [Page, any, string][] = [
    ['home', House, 'Home'],
    ['favorites', Star, 'Favorites'],
    ['recents', Clock, 'Recents'],
    ['shared', Users, 'Shared with Me'],
    ['explore', FolderOpen, 'Explore'],
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white text-[#1F1F1F]" style={{ fontFamily: "'Inter', 'Benton Sans', Arial, sans-serif" }}>
      {/* header */}
      <div className="h-[52px] shrink-0 flex items-center px-3 gap-3 border-b border-[#E6E6E6] bg-white">
        <button className="w-8 h-8 flex items-center justify-center text-[#555]" aria-label="Menu"><Grid3x3 size={18} /></button>
        <img src={logoUrl('tableau')} className="h-6" alt="" />
        <span className="text-[16px] font-semibold text-[#333]">Tableau</span>
        <span className="text-[16px] text-[#666] -ml-1">Cloud</span>
        <span className="h-6 w-px bg-[#DDD] mx-1" />
        <button className="flex items-center gap-1 text-[13px] text-[#333]">Northwind <ChevronDown size={14} /></button>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center h-9 w-[560px] rounded-full border border-[#CCC] px-4 gap-2 text-[#777]">
            <Search size={15} />
            <span className="text-[13px]">Search for views, metrics, workbooks, and more</span>
          </div>
        </div>
        <button className="h-8 px-3 rounded-full border border-[#1F457E] text-[#1F457E] text-[13px] font-semibold flex items-center gap-1"><Sparkles size={14} /> Tableau Agent</button>
        <button className="w-8 h-8 flex items-center justify-center text-[#555]"><CircleHelp size={18} /></button>
        <button className="w-8 h-8 flex items-center justify-center text-[#555]"><Bell size={18} /></button>
        <Avatar id={ME.id} size={30} />
      </div>
      <div className="flex-1 min-h-0 flex">
        {page !== 'workbook' && (
          <div className="w-[210px] shrink-0 border-r border-[#E6E6E6] py-3 bg-[#FAFAFA]">
            <button className="mx-3 mb-3 h-9 w-[calc(100%-24px)] rounded-[4px] bg-[#1F457E] text-white text-[13px] font-semibold flex items-center justify-center gap-1">+ New <ChevronDown size={13} /></button>
            {nav.map(([id, I, l]) => (
              <button key={id} data-agent={`tableau-nav-${id}`} aria-label={l} onClick={() => setPage(id)} className={`w-full h-9 px-5 flex items-center gap-3 text-[13.5px] ${page === id ? 'bg-[#E1EBF6] text-[#1F457E] font-semibold border-l-[3px] border-[#1F457E]' : 'text-[#333] hover:bg-[#F0F0F0]'}`}>
                <I size={16} /> {l}
              </button>
            ))}
            <div className="mx-5 my-3 h-px bg-[#E6E6E6]" />
            {[[Activity, 'Tableau Pulse'], [LayoutGrid, 'Collections'], [Eye, 'Recommendations'], [ImageIcon, 'External Assets']].map(([I, l]: any) => (
              <div key={l} className="h-9 px-5 flex items-center gap-3 text-[13.5px] text-[#333]"><I size={16} /> {l}</div>
            ))}
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-auto">
          {page === 'workbook' && wb ? <WorkbookView wb={wb} back={() => setPage('explore')} /> : <Browse page={page} wbs={wbs} open={openWb} />}
        </div>
      </div>
    </div>
  )
}

function Thumb({ kind }: { kind: string }) {
  const bars = [0.8, 0.55, 0.9, 0.4, 0.65, 0.3]
  return (
    <div className="h-[130px] bg-white border-b border-[#E6E6E6] p-3 flex gap-2">
      <div className="flex-1 flex items-end gap-1">
        {bars.map((b, i) => <div key={i} className="flex-1 rounded-t-[1px]" style={{ height: `${b * 100}%`, background: T10[(i + kind.length) % 10] }} />)}
      </div>
      <div className="w-[38%] flex flex-col gap-1.5">
        <div className="h-5 rounded bg-[#EEF3F8]" />
        <div className="h-5 rounded bg-[#EEF3F8]" />
        <svg viewBox="0 0 60 30" className="flex-1"><polyline fill="none" stroke={T10[kind.length % 10]} strokeWidth="2" points="0,25 10,18 20,21 30,10 40,13 50,5 60,8" /></svg>
      </div>
    </div>
  )
}

function Browse({ page, wbs, open }: { page: Page; wbs: any[]; open: (id: string) => void }) {
  const [grid, setGrid] = useState(true)
  const list = page === 'favorites' ? wbs.filter((w) => w.favorite) : page === 'shared' ? wbs.filter((w) => w.owner !== 'alex') : wbs
  return (
    <div className="p-7">
      {page === 'home' && (
        <div className="mb-6 rounded-[8px] p-6 text-white flex items-center gap-6" style={{ background: 'linear-gradient(120deg,#1F457E 0%,#2E6DB4 60%,#5FA0E0 100%)' }}>
          <div className="flex-1">
            <div className="text-[22px] font-semibold">Good afternoon, {ME.first}</div>
            <div className="text-[14px] opacity-90 mt-1">3 of your favorite metrics changed this week. Pipeline is up 6.2% vs last week.</div>
          </div>
          <div className="flex gap-3">
            {[['Open Pipeline', 'Sales'], ['Bookings QTD', 'Finance'], ['Win Rate', 'Sales']].map(([m, s]) => <div key={m} className="bg-white/15 rounded-[6px] px-4 py-2 text-[12px]"><div className="font-semibold text-[13px]">{m}</div><div className="opacity-80">{s} · Pulse</div></div>)}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[22px] font-semibold flex-1">{page === 'home' ? 'Recents' : page === 'explore' ? 'Explore' : page === 'favorites' ? 'Favorites' : page === 'recents' ? 'Recents' : 'Shared with Me'}</h1>
        {page === 'explore' && <button className="h-8 px-3 border border-[#CCC] rounded-[4px] text-[13px] flex items-center gap-1">All Workbooks <ChevronDown size={13} /></button>}
        <button className="h-8 px-3 border border-[#CCC] rounded-[4px] text-[13px] flex items-center gap-1">Sort By: Last Modified <ChevronDown size={13} /></button>
        <div className="flex border border-[#CCC] rounded-[4px]">
          <button onClick={() => setGrid(true)} className={`w-8 h-8 flex items-center justify-center ${grid ? 'bg-[#E1EBF6]' : ''}`}><LayoutGrid size={14} /></button>
          <button onClick={() => setGrid(false)} className={`w-8 h-8 flex items-center justify-center ${!grid ? 'bg-[#E1EBF6]' : ''}`}><List size={14} /></button>
        </div>
      </div>
      {page === 'explore' && (
        <div className="flex gap-4 mb-5">
          {['Sales', 'Marketing', 'Finance', 'Operations', 'Customer Success', 'Samples'].map((p) => (
            <div key={p} className="w-[150px] h-[70px] rounded-[6px] border border-[#E6E6E6] flex items-center gap-2 px-3 bg-[#FAFAFA]"><FolderOpen size={22} className="text-[#E8762C]" /><div><div className="text-[13px] font-semibold">{p}</div><div className="text-[11px] text-[#777]">{wbs.filter((w) => w.project === p).length} workbooks</div></div></div>
          ))}
        </div>
      )}
      {grid ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
          {list.map((w) => (
            <button key={w.id} data-agent={`tableau-wb-${w.id}`} aria-label={w.name} onClick={() => open(w.id)} className="text-left rounded-[6px] border border-[#E0E0E0] overflow-hidden hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] bg-white">
              <Thumb kind={w.thumb} />
              <div className="p-3">
                <div className="text-[14px] font-semibold text-[#1F457E] flex items-center gap-1">{w.name} {w.favorite && <Star size={12} className="fill-[#F2B705] text-[#F2B705]" />}</div>
                <div className="text-[12px] text-[#777] mt-0.5">{w.project} · {w.views} views · {w.viewsCount.toLocaleString()} views</div>
                <div className="text-[12px] text-[#777]">Modified {new Date(w.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {person(w.owner).name}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[#555] border-b border-[#E6E6E6] h-9">{['Name', 'Project', 'Owner', 'Views', 'Modified'].map((h) => <th key={h} className="font-semibold">{h}</th>)}</tr></thead>
          <tbody>{list.map((w) => <tr key={w.id} className="h-10 border-b border-[#F0F0F0]"><td><button onClick={() => open(w.id)} className="text-[#1F457E] font-semibold">{w.name}</button></td><td>{w.project}</td><td>{person(w.owner).name}</td><td>{w.viewsCount}</td><td>{new Date(w.updated).toLocaleDateString()}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  )
}

function WorkbookView({ wb, back }: { wb: any; back: () => void }) {
  const { isAgent } = useDesk()
  const opps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const m = useMemo(() => computeMetrics(opps, accts), [opps, accts])
  const [sheet, setSheet] = useState('Pipeline Overview')
  const [dl, setDl] = useState<null | 'menu' | 'pdf' | 'crosstab'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [region, setRegion] = useState('(All)')
  const [refreshing, setRefreshing] = useState(false)
  const stamp = new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  const download = (kind: 'pdf' | 'csv') => {
    const name = kind === 'pdf' ? `${wb.name}.pdf` : `${wb.name.replace(/\s+/g, '_')}_Crosstab.csv`
    const id = kind === 'pdf' ? 'f-tableau-pipeline-pdf' : 'f-tableau-pipeline-csv'
    db.remove('files', id)
    db.insert('files', { id, name, folder: 'Downloads', kind: kind === 'pdf' ? 'pdf' : 'csv', size: kind === 'pdf' ? '1.4 MB' : '38 KB', modified: new Date().toISOString(), open: { appId: 'tableau', params: { workbookId: wb.id } }, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    setDl(null)
    setToast(`${name} downloaded`)
    setTimeout(() => setToast(null), 4500)
  }

  const tb = 'h-8 px-2 flex items-center gap-1.5 text-[13px] text-[#333] hover:bg-[#F0F0F0] rounded-[3px]'
  const card = 'bg-white border border-[#E6E6E6]'
  const maxHeat = Math.max(1, ...m.heat.flatMap((h) => h.cells))
  return (
    <div className="min-h-full flex flex-col bg-[#F5F5F5] relative">
      {/* breadcrumb */}
      <div className="h-11 bg-white flex items-center px-5 gap-2 text-[13px] border-b border-[#E6E6E6]">
        <button onClick={back} className="text-[#1F457E] hover:underline" data-agent="tableau-breadcrumb-explore">Explore</button>
        <ChevronRight size={13} className="text-[#999]" />
        <span className="text-[#1F457E]">{wb.project}</span>
        <ChevronRight size={13} className="text-[#999]" />
        <span className="text-[#1F457E]">{wb.name}</span>
        <ChevronRight size={13} className="text-[#999]" />
        <span className="font-semibold">{sheet}</span>
        <Star size={14} className="ml-1 fill-[#F2B705] text-[#F2B705]" />
        <div className="flex-1" />
        <span className="text-[12px] text-[#777]">Data source: Salesforce (live) · Last refreshed {refreshing ? 'just now' : 'today'}</span>
      </div>
      {/* toolbar */}
      <div className="h-11 bg-white flex items-center px-3 gap-0.5 border-b border-[#E6E6E6]">
        <button className={tb} aria-label="Undo"><Undo2 size={15} /> Undo</button>
        <button className={tb} aria-label="Redo"><Redo2 size={15} /> Redo</button>
        <button className={tb}><RotateCcw size={15} /> Revert</button>
        <button className={tb} data-agent="tableau-refresh" onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 900) }}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
        <button className={tb}><Pause size={15} /> Pause</button>
        <span className="w-px h-5 bg-[#DDD] mx-2" />
        <button className={tb}><Eye size={15} /> View: Original <ChevronDown size={12} /></button>
        <div className="flex-1" />
        <button className={tb}><Bell size={15} /> Alerts</button>
        <button className={tb}><Mail size={15} /> Subscribe</button>
        <button className={tb}><Pencil size={15} /> Edit</button>
        <button className={tb}><Share2 size={15} /> Share</button>
        <div className="relative">
          <button className={`${tb} ${dl ? 'bg-[#E1EBF6]' : ''}`} data-agent="tableau-download" aria-label="Download" onClick={() => setDl(dl ? null : 'menu')}><Download size={15} /> Download</button>
          {dl === 'menu' && (
            <div className="absolute right-0 top-9 z-40 w-[230px] bg-white border border-[#DDD] rounded-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.18)] py-2">
              <div className="px-4 pb-2 text-[13px] font-semibold border-b border-[#EEE] mb-1">Download</div>
              {[['image', 'Image', ImageIcon], ['data', 'Data', Table2], ['crosstab', 'Crosstab', Grid3x3], ['pdf', 'PDF', FileText], ['ppt', 'PowerPoint', Presentation], ['twb', 'Tableau Workbook', LayoutGrid]].map(([id, l, I]: any) => (
                <button key={id} data-agent={`tableau-download-${id}`} aria-label={l} onClick={() => (id === 'pdf' ? setDl('pdf') : id === 'crosstab' ? setDl('crosstab') : null)} className="w-full h-9 px-4 flex items-center gap-3 text-[13px] hover:bg-[#F0F4FA] text-left"><I size={15} className="text-[#555]" /> {l}</button>
              ))}
            </div>
          )}
        </div>
        <button className={tb}><MessageSquare size={15} /> Comments</button>
        <button className={tb} aria-label="Full screen"><Maximize2 size={15} /></button>
      </div>
      {/* sheet tabs */}
      <div className="h-9 bg-white flex items-end px-3 gap-1 border-b border-[#E6E6E6]">
        {['Pipeline Overview', 'Pipeline by Rep', 'Win/Loss', 'Deal Detail'].map((s) => (
          <button key={s} onClick={() => setSheet(s)} className={`h-8 px-4 text-[12.5px] rounded-t-[3px] ${sheet === s ? 'bg-[#F5F5F5] border border-b-0 border-[#E6E6E6] font-semibold' : 'text-[#555]'}`}>{s}</button>
        ))}
      </div>
      {/* dashboard */}
      <div className="flex-1 p-4" data-agent="tableau-dashboard">
        <div className="bg-white border border-[#E6E6E6] p-4 min-w-[1100px]" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="flex items-start gap-4 mb-3">
            <div className="flex-1">
              <div className="text-[20px] font-bold text-[#333]">Sales Pipeline Overview</div>
              <div className="text-[12px] text-[#777]">FY{String(new Date().getFullYear() + 1).slice(2)} · Q{Math.floor(new Date().getMonth() / 3) + 1} · All currency in USD · Source: Salesforce Opportunities</div>
            </div>
            {[['Region', ['(All)', 'East', 'West', 'Central', 'EMEA'], region, setRegion], ['Fiscal Quarter', ['Current', 'Next'], 'Current', () => {}], ['Owner', ['(All)', 'Alex Morgan', "Liam O'Connor", 'Rachel Goldberg', 'Aisha Bello'], '(All)', () => {}]].map(([l, opts, v, set]: any) => (
              <div key={l} className="w-[150px]">
                <div className="text-[11px] font-bold text-[#555] mb-0.5">{l}</div>
                <select value={v} onChange={(e) => set(e.target.value)} className="w-full h-7 border border-[#CCC] text-[12px] px-1 bg-white">{opts.map((o: string) => <option key={o}>{o}</option>)}</select>
              </div>
            ))}
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3 mb-3" data-agent="tableau-kpis">
            {[
              ['Open Pipeline', k(m.openTotal), `${m.openCount} opportunities`, '#4E79A7'],
              ['Weighted Pipeline', k(m.weighted), 'probability-adjusted', '#76B7B2'],
              ['Closed Won QTD', k(m.wonQtd), `${k(m.wonTotal)} trailing 12 mo`, '#59A14F'],
              ['Win Rate', `${m.winRate}%`, 'closed deals, TTM', '#F28E2B'],
              ['Avg Deal Size', k(m.avgDeal), 'closed won', '#B07AA1'],
            ].map(([l, v, s, c]) => (
              <div key={l} className={`${card} px-4 py-3 border-t-[3px]`} style={{ borderTopColor: c }}>
                <div className="text-[12px] font-bold text-[#555]">{l}</div>
                <div className="text-[28px] font-bold text-[#333] leading-tight">{v}</div>
                <div className="text-[11px] text-[#777]">{s}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1.3fr_1fr] gap-3 mb-3">
            <div className={`${card} p-3`}>
              <div className="text-[13px] font-bold text-[#333] mb-1">Open Pipeline by Stage</div>
              <div className="h-[250px]">
                <ResponsiveContainer>
                  <BarChart data={m.byStage} layout="vertical" margin={{ left: 10, right: 60 }}>
                    <CartesianGrid horizontal={false} stroke="#EEE" />
                    <XAxis type="number" tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 11, fill: '#333' }} />
                    <Tooltip formatter={(v: any) => k(v)} />
                    <Bar dataKey="amount" isAnimationActive={false}>
                      {m.byStage.map((_, i) => <Cell key={i} fill={i >= 6 ? '#F28E2B' : '#4E79A7'} />)}
                      <LabelList dataKey="amount" position="right" formatter={(v: any) => k(Number(v))} style={{ fontSize: 10, fill: '#333' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={`${card} p-3`}>
              <div className="text-[13px] font-bold text-[#333] mb-1">Pipeline vs Closed Won by Region</div>
              <div className="h-[250px]">
                <ResponsiveContainer>
                  <BarChart data={region === '(All)' ? m.byRegion : m.byRegion.filter((r) => r.region === region)} margin={{ top: 16 }}>
                    <CartesianGrid vertical={false} stroke="#EEE" />
                    <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} />
                    <Tooltip formatter={(v: any) => k(v)} />
                    <Bar dataKey="amount" name="Open pipeline" fill="#4E79A7" isAnimationActive={false}><LabelList dataKey="amount" position="top" formatter={(v: any) => k(Number(v))} style={{ fontSize: 10 }} /></Bar>
                    <Bar dataKey="won" name="Closed won" fill="#59A14F" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1.3fr_1fr] gap-3 mb-3">
            <div className={`${card} p-3`}>
              <div className="text-[13px] font-bold text-[#333] mb-2">Pipeline Heat Map — Stage × Expected Close Month</div>
              <table className="w-full text-[11px] border-collapse">
                <thead><tr><th className="text-left font-bold text-[#555] pb-1 w-[140px]">Stage</th>{m.months.map((mm) => <th key={mm} className="font-bold text-[#555] pb-1">{mm}</th>)}</tr></thead>
                <tbody>
                  {m.heat.map((h) => (
                    <tr key={h.stage}>
                      <td className="py-[2px] text-[#333] pr-2">{h.stage}</td>
                      {h.cells.map((v, i) => {
                        const a = v / maxHeat
                        return <td key={i} className="p-[1px]"><div className="h-[22px] flex items-center justify-center" style={{ background: v ? `rgba(78,121,167,${0.12 + a * 0.88})` : '#F7F7F7', color: a > 0.5 ? '#fff' : '#333' }}>{v ? k(v) : ''}</div></td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`${card} p-3`}>
              <div className="text-[13px] font-bold text-[#333] mb-1">Open Pipeline Trend (12 mo)</div>
              <div className="h-[150px]">
                <ResponsiveContainer>
                  <LineChart data={m.trend} margin={{ right: 10, top: 6 }}>
                    <CartesianGrid vertical={false} stroke="#EEE" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} width={56} />
                    <Tooltip formatter={(v: any) => k(v)} />
                    <Line dataKey="pipeline" stroke="#E15759" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[13px] font-bold text-[#333] mt-2 mb-1">Forecast Category (this quarter)</div>
              {m.cats.map((c, i) => (
                <div key={c.cat} className="flex items-center gap-2 text-[11.5px] py-0.5">
                  <span className="w-[70px] text-[#333]">{c.cat}</span>
                  <div className="flex-1 h-4 bg-[#F3F3F3]"><div className="h-full" style={{ width: `${(c.amount / Math.max(1, ...m.cats.map((x) => x.amount))) * 100}%`, background: T10[[4, 1, 0][i]] }} /></div>
                  <span className="w-[60px] text-right font-bold">{k(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`${card} p-3`}>
            <div className="text-[13px] font-bold text-[#333] mb-2">Top Open Opportunities</div>
            <table className="w-full text-[11.5px] border-collapse">
              <thead><tr className="border-b border-[#DDD]">{['Opportunity', 'Account', 'Region', 'Stage', 'Close Date', 'Prob.', 'Amount'].map((h) => <th key={h} className={`py-1 font-bold text-[#555] ${h === 'Amount' || h === 'Prob.' ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
              <tbody>{m.top.map((o: any) => <tr key={o.id} className="border-b border-[#F0F0F0]"><td className="py-1">{o.name}</td><td>{o.account}</td><td>{o.region}</td><td>{o.stage}</td><td>{new Date(o.closeDate + 'T12:00').toLocaleDateString('en-US')}</td><td className="text-right">{o.probability}%</td><td className="text-right font-bold">{o.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="text-[10px] text-[#999] mt-2">Data as of {stamp} ET · Viewed by {ME.name}</div>
        </div>
      </div>
      {toast && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-[4px] bg-[#333] text-white text-[13px] shadow-lg" data-agent="tableau-toast">
          <Download size={15} /> {toast}
        </div>
      )}
      {(dl === 'pdf' || dl === 'crosstab') && (
        <div className="absolute inset-0 z-50 bg-black/30 flex items-start justify-center pt-24" data-agent="tableau-download-dialog">
          <div className="w-[480px] bg-white rounded-[4px] shadow-2xl">
            <div className="h-12 px-5 flex items-center border-b border-[#E6E6E6]">
              <span className="text-[15px] font-semibold flex-1">{dl === 'pdf' ? 'Download PDF' : 'Download Crosstab'}</span>
              <button onClick={() => setDl(null)} aria-label="Close"><X size={16} /></button>
            </div>
            {dl === 'pdf' ? (
              <div className="p-5 space-y-4 text-[13px]">
                <div><div className="font-semibold mb-1">Include</div><select className="w-full h-8 border border-[#CCC] px-2"><option>This View</option><option>Specific sheets from this dashboard</option></select></div>
                <div><div className="font-semibold mb-1">Scaling</div><select className="w-full h-8 border border-[#CCC] px-2"><option>Automatic</option><option>At 100%</option></select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="font-semibold mb-1">Paper size</div><select className="w-full h-8 border border-[#CCC] px-2"><option>Letter</option><option>A4</option></select></div>
                  <div><div className="font-semibold mb-1">Orientation</div><select className="w-full h-8 border border-[#CCC] px-2"><option>Landscape</option><option>Portrait</option></select></div>
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Show selections</label>
              </div>
            ) : (
              <div className="p-5 text-[13px] space-y-2">
                <div className="font-semibold">Select sheet from dashboard</div>
                {['Open Pipeline by Stage', 'Pipeline vs Closed Won by Region', 'Top Open Opportunities'].map((s, i) => <label key={s} className="flex items-center gap-2"><input type="radio" name="ct" defaultChecked={i === 2} /> {s}</label>)}
                <div className="font-semibold pt-2">Format</div>
                <label className="flex items-center gap-2"><input type="radio" name="fmt" /> Excel</label>
                <label className="flex items-center gap-2"><input type="radio" name="fmt" defaultChecked /> CSV</label>
              </div>
            )}
            <div className="px-5 py-3 border-t border-[#E6E6E6] flex justify-end gap-2">
              <button onClick={() => setDl(null)} className="h-8 px-4 border border-[#CCC] rounded-[3px] text-[13px]">Cancel</button>
              <button data-agent="tableau-download-confirm" onClick={() => download(dl === 'pdf' ? 'pdf' : 'csv')} className="h-8 px-4 rounded-[3px] bg-[#1F457E] text-white text-[13px] font-semibold">Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
