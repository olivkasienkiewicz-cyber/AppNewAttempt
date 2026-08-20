import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/components/providers';
import { LanguageProvider } from '@/context/LanguageContext';
import './globals.css';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'Studilly — a calmer way to book tutors',
  description:
    'Studilly pairs students with tutors through a quiet, considered booking experience.',
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased font-[family-name:var(--font-inter)]">
        <Providers>
          <LanguageProvider>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
