import { razorpay } from '../lib/razorpay';
import { prisma } from '../lib/prisma';

export async function createPaymentOrder(orderId: string, userId: string) {
  // 1. Fetch order; verify it belongs to this user and is PENDING
  const order = await prisma.order.findFirstOrThrow({
    where: { id: orderId, buyerId: userId, status: 'PENDING' },
  });

  // 2. Guard: if a payment already exists (e.g. user clicked Pay twice), reuse it
  const existing = await prisma.payment.findFirst({
    where: { orderId, status: { in: ['CREATED', 'SUCCESS'] } },
  });
  if (existing?.status === 'SUCCESS') {
    throw new Error('This order has already been paid successfully.');
  }
  if (existing?.status === 'CREATED') {
    // Return the existing pending payment so the modal can reopen
    return {
      razorpayOrderId: existing.razorpayOrderId,
      amount:          existing.amount,
      currency:        existing.currency,
      keyId:           process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    };
  }

  // 3. Razorpay amount is always in paise (₹1 = 100 paise)
  const amountInPaise = Math.round(Number(order.totalAmount) * 100);

  // 4. Call Razorpay API to create an order
  const rzOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `agromart_${orderId.slice(0, 8)}`,
  });

  // 5. Save payment row with status CREATED
  await prisma.payment.create({
    data: {
      orderId,
      razorpayOrderId: rzOrder.id,
      amount:          amountInPaise,
      currency:        'INR',
      status:          'CREATED',
    },
  });

  // 6. Return to frontend — KEY_SECRET never sent
  return {
    razorpayOrderId: rzOrder.id,
    amount:          amountInPaise,
    currency:        'INR',
    keyId:           process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  };
}
