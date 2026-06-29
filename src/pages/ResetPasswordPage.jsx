import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { resetPassword } from '../store/authSlice';

export default function ResetPasswordPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await dispatch(resetPassword({ token, newPassword }));
    setLoading(false);
    if (resetPassword.fulfilled.match(result)) {
      navigate('/login');
    } else {
      setError(result.error?.message || 'Could not reset password');
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Invalid Link</h1>
          <p className="text-sm text-gray-500">This reset link is missing its token. Request a new one.</p>
          <Link to="/forgot-password" className="text-sm text-green-600 hover:underline block">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Reset Password</h1>
        <p className="text-sm text-gray-500">Choose a new password for your account.</p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          className="w-full border rounded px-3 py-2"
          type="password" placeholder="New password" value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password" placeholder="Confirm new password" value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
        />
        <button
          type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>

        <p className="text-sm text-center text-gray-500">
          <Link to="/login" className="text-green-600 hover:underline">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
