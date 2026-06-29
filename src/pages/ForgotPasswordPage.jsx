import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { forgotPassword } from '../store/authSlice';

export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await dispatch(forgotPassword(email));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Forgot Password</h1>

        {sent ? (
          <>
            <p className="text-sm text-gray-600">
              If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. Check your inbox.
            </p>
            <Link to="/login" className="text-sm text-green-600 hover:underline block text-center">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">Enter your account email and we'll send you a reset link.</p>
            <input
              className="w-full border rounded px-3 py-2"
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <p className="text-sm text-center text-gray-500">
              <Link to="/login" className="text-green-600 hover:underline">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
