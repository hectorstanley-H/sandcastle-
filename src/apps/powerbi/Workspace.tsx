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
import { useCollection } from '@/db/db'
import { ME } from '@/data/people'
import { Avatar } from '@/components/Avatar'
import { ItemTable } from './Home'
import { usePbi } from './shared'

export function WorkspaceView({ name }: { name: string }) {
  const items = useCollection('powerbi.reports')
  const workspaces = useCollection('powerbi.workspaces')
  const { openItem } = usePbi()
  const [q, setQ] = useState('')
  const ws = workspaces.find((w) => w.name === name)
  const rows = items.filter((r) => r.workspace === name && r.name.toLowerCase().includes(q.toLowerCase()))
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
            <button className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
              <PersonAdd16Regular /> Manage access
            </button>
            <button className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
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
          <button className="h-8 px-3 rounded bg-[#117865] hover:bg-[#0E6352] text-white font-semibold flex items-center gap-1.5" data-agent="powerbi-new-item">
            <Add16Regular /> New item
          </button>
          <button className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
            <FolderAdd16Regular /> New folder
          </button>
          <button className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
            <ArrowImport16Regular /> Import <ChevronDown12Regular />
          </button>
          <button className="h-8 px-2.5 rounded hover:bg-[#F3F2F1] flex items-center gap-1.5">
            <ArrowSwap16Regular /> Migrate
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-[220px] rounded border border-[#D1D1D1] flex items-center gap-1.5 px-2 text-[#605E5C]">
              <Search16Regular />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by keyword" className="flex-1 text-[12.5px] outline-none text-[#242424]" aria-label="Filter by keyword" />
            </div>
            <button className="h-8 px-2 rounded hover:bg-[#F3F2F1] flex items-center gap-1">
              <Filter16Regular /> Filter
            </button>
            <button className="h-8 w-8 rounded bg-[#F0F0F0] flex items-center justify-center" aria-label="List view">
              <TextBulletListLtr16Regular />
            </button>
            <button className="h-8 w-8 rounded hover:bg-[#F3F2F1] flex items-center justify-center" aria-label="Lineage view">
              <Flowchart16Regular />
            </button>
          </div>
        </div>

        <ItemTable rows={rows} all={items} cols={['name', 'type', 'task', 'owner', 'refreshed', 'next', 'endorsement', 'sensitivity']} onOpen={openItem} />
      </div>
    </div>
  )
}
