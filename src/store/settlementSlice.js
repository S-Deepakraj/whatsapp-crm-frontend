import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchSettlements = createAsyncThunk('settlements/fetchAll', async (params = {}) => {
  const { data } = await api.get('/settlements', { params });
  return data;
});

export const fetchSettlement = createAsyncThunk('settlements/fetchOne', async (id) => {
  const { data } = await api.get(`/settlements/${id}`);
  return data;
});

export const createSettlement = createAsyncThunk('settlements/create', async (payload) => {
  const { data } = await api.post('/settlements', payload);
  return data;
});

export const fetchDailySummary = createAsyncThunk('settlements/fetchDaily', async (date) => {
  const { data } = await api.get('/settlements/daily', { params: { date } });
  return data;
});

export const settleLabDay = createAsyncThunk('settlements/settleLabDay', async (payload) => {
  const { data } = await api.post('/settlements/settle', payload);
  return data;
});

export const addReceipt = createAsyncThunk('settlements/addReceipt', async ({ id, ...payload }) => {
  const { data } = await api.post(`/settlements/${id}/receipts`, payload);
  return data;
});

export const addAdjustment = createAsyncThunk('settlements/addAdjustment', async ({ id, ...payload }) => {
  const { data } = await api.post(`/settlements/${id}/adjustments`, payload);
  return data;
});

export const resolveSettlement = createAsyncThunk('settlements/resolve', async (id) => {
  const { data } = await api.patch(`/settlements/${id}/resolve`);
  return data;
});

function upsertList(state, settlement) {
  const idx = state.data.findIndex((s) => s.id === settlement.id);
  const summary = {
    id: settlement.id,
    partner_lab_id: settlement.partner_lab_id,
    partner_lab_name: settlement.partner_lab_name,
    settlement_date: settlement.settlement_date,
    expected_amount: settlement.expected_amount,
    amount_received: settlement.amount_received,
    status: settlement.status,
    resolved_at: settlement.resolved_at,
    order_count: settlement.orders?.length ?? state.data[idx]?.order_count,
  };
  if (idx !== -1) state.data[idx] = { ...state.data[idx], ...summary };
  else state.data.unshift(summary);
}

const settlementSlice = createSlice({
  name: 'settlements',
  initialState: {
    data: [], total: 0, loading: false, current: null, currentLoading: false,
    daily: [], dailyLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettlements.pending,   (state) => { state.loading = true; })
      .addCase(fetchSettlements.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload.data;
        state.total   = action.payload.total;
      })
      .addCase(fetchDailySummary.pending,   (state) => { state.dailyLoading = true; })
      .addCase(fetchDailySummary.fulfilled, (state, action) => {
        state.dailyLoading = false;
        state.daily = action.payload;
      })
      .addCase(fetchSettlement.pending, (state) => { state.currentLoading = true; })
      .addCase(fetchSettlement.fulfilled, (state, action) => {
        state.currentLoading = false;
        state.current = action.payload;
      })
      .addCase(createSettlement.fulfilled, (state, action) => {
        upsertList(state, action.payload);
        state.current = action.payload;
      })
      .addCase(addReceipt.fulfilled, (state, action) => {
        upsertList(state, action.payload);
        state.current = action.payload;
      })
      .addCase(addAdjustment.fulfilled, (state, action) => {
        upsertList(state, action.payload);
        state.current = action.payload;
      })
      .addCase(resolveSettlement.fulfilled, (state, action) => {
        upsertList(state, action.payload);
        state.current = action.payload;
      });
  },
});

export default settlementSlice.reducer;
