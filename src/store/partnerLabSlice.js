import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchPartnerLabs = createAsyncThunk('partnerLabs/fetchAll', async () => {
  const { data } = await api.get('/partner-labs');
  return data;
});

export const createPartnerLab = createAsyncThunk('partnerLabs/create', async (payload) => {
  const { data } = await api.post('/partner-labs', payload);
  return data;
});

export const updatePartnerLab = createAsyncThunk('partnerLabs/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/partner-labs/${id}`, payload);
  return data;
});

export const fetchPartnerLabRates = createAsyncThunk('partnerLabs/fetchRates', async (id) => {
  const { data } = await api.get(`/partner-labs/${id}/rates`);
  return data;
});

export const savePartnerLabRates = createAsyncThunk('partnerLabs/saveRates', async ({ id, rates }) => {
  const { data } = await api.put(`/partner-labs/${id}/rates`, { rates });
  return data;
});

const partnerLabSlice = createSlice({
  name: 'partnerLabs',
  initialState: { data: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPartnerLabs.pending,   (state) => { state.loading = true; })
      .addCase(fetchPartnerLabs.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(createPartnerLab.fulfilled, (state, action) => {
        state.data.push(action.payload);
        state.data.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updatePartnerLab.fulfilled, (state, action) => {
        const idx = state.data.findIndex((l) => l.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      });
  },
});

export default partnerLabSlice.reducer;
