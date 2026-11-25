import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchRecommendations = createAsyncThunk('recommendations/fetch', async (payload) => {
  const { data } = await api.post('/recommendations', payload);
  return data;
});

export const fetchIndexStatus = createAsyncThunk('recommendations/fetchStatus', async () => {
  const { data } = await api.get('/recommendations/index-status');
  return data;
});

export const rebuildIndex = createAsyncThunk('recommendations/rebuildIndex', async () => {
  const { data } = await api.post('/recommendations/reindex');
  return data;
});

const recommendationSlice = createSlice({
  name: 'recommendations',
  initialState: { result: null, status: null, loading: false, rebuilding: false },
  reducers: {
    clearRecommendations: (state) => { state.result = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecommendations.pending,   (state) => { state.loading = true; })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.result  = action.payload;
      })
      .addCase(fetchRecommendations.rejected,  (state) => { state.loading = false; })
      .addCase(fetchIndexStatus.fulfilled,     (state, action) => { state.status = action.payload; })
      .addCase(rebuildIndex.pending,           (state) => { state.rebuilding = true; })
      .addCase(rebuildIndex.fulfilled,         (state) => { state.rebuilding = false; })
      .addCase(rebuildIndex.rejected,          (state) => { state.rebuilding = false; });
  },
});

export const { clearRecommendations } = recommendationSlice.actions;
export default recommendationSlice.reducer;
