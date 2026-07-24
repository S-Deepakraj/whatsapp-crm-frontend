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
  },
});
