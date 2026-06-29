import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  const { data } = await api.get('/settings');
  return data;
});

export const saveSettings = createAsyncThunk('settings/save', async (payload) => {
  const { data } = await api.put('/settings', payload);
  return data;
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { data: null, loading: false, saving: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending,   (state) => { state.loading = true; })
      .addCase(fetchSettings.fulfilled, (state, action) => { state.loading = false; state.data = action.payload; })
      .addCase(saveSettings.pending,    (state) => { state.saving = true; })
      .addCase(saveSettings.fulfilled,  (state, action) => { state.saving = false; state.data = action.payload; });
  },
});

export default settingsSlice.reducer;
