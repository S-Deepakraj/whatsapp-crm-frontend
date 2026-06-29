import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { register } from '../store/authSlice';

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await dispatch(register(form));
    setLoading(false);
    if (register.fulfilled.match(result)) {
      navigate('/login');
    } else {
      setError(result.error?.message || 'Registration failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
        <p className="text-sm text-gray-500">Set up your WhatsApp CRM</p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          className="w-full border rounded px-3 py-2"
          name="businessName" placeholder="Business name"
          value={form.businessName} onChange={handleChange} required
        />
        <input
          className="w-full border rounded px-3 py-2"
          name="email" type="email" placeholder="Email"
          value={form.email} onChange={handleChange} required
        />
        <input
          className="w-full border rounded px-3 py-2"
          name="phone" type="tel" placeholder="Phone number"
          value={form.phone} onChange={handleChange}
        />
        <input
          className="w-full border rounded px-3 py-2"
          name="password" type="password" placeholder="Password"
          value={form.password} onChange={handleChange} required
        />

        <button
          type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-sm text-center text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
