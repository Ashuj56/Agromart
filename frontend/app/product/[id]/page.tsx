'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useReactiveVar } from '@apollo/client';
import { GET_PRODUCT } from '@/lib/graphql/queries';
import { PLACE_ORDER, ADD_REVIEW } from '@/lib/graphql/mutations';
import { currentUserVar } from '@/lib/apollo-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { Product, Review } from '@/types';
import {
  MapPin,
  Star,
  Clock,
  ShieldCheck,
  CheckCircle,
  Truck,
  Loader2,
  Calendar,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const user = useReactiveVar(currentUserVar);

  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ordering, setOrdering] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_PRODUCT, {
    variables: { id },
    skip: !id,
  });

  const [placeOrder] = useMutation(PLACE_ORDER);
  const [addReview] = useMutation(ADD_REVIEW);

  const product: Product | undefined = data?.product;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[var(--color-text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mb-2" />
        <p className="text-sm">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-800">Product not found</h2>
        <p className="text-xs text-gray-500 mt-2">{error?.message || 'This listing may have been removed.'}</p>
        <Link href="/marketplace" className="mt-4 inline-block btn-primary text-xs">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  // Calculate rental days if applicable
  let rentalDays = 1;
  if (product.isRental && startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) rentalDays = diff;
  }

  const calculatedTotal = product.isRental
    ? product.price * rentalDays * quantity
    : product.price * quantity;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to place an order');
      router.push('/login');
      return;
    }

    if (product.isRental && (!startDate || !endDate)) {
      toast.error('Please select both rental start and end dates');
      return;
    }

    setOrdering(true);
    try {
      const orderVariables: Record<string, unknown> = {
        productId: product.id,
        quantity: Number(quantity),
      };
      if (product.isRental) {
        orderVariables.rentalStartDate = startDate;
        orderVariables.rentalEndDate = endDate;
      }

      const { data: orderData } = await placeOrder({
        variables: orderVariables,
      });

      if (orderData?.placeOrder) {
        toast.success('Order placed successfully! Redirecting to checkout...');
        router.push('/orders');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setOrdering(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit a review');
      return;
    }

    setSubmittingReview(true);
    try {
      const trimmedComment = reviewComment.trim();
      await addReview({
        variables: {
          productId: product.id,
          rating: Number(reviewRating),
          comment: trimmedComment.length > 0 ? trimmedComment : null,
        },
      });
      toast.success('Thank you! Your review has been recorded.');
      setReviewComment('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image and Reviews */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl overflow-hidden border border-[var(--color-border)] bg-white aspect-16/10">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-bold font-heading text-[var(--color-text-primary)]">
              Product Overview & Specifications
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {product.description || 'No additional description provided for this listing.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[var(--color-border)] text-xs">
              <div>
                <span className="text-[var(--color-text-muted)] block">Category</span>
                <span className="font-semibold text-gray-800">{product.category}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Listing Type</span>
                <span className="font-semibold text-gray-800">
                  {product.isRental ? 'Rental Equipment' : 'Direct Purchase'}
                </span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Stock Status</span>
                <span className="font-semibold text-emerald-700">
                  {product.stock} {product.priceUnit}s available
                </span>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="card space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="font-bold font-heading text-base text-[var(--color-text-primary)]">
                Customer Reviews
              </h3>
              {product.avgRating ? (
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{product.avgRating} / 5.0</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-normal">
                    ({product.reviews?.length || 0} reviews)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">No ratings yet</span>
              )}
            </div>

            {/* List existing reviews */}
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-4 divide-y divide-[var(--color-border)]">
                {product.reviews.map((r: Review) => (
                  <div key={r.id} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">
                          {r.reviewer?.name || 'Verified Buyer'}
                        </span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: Math.min(5, Math.max(1, Math.floor(r.rating || 5))) }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] italic">
                Be the first to review this product after your order is delivered!
              </p>
            )}

            {/* Add Review Box */}
            <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-[var(--color-border)] space-y-3">
              <h4 className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Leave a Verified Review
              </h4>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-700">Rating:</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="text-xs border border-[var(--color-border)] rounded-md px-2 py-1 bg-white"
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={2}
                placeholder="Share your experience with quality, dispatch, or machine performance..."
                className="w-full text-xs p-2.5 rounded-md border border-[var(--color-border)] focus:outline-hidden focus:border-[var(--color-primary)] bg-white"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="btn-outline text-xs !py-1.5 !px-3 disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Pricing & Purchase Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card sticky top-24 space-y-6 border border-[var(--color-border)] shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {product.category}
                </span>
                {product.isRental && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Rental Equipment
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold font-heading text-[var(--color-text-primary)]">
                {product.name}
              </h1>

              {product.seller && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mt-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span>
                    Listed by <strong className="text-gray-800">{product.seller.name}</strong> •{' '}
                    {product.seller.location || 'India'}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-[var(--color-primary-pale)] border border-[var(--color-primary)]/10">
              <span className="text-xs text-[var(--color-text-muted)] font-medium">
                {product.isRental ? 'Daily Rental Rate' : 'Unit Price'}
              </span>
              <div className="text-2xl font-bold text-[var(--color-primary)] mt-0.5">
                {formatPrice(product.price)}
                <span className="text-xs font-normal text-[var(--color-text-secondary)] ml-1">
                  / {product.priceUnit}
                </span>
              </div>
            </div>

            {/* Order / Rental Form */}
            <form onSubmit={handleOrder} className="space-y-4">
              {product.isRental ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-md border border-[var(--color-border)] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-md border border-[var(--color-border)] bg-white"
                      />
                    </div>
                  </div>
                  {startDate && endDate && (
                    <div className="text-xs text-[var(--color-text-secondary)] bg-gray-50 p-2.5 rounded-md">
                      Duration: <strong>{rentalDays} day(s)</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Order Quantity ({product.priceUnit}s)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-sm p-2 rounded-md border border-[var(--color-border)] bg-white"
                  />
                  <span className="text-[11px] text-[var(--color-text-muted)] mt-1 block">
                    Available stock: {product.stock} {product.priceUnit}s
                  </span>
                </div>
              )}

              {/* Total Calculation */}
              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total Payable:</span>
                <span className="text-xl font-bold text-[var(--color-primary)]">
                  {formatPrice(calculatedTotal)}
                </span>
              </div>

              <button
                type="submit"
                disabled={ordering || (!product.isRental && product.stock <= 0)}
                className="btn-primary w-full !py-3 text-sm font-semibold disabled:opacity-50"
              >
                {ordering ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Order...
                  </span>
                ) : !product.isRental && product.stock <= 0 ? (
                  'Out of Stock'
                ) : product.isRental ? (
                  'Book Rental'
                ) : (
                  'Buy Now & Checkout'
                )}
              </button>
            </form>

            {/* Buyer Protection guarantees */}
            <div className="space-y-2 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span>Protected by AgroMart Escrow with Razorpay</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span>Direct farmer verification and inspection guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
