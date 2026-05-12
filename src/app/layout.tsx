import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Providers from '@/components/Providers'
import AdminPanel from '@/components/AdminPanel'

export const metadata: Metadata = {
  title: 'Wej - AI Prompt Marketplace',
  description: 'A prompt economy for AI-generated art.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <main className="pt-24 pb-24 md:pb-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
            {children}
          </main>
          <AdminPanel />
        </Providers>
      </body>
    </html>
  )
}
