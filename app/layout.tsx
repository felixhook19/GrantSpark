import type { Metadata } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
  axes: ['opsz'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GrantSpark — AI funding intelligence for UK organisations',
    template: '%s · GrantSpark',
  },
  description:
    'GrantSpark is an AI funding intelligence platform for UK charities, start-ups, CICs, community groups and social enterprises — and the consultants and in-house teams who manage funding across them. Find relevant grants, understand eligibility before applying, and track deadlines in one place.',
  keywords: [
    'UK grants',
    'grant finder',
    'charity grants',
    'CIC funding',
    'community grants',
    'social enterprise funding',
    'UK business grants',
    'start-up grants UK',
    'Innovate UK funding',
    'AI grant matching',
    'funding intelligence',
    'fundraising software',
    'grant consultants UK',
  ],
  openGraph: {
    title: 'GrantSpark — AI funding intelligence for UK organisations',
    description:
      'Find grants worth applying for. AI-matched, eligibility-checked and ranked — built for UK charities, start-ups, CICs and community organisations, and the consultants who back them.',
    url: siteUrl,
    siteName: 'GrantSpark',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrantSpark — AI funding intelligence for UK organisations',
    description:
      'Relevant grants, plain-English eligibility and deadline tracking — built for UK charities, start-ups, CICs and community organisations.',
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
    <html lang="en-GB" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="bg-background font-sans text-text antialiased">
        {children}
      </body>
    </html>
  )
}
