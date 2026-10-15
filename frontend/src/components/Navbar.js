import { Bell, ChevronDown, Plus, Search } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={18} color="#45645c" />
        <input type="text" placeholder="Search materials, suppliers, or requests" aria-label="Search" />
      </div>

      <div className="topbar-actions">
        <button type="button" className="btn btn-primary-custom">
          <Plus size={16} className="me-2" />
          Add Listing
        </button>
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="profile-pill">
          <div className="profile-avatar">P</div>
          <div>
            <strong>Priya Nair</strong>
            <div className="small text-muted">Operations Lead</div>
          </div>
          <ChevronDown size={16} color="#45645c" />
        </div>
      </div>
    </header>
  );
}
