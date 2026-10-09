import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { Context } from '../../context';

const AddReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().nullish().transform((v) => (v ? v.trim() : null)),
});

export const reviewResolvers = {
  Mutation: {
    addReview: async (
      _: unknown,
      args: { productId: string; rating: number; comment?: string },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      if (ctx.user.role !== 'BUYER' && ctx.user.role !== 'BOTH') {
        throw new GraphQLError('Only buyers can leave reviews', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const parsed = AddReviewSchema.safeParse(args);
      if (!parsed.success) {
        throw new GraphQLError(parsed.error.errors[0].message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const { productId, rating, comment } = parsed.data;

      // Verify user has a DELIVERED order for this product
      const deliveredOrder = await ctx.prisma.order.findFirst({
        where: {
          productId,
          buyerId: ctx.user.userId,
          status: 'DELIVERED',
        },
      });

      if (!deliveredOrder) {
        throw new GraphQLError(
          'You can only review products that have been delivered to you',
          {
            extensions: { code: 'FORBIDDEN' },
          }
        );
      }

      // Check for existing review
      const existing = await ctx.prisma.review.findUnique({
        where: {
          productId_reviewerId: {
            productId,
            reviewerId: ctx.user.userId,
          },
        },
      });

      if (existing) {
        throw new GraphQLError('You have already reviewed this product', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const review = await ctx.prisma.review.create({
        data: {
          productId,
          reviewerId: ctx.user.userId,
          rating,
          comment,
        },
        include: {
          product: true,
          reviewer: true,
        },
      });

      // Invalidate product cache
      try {
        await ctx.redis.del(`product:${productId}`);
      } catch (err) {
        console.warn('[Redis] Cache delete error:', err);
      }

      return {
        ...review,
        createdAt: review.createdAt.toISOString(),
        product: {
          ...review.product,
          price: Number(review.product.price),
          createdAt: review.product.createdAt.toISOString(),
        },
        reviewer: {
          ...review.reviewer,
          createdAt: review.reviewer.createdAt.toISOString(),
        },
      };
    },
  },
};
