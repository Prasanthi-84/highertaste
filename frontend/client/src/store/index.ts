

//central place to store data

import { configureStore } from "@reduxjs/toolkit";
import authReducer from './authSlice';
import { api } from "./api";
import customerReducer from './customerSlice';
import quoteReducer from './quoteSlice';
import invoiceReducer from './invoiceSlice';
import orderReducer from './orderSlice';

// Import all injected api slices so their endpoints get registered
import './customerApi';
import './menuApi';
import './quoteApi';
import './OrderApi';
import './authApi';
import './invoiceApi';
import './paymentApi';
import './expenseApi';
import './reportsApi';
import './kitchenApi';
import './dashboardApi';
import './settingsApi';
import './calendarApi';
import './userApi';
import './feedbackApi';
import './notificationApi';
import './whatsappApi';

import menuReducer from './menuSlice';
import expenseReducer from './expenseSlice';

export const store=configureStore({

    //api handling
       reducer:{
        auth:authReducer,
        customers:customerReducer,
        quotes:quoteReducer,
        invoices:invoiceReducer,
        menuUI: menuReducer,
        orderUI: orderReducer,
        expenseUI: expenseReducer,
        [api.reducerPath]: api.reducer,
       },
    middleware:(getDefaultMiddleware)=>
        getDefaultMiddleware().concat(api.middleware),

     
})


export type RootState=ReturnType<typeof store.getState>;
export type AppDispatch=ReturnType<typeof store.dispatch>;