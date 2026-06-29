import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchFollowups = createAsyncThunk('followups/fetchAll', async (params) => {
  const { data } = await api.get('/followups', { params });
  // Backend returns a plain array when unpaginated, { data, total } when limit/offset is passed.
  return Array.isArray(data) ? { data, total: data.length } : data;
});

export const addFollowup = createAsyncThunk('followups/add', async (payload) => {
  const { data } = await api.post('/followups', payload);
  return data;
});

export const completeFollowup = createAsyncThunk('followups/complete', async (id) => {
  const { data } = await api.patch(`/followups/${id}/complete`);
  return data;
});

export const rescheduleFollowup = createAsyncThunk('followups/reschedule', async ({ id, dueDate }) => {
  const { data } = await api.put(`/followups/${id}`, { dueDate, status: 'pending' });
  return data;
});

export const deleteFollowup = createAsyncThunk('followups/delete', async (id) => {
  await api.delete(`/followups/${id}`);
  return id;
});

const followupSlice = createSlice({
  name: 'followups',
  initialState: { items: [], total: 0, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowups.pending, (state) => { state.loading = true; })
      .addCase(fetchFollowups.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(addFollowup.fulfilled, (state, action) => { state.items.push(action.payload); })
      .addCase(completeFollowup.fulfilled, (state, action) => {
        const idx = state.items.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
      })
      .addCase(rescheduleFollowup.fulfilled, (state, action) => {
        const idx = state.items.findIndex((f) => f.id === action.payload.id);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
      })
      .addCase(deleteFollowup.fulfilled, (state, action) => {
        state.items = state.items.filter((f) => f.id !== action.payload);
      });
  },
});

export default followupSlice.reducer;
