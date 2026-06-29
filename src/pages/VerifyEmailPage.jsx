import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { verifyEmail } from '../store/authSlice';

export default function VerifyEmailPage() {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    dispatch(verifyEmail(token)).then((result) => {
      if (verifyEmail.fulfilled.match(result)) {
        setStatus('success');
        setMessage(result.payload.message);
      } else {
        setStatus('error');
        setMessage(result.error?.message || 'This verification link is invalid or has expired.');
      }
    });
  }, [dispatch, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Email Verification</h1>
        <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-gray-600'}`}>
          {status === 'verifying' ? 'Verifying your email…' : message}
        </p>
        <Link to="/login" className="text-sm text-green-600 hover:underline block">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
