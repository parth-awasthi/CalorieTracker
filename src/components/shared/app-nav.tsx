'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, PlusSquare, CalendarDays, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/meals/new', label: 'Log Meal', icon: Utensils },
  { href: '/products/new', label: 'Add Product', icon: PlusSquare },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur md:block">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="rounded-md bg-primary px-2 py-1 text-primary-foreground">N</span>
            <span>Nutrition Tracker</span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="rounded-md bg-primary px-1.5 py-0.5 text-sm text-primary-foreground">
            N
          </span>
          Nutrition
        </Link>
        <ThemeToggle />
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-background md:hidden">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px]',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
