import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { Context } from '../../context';
import Redis from 'ioredis';

const ProductInputSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  category: z.enum(['CROP', 'FERTILIZER', 'EQUIPMENT']),
  price: z.number().positive('Price must be greater than 0'),
  priceUnit: z.string().min(1, 'Price unit is required (e.g. kg, quintal, day)'),
  isRental: z.boolean().default(false),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
  description: z.string().nullish().transform((v) => (v ? v.trim() : null)),
  images: z.array(z.string()).nullish().transform((v) => (v ? v.filter(Boolean) : [])),
});

async function invalidateProductCaches(redis: Redis, productId?: string, category?: string, sellerId?: string) {
  try {
    const keysToDelete: string[] = ['products:featured'];
    if (productId) {
      keysToDelete.push(`product:${productId}`);
    }
    if (sellerId) {
      keysToDelete.push(`user:${sellerId}:listings`);
    }
    const catKeys = category ? await redis.keys(`products:${category}:*`) : [];
    const allKeys = await redis.keys('products:all:*');
    const combined = [...new Set([...keysToDelete, ...catKeys, ...allKeys])];
    if (combined.length > 0) {
      await redis.del(...combined);
      console.log(`🧹 [Redis Invalidation] Purged cache keys:`, combined);
    }
  } catch (err) {
    console.warn('[Redis] Cache invalidation error:', err);
  }
}

function formatProduct(p: any) {
  const reviews = p.reviews || [];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
      : null;

  return {
    ...p,
    images: Array.isArray(p.images) ? p.images : [],
    price: Number(p.price),
    avgRating: avgRating ? Number(avgRating.toFixed(1)) : null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    seller: p.seller
      ? {
          ...p.seller,
          createdAt:
            p.seller.createdAt instanceof Date
              ? p.seller.createdAt.toISOString()
              : p.seller.createdAt,
        }
      : undefined,
    reviews: reviews.map((r: any) => ({
      ...r,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      reviewer: r.reviewer
        ? {
            ...r.reviewer,
            createdAt:
              r.reviewer.createdAt instanceof Date
                ? r.reviewer.createdAt.toISOString()
                : r.reviewer.createdAt,
          }
        : undefined,
    })),
  };
}

export const productResolvers = {
  Query: {
    products: async (
      _: unknown,
      args: { category?: 'CROP' | 'FERTILIZER' | 'EQUIPMENT'; search?: string; page?: number; limit?: number },
      ctx: Context
    ) => {
      const page = Math.max(1, args.page || 1);
      const limit = Math.min(50, Math.max(1, args.limit || 12));
      const categoryKey = args.category || 'all';
      const cacheKey = `products:${categoryKey}:${page}`;

      // Check cache only if there is no free-text search query
      if (!args.search) {
        try {
          const cached = await ctx.redis.get(cacheKey);
          if (cached) {
            console.log(`⚡ [Redis Cache HIT] -> ${cacheKey} (Served from Redis)`);
            return JSON.parse(cached);
          }
          console.log(`🐢 [Redis Cache MISS] -> ${cacheKey} (Querying PostgreSQL database)`);
        } catch (err) {
          console.warn('[Redis] Cache read error:', err);
        }
      }

      const where: any = {};
      if (args.category) {
        where.category = args.category;
      }
      if (args.search) {
        where.name = {
          contains: args.search,
          mode: 'insensitive',
        };
      }

      const [items, totalCount] = await Promise.all([
        ctx.prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            seller: true,
            reviews: {
              include: { reviewer: true },
            },
          },
        }),
        ctx.prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const formattedItems = items.map(formatProduct);
      const result = {
        items: formattedItems,
        totalCount,
        totalPages,
        page,
      };

      if (!args.search) {
        try {
          await ctx.redis.setex(cacheKey, 120, JSON.stringify(result));
        } catch (err) {
          console.warn('[Redis] Cache write error:', err);
        }
      }

      return result;
    },

    product: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      const cacheKey = `product:${id}`;
      try {
        const cached = await ctx.redis.get(cacheKey);
        if (cached) {
          console.log(`⚡ [Redis Cache HIT] -> ${cacheKey} (Served from Redis)`);
          return JSON.parse(cached);
        }
        console.log(`🐢 [Redis Cache MISS] -> ${cacheKey} (Querying PostgreSQL database)`);
      } catch (err) {
        console.warn('[Redis] Cache read error:', err);
      }

      const product = await ctx.prisma.product.findUnique({
        where: { id },
        include: {
          seller: true,
          reviews: {
            include: { reviewer: true },
          },
        },
      });

      if (!product) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const formatted = formatProduct(product);

      try {
        await ctx.redis.setex(cacheKey, 300, JSON.stringify(formatted));
      } catch (err) {
        console.warn('[Redis] Cache write error:', err);
      }

      return formatted;
    },

    featuredProducts: async (_: unknown, __: unknown, ctx: Context) => {
      const cacheKey = 'products:featured';
      try {
        const cached = await ctx.redis.get(cacheKey);
        if (cached) {
          console.log(`⚡ [Redis Cache HIT] -> ${cacheKey} (Served from Redis)`);
          return JSON.parse(cached);
        }
        console.log(`🐢 [Redis Cache MISS] -> ${cacheKey} (Querying PostgreSQL database)`);
      } catch (err) {
        console.warn('[Redis] Cache read error:', err);
      }

      const products = await ctx.prisma.product.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: true,
          reviews: {
            include: { reviewer: true },
          },
        },
      });

      const formatted = products.map(formatProduct);

      try {
        await ctx.redis.setex(cacheKey, 600, JSON.stringify(formatted));
      } catch (err) {
        console.warn('[Redis] Cache write error:', err);
      }

      return formatted;
    },

    myListings: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (ctx.user.role !== 'SELLER' && ctx.user.role !== 'BOTH') {
        throw new GraphQLError('Only sellers can view listings', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const cacheKey = `user:${ctx.user.userId}:listings`;
      try {
        const cached = await ctx.redis.get(cacheKey);
        if (cached) {
          console.log(`⚡ [Redis Cache HIT] -> ${cacheKey} (Served from Redis)`);
          return JSON.parse(cached);
        }
        console.log(`🐢 [Redis Cache MISS] -> ${cacheKey} (Querying PostgreSQL database)`);
      } catch (err) {
        console.warn('[Redis] Cache read error:', err);
      }

      const items = await ctx.prisma.product.findMany({
        where: { sellerId: ctx.user.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          seller: true,
          reviews: {
            include: { reviewer: true },
          },
        },
      });

      const formatted = items.map(formatProduct);

      try {
        await ctx.redis.setex(cacheKey, 120, JSON.stringify(formatted));
      } catch (err) {
        console.warn('[Redis] Cache write error:', err);
      }

      return formatted;
    },
  },

  Mutation: {
    createProduct: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (ctx.user.role !== 'SELLER' && ctx.user.role !== 'BOTH') {
        throw new GraphQLError('Only sellers can create listings', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const parsed = ProductInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new GraphQLError(parsed.error.errors[0].message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const created = await ctx.prisma.product.create({
        data: {
          ...parsed.data,
          sellerId: ctx.user.userId,
        },
        include: {
          seller: true,
          reviews: {
            include: { reviewer: true },
          },
        },
      });

      await invalidateProductCaches(ctx.redis, undefined, created.category, ctx.user.userId);

      return formatProduct(created);
    },

    updateProduct: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (ctx.user.role !== 'SELLER' && ctx.user.role !== 'BOTH') {
        throw new GraphQLError('Only sellers can update listings', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const existing = await ctx.prisma.product.findUnique({ where: { id } });
      if (!existing) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (existing.sellerId !== ctx.user.userId) {
        throw new GraphQLError('You are not authorized to update this product', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const parsed = ProductInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new GraphQLError(parsed.error.errors[0].message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const updated = await ctx.prisma.product.update({
        where: { id },
        data: parsed.data,
        include: {
          seller: true,
          reviews: {
            include: { reviewer: true },
          },
        },
      });

      await invalidateProductCaches(ctx.redis, id, updated.category, existing.sellerId);

      return formatProduct(updated);
    },

    deleteProduct: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (ctx.user.role !== 'SELLER' && ctx.user.role !== 'BOTH') {
        throw new GraphQLError('Only sellers can delete listings', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const existing = await ctx.prisma.product.findUnique({ where: { id } });
      if (!existing) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (existing.sellerId !== ctx.user.userId) {
        throw new GraphQLError('You are not authorized to delete this product', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      await ctx.prisma.product.delete({ where: { id } });
      await invalidateProductCaches(ctx.redis, id, existing.category, existing.sellerId);

      return true;
    },
  },
};
