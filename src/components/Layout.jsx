import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, CalendarDays, Wrench, FlaskConical, Bell, Settings as SettingsIcon, LogOut, Building2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { logout, resendVerification, fetchCurrentUser } from '../store/authSlice';
import { fetchSettings } from '../store/settingsSlice';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from './ui/sidebar';
import { TooltipProvider } from './ui/tooltip';
import { Button } from './ui/button';

const navItems = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/customers',    label: 'Customers',    icon: Users },
  { to: '/orders',       label: 'Orders',       icon: ClipboardList },
  { to: '/day-view',     label: 'Day View',     icon: CalendarDays },
  { to: '/technicians',  label: 'Technicians',  icon: Wrench },
  { to: '/partner-labs', label: 'Partner Labs', icon: Building2 },
  { to: '/test-catalog', label: 'Test Catalog', icon: FlaskConical },
  { to: '/followups',    label: 'Follow-Ups',   icon: Bell },
  { to: '/settings',     label: 'Settings',     icon: SettingsIcon },
];

export default function Layout({ children }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | sent
  const settingsLoaded = useAppSelector((s) => Boolean(s.settings.data));
  const user = useAppSelector((s) => s.auth.user);
  const emailVerified = user?.emailVerified;

  useEffect(() => {
    if (!settingsLoaded) dispatch(fetchSettings());
  }, [dispatch, settingsLoaded]);

  useEffect(() => {
    if (!user) dispatch(fetchCurrentUser());
  }, [dispatch, user]);

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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center">
              <Link to="/" className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="text-lg font-bold text-green-600 shrink-0">🩺</span>
                <span className="text-lg font-bold text-green-600 truncate">
                  WhatsApp CRM
                </span>
              </Link>
              <SidebarTrigger />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="px-2">
              {navItems.map((item) => {
                const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter>
            {user && (
              <div className="px-3 py-2 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-gray-800 truncate">{user.businessName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            )}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  tooltip="Logout"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          {/* Mobile top bar — opens the sidebar as a slide-over sheet */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-30">
            <SidebarTrigger />
            <span className="font-bold text-green-600">WhatsApp CRM</span>
            <div className="w-6" />
          </div>

          {showVerifyBanner && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap text-sm">
              <span className="text-yellow-800">
                {resendStatus === 'sent'
                  ? 'Verification email sent — check your inbox.'
                  : 'Please verify your email address.'}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                {resendStatus !== 'sent' && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'sending'}
                    className="text-yellow-800"
                  >
                    {resendStatus === 'sending' ? 'Sending…' : 'Resend email'}
                  </Button>
                )}
                <Button variant="link" size="sm" onClick={() => setBannerDismissed(true)} className="text-yellow-600 hover:text-yellow-800">
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 bg-gray-50 min-h-screen">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
