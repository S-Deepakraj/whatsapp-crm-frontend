import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Server message (e.g. "Add your Google Review URL in Settings…") is
// passed through so dialogs can show it inline, not just in the toast.
function withMessage(fn) {
  return async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Something went wrong');
    }
  };
}

export const fetchReviewRequests = createAsyncThunk('reviewRequests/fetchAll', withMessage(async (params) => {
  const { data } = await api.get('/review-requests', { params });
  return data;
}));

export const fetchReviewStats = createAsyncThunk('reviewRequests/fetchStats', withMessage(async (params) => {
  const { data } = await api.get('/review-requests/stats', { params });
  return data;
}));

export const fetchReviewRequest = createAsyncThunk('reviewRequests/fetchOne', withMessage(async (id) => {
  const { data } = await api.get(`/review-requests/${id}`);
  return data;
}));

// payload: { orderId } or { customerId } (latest delivered-report order).
export const startReviewRequest = createAsyncThunk('reviewRequests/start', withMessage(async (payload) => {
  const { data } = await api.post('/review-requests', payload);
  return data;
}));

// Builds the exact message + wa.me link — does NOT mark anything sent.
export const prepareReviewStep = createAsyncThunk('reviewRequests/prepare', withMessage(async ({ id, step }) => {
  const { data } = await api.post(`/review-requests/${id}/steps/${step}/prepare`);
  return data;
}));

// Staff's own confirmation of what happened in WhatsApp.
export const confirmReviewStep = createAsyncThunk('reviewRequests/confirm', withMessage(async ({ id, step, outcome, reason, note }) => {
  const { data } = await api.post(`/review-requests/${id}/steps/${step}/confirm`, { outcome, reason, note });
  return data;
}));

export const sendReviewRequestNow = createAsyncThunk('reviewRequests/sendNow', withMessage(async (id) => {
  const { data } = await api.post(`/review-requests/${id}/send-now`);
  return data;
}));

export const cancelReviewRequest = createAsyncThunk('reviewRequests/cancel', withMessage(async (id) => {
  const { data } = await api.post(`/review-requests/${id}/cancel`);
  return data;
}));

export const retryReviewRequest = createAsyncThunk('reviewRequests/retry', withMessage(async (id) => {
  const { data } = await api.post(`/review-requests/${id}/retry`);
  return data;
}));

function upsert(state, item) {
  if (!item?.id) return;
  const idx = state.items.findIndex((r) => r.id === item.id);
  if (idx !== -1) state.items[idx] = { ...state.items[idx], ...item };
  state.byId[item.id] = { ...state.byId[item.id], ...item };
}

const reviewRequestSlice = createSlice({
  name: 'reviewRequests',
  initialState: { items: [], total: 0, loading: false, stats: null, byId: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviewRequests.pending, (state) => { state.loading = true; })
      .addCase(fetchReviewRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchReviewRequests.rejected, (state) => { state.loading = false; })
      .addCase(fetchReviewStats.fulfilled, (state, action) => { state.stats = action.payload; })
      .addCase(fetchReviewRequest.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(startReviewRequest.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(confirmReviewStep.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(sendReviewRequestNow.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(cancelReviewRequest.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(retryReviewRequest.fulfilled, (state, action) => upsert(state, action.payload));
  },
});

export default reviewRequestSlice.reducer;
