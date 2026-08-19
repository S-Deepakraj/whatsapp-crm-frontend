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

export const updateExpense = createAsyncThunk('expenses/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/expenses/${id}`, payload);
  return data;
});

export const deleteExpense = createAsyncThunk('expenses/delete', async (id) => {
  await api.delete(`/expenses/${id}`);
  return id;
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
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        const idx = state.data.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.data = state.data.filter((e) => e.id !== action.payload);
      });
  },
});

export default expenseSlice.reducer;
