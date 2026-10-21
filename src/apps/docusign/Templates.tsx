import { useState } from 'react'
import { Search, Star, Users, User, Folder, LayoutTemplate, ChevronDown, Plus, Trash2, Share2 } from 'lucide-react'
import { useCollection } from '@/db/db'
import { ME } from '@/data/people'
import type { Nav } from './index'
import { fmtD, fmtT, type Template } from './shared'
import { DocThumb } from './Document'

export function Templates({ nav }: { nav: Nav }) {
  const tpls = useCollection<Template>('docusign.templates')
  const [q, setQ] = useState('')
  const [folder, setFolder] = useState('all')
  const rows = tpls
    .filter((t) => folder === 'all' || (folder === 'mine' ? t.owner === ME.name : folder === 'shared' ? t.shared : folder === 'fav' ? t.uses > 100 : true))
    .filter((t) => !q || (t.name + t.description).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  const side: [string, string, any][] = [
    ['all', 'All Templates', LayoutTemplate],
    ['mine', 'My Templates', User],
    ['shared', 'Shared with Me', Users],
    ['fav', 'Favorites', Star],
    ['deleted', 'Deleted', Trash2],
  ]
  return (
    <div className="flex-1 min-h-0 flex">
      <aside className="w-[248px] shrink-0 border-r border-[#E5E1EC] py-5 px-4 overflow-auto">
        <button className="w-full h-10 rounded-[4px] bg-[#4C00FF] text-white text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-[#3A00C4]">
          <Plus size={18} /> Create Template
        </button>
        <div className="mt-6 px-2 mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8B8698]">Envelope Templates</div>
        {side.map(([k, l, I]) => (
          <button
            key={k}
            data-agent={`docusign-tplfolder-${k}`}
            onClick={() => setFolder(k)}
            className={`w-full flex items-center gap-3 h-9 px-2 rounded-[4px] text-[14px] ${folder === k ? 'bg-[#F0EBFF] font-semibold' : 'text-[#3D3551] hover:bg-[#F5F3F8]'}`}
          >
            <I size={17} className={folder === k ? 'text-[#4C00FF]' : 'text-[#5E5873]'} /> {l}
          </button>
        ))}
        <div className="mt-6 px-2 mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8B8698]">Folders</div>
        {['Sales / Renewals', 'Legal', 'HR', 'Procurement', 'Operations', 'Finance'].map((f) => (
          <div key={f} className="flex items-center gap-3 h-9 px-2 text-[14px] text-[#3D3551]">
            <Folder size={17} className="text-[#5E5873]" /> {f}
          </div>
        ))}
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="px-8 pt-6 pb-4 flex items-center gap-4 shrink-0">
          <h1 className="text-[24px] font-semibold tracking-tight">{side.find((s) => s[0] === folder)?.[1]}</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-2 w-[320px] h-9 px-3 rounded-[4px] border border-[#CBC4D6]">
            <Search size={16} className="text-[#5E5873]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search All Templates" aria-label="Search templates" className="flex-1 outline-none text-[14px]" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-8 pb-8">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-[12.5px] font-semibold text-[#5E5873] border-b border-[#CBC4D6]">
                <th className="py-2.5 w-10" />
                <th className="py-2.5">Name</th>
                <th className="py-2.5 w-[170px]">Owner</th>
                <th className="py-2.5 w-[150px]">Last Change ↓</th>
                <th className="py-2.5 w-[130px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} data-agent={`docusign-tplrow-${t.id}`} className="border-b border-[#E5E1EC] hover:bg-[#FAF9FC]">
                  <td className="py-3">
                    <Star size={17} className={t.uses > 100 ? 'fill-[#FFCC22] text-[#E0B400]' : 'text-[#CBC4D6]'} />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <DocThumb file={t.documents[0].name} width={34} />
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-semibold truncate">{t.name}</div>
                        <div className="text-[12.5px] text-[#5E5873] truncate">
                          {t.folder} · {t.documents[0].name} · {t.roles.length} role{t.roles.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-[13.5px]">
                    <div className="flex items-center gap-1.5">
                      {t.shared && <Share2 size={13} className="text-[#8B8698]" />}
                      {t.owner}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="text-[13.5px]">{fmtD(t.updatedAt)}</div>
                    <div className="text-[12px] text-[#8B8698]">{fmtT(t.updatedAt)}</div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex">
                      <button
                        data-agent={`docusign-use-${t.id}`}
                        aria-label={`Use ${t.name}`}
                        onClick={() => nav.send(t.id)}
                        className="h-8 px-4 text-[13px] font-semibold rounded-l-[4px] border border-[#CBC4D6] hover:bg-[#F5F3F8]"
                      >
                        Use
                      </button>
                      <button className="h-8 w-8 flex items-center justify-center rounded-r-[4px] border border-l-0 border-[#CBC4D6] hover:bg-[#F5F3F8]" aria-label="More">
                        <ChevronDown size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
