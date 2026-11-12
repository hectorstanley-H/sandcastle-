import { useEffect, useState } from 'react'
import { Inbox as InboxIcon, Filter, ArrowUpDown, CheckCircle2, UserPlus, Plane, Receipt, GraduationCap, FileText, HeartPulse, Briefcase } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { ME, person } from '@/data/people'
import { relative } from '@/data/time'
import { Avatar } from '@/components/Avatar'
import { Btn, HWorkerChip, Menu, Pill, textareaCls } from './ui'
import type { Nav } from './index'
import { fmtDays, fmtMDY } from './util'

const ICON: Record<string, any> = {
  'Hire Employee': UserPlus,
  'Request Time Off': Plane,
  'Expense Report': Receipt,
  'Required Learning': GraduationCap,
  'Benefit Change': HeartPulse,
  'Create Job Requisition': Briefcase,
}

export function InboxPage({ nav, initialTask }: { nav: Nav; initialTask?: string }) {
  const all = useCollection<any>('workday.tasks').filter((t) => t.assignee === ME.id)
  const [tab, setTab] = useState<'open' | 'done'>('open')
  const [proc, setProc] = useState('All Items')
  const [sort, setSort] = useState<'Newest' | 'Oldest' | 'Due Date'>('Newest')
  const [menu, setMenu] = useState<null | 'filter' | 'sort'>(null)
  const [comment, setComment] = useState('')
  const processes = Array.from(new Set(all.filter((t) => t.status === tab).map((t) => t.process as string))).sort()
  const list = all
    .filter((t) => t.status === tab && (proc === 'All Items' || t.process === proc))
    .sort((a, b) => (sort === 'Oldest' ? +new Date(a.receivedAt) - +new Date(b.receivedAt) : sort === 'Due Date' ? +new Date(a.due ?? '2999-01-01') - +new Date(b.due ?? '2999-01-01') : +new Date(b.receivedAt) - +new Date(a.receivedAt)))
  const [sel, setSel] = useState<string | undefined>(initialTask)
  useEffect(() => {
    if (initialTask) setSel(initialTask)
  }, [initialTask])
  const cur = all.find((t) => t.id === sel) ?? list[0]
  const timeoff = cur?.link?.requestId ? db.find<any>('workday.timeoff', cur.link.requestId) : null

  useEffect(() => setComment(''), [cur?.id])

  const complete = (verb: string) => {
    if (!cur) return
    db.update('workday.tasks', cur.id, { status: 'done', completedAt: new Date().toISOString(), outcome: verb, ...(comment.trim() ? { comment: comment.trim() } : {}) })
    if (timeoff && verb === 'Approved') db.update('workday.timeoff', timeoff.id, { status: 'Approved' })
    if (timeoff && (verb === 'Denied' || verb === 'Sent Back') && timeoff.status === 'Submitted') {
      // returning the request gives the hours back to the worker's balance
      const key = ({ Vacation: 'vacation', Sick: 'sick', 'Floating Holiday': 'floating' } as Record<string, string>)[timeoff.type]
      db.update('workday.timeoff', timeoff.id, { status: verb, decidedAt: new Date().toISOString(), decisionComment: comment.trim() || undefined })
      if (key) db.update('workday.workers', timeoff.workerId, (w) => ({ balances: { ...w.balances, [key]: Math.round(((w.balances?.[key] ?? 0) + timeoff.totalDays) * 10) / 10 } }))
    }
    if (cur.process === 'Expense Report') {
      const exp = cur.link?.expenseId ? db.find<any>('workday.expenses', cur.link.expenseId) : db.get<any>('workday.expenses').find((e) => cur.title.includes(e.number))
      if (exp) db.update('workday.expenses', exp.id, { status: verb === 'Approved' ? 'Approved' : verb })
    }
    if (cur.process === 'Create Job Requisition' && cur.link?.reqId) db.update('workday.requisitions', cur.link.reqId, { status: verb === 'Approved' ? 'Approved' : verb })
    setSel(undefined)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-10 pt-7 pb-4 flex items-center gap-3">
        <InboxIcon size={26} className="text-[#0875E1]" />
        <h1 className="text-[28px] font-bold">My Tasks</h1>
      </div>
      <div className="flex-1 min-h-0 flex gap-5 px-10 pb-8">
        <div className="w-[400px] shrink-0 bg-white rounded-2xl border border-[#E8EBED] flex flex-col min-h-0">
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#E8EBED]">
            {(['open', 'done'] as const).map((k) => (
              <button key={k} data-agent={`workday-inbox-tab-${k}`} onClick={() => setTab(k)} className={`relative h-11 px-3 text-[14px] font-bold ${tab === k ? 'text-[#005CB9]' : 'text-[#5E6A75]'}`}>
                {k === 'open' ? `Actions (${all.filter((t) => t.status === 'open').length})` : 'Archive'}
                {tab === k && <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-full bg-[#0875E1]" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F0F1F2]">
            <div className="relative">
              <button data-agent="workday-inbox-filter" onClick={() => setMenu(menu === 'filter' ? null : 'filter')} className={`h-8 px-3 rounded-full border text-[13px] font-bold flex items-center gap-1.5 ${proc !== 'All Items' ? 'border-[#0875E1] bg-[#D7EAFC] text-[#005CB9]' : 'border-[#A1AAB3]'}`}>
                <Filter size={14} /> {proc}
              </button>
              {menu === 'filter' && <Menu items={['All Items', ...processes].map((p) => ({ label: p, onClick: () => setProc(p) }))} onClose={() => setMenu(null)} className="top-9 left-0" />}
            </div>
            <div className="relative">
              <button data-agent="workday-inbox-sort" onClick={() => setMenu(menu === 'sort' ? null : 'sort')} className="h-8 px-3 rounded-full border border-[#A1AAB3] text-[13px] font-bold flex items-center gap-1.5">
                <ArrowUpDown size={14} /> {sort}
              </button>
              {menu === 'sort' && <Menu items={(['Newest', 'Oldest', 'Due Date'] as const).map((p) => ({ label: p, onClick: () => setSort(p) }))} onClose={() => setMenu(null)} className="top-9 left-0" />}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {list.map((t) => {
              const I = ICON[t.process] ?? FileText
              const active = cur?.id === t.id
              return (
                <button key={t.id} data-agent={`workday-inbox-item-${t.id}`} onClick={() => setSel(t.id)} className={`w-full text-left flex gap-3 px-4 py-3 border-b border-[#F0F1F2] ${active ? 'bg-[#D7EAFC]' : 'hover:bg-[#F6F7F8]'}`}>
                  <span className="w-9 h-9 rounded-full bg-white border border-[#DFE2E6] flex items-center justify-center text-[#005CB9] shrink-0">
                    <I size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold leading-snug">{t.title}</div>
                    <div className="text-[12.5px] text-[#5E6A75] mt-0.5 truncate">{t.step}</div>
                    <div className="text-[12px] text-[#5E6A75] mt-0.5">{relative(t.receivedAt)}</div>
                  </div>
                </button>
              )
            })}
            {!list.length && <div className="p-6 text-[14px] text-[#5E6A75]">No items.</div>}
          </div>
        </div>
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-[#E8EBED] overflow-auto">
          {cur ? (
            <div className="p-8" data-agent="workday-inbox-detail">
              <div className="text-[13px] font-bold text-[#5E6A75] uppercase tracking-wide">{cur.process}</div>
              <h2 className="text-[24px] font-bold mt-1 leading-tight">{cur.title}</h2>
              <div className="flex items-center gap-3 mt-3 text-[13.5px] text-[#5E6A75]">
                <Avatar id={cur.fromId} size={28} />
                <span>
                  From <b className="text-[#333]">{person(cur.fromId).name}</b> · {relative(cur.receivedAt)}
                </span>
                {cur.due && <Pill tone="orange">Due {fmtMDY(cur.due)}</Pill>}
                {cur.status === 'done' && <Pill tone="green">{cur.outcome ?? 'Completed'}</Pill>}
                {cur.updatedBy === 'hworker' && <HWorkerChip text="Completed by H-Worker" />}
              </div>
              <div className="mt-6 rounded-xl border border-[#E8EBED] p-5 text-[14px] space-y-2">
                <div>
                  <span className="text-[#5E6A75]">Step: </span>
                  <b>{cur.step}</b>
                </div>
                {cur.process === 'Hire Employee' && <div className="text-[#333] leading-relaxed">Jordan Ellis accepted the offer for <b>Operations Analyst</b> in Operations (Alex Morgan). As hiring manager, confirm the position, hire date and compensation, then assign onboarding tasks so Jordan is ready on day one.</div>}
                {timeoff && (
                  <div className="leading-relaxed">
                    {timeoff.type} · {fmtMDY(timeoff.days[0].date)}
                    {timeoff.days.length > 1 ? ` – ${fmtMDY(timeoff.days[timeoff.days.length - 1].date)}` : ''} · <b>{fmtDays(timeoff.totalDays)}</b>
                    {timeoff.comment && <div className="text-[#5E6A75]">“{timeoff.comment}”</div>}
                  </div>
                )}
                {cur.process === 'Expense Report' && <div>{expenseText(cur)}</div>}
                {cur.process === 'Request Compensation Change' && <div>Compensation change proposed by {person(cur.fromId).name}. Review the worker’s Compensation tab before approving.</div>}
                {cur.process === 'Create Job Requisition' && <div>New requisition for the Operations supervisory organization. Approving releases it to Recruiting for posting in Greenhouse.</div>}
                {cur.process === 'Performance Review' && <div>Complete the manager evaluation for the 2026 Mid-Year Review on Team Performance, or open the task to mark it complete.</div>}
                {cur.comment && (
                  <div className="text-[#5E6A75]">
                    Comment: <span className="text-[#333]">“{cur.comment}”</span>
                  </div>
                )}
              </div>
              {cur.status === 'open' && cur.process !== 'Hire Employee' && (
                <div className="mt-4">
                  <div className="text-[13.5px] font-medium mb-1.5">Comment</div>
                  <textarea aria-label="Comment for this task" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional — visible to the initiator" className={textareaCls + ' h-20'} />
                </div>
              )}
              {cur.status === 'open' && (
                <div className="flex gap-3 mt-6">
                  {cur.process === 'Hire Employee' ? (
                    <Btn variant="primary" agent="workday-inbox-open" onClick={() => nav({ page: 'onboarding', workerId: cur.link?.workerId ?? 'wd-jordan' })}>
                      Open Task
                    </Btn>
                  ) : ['Request Time Off', 'Expense Report', 'Create Job Requisition'].includes(cur.process) ? (
                    <>
                      <Btn variant="primary" agent="workday-inbox-approve" onClick={() => complete('Approved')}>
                        Approve
                      </Btn>
                      <Btn agent="workday-inbox-sendback" onClick={() => complete('Sent Back')}>Send Back</Btn>
                      <Btn agent="workday-inbox-deny" onClick={() => complete('Denied')}>Deny</Btn>
                    </>
                  ) : (
                    <>
                      <Btn variant="primary" onClick={() => (cur.process === 'Benefit Change' ? nav({ page: 'benefits' }) : complete('Completed'))}>
                        Open Task
                      </Btn>
                      {cur.process === 'Required Learning' && <Btn onClick={() => nav({ page: 'learning' })}>Go to Learning</Btn>}
                      {cur.process === 'Performance Review' && <Btn onClick={() => nav({ page: 'performance' })}>Go to Team Performance</Btn>}
                      {cur.process === 'Request Compensation Change' && cur.link?.workerId && <Btn onClick={() => nav({ page: 'worker', workerId: cur.link.workerId, tab: 'compensation' })}>View Worker</Btn>}
                    </>
                  )}
                </div>
              )}
              {cur.status === 'done' && (
                <div className="mt-6 flex items-center gap-2 text-[14px] text-[#1E6F34] font-bold">
                  <CheckCircle2 size={18} /> Completed {cur.completedAt ? relative(cur.completedAt) : ''}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[14px] text-[#5E6A75]">Select an item</div>
          )}
        </div>
      </div>
    </div>
  )
}

function expenseText(t: any) {
  const e = t.link?.expenseId ? db.find<any>('workday.expenses', t.link.expenseId) : db.get<any>('workday.expenses').find((x) => t.title.includes(x.number))
  if (!e) return 'Client dinner and mileage — Chicago site visit. 3 expense lines, all within policy.'
  return `${e.memo} — ${e.lines?.length ?? 0} expense line${e.lines?.length === 1 ? '' : 's'}: ${(e.lines ?? []).map((l: any) => `${l.category} at ${l.merchant} ($${Number(l.amount).toFixed(2)})`).join(', ')}.`
}
