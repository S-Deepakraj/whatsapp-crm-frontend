import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './authSlice';
import customerReducer from './customerSlice';
import followupReducer from './followupSlice';
import visitReducer    from './visitSlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    customers: customerReducer,
    followups: followupReducer,
    visits:    visitReducer,
    settings:  settingsReducer,
  },
});
