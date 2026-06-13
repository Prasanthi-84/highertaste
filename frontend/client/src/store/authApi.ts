import { api } from "./api";
import { setCredentials } from "./authSlice";

const normalizeLoginPayload = (credentials: any) => ({
  email: credentials?.email ?? credentials?.username ?? "",
  password: credentials?.password ?? "",
});

const extractAuthPayload = (data: any) => ({
  token: data?.token,
  user: data?.user,
});

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── Existing ─────────────────────────────────────────────────────────────
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: normalizeLoginPayload(credentials),
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(extractAuthPayload(data)));
        } catch {
          // Error is surfaced via RTK Query's rejected state
        }
      },
    }),
    status: builder.query({
      query: () => "/auth/me",
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),

    // ── Forgot / Reset Password ───────────────────────────────────────────────
    /** POST /api/auth/forgot-password  — sends reset email */
    forgotPassword: builder.mutation<
      { success: boolean; message: string },
      { email: string }
    >({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),

    /** PUT /api/auth/reset-password/:token  — validates token + sets new password */
    resetPassword: builder.mutation<
      { success: boolean; message: string },
      { token: string; password: string }
    >({
      query: ({ token, password }) => ({
        url: `/auth/reset-password/${token}`,
        method: "PUT",
        body: { password },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useStatusQuery,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
