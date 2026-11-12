import { useState } from 'react'
import {
  Add16Regular,
  FolderAdd16Regular,
  ArrowImport16Regular,
  ChevronDown12Regular,
  Settings16Regular,
  PersonAdd16Regular,
  Search16Regular,
  Filter16Regular,
  TextBulletListLtr16Regular,
  Flowchart16Regular,
  ArrowSwap16Regular,
  Diamond16Regular,
} from '@fluentui/react-icons'
import { db, uid, useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { useDesk } from '@/os/context'
import { ItemTable, TypeFilter } from './Home'
import { usePbi } from './shared'
import { LineageView, ManageAccessDialog, WorkspaceSettingsDialog, createReportFrom } from './views'

export function WorkspaceView({ name }: { name: string }) {
  const items = useCollection('powerbi.reports')
  const workspaces = useCollection('powerbi.workspaces')
  const { openItem, notify } = usePbi()
  const { isAgent } = useDesk()
  const [q, setQ] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [menu, setMenu] = useState<null | 'new' | 'filter' | 'import'>(null)
  const [dialog, setDialog] = useState<null | 'access' | 'settings'>(null)
  const [lineage, setLineage] = useState(false)
  const ws = workspaces.find((w) => w.name === name)
  const rows = items.filter((r) => r.workspace === name && r.name.toLowerCase().includes(q.toLowerCase()) && (!types.length || types.includes(r.type)))
  const newItem = (kind: 'report' | 'dashboard') => {
    setMenu(null)
    if (kind === 'report') {
      const src = items.find((r) => r.workspace === name && r.type === 'report') ?? items.find((r) => r.id === 'rpt-ops-kpi')
      if (!src) return
      let n = 'New report'
      let k = 2
      while (items.some((r) => r.name === n && r.workspace === name)) n = `New report (${k++})`
      openItem(createReportFrom(src, n, name, isAgent))
    } else {
      const id = uid('db')
      let n = 'New dashboard'
      let k = 2
      while (items.some((r) => r.name === n && r.workspace === name)) n = `New dashboard (${k++})`
      db.insert('powerbi.reports', { id, guid: crypto.randomUUID?.() ?? uid('g'), name: n, workspace: name, type: 'dashboard', owner: ME.id, lastOpened: new Date().toISOString(), tiles: [] })
      notify({ kind: 'success', title: 'Dashboard created', body: `Pin visuals from reports to “${n}”.` })
      openItem(id)
    }
  }
  return (
    <div className="flex-1 overflow-auto bg-white" data-agent="powerbi-workspace">
      <div className="px-7 pt-4">
        <div className="flex items-center gap-3">
          {ws?.slug === 'my-workspace' ? (
            <Avatar id={ME.id} size={36} square />
          ) : (
            <span className="w-9 h-9 rounded-md flex items-center justify-center text-white text-[16px] font-semibold" style={{ background: ws?.color ?? '#118DFF' }}>
              {name[0]}
            </span>
          )}
          <div className="text-[20px] font-semibold">{name}</div>
          <Diamond16Regular className="text-[#605E5C]" title={ws?.capacity} />
          <div className="ml-auto flex items-center gap-1 text-[13px]">
            <button data-agent="powerbi-ws-manage-access" onClick={() => setDialog('access')} className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
              <PersonAdd16Regular /> Manage access
            </button>
            <button data-agent="powerbi-ws-settings" onClick={() => setDialog('settings')} className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
              <Settings16Regular /> Workspace settings
            </button>
            <div className="flex -space-x-1.5 ml-1">
              {(ws?.members ?? []).slice(0, 4).map((m: string) => (
                <Avatar key={m} id={m} size={24} ring="#fff" />
              ))}
            </div>
          </div>
        </div>
        <div className="text-[12.5px] text-[#605E5C] mt-1 ml-12">{ws?.description}</div>

        <div className="mt-4 flex items-center gap-1 text-[13px]">
          <div className="relative">
            <button onClick={() => setMenu((m) => (m === 'new' ? null : 'new'))} className="h-8 px-3 rounded bg-[#117865] hover:bg-[#0E6352] text-white font-semibold flex items-center gap-1.5" data-agent="powerbi-new-item">
              <Add16Regular /> New item
            </button>
            {menu === 'new' && (
              <div className="absolute left-0 top-9 z-30 w-[260px] bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13),0_1.2px_3.6px_rgba(0,0,0,0.11)] py-1" onMouseLeave={() => setMenu(null)}>
                {[
                  ['Report', 'Visualize your data with a new report', () => newItem('report')],
                  ['Dashboard', 'Pin visuals from your reports', () => newItem('dashboard')],
                ].map(([l, d, fn]: any) => (
                  <button key={l} data-agent={`powerbi-new-item-${l.toLowerCase()}`} onClick={fn} className="w-full text-left px-3 py-2 hover:bg-[#F3F2F1]">
                    <div className="text-[13px] font-semibold">{l}</div>
                    <div className="text-[12px] text-[#605E5C]">{d}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
            <FolderAdd16Regular /> New folder
          </button>
          <div className="relative">
            <button onClick={() => setMenu((m) => (m === 'import' ? null : 'import'))} className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
              <ArrowImport16Regular /> Import <ChevronDown12Regular />
            </button>
            {menu === 'import' && (
              <div className="absolute left-0 top-9 z-30 w-[240px] bg-white rounded shadow-[0_6.4px_14.4px_rgba(0,0,0,0.13)] py-1" onMouseLeave={() => setMenu(null)}>
                {['Report, Paginated Report or Workbook', 'Dataflow'].map((l) => (
                  <label key={l} className="block w-full text-left px-3 h-8 leading-8 hover:bg-[#F3F2F1] cursor-pointer">
                    {l}
                    <input
                      type="file"
                      accept=".pbix,.rdl,.xlsx,.json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        setMenu(null)
                        if (f) notify({ kind: 'info', title: 'Import queued', body: `“${f.name}” is being imported into ${name}.` })
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
            <ArrowSwap16Regular /> Migrate
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-[220px] rounded border border-[#D1D1D1] flex items-center gap-1.5 px-2 text-[#605E5C]">
              <Search16Regular />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by keyword" className="flex-1 text-[12.5px] outline-none text-[#242424]" aria-label="Filter by keyword" />
            </div>
            <div className="relative">
              <button onClick={() => setMenu((m) => (m === 'filter' ? null : 'filter'))} className={`h-8 px-2 rounded hover:bg-[#F3F2F1] flex items-center gap-1 ${types.length ? 'text-[#0F6CBD] font-semibold' : ''}`}>
                <Filter16Regular /> Filter{types.length ? ` (${types.length})` : ''}
              </button>
              {menu === 'filter' && <TypeFilter types={types} setTypes={setTypes} onClose={() => setMenu(null)} />}
            </div>
            <button onClick={() => setLineage(false)} className={`h-8 w-8 rounded flex items-center justify-center ${lineage ? 'hover:bg-[#F3F2F1]' : 'bg-[#F0F0F0]'}`} aria-label="List view">
              <TextBulletListLtr16Regular />
            </button>
            <button data-agent="powerbi-ws-lineage" onClick={() => setLineage(true)} className={`h-8 w-8 rounded flex items-center justify-center ${lineage ? 'bg-[#F0F0F0]' : 'hover:bg-[#F3F2F1]'}`} aria-label="Lineage view">
              <Flowchart16Regular />
            </button>
          </div>
        </div>

        {lineage ? <LineageView ws={name} /> : <ItemTable rows={rows} all={items} cols={['name', 'type', 'task', 'owner', 'refreshed', 'next', 'endorsement', 'sensitivity']} onOpen={openItem} />}
      </div>
      {dialog === 'access' && ws && <ManageAccessDialog ws={ws} onClose={() => setDialog(null)} />}
      {dialog === 'settings' && ws && <WorkspaceSettingsDialog ws={ws} onClose={() => setDialog(null)} />}
    </div>
  )
}
