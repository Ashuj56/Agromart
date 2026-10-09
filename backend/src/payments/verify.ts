import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { GraphQLError } from 'graphql';

export async function verifyPayment(input: {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  orderId:           string;
}) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = input;

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new GraphQLError('Server misconfiguration: RAZORPAY_KEY_SECRET not set', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  // 1. Reconstruct expected signature
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // 2. Reject if signature does not match
  if (expected !== razorpaySignature) {
    throw new GraphQLError('Payment verification failed: invalid signature', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  // 3. Update payment record to SUCCESS
  const payment = await prisma.payment.update({
    where: { razorpayOrderId },
    data: {
      razorpayPaymentId,
      razorpaySignature,
      status: 'SUCCESS',
    },
  });

  // 4. Update linked order to CONFIRMED
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CONFIRMED' },
  });

  return payment;
}
