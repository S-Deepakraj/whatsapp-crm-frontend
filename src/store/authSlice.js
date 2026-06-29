import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const register = createAsyncThunk('auth/register', async (payload) => {
  await api.post('/auth/register', payload);
});

export const login = createAsyncThunk('auth/login', async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  localStorage.setItem('token', data.token);
  return data;
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ token, newPassword }) => {
  const { data } = await api.post('/auth/reset-password', { token, newPassword });
  return data;
});

export const verifyEmail = createAsyncThunk('auth/verifyEmail', async (token) => {
  const { data } = await api.post('/auth/verify-email', { token });
  return data;
});

export const resendVerification = createAsyncThunk('auth/resendVerification', async () => {
  const { data } = await api.post('/auth/resend-verification');
  return data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('token'),
    user: null,
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Login failed';
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        if (state.user) state.user.emailVerified = true;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
