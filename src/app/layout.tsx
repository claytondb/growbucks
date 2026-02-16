import type { Metadata, Viewport } from 'next';
import { Nunito, Inter, DM_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['700', '800'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'GrowBucks - Teach Kids About Compound Interest',
  description: 'A fun way for kids to learn about saving and compound interest. Watch your money grow!',
  keywords: ['savings', 'kids', 'compound interest', 'financial literacy', 'education'],
  authors: [{ name: 'GrowBucks' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2ECC71',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${inter.variable} ${dmMono.variable} antialiased bg-[#F8FAFE] min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
