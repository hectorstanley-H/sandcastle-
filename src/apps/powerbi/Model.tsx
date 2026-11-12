import { useState } from 'react'
import { ArrowClockwise20Regular, CalendarClock20Regular, Database20Regular, Table20Regular, DataBarVertical20Regular, Share20Regular, CheckmarkCircle16Filled, ErrorCircle16Filled } from '@fluentui/react-icons'
import { useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { HWChip, ItemIcon, TYPE_LABEL, applyRefresh, dataSource, fmtDT, usePbi } from './shared'
import { ShareDialog } from './Report'
import { ExploreDialog, ScheduleDialog, createReportFrom } from './views'
import { person } from '@/data/people'

export function ModelView({ rec }: { rec: any }) {
  const all = useCollection('powerbi.reports')
  const { isAgent } = useDesk()
  const pbi = usePbi()
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<null | 'schedule' | 'share' | 'explore'>(null)
  const createReport = () => {
    if (!src || src === rec) return pbi.notify({ kind: 'info', title: 'Create report', body: 'This item has no data to build a report from yet.' })
    let n = `${rec.name} report`
    let k = 2
    while (all.some((r) => r.name === n)) n = `${rec.name} report (${k++})`
    pbi.openItem(createReportFrom(src, n, 'My workspace', isAgent))
  }
  const src = dataSource(rec, all)
  const history: any[] = src.history ?? []
  const refresh = () => {
    if (busy) return
    setBusy(true)
    const nid = pbi.notify({ kind: 'progress', title: 'Refresh in progress', body: rec.name }, 0)
    setTimeout(() => {
      applyRefresh(rec.id, isAgent)
      setBusy(false)
      pbi.dismiss(nid)
      pbi.notify({ kind: 'success', title: 'Refresh completed', body: rec.name })
    }, 2600)
  }
  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="px-8 pt-6 pb-4 border-b border-[#EDEBE9]">
        <div className="flex items-center gap-3">
          <ItemIcon type={rec.type} size={28} />
          <div className="text-[22px] font-semibold">{rec.name}</div>
          <span className="text-[12px] text-[#605E5C]">{TYPE_LABEL[rec.type]}</span>
          {src.refreshedBy === 'hworker' && <HWChip />}
        </div>
        <div className="flex items-center gap-1 mt-4">
          <button data-agent="powerbi-model-refresh" onClick={refresh} className="flex items-center gap-1.5 h-8 px-2.5 rounded hover:bg-[#F3F2F1] text-[13px]">
            <ArrowClockwise20Regular className={busy ? 'animate-spin text-[#0F6CBD]' : ''} /> Refresh now
          </button>
          {[
            [CalendarClock20Regular, 'Schedule refresh', () => setDialog('schedule')],
            [DataBarVertical20Regular, 'Create report', createReport],
            [Share20Regular, 'Share', () => setDialog('share')],
            [Table20Regular, 'Explore this data', () => setDialog('explore')],
          ].map(([I, l, fn]: any) => (
            <button key={l} data-agent={`powerbi-model-${l.toLowerCase().replace(/\s+/g, '-')}`} onClick={fn} className="flex items-center gap-1.5 h-8 px-2.5 rounded hover:bg-[#F3F2F1] text-[13px]">
              <I /> {l}
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 py-5 grid grid-cols-[1fr_360px] gap-8">
        <div>
          <div className="text-[15px] font-semibold mb-2">Refresh history</div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[#605E5C] border-b border-[#EDEBE9]">
                {['Type', 'Start', 'End', 'Status', 'Details'].map((h) => (
                  <th key={h} className="font-normal py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-[#F3F2F1]">
                  <td className="py-2">{h.type}</td>
                  <td>{fmtDT(h.start)}</td>
                  <td>{fmtDT(h.end)}</td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      {h.status === 'Completed' ? <CheckmarkCircle16Filled className="text-[#107C10]" /> : <ErrorCircle16Filled className="text-[#A4262C]" />}
                      {h.status}
                    </span>
                  </td>
                  <td className="text-[#605E5C] max-w-[360px] truncate">{h.by === 'hworker' ? <HWChip label="H-Worker" /> : h.error ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 text-[13px]">
          {[
            ['Owner', person(rec.owner).name],
            ['Workspace', rec.workspace],
            ['Storage', rec.storage ?? '—'],
            ['Gateway', rec.gateway ?? '—'],
            ['Last refresh', fmtDT(src.lastRefreshed)],
            ['Next refresh', fmtDT(src.nextRefresh)],
            ['Sensitivity', rec.sensitivity ?? 'General'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[12px] text-[#605E5C]">{k}</div>
              <div>{v}</div>
            </div>
          ))}
          {rec.tables && (
            <div>
              <div className="text-[12px] text-[#605E5C] mb-1">Tables</div>
              {rec.tables.map((t: string) => (
                <div key={t} className="flex items-center gap-2 h-7"><Database20Regular className="w-4 h-4 text-[#0F6CBD]" />{t}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      {dialog === 'schedule' && <ScheduleDialog rec={src === rec ? rec : src} onClose={() => setDialog(null)} onDone={(m) => pbi.notify({ kind: 'success', title: 'Refresh schedule updated', body: m })} />}
      {dialog === 'share' && <ShareDialog rec={rec} prefix="powerbi-model-share" onClose={() => setDialog(null)} />}
      {dialog === 'explore' && <ExploreDialog rec={rec} onClose={() => setDialog(null)} />}
    </div>
  )
}
