import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GrantSpark — AI grant discovery for UK charities and community organisations',
    template: '%s · GrantSpark',
  },
  description:
    'GrantSpark is an AI grant discovery and matching platform for charities, CICs, community groups and social enterprises. Find relevant grants faster, understand eligibility before applying, and track deadlines in one place.',
  keywords: [
    'UK grants',
    'grant finder',
    'charity grants',
    'CIC funding',
    'community grants',
    'social enterprise funding',
    'AI grant matching',
    'grant discovery',
    'fundraising software',
  ],
  openGraph: {
    title: 'GrantSpark — AI grant discovery for UK charities and community organisations',
    description:
      'Find the grants your organisation is actually eligible for, with plain-English eligibility, deadline tracking and an AI assistant that helps you apply.',
    url: siteUrl,
    siteName: 'GrantSpark',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrantSpark — AI grant discovery for UK charities and community organisations',
    description:
      'Relevant grants, plain-English eligibility and deadline tracking — built for UK charities, CICs and community groups.',
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
    <html lang="en-GB" className={inter.variable}>
      <body className="bg-background font-sans text-text antialiased">
        {children}
      </body>
    </html>
  )
}
