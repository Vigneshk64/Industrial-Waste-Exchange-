import { useState } from 'react';
import { BarChart3, Bot, Factory, HelpCircle, LayoutDashboard, LogOut, MapPinned, PlusCircle, ShoppingCart, UserCircle2 } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../services/supabase';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Materials', path: '/materials', icon: Factory },
  { label: 'Add Material', path: '/add-material', icon: PlusCircle },
  { label: 'Matches', path: '/matches', icon: MapPinned },
  { label: 'Requests', path: '/requests', icon: ShoppingCart },
  { label: 'Impact', path: '/impact', icon: BarChart3 },
  { label: 'Profile', path: '/profile', icon: UserCircle2 },
];

export default function Sidebar({ onOpenChat, onOpenHelp }) {
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState('');

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
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">WE</div>
        <div className="brand-text">
          <h3>Waste Exchange</h3>
          <small>Circular Economy</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
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
          onClick={onOpenChat}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#d8eedc' }}
        >
          <Bot size={18} color="#7ccaa2" />
          AI Advisory Chatbot
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={onOpenHelp}
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
  );
}
