import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Zyra Legal - Jurídico Inteligente',
  description: 'Sistema jurídico completo com IA para escritórios de advocacia',
  icons: {
    icon: '/zyra.icone.png',
    shortcut: '/zyra.icone.png',
    apple: '/zyra.icone.png',
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