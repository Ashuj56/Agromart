import Link from 'next/link';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { MapPin, Star, Tag, Clock } from 'lucide-react';

export function ProductCard({ product }: { product: Product }) {
  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="card flex flex-col group overflow-hidden border hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-200">
      {/* Product Image */}
      <div className="relative aspect-4/3 -mx-5 -mt-5 mb-4 overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              product.category === 'CROP'
                ? 'bg-emerald-100 text-emerald-800'
                : product.category === 'FERTILIZER'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {product.category}
          </span>
          {product.isRental && (
            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Rental
            </span>
          )}
        </div>

        {/* Rating */}
        {product.avgRating && (
          <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-md flex items-center gap-1 text-xs font-semibold shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{product.avgRating}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-base text-[var(--color-text-primary)] line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">
            {product.name}
          </h3>

          {product.seller?.location && (
            <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] mt-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
              <span className="truncate">{product.seller.location}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-end justify-between">
          <div>
            <div className="text-[11px] text-[var(--color-text-muted)] font-medium">
              {product.isRental ? 'Rental Rate' : 'Price'}
            </div>
            <div className="text-lg font-bold text-[var(--color-primary)]">
              {formatPrice(product.price)}
              <span className="text-xs font-normal text-[var(--color-text-secondary)] ml-1">
                / {product.priceUnit}
              </span>
            </div>
          </div>

          <Link
            href={`/product/${product.id}`}
            className="btn-outline !py-1.5 !px-3 text-xs"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
