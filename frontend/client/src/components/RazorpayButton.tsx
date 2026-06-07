import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateRazorpayOrderMutation } from '@/store/OrderApi';

interface RazorpayButtonProps {
  amount: number;
  orderId: string;
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  onSuccess: (response: any) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_KEY_ID = "rzp_test_SJyzHDxZMnWvxF";

export const RazorpayButton: React.FC<RazorpayButtonProps> = ({
  amount,
  orderId,
  orderNumber,
  customer,
  onSuccess,
  disabled
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [createRazorpayOrder] = useCreateRazorpayOrderMutation();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    // Validate amount
    const cleanAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Invalid payment amount. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create Razorpay Order on Backend
      const orderResponse = await createRazorpayOrder({ 
        amount: cleanAmount, 
        orderId 
      }).unwrap();

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || "Failed to create payment order");
      }

      const rzpOrder = orderResponse.data;

      // 2. Load Razorpay Script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast({
          title: "Setup Error",
          description: "Failed to load Razorpay SDK. Please check your internet connection.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // 3. Initiate Checkout
      const options = {
        key: orderResponse.key || RAZORPAY_KEY_ID, // Use backend key if available, fallback only if necessary
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        order_id: rzpOrder.id,
        name: "The Satvata Foods",
        description: `Order #${orderNumber}`,
        image: "/logo.png",
        handler: function (response: any) {
          setIsProcessing(false);
          onSuccess(response);
        },
        prefill: {
          name: customer.name,
          email: customer.email || "",
          contact: customer.phone || ""
        },
        theme: {
          color: "#5A141E"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast({
          title: "Payment Error",
          description: response.error.description || "The payment could not be processed.",
          variant: "destructive"
        });
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay process failed:', err);
      toast({
        title: "Payment Initiation Failed",
        description: err?.data?.message || err.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      type="button" 
      onClick={handlePayment} 
      disabled={disabled || isProcessing || amount <= 0}
      className="w-full bg-[#5A141E] hover:bg-[#4A1018] text-white h-11 text-base font-bold shadow-md rounded-xl transition-all"
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-white/70" />
          Preparing Checkout...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4 text-white/70" />
          Pay ₹{amount.toLocaleString()} via Razorpay
        </>
      )}
    </Button>
  );
};
