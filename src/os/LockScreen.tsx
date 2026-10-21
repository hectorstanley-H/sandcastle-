import { useEffect, useState } from 'react'
import { BloomWallpaper } from './Wallpaper'
import { unlock } from './system'
import { ME, COMPANY, initials } from '@/data/people'

export function LockScreen() {
  const [now, setNow] = useState(new Date())
  const [stage, setStage] = useState<'lock' | 'signin' | 'welcome'>('lock')
  const [pin, setPin] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (stage === 'lock') setStage('signin')
      else if (stage === 'signin' && e.key === 'Enter') go()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const go = () => {
    setStage('welcome')
    setTimeout(unlock, 1300)
  }

  // auto-fill a PIN for the demo (it's not a real credential)
  useEffect(() => {
    if (stage !== 'signin') return
    let i = 0
    const t = setInterval(() => {
      i++
      setPin('•'.repeat(i))
      if (i >= 6) {
        clearInterval(t)
        setTimeout(go, 350)
      }
    }, 110)
    return () => clearInterval(t)
  }, [stage])

  return (
    <div
      className="fixed inset-0 z-[15000] overflow-hidden text-white select-none"
      style={{ fontFamily: 'var(--font-win)' }}
      onClick={() => stage === 'lock' && setStage('signin')}
    >
      <div className={`absolute inset-0 transition-all duration-500 ${stage !== 'lock' ? 'blur-2xl scale-110' : ''}`}>
        <BloomWallpaper variant="dark" />
      </div>
      <div className={`absolute inset-0 bg-black/20 transition-opacity ${stage !== 'lock' ? 'opacity-100' : 'opacity-0'}`} />
      {stage === 'lock' && (
        <div className="absolute inset-x-0 top-[12%] flex flex-col items-center fade-in">
          <div className="text-[22px] font-medium drop-shadow">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div className="text-[120px] font-semibold leading-none mt-2 drop-shadow-lg tracking-tight">
            {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '')}
          </div>
          <div className="absolute top-[62vh] flex flex-col items-center gap-2 text-white/85 text-[13px]">
            <span>Click anywhere or press any key to sign in</span>
          </div>
        </div>
      )}
      {stage !== 'lock' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center slide-up">
          <div className="w-[190px] h-[190px] rounded-full flex items-center justify-center text-[64px] font-light shadow-2xl" style={{ background: ME.color }}>
            {initials(ME.name)}
          </div>
          <div className="mt-5 text-[28px] font-medium">{ME.name}</div>
          {stage === 'signin' ? (
            <>
              <div className="mt-1 text-[13px] text-white/75">{ME.email}</div>
              <div className="mt-6 w-[300px] h-9 px-3 flex items-center rounded bg-white/90 text-black text-[18px] tracking-[0.35em] border-b-2 border-[#005FB8]">
                {pin || <span className="text-[13px] tracking-normal text-black/50">PIN</span>}
              </div>
              <div className="mt-3 text-[12px] text-white/70">Sign-in options</div>
            </>
          ) : (
            <div className="mt-6 flex items-center gap-3 text-[20px] font-light">
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Welcome
            </div>
          )}
          <div className="absolute bottom-8 left-8 flex items-center gap-3 text-[13px] text-white/80">
            <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">{initials(ME.name)}</span>
            {ME.name} · {COMPANY.name}
          </div>
        </div>
      )}
    </div>
  )
}
