import { useEffect, useState } from 'react';
import { Bot, Factory, HelpCircle, LayoutDashboard, LogOut, MapPinned, PlusCircle, ShoppingCart, UserCircle2 } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../services/supabase';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Materials', path: '/materials', icon: Factory },
  { label: 'Add Material', path: '/add-material', icon: PlusCircle },
  { label: 'Matches', path: '/matches', icon: MapPinned },
  { label: 'Requests', path: '/requests', icon: ShoppingCart },
  { label: 'Profile', path: '/profile', icon: UserCircle2 },
];

export default function Sidebar({ isOpen, onClose, onOpenChat, onOpenHelp }) {
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState('');
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(max-width: 1100px)');
    const updateLayout = () => setIsCompactLayout(mediaQuery.matches);
    updateLayout();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateLayout);
      return () => mediaQuery.removeEventListener('change', updateLayout);
    }
    mediaQuery.addListener(updateLayout);
    return () => mediaQuery.removeListener(updateLayout);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    setSignOutError('');
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          setSignOutError(error.message || 'Unable to sign out.');
          return;
        }
      }
      navigate('/login');
    } catch (error) {
      setSignOutError(error.message || 'Unable to sign out.');
    }
  };

  return (
    <>
    {isOpen ? (
      <button type="button" className="sidebar-backdrop" aria-label="Dismiss navigation drawer" onClick={onClose} />
    ) : null}
    <aside
      id="company-navigation"
      className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
      aria-hidden={isCompactLayout && !isOpen}
      inert={isCompactLayout && !isOpen}
    >
      <div className="brand-block">
        <div className="brand-mark">WE</div>
        <div className="brand-text">
          <h3>Waste Exchange</h3>
          <small>Circular Economy</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        <div style={{ margin: '14px 0 8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.45)' }}>
          Assistance & Knowledge
        </div>

        <button
          type="button"
          className="nav-item"
          onClick={() => { onClose(); onOpenChat(); }}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#d8eedc' }}
        >
          <Bot size={18} color="#7ccaa2" />
          AI Advisory Chatbot
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => { onClose(); onOpenHelp(); }}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#d8eedc' }}
        >
          <HelpCircle size={18} color="#7ccaa2" />
          Help & Guides
        </button>
      </nav>

      <div className="sidebar-footer">
        <strong>SDG 9 & 12 Platform</strong>
        <div className="small text-white-50 mt-1">
          Zero-waste industrial symbiosis network
        </div>
        {signOutError ? <div className="inline-message error mt-3">{signOutError}</div> : null}
        <button className="btn btn-outline-light mt-3 w-100" type="button" onClick={handleSignOut}>
          <LogOut size={16} className="me-2" />
          Sign out
        </button>
      </div>
    </aside>
    </>
  );
}
