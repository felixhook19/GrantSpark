/**
 * ScoreRing — the brand graphic device.
 *
 * SVG progress ring whose arc shifts rose (low) → gold (mid) → spark
 * green (high). spark is reserved for exactly this kind of score
 * display. Pure SVG + CSS (no hooks), so it renders in both server and
 * client components; the fill animates on mount via the .ring-animate
 * keyframes in globals.css (reduced-motion aware).
 *
 * Bands: >=70 spark · 45-69 gold · <45 rose.
 */
export function bandColour(score: number): { hex: string; text: string; label: string } {
  if (score >= 70) return { hex: '#19E88F', text: 'text-spark', label: 'Strong fit' }
  if (score >= 45) return { hex: '#D4A017', text: 'text-gold', label: 'Possible fit' }
  return { hex: '#C62828', text: 'text-rose', label: 'Poor fit' }
}

export function ScoreRing({
  score,
  size = 48,
  showLabel = false,
}: {
  score: number
  size?: number
  showLabel?: boolean
}) {
  const safe = Math.max(0, Math.min(100, Math.round(score)))
  const stroke = Math.max(3, Math.round(size / 11))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - safe / 100)
  const band = bandColour(safe)
  const fontPx = Math.max(11, Math.round(size * 0.3))

  return (
    <div className="inline-flex flex-col items-center">
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={band.hex}
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
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono font-semibold leading-none ${band.text}`}
          style={{ fontSize: fontPx }}
        >
          {safe}
        </span>
      </div>
      {showLabel && (
        <span className={`mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] ${band.text}`}>
          {band.label}
        </span>
      )}
      <span className="sr-only">Match score: {safe} out of 100.</span>
    </div>
  )
}
