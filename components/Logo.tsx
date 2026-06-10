/**
 * GrantSpark twin-spark mark ("Purposeful Intelligence").
 *
 * Two angled chevron strokes: the lead spark in Spark Green (the one
 * permitted use outside scores/success states) and an echo in teal-light
 * at 60% opacity.
 *
 * NOTE: Wordmark deliberately renders a <span>, not a link — callers
 * wrap it in their own <Link> (nav, dashboards, auth pages), and nesting
 * anchors breaks hydration.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 4 L21 16 L7 28"
        stroke="#19E88F"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 4 L31 16 L17 28"
        stroke="#00BFA5"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  )
}

/**
 * Logo + wordmark lockup: Syne 800, "Grant" in chalk, "Spark" in
 * teal-light.
 */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size * 0.78} />
      <span
        className="font-display tracking-[-0.02em] text-chalk"
        style={{ fontSize: Math.max(15, size * 0.7) }}
      >
        Grant<span className="text-teal-light">Spark</span>
      </span>
    </span>
  )
}
