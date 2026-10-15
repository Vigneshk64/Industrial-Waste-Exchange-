import { BarChart3, Factory, FileText, LayoutDashboard, LogOut, MapPinned, PlusCircle, ShoppingCart, UserCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Materials', path: '/materials', icon: Factory },
  { label: 'Add Material', path: '/add-material', icon: PlusCircle },
  { label: 'Matches', path: '/matches', icon: MapPinned },
  { label: 'Requests', path: '/requests', icon: ShoppingCart },
  { label: 'Impact', path: '/impact', icon: BarChart3 },
  { label: 'Profile', path: '/profile', icon: UserCircle2 },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">WE</div>
        <div className="brand-text">
          <h3>Waste Exchange</h3>
          <small>Industrial Network</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <strong>Operational summary</strong>
        <div className="d-flex justify-content-between text-white-50 mb-2">
          <span>Recovered</span>
          <span>68.4 t</span>
        </div>
        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: '72%' }} />
        </div>
        <div className="mt-3 d-flex align-items-center gap-2 text-white-50">
          <FileText size={16} />
          Monthly impact report ready
        </div>
        <button className="btn btn-outline-light mt-3 w-100" type="button">
          <LogOut size={16} className="me-2" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
