import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchDailyReport = createAsyncThunk('reports/fetchDaily', async (date) => {
  const { data } = await api.get('/reports/daily', { params: { date } });
  return data;
});

export const fetchWeeklyReport = createAsyncThunk('reports/fetchWeekly', async (weekStart) => {
  const { data } = await api.get('/reports/weekly', { params: { weekStart } });
  return data;
});

export const fetchMonthlyReport = createAsyncThunk('reports/fetchMonthly', async (month) => {
  const { data } = await api.get('/reports/monthly', { params: { month } });
  return data;
});

const reportSlice = createSlice({
  name: 'reports',
  initialState: { daily: null, dailyLoading: false, weekly: null, weeklyLoading: false, monthly: null, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyReport.pending,   (state) => { state.dailyLoading = true; })
      .addCase(fetchDailyReport.fulfilled, (state, action) => {
        state.dailyLoading = false;
        state.daily = action.payload;
      })
      .addCase(fetchWeeklyReport.pending,   (state) => { state.weeklyLoading = true; })
      .addCase(fetchWeeklyReport.fulfilled, (state, action) => {
        state.weeklyLoading = false;
        state.weekly = action.payload;
      })
      .addCase(fetchMonthlyReport.pending,   (state) => { state.loading = true; })
      .addCase(fetchMonthlyReport.fulfilled, (state, action) => {
        state.loading = false;
        state.monthly = action.payload;
      });
  },
});

export default reportSlice.reducer;
