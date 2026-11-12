import { useState } from 'react'
import {
  Search20Regular,
  Comment20Regular,
  ArrowLeft20Regular,
  Home20Regular,
  DocumentAdd20Regular,
  FolderOpen20Regular,
  Info20Regular,
  SaveCopy20Regular,
  Print20Regular,
  Share20Filled,
  ArrowExportUp20Regular,
  Dismiss20Regular,
  Person20Regular,
  Settings20Regular,
  Pin16Regular,
  Pin16Filled,
  DocumentPdf20Regular,
  DocumentTable20Regular,
} from '@fluentui/react-icons'
import { logoUrl } from '@/os/registry'
import { WindowControls } from '@/os/Window'
import { Avatar } from '@/components/Avatar'
import { ME, person } from '@/data/people'
import { fmtSmart } from '@/data/time'
import { workbookStats } from './ops'
import type { XWorkbook } from './types'

const GREEN = '#107C41'
type Pane = 'home' | 'open' | 'info' | 'saveCopy' | 'print' | 'export' | 'account' | 'feedback' | 'options' | 'newAll'

const TEMPLATES: [string, string][] = [
  ['Welcome to Excel', '#107C41'],
  ['Formula tutorial', '#185C37'],
  ['Make your first PivotTable', '#21A366'],
  ['Monthly budget', '#33C481'],
  ['Project tracker', '#0E5C2F'],
]

const isPinned = (w: XWorkbook) => w.pinned ?? w.id === 'wb-vendor-spend'

export function Backstage({
  workbooks,
  current,
  onOpen,
  onNew,
  onBack,
  onTemplate,
  onSaveCopy,
  onPin,
  onCloseWb,
  onShare,
  toast,
}: {
  workbooks: XWorkbook[]
  current?: XWorkbook
  onOpen: (id: string) => void
  onNew: () => void
  onBack?: () => void
  onTemplate: (kind: string) => void
  onSaveCopy: (name: string) => void
  onPin: (id: string, pinned: boolean) => void
  onCloseWb: () => void
  onShare: () => void
  toast: (title: string, body?: string) => void
}) {
  const [pivot, setPivot] = useState<'recent' | 'pinned' | 'shared'>('recent')
  const [pane, setPane] = useState<Pane>('home')
  const [q, setQ] = useState('')
  const [copyName, setCopyName] = useState(current ? `${current.name.replace(/\.xlsx$/i, '')} - Copy` : 'Book - Copy')
  const [copies, setCopies] = useState(1)
  const [orient, setOrient] = useState<'Portrait' | 'Landscape'>('Portrait')
  const [fb, setFb] = useState('')
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const list = [...workbooks].sort((a, b) => +new Date(b.modified) - +new Date(a.modified)).filter((w) => !q || w.name.toLowerCase().includes(q.toLowerCase()))
  const nav: [any, string, string?, Pane?][] = [
    [Home20Regular, 'Home', undefined, 'home'],
    [DocumentAdd20Regular, 'New', 'excel-backstage-new'],
    [FolderOpen20Regular, 'Open', 'excel-backstage-open', 'open'],
    [Info20Regular, 'Info', 'excel-backstage-info', 'info'],
    [SaveCopy20Regular, 'Save a Copy', 'excel-backstage-save-copy', 'saveCopy'],
    [Print20Regular, 'Print', 'excel-backstage-print', 'print'],
    [Share20Filled, 'Share', 'excel-backstage-share'],
    [ArrowExportUp20Regular, 'Export', 'excel-backstage-export', 'export'],
    [Dismiss20Regular, 'Close'],
  ]
  const needsWb = (p?: Pane) => p === 'info' || p === 'saveCopy' || p === 'print' || p === 'export'

  const fileList = (
    <>
      <div className="flex items-center gap-6 mt-6 border-b border-[#E1E1E1] text-[13.5px]">
        {(['recent', 'pinned', 'shared'] as const).map((p) => (
          <button key={p} onClick={() => setPivot(p)} className={`relative h-9 ${pivot === p ? 'font-semibold' : 'text-[#424242]'}`}>
            {p === 'recent' ? 'Recent' : p === 'pinned' ? 'Pinned' : 'Shared with Me'}
            {pivot === p && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full" style={{ background: GREEN }} />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_260px_160px] text-[12px] text-[#616161] h-9 items-center px-2">
        <span>Name</span>
        <span>Location</span>
        <span>Date modified</span>
      </div>
      {list
        .filter((w) => (pivot === 'pinned' ? isPinned(w) : pivot === 'shared' ? w.author !== ME.id : true))
        .map((w) => (
          <button key={w.id} data-agent={`excel-workbook-${w.id}`} onClick={() => onOpen(w.id)} className="group w-full grid grid-cols-[1fr_260px_160px] items-center h-12 px-2 rounded hover:bg-[#F5F5F5] text-left">
            <span className="flex items-center gap-3 min-w-0">
              <img src={logoUrl('excel')} className="w-6 h-6" alt="" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] truncate">
                  {w.name}
                  {isPinned(w) && <Pin16Regular className="inline ml-1.5 text-[#616161] w-3.5 h-3.5" />}
                </span>
                <span className="block text-[11.5px] text-[#616161]">
                  {w.author === ME.id ? 'You' : person(w.author).name} {w.updatedBy === 'hworker' ? '· edited by H-Worker' : ''}
                </span>
              </span>
              <span
                role="button"
                aria-label={isPinned(w) ? 'Unpin from list' : 'Pin to list'}
                title={isPinned(w) ? 'Unpin from list' : 'Pin to list'}
                onClick={(e) => {
                  e.stopPropagation()
                  onPin(w.id, !isPinned(w))
                }}
                className="mr-3 w-7 h-7 rounded flex items-center justify-center text-[#616161] opacity-0 group-hover:opacity-100 hover:bg-[#E6E6E6]"
              >
                {isPinned(w) ? <Pin16Filled /> : <Pin16Regular />}
              </span>
            </span>
            <span className="text-[12.5px] text-[#616161] truncate">OneDrive - Northwind Global › Documents</span>
            <span className="text-[12.5px] text-[#616161]">{fmtSmart(w.modified)}</span>
          </button>
        ))}
    </>
  )

  const templateTile = (t: string, c: string) => (
    <button key={t} data-agent={`excel-template-${t.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => onTemplate(t)} className="group text-left">
      <div className="w-[150px] h-[110px] border border-[#D1D1D1] group-hover:border-[#107C41] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${c} 0 38%, #fff 38%)` }}>
        <div className="absolute right-3 bottom-3 left-[44%] top-[44%] grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-[#E6F2EA] rounded-[1px]" />
          ))}
        </div>
        <div className="absolute left-3 top-3 text-white text-[11px] font-semibold w-[60px] leading-tight">{t}</div>
      </div>
      <div className="text-[12.5px] mt-1.5 w-[150px] truncate">{t}</div>
    </button>
  )

  return (
    <div className="flex-1 min-h-0 flex bg-white" style={{ fontFamily: 'var(--font-win)' }}>
      <div className="w-[208px] shrink-0 flex flex-col text-white" style={{ background: '#0E5C2F' }}>
        <div data-drag-handle className="h-10 flex items-center">
          {onBack && (
            <button aria-label="Back" onClick={onBack} data-agent="excel-backstage-back" className="w-10 h-10 flex items-center justify-center hover:bg-white/10" data-no-drag>
              <ArrowLeft20Regular />
            </button>
          )}
          <img src={logoUrl('excel')} className="w-5 h-5 ml-3" alt="" />
          <span className="ml-2 text-[13px] font-semibold">Excel</span>
        </div>
        <div className="mt-2 flex flex-col">
          {nav.map(([I, l, agent, p]) => {
            const disabled = needsWb(p) && !current
            return (
              <button
                key={l}
                data-agent={agent}
                disabled={disabled}
                onClick={l === 'New' ? onNew : l === 'Close' && onBack ? onBack : l === 'Close' ? onCloseWb : l === 'Share' ? (current ? onShare : undefined) : p ? () => setPane(p) : undefined}
                className={`flex items-center gap-3 h-10 px-5 text-[13.5px] text-left disabled:opacity-50 ${pane === p ? 'bg-white/15' : 'hover:bg-white/10'}`}
              >
                <I className="w-[18px] h-[18px]" /> {l}
              </button>
            )
          })}
        </div>
        <div className="flex-1" />
        {(
          [
            [Person20Regular, 'Account', 'account'],
            [Comment20Regular, 'Feedback', 'feedback'],
            [Settings20Regular, 'Options', 'options'],
          ] as [any, string, Pane][]
        ).map(([I, l, p]) => (
          <button key={l} onClick={() => setPane(p)} className={`flex items-center gap-3 h-10 px-5 text-[13.5px] ${pane === p ? 'bg-white/15' : 'hover:bg-white/10'}`}>
            <I className="w-[18px] h-[18px]" /> {l}
          </button>
        ))}
        <div className="h-3" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div data-drag-handle className="h-10 shrink-0 flex items-center justify-end">
          <span className="text-[12.5px] text-[#424242] mr-2">{ME.name}</span>
          <Avatar id={ME.id} size={26} className="mr-2" />
          <WindowControls height={40} />
        </div>
        <div className="flex-1 overflow-auto px-12 pb-10">
          {pane === 'home' && (
            <>
              <h1 className="text-[28px] font-semibold text-[#242424] mt-2">{greet}</h1>
              <div className="flex items-center gap-2 mt-6 mb-3">
                <div className="text-[15px] font-semibold">New</div>
              </div>
              <div className="flex gap-5">
                <button data-agent="excel-new-workbook" onClick={onNew} className="group text-left">
                  <div className="w-[150px] h-[110px] border border-[#D1D1D1] group-hover:border-[#107C41] bg-white relative overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-5 grid-rows-6">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="border-r border-b border-[#EDEDED]" />
                      ))}
                    </div>
                    <div className="absolute left-[30px] top-[18px] w-[31px] h-[19px] border-2 border-[#107C41]" />
                  </div>
                  <div className="text-[12.5px] mt-1.5">Blank workbook</div>
                </button>
                {TEMPLATES.map(([t, c]) => templateTile(t, c))}
              </div>
              <div className="flex items-center justify-end mt-2 text-[12.5px] font-semibold">
                <button onClick={() => setPane('newAll')} className="hover:underline" style={{ color: GREEN }}>
                  More templates →
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 h-9 max-w-[640px] rounded-md border border-[#C7C7C7] px-3 text-[13px] focus-within:border-[#107C41]">
                <Search20Regular className="w-4 h-4 text-[#8A8886]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search workbooks" className="flex-1 outline-none bg-transparent" />
              </div>
              {fileList}
            </>
          )}
          {pane === 'newAll' && (
            <>
              <h1 className="text-[28px] font-semibold text-[#242424] mt-2">New</h1>
              <div className="flex flex-wrap gap-5 mt-6">
                <button onClick={onNew} className="group text-left">
                  <div className="w-[150px] h-[110px] border border-[#D1D1D1] group-hover:border-[#107C41] bg-white" />
                  <div className="text-[12.5px] mt-1.5">Blank workbook</div>
                </button>
                {TEMPLATES.map(([t, c]) => templateTile(t, c))}
              </div>
            </>
          )}
          {pane === 'open' && (
            <>
              <h1 className="text-[28px] font-semibold text-[#242424] mt-2">Open</h1>
              <div className="mt-4 flex items-center gap-2 h-9 max-w-[640px] rounded-md border border-[#C7C7C7] px-3 text-[13px] focus-within:border-[#107C41]">
                <Search20Regular className="w-4 h-4 text-[#8A8886]" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workbooks" aria-label="Search workbooks" className="flex-1 outline-none bg-transparent" />
              </div>
              {fileList}
            </>
          )}
          {pane === 'info' && current && (
            <div className="mt-2 max-w-[760px]">
              <h1 className="text-[28px] font-semibold text-[#242424]">Info</h1>
              <div className="text-[18px] mt-4">{current.name}</div>
              <div className="text-[12.5px] text-[#616161]">OneDrive - Northwind Global › Documents</div>
              <div className="grid grid-cols-[1fr_260px] gap-10 mt-6">
                <div className="space-y-4 text-[13px]">
                  <div className="rounded-md border border-[#E1E1E1] p-4">
                    <div className="font-semibold mb-1">Protect Workbook</div>
                    <div className="text-[#616161]">{current.sheets.some((s) => s.protected) ? `Protected sheets: ${current.sheets.filter((s) => s.protected).map((s) => s.name).join(', ')}` : 'Control what types of changes people can make to this workbook. Use Review ▸ Protect Sheet.'}</div>
                  </div>
                  <div className="rounded-md border border-[#E1E1E1] p-4">
                    <div className="font-semibold mb-1">Inspect Workbook</div>
                    {(() => {
                      const st = workbookStats(current)
                      return (
                        <div className="text-[#616161]">
                          {st.sheets} sheets · {st.cells} cells with data · {st.formulas} formulas · {st.tables} tables · {st.charts} charts · {st.comments} comments
                        </div>
                      )
                    })()}
                  </div>
                  <div className="rounded-md border border-[#E1E1E1] p-4">
                    <div className="font-semibold mb-1">Version History</div>
                    <div className="text-[#616161]">Last saved {fmtSmart(current.modified)}{current.updatedBy === 'hworker' ? ' by H-Worker' : ''}.</div>
                  </div>
                </div>
                <div className="text-[12.5px] space-y-2">
                  <div className="font-semibold text-[13.5px]">Properties</div>
                  {[
                    ['Size', `${Math.max(12, Math.round(JSON.stringify(current).length / 1024))} KB`],
                    ['Title', current.name.replace(/\.xlsx$/i, '')],
                    ['Last Modified', fmtSmart(current.modified)],
                    ['Author', current.author === ME.id ? ME.name : person(current.author).name],
                    ['Shared with', current.sharedWith?.length ? `${current.sharedWith.length} people` : 'Only you'],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[100px_1fr]">
                      <span className="text-[#616161]">{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {pane === 'saveCopy' && current && (
            <div className="mt-2 max-w-[560px]">
              <h1 className="text-[28px] font-semibold text-[#242424]">Save a Copy</h1>
              <div className="text-[13px] text-[#616161] mt-4 mb-2">OneDrive - Northwind Global › Documents</div>
              <div className="flex items-center gap-2">
                <input data-agent="excel-save-copy-name" value={copyName} onChange={(e) => setCopyName(e.target.value)} className="flex-1 h-9 px-2 rounded border border-[#C7C7C7] outline-none focus:border-[#107C41] text-[13px]" />
                <span className="text-[13px] text-[#616161]">.xlsx</span>
                <button data-agent="excel-save-copy" disabled={!copyName.trim()} onClick={() => onSaveCopy(copyName.trim())} className="h-9 px-4 rounded text-white text-[13px] font-semibold disabled:opacity-50" style={{ background: GREEN }}>
                  Save
                </button>
              </div>
            </div>
          )}
          {pane === 'print' && current && (
            <div className="mt-2 flex gap-10">
              <div className="w-[260px] shrink-0 space-y-3 text-[13px]">
                <h1 className="text-[28px] font-semibold text-[#242424]">Print</h1>
                <label className="block">
                  <span className="block text-[12px] font-semibold mb-1">Copies</span>
                  <input type="number" min={1} value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} className="w-20 h-8 px-2 rounded border border-[#C7C7C7]" />
                </label>
                <label className="block">
                  <span className="block text-[12px] font-semibold mb-1">Printer</span>
                  <select className="w-full h-8 px-2 rounded border border-[#C7C7C7]">
                    <option>NW-BOS-4F-MFP01 (Ready)</option>
                    <option>Microsoft Print to PDF</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[12px] font-semibold mb-1">Orientation</span>
                  <select value={orient} onChange={(e) => setOrient(e.target.value as any)} className="w-full h-8 px-2 rounded border border-[#C7C7C7]">
                    <option>Portrait</option>
                    <option>Landscape</option>
                  </select>
                </label>
                <button
                  data-agent="excel-print"
                  onClick={() => toast('Sent to printer', `${copies} ${copies === 1 ? 'copy' : 'copies'} of “${current.name}” sent to NW-BOS-4F-MFP01.`)}
                  className="h-9 px-6 rounded text-white font-semibold"
                  style={{ background: GREEN }}
                >
                  Print
                </button>
              </div>
              <div className="flex-1 flex items-start justify-center pt-4">
                <div className="bg-white shadow-[0_2px_10px_rgba(0,0,0,0.2)] p-6 overflow-hidden" style={orient === 'Portrait' ? { width: 340, height: 440 } : { width: 440, height: 340 }}>
                  <div className="text-[9px] text-[#616161] mb-2">{current.sheets[0]?.name}</div>
                  <table className="text-[8px] border-collapse">
                    <tbody>
                      {Array.from({ length: 24 }, (_, r) => (
                        <tr key={r}>
                          {Array.from({ length: orient === 'Portrait' ? 5 : 7 }, (_, c) => {
                            const cell = current.sheets[0]?.cells[`${'ABCDEFG'[c]}${r + 1}`]
                            return (
                              <td key={c} className="px-1 h-[13px] max-w-[64px] truncate" style={{ fontWeight: cell?.bold ? 700 : 400 }}>
                                {cell?.v !== undefined ? String(cell.v) : cell?.f ? '…' : ''}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {pane === 'export' && current && (
            <div className="mt-2 max-w-[560px]">
              <h1 className="text-[28px] font-semibold text-[#242424]">Export</h1>
              {[
                [DocumentPdf20Regular, 'Download as PDF', 'pdf', '#D13438'],
                [DocumentTable20Regular, 'Download as CSV (UTF-8)', 'csv', GREEN],
                [ArrowExportUp20Regular, 'Download as ODS', 'ods', '#424242'],
              ].map(([I, l, ext, c]: any) => (
                <button key={ext} onClick={() => toast('Download complete', `${current.name.replace(/\.xlsx$/i, '')}.${ext} was saved to Downloads.`)} className="mt-3 w-full flex items-center gap-3 h-14 px-4 rounded border border-[#E1E1E1] hover:bg-[#F5F5F5] text-left text-[13.5px]">
                  <I style={{ color: c }} /> {l}
                </button>
              ))}
            </div>
          )}
          {pane === 'account' && (
            <div className="mt-2 max-w-[560px] text-[13px]">
              <h1 className="text-[28px] font-semibold text-[#242424]">Account</h1>
              <div className="flex items-center gap-3 mt-6">
                <Avatar id={ME.id} size={48} />
                <div>
                  <div className="text-[15px] font-semibold">{ME.name}</div>
                  <div className="text-[#616161]">{ME.email}</div>
                </div>
              </div>
              <div className="mt-6 font-semibold">Product Information</div>
              <div className="text-[#616161]">Microsoft 365 Apps for enterprise · Excel for the web · Northwind Global</div>
              <div className="mt-4 font-semibold">Connected Services</div>
              <div className="text-[#616161]">OneDrive - Northwind Global · SharePoint</div>
            </div>
          )}
          {pane === 'feedback' && (
            <div className="mt-2 max-w-[560px] text-[13px]">
              <h1 className="text-[28px] font-semibold text-[#242424]">Feedback</h1>
              <textarea value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Tell us what you like, what you don’t, or what you’d like to see" className="mt-6 w-full h-[120px] rounded border border-[#C7C7C7] p-2 outline-none focus:border-[#107C41]" />
              <button
                disabled={!fb.trim()}
                onClick={() => {
                  toast('Thanks for your feedback', 'Your feedback was sent to Microsoft.')
                  setFb('')
                }}
                className="mt-2 h-8 px-4 rounded text-white font-semibold disabled:opacity-50"
                style={{ background: GREEN }}
              >
                Submit
              </button>
            </div>
          )}
          {pane === 'options' && (
            <div className="mt-2 max-w-[560px] text-[13px] space-y-3">
              <h1 className="text-[28px] font-semibold text-[#242424]">Options</h1>
              <div className="font-semibold mt-4">General</div>
              <div className="grid grid-cols-[180px_1fr] gap-y-2">
                <span className="text-[#616161]">User name</span>
                <span>{ME.name}</span>
                <span className="text-[#616161]">Default font</span>
                <span>Aptos Narrow, 11</span>
                <span className="text-[#616161]">Calculation</span>
                <span>Automatic (change it on Formulas ▸ Calculation Options)</span>
                <span className="text-[#616161]">Language</span>
                <span>English (United States)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
