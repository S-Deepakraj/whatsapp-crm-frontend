import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchCustomers = createAsyncThunk('customers/fetchAll', async (params) => {
  const { data } = await api.get('/customers', { params });
  // Backend returns a plain array when unpaginated, { data, total } when limit/offset is passed.
  return Array.isArray(data) ? { data, total: data.length } : data;
});

export const fetchCustomer = createAsyncThunk('customers/fetchOne', async (id) => {
  const { data } = await api.get(`/customers/${id}`);
  return data;
});

export const createCustomer = createAsyncThunk('customers/create', async (payload) => {
  const { data } = await api.post('/customers', payload);
  return data;
});

export const updateCustomer = createAsyncThunk('customers/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/customers/${id}`, payload);
  return data;
});

export const deleteCustomer = createAsyncThunk('customers/delete', async (id) => {
  await api.delete(`/customers/${id}`);
  return id;
});

const customerSlice = createSlice({
  name: 'customers',
  initialState: { items: [], total: 0, selected: null, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => { state.loading = true; })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchCustomer.fulfilled, (state, action) => { state.selected = action.payload; })
      .addCase(createCustomer.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
      });
  },
});

export default customerSlice.reducer;
