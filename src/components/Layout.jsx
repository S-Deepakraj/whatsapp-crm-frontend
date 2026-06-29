import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { logout, resendVerification } from '../store/authSlice';
import { fetchSettings } from '../store/settingsSlice';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/customers', label: 'Customers' },
  { to: '/followups', label: 'Follow-Ups' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout({ children }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | sent
  const settingsLoaded = useAppSelector((s) => Boolean(s.settings.data));
  const emailVerified = useAppSelector((s) => s.auth.user?.emailVerified);

  useEffect(() => {
    if (!settingsLoaded) dispatch(fetchSettings());
  }, [dispatch, settingsLoaded]);

  function handleLogout() {
    dispatch(logout());
    navigate('/login');
  }

  async function handleResendVerification() {
    setResendStatus('sending');
    await dispatch(resendVerification());
    setResendStatus('sent');
  }

  const showVerifyBanner = emailVerified === false && !bannerDismissed;

  const navLinks = (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-30">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-gray-600 text-xl leading-none px-1"
        >
          ☰
        </button>
        <span className="font-bold text-green-600">WhatsApp CRM</span>
        <div className="w-6" />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 max-w-[80%] bg-white flex flex-col">
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <span className="text-lg font-bold text-green-600">WhatsApp CRM</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-gray-400 text-xl leading-none">×</button>
            </div>
            {navLinks}
            <div className="px-3 py-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 bg-white border-r flex-col">
        <div className="px-6 py-5 border-b">
          <span className="text-lg font-bold text-green-600">WhatsApp CRM</span>
        </div>
        {navLinks}
        <div className="px-3 py-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        {showVerifyBanner && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap text-sm">
            <span className="text-yellow-800">
              {resendStatus === 'sent'
                ? 'Verification email sent — check your inbox.'
                : 'Please verify your email address.'}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              {resendStatus !== 'sent' && (
                <button
                  onClick={handleResendVerification}
                  disabled={resendStatus === 'sending'}
                  className="text-yellow-800 font-medium hover:underline disabled:opacity-50"
                >
                  {resendStatus === 'sending' ? 'Sending…' : 'Resend email'}
                </button>
              )}
              <button onClick={() => setBannerDismissed(true)} className="text-yellow-600 hover:text-yellow-800">
                Dismiss
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
