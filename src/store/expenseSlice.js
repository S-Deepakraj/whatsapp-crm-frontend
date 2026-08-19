import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchExpenses = createAsyncThunk('expenses/fetchAll', async (params = {}) => {
  const { data } = await api.get('/expenses', { params });
  return data;
});

export const createExpense = createAsyncThunk('expenses/create', async (payload) => {
  const { data } = await api.post('/expenses', payload);
  return data;
});

const expenseSlice = createSlice({
  name: 'expenses',
  initialState: { data: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending,   (state) => { state.loading = true; })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.data.unshift(action.payload);
      });
  },
});

export default expenseSlice.reducer;
