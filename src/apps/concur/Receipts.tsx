import { useState } from 'react'
import { Receipt, Upload, Mail, Camera } from 'lucide-react'
import { Btn, Modal, pickFile } from './ui'

/** receipts already in the user's Concur receipt library (ExpenseIt uploads / emailed receipts) */
const LIBRARY = [
  { name: 'IMG_4471.jpg', src: 'ExpenseIt (mobile)', when: 'Today' },
  { name: 'Parking_SP+_garage.pdf', src: 'receipts@concur.com', when: 'Yesterday' },
  { name: 'Staples_order_88213.pdf', src: 'receipts@concur.com', when: '3 days ago' },
  { name: 'Lyft_ride_receipt.pdf', src: 'Lyft (connected app)', when: 'Last week' },
]

/** Attach Receipt dialog: pick from the receipt library or upload from the computer. */
export function AttachReceipt({ onClose, onPick }: { onClose: () => void; onPick: (name: string) => void }) {
  const [sel, setSel] = useState<string | null>(null)
  const upload = async () => {
    const n = await pickFile()
    if (n) onPick(n)
  }
  return (
    <Modal
      title="Attach Receipt"
      width={720}
      onClose={onClose}
      agent="concur-attach-modal"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn primary data-agent="concur-attach-confirm" disabled={!sel} onClick={() => sel && onPick(sel)}>Attach</Btn></>}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Btn data-agent="concur-attach-upload" onClick={upload}><Upload className="w-4 h-4" /> Upload New Receipt</Btn>
          <span className="text-[13px] text-[#6a6d70] flex items-center gap-1"><Mail className="w-4 h-4" /> Tip: email receipts to receipts@concur.com · <Camera className="w-4 h-4" /> or snap them in the mobile app</span>
        </div>
        <div className="text-[13px] font-semibold text-[#6a6d70] uppercase mb-2">Available Receipts</div>
        <div className="grid grid-cols-4 gap-3">
          {LIBRARY.map((r) => (
            <button key={r.name} data-agent={`concur-attach-lib-${r.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`} onClick={() => setSel(r.name)} className={`rounded border p-2 text-left ${sel === r.name ? 'border-[#0a6ed1] ring-1 ring-[#0a6ed1] bg-[#ebf5fe]' : 'border-[#d9d9d9] hover:shadow-md'}`}>
              <div className="h-24 rounded bg-[#f7f7f7] flex items-center justify-center text-[#89919a]"><Receipt className="w-8 h-8" /></div>
              <div className="text-[12px] font-semibold mt-2 truncate">{r.name}</div>
              <div className="text-[11px] text-[#6a6d70] truncate">{r.src} · {r.when}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
