import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchOverrides = createAsyncThunk('testCostOverrides/fetchAll', async (params = {}) => {
  const { data } = await api.get('/test-cost-overrides', { params });
  return data;
});

export const createOverride = createAsyncThunk('testCostOverrides/create', async (payload) => {
  const { data } = await api.post('/test-cost-overrides', payload);
  return data;
});

export const updateOverride = createAsyncThunk('testCostOverrides/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/test-cost-overrides/${id}`, payload);
  return data;
});

const testCostOverrideSlice = createSlice({
  name: 'testCostOverrides',
  initialState: { data: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverrides.pending,   (state) => { state.loading = true; })
      .addCase(fetchOverrides.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(createOverride.fulfilled, (state, action) => {
        // A new override deactivates any other active one for the same
        // test server-side — reflect that here too instead of waiting
        // for a refetch.
        state.data = state.data.map((o) => (
          o.test_catalog_id === action.payload.test_catalog_id && o.id !== action.payload.id
            ? { ...o, active: false }
            : o
        ));
        state.data.unshift(action.payload);
      })
      .addCase(updateOverride.fulfilled, (state, action) => {
        state.data = state.data.map((o) => {
          if (o.id === action.payload.id) return action.payload;
          if (action.payload.active && o.test_catalog_id === action.payload.test_catalog_id) return { ...o, active: false };
          return o;
        });
      });
  },
});

export default testCostOverrideSlice.reducer;
