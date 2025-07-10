import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'PeerPoint - Real-time Video Calls',
  description: 'Connect instantly with anyone, anywhere using peer-to-peer video calls',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
        {/* PWA Manifest and Deep Linking Meta Tags */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#6D28D9" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
