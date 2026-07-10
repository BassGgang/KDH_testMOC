import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SwRegister } from '@/components/SwRegister';

// Self-hosted via next/font (no runtime external request; PWA-friendly).
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Karate Scoring & Analytics',
  description: '空手の試合得点管理と選手データ分析',
  applicationName: 'Karate',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Karate',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={inter.variable}>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
