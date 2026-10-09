'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useReactiveVar } from '@apollo/client';
import { CREATE_PRODUCT } from '@/lib/graphql/mutations';
import { currentUserVar } from '@/lib/apollo-client';
import { Category } from '@/types';
import { PackagePlus, Sprout, Tractor, Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SellPage() {
  const router = useRouter();
  const user = useReactiveVar(currentUserVar);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('CROP');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('quintal');
  const [isRental, setIsRental] = useState(false);
  const [stock, setStock] = useState('10');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const [createProduct] = useMutation(CREATE_PRODUCT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to list items');
      router.push('/login');
      return;
    }

    if (user.role !== 'SELLER' && user.role !== 'BOTH') {
      toast.error('Only sellers can create listings');
      return;
    }

    setLoading(true);
    try {
      const trimmedDesc = description.trim();
      const { data } = await createProduct({
        variables: {
          input: {
            name: name.trim(),
            category,
            price: parseFloat(price),
            priceUnit: priceUnit.trim(),
            isRental,
            stock: parseInt(stock, 10),
            description: trimmedDesc.length > 0 ? trimmedDesc : null,
            images: imageUrl.trim() ? [imageUrl.trim()] : [],
          },
        },
      });

      if (data?.createProduct?.id) {
        toast.success('Product listing published successfully!');
        router.push(`/product/${data.createProduct.id}`);
      } else {
        toast.success('Product listing created successfully!');
        router.push('/marketplace');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'SELLER' && user.role !== 'BOTH')) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <PackagePlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800">Seller Account Required</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          You must be logged in as a registered Seller or Both role to publish listings.
        </p>
        <Link href="/login" className="btn-primary text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      <div className="card border border-[var(--color-border)] shadow-xs">
        <div className="pb-4 border-b border-[var(--color-border)] mb-6">
          <h1 className="text-2xl font-bold font-heading text-[var(--color-text-primary)]">
            Create New Listing
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Publish your agricultural harvest, fertilizer batch, or equipment rental
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Product Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharbati Wheat Grade A or 50HP Mahindra Tractor"
              className="w-full text-sm p-2.5 rounded-md border border-[var(--color-border)] bg-white focus:outline-hidden focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setCategory('CROP');
                setPriceUnit('quintal');
                setIsRental(false);
              }}
              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                category === 'CROP'
                  ? 'bg-emerald-50 border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs'
                  : 'bg-white border-[var(--color-border)] text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Sprout className="w-5 h-5" />
              Crop / Harvest
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory('FERTILIZER');
                setPriceUnit('bag');
                setIsRental(false);
              }}
              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                category === 'FERTILIZER'
                  ? 'bg-amber-50 border-[var(--color-accent)] text-[var(--color-accent)] shadow-xs'
                  : 'bg-white border-[var(--color-border)] text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-5 h-5" />
              Fertilizer
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory('EQUIPMENT');
                setPriceUnit('day');
                setIsRental(true);
              }}
              className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                category === 'EQUIPMENT'
                  ? 'bg-purple-50 border-purple-600 text-purple-700 shadow-xs'
                  : 'bg-white border-[var(--color-border)] text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Tractor className="w-5 h-5" />
              Machinery
            </button>
          </div>

          {/* Price and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="2500"
                className="w-full text-sm p-2.5 rounded-md border border-[var(--color-border)] bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unit (e.g. quintal, bag, kg, day)
              </label>
              <input
                type="text"
                required
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                placeholder="quintal"
                className="w-full text-sm p-2.5 rounded-md border border-[var(--color-border)] bg-white"
              />
            </div>
          </div>

          {/* Rental Checkbox and Stock */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full text-sm p-2.5 rounded-md border border-[var(--color-border)] bg-white"
              />
            </div>

            <div className="pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRental}
                  onChange={(e) => {
                    setIsRental(e.target.checked);
                    if (e.target.checked && priceUnit === 'quintal') setPriceUnit('day');
                  }}
                  className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300"
                />
                <span className="text-xs font-medium text-gray-700">
                  This is a rental listing (charged per day)
                </span>
              </label>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Image URL (Unsplash or direct image link)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full text-sm p-2.5 rounded-md border border-[var(--color-border)] bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description & Quality Notes
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about grain moisture, variety, harvest date, tractor horsepower..."
              className="w-full text-sm p-2.5 rounded-md border border-[var(--color-border)] bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-sm font-semibold !py-3 disabled:opacity-50"
          >
            {loading ? 'Submitting Listing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
