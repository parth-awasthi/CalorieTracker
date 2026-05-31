'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Home, Package, PlusSquare, CalendarDays, Utensils, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/meals/new', label: 'Log Meal', icon: Utensils },
  { href: '/products/new', label: 'Add Product', icon: PlusSquare },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const showAppLinks = Boolean(user) && !isAuthPage;

  async function logout() {
    await signOut({ callbackUrl: '/' });
  }

  return (
    <>
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur md:block">
        <div className="container flex h-16 items-center justify-between">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 text-lg font-bold">
            <span className="rounded-md bg-primary px-2 py-1 text-primary-foreground">N</span>
            <span>Nutrition Tracker</span>
          </Link>
          <nav className="flex items-center gap-1">
            {showAppLinks &&
              links.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
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
            {showAppLinks && (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="h-4 w-4" />
                  {user?.name ?? 'Profile'}
                </Link>
                <Button type="button" variant="ghost" size="icon" onClick={logout} aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            {!user && (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  Log in
                </Link>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:hidden">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold">
          <span className="rounded-md bg-primary px-1.5 py-0.5 text-sm text-primary-foreground">
            N
          </span>
          {showAppLinks ? user?.name ?? 'Profile' : 'Nutrition'}
        </Link>
        <div className="flex items-center gap-1">
          {showAppLinks && (
            <>
              <Button variant="ghost" size="icon" asChild aria-label="Profile">
                <Link href="/profile">
                  <User className="h-4 w-4" />
                </Link>
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={logout} aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      {showAppLinks && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-background md:hidden">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
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
      )}
    </>
  );
}
