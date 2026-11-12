/** Concur Travel — trip search, reservation and upcoming trips. */
import { useState } from 'react'
import { Plane, Hotel, Car, Search, CheckCircle2, AlertTriangle } from 'lucide-react'
import { db, uid, useCollection } from '@/db/db'
import { isoDate } from '@/data/time'
import { $, d, Btn, Field, inputCls, Status, Banner, Confirm, Tabs } from './ui'

type Kind = 'flight' | 'hotel' | 'car'
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const city = (s: string) => s.split(',')[0].trim() || 'Destination'
const CAP: Record<Kind, number> = { flight: 650, hotel: 325, car: 90 }

function results(kind: Kind, q: any) {
  const h = hash(`${kind}${q.from}${q.to}${q.start}`)
  const nights = Math.max(1, Math.round((+new Date(q.end) - +new Date(q.start)) / 86400000))
  if (kind === 'flight') {
    return [['Delta', 'DL'], ['United', 'UA'], ['American', 'AA'], ['JetBlue', 'B6'], ['Southwest', 'WN']].map(([n, c], i) => {
      const price = 240 + ((h >> (i * 3)) % 420)
      const dep = 6 + ((h >> i) % 12)
      return { id: `${c}${100 + ((h >> (i * 2)) % 900)}`, title: `${n} ${c} ${100 + ((h >> (i * 2)) % 900)}`, sub: `${q.from.slice(0, 3).toUpperCase()} → ${city(q.to).slice(0, 3).toUpperCase()} · departs ${dep}:${i % 2 ? '35' : '05'} ${dep < 12 ? 'AM' : 'PM'} · ${i % 3 === 0 ? 'Nonstop' : '1 stop'} · Economy`, price, unit: 'round trip' }
    }).sort((a, b) => a.price - b.price)
  }
  if (kind === 'hotel') {
    return ['Marriott', 'Hilton Garden Inn', 'Hyatt Regency', 'Kimpton', 'Courtyard by Marriott'].map((n, i) => {
      const rate = 149 + ((h >> (i * 3)) % 260)
      return { id: `htl-${i}`, title: `${n} ${city(q.to)} Downtown`, sub: `${(0.3 + i * 0.4).toFixed(1)} mi from city center · ${nights} night${nights === 1 ? '' : 's'} · ${i % 2 ? 'Free cancellation' : 'Breakfast included'}`, price: rate, unit: 'per night', total: rate * nights }
    }).sort((a, b) => a.price - b.price)
  }
  return [['Hertz', 'Intermediate (Toyota Corolla)'], ['Enterprise', 'Standard (VW Jetta)'], ['National', 'Full-size (Chevy Malibu)'], ['Avis', 'Compact (Nissan Versa)']].map(([n, c], i) => {
    const rate = 42 + ((h >> (i * 3)) % 70)
    return { id: `car-${i}`, title: `${n} — ${c}`, sub: `Pick-up ${city(q.to)} airport · ${nights} day${nights === 1 ? '' : 's'} · unlimited miles`, price: rate, unit: 'per day', total: rate * nights }
  }).sort((a, b) => a.price - b.price)
}

export function TravelView({ prefill }: { prefill?: any }) {
  const trips = useCollection<any>('concur.trips')
  const [kind, setKind] = useState<Kind>('flight')
  const [q, setQ] = useState({ from: 'Boston, Massachusetts', to: prefill?.destination ?? '', start: prefill?.start ?? isoDate(new Date(Date.now() + 14 * 86400000)), end: prefill?.end ?? isoDate(new Date(Date.now() + 16 * 86400000)) })
  const [res, setRes] = useState<any[] | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [cancel, setCancel] = useState<any>(null)
  const [show, setShow] = useState<'upcoming' | 'past' | 'canceled'>('upcoming')
  const set = (k: string, v: string) => setQ((x) => ({ ...x, [k]: v }))
  const ok = q.to.trim() && q.start && q.end && q.end >= q.start
  const search = () => ok && setRes(results(kind, q))
  const reserve = (r: any) => {
    const conf = Math.random().toString(36).slice(2, 8).toUpperCase()
    db.insert('concur.trips', {
      id: uid('ctp'), name: prefill?.name ?? `Trip to ${city(q.to)}`, kind, detail: `${r.title} · ${r.sub.split(' · ')[0]}`, start: new Date(q.start + 'T09:00:00').toISOString(), end: new Date(q.end + 'T18:00:00').toISOString(),
      amount: r.total ?? r.price, status: kind === 'flight' ? 'Ticketed' : 'Booked', conf, requestId: prefill?.requestId, outOfPolicy: r.price > CAP[kind] || undefined,
    }, { prepend: true })
    setNote(`${r.title} reserved — confirmation ${conf}. Itinerary emailed to alex.morgan@northwind.com.`)
    setRes(null)
  }
  const now = Date.now()
  const shown = trips
    .filter((t) => (show === 'canceled' ? t.status === 'Canceled' : t.status !== 'Canceled' && (show === 'upcoming' ? +new Date(t.end) >= now : +new Date(t.end) < now)))
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
  const Icon = kind === 'flight' ? Plane : kind === 'hotel' ? Hotel : Car
  return (
    <div className="flex-1 overflow-auto px-10 py-6 grid grid-cols-[1fr_380px] gap-6 content-start">
      <div>
        <div className="text-[26px] font-light text-[#32363a] mb-5">Trip Search</div>
        {note && <Banner onClose={() => setNote(null)}>{note}</Banner>}
        {prefill?.name && <Banner type="info">Booking for approved request “{prefill.name}”.</Banner>}
        <div className="bg-white rounded-lg border border-[#d9d9d9] px-5 pb-5 mb-5">
          <Tabs prefix="concur-travel-tab" value={kind} onChange={(k) => { setKind(k as Kind); setRes(null) }} tabs={[['flight', 'Flight'], ['hotel', 'Hotel'], ['car', 'Car']]} />
          <div className="grid grid-cols-4 gap-4 mt-4 items-end">
            {kind === 'flight' && <Field label="From" required><input aria-label="From" data-agent="concur-travel-from" className={inputCls} value={q.from} onChange={(e) => set('from', e.target.value)} /></Field>}
            <Field label={kind === 'flight' ? 'To' : kind === 'hotel' ? 'Near (city)' : 'Pick-up city'} required><input aria-label="Destination" data-agent="concur-travel-to" className={inputCls} value={q.to} onChange={(e) => set('to', e.target.value)} placeholder="e.g. Chicago, Illinois" /></Field>
            <Field label={kind === 'flight' ? 'Depart' : kind === 'hotel' ? 'Check-in' : 'Pick-up'} required><input type="date" aria-label="Start date" className={inputCls} value={q.start} onChange={(e) => set('start', e.target.value)} /></Field>
            <Field label={kind === 'flight' ? 'Return' : kind === 'hotel' ? 'Check-out' : 'Drop-off'} required><input type="date" aria-label="End date" className={inputCls} value={q.end} onChange={(e) => set('end', e.target.value)} /></Field>
            <div className={kind === 'flight' ? 'col-span-4' : ''}><Btn primary data-agent="concur-travel-search" disabled={!ok} onClick={search}><Search className="w-4 h-4" /> Search</Btn></div>
          </div>
        </div>
        {res && (
          <div className="bg-white rounded-lg border border-[#d9d9d9]" data-agent="concur-travel-results">
            <div className="h-12 px-5 flex items-center border-b border-[#e5e5e5] text-[16px] font-semibold">{res.length} results · sorted by price<div className="flex-1" /><span className="text-[13px] font-normal text-[#6a6d70]">Policy limit {$(CAP[kind])} {kind === 'flight' ? 'round trip' : kind === 'hotel' ? 'per night' : 'per day'}</span></div>
            {res.map((r) => {
              const inPolicy = r.price <= CAP[kind]
              return (
                <div key={r.id} className="px-5 py-3 flex items-center gap-4 border-b border-[#eeeeee]">
                  <Icon className="w-6 h-6 text-[#0a6ed1] shrink-0" />
                  <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold">{r.title}</div><div className="text-[12px] text-[#6a6d70]">{r.sub}</div></div>
                  <span className={`text-[12px] flex items-center gap-1 ${inPolicy ? 'text-[#107e3e]' : 'text-[#e9730c]'}`}>{inPolicy ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{inPolicy ? 'In policy' : 'Out of policy'}</span>
                  <div className="text-right w-[120px]"><div className="text-[18px] font-light">{$(r.price)}</div><div className="text-[11px] text-[#6a6d70]">{r.unit}{r.total ? ` · ${$(r.total)} total` : ''}</div></div>
                  <Btn primary data-agent={`concur-travel-reserve-${r.id}`} onClick={() => reserve(r)}>Reserve</Btn>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div>
        <div className="text-[18px] font-semibold mb-3 mt-2">My Trips</div>
        <div className="bg-white rounded-lg border border-[#d9d9d9]">
          <div className="px-4"><Tabs prefix="concur-trips-tab" value={show} onChange={(k) => setShow(k as any)} tabs={[['upcoming', 'Upcoming'], ['past', 'Past'], ['canceled', 'Canceled']]} /></div>
          {shown.length === 0 && <div className="h-20 flex items-center justify-center text-[13px] text-[#6a6d70]">No {show} trips.</div>}
          {shown.map((t) => {
            const I = t.kind === 'hotel' ? Hotel : t.kind === 'car' ? Car : Plane
            return (
              <div key={t.id} data-agent={`concur-trip-${t.id}`} className="p-4 border-b border-[#eeeeee]">
                <div className="flex items-center gap-2"><I className="w-4 h-4 text-[#0a6ed1]" /><div className="text-[14px] font-semibold flex-1 truncate">{t.name}</div><Status s={t.status} /></div>
                <div className="text-[12px] text-[#6a6d70] mt-1">{t.detail}</div>
                <div className="text-[12px] text-[#6a6d70]">{d(t.start)} – {d(t.end)} · Conf. {t.conf} · {$(t.amount)}{t.outOfPolicy ? ' · out of policy' : ''}</div>
                {t.status !== 'Canceled' && +new Date(t.end) >= now && <button data-agent={`concur-trip-cancel-${t.id}`} onClick={() => setCancel(t)} className="text-[13px] text-[#bb0000] hover:underline mt-1">Cancel trip</button>}
              </div>
            )
          })}
        </div>
      </div>
      {cancel && <Confirm title="Cancel Trip" danger ok="Cancel Trip" onClose={() => setCancel(null)} onOk={() => { db.update('concur.trips', cancel.id, { status: 'Canceled' }); setNote(`Reservation ${cancel.conf} canceled.`) }} text={<>Cancel {cancel.detail} (confirmation {cancel.conf})? Airline change fees may apply.</>} />}
    </div>
  )
}
