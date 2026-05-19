/**
 * GrantSpark logo mark (Forest Heritage direction).
 *
 * Deep forest-green circular field with a stylised four-point spark in
 * cream-white and a small gold centre dot — uses all three brand colours
 * in a single mark.
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
      <circle cx="16" cy="16" r="16" fill="#14532D" />
      <path
        d="M16 6.5 L17.5 14.5 L25 16 L17.5 17.5 L16 25.5 L14.5 17.5 L7 16 L14.5 14.5 Z"
        fill="#FBFAF7"
      />
      <circle cx="16" cy="16" r="1.6" fill="#CA8A04" />
    </svg>
  )
}

/**
 * Logo + wordmark lockup. The wordmark uses the editorial serif (Fraunces)
 * to anchor the Forest Heritage brand tone.
 */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span
        className="font-display font-medium tracking-tightish text-text"
        style={{ fontSize: Math.max(16, size * 0.66) }}
      >
        GrantSpark
      </span>
    </span>
  )
}
