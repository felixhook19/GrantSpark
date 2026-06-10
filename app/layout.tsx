import type { Metadata } from 'next'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  weight: ['700', '800'],
  variable: '--font-syne',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-jetbrains',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://grantspark.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GrantSpark — Know before you apply',
    template: '%s · GrantSpark',
  },
  description:
    'GrantSpark matches UK charities to grants they can actually win. AI-powered scoring, honest eligibility analysis, real deadlines. Free to start.',
  keywords: [
    'UK grants',
    'grant finder',
    'charity grants',
    'CIC funding',
    'community grants',
    'social enterprise funding',
    'National Lottery funding',
    'Innovate UK funding',
    'AI grant matching',
    'grant writing',
    'fundraising software',
    'grant consultants UK',
  ],
  openGraph: {
    title: 'GrantSpark — Know before you apply',
    description:
      'AI grant matching for UK charities. We find the grants you can actually win — and tell you exactly why.',
    url: siteUrl,
    siteName: 'GrantSpark',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrantSpark — Know before you apply',
    description:
      'AI grant matching for UK charities. We find the grants you can actually win — and tell you exactly why.',
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
    <html
      lang="en-GB"
      className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body className="bg-background font-sans text-text antialiased">
        {children}
      </body>
    </html>
  )
}
