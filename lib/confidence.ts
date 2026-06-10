// Data-confidence labels (Block 4). Admitting uncertainty is the brand.

export type ConfidenceBand = 'fresh' | 'recent' | 'stale'

export function confidenceLabel(lastVerifiedAt: string | null | undefined): {
  band: ConfidenceBand
  label: string
  dotClass: string
} {
  if (!lastVerifiedAt) {
    return {
      band: 'stale',
      label: 'Sourced over a month ago — verify with the funder before applying',
      dotClass: 'bg-slate',
    }
  }
  const days = Math.floor((Date.now() - new Date(lastVerifiedAt).getTime()) / 86400000)
  if (Number.isNaN(days) || days > 30) {
    return {
      band: 'stale',
      label: 'Sourced over a month ago — verify with the funder before applying',
      dotClass: 'bg-slate',
    }
  }
  if (days <= 7) {
    return {
      band: 'fresh',
      label: `Verified ${days <= 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}`,
      dotClass: 'bg-spark',
    }
  }
  return { band: 'recent', label: `Checked ${days} days ago`, dotClass: 'bg-gold' }
}
