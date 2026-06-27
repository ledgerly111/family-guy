import './globals.css'
import { Fraunces, Manrope } from 'next/font/google'

const manrope = Manrope({ subsets: ['latin'] })
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-brand',
  weight: ['700', '800'],
})

export const metadata = {
  title: 'Family Guy Finance',
  description: 'Mobile-first family income and expense tracker',
  manifest: '/manifest.webmanifest',
  themeColor: '#170624',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Family Guy',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/family-guy-icon.svg', type: 'image/svg+xml' },
      { url: '/family-guy-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/family-guy-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/family-guy-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/family-guy-icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/family-guy-icon-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/family-guy-icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#170624" />
      </head>
      <body className={`${manrope.className} ${fraunces.variable}`}>{children}</body>
    </html>
  )
}
