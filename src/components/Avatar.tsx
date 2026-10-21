import { initials, personByEmail, PEOPLE } from '@/data/people'

const PALETTE = ['#0F6CBD', '#8764B8', '#C239B3', '#E3008C', '#038387', '#CA5010', '#498205', '#986F0B', '#4F6BED', '#881798', '#D13438', '#00B7C3', '#5C2E91']

export function colorFor(key: string) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Initials avatar. Pass a person id, an email, or just a name. */
export function Avatar({
  name,
  email,
  id,
  size = 32,
  square,
  className = '',
  ring,
  presence,
}: {
  name?: string
  email?: string
  id?: string
  size?: number
  square?: boolean
  className?: string
  ring?: string
  presence?: 'available' | 'busy' | 'away' | 'dnd' | 'offline'
}) {
  const p = id ? PEOPLE.find((x) => x.id === id) : email ? personByEmail(email) : PEOPLE.find((x) => x.name === name)
  const label = p?.name ?? name ?? email ?? '?'
  const bg = p?.color ?? colorFor(label)
  const presenceColor = { available: '#6BB700', busy: '#C50F1F', away: '#FFAA44', dnd: '#C50F1F', offline: '#8A8886' }
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <span
        className={`w-full h-full flex items-center justify-center text-white font-semibold select-none ${square ? 'rounded-md' : 'rounded-full'}`}
        style={{ background: bg, fontSize: Math.max(9, size * 0.38), boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      >
        {initials(label)}
      </span>
      {presence && (
        <span
          className="absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-white"
          style={{ width: Math.max(8, size * 0.32), height: Math.max(8, size * 0.32), background: presenceColor[presence] }}
        />
      )}
    </span>
  )
}
