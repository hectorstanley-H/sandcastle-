import { useMemo } from 'react'
import { UploadCloud, ArrowRight, Sparkles, LayoutTemplate, FileStack, ChevronRight } from 'lucide-react'
import { useCollection } from '@/db/db'
import { ME } from '@/data/people'
import type { Nav } from './index'
import { C, HWorkerChip, StartButton, StatusLabel, fmtD, fmtT, inInbox, isExpiring, isMine, isWaiting, type Envelope } from './shared'

export function Home({ nav }: { nav: Nav }) {
  const envs = useCollection<Envelope>('docusign.envelopes')
  const live = envs.filter((e) => !e.deleted)
  const counts = {
    action: live.filter((e) => e.status === 'action').length,
    waiting: live.filter((e) => isWaiting(e) && isMine(e)).length,
    expiring: live.filter(isExpiring).length,
    completed: live.filter((e) => e.status === 'completed' && +new Date(e.completedAt ?? e.lastChange) > Date.now() - 183 * 86400_000).length,
  }
  const recent = useMemo(
    () => [...live].filter((e) => e.status !== 'draft').sort((a, b) => +new Date(b.lastChange) - +new Date(a.lastChange)).slice(0, 8),
    [envs],
  )
  const tiles: [keyof typeof counts, string][] = [
    ['action', 'Action Required'],
    ['waiting', 'Waiting for Others'],
    ['expiring', 'Expiring Soon'],
    ['completed', 'Completed'],
  ]

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#F7F6FA]">
      {/* hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(100deg,#130032 0%,#26065E 55%,#3B0FA0 100%)' }}>
        <svg className="absolute right-0 top-0 h-full opacity-[0.18]" viewBox="0 0 600 260" preserveAspectRatio="xMaxYMid slice" aria-hidden>
          <circle cx="520" cy="40" r="180" fill="none" stroke="#FFCC22" strokeWidth="1.5" />
          <circle cx="520" cy="40" r="120" fill="none" stroke="#B7A6FF" strokeWidth="1.5" />
          <circle cx="520" cy="40" r="60" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>
        <div className="relative max-w-[1240px] mx-auto px-10 py-8 flex items-center gap-10">
          <div className="flex items-center gap-5 min-w-[330px]">
            <div className="w-[76px] h-[76px] rounded-full bg-[#FFCC22] text-[#130032] flex items-center justify-center text-[28px] font-bold">AM</div>
            <div className="text-white">
              <div className="text-[13px] text-[#CFC6F2]">Welcome back</div>
              <div className="text-[24px] font-semibold leading-tight">{ME.name}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="border-l-2 border-[#FFCC22] pl-2">
                  <div className="text-[10px] uppercase tracking-wide text-[#CFC6F2]">Signed by:</div>
                  <div className="text-[22px] leading-none text-white" style={{ fontFamily: "'Brush Script MT','Segoe Script','Lucida Handwriting',cursive" }}>
                    Alex Morgan
                  </div>
                </div>
                <div className="border-l-2 border-[#FFCC22] pl-2">
                  <div className="text-[10px] uppercase tracking-wide text-[#CFC6F2]">Initials</div>
                  <div className="text-[22px] leading-none text-white" style={{ fontFamily: "'Brush Script MT','Segoe Script','Lucida Handwriting',cursive" }}>
                    AM
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-px self-stretch bg-white/15" />
          <div className="flex-1">
            <div className="text-[13px] text-[#CFC6F2] mb-3">Last 6 Months</div>
            <div className="grid grid-cols-4 gap-6">
              {tiles.map(([k, label]) => (
                <button
                  key={k}
                  data-agent={`docusign-home-tile-${k}`}
                  aria-label={label}
                  onClick={() => nav.go({ page: 'agreements', folder: k })}
                  className="text-left group"
                >
                  <div className="text-[40px] font-semibold text-white leading-none group-hover:underline decoration-[#FFCC22] underline-offset-4">{counts[k]}</div>
                  <div className="text-[14px] text-white/90 mt-2">{label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-10 py-7 grid grid-cols-[1fr_320px] gap-6">
        <div className="min-w-0 space-y-6">
          {/* drop zone */}
          <div className="bg-white rounded-lg border border-[#E5E1EC] p-6">
            <div className="rounded-md border-2 border-dashed border-[#CBC4D6] bg-[#FBFAFD] px-6 py-8 flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-[#F0EBFF] flex items-center justify-center text-[#4C00FF] shrink-0">
                <UploadCloud size={28} />
              </div>
              <div className="flex-1">
                <div className="text-[18px] font-semibold">Drop documents here to get started</div>
                <div className="text-[14px] text-[#5E5873] mt-1">Sign or get signatures on PDF, Word, Excel and image files.</div>
              </div>
              <StartButton onSend={() => nav.send()} onTemplate={() => nav.go({ page: 'templates' })} />
            </div>
          </div>

          {/* activity */}
          <div className="bg-white rounded-lg border border-[#E5E1EC]">
            <div className="flex items-center justify-between px-6 h-[58px] border-b border-[#E5E1EC]">
              <div className="text-[17px] font-semibold">Agreement activity</div>
              <button onClick={() => nav.go({ page: 'agreements', folder: 'sent' })} className="text-[14px] font-semibold text-[#4C00FF] hover:underline flex items-center gap-1">
                View all <ArrowRight size={15} />
              </button>
            </div>
            {recent.map((e) => {
              const fresh = e.createdBy === 'hworker' && Date.now() - +new Date(e.createdAt) < 90_000
              const mineToSign = e.status === 'action'
              return (
                <button
                  key={e.id}
                  data-agent={`docusign-envelope-${e.id}`}
                  aria-label={e.subject}
                  onClick={() => nav.go({ page: 'details', id: e.id })}
                  className={`w-full grid grid-cols-[1fr_190px_110px] items-center gap-4 px-6 py-3.5 text-left border-b border-[#F0EDF4] last:border-0 hover:bg-[#FAF9FC] ${fresh ? 'flash-new' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-semibold truncate">{e.subject}</span>
                      {e.createdBy === 'hworker' && <HWorkerChip small />}
                    </div>
                    <div className="text-[13px] text-[#5E5873] truncate">
                      {isMine(e) ? `To: ${e.recipients.filter((r) => r.role !== 'cc' && r.email !== ME.email).map((r) => r.name).join(', ') || 'Me'}` : `From: ${e.senderName}`}
                    </div>
                  </div>
                  <div>
                    <StatusLabel e={e} small />
                    {mineToSign && <div className="text-[12px] text-[#5E5873] mt-0.5 pl-[22px]">Your signature is required</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-[13.5px]">{fmtD(e.lastChange)}</div>
                    <div className="text-[12px] text-[#8B8698]">{fmtT(e.lastChange)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-[#E5E1EC] p-5">
            <div className="text-[15px] font-semibold mb-3">Action required</div>
            {live
              .filter((e) => e.status === 'action')
              .map((e) => (
                <button key={e.id} onClick={() => nav.go({ page: 'details', id: e.id })} className="w-full text-left py-2.5 border-t border-[#F0EDF4] first:border-0 group">
                  <div className="text-[13.5px] font-semibold text-[#130032] group-hover:underline line-clamp-2">{e.subject.replace(/^(Please DocuSign|Complete with Docusign): /, '')}</div>
                  <div className="text-[12.5px] text-[#5E5873]">From {e.senderName} · {fmtD(e.sentAt)}</div>
                  <span className="mt-2 inline-flex h-8 px-4 items-center rounded-[4px] bg-[#FFCC22] text-[#130032] text-[13px] font-semibold">Sign</span>
                </button>
              ))}
          </div>
          <div className="bg-white rounded-lg border border-[#E5E1EC] p-5">
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles size={17} className="text-[#4C00FF]" /> Recommended for you
            </div>
            {[
              [LayoutTemplate, 'Save time with templates', 'Reuse your most common agreements, like the Contoso Order Form.', () => nav.go({ page: 'templates' })],
              [FileStack, 'Navigator', 'Find and analyze your completed agreements with AI-assisted search.', () => nav.go({ page: 'agreements', folder: 'completed' })],
            ].map(([I, t, d, fn]: any) => (
              <button key={t} onClick={fn} className="w-full mt-3 flex gap-3 text-left p-3 rounded-md bg-[#F7F6FA] hover:bg-[#F0EDF4]">
                <span className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-[#4C00FF] shrink-0 border border-[#E5E1EC]">
                  <I size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold">{t}</span>
                  <span className="block text-[12.5px] text-[#5E5873]">{d}</span>
                </span>
                <ChevronRight size={16} className="text-[#8B8698] self-center shrink-0" />
              </button>
            ))}
          </div>
          <div className="rounded-lg p-5 text-white" style={{ background: C.ink }}>
            <div className="text-[11px] uppercase tracking-wider text-[#FFCC22] font-semibold">Docusign IAM</div>
            <div className="text-[15px] font-semibold mt-1">Automate the full agreement lifecycle</div>
            <div className="text-[12.5px] text-white/75 mt-1">Connect Salesforce, Workday and more with Maestro workflows.</div>
            <button className="mt-3 text-[13px] font-semibold text-[#FFCC22] hover:underline">Learn more</button>
          </div>
        </div>
      </div>
    </div>
  )
}
