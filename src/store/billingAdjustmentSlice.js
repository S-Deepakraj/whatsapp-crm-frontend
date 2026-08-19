import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchBillingAdjustments = createAsyncThunk('billingAdjustments/fetchAll', async (params = {}) => {
  const { data } = await api.get('/billing-adjustments', { params });
  return data;
});

export const createBillingAdjustment = createAsyncThunk('billingAdjustments/create', async (payload) => {
  const { data } = await api.post('/billing-adjustments', payload);
  return data;
});

const billingAdjustmentSlice = createSlice({
  name: 'billingAdjustments',
  initialState: { data: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBillingAdjustments.pending,   (state) => { state.loading = true; })
      .addCase(fetchBillingAdjustments.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(createBillingAdjustment.fulfilled, (state, action) => {
        state.data.unshift(action.payload);
      });
  },
});

export default billingAdjustmentSlice.reducer;
