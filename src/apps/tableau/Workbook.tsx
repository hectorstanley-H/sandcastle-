import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileText,
  Grid3x3,
  Image as ImageIcon,
  LayoutGrid,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Presentation,
  Redo2,
  RefreshCw,
  RotateCcw,
  Share2,
  Star,
  Table2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { useDesk } from '@/os/context'
import { db, uid, useCollection } from '@/db/db'
import { Avatar } from '@/components/Avatar'
import { ME, PEOPLE, person } from '@/data/people'
import { computeMetrics, regionOf, T10, k } from './metrics'
import { Dialog, MenuButton, ago, btnPrimary, btnSecondary, field, useTab, type MItem } from './ui'
import { OtherDashboard, sheetsFor } from './Dashboards'

const OWNER_OPTS: [string, string | null][] = [
  ['(All)', null],
  ['Alex Morgan', 'alex'],
  ["Liam O'Connor", 'liam'],
  ['Rachel Goldberg', 'rachel'],
  ['Aisha Bello', 'aisha'],
]
type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'table'
type VState = { region: string; quarter: string; owner: string; chart: ChartType; sort: 'data' | 'desc' | 'asc'; stageSel: string | null }
const ORIGINAL: VState = { region: '(All)', quarter: 'Current', owner: '(All)', chart: 'bar', sort: 'data', stageSel: null }

export function WorkbookView({ wb, back }: { wb: any; back: () => void }) {
  const { isAgent, open: openApp } = useDesk()
  const { go, toast: tabToast } = useTab()
  const liveOpps = useCollection<any>('salesforce.opportunities')
  const accts = useCollection<any>('salesforce.accounts')
  const comments = useCollection<any>('tableau.comments').filter((c) => c.wbId === wb.id)
  const customViews = useCollection<any>('tableau.customViews').filter((v) => v.wbId === wb.id)
  const isPipeline = wb.id === 'wb-pipeline' || wb.thumb === 'pipeline'
  const sheets = isPipeline ? ['Pipeline Overview', 'Pipeline by Rep', 'Win/Loss', 'Deal Detail'] : sheetsFor(wb)
  const [sheet, setSheet] = useState(sheets[0])
  const [dl, setDl] = useState<null | 'menu' | 'pdf' | 'crosstab' | 'data' | 'image' | 'ppt'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const saved: Partial<VState> = wb.viewPrefs ?? {}
  const [vs, setVs] = useState<VState>({ ...ORIGINAL, ...saved })
  const [past, setPast] = useState<VState[]>([])
  const [future, setFuture] = useState<VState[]>([])
  const [viewName, setViewName] = useState('Original')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [paused, setPaused] = useState<any[] | null>(null)
  const [modal, setModal] = useState<null | 'alerts' | 'subscribe' | 'share' | 'saveView' | 'manageViews'>(null)
  const [panel, setPanel] = useState<null | 'comments'>(null)
  const [editMode, setEditMode] = useState(false)
  const [full, setFull] = useState(false)
  const [topSort, setTopSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'amount', dir: -1 })
  const [ctFormat, setCtFormat] = useState<'csv' | 'xlsx'>('csv')
  const stamp = new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  const apply = (patch: Partial<VState>, name = 'Original*') => {
    setPast((p) => [...p, vs])
    setFuture([])
    setVs({ ...vs, ...patch })
    if (viewName !== name) setViewName(name.endsWith('*') ? (viewName.endsWith('*') ? viewName : `${viewName}*`) : name)
  }
  const undo = () => {
    if (!past.length) return
    setFuture((f) => [vs, ...f])
    setVs(past[past.length - 1])
    setPast((p) => p.slice(0, -1))
  }
  const redo = () => {
    if (!future.length) return
    setPast((p) => [...p, vs])
    setVs(future[0])
    setFuture((f) => f.slice(1))
  }
  const revert = () => {
    if (JSON.stringify(vs) === JSON.stringify(ORIGINAL)) return
    setPast((p) => [...p, vs])
    setFuture([])
    setVs(ORIGINAL)
    setViewName('Original')
  }

  const opps = paused ?? liveOpps
  const ownerId = OWNER_OPTS.find(([l]) => l === vs.owner)?.[1] ?? null
  const filtered = useMemo(
    () => opps.filter((o) => (vs.region === '(All)' || regionOf(accts.find((a) => a.id === o.accountId)) === vs.region) && (!ownerId || o.ownerId === ownerId)),
    [opps, accts, vs.region, ownerId],
  )
  const m = useMemo(() => computeMetrics(filtered, accts, vs.quarter === 'Next' ? 1 : 0), [filtered, accts, vs.quarter])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 4500)
  }
  const fileFor = (kind: string) => {
    const legacy = wb.id === 'wb-pipeline' && (kind === 'pdf' || kind === 'csv')
    return legacy ? (kind === 'pdf' ? 'f-tableau-pipeline-pdf' : 'f-tableau-pipeline-csv') : `f-tableau-${wb.id.replace(/^wb-/, '')}-${kind}`
  }
  const download = (kind: 'pdf' | 'csv' | 'xlsx' | 'png' | 'pptx' | 'twbx' | 'data') => {
    const ext = kind === 'data' ? 'csv' : kind
    const name =
      kind === 'pdf' ? `${wb.name}.pdf` : kind === 'csv' ? `${wb.name.replace(/\s+/g, '_')}_Crosstab.csv` : kind === 'xlsx' ? `${wb.name.replace(/\s+/g, '_')}_Crosstab.xlsx` : kind === 'data' ? `${wb.name.replace(/\s+/g, '_')}_Data.csv` : `${wb.name}.${ext}`
    const id = fileFor(kind)
    const size = { pdf: '1.4 MB', csv: '38 KB', xlsx: '52 KB', png: '612 KB', pptx: '2.1 MB', twbx: '4.8 MB', data: '64 KB' }[kind]
    db.remove('files', id)
    db.insert('files', { id, name, folder: 'Downloads', kind: ext, size, modified: new Date().toISOString(), open: { appId: 'tableau', params: { workbookId: wb.id } }, createdBy: isAgent ? 'hworker' : undefined }, { prepend: true })
    setDl(null)
    flash(`${name} downloaded`)
  }
  const toggleFav = () => db.update('tableau.workbooks', wb.id, { favorite: !wb.favorite })

  const tb = 'h-8 px-2 flex items-center gap-1.5 text-[13px] text-[#333] hover:bg-[#F0F0F0] rounded-[3px] disabled:text-[#AAA] disabled:hover:bg-transparent'
  const card = 'bg-white border border-[#E6E6E6]'
  const maxHeat = Math.max(1, ...m.heat.flatMap((h) => h.cells))
  const stageData = useMemo(() => {
    const l = [...m.byStage]
    if (vs.sort === 'desc') l.sort((a, b) => b.amount - a.amount)
    if (vs.sort === 'asc') l.sort((a, b) => a.amount - b.amount)
    return l
  }, [m, vs.sort])
  const topRows = useMemo(() => {
    const l = (vs.stageSel ? filtered.filter((o) => !o.stage.startsWith('Closed') && o.stage === vs.stageSel).sort((a, b) => b.amount - a.amount).slice(0, 12).map((o) => ({ ...o, account: accts.find((a) => a.id === o.accountId)?.name, region: regionOf(accts.find((a) => a.id === o.accountId)) })) : m.top) as any[]
    return [...l].sort((a, b) => {
      const x = a[topSort.key]
      const y = b[topSort.key]
      return (typeof x === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * topSort.dir
    })
  }, [m, vs.stageSel, filtered, topSort])
  const openOpp = (id: string) => openApp('salesforce', { object: 'Opportunity', id })

  const viewItems: MItem[] = [
    { label: 'Original', checked: viewName === 'Original', onClick: () => { apply(ORIGINAL, 'Original') } },
    ...customViews.map((v) => ({ label: v.name, checked: viewName === v.name, onClick: () => apply({ ...ORIGINAL, ...v.state }, v.name) })),
    { divider: true, label: '' },
    { label: 'Save Custom View…', onClick: () => setModal('saveView') },
    { label: 'Manage Custom Views', disabled: !customViews.length, onClick: () => setModal('manageViews') },
  ]

  const stageChart = () => {
    if (vs.chart === 'table')
      return (
        <table className="w-full text-[11.5px]">
          <thead><tr className="border-b border-[#DDD]"><th className="text-left py-1">Stage</th><th className="text-right">Opps</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{stageData.map((s) => <tr key={s.stage} onClick={() => apply({ stageSel: vs.stageSel === s.stage ? null : s.stage })} className={`border-b border-[#F0F0F0] cursor-pointer ${vs.stageSel === s.stage ? 'bg-[#E1EBF6]' : 'hover:bg-[#F7F7F7]'}`}><td className="py-1">{s.stage}</td><td className="text-right">{s.count}</td><td className="text-right font-bold">{k(s.amount)}</td></tr>)}</tbody>
        </table>
      )
    if (vs.chart === 'pie')
      return (
        <ResponsiveContainer>
          <PieChart>
            <Pie data={stageData.filter((s) => s.amount)} dataKey="amount" nameKey="stage" outerRadius={95} innerRadius={45} isAnimationActive={false} onClick={(d: any) => apply({ stageSel: vs.stageSel === d.stage ? null : d.stage })}>
              {stageData.filter((s) => s.amount).map((s, i) => <Cell key={s.stage} fill={T10[i % 10]} opacity={vs.stageSel && vs.stageSel !== s.stage ? 0.3 : 1} />)}
            </Pie>
            <Tooltip formatter={(v: any) => k(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} layout="vertical" align="right" verticalAlign="middle" />
          </PieChart>
        </ResponsiveContainer>
      )
    if (vs.chart === 'line')
      return (
        <ResponsiveContainer>
          <LineChart data={stageData} margin={{ left: 10, right: 20, top: 10 }}>
            <CartesianGrid vertical={false} stroke="#EEE" />
            <XAxis dataKey="stage" tick={{ fontSize: 9 }} interval={0} />
            <YAxis tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} />
            <Tooltip formatter={(v: any) => k(v)} />
            <Line dataKey="amount" stroke="#4E79A7" strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )
    const vertical = vs.chart === 'bar'
    return (
      <ResponsiveContainer>
        <BarChart data={stageData} layout={vertical ? 'vertical' : 'horizontal'} margin={vertical ? { left: 10, right: 60 } : { top: 16, left: 10 }}>
          <CartesianGrid horizontal={!vertical} vertical={vertical ? false : false} stroke="#EEE" />
          {vertical ? <XAxis type="number" tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} /> : <XAxis dataKey="stage" tick={{ fontSize: 9 }} interval={0} />}
          {vertical ? <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 11, fill: '#333' }} /> : <YAxis tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} />}
          <Tooltip formatter={(v: any) => k(v)} />
          <Bar dataKey="amount" isAnimationActive={false} onClick={(d: any) => apply({ stageSel: vs.stageSel === d.stage ? null : d.stage })} cursor="pointer">
            {stageData.map((s) => {
              const i = m.byStage.findIndex((x) => x.stage === s.stage)
              return <Cell key={s.stage} fill={i >= 6 ? '#F28E2B' : '#4E79A7'} opacity={vs.stageSel && vs.stageSel !== s.stage ? 0.3 : 1} />
            })}
            <LabelList dataKey="amount" position={vertical ? 'right' : 'top'} formatter={(v: any) => k(Number(v))} style={{ fontSize: 10, fill: '#333' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const sortHead = (key: string, label: string, right = false) => (
    <th key={key} onClick={() => setTopSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'amount' || key === 'probability' ? -1 : 1 }))} className={`py-1 font-bold text-[#555] cursor-pointer hover:text-[#1F457E] select-none ${right ? 'text-right' : 'text-left'}`}>
      <span className="inline-flex items-center gap-0.5">
        {label}
        {topSort.key === key && (topSort.dir === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
      </span>
    </th>
  )

  return (
    <div className="min-h-full flex flex-col bg-[#F5F5F5] relative">
      {/* breadcrumb */}
      {!full && (
        <div className="h-11 bg-white flex items-center px-5 gap-2 text-[13px] border-b border-[#E6E6E6]">
          <button onClick={back} className="text-[#1F457E] hover:underline" data-agent="tableau-breadcrumb-explore">Explore</button>
          <ChevronRight size={13} className="text-[#999]" />
          <button className="text-[#1F457E] hover:underline" onClick={() => go('explore', { project: wb.project })}>{wb.project}</button>
          <ChevronRight size={13} className="text-[#999]" />
          <button className="text-[#1F457E] hover:underline" onClick={() => setSheet(sheets[0])}>{wb.name}</button>
          <ChevronRight size={13} className="text-[#999]" />
          <span className="font-semibold">{sheet}</span>
          <button aria-label={wb.favorite ? 'Remove from favorites' : 'Add to favorites'} title={wb.favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={toggleFav} className="ml-1">
            <Star size={14} className={wb.favorite ? 'fill-[#F2B705] text-[#F2B705]' : 'text-[#999]'} />
          </button>
          <div className="flex-1" />
          <span className="text-[12px] text-[#777]">
            Data source: Salesforce (live){paused ? ' · Updates paused' : ''} · Last refreshed {refreshing ? 'just now' : refreshedAt ? refreshedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'today'}
          </span>
        </div>
      )}
      {/* toolbar */}
      {!full && (
        <div className="h-11 bg-white flex items-center px-3 gap-0.5 border-b border-[#E6E6E6]">
          <button className={tb} aria-label="Undo" disabled={!past.length} onClick={undo}><Undo2 size={15} /> Undo</button>
          <button className={tb} aria-label="Redo" disabled={!future.length} onClick={redo}><Redo2 size={15} /> Redo</button>
          <button className={tb} onClick={revert}><RotateCcw size={15} /> Revert</button>
          <button
            className={tb}
            data-agent="tableau-refresh"
            onClick={() => {
              setRefreshing(true)
              setTimeout(() => {
                setRefreshing(false)
                setRefreshedAt(new Date())
              }, 900)
              if (paused) setPaused(liveOpps)
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className={`${tb} ${paused ? 'bg-[#E1EBF6]' : ''}`} onClick={() => setPaused(paused ? null : liveOpps)}>
            {paused ? <Play size={15} /> : <Pause size={15} />} {paused ? 'Resume' : 'Pause'}
          </button>
          <span className="w-px h-5 bg-[#DDD] mx-2" />
          <MenuButton className={tb} items={viewItems} menuClass="left-0 top-9" width={240} label="Views">
            <Eye size={15} /> View: {viewName} <ChevronDown size={12} />
          </MenuButton>
          <div className="flex-1" />
          <button className={tb} onClick={() => setModal('alerts')}><Bell size={15} /> Alerts</button>
          <button className={tb} onClick={() => setModal('subscribe')}><Mail size={15} /> Subscribe</button>
          <button className={`${tb} ${editMode ? 'bg-[#E1EBF6]' : ''}`} onClick={() => setEditMode(!editMode)}><Pencil size={15} /> Edit</button>
          <button className={tb} onClick={() => setModal('share')}><Share2 size={15} /> Share</button>
          <div className="relative">
            <button className={`${tb} ${dl ? 'bg-[#E1EBF6]' : ''}`} data-agent="tableau-download" aria-label="Download" onClick={() => setDl(dl ? null : 'menu')}><Download size={15} /> Download</button>
            {dl === 'menu' && (
              <div className="absolute right-0 top-9 z-40 w-[230px] bg-white border border-[#DDD] rounded-[4px] shadow-[0_6px_20px_rgba(0,0,0,0.18)] py-2">
                <div className="px-4 pb-2 text-[13px] font-semibold border-b border-[#EEE] mb-1">Download</div>
                {[['image', 'Image', ImageIcon], ['data', 'Data', Table2], ['crosstab', 'Crosstab', Grid3x3], ['pdf', 'PDF', FileText], ['ppt', 'PowerPoint', Presentation], ['twb', 'Tableau Workbook', LayoutGrid]].map(([id, l, I]: any) => (
                  <button key={id} data-agent={`tableau-download-${id}`} aria-label={l} onClick={() => (id === 'pdf' ? setDl('pdf') : id === 'crosstab' ? setDl('crosstab') : id === 'data' ? setDl('data') : id === 'image' ? setDl('image') : id === 'ppt' ? setDl('ppt') : download('twbx'))} className="w-full h-9 px-4 flex items-center gap-3 text-[13px] hover:bg-[#F0F4FA] text-left"><I size={15} className="text-[#555]" /> {l}</button>
                ))}
              </div>
            )}
          </div>
          <button className={`${tb} ${panel === 'comments' ? 'bg-[#E1EBF6]' : ''}`} onClick={() => setPanel(panel ? null : 'comments')}>
            <MessageSquare size={15} /> Comments{comments.length ? ` (${comments.length})` : ''}
          </button>
          <button className={tb} aria-label="Full screen" onClick={() => setFull(true)}><Maximize2 size={15} /></button>
        </div>
      )}
      {editMode && !full && (
        <div className="h-11 bg-[#1F457E] text-white flex items-center px-4 gap-3 text-[13px]" data-agent="tableau-edit-bar">
          <span className="font-semibold">Editing “Open Pipeline by Stage”</span>
          <span className="opacity-70">Show Me:</span>
          {([['bar', 'Horizontal Bars'], ['column', 'Vertical Bars'], ['line', 'Line'], ['pie', 'Pie'], ['table', 'Text Table']] as [ChartType, string][]).map(([t, l]) => (
            <button key={t} onClick={() => apply({ chart: t })} className={`h-7 px-2.5 rounded-[3px] ${vs.chart === t ? 'bg-white text-[#1F457E] font-semibold' : 'bg-white/10 hover:bg-white/20'}`}>{l}</button>
          ))}
          <span className="w-px h-5 bg-white/30" />
          <button onClick={() => apply({ chart: vs.chart === 'bar' ? 'column' : vs.chart === 'column' ? 'bar' : vs.chart })} className="h-7 px-2.5 rounded-[3px] bg-white/10 hover:bg-white/20">Swap Rows and Columns</button>
          <button onClick={() => apply({ sort: vs.sort === 'desc' ? 'asc' : vs.sort === 'asc' ? 'data' : 'desc' })} className="h-7 px-2.5 rounded-[3px] bg-white/10 hover:bg-white/20 flex items-center gap-1">
            Sort: {vs.sort === 'desc' ? 'Descending' : vs.sort === 'asc' ? 'Ascending' : 'Data source order'}
          </button>
          <div className="flex-1" />
          <button onClick={() => { db.update('tableau.workbooks', wb.id, { viewPrefs: { chart: vs.chart, sort: vs.sort }, updated: new Date().toISOString() }); setEditMode(false); flash('Workbook saved') }} className="h-7 px-3 rounded-[3px] bg-white text-[#1F457E] font-semibold">Save</button>
          <button onClick={() => setEditMode(false)} className="h-7 px-3 rounded-[3px] bg-white/10 hover:bg-white/20">Exit</button>
        </div>
      )}
      {/* sheet tabs */}
      {!full && (
        <div className="h-9 bg-white flex items-end px-3 gap-1 border-b border-[#E6E6E6]">
          {sheets.map((s) => (
            <button key={s} onClick={() => setSheet(s)} className={`h-8 px-4 text-[12.5px] rounded-t-[3px] ${sheet === s ? 'bg-[#F5F5F5] border border-b-0 border-[#E6E6E6] font-semibold' : 'text-[#555]'}`}>{s}</button>
          ))}
        </div>
      )}
      {full && (
        <button onClick={() => setFull(false)} className="absolute top-3 right-3 z-30 h-8 px-3 rounded-[4px] bg-[#333]/80 text-white text-[12px] flex items-center gap-1.5" aria-label="Exit full screen">
          <Minimize2 size={13} /> Exit full screen
        </button>
      )}
      <div className="flex-1 flex min-h-0">
        {/* dashboard */}
        <div className="flex-1 min-w-0 p-4" data-agent="tableau-dashboard">
          {!isPipeline ? (
            <OtherDashboard wb={wb} sheet={sheet} />
          ) : (
            <div className="bg-white border border-[#E6E6E6] p-4 min-w-[1100px]" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="flex items-start gap-4 mb-3">
                <div className="flex-1">
                  <div className="text-[20px] font-bold text-[#333]">{sheet === 'Pipeline Overview' ? 'Sales Pipeline Overview' : sheet}</div>
                  <div className="text-[12px] text-[#777]">FY{String(new Date().getFullYear() + 1).slice(2)} · Q{Math.floor(new Date().getMonth() / 3) + (vs.quarter === 'Next' ? 2 : 1) > 4 ? 1 : Math.floor(new Date().getMonth() / 3) + (vs.quarter === 'Next' ? 2 : 1)} · All currency in USD · Source: Salesforce Opportunities</div>
                </div>
                {([['Region', ['(All)', 'East', 'West', 'Central', 'EMEA'], 'region'], ['Fiscal Quarter', ['Current', 'Next'], 'quarter'], ['Owner', OWNER_OPTS.map(([l]) => l), 'owner']] as [string, string[], keyof VState][]).map(([l, opts, key]) => (
                  <div key={l} className="w-[150px]">
                    <div className="text-[11px] font-bold text-[#555] mb-0.5">{l}</div>
                    <select aria-label={l} value={vs[key] as string} onChange={(e) => apply({ [key]: e.target.value } as Partial<VState>)} className="w-full h-7 border border-[#CCC] text-[12px] px-1 bg-white">{opts.map((o: string) => <option key={o}>{o}</option>)}</select>
                  </div>
                ))}
              </div>
              {sheet === 'Pipeline Overview' && (
                <>
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
                    <div className={`${card} p-3 ${editMode ? 'outline outline-2 outline-[#1F457E]' : ''}`}>
                      <div className="text-[13px] font-bold text-[#333] mb-1 flex items-center">
                        <span className="flex-1">Open Pipeline by Stage</span>
                        {vs.stageSel && <button onClick={() => apply({ stageSel: null })} className="text-[11px] font-normal text-[#1F457E] hover:underline">Clear selection ({vs.stageSel})</button>}
                      </div>
                      <div className="h-[250px]">{stageChart()}</div>
                    </div>
                    <div className={`${card} p-3`}>
                      <div className="text-[13px] font-bold text-[#333] mb-1">Pipeline vs Closed Won by Region</div>
                      <div className="h-[250px]">
                        <ResponsiveContainer>
                          <BarChart data={vs.region === '(All)' ? m.byRegion : m.byRegion.filter((r) => r.region === vs.region)} margin={{ top: 16 }}>
                            <CartesianGrid vertical={false} stroke="#EEE" />
                            <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} />
                            <Tooltip formatter={(v: any) => k(v)} />
                            <Bar dataKey="amount" name="Open pipeline" fill="#4E79A7" isAnimationActive={false} cursor="pointer" onClick={(d: any) => apply({ region: vs.region === d.region ? '(All)' : d.region })}><LabelList dataKey="amount" position="top" formatter={(v: any) => k(Number(v))} style={{ fontSize: 10 }} /></Bar>
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
                            <tr key={h.stage} onClick={() => apply({ stageSel: vs.stageSel === h.stage ? null : h.stage })} className="cursor-pointer">
                              <td className={`py-[2px] pr-2 ${vs.stageSel === h.stage ? 'font-bold text-[#1F457E]' : 'text-[#333]'}`}>{h.stage}</td>
                              {h.cells.map((v, i) => {
                                const a = v / maxHeat
                                return <td key={i} className="p-[1px]" title={v ? `${h.stage} · ${m.months[i]}: ${k(v)}` : undefined}><div className="h-[22px] flex items-center justify-center" style={{ background: v ? `rgba(78,121,167,${0.12 + a * 0.88})` : '#F7F7F7', color: a > 0.5 ? '#fff' : '#333' }}>{v ? k(v) : ''}</div></td>
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
                      <div className="text-[13px] font-bold text-[#333] mt-2 mb-1">Forecast Category ({vs.quarter === 'Next' ? 'next quarter' : 'this quarter'})</div>
                      {m.cats.map((c, i) => (
                        <div key={c.cat} className="flex items-center gap-2 text-[11.5px] py-0.5" title={`${c.cat}: ${k(c.amount)}`}>
                          <span className="w-[70px] text-[#333]">{c.cat}</span>
                          <div className="flex-1 h-4 bg-[#F3F3F3]"><div className="h-full" style={{ width: `${(c.amount / Math.max(1, ...m.cats.map((x) => x.amount))) * 100}%`, background: T10[[4, 1, 0][i]] }} /></div>
                          <span className="w-[60px] text-right font-bold">{k(c.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`${card} p-3`}>
                    <div className="text-[13px] font-bold text-[#333] mb-2">Top Open Opportunities{vs.stageSel ? ` — ${vs.stageSel}` : ''}</div>
                    <table className="w-full text-[11.5px] border-collapse">
                      <thead><tr className="border-b border-[#DDD]">{sortHead('name', 'Opportunity')}{sortHead('account', 'Account')}{sortHead('region', 'Region')}{sortHead('stage', 'Stage')}{sortHead('closeDate', 'Close Date')}{sortHead('probability', 'Prob.', true)}{sortHead('amount', 'Amount', true)}</tr></thead>
                      <tbody>{topRows.map((o: any) => <tr key={o.id} className="border-b border-[#F0F0F0] hover:bg-[#F7F9FC]"><td className="py-1"><button className="text-left hover:underline hover:text-[#1F457E]" title="Open in Salesforce" onClick={() => openOpp(o.id)}>{o.name}</button></td><td>{o.account}</td><td>{o.region}</td><td>{o.stage}</td><td>{new Date(o.closeDate + 'T12:00').toLocaleDateString('en-US')}</td><td className="text-right">{o.probability}%</td><td className="text-right font-bold">{o.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</td></tr>)}</tbody>
                    </table>
                    {!topRows.length && <div className="py-4 text-center text-[12px] text-[#777]">No marks to display for the current filters.</div>}
                  </div>
                </>
              )}
              {sheet === 'Pipeline by Rep' && <ByRep opps={filtered} />}
              {sheet === 'Win/Loss' && <WinLoss opps={filtered} accts={accts} />}
              {sheet === 'Deal Detail' && <DealDetail opps={filtered} accts={accts} open={openOpp} />}
              <div className="text-[10px] text-[#999] mt-2">Data as of {paused ? 'pause time' : stamp} ET · Viewed by {ME.name}</div>
            </div>
          )}
        </div>
        {panel === 'comments' && <CommentsPanel wb={wb} sheet={sheet} onClose={() => setPanel(null)} />}
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
                <label className="flex items-center gap-2"><input type="radio" name="fmt" checked={ctFormat === 'xlsx'} onChange={() => setCtFormat('xlsx')} /> Excel</label>
                <label className="flex items-center gap-2"><input type="radio" name="fmt" checked={ctFormat === 'csv'} onChange={() => setCtFormat('csv')} /> CSV</label>
              </div>
            )}
            <div className="px-5 py-3 border-t border-[#E6E6E6] flex justify-end gap-2">
              <button onClick={() => setDl(null)} className="h-8 px-4 border border-[#CCC] rounded-[3px] text-[13px]">Cancel</button>
              <button data-agent="tableau-download-confirm" onClick={() => download(dl === 'pdf' ? 'pdf' : ctFormat)} className="h-8 px-4 rounded-[3px] bg-[#1F457E] text-white text-[13px] font-semibold">Download</button>
            </div>
          </div>
        </div>
      )}
      {(dl === 'image' || dl === 'ppt') && (
        <Dialog title={dl === 'image' ? 'Download Image' : 'Download PowerPoint'} onClose={() => setDl(null)} footer={<><button className={btnSecondary} onClick={() => setDl(null)}>Cancel</button><button className={btnPrimary} onClick={() => download(dl === 'image' ? 'png' : 'pptx')}>Download</button></>}>
          <div className="p-5 text-[13px] space-y-2">
            {dl === 'image' ? (
              <>
                <div className="font-semibold">Include</div>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> View title</label>
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Legends and filters</label>
                <div className="font-semibold pt-1">Image resolution</div>
                <label className="flex items-center gap-2"><input type="radio" name="res" defaultChecked /> Standard</label>
                <label className="flex items-center gap-2"><input type="radio" name="res" /> High</label>
              </>
            ) : (
              <>
                <div className="font-semibold">Include</div>
                <select className={field}><option>This View</option><option>Specific sheets from this workbook</option></select>
                <div className="text-[12px] text-[#777]">Each sheet is exported as a static image on its own slide.</div>
              </>
            )}
          </div>
        </Dialog>
      )}
      {dl === 'data' && <DataDialog rows={topRows} onClose={() => setDl(null)} onDownload={() => download('data')} />}
      {modal === 'alerts' && <AlertsDialog wb={wb} value={m.openTotal} onClose={() => setModal(null)} onSaved={flash} />}
      {modal === 'subscribe' && <SubscribeDialog wb={wb} sheet={sheet} onClose={() => setModal(null)} onSaved={flash} />}
      {modal === 'share' && <ShareDialog wb={wb} onClose={() => setModal(null)} onSaved={(msg) => { tabToast(msg); flash(msg) }} />}
      {modal === 'saveView' && (
        <SaveViewDialog
          onClose={() => setModal(null)}
          onSave={(name, makeDefault) => {
            db.insert('tableau.customViews', { id: uid('cv'), wbId: wb.id, name, state: { region: vs.region, quarter: vs.quarter, owner: vs.owner, chart: vs.chart, sort: vs.sort }, owner: ME.id, isDefault: makeDefault, createdAt: new Date().toISOString() })
            setViewName(name)
            flash(`Custom view “${name}” saved`)
          }}
        />
      )}
      {modal === 'manageViews' && (
        <Dialog title="My Views" onClose={() => setModal(null)} footer={<button className={btnPrimary} onClick={() => setModal(null)}>Done</button>}>
          <div className="p-4 text-[13px]">
            {customViews.map((v) => (
              <div key={v.id} className="flex items-center gap-2 h-9 border-b border-[#F0F0F0]">
                <button className="flex-1 text-left text-[#1F457E] hover:underline" onClick={() => { apply({ ...ORIGINAL, ...v.state }, v.name); setModal(null) }}>{v.name}</button>
                <span className="text-[11px] text-[#777]">{ago(v.createdAt)}</span>
                <button aria-label={`Delete ${v.name}`} onClick={() => db.remove('tableau.customViews', v.id)} className="text-[#777] hover:text-[#C00]"><Trash2 size={14} /></button>
              </div>
            ))}
            {!customViews.length && <div className="text-[#777]">No custom views yet.</div>}
          </div>
        </Dialog>
      )}
    </div>
  )
}

/* ───────────── pipeline sheets ───────────── */
function ByRep({ opps }: { opps: any[] }) {
  const reps = ['alex', 'liam', 'rachel', 'aisha'].map((r) => {
    const mine = opps.filter((o) => o.ownerId === r)
    const open = mine.filter((o) => !o.stage.startsWith('Closed'))
    return {
      rep: person(r).name,
      open: open.reduce((t, o) => t + o.amount, 0),
      weighted: Math.round(open.reduce((t, o) => t + (o.amount * o.probability) / 100, 0)),
      won: mine.filter((o) => o.stage === 'Closed Won').reduce((t, o) => t + o.amount, 0),
      count: open.length,
    }
  })
  return (
    <div className="grid grid-cols-[1.3fr_1fr] gap-3">
      <div className="bg-white border border-[#E6E6E6] p-3">
        <div className="text-[13px] font-bold text-[#333] mb-1">Open, Weighted and Won by Rep</div>
        <div className="h-[320px]">
          <ResponsiveContainer>
            <BarChart data={reps} margin={{ top: 16 }}>
              <CartesianGrid vertical={false} stroke="#EEE" />
              <XAxis dataKey="rep" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={k} tick={{ fontSize: 10, fill: '#666' }} />
              <Tooltip formatter={(v: any) => k(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="open" name="Open pipeline" fill="#4E79A7" isAnimationActive={false} />
              <Bar dataKey="weighted" name="Weighted" fill="#76B7B2" isAnimationActive={false} />
              <Bar dataKey="won" name="Closed won" fill="#59A14F" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white border border-[#E6E6E6] p-3">
        <div className="text-[13px] font-bold text-[#333] mb-2">Rep Summary</div>
        <table className="w-full text-[11.5px]">
          <thead><tr className="border-b border-[#DDD] text-[#555]"><th className="text-left py-1">Rep</th><th className="text-right">Open Opps</th><th className="text-right">Open</th><th className="text-right">Weighted</th><th className="text-right">Won</th><th className="text-right">Quota att.</th></tr></thead>
          <tbody>{reps.map((r) => <tr key={r.rep} className="border-b border-[#F0F0F0]"><td className="py-1.5">{r.rep}</td><td className="text-right">{r.count}</td><td className="text-right">{k(r.open)}</td><td className="text-right">{k(r.weighted)}</td><td className="text-right font-bold">{k(r.won)}</td><td className="text-right">{Math.round((r.won / 900_000) * 100)}%</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

function WinLoss({ opps, accts }: { opps: any[]; accts: any[] }) {
  const closed = opps.filter((o) => o.stage.startsWith('Closed'))
  const by = (key: (o: any) => string) => {
    const g: Record<string, { name: string; won: number; lost: number }> = {}
    for (const o of closed) {
      const n = key(o) || '—'
      g[n] ??= { name: n, won: 0, lost: 0 }
      if (o.stage === 'Closed Won') g[n].won += 1
      else g[n].lost += 1
    }
    return Object.values(g).sort((a, b) => b.won + b.lost - (a.won + a.lost))
  }
  const bySource = by((o) => o.leadSource)
  const byRegion = by((o) => regionOf(accts.find((a) => a.id === o.accountId)))
  const byComp = by((o) => o.competitor)
  const won = closed.filter((o) => o.stage === 'Closed Won').length
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[['Closed Deals', String(closed.length)], ['Won', String(won)], ['Win Rate', `${Math.round((won / Math.max(1, closed.length)) * 100)}%`]].map(([l, v]) => (
          <div key={l} className="bg-white border border-[#E6E6E6] border-t-[3px] border-t-[#59A14F] px-4 py-3"><div className="text-[12px] font-bold text-[#555]">{l}</div><div className="text-[28px] font-bold text-[#333]">{v}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[['by Lead Source', bySource], ['by Region', byRegion], ['by Main Competitor', byComp]].map(([t, d]: any) => (
          <div key={t} className="bg-white border border-[#E6E6E6] p-3">
            <div className="text-[13px] font-bold text-[#333] mb-1">Won vs Lost {t}</div>
            <div className="h-[240px]">
              <ResponsiveContainer>
                <BarChart data={d} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid horizontal={false} stroke="#EEE" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="won" name="Won" stackId="a" fill="#59A14F" isAnimationActive={false} />
                  <Bar dataKey="lost" name="Lost" stackId="a" fill="#E15759" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DealDetail({ opps, accts, open }: { opps: any[]; accts: any[]; open: (id: string) => void }) {
  const [stage, setStage] = useState('(All)')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'closeDate', dir: 1 })
  const rows = opps
    .filter((o) => !o.stage.startsWith('Closed') && (stage === '(All)' || o.stage === stage))
    .map((o) => ({ ...o, account: accts.find((a) => a.id === o.accountId)?.name ?? '', owner: person(o.ownerId).name, region: regionOf(accts.find((a) => a.id === o.accountId)) }))
    .sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir
    })
  const cols: [string, string, boolean?][] = [['name', 'Opportunity'], ['account', 'Account'], ['owner', 'Owner'], ['region', 'Region'], ['stage', 'Stage'], ['forecastCategory', 'Forecast'], ['closeDate', 'Close Date'], ['amount', 'Amount', true]]
  return (
    <div className="bg-white border border-[#E6E6E6] p-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-[13px] font-bold text-[#333] flex-1">Open Deal Detail ({rows.length})</div>
        <span className="text-[11px] font-bold text-[#555]">Stage</span>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-7 border border-[#CCC] text-[12px] px-1">{['(All)', ...new Set(opps.filter((o) => !o.stage.startsWith('Closed')).map((o) => o.stage))].map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="border-b border-[#DDD]">
            {cols.map(([key, l, r]) => (
              <th key={key} onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))} className={`py-1 font-bold text-[#555] cursor-pointer select-none ${r ? 'text-right' : 'text-left'}`}>
                <span className="inline-flex items-center gap-0.5">{l}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-[#F0F0F0] hover:bg-[#F7F9FC]">
              <td className="py-1"><button className="text-left hover:underline hover:text-[#1F457E]" onClick={() => open(o.id)} title="Open in Salesforce">{o.name}</button></td>
              <td>{o.account}</td>
              <td>{o.owner}</td>
              <td>{o.region}</td>
              <td>{o.stage}</td>
              <td>{o.forecastCategory}</td>
              <td>{new Date(o.closeDate + 'T12:00').toLocaleDateString('en-US')}</td>
              <td className="text-right font-bold">{k(o.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────── dialogs & panels ───────────── */
function DataDialog({ rows, onClose, onDownload }: { rows: any[]; onClose: () => void; onDownload: () => void }) {
  const [tab, setTab] = useState<'summary' | 'full'>('summary')
  const cols = tab === 'summary' ? ['name', 'stage', 'amount'] : ['name', 'account', 'region', 'stage', 'closeDate', 'probability', 'amount']
  return (
    <Dialog title="View Data" width={760} onClose={onClose} agent="tableau-data-dialog" footer={<><button className={btnSecondary} onClick={onClose}>Close</button><button className={btnPrimary} onClick={onDownload}>Download</button></>}>
      <div className="px-5 pt-3 flex gap-4 border-b border-[#E6E6E6] text-[13px]">
        {(['summary', 'full'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-9 relative ${tab === t ? 'font-semibold text-[#1F457E]' : 'text-[#555]'}`}>
            {t === 'summary' ? 'Summary' : 'Full Data'}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#1F457E]" />}
          </button>
        ))}
        <span className="ml-auto self-center text-[12px] text-[#777]">{rows.length} rows</span>
      </div>
      <div className="p-4">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-[#F5F5F5]">{cols.map((c) => <th key={c} className="text-left px-2 py-1 font-semibold capitalize">{c === 'closeDate' ? 'Close Date' : c}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-[#F0F0F0]">{cols.map((c) => <td key={c} className="px-2 py-1">{c === 'amount' ? k(r[c]) : c === 'probability' ? `${r[c]}%` : r[c]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Dialog>
  )
}

function AlertsDialog({ wb, value, onClose, onSaved }: { wb: any; value: number; onClose: () => void; onSaved: (m: string) => void }) {
  const { isAgent } = useDesk()
  const alerts = useCollection<any>('tableau.alerts').filter((a) => a.wbId === wb.id)
  const [op, setOp] = useState('Above')
  const [threshold, setThreshold] = useState(String(Math.round(value / 1e5) * 1e5))
  const [freq, setFreq] = useState('Once a day at most')
  const [name, setName] = useState(`Open Pipeline ${op.toLowerCase()} threshold`)
  const t = Number(threshold.replace(/[^0-9.]/g, '')) || 0
  const firing = op === 'Above' ? value > t : value < t
  return (
    <Dialog title="Create Data-Driven Alert" width={560} onClose={onClose} agent="tableau-alerts-dialog" footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={!t} onClick={() => { db.insert('tableau.alerts', { id: uid('al'), wbId: wb.id, name, measure: 'Open Pipeline', op, threshold: t, freq, owner: ME.id, createdAt: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }); onSaved(`Alert “${name}” created`); onClose() }}>Create Alert</button></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div className="grid grid-cols-[1fr_120px_1fr] gap-2 items-end">
          <div><div className="font-semibold mb-1">Measure</div><div className={`${field} flex items-center bg-[#F5F5F5]`}>Open Pipeline (SUM Amount)</div></div>
          <div><div className="font-semibold mb-1">Condition</div><select value={op} onChange={(e) => { setOp(e.target.value); setName(`Open Pipeline ${e.target.value.toLowerCase()} threshold`) }} className={field}><option>Above</option><option>Below</option></select></div>
          <div><div className="font-semibold mb-1">Threshold</div><input value={threshold} onChange={(e) => setThreshold(e.target.value)} className={field} /></div>
        </div>
        <div className={`rounded-[4px] px-3 py-2 text-[12px] ${firing ? 'bg-[#FFF4E5] text-[#8A4B00]' : 'bg-[#EEF5EC] text-[#2F6B2F]'}`}>Current value {k(value)} — this alert would {firing ? '' : 'not '}trigger now.</div>
        <div><div className="font-semibold mb-1">Send email</div><select value={freq} onChange={(e) => setFreq(e.target.value)} className={field}>{['As frequently as possible', 'Once an hour at most', 'Once a day at most', 'Once a week at most'].map((f) => <option key={f}>{f}</option>)}</select></div>
        <div><div className="font-semibold mb-1">Alert name</div><input value={name} onChange={(e) => setName(e.target.value)} className={field} /></div>
        {alerts.length > 0 && (
          <div>
            <div className="font-semibold mb-1">Existing alerts on this view</div>
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 h-8 border-b border-[#F0F0F0]">
                <Bell size={13} className="text-[#777]" />
                <span className="flex-1">{a.name} <span className="text-[#777]">({a.op.toLowerCase()} {k(a.threshold)})</span></span>
                <button aria-label={`Delete ${a.name}`} onClick={() => db.remove('tableau.alerts', a.id)} className="text-[#777] hover:text-[#C00]"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}

function SubscribeDialog({ wb, sheet, onClose, onSaved }: { wb: any; sheet: string; onClose: () => void; onSaved: (m: string) => void }) {
  const { isAgent } = useDesk()
  const subs = useCollection<any>('tableau.subscriptions').filter((s) => s.wbId === wb.id)
  const [subject, setSubject] = useState(`${wb.name} — ${sheet}`)
  const [freq, setFreq] = useState('Weekly on Monday at 8:00 AM')
  const [format, setFormat] = useState('Image and PDF')
  const [extra, setExtra] = useState('')
  const [onlyData, setOnlyData] = useState(true)
  const others = PEOPLE.filter((p) => !p.external && p.id !== ME.id)
  return (
    <Dialog
      title="Subscribe Users"
      width={560}
      onClose={onClose}
      agent="tableau-subscribe-dialog"
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} onClick={() => { db.insert('tableau.subscriptions', { id: uid('sub'), wbId: wb.id, sheet, subject, freq, format, recipients: [ME.id, ...(extra ? [extra] : [])], onlyWithData: onlyData, createdAt: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined }); onSaved(`Subscribed: ${freq.toLowerCase()}`); onClose() }}>Subscribe</button>
        </>
      }
    >
      <div className="p-5 space-y-3 text-[13px]">
        <div><div className="font-semibold mb-1">Subscribe</div><div className="flex items-center gap-2 flex-wrap"><span className="inline-flex items-center gap-1 h-7 px-2 rounded bg-[#E1EBF6]"><Avatar id={ME.id} size={18} /> {ME.name} (me)</span><select value={extra} onChange={(e) => setExtra(e.target.value)} className="h-7 border border-[#CCC] rounded-[3px] text-[12px] px-1"><option value="">+ Add user…</option>{others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
        <div><div className="font-semibold mb-1">Subject</div><input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="font-semibold mb-1">Frequency</div><select value={freq} onChange={(e) => setFreq(e.target.value)} className={field}>{['When data refreshes', 'Daily at 8:00 AM', 'Weekly on Monday at 8:00 AM', 'Monthly on the 1st'].map((f) => <option key={f}>{f}</option>)}</select></div>
          <div><div className="font-semibold mb-1">Format</div><select value={format} onChange={(e) => setFormat(e.target.value)} className={field}>{['Image', 'PDF', 'Image and PDF', 'CSV'].map((f) => <option key={f}>{f}</option>)}</select></div>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={onlyData} onChange={(e) => setOnlyData(e.target.checked)} /> Don’t send if view is empty</label>
        {subs.length > 0 && (
          <div>
            <div className="font-semibold mb-1">Current subscriptions</div>
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2 h-8 border-b border-[#F0F0F0]">
                <Mail size={13} className="text-[#777]" />
                <span className="flex-1 truncate">{s.subject} <span className="text-[#777]">· {s.freq}</span></span>
                <button className="text-[12px] text-[#1F457E] hover:underline" onClick={() => db.remove('tableau.subscriptions', s.id)}>Unsubscribe</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}

function ShareDialog({ wb, onClose, onSaved }: { wb: any; onClose: () => void; onSaved: (m: string) => void }) {
  const link = `https://prod-useast-b.online.tableau.com/#/site/northwind/views/${wb.name.replace(/\s+/g, '')}/${wb.id === 'wb-pipeline' ? 'PipelineOverview' : 'Dashboard'}`
  const [copied, setCopied] = useState(false)
  const [who, setWho] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const others = PEOPLE.filter((p) => !p.external && p.id !== ME.id)
  const copy = () => {
    try {
      void navigator.clipboard?.writeText(link)
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true)
  }
  return (
    <Dialog
      title={`Share “${wb.name}”`}
      width={560}
      onClose={onClose}
      agent="tableau-share-dialog"
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={!who.length} onClick={() => { db.insert('tableau.shares', { id: uid('sh'), wbId: wb.id, to: who, message: msg, by: ME.id, at: new Date().toISOString() }); onSaved(`Shared with ${who.map((w) => person(w).name).join(', ')}`); onClose() }}>Share</button>
        </>
      }
    >
      <div className="p-5 space-y-3 text-[13px]">
        <div className="font-semibold">Share using a link</div>
        <div className="flex gap-2">
          <input readOnly value={link} className={`${field} bg-[#F5F5F5]`} aria-label="Link" />
          <button onClick={copy} className={`${btnSecondary} flex items-center gap-1.5 shrink-0`}><Copy size={13} /> {copied ? 'Copied!' : 'Copy Link'}</button>
        </div>
        <div className="font-semibold pt-1">Share with people</div>
        <select value="" onChange={(e) => e.target.value && setWho([...new Set([...who, e.target.value])])} className={field} aria-label="Add people">
          <option value="">Enter a name…</option>
          {others.filter((p) => !who.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}
        </select>
        {who.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {who.map((w) => (
              <span key={w} className="inline-flex items-center gap-1 h-7 pl-1 pr-2 rounded-full bg-[#E1EBF6]">
                <Avatar id={w} size={20} /> {person(w).name}
                <button aria-label={`Remove ${person(w).name}`} onClick={() => setWho(who.filter((x) => x !== w))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="Add a message (optional)" className="w-full border border-[#CCC] rounded-[3px] px-2 py-1.5 outline-none focus:border-[#1F457E]" />
      </div>
    </Dialog>
  )
}

function SaveViewDialog({ onClose, onSave }: { onClose: () => void; onSave: (name: string, def: boolean) => void }) {
  const [name, setName] = useState('')
  const [def, setDef] = useState(false)
  return (
    <Dialog title="Save Custom View" width={420} onClose={onClose} footer={<><button className={btnSecondary} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={!name.trim()} onClick={() => { onSave(name.trim(), def); onClose() }}>Save</button></>}>
      <div className="p-5 space-y-3 text-[13px]">
        <div><div className="font-semibold mb-1">Name this view</div><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. EMEA — next quarter" className={field} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={def} onChange={(e) => setDef(e.target.checked)} /> Make it my default</label>
      </div>
    </Dialog>
  )
}

function CommentsPanel({ wb, sheet, onClose }: { wb: any; sheet: string; onClose: () => void }) {
  const { isAgent } = useDesk()
  const comments = useCollection<any>('tableau.comments').filter((c) => c.wbId === wb.id).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const [text, setText] = useState('')
  const post = () => {
    if (!text.trim()) return
    db.insert('tableau.comments', { id: uid('cm'), wbId: wb.id, sheet, authorId: ME.id, body: text.trim(), date: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    setText('')
  }
  return (
    <div className="w-[320px] shrink-0 border-l border-[#DDD] bg-white flex flex-col" data-agent="tableau-comments">
      <div className="h-11 px-4 flex items-center border-b border-[#E6E6E6]">
        <span className="flex-1 text-[14px] font-semibold">Comments</span>
        <button onClick={onClose} aria-label="Close comments"><X size={15} /></button>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar id={c.authorId} size={28} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px]"><b>{person(c.authorId).name}</b> <span className="text-[#777]">{ago(c.date)}</span></div>
              <div className="text-[11px] text-[#777]">on {c.sheet}</div>
              <div className="text-[13px] leading-[1.45] whitespace-pre-wrap">{c.body}</div>
              {c.authorId === ME.id && <button onClick={() => db.remove('tableau.comments', c.id)} className="text-[11px] text-[#777] hover:text-[#C00]">Delete</button>}
            </div>
          </div>
        ))}
        {!comments.length && <div className="text-[13px] text-[#777] text-center pt-6">No comments yet. Start the conversation about this view.</div>}
      </div>
      <div className="p-3 border-t border-[#E6E6E6]">
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post() } }} rows={3} placeholder="Add a comment… (use @ to mention)" className="w-full border border-[#CCC] rounded-[3px] px-2 py-1.5 text-[13px] outline-none focus:border-[#1F457E] resize-none" aria-label="Add a comment" />
        <div className="flex justify-end mt-1.5"><button className={btnPrimary} disabled={!text.trim()} onClick={post}>Post</button></div>
      </div>
    </div>
  )
}

