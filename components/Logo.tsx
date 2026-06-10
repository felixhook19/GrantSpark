/**
 * GrantSpark logo mark ("Purposeful Intelligence" direction).
 *
 * Elevated midnight field with the four-point spark in Spark Green —
 * the one place outside scores and success states where spark green
 * is permitted — and a Trust Teal centre dot.
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
      <circle cx="16" cy="16" r="16" fill="#2C2C48" />
      <path
        d="M16 6.5 L17.5 14.5 L25 16 L17.5 17.5 L16 25.5 L14.5 17.5 L7 16 L14.5 14.5 Z"
        fill="#19E88F"
      />
      <circle cx="16" cy="16" r="1.6" fill="#00897B" />
    </svg>
  )
}

/**
 * Logo + wordmark lockup. Syne 800 with "Spark" in Spark Green.
 */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span
        className="font-display tracking-tightest text-text"
        style={{ fontSize: Math.max(16, size * 0.66) }}
      >
        Grant<span className="text-spark">Spark</span>
      </span>
    </span>
  )
}
