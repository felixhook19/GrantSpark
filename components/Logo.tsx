/**
 * GrantSpark logo mark.
 *
 * A clean, SaaS-style spark glyph in primary blue — a stylised four-point
 * burst built from two intersecting strokes. Sized by `size` prop.
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
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <path
        d="M16 6.5 L17.6 13.2 L24 14.8 L17.6 16.4 L16 23.1 L14.4 16.4 L8 14.8 L14.4 13.2 Z"
        fill="#FFFFFF"
      />
      <circle cx="16" cy="14.8" r="2" fill="#2563EB" />
    </svg>
  )
}

/**
 * Inline wordmark + logo for use in nav / footer / auth pages.
 * Renders the icon plus a tightly-tracked "GrantSpark" lockup.
 */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span
        className="font-semibold tracking-tightish text-text"
        style={{ fontSize: Math.max(15, size * 0.62) }}
      >
        GrantSpark
      </span>
    </span>
  )
}
