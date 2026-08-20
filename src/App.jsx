import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './hooks/redux';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import CustomerFormPage from './pages/CustomerFormPage';
import FollowupsPage from './pages/FollowupsPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import TestCatalogPage from './pages/TestCatalogPage';
import DayViewPage from './pages/DayViewPage';
import TechniciansPage from './pages/TechniciansPage';
import TechnicianStatusPage from './pages/TechnicianStatusPage';
import PartnerLabsPage from './pages/PartnerLabsPage';
import PartnerLabRatesPage from './pages/PartnerLabRatesPage';
import AccountsPage from './pages/AccountsPage';
import ExpenseCategoriesPage from './pages/ExpenseCategoriesPage';
import MyOrdersPage from './pages/MyOrdersPage';

function ProtectedRoute({ children }) {
  const token = useAppSelector((s) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// Everything except "My Orders" is owner-only — a technician who
// navigates (or types) their way to an owner URL gets bounced to their
// own landing page rather than rendering anything.
function OwnerRoute({ children }) {
  const token = useAppSelector((s) => s.auth.token);
  const role = useAppSelector((s) => s.auth.user?.role);
  if (!token) return <Navigate to="/login" replace />;
  if (role === 'technician') return <Navigate to="/my-orders" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/t/:token" element={<TechnicianStatusPage />} />
      <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
      <Route path="/" element={<OwnerRoute><DashboardPage /></OwnerRoute>} />
      <Route path="/customers" element={<OwnerRoute><CustomersPage /></OwnerRoute>} />
      <Route path="/customers/new" element={<OwnerRoute><CustomerFormPage /></OwnerRoute>} />
      <Route path="/customers/:id/edit" element={<OwnerRoute><CustomerFormPage /></OwnerRoute>} />
      <Route path="/customers/:id" element={<OwnerRoute><CustomerProfilePage /></OwnerRoute>} />
      <Route path="/followups" element={<OwnerRoute><FollowupsPage /></OwnerRoute>} />
      <Route path="/orders" element={<OwnerRoute><OrdersPage /></OwnerRoute>} />
      <Route path="/day-view" element={<OwnerRoute><DayViewPage /></OwnerRoute>} />
      <Route path="/technicians" element={<OwnerRoute><TechniciansPage /></OwnerRoute>} />
      <Route path="/partner-labs" element={<OwnerRoute><PartnerLabsPage /></OwnerRoute>} />
      <Route path="/partner-labs/:id/rates" element={<OwnerRoute><PartnerLabRatesPage /></OwnerRoute>} />
      <Route path="/test-catalog" element={<OwnerRoute><TestCatalogPage /></OwnerRoute>} />
      <Route path="/accounts" element={<OwnerRoute><AccountsPage /></OwnerRoute>} />
      <Route path="/finance/expense-categories" element={<OwnerRoute><ExpenseCategoriesPage /></OwnerRoute>} />
      <Route path="/settings" element={<OwnerRoute><SettingsPage /></OwnerRoute>} />
    </Routes>
  );
}
