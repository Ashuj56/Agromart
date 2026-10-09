'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useReactiveVar } from '@apollo/client';
import { currentUserVar, authTokenVar } from '@/lib/apollo-client';
import {
  Sprout, ShoppingCart, Tractor, LogOut,
  PackagePlus, Menu, X, Wheat, FlaskConical,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/marketplace',                    label: 'All Products',        icon: null },
  { href: '/marketplace?category=CROP',      label: 'Crops',               icon: <Wheat className="w-4 h-4" /> },
  { href: '/marketplace?category=FERTILIZER',label: 'Fertilizers',         icon: <FlaskConical className="w-4 h-4" /> },
  { href: '/marketplace?category=EQUIPMENT', label: 'Equipment & Rentals', icon: <Tractor className="w-4 h-4 text-[var(--color-accent)]" /> },
];

export function Navbar() {
  const user = useReactiveVar(currentUserVar);
  // Prevent hydration mismatch: localStorage not available on server
  const [mounted, setMounted]     = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close mobile menu on route change / resize
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('agromart_token');
    localStorage.removeItem('agromart_user');
    authTokenVar(null);
    currentUserVar(null);
    setMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* ── Brand Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--color-primary)]/20 shadow-xs flex items-center justify-center bg-white group-hover:scale-105 transition-transform shrink-0">
            <Image
              src="/logo.jpg"
              alt="AgroMart Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold text-[var(--color-primary)] tracking-tight leading-none">
              Agro<span className="text-[var(--color-accent)]">Mart</span>
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
              Farmer Marketplace
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav Links ── */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Desktop Auth Actions ── */}
        <div className="hidden md:flex items-center gap-2">
          {!mounted ? (
            <div className="h-8 w-24 rounded-md bg-gray-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {(user.role === 'SELLER' || user.role === 'BOTH') && (
                <Link
                  href="/sell"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--color-primary-pale)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  List Product
                </Link>
              )}
              <Link
                href="/orders"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--color-border)] hover:bg-gray-50 text-[var(--color-text-secondary)]"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Orders
              </Link>
              <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--color-border)]">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)] max-w-[80px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--color-accent)] uppercase">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-gray-400 hover:text-[var(--color-danger)] transition-colors rounded-md"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-semibold rounded-md border border-[var(--color-border)] hover:bg-gray-50 text-[var(--color-text-primary)]"
              >
                Log In
              </Link>
              <Link href="/register" className="btn-primary text-xs !py-2 !px-4">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* ── Mobile: Hamburger + Auth shortcut ── */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && user && (
            <Link
              href="/orders"
              onClick={() => setMenuOpen(false)}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
              aria-label="My Orders"
            >
              <ShoppingCart className="w-5 h-5" />
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            className="p-2 rounded-md text-[var(--color-text-secondary)] hover:bg-gray-100 transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-white shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-pale)] hover:text-[var(--color-primary)] transition-colors"
              >
                {link.icon ?? <span className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Auth Section */}
          <div className="border-t border-[var(--color-border)] px-4 py-4">
            {!mounted ? null : user ? (
              <div className="space-y-2">
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-primary-pale)]">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</p>
                    <p className="text-[10px] font-bold text-[var(--color-accent)] uppercase">{user.role}</p>
                  </div>
                </div>

                {(user.role === 'SELLER' || user.role === 'BOTH') && (
                  <Link
                    href="/sell"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)] transition-colors"
                  >
                    <PackagePlus className="w-4 h-4" />
                    List a Product
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-center py-2.5 text-sm font-semibold rounded-md border border-[var(--color-border)] hover:bg-gray-50 text-[var(--color-text-primary)]"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary text-sm text-center"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
