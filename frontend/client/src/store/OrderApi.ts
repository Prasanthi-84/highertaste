import { api } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LineItem {
  _id?: string;
  menuItemId: string | { _id: string; name: string; price?: number };
  name?: string;
  qty: number;
  unitPrice: number;
  total?: number;
  notes?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  quoteId?: string;
  customerId: {
    _id: string;
    name: string;
    email?: string;
    company?: string;
    phone?: string;
    gstin?: string;
  } | string;
  eventName?: string;
  eventDate: string;
  deliveryDate?: string;
  venue: string;
  pax: number;
  status: 'Draft' | 'Confirmed' | 'In-Preparation' | 'Ready' | 'Dispatched' | 'Delivered' | 'Completed' | 'Cancelled';
  paymentStatus?: 'Pending' | 'Partial' | 'Paid';
  lineItems?: LineItem[];
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  isArchived: boolean;
  notes?: string;
  paymentLinkUrl?: string;
  paymentLinkExpiresAt?: string | Date;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  total: number;
  page: number;
  pages: number;
}

export interface SingleOrderResponse {
  success: boolean;
  data: Order;
}

export interface GetOrdersParams {
  search?: string;
  status?: string;
  paymentStatus?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CreateOrderPayload {
  customerId: string;
  quoteId?: string;
  eventName?: string;
  eventDate: Date | string;
  deliveryDate?: Date | string;
  venue: string;
  pax: number;
  lineItems: Array<{
    menuItemId: string;
    name?: string;
    qty: number;
    unitPrice: number;
    total?: number;
    notes?: string;
  }>;
  subTotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  amountDue?: number;
  notes?: string;
  status?: Order['status'];
}

export interface UpdateOrderPayload extends Partial<CreateOrderPayload> {
  id: string;
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  amountPaid?: number;
  amountDue?: number;
}

// ─── API Slice ────────────────────────────────────────────────────────────────

export const orderApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // GET all orders (paginated + filtered)
    getOrders: builder.query<OrdersResponse, GetOrdersParams | void>({
      query: (params = {}) => ({
        url: '/orders',
        params: {
          search: params?.search || undefined,
          status: params?.status || undefined,
          paymentStatus: params?.paymentStatus || undefined,
          isArchived: params?.isArchived ?? false,
          page: params?.page || 1,
          limit: params?.limit || 20,
          fromDate: params?.fromDate || undefined,
          toDate: params?.toDate || undefined,
        },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Orders' as const, id: _id })),
              { type: 'Orders' as const, id: 'LIST' },
            ]
          : [{ type: 'Orders' as const, id: 'LIST' }],
    }),

    // GET single order by ID
    getOrderById: builder.query<SingleOrderResponse, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Orders', id }],
    }),

    // CREATE new order
    createOrder: builder.mutation<SingleOrderResponse, CreateOrderPayload>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Orders', id: 'LIST' }],
    }),

    // UPDATE full order
    updateOrder: builder.mutation<SingleOrderResponse, UpdateOrderPayload>({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Orders', id },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // PATCH status only
    updateOrderStatus: builder.mutation<
      SingleOrderResponse,
      { id: string; status: Order['status'] }
    >({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Orders', id },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // PATCH payment update
    updateOrderPayment: builder.mutation<
      SingleOrderResponse,
      { id: string; amountPaid: number; paymentStatus?: Order['paymentStatus'] }
    >({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Orders', id },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // PATCH archive / unarchive toggle
    archiveOrder: builder.mutation<SingleOrderResponse, string>({
      query: (id) => ({
        url: `/orders/${id}/archive`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Orders', id },
        { type: 'Orders', id: 'LIST' },
      ],
    }),

    // DELETE order
    deleteOrder: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Orders', id: 'LIST' }],
    }),

    // SEND WhatsApp Notification
    sendOrderWhatsApp: builder.mutation<{ success: boolean; message: string }, { id: string; template: string }>({
      query: ({ id, template }) => ({
        url: `/orders/${id}/send-whatsapp`,
        method: 'POST',
        body: { template },
      }),
    }),

    // CREATE Razorpay Order
    createRazorpayOrder: builder.mutation<{ success: boolean; key?: string; data: any; message?: string }, { amount: number; orderId: string }>({
      query: (body) => ({
        url: '/payments/razorpay/create-order',
        method: 'POST',
        body,
      }),
    }),

    // RECORD Razorpay Payment
    recordRazorpayPayment: builder.mutation<{ success: boolean; message: string }, {
      orderId: string;
      amount: number;
      razorpayPaymentId: string;
      razorpayOrderId?: string;
      paymentMethod: string;
    }>({
      query: ({ paymentMethod, ...rest }) => ({
        url: `/payments`,
        method: 'POST',
        body: { ...rest, method: paymentMethod },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Orders', id: orderId },
        { type: 'Orders', id: 'LIST' },
        { type: 'Invoices' as any, id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// ─── Exported Hooks ───────────────────────────────────────────────────────────

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
  useUpdateOrderPaymentMutation,
  useArchiveOrderMutation,
  useDeleteOrderMutation,
  useSendOrderWhatsAppMutation,
  useRecordRazorpayPaymentMutation,
  useCreateRazorpayOrderMutation,
} = orderApi;