/**
 * Circular match-score ring used on grant cards and detail pages.
 *
 * Colour bands (from brief):
 *   90-100  →  success green   "Excellent fit"
 *   75-89   →  primary blue    "Strong fit"
 *   60-74   →  warning amber   "Potential fit"
 *   <60     →  muted grey      "Low fit"
 *
 * The ring animates from 0 to its target offset on first paint
 * (300-500ms ease-out) unless reduced motion is requested.
 */
export type MatchRingSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<MatchRingSize, { px: number; stroke: number; font: string; label: string }> = {
  sm: { px: 48, stroke: 4, font: 'text-sm', label: 'text-[9px]' },
  md: { px: 64, stroke: 5, font: 'text-base', label: 'text-[10px]' },
  lg: { px: 88, stroke: 6, font: 'text-2xl', label: 'text-xs' },
}

function bandFor(score: number) {
  if (score >= 90) return { stroke: '#10B981', text: 'text-success', label: 'Excellent fit' }
  if (score >= 75) return { stroke: '#2563EB', text: 'text-primary', label: 'Strong fit' }
  if (score >= 60) return { stroke: '#F59E0B', text: 'text-warning', label: 'Potential fit' }
  return { stroke: '#94A3B8', text: 'text-muted', label: 'Low fit' }
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
            stroke="#E2E8F0"
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
