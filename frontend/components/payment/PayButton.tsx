'use client';

import Script from 'next/script';
import { useMutation } from '@apollo/client';
import { CREATE_PAYMENT_ORDER, VERIFY_PAYMENT } from '@/lib/graphql/mutations';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function PayButton({
  orderId,
  onPaymentSuccess,
}: {
  orderId: string;
  onPaymentSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [createPaymentOrder] = useMutation(CREATE_PAYMENT_ORDER);
  const [verifyPayment] = useMutation(VERIFY_PAYMENT);

  async function handlePay() {
    setLoading(true);
    try {
      const { data } = await createPaymentOrder({ variables: { orderId } });
      if (!data?.createPaymentOrder) {
        throw new Error('Failed to initialize payment');
      }

      const { razorpayOrderId, amount, currency, keyId } = data.createPaymentOrder;

      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: 'AgroMart',
        description: 'Farmer Marketplace Order Payment',
        theme: { color: 'hsl(142, 71%, 30%)' },
        handler: async (response: any) => {
          try {
            await verifyPayment({
              variables: {
                input: {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  orderId,
                },
              },
            });
            toast.success('Payment confirmed! Your order is now confirmed.');
            if (onPaymentSuccess) onPaymentSuccess();
          } catch (err: any) {
            toast.error(err.message || 'Payment signature verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Could not initiate payment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-accent w-full text-sm font-semibold disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay with Razorpay'}
      </button>
    </>
  );
}
