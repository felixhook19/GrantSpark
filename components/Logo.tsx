/**
 * GrantSpark twin-spark mark ("Paper & Ink").
 *
 * Two angled chevrons: the lead spark in score-hi green, the echo in
 * forest-light at 60% opacity. Wordmark: "Grant" in ink, "Spark" in
 * forest, Syne 800.
 *
 * NOTE: Wordmark renders a <span>, not a link — callers wrap it in their
 * own <Link>; nesting anchors breaks hydration.
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
        stroke="#16A34A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 4 L31 16 L17 28"
        stroke="#2D6A4F"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  )
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size * 0.78} />
      <span
        className="font-display tracking-[-0.02em] text-ink"
        style={{ fontSize: Math.max(15, size * 0.7) }}
      >
        Grant<span className="text-forest">Spark</span>
      </span>
    </span>
  )
}
