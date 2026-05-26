// RTK Query base API
// Uses relative /api path so Vite dev proxy forwards to Express (avoids CORS)
// In production, set VITE_API_URL env var if backend is on a different domain

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { RootState } from "./index";
import { logOut } from "./authSlice";

// Use relative URL so Vite proxy handles it in dev (prevents CORS errors).
// The Vite proxy in vite.config.ts forwards /api → http://localhost:5000
// Trim trailing slashes from VITE_API_URL to prevent double slashes like //api
const rawViteApiUrl = import.meta.env.VITE_API_URL;
const viteApiUrl = rawViteApiUrl ? rawViteApiUrl.replace(/\/+$/, '') : null;

const baseUrl = viteApiUrl
  ? `${viteApiUrl}/api`
  : "/api";

console.log("API Base URL initialized as:", baseUrl);

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
  credentials: "include",
});

const baseQueryWithAuthHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    api.dispatch(logOut());
    if (typeof window !== "undefined" && window.location.pathname !== "/auth") {
      window.location.assign("/auth");
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuthHandling,
  tagTypes: ["Auth", "Customers", "Menu", "Orders", "Quotes", "Invoices", "Payments", "Expenses", "Reports", "Kitchen", "Settings", "Feedback", "Users", "Notifications"],
  endpoints: () => ({}),
});