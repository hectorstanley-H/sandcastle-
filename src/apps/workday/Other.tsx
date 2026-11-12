import { useState } from 'react'
import { DollarSign, HeartPulse, TrendingUp, LayoutGrid, Download, Receipt, GraduationCap, Briefcase, BookUser, MessageSquareHeart, Target, Network, UserSearch, Plane, LifeBuoy, FileText, Landmark } from 'lucide-react'
import { db, useCollection } from '@/db/db'
import { useDesk } from '@/os/context'
import { Avatar } from '@/components/Avatar'
import { ME } from '@/data/people'
import { money } from '@/data/time'
import { Btn, Card, Pill, AppIcon, Modal, Success, inputCls, textareaCls } from './ui'
import type { Nav, Route } from './index'
import { TOP_APPS } from './Home'
import { fmtMDY } from './util'

function Head({ icon, color, title, sub }: { icon: any; color: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 mb-7">
      <AppIcon icon={icon} color={color} size={48} />
      <div>
        <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
        <div className="text-[14px] text-[#5E6A75]">{sub}</div>
      </div>
    </div>
  )
}

/* ─────────────── Pay ─────────────── */

/** gross 5,500 semi-monthly → deductions that add up to the net shown in the table */
function breakdown(gross: number, net: number) {
  const pre = [
    ['401(k) Pre-Tax (6%)', gross * 0.06],
    ['Medical — Aetna POS II', 186.4],
    ['Dental — Delta PPO', 18.2],
    ['Vision — VSP', 4.1],
    ['HSA Employee Contribution', 150],
  ] as [string, number][]
  const preTotal = pre.reduce((n, [, v]) => n + v, 0)
  const taxable = gross - preTotal
  const ss = gross * 0.062
  const med = gross * 0.0145
  const state = taxable * 0.05
  const fed = gross - preTotal - ss - med - state - net
  const taxes = [
    ['Federal Withholding', fed],
    ['Social Security (OASDI)', ss],
    ['Medicare', med],
    ['MA State Tax', state],
  ] as [string, number][]
  return { pre, taxes, taxable }
}

export function PayPage() {
  const { toast } = useDesk()
  const y = new Date().getFullYear()
  const elections = useCollection<any>('workday.payelections').find((e) => e.id === 'pe-alex')
  const [slip, setSlip] = useState<any | null>(null)
  const [w2, setW2] = useState(false)
  const [pe, setPe] = useState(false)
  const [msg, setMsg] = useState('')
  const slips = Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() > 15 ? 15 : 1)
    d.setDate(d.getDate() - i * 15)
    return { date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }), gross: 5500, net: 3871.42 - (i % 3) * 12.5 }
  })
  const accounts = elections?.accounts ?? [{ bank: 'Bank of America', type: 'Checking', last4: '4821', pct: 100 }]
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<DollarSign size={22} />} color="#319C4C" title="Pay" sub="Alex Morgan · US Semi-Monthly" />
      {msg && (
        <div className="mb-5">
          <Success onClose={() => setMsg('')}>{msg}</Success>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['Most Recent Net Pay', money(3871.42)], ['YTD Gross', money(5500 * 19)], [`${y} Total Compensation`, '$151,800']].map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-[#E8EBED] p-5">
            <div className="text-[13px] text-[#5E6A75]">{k}</div>
            <div className="text-[24px] font-bold mt-1">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <Card
          title="Payslips"
          action={
            <Btn size="sm" icon={<Download size={14} />} onClick={() => toast({ appId: 'workday', title: 'Payslips sent to printer', body: `${slips.length} payslips · Microsoft Print to PDF` })}>
              Print
            </Btn>
          }
        >
          <table className="w-full text-[14px]">
            <thead><tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]"><th className="px-6 h-10 font-bold">Payment Date</th><th className="font-bold">Type</th><th className="font-bold text-right">Gross Pay</th><th className="font-bold text-right pr-6">Net Pay</th></tr></thead>
            <tbody>
              {slips.map((s, i) => (
                <tr key={s.date} data-agent={`workday-payslip-${i}`} onClick={() => setSlip(s)} className="border-b border-[#F0F1F2] hover:bg-[#F6F7F8] cursor-pointer">
                  <td className="px-6 h-11 text-[#0875E1] font-bold">{s.date}</td>
                  <td>Regular</td>
                  <td className="text-right">{money(s.gross)}</td>
                  <td className="text-right pr-6">{money(s.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-6">
          <Card title="Payment Elections" action={<Btn size="sm" onClick={() => setPe(true)}>Change</Btn>}>
            <div className="px-6 pb-5 space-y-3 text-[14px]">
              {accounts.map((a: any) => (
                <div key={a.last4} className="flex items-center gap-3">
                  <Landmark size={18} className="text-[#5E6A75]" />
                  <div className="flex-1">
                    <div className="font-bold">{a.bank} {a.type}</div>
                    <div className="text-[12.5px] text-[#5E6A75]">••••{a.last4}</div>
                  </div>
                  <span className="font-bold">{a.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Tax Documents">
            <div className="px-3 pb-3">
              {[y - 1, y - 2].map((yr) => (
                <button key={yr} onClick={() => setW2(true)} className="w-full flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-[#F6F7F8] text-left">
                  <FileText size={18} className="text-[#0875E1]" />
                  <span className="flex-1 text-[14px] font-bold text-[#0875E1]">Form W-2 · {yr}</span>
                  <span className="text-[12.5px] text-[#5E6A75]">Jan 31, {yr + 1}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
      {slip && <PayslipModal s={slip} onClose={() => setSlip(null)} />}
      {w2 && (
        <Modal title={`Form W-2 · ${y - 1}`} onClose={() => setW2(false)} footer={<Btn variant="primary" onClick={() => setW2(false)}>Close</Btn>}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              ['Employer', 'Northwind Global Inc. · EIN 04-3318842'],
              ['Employee', `${ME.name}`],
              ['1  Wages, tips, other comp.', money(126720)],
              ['2  Federal income tax withheld', money(19884.6)],
              ['3  Social security wages', money(132000)],
              ['4  Social security tax withheld', money(8184)],
              ['5  Medicare wages', money(132000)],
              ['6  Medicare tax withheld', money(1914)],
              ['12a  D (401k)', money(7920)],
              ['16  State wages (MA)', money(126720)],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[12.5px] text-[#5E6A75]">{k}</div>
                <div className="font-bold">{v}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {pe && (
        <PaymentElectionModal
          accounts={accounts}
          onClose={() => setPe(false)}
          onSave={(acc) => {
            db.upsert('workday.payelections', { id: 'pe-alex', workerId: 'wd-alex', accounts: acc, updatedAt: new Date().toISOString() })
            setPe(false)
            setMsg('Payment elections updated. Changes apply from the next pay period.')
          }}
        />
      )}
    </div>
  )
}

function PayslipModal({ s, onClose }: { s: any; onClose: () => void }) {
  const b = breakdown(s.gross, s.net)
  const Row = ({ k, v, bold }: { k: string; v: number; bold?: boolean }) => (
    <div className={`flex justify-between py-1.5 ${bold ? 'font-bold border-t border-[#E8EBED] mt-1 pt-2' : ''}`}>
      <span>{k}</span>
      <span>{money(v)}</span>
    </div>
  )
  return (
    <Modal title={`Payslip · ${s.date}`} onClose={onClose} width={700} agent="workday-payslip-detail" footer={<Btn variant="primary" onClick={onClose}>Close</Btn>}>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          ['Gross Pay', s.gross],
          ['Taxes & Deductions', s.gross - s.net],
          ['Net Pay', s.net],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-[#F6F7F8] px-4 py-3">
            <div className="text-[12.5px] text-[#5E6A75]">{k}</div>
            <div className="text-[20px] font-bold">{money(v as number)}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-8 text-[13.5px]">
        <div>
          <div className="text-[13px] font-bold text-[#5E6A75] uppercase tracking-wide mb-1">Earnings</div>
          <Row k="Regular Salary (86.67 hrs)" v={s.gross} />
          <Row k="Total Earnings" v={s.gross} bold />
          <div className="text-[13px] font-bold text-[#5E6A75] uppercase tracking-wide mb-1 mt-4">Pre-Tax Deductions</div>
          {b.pre.map(([k, v]) => (
            <Row key={k} k={k} v={v} />
          ))}
        </div>
        <div>
          <div className="text-[13px] font-bold text-[#5E6A75] uppercase tracking-wide mb-1">Employee Taxes</div>
          {b.taxes.map(([k, v]) => (
            <Row key={k} k={k} v={v} />
          ))}
          <Row k="Taxable Wages" v={b.taxable} bold />
          <div className="text-[13px] font-bold text-[#5E6A75] uppercase tracking-wide mb-1 mt-4">Payment</div>
          <Row k="Direct Deposit" v={s.net} />
        </div>
      </div>
    </Modal>
  )
}

function PaymentElectionModal({ accounts, onClose, onSave }: { accounts: any[]; onClose: () => void; onSave: (a: any[]) => void }) {
  const [acc, setAcc] = useState(accounts.length > 1 ? accounts : [...accounts, { bank: 'Fidelity', type: 'Savings', last4: '7710', pct: 0 }])
  const total = acc.reduce((n, a) => n + (Number(a.pct) || 0), 0)
  return (
    <Modal
      title="Change Payment Elections"
      onClose={onClose}
      footer={
        <>
          <Btn variant="primary" disabled={total !== 100} onClick={() => onSave(acc.filter((a) => Number(a.pct) > 0).map((a) => ({ ...a, pct: Number(a.pct) })))}>
            Submit
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
          {total !== 100 && <span className="text-[13px] text-[#A31B12] font-medium">Distribution must total 100% (currently {total}%).</span>}
        </>
      }
    >
      <div className="text-[13.5px] text-[#5E6A75] mb-3">Pay Type: Regular · Payment Type: Direct Deposit</div>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12.5px] text-[#5E6A75] border-b border-[#E8EBED]">
            <th className="h-9 font-bold">Account</th>
            <th className="font-bold">Distribution (%)</th>
          </tr>
        </thead>
        <tbody>
          {acc.map((a, i) => (
            <tr key={a.last4} className="border-b border-[#F0F1F2]">
              <td className="py-2">
                <b>{a.bank} {a.type}</b> <span className="text-[#5E6A75]">••••{a.last4}</span>
              </td>
              <td>
                <input aria-label={`Percent to ${a.bank} ${a.type}`} type="number" min={0} max={100} value={a.pct} onChange={(e) => setAcc(acc.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} className={inputCls + ' max-w-[120px]'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}

/* ─────────────── Benefits ─────────────── */

const TIERS = ['Employee', 'Employee + Spouse', 'Employee + Children', 'Family'] as const
const TIER_X: Record<string, number> = { Employee: 0.5, 'Employee + Spouse': 1, 'Employee + Children': 0.9, Family: 1.45 }
const MEDICAL: Record<string, { name: string; cost: number }> = {
  'aetna-pos': { name: 'Aetna Choice POS II', cost: 186.4 },
  'aetna-hdhp': { name: 'Aetna HDHP with HSA', cost: 92.1 },
  'kaiser-hmo': { name: 'Kaiser Permanente HMO', cost: 141.75 },
  waive: { name: 'Waive', cost: 0 },
}
const DENTAL: Record<string, { name: string; cost: number }> = { delta: { name: 'Delta Dental PPO', cost: 18.2 }, waive: { name: 'Waive', cost: 0 } }
const VISION: Record<string, { name: string; cost: number }> = { vsp: { name: 'VSP Vision Care', cost: 8.2 }, waive: { name: 'Waive', cost: 0 } }
const DEFAULT_ELECTIONS = { medical: 'aetna-pos', medicalTier: 'Employee + Spouse', dental: 'delta', dentalTier: 'Employee + Spouse', vision: 'vsp', visionTier: 'Employee', k401: 6, hsa: 150, life: '2x' }

const costOf = (table: Record<string, { cost: number }>, plan: string, tier: string) => Math.round((table[plan]?.cost ?? 0) * (TIER_X[tier] ?? 1) * 100) / 100

export function BenefitsPage() {
  const { isAgent } = useDesk()
  const rec = useCollection<any>('workday.benefits').find((b) => b.id === 'ben-alex')
  const e = { ...DEFAULT_ELECTIONS, ...(rec?.elections ?? {}) }
  const [wizard, setWizard] = useState(false)
  const [msg, setMsg] = useState('')
  const plan = (t: Record<string, { name: string }>, k: string, tier: string) => (k === 'waive' ? 'Waived' : `${t[k]?.name} — ${tier}`)
  const cards: [string, string, string, boolean][] = [
    ['Medical', plan(MEDICAL, e.medical, e.medicalTier), e.medical === 'waive' ? '—' : `$${costOf(MEDICAL, e.medical, e.medicalTier).toFixed(2)} / pay period`, e.medical !== 'waive'],
    ['Dental', plan(DENTAL, e.dental, e.dentalTier), e.dental === 'waive' ? '—' : `$${costOf(DENTAL, e.dental, e.dentalTier).toFixed(2)} / pay period`, e.dental !== 'waive'],
    ['Vision', plan(VISION, e.vision, e.visionTier), e.vision === 'waive' ? '—' : `$${costOf(VISION, e.vision, e.visionTier).toFixed(2)} / pay period`, e.vision !== 'waive'],
    ['401(k)', `Fidelity — ${e.k401}% pre-tax, 4% company match`, `${e.k401}% of pay`, e.k401 > 0],
    ['Life Insurance', `MetLife Basic Life — ${e.life} salary`, e.life === '2x' ? 'Company paid' : `$${(e.life === '3x' ? 9.6 : 19.2).toFixed(2)} / pay period`, true],
    ['HSA', `HealthEquity — $${e.hsa} / pay period`, `$${Number(e.hsa).toFixed(2)} / pay period`, Number(e.hsa) > 0],
  ]
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<HeartPulse size={22} />} color="#DE2E21" title="Benefits" sub={rec ? `Open Enrollment 2027 · elections submitted ${fmtMDY(rec.submittedAt)}` : 'Open Enrollment 2027 · closes Friday 11:59 PM ET'} />
      {msg && (
        <div className="mb-5">
          <Success onClose={() => setMsg('')}>{msg}</Success>
        </div>
      )}
      <div className="grid grid-cols-3 gap-5">
        {cards.map(([t, p, c, on]) => (
          <Card key={t}>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-[16px] font-bold">{t}</div>
                <Pill tone={on ? 'green' : 'gray'}>{on ? 'Enrolled' : 'Waived'}</Pill>
              </div>
              <div className="text-[13.5px] mt-2">{p}</div>
              <div className="text-[13px] text-[#5E6A75] mt-1">{c}</div>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <Btn variant="primary" agent="workday-benefits-change" onClick={() => setWizard(true)}>
          Change Benefits for Open Enrollment
        </Btn>
      </div>
      {wizard && (
        <EnrollmentWizard
          initial={e}
          onClose={() => setWizard(false)}
          onSubmit={(el) => {
            db.upsert('workday.benefits', { id: 'ben-alex', workerId: 'wd-alex', elections: el, submittedAt: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
            const t = db.find<any>('workday.tasks', 'wt-oe-alex')
            if (t && t.status === 'open') db.update('workday.tasks', 'wt-oe-alex', { status: 'done', completedAt: new Date().toISOString(), outcome: 'Submitted', updatedBy: isAgent ? 'hworker' : undefined })
            setWizard(false)
            setMsg('Open Enrollment elections submitted. A confirmation statement is available in your Inbox archive.')
          }}
        />
      )}
    </div>
  )
}

function EnrollmentWizard({ initial, onClose, onSubmit }: { initial: typeof DEFAULT_ELECTIONS; onClose: () => void; onSubmit: (e: typeof DEFAULT_ELECTIONS) => void }) {
  const steps = ['Medical', 'Dental & Vision', 'Retirement & Savings', 'Review'] as const
  const [step, setStep] = useState(0)
  const [e, setE] = useState(initial)
  const set = (k: keyof typeof e, v: any) => setE({ ...e, [k]: v })
  const total = costOf(MEDICAL, e.medical, e.medicalTier) + costOf(DENTAL, e.dental, e.dentalTier) + costOf(VISION, e.vision, e.visionTier) + (e.life === '3x' ? 9.6 : e.life === '4x' ? 19.2 : 0)
  const PlanPick = ({ table, k, tierKey }: { table: Record<string, { name: string; cost: number }>; k: 'medical' | 'dental' | 'vision'; tierKey: 'medicalTier' | 'dentalTier' | 'visionTier' }) => (
    <div className="space-y-2">
      {Object.entries(table).map(([id, p]) => (
        <label key={id} className={`flex items-center gap-3 px-4 h-12 rounded-xl border cursor-pointer ${e[k] === id ? 'border-[#0875E1] bg-[#F2F8FE]' : 'border-[#E8EBED]'}`}>
          <input type="radio" name={k} checked={e[k] === id} onChange={() => set(k, id)} className="accent-[#0875E1]" />
          <span className="flex-1 font-medium">{p.name}</span>
          {id !== 'waive' && <span className="text-[13px] text-[#5E6A75]">${costOf(table, id, e[tierKey]).toFixed(2)} / pay period</span>}
        </label>
      ))}
      {e[k] !== 'waive' && (
        <div className="pt-2">
          <div className="text-[13.5px] font-medium mb-1">Coverage</div>
          <select aria-label={`${k} coverage`} value={e[tierKey]} onChange={(ev) => set(tierKey, ev.target.value)} className={inputCls}>
            {TIERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
  return (
    <Modal
      title="Open Enrollment 2027"
      onClose={onClose}
      width={760}
      agent="workday-benefits-wizard"
      footer={
        <>
          {step < steps.length - 1 ? (
            <Btn variant="primary" onClick={() => setStep(step + 1)}>
              Continue
            </Btn>
          ) : (
            <Btn variant="primary" agent="workday-benefits-submit" onClick={() => onSubmit(e)}>
              Submit
            </Btn>
          )}
          {step > 0 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
          <Btn variant="tertiary" onClick={onClose}>
            Cancel
          </Btn>
          <span className="ml-auto text-[14px]">
            Your cost <b>${total.toFixed(2)}</b> / pay period
          </span>
        </>
      }
    >
      <div className="flex gap-2 mb-5">
        {steps.map((s, i) => (
          <div key={s} className={`flex-1 h-9 rounded-full flex items-center justify-center text-[13px] font-bold ${i === step ? 'bg-[#0875E1] text-white' : i < step ? 'bg-[#D7EAFC] text-[#005CB9]' : 'bg-[#F0F1F2] text-[#5E6A75]'}`}>
            {s}
          </div>
        ))}
      </div>
      {step === 0 && <PlanPick table={MEDICAL} k="medical" tierKey="medicalTier" />}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-[15px] font-bold mb-2">Dental</div>
            <PlanPick table={DENTAL} k="dental" tierKey="dentalTier" />
          </div>
          <div>
            <div className="text-[15px] font-bold mb-2">Vision</div>
            <PlanPick table={VISION} k="vision" tierKey="visionTier" />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <div className="text-[14px] font-medium mb-1">401(k) Pre-Tax Contribution: {e.k401}%</div>
            <input type="range" min={0} max={20} aria-label="401(k) contribution percent" value={e.k401} onChange={(ev) => set('k401', Number(ev.target.value))} className="w-full accent-[#0875E1]" />
            <div className="text-[12.5px] text-[#5E6A75]">Northwind matches 100% of the first 4%.</div>
          </div>
          <div>
            <div className="text-[14px] font-medium mb-1">HSA Contribution (per pay period)</div>
            <input aria-label="HSA contribution" value={e.hsa} onChange={(ev) => set('hsa', Number(ev.target.value.replace(/[^0-9.]/g, '')) || 0)} className={inputCls} />
            {e.medical !== 'aetna-hdhp' && Number(e.hsa) > 0 && <div className="text-[12.5px] text-[#9C4F00] mt-1">HSA contributions require the Aetna HDHP plan for 2027.</div>}
          </div>
          <div>
            <div className="text-[14px] font-medium mb-1">Life Insurance</div>
            <select aria-label="Life insurance coverage" value={e.life} onChange={(ev) => set('life', ev.target.value)} className={inputCls}>
              <option value="2x">2x salary — Company paid</option>
              <option value="3x">3x salary — $9.60 / pay period</option>
              <option value="4x">4x salary — $19.20 / pay period</option>
            </select>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="divide-y divide-[#F0F1F2] text-[14px]">
          {[
            ['Medical', e.medical === 'waive' ? 'Waived' : `${MEDICAL[e.medical].name} · ${e.medicalTier}`],
            ['Dental', e.dental === 'waive' ? 'Waived' : `${DENTAL[e.dental].name} · ${e.dentalTier}`],
            ['Vision', e.vision === 'waive' ? 'Waived' : `${VISION[e.vision].name} · ${e.visionTier}`],
            ['401(k)', `${e.k401}% pre-tax`],
            ['HSA', `$${e.hsa} / pay period`],
            ['Life Insurance', `${e.life} salary`],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[200px_1fr] py-2.5">
              <span className="text-[#5E6A75]">{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

/* ─────────────── Performance ─────────────── */

const RATINGS = ['Exceeds Expectations', 'Meets Expectations', 'Partially Meets Expectations', 'Does Not Meet Expectations']

export function PerformancePage({ nav }: { nav: Nav }) {
  const { isAgent } = useDesk()
  const team = useCollection<any>('workday.workers').filter((w) => w.managerId === 'wd-alex')
  const reviews = useCollection<any>('workday.reviews')
  const [evalFor, setEvalFor] = useState<any | null>(null)
  const [rating, setRating] = useState('')
  const [comments, setComments] = useState('')
  const [msg, setMsg] = useState('')
  const reviewOf = (wid: string) => reviews.find((r) => r.id === `rev-${wid}`)
  const submit = () => {
    if (!evalFor || !rating) return
    db.upsert('workday.reviews', { id: `rev-${evalFor.id}`, workerId: evalFor.id, name: '2026 Mid-Year Review', rating, comments, by: ME.id, submittedAt: new Date().toISOString(), createdBy: isAgent ? 'hworker' : undefined })
    const t = db.get<any>('workday.tasks').find((x) => x.process === 'Performance Review' && x.status === 'open' && x.title.includes(evalFor.name))
    if (t) db.update('workday.tasks', t.id, { status: 'done', completedAt: new Date().toISOString(), outcome: 'Submitted', updatedBy: isAgent ? 'hworker' : undefined })
    setMsg(`Manager evaluation for ${evalFor.name} submitted. Up next: ${evalFor.name.split(' ')[0]} acknowledges the review.`)
    setEvalFor(null)
  }
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<TrendingUp size={22} />} color="#F38B00" title="Team Performance" sub="2026 Mid-Year Review · Operations (Alex Morgan)" />
      {msg && (
        <div className="mb-5">
          <Success onClose={() => setMsg('')}>{msg}</Success>
        </div>
      )}
      <Card title="Reviews">
        <table className="w-full text-[14px]">
          <thead><tr className="text-left text-[12.5px] text-[#5E6A75] bg-[#F6F7F8] border-y border-[#E8EBED]"><th className="px-6 h-10 font-bold">Worker</th><th className="font-bold">Review</th><th className="font-bold">Status</th><th className="font-bold">Goals</th><th /></tr></thead>
          <tbody>
            {team.map((w, i) => {
              const rv = reviewOf(w.id)
              const pending = w.status === 'Active' && i === 0 && !rv
              return (
                <tr key={w.id} className="border-b border-[#F0F1F2] hover:bg-[#F6F7F8] cursor-pointer" onClick={() => nav({ page: 'worker', workerId: w.id })}>
                  <td className="px-6 h-14"><div className="flex items-center gap-3"><Avatar id={w.personId} size={30} /><b className="text-[#0875E1]">{w.name}</b></div></td>
                  <td>2026 Mid-Year Review</td>
                  <td><Pill tone={w.status !== 'Active' ? 'gray' : pending ? 'orange' : 'green'}>{w.status !== 'Active' ? 'Not Applicable' : pending ? 'Manager Evaluation' : 'Complete'}</Pill></td>
                  <td>{w.status !== 'Active' ? '—' : `${3 + i} of ${5 + i} on track`}</td>
                  <td className="pr-6 text-right">
                    {pending ? (
                      <Btn
                        size="sm"
                        variant="primary"
                        agent={`workday-review-start-${w.id}`}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setEvalFor(w)
                          setRating('')
                          setComments('')
                        }}
                      >
                        Start Evaluation
                      </Btn>
                    ) : rv ? (
                      <span className="text-[13px] text-[#5E6A75]">{rv.rating}</span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      {evalFor && (
        <Modal
          title={`Manager Evaluation: ${evalFor.name}`}
          onClose={() => setEvalFor(null)}
          footer={
            <>
              <Btn variant="primary" disabled={!rating} onClick={submit}>
                Submit
              </Btn>
              <Btn onClick={() => setEvalFor(null)}>Cancel</Btn>
            </>
          }
        >
          <div className="text-[13.5px] text-[#5E6A75] mb-4">2026 Mid-Year Review · Self-evaluation submitted by {evalFor.name.split(' ')[0]}</div>
          <div className="text-[14px] font-medium mb-1.5">
            Overall Rating<span className="text-[#DE2E21]">*</span>
          </div>
          <div className="space-y-2 mb-4">
            {RATINGS.map((r) => (
              <label key={r} className={`flex items-center gap-3 px-4 h-11 rounded-xl border cursor-pointer ${rating === r ? 'border-[#0875E1] bg-[#F2F8FE]' : 'border-[#E8EBED]'}`}>
                <input type="radio" name="rating" checked={rating === r} onChange={() => setRating(r)} className="accent-[#0875E1]" /> {r}
              </label>
            ))}
          </div>
          <div className="text-[14px] font-medium mb-1.5">Manager Comments</div>
          <textarea aria-label="Manager comments" value={comments} onChange={(ev) => setComments(ev.target.value)} className={textareaCls} />
        </Modal>
      )}
    </div>
  )
}

/* ─────────────── All apps ─────────────── */

export function AllApps({ nav }: { nav: Nav }) {
  const { open } = useDesk()
  const extra: [string, any, string, () => void][] = [
    ['Expenses', <Receipt size={18} key="e" />, '#00A3A3', () => nav({ page: 'expenses' })],
    ['Learning', <GraduationCap size={18} key="l" />, '#8660D9', () => nav({ page: 'learning' })],
    ['Career', <Briefcase size={18} key="c" />, '#005CB9', () => nav({ page: 'career' })],
    ['Directory', <BookUser size={18} key="d" />, '#5E6A75', () => nav({ page: 'directory' })],
    ['Feedback', <MessageSquareHeart size={18} key="f" />, '#C9227A', () => nav({ page: 'feedback' })],
    ['Goals', <Target size={18} key="g" />, '#F38B00', () => nav({ page: 'goals' } as Route)],
    ['Org Studio', <Network size={18} key="o" />, '#00A3A3', () => nav({ page: 'team' })],
    ['Recruiting', <UserSearch size={18} key="r" />, '#319C4C', () => open('greenhouse')],
    ['Absence', <Plane size={18} key="a" />, '#0875E1', () => nav({ page: 'timeoff' })],
    ['Help', <LifeBuoy size={18} key="h" />, '#5E6A75', () => nav({ page: 'help' })],
  ]
  return (
    <div className="max-w-[1180px] mx-auto px-10 py-8">
      <Head icon={<LayoutGrid size={22} />} color="#005CB9" title="Apps" sub="All the apps you have access to" />
      <div className="grid grid-cols-4 gap-4">
        {TOP_APPS.map((a) => (
          <button key={a.key} onClick={() => nav(a.route)} className="bg-white rounded-2xl border border-[#E8EBED] p-5 flex items-center gap-3 hover:shadow-md text-left"><AppIcon icon={a.icon} color={a.color} /><span className="text-[14px] font-bold">{a.name}</span></button>
        ))}
        {extra.map(([e, icon, color, fn]) => (
          <button key={e} data-agent={`workday-allapps-${e.toLowerCase().replace(/\s+/g, '-')}`} onClick={fn} className="bg-white rounded-2xl border border-[#E8EBED] p-5 flex items-center gap-3 hover:shadow-md text-left">
            <AppIcon icon={icon} color={color} />
            <span className="text-[14px] font-bold">{e}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
