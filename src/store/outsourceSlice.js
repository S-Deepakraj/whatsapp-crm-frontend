import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Outsource labs are where tests are SENT for processing (the processing
// lab doesn't run them) — not to be confused with partner labs, which
// send samples here (ILS).

export const fetchOutsourceLabs = createAsyncThunk('outsource/fetchLabs', async ({ includeInactive } = {}) => {
  const { data } = await api.get('/outsource-labs', { params: includeInactive ? { includeInactive: 1 } : {} });
  return data;
});

export const createOutsourceLab = createAsyncThunk('outsource/createLab', async (payload) => {
  const { data } = await api.post('/outsource-labs', payload);
  return data;
});

export const updateOutsourceLab = createAsyncThunk('outsource/updateLab', async ({ id, ...payload }) => {
  const { data } = await api.put(`/outsource-labs/${id}`, payload);
  return data;
});

export const fetchOutsourceLabRates = createAsyncThunk('outsource/fetchRates', async (id) => {
  const { data } = await api.get(`/outsource-labs/${id}/rates`);
  return data;
});

export const saveOutsourceLabRates = createAsyncThunk('outsource/saveRates', async ({ id, rates }) => {
  const { data } = await api.put(`/outsource-labs/${id}/rates`, { rates });
  return data;
});

// Each test carries `labs` — the active labs offering it with their
// cost, cheapest first — which is what the order form's lab dropdown
// reads. Always fetched with inactive tests included (the Tests tab
// manages them); the order form filters to active ones itself.
export const fetchOutsourceTests = createAsyncThunk('outsource/fetchTests', async ({ includeInactive } = {}) => {
  const { data } = await api.get('/outsource-tests', { params: includeInactive ? { includeInactive: 1 } : {} });
  return data;
});

export const createOutsourceTest = createAsyncThunk('outsource/createTest', async (payload) => {
  const { data } = await api.post('/outsource-tests', payload);
  return data;
});

export const updateOutsourceTest = createAsyncThunk('outsource/updateTest', async ({ id, ...payload }) => {
  const { data } = await api.put(`/outsource-tests/${id}`, payload);
  return data;
});

export const fetchOutsourcePayables = createAsyncThunk('outsource/fetchPayables', async () => {
  const { data } = await api.get('/outsource-labs/payables');
  return data;
});

export const fetchOutsourcePayments = createAsyncThunk('outsource/fetchPayments', async (labId) => {
  const { data } = await api.get(`/outsource-labs/${labId}/payments`);
  return data;
});

export const createOutsourcePayment = createAsyncThunk('outsource/createPayment', async ({ labId, ...payload }) => {
  const { data } = await api.post(`/outsource-labs/${labId}/payments`, payload);
  return data;
});

export const fetchOutsourceOrders = createAsyncThunk('outsource/fetchOrders', async (params = {}) => {
  const { data } = await api.get('/outsource-orders', { params });
  return data;
});

export const updateOutsourceOrder = createAsyncThunk('outsource/updateOrder', async ({ id, ...payload }) => {
  const { data } = await api.patch(`/outsource-orders/${id}`, payload);
  return data;
});

function sortByName(list) {
  list.sort((a, b) => a.name.localeCompare(b.name));
}

const outsourceSlice = createSlice({
  name: 'outsource',
  initialState: {
    labs: [], labsLoading: false,
    tests: [], testsLoading: false, testsLoaded: false,
    payables: [], payablesLoading: false,
    orders: { data: [], total: 0 }, ordersLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutsourceLabs.pending,   (state) => { state.labsLoading = true; })
      .addCase(fetchOutsourceLabs.fulfilled, (state, action) => {
        state.labsLoading = false;
        state.labs = action.payload;
      })
      .addCase(fetchOutsourceLabs.rejected,  (state) => { state.labsLoading = false; })
      .addCase(createOutsourceLab.fulfilled, (state, action) => {
        state.labs.push(action.payload);
        sortByName(state.labs);
      })
      .addCase(updateOutsourceLab.fulfilled, (state, action) => {
        const idx = state.labs.findIndex((l) => l.id === action.payload.id);
        if (idx !== -1) state.labs[idx] = action.payload;
      })

      .addCase(fetchOutsourceTests.pending,   (state) => { state.testsLoading = true; })
      .addCase(fetchOutsourceTests.fulfilled, (state, action) => {
        state.testsLoading = false;
        state.testsLoaded = true;
        state.tests = action.payload;
      })
      .addCase(fetchOutsourceTests.rejected,  (state) => { state.testsLoading = false; })
      .addCase(createOutsourceTest.fulfilled, (state, action) => {
        state.tests.push(action.payload);
        sortByName(state.tests);
      })
      .addCase(updateOutsourceTest.fulfilled, (state, action) => {
        const idx = state.tests.findIndex((t) => t.id === action.payload.id);
        // The update response has no `labs` — keep the ones already loaded.
        if (idx !== -1) state.tests[idx] = { ...state.tests[idx], ...action.payload };
      })

      .addCase(fetchOutsourcePayables.pending,   (state) => { state.payablesLoading = true; })
      .addCase(fetchOutsourcePayables.fulfilled, (state, action) => {
        state.payablesLoading = false;
        state.payables = action.payload;
      })
      .addCase(fetchOutsourcePayables.rejected,  (state) => { state.payablesLoading = false; })

      .addCase(fetchOutsourceOrders.pending,   (state) => { state.ordersLoading = true; })
      .addCase(fetchOutsourceOrders.fulfilled, (state, action) => {
        state.ordersLoading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOutsourceOrders.rejected,  (state) => { state.ordersLoading = false; })
      .addCase(updateOutsourceOrder.fulfilled, (state, action) => {
        const row = state.orders.data.find((o) => o.id === action.payload.id);
        if (row) {
          row.sent_date = action.payload.sent_date;
          row.notes = action.payload.notes;
        }
      });
  },
});

export default outsourceSlice.reducer;
