'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useReactiveVar } from '@apollo/client';
import { GET_MY_ORDERS } from '@/lib/graphql/queries';
import { CANCEL_ORDER } from '@/lib/graphql/mutations';
import { currentUserVar } from '@/lib/apollo-client';
import { PayButton } from '@/components/payment/PayButton';
import { formatPrice, formatDate } from '@/lib/utils';
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  Calendar,
  RefreshCw,
  Search,
  Copy,
  Check,
  ExternalLink,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  Printer,
  X,
  ShieldCheck,
  Sprout,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Status badge and timeline configurations
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
    icon: React.ReactNode;
    stepIndex: number;
  }
> = {
  PENDING: {
    label: 'Awaiting Payment',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    stepIndex: 1,
  },
  CONFIRMED: {
    label: 'Order Confirmed',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-500',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
    stepIndex: 2,
  },
  SHIPPED: {
    label: 'In Transit',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-500',
    icon: <Truck className="w-3.5 h-3.5 text-purple-600" />,
    stepIndex: 3,
  },
  DELIVERED: {
    label: 'Delivered',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    stepIndex: 4,
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-200',
    dotColor: 'bg-rose-500',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    stepIndex: 0,
  },
};

const ORDER_STEPS = [
  { step: 1, title: 'Placed', desc: 'Order received' },
  { step: 2, title: 'Confirmed', desc: 'Payment verified' },
  { step: 3, title: 'Shipped', desc: 'Dispatched to farm' },
  { step: 4, title: 'Delivered', desc: 'Fulfilled' },
];

export default function OrdersPage() {
  const router = useRouter();
  const user = useReactiveVar(currentUserVar);
  const [mounted, setMounted] = useState(false);

  // Filter & Search state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');

  // Modals state
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, loading, error, refetch } = useQuery(GET_MY_ORDERS, {
    skip: !mounted || !user,
    fetchPolicy: 'cache-and-network',
  });

  const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user, router]);

  const orders: any[] = useMemo(() => data?.myOrders ?? [], [data]);

  // Aggregate KPI metrics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const inTransit = orders.filter((o) => o.status === 'SHIPPED' || o.status === 'CONFIRMED').length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    const totalSpent = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

    return { total, pending, inTransit, delivered, totalSpent };
  }, [orders]);

  // Filtered & sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Tab Filter
        if (statusFilter === 'PENDING' && order.status !== 'PENDING') return false;
        if (statusFilter === 'IN_TRANSIT' && order.status !== 'CONFIRMED' && order.status !== 'SHIPPED') return false;
        if (statusFilter === 'DELIVERED' && order.status !== 'DELIVERED') return false;
        if (statusFilter === 'CANCELLED' && order.status !== 'CANCELLED') return false;

        // Search Query (matches Order ID, product name, or category)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesId = order.id.toLowerCase().includes(q);
          const matchesName = order.product?.name?.toLowerCase().includes(q);
          const matchesCategory = order.product?.category?.toLowerCase().includes(q);
          if (!matchesId && !matchesName && !matchesCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'amount_high') return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
        if (sortBy === 'amount_low') return parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
        return 0;
      });
  }, [orders, statusFilter, searchQuery, sortBy]);

  const handleCopyId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    toast.success('Order ID copied to clipboard');
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    try {
      await cancelOrder({ variables: { orderId: cancelModalOrder.id } });
      toast.success('Order cancelled successfully.');
      setCancelModalOrder(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order');
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-16 print:bg-white print:pb-0 print:p-0">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-[var(--color-border)] print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] mb-1">
                <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
                <span>/</span>
                <span className="text-[var(--color-text-secondary)]">Account</span>
                <span>/</span>
                <span className="text-[var(--color-primary)] font-semibold">Orders & Bookings</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[var(--color-text-primary)] flex items-center gap-2.5">
                <ShoppingBag className="w-7 h-7 text-[var(--color-primary)] flex-shrink-0" />
                My Orders & Rentals
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Real-time tracking, digital invoices, and shipment status for your farm supplies
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[var(--color-text-secondary)] bg-white border border-[var(--color-border)] rounded-lg hover:bg-gray-50 hover:text-[var(--color-primary)] transition-all shadow-sm active:scale-95"
                title="Refresh latest order status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <Link
                href="/marketplace"
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Browse Market
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/70 hover:bg-white hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
                <span>Total Orders</span>
                <Package className="w-4 h-4 text-gray-500" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] font-heading">
                {stats.total}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">All time orders</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 hover:bg-amber-50 transition-all">
              <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
                <span>Awaiting Action</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-amber-900 font-heading">
                {stats.pending}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">Payment pending</div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/60 hover:bg-blue-50 transition-all">
              <div className="flex items-center justify-between text-xs text-blue-800 font-medium">
                <span>In Progress</span>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-blue-900 font-heading">
                {stats.inTransit}
              </div>
              <div className="text-[11px] text-blue-700/80 mt-0.5">Confirmed & shipping</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60 hover:bg-emerald-50 transition-all">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                <span>Total Investment</span>
                <Sprout className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-emerald-950 font-heading truncate">
                {formatPrice(stats.totalSpent)}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">{stats.delivered} fulfilled orders</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:hidden">
        {/* Controls: Search, Filters & Tabs */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs">
              {[
                { id: 'ALL', label: 'All Orders', count: stats.total },
                { id: 'PENDING', label: 'Pending Payment', count: stats.pending },
                { id: 'IN_TRANSIT', label: 'In Progress', count: stats.inTransit },
                { id: 'DELIVERED', label: 'Delivered', count: stats.delivered },
                { id: 'CANCELLED', label: 'Cancelled', count: orders.filter((o) => o.status === 'CANCELLED').length },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-[var(--color-text-secondary)] hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by order ID or crop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-[var(--color-border)] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="pl-8 pr-7 py-2 text-xs bg-gray-50 border border-[var(--color-border)] rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text-secondary)] font-medium appearance-none cursor-pointer"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="amount_high">Highest amount</option>
                    <option value="amount_low">Lowest amount</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-48" />
                  <div className="h-6 bg-gray-200 rounded-full w-24" />
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center shadow-sm max-w-xl mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-gray-900">Unable to load orders</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="btn-primary text-xs mt-5 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* Empty states */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-pale)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>

            {orders.length === 0 ? (
              <div className="max-w-md mx-auto space-y-3">
                <h3 className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
                  You haven&apos;t placed any orders yet
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Discover verified farmers, fresh bulk harvest, government-approved fertilizers, and tractor rentals ready for dispatch.
                </p>
                <div className="pt-3 flex flex-wrap justify-center gap-3">
                  <Link href="/marketplace?category=CROP" className="btn-primary text-xs">
                    Explore Crops
                  </Link>
                  <Link href="/marketplace?category=EQUIPMENT" className="btn-outline text-xs">
                    Rent Farm Equipment
                  </Link>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-3">
                <h3 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">
                  No orders match your filter
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  No orders found matching status &quot;{statusFilter}&quot;{searchQuery ? ` and search &quot;${searchQuery}&quot;` : ''}.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setStatusFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="btn-outline text-xs inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Cards List */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="space-y-5">
            {filteredOrders.map((order: any) => {
              const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
              const isCancelled = order.status === 'CANCELLED';
              const productImage =
                order.product?.images?.length > 0
                  ? order.product.images[0]
                  : 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80';

              const isCopied = copiedOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-gray-50/70 border-b border-[var(--color-border)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      {/* Order Reference */}
                      <div className="flex items-center gap-1.5 font-mono text-[var(--color-text-primary)] font-semibold">
                        <span className="text-gray-400">#</span>
                        <span>AGRO-{order.id.slice(0, 8).toUpperCase()}</span>
                        <button
                          onClick={() => handleCopyId(order.id)}
                          title="Copy Full Order ID"
                          className="p-1 rounded hover:bg-gray-200/70 text-gray-500 hover:text-gray-800 transition-colors ml-0.5"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="hidden sm:block text-gray-300">|</div>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Placed on {formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor} animate-pulse`} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Card Main Body */}
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-5">
                      {/* Product Thumbnail */}
                      <div className="relative w-full sm:w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 group">
                        <img
                          src={productImage}
                          alt={order.product?.name ?? 'AgroMart Product'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {order.product?.category && (
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-xs">
                            {order.product.category}
                          </span>
                        )}
                      </div>

                      {/* Product & Order Information */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                            <Link
                              href={`/product/${order.product?.id}`}
                              className="font-heading font-bold text-base sm:text-lg text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 group"
                            >
                              <span className="group-hover:underline">{order.product?.name ?? 'Product'}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0" />
                            </Link>

                            <div className="text-left sm:text-right">
                              <span className="text-xs text-[var(--color-text-muted)] block">Total Amount</span>
                              <span className="text-lg font-bold text-[var(--color-primary)] font-heading">
                                {formatPrice(order.totalAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Meta Row: Quantity, Unit Price */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--color-text-secondary)]">
                            <span className="inline-flex items-center gap-1 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
                              Qty:{' '}
                              <strong className="text-[var(--color-text-primary)]">
                                {order.quantity} {order.product?.priceUnit || 'unit(s)'}
                              </strong>
                            </span>
                            {order.product?.price && (
                              <span>
                                Unit Price: <strong className="text-gray-700">{formatPrice(order.product.price)}</strong> / {order.product.priceUnit}
                              </span>
                            )}
                          </div>

                          {/* Rental duration pill if applicable */}
                          {order.rentalStartDate && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                              <Calendar className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              <span className="font-medium">
                                Rental Period: <strong>{formatDate(order.rentalStartDate)}</strong> →{' '}
                                <strong>{formatDate(order.rentalEndDate)}</strong>
                              </span>
                            </div>
                          )}

                          {/* Payment information tag */}
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            {order.payment?.status === 'SUCCESS' ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Payment Verified · Razorpay
                                {order.payment.razorpayOrderId && (
                                  <span className="text-emerald-900/60 font-mono text-[10px]">
                                    ({order.payment.razorpayOrderId.slice(-8)})
                                  </span>
                                )}
                              </span>
                            ) : order.payment?.status === 'FAILED' ? (
                              <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md font-medium text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                Payment Unsuccessful
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-medium text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Pending Checkout Payment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stepper Timeline (for non-cancelled orders) */}
                    {!isCancelled ? (
                      <div className="mt-6 pt-5 border-t border-gray-100">
                        <div className="relative">
                          {/* Progress track */}
                          <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full z-0" />
                          <div
                            className="hidden sm:block absolute top-1/2 left-0 h-1 bg-[var(--color-primary)] -translate-y-1/2 rounded-full z-0 transition-all duration-500"
                            style={{
                              width:
                                statusCfg.stepIndex === 1
                                  ? '12%'
                                  : statusCfg.stepIndex === 2
                                  ? '40%'
                                  : statusCfg.stepIndex === 3
                                  ? '72%'
                                  : '100%',
                            }}
                          />

                          {/* Stepper items */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                            {ORDER_STEPS.map((s) => {
                              const isCompleted = statusCfg.stepIndex >= s.step;
                              const isCurrent = statusCfg.stepIndex === s.step;

                              return (
                                <div
                                  key={s.step}
                                  className={`flex items-center sm:flex-col sm:items-center p-2 rounded-lg sm:p-0 transition-colors ${
                                    isCurrent ? 'bg-emerald-50/60 sm:bg-transparent' : ''
                                  }`}
                                >
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs mr-3 sm:mr-0 ${
                                      isCompleted
                                        ? 'bg-[var(--color-primary)] text-white ring-4 ring-emerald-100'
                                        : 'bg-white text-gray-400 border-2 border-gray-300'
                                    }`}
                                  >
                                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                                  </div>
                                  <div className="text-left sm:text-center sm:mt-2">
                                    <p
                                      className={`text-xs font-semibold ${
                                        isCompleted ? 'text-gray-900' : 'text-gray-400'
                                      }`}
                                    >
                                      {s.title}
                                    </p>
                                    <p className="text-[10px] text-gray-500 hidden sm:block">{s.desc}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>This order was cancelled. Any pre-authorized charges will be refunded to your source account.</span>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      {/* Left helper actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReceiptOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 text-xs font-semibold text-[var(--color-text-secondary)] transition-all shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-500" />
                          View Receipt
                        </button>

                        <button
                          onClick={() => setTrackingModalOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 text-xs font-semibold text-[var(--color-text-secondary)] transition-all shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5 text-gray-500" />
                          Delivery Info
                        </button>
                      </div>

                      {/* Right contextual actions */}
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        {/* Pending payment: pay now */}
                        {order.status === 'PENDING' &&
                          (!order.payment || order.payment.status !== 'SUCCESS') && (
                            <div className="w-full sm:w-44">
                              <PayButton
                                orderId={order.id}
                                onPaymentSuccess={() => {
                                  refetch();
                                  toast.success('Payment received! Order confirmed.');
                                }}
                              />
                            </div>
                          )}

                        {/* Pending payment: cancel order */}
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => setCancelModalOrder(order)}
                            disabled={cancelling}
                            className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-all disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}

                        {/* Delivered: reorder or review */}
                        {order.status === 'DELIVERED' && (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/product/${order.product?.id}`}
                              className="btn-outline text-xs py-2 px-3.5"
                            >
                              Buy Again
                            </Link>
                            <Link
                              href={`/product/${order.product?.id}#reviews`}
                              className="btn-primary text-xs py-2 px-3.5"
                            >
                              Rate & Review
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ── End Main Orders UI ── */}

      {/* RECEIPT / INVOICE MODAL */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 printable-invoice-modal print:static print:inset-auto print:bg-transparent print:p-0 print:m-0 print:w-full print:block">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto printable-invoice-card print:max-h-none print:overflow-visible print:border print:border-gray-300 print:shadow-none print:rounded-lg print:p-8 print:m-0 print:w-full print:max-w-none">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[var(--color-primary)] flex items-center justify-center print:border print:border-emerald-200">
                  <Sprout className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-gray-900">AgroMart Digital Invoice</h3>
                  <p className="text-xs text-gray-500">Official proof of transaction & dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setReceiptOrder(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Meta */}
            <div className="grid grid-cols-2 gap-4 py-5 border-b border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 uppercase font-bold text-[10px] tracking-wider block">Invoice To</span>
                <p className="font-semibold text-gray-800 mt-1">{user?.name || 'AgroMart Customer'}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-400 uppercase font-bold text-[10px] tracking-wider block">Order Reference</span>
                <p className="font-mono font-semibold text-gray-800 mt-1">#AGRO-{receiptOrder.id.slice(0, 10).toUpperCase()}</p>
                <p className="text-gray-500">{formatDate(receiptOrder.createdAt)}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-5 border-b border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Item Breakdown</h4>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-900 font-semibold">
                  <span>{receiptOrder.product?.name ?? 'Agricultural Supply'}</span>
                  <span>{formatPrice(receiptOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 text-[11px]">
                  <span>
                    Quantity: {receiptOrder.quantity} {receiptOrder.product?.priceUnit}
                  </span>
                  <span>Category: {receiptOrder.product?.category}</span>
                </div>
                {receiptOrder.rentalStartDate && (
                  <div className="text-amber-800 text-[11px] bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                    Rental Duration: {formatDate(receiptOrder.rentalStartDate)} to {formatDate(receiptOrder.rentalEndDate)}
                  </div>
                )}
              </div>

              {/* Price total */}
              <div className="mt-4 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(receiptOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Agricultural GST / Platform Fee</span>
                  <span className="text-emerald-700 font-medium">₹0.00 (Waived)</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200 font-heading">
                  <span>Total Paid / Payable</span>
                  <span className="text-[var(--color-primary)]">{formatPrice(receiptOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment & Security Footer */}
            <div className="py-4 text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-1.5 text-gray-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Status: {receiptOrder.payment?.status === 'SUCCESS' ? 'Fully Paid via Razorpay' : receiptOrder.status}
              </p>
              {receiptOrder.payment?.razorpayOrderId && (
                <p className="font-mono text-[11px] text-gray-400">
                  Razorpay ID: {receiptOrder.payment.razorpayOrderId}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="btn-outline text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Invoice
              </button>
              <button
                onClick={() => setReceiptOrder(null)}
                className="btn-primary text-xs py-2 px-4"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING MODAL */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-heading font-bold text-base text-gray-900">Shipment & Delivery Details</h3>
              </div>
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs">
                <p className="font-semibold text-emerald-900">AgroMart Farm Logistics Network</p>
                <p className="text-emerald-700 mt-1">
                  Orders are dispatched directly from regional agricultural hubs or local verified farmer sellers to ensure freshest crop condition.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Order Reference</span>
                  <span className="font-mono font-medium text-gray-800">
                    #AGRO-{trackingModalOrder.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Current Status</span>
                  <span className="font-semibold text-gray-900">
                    {STATUS_CONFIG[trackingModalOrder.status]?.label || trackingModalOrder.status}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Dispatch Speed</span>
                  <span className="text-gray-800 font-medium">Standard Rural Express (2-4 Days)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Delivery Assistance</span>
                  <span className="text-[var(--color-primary)] font-medium">support@agromart.com</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="btn-primary text-xs py-2 px-5"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-gray-900 text-center">Cancel This Order?</h3>
            <p className="text-xs text-gray-500 text-center mt-1.5">
              Are you sure you want to cancel order for{' '}
              <strong className="text-gray-800">{cancelModalOrder.product?.name}</strong>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setCancelModalOrder(null)}
                disabled={cancelling}
                className="btn-outline text-xs py-2 px-4"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
