/** Recipient signing ceremony: consent → click tags → adopt signature → Finish. */
import { useState } from 'react'
import { ChevronDown, CheckCircle2, PenLine, FileText, ArrowLeft } from 'lucide-react'
import { db, useRecord } from '@/db/db'
import { ME } from '@/data/people'
import type { Nav } from './index'
import { Btn, Wordmark, fmtD, type Envelope } from './shared'
import { DocPage } from './Document'
import { env } from './actions'
import { Menu, Modal, ConfirmFooter, inputCls, useToast } from './ui'

export const SIG_FONTS = [
  "'Brush Script MT','Segoe Script','Lucida Handwriting',cursive",
  "'Segoe Print','Bradley Hand','Comic Sans MS',cursive",
  "'Lucida Handwriting','Apple Chancery','URW Chancery L',cursive",
]

export function useProfile() {
  const p = useRecord<any>('docusign.profile', 'me')
  return { sigName: p?.sigName ?? ME.name, initials: p?.initials ?? 'AM', sigStyle: p?.sigStyle ?? 0, adopted: !!p?.adopted, raw: p }
}

export function AdoptSignature({ onClose, onAdopt }: { onClose: () => void; onAdopt: () => void }) {
  const prof = useProfile()
  const [name, setName] = useState(prof.sigName)
  const [ini, setIni] = useState(prof.initials)
  const [style, setStyle] = useState(prof.sigStyle)
  const save = () => {
    db.upsert('docusign.profile', { id: 'me', sigName: name, initials: ini, sigStyle: style, adopted: true })
    onAdopt()
  }
  return (
    <Modal title="Adopt Your Signature" width={640} onClose={onClose} agent="docusign-adopt" footer={<ConfirmFooter onCancel={onClose} onOk={save} ok="Adopt and Sign" disabled={!name.trim() || !ini.trim()} agent="docusign-adopt-sign" />}>
      <div className="text-[13px] text-[#5E5873] mb-4">Confirm your name, initials, and signature.</div>
      <div className="grid grid-cols-[1fr_140px] gap-3 mb-4">
        <label>
          <span className="block mb-1 text-[13px] font-medium">Full Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="block mb-1 text-[13px] font-medium">Initials</span>
          <input value={ini} onChange={(e) => setIni(e.target.value)} className={inputCls} />
        </label>
      </div>
      <div className="text-[13px] font-medium mb-2">Select style</div>
      <div className="space-y-2">
        {SIG_FONTS.map((f, i) => (
          <label key={i} className={`flex items-center gap-4 px-4 py-3 rounded-md border cursor-pointer ${style === i ? 'border-[#4C00FF] bg-[#F7F4FF]' : 'border-[#E5E1EC] hover:bg-[#FAF9FC]'}`}>
            <input type="radio" checked={style === i} onChange={() => setStyle(i)} className="accent-[#4C00FF] w-4 h-4" />
            <span className="flex-1 text-[28px] leading-none" style={{ fontFamily: f }}>
              {name || 'Your Name'}
            </span>
            <span className="text-[24px] leading-none w-16" style={{ fontFamily: f }}>
              {ini}
            </span>
          </label>
        ))}
      </div>
      <div className="text-[11.5px] text-[#8B8698] mt-4">By selecting Adopt and Sign, I agree that the signature and initials will be the electronic representation of my signature and initials for all purposes when I use them on documents.</div>
    </Modal>
  )
}

export function SigningView({ id, nav }: { id: string; nav: Nav }) {
  const e = useRecord<Envelope>('docusign.envelopes', id)
  const prof = useProfile()
  const toast = useToast()
  const [agreed, setAgreed] = useState(false)
  const [started, setStarted] = useState(false)
  const [signed, setSigned] = useState(false)
  const [adopt, setAdopt] = useState(false)
  const [decline, setDecline] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState<'finished' | 'declined' | null>(null)

  const me = e?.recipients.find((r) => r.email === ME.email && r.role !== 'cc')
  const canSign = !!e && e.status === 'action' && !!me && me.status !== 'signed' && me.status !== 'completed'
  const doc = e?.documents[0]
  const today = fmtD(new Date().toISOString())

  const header = (
    <div className="h-[56px] shrink-0 flex items-center gap-4 px-5 border-b border-[#E5E1EC] bg-white">
      <button aria-label="Close signing" onClick={() => nav.go({ page: 'details', id })} className="w-9 h-9 rounded hover:bg-[#F2F0F5] flex items-center justify-center">
        <ArrowLeft size={19} />
      </button>
      <Wordmark height={18} />
      <span className="w-px h-6 bg-[#E5E1EC]" />
      <div className="text-[15px] font-semibold truncate flex-1">{e?.subject ?? 'Envelope'}</div>
    </div>
  )

  if (!e) return <>{header}<div className="flex-1 flex items-center justify-center text-[#5E5873]">Envelope not found.</div></>

  if (done)
    return (
      <>
        {header}
        <div className="flex-1 flex items-center justify-center bg-[#F7F6FA]">
          <div className="bg-white rounded-lg border border-[#E5E1EC] p-10 text-center w-[520px]" data-agent="docusign-signing-done">
            <CheckCircle2 size={48} className={`mx-auto ${done === 'finished' ? 'text-[#00805A]' : 'text-[#5E5873]'}`} />
            <div className="text-[22px] font-semibold mt-4">{done === 'finished' ? 'You’re done signing!' : 'You declined to sign'}</div>
            <div className="text-[14px] text-[#5E5873] mt-2">
              {done === 'finished'
                ? e.status === 'completed'
                  ? 'All parties have signed. A completed copy has been emailed to everyone.'
                  : 'We’ll email you a completed copy once everyone has signed.'
                : `${e.senderName} has been notified.`}
            </div>
            <div className="flex justify-center gap-3 mt-6">
              {done === 'finished' && <Btn onClick={() => toast('Download started', `${doc?.name ?? 'Document'}`)}>Download</Btn>}
              <Btn kind="primary" onClick={() => nav.go({ page: 'details', id })}>
                View Envelope
              </Btn>
            </div>
          </div>
        </div>
      </>
    )

  if (!canSign)
    return (
      <>
        {header}
        <div className="flex-1 flex items-center justify-center bg-[#F7F6FA]">
          <div className="bg-white rounded-lg border border-[#E5E1EC] p-8 text-center w-[480px]">
            <div className="text-[18px] font-semibold">Nothing to sign</div>
            <div className="text-[14px] text-[#5E5873] mt-2">This envelope does not currently require your signature.</div>
            <Btn kind="primary" className="mt-5" onClick={() => nav.go({ page: 'details', id })}>
              View Envelope
            </Btn>
          </div>
        </div>
      </>
    )

  const sigFont = SIG_FONTS[prof.sigStyle] ?? SIG_FONTS[0]
  const clickSign = () => {
    if (!started) return
    if (!prof.adopted) setAdopt(true)
    else setSigned(true)
  }
  const drop = (type: string) => {
    if (!started) return null
    if (type === 'signature')
      return signed ? (
        <span className="block text-[20px] leading-none pb-0.5 text-[#1F2D7A]" style={{ fontFamily: sigFont }}>
          {prof.sigName}
        </span>
      ) : (
        <button data-agent="docusign-sign-here" onClick={clickSign} className="flex flex-col items-center justify-center h-[30px] px-2 rounded-[3px] bg-[#FFE48A] border border-[#E0B400] text-[9px] font-bold text-[#130032] shadow-sm hover:bg-[#FFD84F]">
          Sign
          <PenLine size={10} />
        </button>
      )
    if (type === 'name') return <span className="text-[10.5px] pb-0.5">{prof.sigName}</span>
    if (type === 'date') return signed ? <span className="text-[10.5px] pb-0.5">{today}</span> : <span className="text-[9px] text-[#8B8698] pb-0.5">Date Signed</span>
    return null
  }

  const finish = () => {
    env.sign(id)
    setDone('finished')
  }

  return (
    <>
      {header}
      <div className="shrink-0 bg-[#130032] text-white px-6 py-3 flex items-center gap-4">
        {!started ? (
          <>
            <div className="flex-1 text-[14px]">
              <div className="font-semibold">Please review and act on these documents.</div>
              <label className="flex items-center gap-2 mt-1 text-[13px] text-white/85">
                <input data-agent="docusign-sign-consent" type="checkbox" checked={agreed} onChange={(ev) => setAgreed(ev.target.checked)} className="accent-[#FFCC22] w-4 h-4" />I agree to use electronic records and signatures.
              </label>
            </div>
            <Btn kind="yellow" data-agent="docusign-sign-continue" disabled={!agreed} onClick={() => setStarted(true)}>
              Continue
            </Btn>
          </>
        ) : (
          <>
            <div className="flex-1 text-[14px]">{signed ? 'Select Finish to complete signing.' : 'Click the Sign tag to add your signature.'}</div>
            <Btn kind="yellow" data-agent="docusign-sign-finish" disabled={!signed} onClick={finish}>
              Finish
            </Btn>
          </>
        )}
        <Menu
          width={220}
          items={[
            { label: 'Finish Later', onClick: () => nav.go({ page: 'details', id }) },
            { label: 'Print & Sign', onClick: () => toast('Print & Sign', 'Print the document, sign it by hand, then upload or fax it back.') },
            { label: 'Decline to Sign', danger: true, onClick: () => setDecline(true), agent: 'docusign-sign-decline' },
            'sep',
            { label: 'View History', onClick: () => nav.go({ page: 'details', id }) },
            { label: 'Session Information', onClick: () => toast('Session information', `Envelope ${e.id} · signer ${ME.email}`) },
          ]}
          trigger={(t) => (
            <button onClick={t} className="h-9 px-3 rounded-[4px] border border-white/40 text-[14px] font-semibold flex items-center gap-1 hover:bg-white/10">
              Other Actions <ChevronDown size={15} />
            </button>
          )}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto bg-[#F7F6FA]">
        <div className="flex items-center justify-center gap-2 h-10 text-[13px] text-[#5E5873]">
          <FileText size={15} /> {doc?.name} · {doc?.pages} pages · From {e.senderName}
        </div>
        <div className="flex flex-col items-center gap-5 pb-10">
          {doc && <DocPage file={doc.name} page={1} drop={drop as any} />}
          {doc && Array.from({ length: Math.min(doc.pages - 1, 2) }).map((_, i) => <DocPage key={i} file={doc.name} page={i + 2} />)}
        </div>
      </div>
      {adopt && (
        <AdoptSignature
          onClose={() => setAdopt(false)}
          onAdopt={() => {
            setAdopt(false)
            setSigned(true)
          }}
        />
      )}
      {decline && (
        <Modal
          title="Decline to Sign"
          onClose={() => setDecline(false)}
          footer={
            <ConfirmFooter
              onCancel={() => setDecline(false)}
              ok="Decline to Sign"
              danger
              disabled={!reason.trim()}
              onOk={() => {
                env.decline(id, reason.trim())
                setDecline(false)
                setDone('declined')
              }}
            />
          }
        >
          <div className="text-[#3D3551] mb-3">The sender will be notified and the envelope will be cancelled for all recipients.</div>
          <label className="block">
            <span className="block mb-1 text-[13px] font-medium">Please provide a reason</span>
            <textarea value={reason} onChange={(ev) => setReason(ev.target.value)} className={`${inputCls} h-24 py-2 resize-none`} />
          </label>
        </Modal>
      )}
    </>
  )
}
