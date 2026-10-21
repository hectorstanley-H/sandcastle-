/** Windows 11 "Bloom"-style wallpaper drawn in SVG, plus the H-branded agent wallpaper. */
export function BloomWallpaper({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const dark = variant === 'dark'
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="bg-r" cx="50%" cy="55%" r="75%">
          <stop offset="0" stopColor={dark ? '#0E2A5C' : '#B9D7F7'} />
          <stop offset="0.55" stopColor={dark ? '#06142E' : '#8DBDF0'} />
          <stop offset="1" stopColor={dark ? '#020814' : '#5D9BE0'} />
        </radialGradient>
        {[
          ['p1', '#0B49C9', '#5DB2FF'],
          ['p2', '#0A3BAE', '#2F8CFF'],
          ['p3', '#1C67E8', '#A8D8FF'],
          ['p4', '#0636A0', '#3FA0FF'],
          ['p5', '#2A7BF2', '#D2ECFF'],
        ].map(([id, a, b]) => (
          <linearGradient key={id} id={id} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
        ))}
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>
      <rect width="1920" height="1080" fill="url(#bg-r)" />
      <ellipse cx="960" cy="640" rx="520" ry="300" fill={dark ? '#1D5BD8' : '#ffffff'} opacity={dark ? 0.35 : 0.45} filter="url(#glow)" />
      <g transform="translate(960 610)" filter="url(#soft)">
        <path d="M0 40 C -40 -120, -260 -260, -520 -180 C -360 -60, -160 20, 0 40Z" fill="url(#p2)" opacity="0.95" />
        <path d="M0 40 C 40 -120, 260 -260, 520 -180 C 360 -60, 160 20, 0 40Z" fill="url(#p2)" opacity="0.95" transform="scale(-1 1) scale(-1 1)" />
        <path d="M0 40 C -120 -160, -140 -380, 0 -470 C 140 -380, 120 -160, 0 40Z" fill="url(#p3)" opacity="0.97" />
        <path d="M0 40 C -60 -140, -300 -330, -380 -330 C -360 -200, -200 -40, 0 40Z" fill="url(#p1)" opacity="0.9" />
        <path d="M0 40 C 60 -140, 300 -330, 380 -330 C 360 -200, 200 -40, 0 40Z" fill="url(#p4)" opacity="0.9" />
        <path d="M0 40 C -200 -30, -520 -20, -700 80 C -480 140, -200 110, 0 40Z" fill="url(#p4)" opacity="0.85" />
        <path d="M0 40 C 200 -30, 520 -20, 700 80 C 480 140, 200 110, 0 40Z" fill="url(#p1)" opacity="0.85" />
        <path d="M0 40 C -60 -60, -40 -250, 0 -300 C 40 -250, 60 -60, 0 40Z" fill="url(#p5)" opacity="0.9" />
      </g>
    </svg>
  )
}

export function AgentWallpaper() {
  return (
    <div className="absolute inset-0" style={{ background: '#0F0E12' }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 700px at 100% 0%, rgba(113,20,235,0.55), rgba(67,6,147,0.25) 40%, transparent 70%), radial-gradient(900px 600px at 0% 100%, rgba(67,6,147,0.35), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg viewBox="0 0 1035 600" className="w-[300px] opacity-[0.07]">
          <circle cx="300" cy="300" r="300" fill="#fff" />
          <rect x="838" y="195" width="54" height="220" fill="#fff" />
          <rect x="1035" y="282" width="45" height="197" transform="rotate(90 1035 282)" fill="#fff" />
          <rect x="981" y="195" width="54" height="220" fill="#fff" />
        </svg>
      </div>
    </div>
  )
}
