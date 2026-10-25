import { useState } from 'react';
import { Bell, ChevronDown, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/materials?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="topbar">
      <form className="topbar-search" onSubmit={handleSearch}>
        <Search size={18} color="#45645c" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search material listings"
          aria-label="Search materials"
        />
      </form>

      <div className="topbar-actions">
        <Link to="/add-material" className="btn btn-primary-custom">
          <Plus size={16} className="me-2" />
          Add Listing
        </Link>
        <Link to="/requests" className="icon-btn" aria-label="View exchange requests">
          <Bell size={18} />
        </Link>
        <Link to="/profile" className="profile-pill">
          <div className="profile-avatar">P</div>
          <div>
            <strong>Priya Nair</strong>
            <div className="small text-muted">Operations Lead</div>
          </div>
          <ChevronDown size={16} color="#45645c" />
        </Link>
      </div>
    </header>
  );
}
