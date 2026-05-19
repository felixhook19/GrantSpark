/**
 * Circular match-score ring (Forest Heritage colour bands).
 *
 * Colour bands all pulled from the brand palette so the dashboard and the
 * marketing site share the same colour story:
 *   90-100  →  forest green       "Excellent fit"
 *   75-89   →  mustard gold       "Strong fit"
 *   60-74   →  burnt amber        "Potential fit"
 *   <60     →  warm grey          "Low fit"
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
  if (score >= 90) return { stroke: '#14532D', text: 'text-primary', label: 'Excellent fit' }
  if (score >= 75) return { stroke: '#CA8A04', text: 'text-accent', label: 'Strong fit' }
  if (score >= 60) return { stroke: '#B45309', text: 'text-warning', label: 'Potential fit' }
  return { stroke: '#A8A29E', text: 'text-muted', label: 'Low fit' }
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
            stroke="#E7E5E0"
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
          <span className={`tabular font-semibold leading-none ${band.text} ${font}`}>
            {safe}
          </span>
          <span className={`mt-0.5 font-medium uppercase tracking-wider text-text-secondary ${label}`}>
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
