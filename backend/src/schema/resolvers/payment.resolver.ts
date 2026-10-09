import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { Context } from '../../context';
import { createPaymentOrder } from '../../payments/createOrder';
import { verifyPayment } from '../../payments/verify';

const VerifyPaymentInputSchema = z.object({
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
  orderId: z.string().uuid('Invalid order ID'),
});

export const paymentResolvers = {
  Mutation: {
    createPaymentOrder: async (
      _: unknown,
      { orderId }: { orderId: string },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        const result = await createPaymentOrder(orderId, ctx.user.userId);
        return result;
      } catch (err: any) {
        throw new GraphQLError(err.message || 'Failed to create payment order', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    verifyPayment: async (
      _: unknown,
      { input }: { input: any },
      ctx: Context
    ) => {
      if (!ctx.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const parsed = VerifyPaymentInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new GraphQLError(parsed.error.errors[0].message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const order = await ctx.prisma.order.findUnique({
        where: { id: parsed.data.orderId },
      });

      if (!order) {
        throw new GraphQLError('Order not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (order.buyerId !== ctx.user.userId) {
        throw new GraphQLError('You are not authorized to pay for this order', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const payment = await verifyPayment(parsed.data);

      return {
        ...payment,
        createdAt: payment.createdAt.toISOString(),
      };
    },
  },
};
