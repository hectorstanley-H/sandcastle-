import { useState } from 'react'
import { Add20Regular, Star16Filled, Star16Regular, MoreHorizontal16Regular, Filter16Regular, Search16Regular, Lightbulb20Regular, ChevronRight16Regular } from '@fluentui/react-icons'
import { db, useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { relative } from '@/data/time'
import { Endorsement, HWChip, ItemIcon, Sensitivity, THEME, TYPE_LABEL, dataSource, usePbi } from './shared'

export function Thumb({ id, type, h = 112 }: { id: string; type: string; h?: number }) {
  let seed = 0
  for (const c of id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
  const rnd = (i: number) => ((seed >> (i % 16)) * 9301 + 49297 * i) % 233280 / 233280
  if (type === 'semanticModel' || type === 'dataflow')
    return (
      <div className="w-full flex items-center justify-center bg-[#F3F7FB]" style={{ height: h }}>
        <svg width="120" height="70" viewBox="0 0 120 70">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={8 + i * 38} y={14 + (i % 2) * 18} width="30" height="26" rx="3" fill="#fff" stroke="#9FC6EE" />
              <rect x={8 + i * 38} y={14 + (i % 2) * 18} width="30" height="7" rx="3" fill={type === 'dataflow' ? '#038387' : '#0F6CBD'} />
            </g>
          ))}
          <path d="M38 27 L46 45 M76 45 L84 27" stroke="#9FC6EE" strokeWidth="1.5" />
        </svg>
      </div>
    )
  return (
    <div className="w-full bg-[#F7F7F7] p-2 flex flex-col gap-1.5" style={{ height: h }}>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-5 bg-white rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.2)] flex flex-col justify-center px-1">
            <div className="h-1 w-3/5 rounded bg-[#C8C6C4]" />
            <div className="h-1.5 w-4/5 rounded mt-0.5" style={{ background: THEME[i % 3 === 0 ? 1 : 0] }} />
          </div>
        ))}
      </div>
      <div className="flex-1 flex gap-1.5">
        <div className="flex-[3] bg-white rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.2)] flex items-end gap-[3px] p-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-t-[1px]" style={{ height: `${30 + rnd(i + 1) * 65}%`, background: i % 2 ? THEME[1] : THEME[0] }} />
          ))}
        </div>
        <div className="flex-[2] bg-white rounded-[2px] shadow-[0_0_1px_rgba(0,0,0,0.2)] flex items-center justify-center">
          <svg width="44" height="44" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="13" fill="none" stroke={THEME[0]} strokeWidth="7" strokeDasharray={`${40 + rnd(3) * 20} 100`} />
            <circle cx="18" cy="18" r="13" fill="none" stroke={THEME[2]} strokeWidth="7" strokeDasharray={`20 100`} strokeDashoffset={-(40 + rnd(3) * 20)} />
            <circle cx="18" cy="18" r="13" fill="none" stroke={THEME[3]} strokeWidth="7" strokeDasharray={`12 100`} strokeDashoffset={-(60 + rnd(3) * 20)} />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function RefreshedCell({ rec, all }: { rec: any; all: any[] }) {
  const src = dataSource(rec, all)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{new Date(src.lastRefreshed).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' })}</span>
      {src.refreshedBy === 'hworker' && <HWChip label="H-Worker" />}
    </span>
  )
}

export function HomeView() {
  const items = useCollection('powerbi.reports')
  const { openItem, openWorkspace } = usePbi()
  const [tab, setTab] = useState<'recent' | 'favorites' | 'apps' | 'shared'>('recent')
  const recent = [...items].filter((r) => r.lastOpened).sort((a, b) => +new Date(b.lastOpened) - +new Date(a.lastOpened))
  const favs = items.filter((r) => r.favorite)
  const shared = items.filter((r) => r.owner !== ME.id && r.type !== 'dataflow')
  const rows = tab === 'recent' ? recent : tab === 'favorites' ? favs : tab === 'shared' ? shared : []
  const recommended = ['rpt-ops-kpi', 'db-exec-ops', 'rpt-vendor-spend', 'rpt-wh-sla', 'rpt-pipeline'].map((id) => items.find((r) => r.id === id)).filter(Boolean) as any[]
  const reasons = ['Frequently opened', 'Favorite', 'Frequently opened', 'Popular in your org', 'Shared with you']
  const hour = new Date().getHours()

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="px-8 pt-5 pb-8 max-w-[1500px]">
        <div className="flex items-center justify-between">
          <div className="text-[20px] font-semibold">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {ME.first}</div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 rounded border border-[#D1D1D1] text-[13px] flex items-center gap-1.5 hover:bg-[#F5F5F5]">
              <Lightbulb20Regular className="w-4 h-4" /> Learn about Power BI
            </button>
            <button className="h-8 px-3 rounded bg-[#117865] hover:bg-[#0E6352] text-white text-[13px] font-semibold flex items-center gap-1.5" data-agent="powerbi-new-report">
              <Add20Regular className="w-4 h-4" /> New report
            </button>
          </div>
        </div>

        <div className="mt-5 text-[16px] font-semibold flex items-center gap-1">Recommended <ChevronRight16Regular /></div>
        <div className="mt-3 grid grid-cols-5 gap-4">
          {recommended.map((r, i) => (
            <button
              key={r.id}
              onClick={() => openItem(r.id)}
              className="text-left rounded-md border border-[#E1DFDD] overflow-hidden bg-white hover:shadow-[0_3.2px_7.2px_rgba(0,0,0,0.13),0_0.6px_1.8px_rgba(0,0,0,0.11)] transition-shadow"
              aria-label={r.name}
            >
              <div className="relative">
                <Thumb id={r.id} type={r.type} />
                <span className="absolute left-2 top-2 h-5 px-1.5 rounded bg-white/90 text-[11px] text-[#323130] flex items-center shadow-sm">{reasons[i]}</span>
              </div>
              <div className="p-3 flex items-start gap-2">
                <ItemIcon type={r.type} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{r.name}</div>
                  <div className="text-[12px] text-[#605E5C] truncate">{r.workspace}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-7 flex items-center gap-5 border-b border-[#E1DFDD]">
          {(
            [
              ['recent', 'Recent'],
              ['favorites', 'Favorites'],
              ['apps', 'My apps'],
              ['shared', 'Shared with me'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              data-agent={`powerbi-home-tab-${k}`}
              onClick={() => setTab(k)}
              className={`relative h-9 text-[14px] ${tab === k ? 'font-semibold' : 'text-[#424242] hover:text-black'}`}
            >
              {l}
              {tab === k && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t bg-[#117865]" />}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pb-1">
            <div className="h-7 w-[200px] rounded border border-[#D1D1D1] flex items-center gap-1.5 px-2 text-[#605E5C]">
              <Search16Regular />
              <input placeholder="Filter by keyword" className="flex-1 text-[12.5px] outline-none" />
            </div>
            <button className="h-7 px-2 rounded hover:bg-[#F3F2F1] text-[13px] flex items-center gap-1">
              <Filter16Regular /> Filter
            </button>
          </div>
        </div>

        <ItemTable rows={rows} all={items} cols={['name', 'type', 'opened', 'location', 'refreshed', 'endorsement', 'sensitivity']} onOpen={openItem} onWorkspace={openWorkspace} />
        {tab === 'apps' && <div className="py-10 text-center text-[13px] text-[#605E5C]">Operations Hub · Finance Insights · Sales Command Center — open Apps in the navigation pane to browse.</div>}
      </div>
    </div>
  )
}

const COLS: Record<string, string> = {
  name: 'Name',
  type: 'Type',
  task: 'Task',
  owner: 'Owner',
  opened: 'Opened',
  location: 'Location',
  refreshed: 'Refreshed',
  next: 'Next refresh',
  endorsement: 'Endorsement',
  sensitivity: 'Sensitivity',
}

export function ItemTable({ rows, all, cols, onOpen, onWorkspace }: { rows: any[]; all: any[]; cols: string[]; onOpen: (id: string) => void; onWorkspace?: (n: string) => void }) {
  return (
    <table className="w-full text-[13px] mt-1">
      <thead>
        <tr className="text-left text-[#605E5C] h-10 border-b border-[#EDEBE9]">
          <th className="w-8" />
          {cols.map((c) => (
            <th key={c} className={`font-normal px-2 ${c === 'name' ? 'w-[30%]' : ''}`}>
              {COLS[c]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            data-agent={`powerbi-report-${r.id}`}
            aria-label={r.name}
            role="row"
            onClick={() => onOpen(r.id)}
            className="h-11 border-b border-[#F3F2F1] hover:bg-[#F5F5F5] cursor-pointer group"
          >
            <td className="pl-2">
              <ItemIcon type={r.type} />
            </td>
            {cols.map((c) => (
              <td key={c} className="px-2 text-[#323130] whitespace-nowrap">
                {c === 'name' && (
                  <span className="flex items-center gap-2">
                    <span className="hover:underline text-[#242424] truncate">{r.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        db.update('powerbi.reports', r.id, { favorite: !r.favorite })
                      }}
                      className={`${r.favorite ? 'text-[#D9B300]' : 'text-[#605E5C] opacity-0 group-hover:opacity-100'}`}
                      aria-label="Favorite"
                    >
                      {r.favorite ? <Star16Filled /> : <Star16Regular />}
                    </button>
                    <MoreHorizontal16Regular className="text-[#605E5C] opacity-0 group-hover:opacity-100" />
                  </span>
                )}
                {c === 'type' && TYPE_LABEL[r.type]}
                {c === 'task' && <span className="text-[#605E5C]">—</span>}
                {c === 'owner' && person(r.owner).name}
                {c === 'opened' && (r.lastOpened ? relative(r.lastOpened).replace('d ago', ' days ago').replace('h ago', ' hours ago') : '—')}
                {c === 'location' && (
                  <button
                    className="hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onWorkspace?.(r.workspace)
                    }}
                  >
                    {r.workspace}
                  </button>
                )}
                {c === 'refreshed' && (r.type === 'dashboard' ? <span className="text-[#605E5C]">—</span> : <RefreshedCell rec={r} all={all} />)}
                {c === 'next' &&
                  (r.type === 'dashboard' || !dataSource(r, all).nextRefresh ? (
                    <span className="text-[#605E5C]">N/A</span>
                  ) : (
                    new Date(dataSource(r, all).nextRefresh).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' })
                  ))}
                {c === 'endorsement' && <Endorsement value={r.endorsement} />}
                {c === 'sensitivity' && <Sensitivity value={r.sensitivity} />}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
