import type { Metadata } from 'next'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GrantSpark — Funding found.',
    template: '%s · GrantSpark',
  },
  description:
    'GrantSpark scans every UK funder and uses AI to surface the grants your organisation is actually eligible for — ranked, with plain-English eligibility and deadline alerts.',
  keywords: [
    'UK grants',
    'grant funding',
    'AI grant matching',
    'business grants UK',
    'Innovate UK funding',
    'grant finder',
  ],
  openGraph: {
    title: 'GrantSpark — Funding found.',
    description:
      'The AI grant-matching platform for UK founders and small businesses.',
    url: siteUrl,
    siteName: 'GrantSpark',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrantSpark — Funding found.',
    description:
      'The AI grant-matching platform for UK founders and small businesses.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-GB">
      <body className="bg-midnight font-body text-chalk antialiased">
        {children}
      </body>
    </html>
  )
}
