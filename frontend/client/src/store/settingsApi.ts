import { api } from "./api";

export interface SettingsData {
  _id?: string;
  businessName: string;
  gstin: string;
  address: string;

  integrations: {
    razorpay: {
      enabled: boolean;
      keyId: string;
      keySecret: string;
    };
    whatsapp: {
      enabled: boolean;
      apiKey: string;
      phoneNumberId?: string;
      businessAccountId?: string;
    };
    flaxxaWapi?: {
      enabled: boolean;
      token: string;
      connectedNumber: string;
      templateStatus: string;
    };
  };

  notifications: {
    orderConfirmation: boolean;
    kitchenReminder: boolean;
    paymentAlerts: boolean;
  };

  lastUpdated?: string;
}

export const settingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<{ success: boolean; data: SettingsData }, void>({
      query: () => "/settings",
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation<{ success: boolean; data: SettingsData }, Partial<SettingsData>>({
      query: (body) => ({
        url: "/settings",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
