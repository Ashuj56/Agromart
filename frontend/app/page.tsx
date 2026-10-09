'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_FEATURED_PRODUCTS } from '@/lib/graphql/queries';
import { ProductCard } from '@/components/product/ProductCard';
import { Product } from '@/types';
import {
  Sprout,
  Tractor,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Truck,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const { data, loading } = useQuery(GET_FEATURED_PRODUCTS);
  const featured: Product[] = data?.featuredProducts || [];

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--color-primary-pale)] to-[var(--color-background)] border-b border-[var(--color-border)] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[var(--color-primary)]/20 text-xs font-semibold text-[var(--color-primary)] shadow-xs mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              India's Next-Gen Agricultural Commerce Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading text-[var(--color-text-primary)] tracking-tight leading-tight">
              Fair Prices for Crops, Quality Inputs & Farm Machinery Rentals
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed">
              Connect directly with verified farmers and producers. Trade seasonal harvests, purchase certified fertilizers, and rent heavy tractors with transparent pricing.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/marketplace"
                className="btn-primary text-sm font-semibold !py-3 !px-6 shadow-sm hover:shadow-md"
              >
                Explore Marketplace
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/marketplace?category=EQUIPMENT"
                className="btn-outline text-sm font-semibold !py-3 !px-6 bg-white"
              >
                <Tractor className="w-4 h-4 mr-2 text-[var(--color-accent)]" />
                Rent Equipment
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Stats Counter */}
      <section className="bg-white border-b border-[var(--color-border)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-[var(--color-primary)]">
              ₹0
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
              Middleman Commission
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-[var(--color-primary)]">
              100%
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
              Verified Producers
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-[var(--color-accent)]">
              24/7
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
              Instant Razorpay Checkout
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-heading text-[var(--color-primary)]">
              Multi-State
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">
              Punjab, Gujarat & Haryana
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-[var(--color-text-primary)]">
            Everything a Modern Farmer Needs
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-2">
            A unified ecosystem designed for crop sales, input supplies, and machinery sharing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link
            href="/marketplace?category=CROP"
            className="card group hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Sprout className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Crops & Grains</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                Direct procurement of Sharbati wheat, 1121 Basmati rice, mustard seeds, and fresh vegetables straight from farm gates.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-[var(--color-primary)]">
              Browse Crops <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            href="/marketplace?category=FERTILIZER"
            className="card group hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Fertilizers & Pesticides</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                Government-standard Neem coated urea, DAP, Potash, and certified organic bio-fertilizers at regulated transparent prices.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-[var(--color-primary)]">
              Browse Fertilizers <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            href="/marketplace?category=EQUIPMENT"
            className="card group hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Tractor className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Machinery & Rentals</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                Affordable per-day rental for tractors, combine harvesters, and disc harrows. Buy solar submersible pumps with warranty.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-[var(--color-primary)]">
              Rent or Buy Machinery <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-white border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold font-heading text-[var(--color-text-primary)]">
                Featured Listings
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Hand-picked high demand agricultural products ready for dispatch
              </p>
            </div>
            <Link
              href="/marketplace"
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="card h-64 animate-pulse bg-gray-100" />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {featured.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Featured listings will populate once products are seeded in the database.
              </p>
              <Link href="/marketplace" className="mt-3 inline-block btn-primary text-xs">
                Go to Marketplace
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
