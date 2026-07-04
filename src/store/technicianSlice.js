import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchTechnicians = createAsyncThunk('technicians/fetchAll', async () => {
  const { data } = await api.get('/technicians');
  return data;
});

export const createTechnician = createAsyncThunk('technicians/create', async (payload) => {
  const { data } = await api.post('/technicians', payload);
  return data;
});

export const updateTechnician = createAsyncThunk('technicians/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/technicians/${id}`, payload);
  return data;
});

const technicianSlice = createSlice({
  name: 'technicians',
  initialState: { data: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTechnicians.pending,   (state) => { state.loading = true; })
      .addCase(fetchTechnicians.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(createTechnician.fulfilled, (state, action) => {
        state.data.push(action.payload);
        state.data.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateTechnician.fulfilled, (state, action) => {
        const idx = state.data.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      });
  },
});

export default technicianSlice.reducer;
