import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import MaterialListings from './pages/MaterialListings';
import AddMaterial from './pages/AddMaterial';
import MatchingResults from './pages/MatchingResults';
import ExchangeRequests from './pages/ExchangeRequests';
import CompanyProfile from './pages/CompanyProfile';
import EnvironmentalImpact from './pages/EnvironmentalImpact';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import { isSupabaseConfigured, supabase } from './services/supabase';

function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-panel">
        <Navbar />
        <main className="page-wrapper">
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/materials" element={<MaterialListings />} />
            <Route path="/add-material" element={<AddMaterial />} />
            <Route path="/matches" element={<MatchingResults />} />
            <Route path="/requests" element={<ExchangeRequests />} />
            <Route path="/profile" element={<CompanyProfile />} />
            <Route path="/impact" element={<EnvironmentalImpact />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
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

  if (!isSupabaseConfigured) return <AppLayout />;
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
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
