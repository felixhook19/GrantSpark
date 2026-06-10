import Link from 'next/link'

// Reusable locked-state card (Block 1). Honest, no dark patterns.
export function UpgradePrompt({
  feature,
  value,
  tier,
}: {
  feature: string
  value: string
  tier: 'Seeker' | 'Strategist'
}) {
  return (
    <div className={`rounded-lg border p-6 ${tier === 'Strategist' ? 'border-purple' : 'border-teal/40'} bg-midnight-2`}>
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-teal-light">
        // {tier} feature
      </p>
      <p className="mt-2 font-body text-[15px] font-semibold text-chalk">{feature}</p>
      <p className="mt-1.5 font-body text-[13px] leading-[1.6] text-slate">{value}</p>
      <Link
        href="/pricing"
        className="mt-4 inline-flex rounded bg-teal px-4 py-2 font-body text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-light"
      >
        See plans
      </Link>
    </div>
  )
}
