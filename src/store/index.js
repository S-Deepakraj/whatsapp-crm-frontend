import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './authSlice';
import customerReducer from './customerSlice';
import followupReducer from './followupSlice';
import visitReducer    from './visitSlice';
import settingsReducer from './settingsSlice';
import testCatalogReducer from './testCatalogSlice';
import orderReducer       from './orderSlice';
import technicianReducer  from './technicianSlice';
import partnerLabReducer  from './partnerLabSlice';
import paymentReducer     from './paymentSlice';
import settlementReducer  from './settlementSlice';
import expenseReducer     from './expenseSlice';
import expenseCategoryReducer from './expenseCategorySlice';
import billingAdjustmentReducer from './billingAdjustmentSlice';
import reportReducer      from './reportSlice';

export const store = configureStore({
  reducer: {
    auth:        authReducer,
    customers:   customerReducer,
    followups:   followupReducer,
    visits:      visitReducer,
    settings:    settingsReducer,
    testCatalog: testCatalogReducer,
    orders:      orderReducer,
    technicians: technicianReducer,
    partnerLabs: partnerLabReducer,
    payments:    paymentReducer,
    settlements: settlementReducer,
    expenses:    expenseReducer,
    expenseCategories: expenseCategoryReducer,
    billingAdjustments: billingAdjustmentReducer,
    reports:     reportReducer,
  },
});
