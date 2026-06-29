import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchVisits = createAsyncThunk(
  'visits/fetchAll',
  async ({ customerId, limit = 10, offset = 0 }) => {
    const { data } = await api.get(`/customers/${customerId}/visits`, { params: { limit, offset } });
    return data; // { data: [], total: N }
  }
);

export const createVisit = createAsyncThunk(
  'visits/create',
  async ({ customerId, ...payload }) => {
    const { data } = await api.post(`/customers/${customerId}/visits`, payload);
    return data;
  }
);

export const updateVisit = createAsyncThunk(
  'visits/update',
  async ({ id, ...payload }) => {
    const { data } = await api.put(`/visits/${id}`, payload);
    return data;
  }
);

export const deleteVisit = createAsyncThunk('visits/delete', async (id) => {
  await api.delete(`/visits/${id}`);
  return id;
});

const visitSlice = createSlice({
  name: 'visits',
  initialState: { data: [], total: 0, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisits.pending,    (state) => { state.loading = true; })
      .addCase(fetchVisits.fulfilled,  (state, action) => {
        state.loading = false;
        state.data    = action.payload.data;
        state.total   = action.payload.total;
      })
      .addCase(createVisit.fulfilled, (state, action) => {
        state.data.unshift(action.payload);
        state.total += 1;
      })
      .addCase(updateVisit.fulfilled, (state, action) => {
        const idx = state.data.findIndex((v) => v.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      })
      .addCase(deleteVisit.fulfilled, (state, action) => {
        state.data  = state.data.filter((v) => v.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      });
  },
});

export default visitSlice.reducer;
