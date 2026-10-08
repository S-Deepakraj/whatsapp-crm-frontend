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

export function reviewListKey(params) {
  return JSON.stringify(params ?? {});
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

// Builds the exact message — does NOT mark anything sent. mode 'api'
// when WhatsApp is connected, else 'manual' with a wa.me link; pass
// channel 'whatsapp_manual' to force the manual flow.
export const prepareReviewStep = createAsyncThunk('reviewRequests/prepare', withMessage(async ({ id, step, channel }) => {
  const { data } = await api.post(`/review-requests/${id}/steps/${step}/prepare`, channel ? { channel } : {});
  return data;
}));

// Sends the step through the WhatsApp Cloud API; returns the updated campaign.
export const sendReviewStep = createAsyncThunk('reviewRequests/send', withMessage(async ({ id, step }) => {
  const { data } = await api.post(`/review-requests/${id}/steps/${step}/send`);
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
  // itemsQuery = the query `items` were fetched for, so a page can tell
  // its own rows from rows left over by another view (Due now vs All).
  initialState: { items: [], total: 0, loading: false, stats: null, byId: {}, itemsQuery: null, latestRequestId: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviewRequests.pending, (state, action) => {
        state.loading = true;
        state.latestRequestId = action.meta.requestId;
      })
      .addCase(fetchReviewRequests.fulfilled, (state, action) => {
        // A slower, older request must not overwrite a newer view's rows.
        if (action.meta.requestId !== state.latestRequestId) return;
        state.loading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
        state.itemsQuery = reviewListKey(action.meta.arg);
      })
      .addCase(fetchReviewRequests.rejected, (state, action) => {
        if (action.meta.requestId === state.latestRequestId) state.loading = false;
      })
      .addCase(fetchReviewStats.fulfilled, (state, action) => { state.stats = action.payload; })
      .addCase(fetchReviewRequest.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(startReviewRequest.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(confirmReviewStep.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(sendReviewStep.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(sendReviewRequestNow.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(cancelReviewRequest.fulfilled, (state, action) => upsert(state, action.payload))
      .addCase(retryReviewRequest.fulfilled, (state, action) => upsert(state, action.payload));
  },
});

export default reviewRequestSlice.reducer;
