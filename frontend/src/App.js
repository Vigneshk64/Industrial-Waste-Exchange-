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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
