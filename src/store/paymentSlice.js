import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchPayments = createAsyncThunk('payments/fetchAll', async (params = {}) => {
  const { data } = await api.get('/payments', { params });
  return data;
});

export const createPayment = createAsyncThunk('payments/create', async (payload) => {
  const { data } = await api.post('/payments', payload);
  return data;
});

export const deletePayment = createAsyncThunk('payments/delete', async (id) => {
  await api.delete(`/payments/${id}`);
  return id;
});

const paymentSlice = createSlice({
  name: 'payments',
  initialState: { data: [], total: 0, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending,   (state) => { state.loading = true; })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload.data;
        state.total   = action.payload.total;
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.data.unshift(action.payload);
        state.total += 1;
      })
      .addCase(deletePayment.fulfilled, (state, action) => {
        state.data = state.data.filter((p) => p.id !== action.payload);
        state.total -= 1;
      });
  },
});

export default paymentSlice.reducer;
