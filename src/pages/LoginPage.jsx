import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { login } from '../store/authSlice';
import { Button } from '../components/ui/button';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState('owner'); // 'owner' | 'technician'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const credentials = mode === 'owner' ? { email, password } : { phone, password };
    const result = await dispatch(login(credentials));
    if (login.fulfilled.match(result)) {
      navigate(result.payload.user.role === 'technician' ? '/my-orders' : '/');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">LabFlow</h1>
        <p className="text-sm text-gray-500">Sign in to your account</p>

        <div className="flex gap-1">
          <Button type="button" variant={mode === 'owner' ? 'default' : 'outline'} size="sm" onClick={() => setMode('owner')}>
            Owner
          </Button>
          <Button type="button" variant={mode === 'technician' ? 'default' : 'outline'} size="sm" onClick={() => setMode('technician')}>
            Technician
          </Button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {mode === 'owner' ? (
          <input
            className="w-full border rounded px-3 py-2"
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
          />
        ) : (
          <input
            className="w-full border rounded px-3 py-2"
            type="tel" placeholder="Phone number" value={phone}
            onChange={(e) => setPhone(e.target.value)} required
          />
        )}
        <input
          className="w-full border rounded px-3 py-2"
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required
        />
        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>

        {mode === 'owner' && (
          <>
            <p className="text-sm text-center">
              <Link to="/forgot-password" className="text-green-600 hover:underline">Forgot password?</Link>
            </p>
            <p className="text-sm text-center text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-green-600 hover:underline">Register</Link>
            </p>
          </>
        )}
        {mode === 'technician' && (
          <p className="text-xs text-center text-gray-400">
            Ask the business owner for your login if you don't have one yet.
          </p>
        )}
      </form>
    </div>
  );
}
