import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import AIChatbotModal from './components/AIChatbotModal';
import HelpMenuModal from './components/HelpMenuModal';
import Dashboard from './pages/Dashboard';
import MaterialListings from './pages/MaterialListings';
import AddMaterial from './pages/AddMaterial';
import MatchingResults from './pages/MatchingResults';
import ExchangeRequests from './pages/ExchangeRequests';
import CompanyProfile from './pages/CompanyProfile';
import AdminDashboard from './pages/AdminDashboard';
import UnauthorizedPage from './pages/UnauthorizedPage';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import { isSupabaseConfigured, supabase } from './services/supabase';

/** Protects /admin — only allows users whose app_metadata.role === 'admin' */
function AdminRoute({ children }) {
  const [status, setStatus] = useState(null); // null=checking, 'admin', 'denied'

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setStatus('denied');
      return undefined;
    }

    let active = true;
    supabase.auth.getUser()
      .then(({ data: { user }, error }) => {
        if (active) setStatus(!error && user?.app_metadata?.role === 'admin' ? 'admin' : 'denied');
      })
      .catch(() => {
        if (active) setStatus('denied');
      });
    return () => { active = false; };
  }, []);

  if (status === null) return <div className="auth-status">Verifying access...</div>;
  if (status === 'denied') return <UnauthorizedPage />;
  return children;
}

function AppLayout() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />
      <div className="main-panel">
        <Navbar
          onOpenChat={() => setIsChatOpen(prev => !prev)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onToggleNavigation={() => setIsNavigationOpen((open) => !open)}
          isNavigationOpen={isNavigationOpen}
        />
        <main className="page-wrapper">
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/materials" element={<MaterialListings />} />
            <Route path="/add-material" element={<AddMaterial />} />
            <Route path="/matches" element={<MatchingResults />} />
            <Route path="/requests" element={<ExchangeRequests />} />
            <Route path="/profile" element={<CompanyProfile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />          </Routes>
        </main>
        <Footer />
      </div>

      <AIChatbotModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <HelpMenuModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

function AuthenticatedApp() {
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let isActive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isActive) {
        setSession(nextSession);
        setIsCheckingSession(false);
      }
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) {
          setAuthError(error.message);
        } else {
          setSession(data.session);
        }
        setIsCheckingSession(false);
      })
      .catch((error) => {
        if (!isActive) return;
        setAuthError(error.message || 'Unable to verify your session.');
        setIsCheckingSession(false);
      });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) {
    return <div className="auth-status inline-message error">Supabase is not configured. Authentication is unavailable.</div>;
  }
  if (isCheckingSession) return <div className="auth-status">Checking your session...</div>;
  if (authError) return <div className="auth-status inline-message error">{authError}</div>;
  return session ? <AppLayout /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Admin route — standalone (no Sidebar/Navbar), role-gated */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
