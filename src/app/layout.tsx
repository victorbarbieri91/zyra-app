import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#34495e',
}

export const metadata: Metadata = {
  title: 'Zyra Legal - Jurídico Inteligente',
  description: 'Sistema jurídico completo com IA para escritórios de advocacia',
  manifest: '/manifest.json',
  icons: {
    icon: '/zyra.icone_sem_fundo.png',
    shortcut: '/zyra.icone_sem_fundo.png',
    apple: '/zyra.icone_sem_fundo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zyra Legal',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #D4DCE8',
            },
          }}
        />
      </body>
    </html>
  )
}