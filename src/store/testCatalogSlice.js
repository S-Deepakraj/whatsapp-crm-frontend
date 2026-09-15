import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchTests = createAsyncThunk('testCatalog/fetchAll', async () => {
  const { data } = await api.get('/test-catalog');
  return data;
});

export const createTest = createAsyncThunk('testCatalog/create', async (payload) => {
  const { data } = await api.post('/test-catalog', payload);
  return data;
});

export const updateTest = createAsyncThunk('testCatalog/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/test-catalog/${id}`, payload);
  return data;
});

export const fetchSampleTypes = createAsyncThunk('testCatalog/fetchSampleTypes', async (id) => {
  const { data } = await api.get(`/test-catalog/${id}/sample-types`);
  return data;
});

export const saveSampleTypes = createAsyncThunk('testCatalog/saveSampleTypes', async ({ id, sampleTypes }) => {
  const { data } = await api.put(`/test-catalog/${id}/sample-types`, { sampleTypes });
  return data;
});

export const fetchIncludedTests = createAsyncThunk('testCatalog/fetchIncludedTests', async (id) => {
  const { data } = await api.get(`/test-catalog/${id}/included-tests`);
  return data;
});

export const saveIncludedTests = createAsyncThunk('testCatalog/saveIncludedTests', async ({ id, includedTests }) => {
  const { data } = await api.put(`/test-catalog/${id}/included-tests`, { includedTests });
  return data;
});

const testCatalogSlice = createSlice({
  name: 'testCatalog',
  initialState: { data: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTests.pending,   (state) => { state.loading = true; })
      .addCase(fetchTests.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(createTest.fulfilled, (state, action) => {
        state.data.push(action.payload);
        state.data.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateTest.fulfilled, (state, action) => {
        const idx = state.data.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      });
  },
});

export default testCatalogSlice.reducer;
