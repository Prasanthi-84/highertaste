import { api } from './api';

export interface Payment {
  _id: string;
  transactionId: string;
  orderId?: { _id: string; orderNumber: string; eventName?: string };
  invoiceId?: { _id: string; invoiceNumber: string };
  customerId?: { _id: string; name: string; company?: string; phone?: string };
  amount: number;
  method: 'UPI' | 'GPay' | 'PhonePe' | 'Cash' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Razorpay';
  reference: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded' | 'Reconciled' | 'Succeeded';
  createdAt: string;
}

export interface PaymentsResponse {
  success: boolean;
  data: Payment[];
}

export interface CreatePaymentPayload {
  orderId: string;
  invoiceId?: string;
  amount: number;
  method: 'UPI' | 'GPay' | 'PhonePe' | 'Cash' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Razorpay';
  reference: string;
  notes?: string;
}

export const paymentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query<PaymentsResponse, void>({
      query: () => '/payments',
      providesTags: ['Payments'],
    }),
    getSummary: builder.query<{ 
      success: boolean; 
      data: { 
        totalCollected: number; 
        upiTotal: number; 
        pendingReconciliation: number; 
        pendingCount: number;
        methodBreakdown: any;
      } 
    }, void>({
      query: () => '/payments/summary',
      providesTags: ['Payments'],
    }),
    createPayment: builder.mutation<{ success: boolean; data: Payment }, CreatePaymentPayload>({
      query: (body) => ({
        url: '/payments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments', 'Invoices', 'Orders'],
    }),

    // ── RAZORPAY INTEGRATION ──────────────────────────────────────────────────
    createPaymentOrder: builder.mutation<{ success: boolean; key?: string; data: any }, { orderId: string; amount: number }>({
      query: (body) => ({
        url: '/payments/create-order',
        method: 'POST',
        body,
      }),
    }),

    verifyPayment: builder.mutation<{ success: boolean; message: string; data: any }, {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      orderId: string;
      amount: number;
      invoiceId?: string;
    }>({
      query: (body) => ({
        url: '/payments/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments', 'Invoices', 'Orders'],
    }),
    createPaymentLink: builder.mutation<{ 
      success: boolean; 
      whatsappSent?: boolean;
      whatsappError?: string;
      message?: string;
      data: any 
    }, { orderId: string }>({
      query: (body) => ({
        url: '/payments/create-link',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Orders'],
    }),
    sharePaymentLinkWhatsapp: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/payments/${id}/share-whatsapp`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetSummaryQuery,
  useCreatePaymentMutation,
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
  useCreatePaymentLinkMutation,
  useSharePaymentLinkWhatsappMutation,
} = paymentApi;

