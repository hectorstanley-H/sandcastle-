/** Plain Windows-blue desktop background, plus the H-branded agent wallpaper. */
export function BloomWallpaper({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  return <div className="absolute inset-0" aria-hidden style={{ background: variant === 'dark' ? '#0B2A57' : '#0078D4' }} />
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
