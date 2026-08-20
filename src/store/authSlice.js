import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const register = createAsyncThunk('auth/register', async (payload) => {
  await api.post('/auth/register', payload);
});

export const login = createAsyncThunk('auth/login', async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
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

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async () => {
  const { data } = await api.get('/auth/me');
  return data;
});

export const changePassword = createAsyncThunk('auth/changePassword', async ({ currentPassword, newPassword }) => {
  const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
  return data;
});

// Read synchronously so `user.role` (and therefore whether this is a
// technician) is known on the very first render after a page refresh —
// otherwise there's a window where `user` is null before fetchCurrentUser
// resolves, during which OwnerRoute/Layout can't tell a technician apart
// from an owner and briefly render owner-only pages/API calls (403s).
function loadStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('token'),
    user: loadStoredUser(),
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        // Token is invalid/expired — the axios interceptor already
        // redirects to /login on the 401; just clear stale user data here.
        state.user = null;
        localStorage.removeItem('user');
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
