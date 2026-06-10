/**
 * Score Ring — the brand graphic device ("Purposeful Intelligence").
 *
 * The arc colour shifts rose (low) → gold (mid) → spark green (high);
 * spark green is reserved for exactly this kind of score display:
 *   75-100  →  spark green   "Strong fit"
 *   50-74   →  deep gold     "Possible fit"
 *   <50     →  rose          "Poor fit"
 *
 * The ring animates from 0 to its target offset on first paint
 * (300-500ms ease-out) unless reduced motion is requested.
 */
export type MatchRingSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<MatchRingSize, { px: number; stroke: number; font: string; label: string }> = {
  sm: { px: 48, stroke: 4, font: 'text-sm', label: 'text-[10px]' },
  md: { px: 64, stroke: 5, font: 'text-base', label: 'text-[10px]' },
  lg: { px: 88, stroke: 6, font: 'text-2xl', label: 'text-xs' },
}

function bandFor(score: number) {
  if (score >= 75) return { stroke: '#19E88F', text: 'text-spark', label: 'Strong fit' }
  if (score >= 50) return { stroke: '#D4A017', text: 'text-gold', label: 'Possible fit' }
  return { stroke: '#C62828', text: 'text-danger', label: 'Poor fit' }
}

export function MatchRing({
  score,
  size = 'md',
  showLabel = false,
}: {
  score: number
  size?: MatchRingSize
  showLabel?: boolean
}) {
  const safe = Math.max(0, Math.min(100, Math.round(score)))
  const { px, stroke, font, label } = SIZE_MAP[size]
  const radius = (px - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safe / 100) * circumference
  const band = bandFor(safe)

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center" style={{ width: px, height: px }}>
        <svg width={px} height={px} className="-rotate-90" aria-hidden="true">
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke="#32324F"
            strokeWidth={stroke}
          />
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            stroke={band.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="ring-animate"
            style={{
              ['--ring-circumference' as string]: `${circumference}`,
              ['--ring-offset' as string]: `${offset}`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`tabular font-mono font-semibold leading-none ${band.text} ${font}`}>
            {safe}
          </span>
          <span className={`mt-0.5 font-mono font-medium uppercase tracking-wider text-text-secondary ${label}`}>
            match
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={`mt-2 text-xs font-medium ${band.text}`}>
          {band.label}
        </span>
      )}
      <span className="sr-only">Match score: {safe} out of 100. {band.label}.</span>
    </div>
  )
}
