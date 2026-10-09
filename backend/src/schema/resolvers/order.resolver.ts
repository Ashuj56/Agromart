import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { Context } from '../../context';
import { Prisma } from '@prisma/client';

const PlaceOrderSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  rentalStartDate: z.string().nullish(),   // accepts string | null | undefined
  rentalEndDate: z.string().nullish(),     // accepts string | null | undefined
});

function formatOrder(o: any) {
  return {
    ...o,
    totalAmount: Number(o.totalAmount),
    rentalStartDate: o.rentalStartDate ? o.rentalStartDate.toISOString() : null,
    rentalEndDate: o.rentalEndDate ? o.rentalEndDate.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    product: o.product
      ? {
          ...o.product,
          price: Number(o.product.price),
          createdAt: o.product.createdAt.toISOString(),
        }
      : undefined,
    buyer: o.buyer
      ? {
          ...o.buyer,
          createdAt: o.buyer.createdAt.toISOString(),
        }
      : undefined,
    payment: o.payment
      ? {
          ...o.payment,
          createdAt: o.payment.createdAt.toISOString(),
        }
      : null,
  };
}

export const orderResolvers = {
  Query: {
    myOrders: async (_: unknown, __: unknown, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const cacheKey = `orders:user:${ctx.user.userId}`;
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

      const orders = await ctx.prisma.order.findMany({
        where: { buyerId: ctx.user.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: { seller: true },
          },
          buyer: true,
          payment: true,
        },
      });

      const formatted = orders.map(formatOrder);

      try {
        await ctx.redis.setex(cacheKey, 60, JSON.stringify(formatted));
      } catch (err) {
        console.warn('[Redis] Cache write error:', err);
      }

      return formatted;
    },
  },

  Mutation: {
    placeOrder: async (
      _: unknown,
      args: { productId: string; quantity: number; rentalStartDate?: string; rentalEndDate?: string },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (ctx.user.role !== 'BUYER' && ctx.user.role !== 'BOTH') {
        throw new GraphQLError('Only buyers can place orders', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const parsed = PlaceOrderSchema.safeParse(args);
      if (!parsed.success) {
        throw new GraphQLError(parsed.error.errors[0].message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const { productId, quantity, rentalStartDate, rentalEndDate } = parsed.data;

      const product = await ctx.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      let totalAmount: number;
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (product.isRental) {
        if (!rentalStartDate || !rentalEndDate) {
          throw new GraphQLError('Rental start and end dates are required for equipment rentals', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        startDate = new Date(rentalStartDate);
        endDate = new Date(rentalEndDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new GraphQLError('Invalid rental dates provided', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          throw new GraphQLError('Rental end date must be after start date', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        totalAmount = Number(product.price) * diffDays * quantity;
      } else {
        if (product.stock < quantity) {
          throw new GraphQLError(`Insufficient stock. Only ${product.stock} units available`, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        totalAmount = Number(product.price) * quantity;
      }

      // Execute in a transaction to safely decrement stock and create order
      const order = await ctx.prisma.$transaction(async (tx) => {
        if (!product.isRental) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: quantity } },
          });
        }

        return tx.order.create({
          data: {
            buyerId: ctx.user!.userId,
            productId,
            quantity,
            totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
            status: 'PENDING',
            rentalStartDate: startDate,
            rentalEndDate: endDate,
          },
          include: {
            product: true,
            buyer: true,
            payment: true,
          },
        });
      });

      // Invalidate single product cache
      try {
        await ctx.redis.del(`product:${productId}`);
      } catch (err) {
        console.warn('[Redis] Cache delete error:', err);
      }

      return formatOrder(order);
    },

    cancelOrder: async (_: unknown, { orderId }: { orderId: string }, ctx: Context) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const order = await ctx.prisma.order.findUnique({
        where: { id: orderId },
        include: { product: true },
      });

      if (!order) {
        throw new GraphQLError('Order not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (order.buyerId !== ctx.user.userId) {
        throw new GraphQLError('You are not authorized to cancel this order', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      if (order.status !== 'PENDING') {
        throw new GraphQLError(`Cannot cancel order in ${order.status} status`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const updated = await ctx.prisma.$transaction(async (tx) => {
        if (!order.product.isRental) {
          await tx.product.update({
            where: { id: order.productId },
            data: { stock: { increment: order.quantity } },
          });
        }

        return tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
          include: {
            product: true,
            buyer: true,
            payment: true,
          },
        });
      });

      return formatOrder(updated);
    },

    updateOrderStatus: async (
      _: unknown,
      { orderId, status }: { orderId: string; status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (ctx.user.role !== 'SELLER' && ctx.user.role !== 'BOTH') {
        throw new GraphQLError('Only sellers can update order status', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const order = await ctx.prisma.order.findUnique({
        where: { id: orderId },
        include: { product: true },
      });

      if (!order) {
        throw new GraphQLError('Order not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (order.product.sellerId !== ctx.user.userId) {
        throw new GraphQLError('You are not authorized to manage orders for this product', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const updated = await ctx.prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          product: true,
          buyer: true,
          payment: true,
        },
      });

      return formatOrder(updated);
    },
  },
};
