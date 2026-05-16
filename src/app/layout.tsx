import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { QueryProvider } from '@/lib/query-client';
import { AppNav } from '@/components/shared/app-nav';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Nutrition Tracker',
  description: 'Track your daily calorie & nutrient intake',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AppNav />
            <main className="container py-6 pb-24 md:pb-10">{children}</main>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
