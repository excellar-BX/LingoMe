import './global.css'
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata = {
  title: 'AI Translator - Break Language Barriers',
  description: 'AI-powered translation app for travelers and immigrants. Translate text from images, voice, and conversations instantly.',
  keywords: 'AI translator, OCR, speech translation, travel app, language barrier',
  authors: [{ name: 'AI Translator Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'AI Translator - Break Language Barriers',
    description: 'AI-powered translation app for travelers and immigrants',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Translator - Break Language Barriers',
    description: 'AI-powered translation app for travelers and immigrants',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} min-h-screen gradient-bg overflow-x-hidden`}>
        <div className="relative z-0">
          {children}
        </div>
      </body>
    </html>
  )
}
