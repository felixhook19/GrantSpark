import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'opsz'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GrantSpark — AI funding intelligence for UK charities and community organisations',
    template: '%s · GrantSpark',
  },
  description:
    'GrantSpark is a funding intelligence platform for UK charities, CICs, community groups and social enterprises — and the consultants who support them. Find relevant grants, understand eligibility before applying, and track deadlines in one place.',
  keywords: [
    'UK grants',
    'grant finder',
    'charity grants',
    'CIC funding',
    'community grants',
    'social enterprise funding',
    'AI grant matching',
    'funding intelligence',
    'fundraising software',
    'grant consultants UK',
  ],
  openGraph: {
    title: 'GrantSpark — AI funding intelligence for UK charities and community organisations',
    description:
      'Find grants worth applying for. With care. Built for UK charities, CICs and community organisations — and the consultants who support them.',
    url: siteUrl,
    siteName: 'GrantSpark',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrantSpark — AI funding intelligence for UK charities and community organisations',
    description:
      'Relevant grants, plain-English eligibility and deadline tracking — built for UK civil society.',
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
    <html lang="en-GB" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-background font-sans text-text antialiased">
        {children}
      </body>
    </html>
  )
}
