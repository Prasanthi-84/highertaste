import { api } from './api';

// ─── WhatsApp API (Flaxxa WAPI) ───────────────────────────────────────────────

export interface WapiResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const whatsappApi = api.injectEndpoints({
  endpoints: (builder) => ({
    sendOrderConfirmation: builder.mutation<WapiResponse, {
      phone: string;
      customerName: string;
      orderId: string;
      eventDate: string;
      venue: string;
      guests: string | number;
      totalAmount: string | number;
    }>({
      query: (body) => ({
        url: '/whatsapp/order-confirmation',
        method: 'POST',
        body,
      }),
    }),

    sendPaymentLink: builder.mutation<WapiResponse, {
      phone: string;
      customerName: string;
      orderId: string;
      amount: string | number;
      paymentURL: string;
    }>({
      query: (body) => ({
        url: '/whatsapp/payment-link',
        method: 'POST',
        body,
      }),
    }),

    sendPaymentSuccess: builder.mutation<WapiResponse, {
      phone: string;
      customerName: string;
      orderId: string;
      amount: string | number;
      paymentDate: string;
    }>({
      query: (body) => ({
        url: '/whatsapp/payment-success',
        method: 'POST',
        body,
      }),
    }),

    sendOrderDispatched: builder.mutation<WapiResponse, {
      phone: string;
      customerName: string;
      orderId: string;
      items: string;
      deliveryTime: string;
      address: string;
    }>({
      query: (body) => ({
        url: '/whatsapp/order-dispatched',
        method: 'POST',
        body,
      }),
    }),

    sendOrderDelivered: builder.mutation<WapiResponse, {
      phone: string;
      customerName: string;
      orderId: string;
    }>({
      query: (body) => ({
        url: '/whatsapp/order-delivered',
        method: 'POST',
        body,
      }),
    }),

    sendQuotation: builder.mutation<WapiResponse, {
      phone: string;
      customerName: string;
      serviceType: string;
      quoteNo: string;
      amount: string | number;
    }>({
      query: (body) => ({
        url: '/whatsapp/quotation',
        method: 'POST',
        body,
      }),
    }),

    sendMarriageQuotation: builder.mutation<WapiResponse, {
      phone: string;
      customerName: string;
      quoteNo: string;
      amount: string | number;
    }>({
      query: (body) => ({
        url: '/whatsapp/marriage-quotation',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendOrderConfirmationMutation,
  useSendPaymentLinkMutation,
  useSendPaymentSuccessMutation,
  useSendOrderDispatchedMutation,
  useSendOrderDeliveredMutation,
  useSendQuotationMutation,
  useSendMarriageQuotationMutation,
} = whatsappApi;
