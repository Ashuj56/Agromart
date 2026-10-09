import Link from 'next/link';
import { Sprout, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-white print:hidden">
      {/* Trust badges */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-primary-pale)]/50 py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Verified Farmer Listings</h4>
              <p className="text-xs text-[var(--color-text-secondary)]">Direct farm-to-buyer transactions with zero middlemen</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Fast & Transparent Logistics</h4>
              <p className="text-xs text-[var(--color-text-secondary)]">Bulk dispatch for crops, certified seeds & machinery</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Secure Payments</h4>
              <p className="text-xs text-[var(--color-text-secondary)]">Integrated Razorpay gateway with instant verification</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[var(--color-primary)]" />
          <span>© {new Date().getFullYear()} AgroMart. Empowering Indian Agriculture.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/marketplace?category=CROP" className="hover:text-[var(--color-primary)]">Crops</Link>
          <Link href="/marketplace?category=FERTILIZER" className="hover:text-[var(--color-primary)]">Fertilizers</Link>
          <Link href="/marketplace?category=EQUIPMENT" className="hover:text-[var(--color-primary)]">Machinery Rentals</Link>
        </div>
      </div>
    </footer>
  );
}
