import Link from 'next/link'

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M118 12 C124 64, 136 76, 188 82 C136 88, 124 100, 118 152 C112 100, 100 88, 48 82 C100 76, 112 64, 118 12 Z"
        fill="#19E88F"
      />
      <path
        d="M52 116 C55 146, 61 152, 91 155 C61 158, 55 164, 52 194 C49 164, 43 158, 13 155 C43 152, 49 146, 52 116 Z"
        fill="#19E88F"
        fillOpacity="0.85"
      />
    </svg>
  )
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="font-display font-extrabold text-[1.15rem] tracking-tight text-chalk">
        Grant<span className="text-spark">Spark</span>
      </span>
    </Link>
  )
}
