'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { GET_PRODUCTS } from '@/lib/graphql/queries';
import { ProductCard } from '@/components/product/ProductCard';
import { Product, Category } from '@/types';
import { Search, Filter, Loader2, Sparkles, Tractor, Sprout, ShieldAlert } from 'lucide-react';

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryParam = (searchParams.get('category') as Category) || undefined;
  const initialSearch = searchParams.get('search') || '';

  const [category, setCategory] = useState<Category | undefined>(categoryParam);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    setCategory(categoryParam);
  }, [categoryParam]);

  const { data, loading, error, refetch } = useQuery(GET_PRODUCTS, {
    variables: {
      category: category || null,
      search: searchTerm.trim() || null,
      page: 1,
      limit: 24,
    },
    fetchPolicy: 'cache-and-network',
  });

  const handleCategoryChange = (cat: Category | undefined) => {
    setCategory(cat);
    const params = new URLSearchParams(searchParams.toString());
    if (cat) {
      params.set('category', cat);
    } else {
      params.delete('category');
    }
    router.push(`/marketplace?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    } else {
      params.delete('search');
    }
    router.push(`/marketplace?${params.toString()}`);
    refetch();
  };

  const products: Product[] = data?.products?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header and Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[var(--color-text-primary)]">
            Agricultural Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
            Browse verified crops, quality fertilizers, and modern equipment rentals
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search wheat, rice, urea, tractor..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-hidden focus:border-[var(--color-primary)]"
            />
          </div>
          <button type="submit" className="btn-primary text-xs !py-2 !px-4">
            Search
          </button>
        </form>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 py-6">
        <button
          onClick={() => handleCategoryChange(undefined)}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            !category
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => handleCategoryChange('CROP')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            category === 'CROP'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'
          }`}
        >
          <Sprout className="w-3.5 h-3.5" />
          Crops & Produce
        </button>
        <button
          onClick={() => handleCategoryChange('FERTILIZER')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            category === 'FERTILIZER'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'
          }`}
        >
          Fertilizers & Nutrients
        </button>
        <button
          onClick={() => handleCategoryChange('EQUIPMENT')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
            category === 'EQUIPMENT'
              ? 'bg-[var(--color-primary)] text-white shadow-xs'
              : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50'
          }`}
        >
          <Tractor className="w-3.5 h-3.5" />
          Machinery & Rentals
        </button>
      </div>

      {/* Products Grid */}
      {loading && !data ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mb-3" />
          <p className="text-sm">Loading agricultural listings from AgroMart network...</p>
        </div>
      ) : error ? (
        <div className="card text-center py-12 border-red-200 bg-red-50/50">
          <ShieldAlert className="w-10 h-10 text-[var(--color-danger)] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-800">Failed to load marketplace listings</h3>
          <p className="text-xs text-gray-600 mt-1">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 btn-outline text-xs !py-1.5 !px-3"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">No listings found</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-sm mx-auto">
            Try adjusting your search query or selecting a different category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-gray-500">Loading marketplace...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
