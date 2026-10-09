import crypto from 'crypto';
import express from 'express';
import { prisma } from '../lib/prisma';

export const razorpayWebhookRouter = express.Router();

razorpayWebhookRouter.post(
  '/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const receivedSig = req.headers['x-razorpay-signature'] as string;
      const body = req.body ? req.body.toString() : '';
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

      if (!receivedSig || !secret) {
        return res.status(400).json({ error: 'Missing signature or webhook secret' });
      }

      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      if (receivedSig !== expectedSig) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const event = JSON.parse(body);

      if (event.event === 'payment.captured') {
        const rzPaymentId = event.payload.payment.entity.id;
        const rzOrderId   = event.payload.payment.entity.order_id;

        await prisma.payment.updateMany({
          where: { razorpayOrderId: rzOrderId, status: 'CREATED' },
          data:  { razorpayPaymentId: rzPaymentId, status: 'SUCCESS' },
        });

        // Also update linked order to CONFIRMED if present
        const payment = await prisma.payment.findUnique({
          where: { razorpayOrderId: rzOrderId },
        });
        if (payment) {
          await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: 'CONFIRMED' },
          });
        }
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error('[Webhook error]:', err.message);
      return res.status(500).json({ error: 'Internal webhook error' });
    }
  }
);
