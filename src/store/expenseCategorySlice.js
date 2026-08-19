import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchExpenseCategories = createAsyncThunk('expenseCategories/fetchAll', async (params = {}) => {
  const { data } = await api.get('/expense-categories', { params });
  return data;
});

export const createExpenseCategory = createAsyncThunk('expenseCategories/create', async (payload) => {
  const { data } = await api.post('/expense-categories', payload);
  return data;
});

export const updateExpenseCategory = createAsyncThunk('expenseCategories/update', async ({ id, ...payload }) => {
  const { data } = await api.put(`/expense-categories/${id}`, payload);
  return data;
});

const expenseCategorySlice = createSlice({
  name: 'expenseCategories',
  initialState: { data: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenseCategories.pending,   (state) => { state.loading = true; })
      .addCase(fetchExpenseCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;
      })
      .addCase(createExpenseCategory.fulfilled, (state, action) => {
        state.data.push(action.payload);
        state.data.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateExpenseCategory.fulfilled, (state, action) => {
        const idx = state.data.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.data[idx] = action.payload;
      });
  },
});

export default expenseCategorySlice.reducer;
