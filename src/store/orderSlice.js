import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchOrders = createAsyncThunk(
  'orders/fetchAll',
  async ({ scheduledDate, status, limit = 20, offset = 0 } = {}) => {
    const { data } = await api.get('/orders', { params: { scheduledDate, status, limit, offset } });
    return data; // { data: [], total: N }
  }
);

export const createOrder = createAsyncThunk('orders/create', async (payload) => {
  const { data } = await api.post('/orders', payload);
  return data;
});

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, status }) => {
    const { data } = await api.patch(`/orders/${id}/status`, { status });
    return data;
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState: { data: [], total: 0, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending,   (state) => { state.loading = true; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload.data;
        state.total   = action.payload.total;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.data.unshift(action.payload);
        state.total += 1;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const idx = state.data.findIndex((o) => o.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      });
  },
});

export default orderSlice.reducer;
