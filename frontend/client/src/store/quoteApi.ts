import { api } from "./api";
import { Quote } from "./quoteSlice";

export interface QuotesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Quote[];
}

export interface SingleQuoteResponse {
  success: boolean;
  data: Quote;
}

export const quoteApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuotes: builder.query<QuotesResponse, { status?: string; customerId?: string; search?: string } | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.customerId) params.append('customerId', filters.customerId);
        if (filters?.search) params.append('search', filters.search);
        
        const queryString = params.toString();
        return `/quotes${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ["Quotes"],
    }),

    getQuoteById: builder.query<SingleQuoteResponse, string>({
      query: (id) => `/quotes/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Quotes', id }],
    }),

    createQuote: builder.mutation<SingleQuoteResponse, Partial<Quote>>({
      query: (newQuote) => ({
        url: "/quotes",
        method: "POST",
        body: newQuote,
      }),
      invalidatesTags: ["Quotes"],
    }),

    updateQuote: builder.mutation<SingleQuoteResponse, { id: string; data: Partial<Quote> }>({
      query: ({ id, data }) => ({
        url: `/quotes/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => ["Quotes", { type: 'Quotes', id }],
    }),

    deleteQuote: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/quotes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Quotes"],
    }),

    convertQuoteToOrder: builder.mutation<{ success: boolean; message: string; data: any }, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/quotes/${id}/convert`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ["Quotes", "Orders", { type: 'Quotes', id }],
    }),

    sendQuoteWhatsapp: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/quotes/${id}/send-whatsapp`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetQuotesQuery,
  useGetQuoteByIdQuery,
  useCreateQuoteMutation,
  useUpdateQuoteMutation,
  useDeleteQuoteMutation,
  useConvertQuoteToOrderMutation,
  useSendQuoteWhatsappMutation,
} = quoteApi;
