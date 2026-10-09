import type { Metadata } from 'next';
import { Inter, Merriweather } from 'next/font/google';
import './globals.css';
import { ApolloWrapper } from '@/components/providers/ApolloWrapper';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const merriweather = Merriweather({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-merriweather',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AgroMart — Farmer Marketplace & Equipment Rental',
  description: 'Buy and sell crops, fertilizers, or rent modern farming equipment directly from verified agricultural producers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="antialiased min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <ApolloWrapper>
          <Toaster position="top-right" />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </ApolloWrapper>
      </body>
    </html>
  );
}
