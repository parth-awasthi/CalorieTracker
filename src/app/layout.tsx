import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { AuthProvider } from '@/components/shared/auth-provider';
import { QueryProvider } from '@/lib/query-client';
import { AppNav } from '@/components/shared/app-nav';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  applicationName: 'Nutrition Tracker',
  title: 'Nutrition Tracker',
  description: 'Track your daily calorie & nutrient intake',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nutrition',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#07111f',
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <QueryProvider>
              <AppNav />
              <main className="container py-6 pb-24 md:pb-10">{children}</main>
              <Toaster />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
