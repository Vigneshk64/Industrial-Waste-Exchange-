import { useState } from 'react';
import { Bell, Bot, ChevronDown, HelpCircle, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ onOpenChat, onOpenHelp }) {
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
          placeholder="Search available materials or requirements..."
          aria-label="Search materials"
        />
      </form>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-outline-custom d-flex align-items-center gap-2"
          onClick={onOpenChat}
          title="Circular Economy AI Assistant"
        >
          <Bot size={16} />
          <span>AI Chatbot</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onOpenHelp}
          aria-label="Help and predefined guides"
          title="Help Menu & Guides"
        >
          <HelpCircle size={18} />
        </button>

        <Link to="/add-material" className="btn btn-primary-custom">
          <Plus size={16} className="me-2" />
          Add Listing
        </Link>

        <Link to="/requests" className="icon-btn" aria-label="View exchange requests">
          <Bell size={18} />
        </Link>

        <Link to="/profile" className="profile-pill">
          <div className="profile-avatar">E</div>
          <div>
            <strong>EcoFlow Enterprise</strong>
            <div className="small text-muted">Industrial Partner</div>
          </div>
          <ChevronDown size={16} color="#45645c" />
        </Link>
      </div>
    </header>
  );
}
