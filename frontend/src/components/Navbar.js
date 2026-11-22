import { useEffect, useRef, useState } from 'react';
import { Bell, Bot, ChevronDown, HelpCircle, Menu, Plus, Search, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUserProfile } from '../services/authProfile';
import { getNotifications, markNotificationRead } from '../services/api';
import { isSupabaseConfigured, supabase } from '../services/supabase';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 1).toUpperCase() || 'P';
}

export default function Navbar({ onOpenChat, onOpenHelp, onToggleNavigation, isNavigationOpen }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [userProfile, setUserProfile] = useState({
    name: 'Industrial Partner',
    contact: 'Operations Lead',
    role: 'Partner',
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCompanyId, setNotificationCompanyId] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [toast, setToast] = useState('');
  const knownNotificationIds = useRef(new Set());

  useEffect(() => {
    let isActive = true;

    async function loadNavProfile() {
      const profile = await getCurrentUserProfile();
      if (isActive && profile) setUserProfile(profile);
    }

    loadNavProfile();

    const handleProfileUpdate = () => {
      loadNavProfile();
    };

    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => {
      isActive = false;
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let channel;
    let toastTimer;

    const refreshNotifications = async (announceNew = false) => {
      try {
        const result = await getNotifications();
        if (!active) return;
        const received = result.notifications || [];
        if (announceNew) {
          const newlyReceived = received.find((item) => !knownNotificationIds.current.has(item.id));
          if (newlyReceived) {
            setToast(`${newlyReceived.buyer_company_name} expressed interest in your ${newlyReceived.material_name} listing.`);
            window.clearTimeout(toastTimer);
            toastTimer = window.setTimeout(() => setToast(''), 6000);
          }
        }
        knownNotificationIds.current = new Set(received.map((item) => item.id));
        setNotifications(received);
        setUnreadCount(result.unread_count || 0);
        setNotificationCompanyId(result.recipient_company_id || '');
        setNotificationError('');
      } catch (error) {
        if (active) setNotificationError(error.message || 'Unable to load notifications.');
      }
    };

    refreshNotifications().then(() => {
      if (!active || !isSupabaseConfigured || !supabase || !notificationCompanyId) return;
      channel = supabase.channel(`company-notifications-${notificationCompanyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_company_id=eq.${notificationCompanyId}`,
        }, () => refreshNotifications(true))
        .subscribe((status) => {
          if (active && status === 'CHANNEL_ERROR') {
            setNotificationError('Live notifications are unavailable. The list will refresh when reopened.');
          }
        });
    });

    return () => {
      active = false;
      window.clearTimeout(toastTimer);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [notificationCompanyId]);

  const handleNotificationPanel = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      getNotifications()
        .then((result) => {
          setNotifications(result.notifications || []);
          setUnreadCount(result.unread_count || 0);
          setNotificationCompanyId(result.recipient_company_id || '');
          setNotificationError('');
        })
        .catch((error) => setNotificationError(error.message || 'Unable to load notifications.'));
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read_at) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (error) {
        setNotificationError(error.message || 'Unable to mark notification as read.');
        return;
      }
    }
    navigate(`/requests?request=${encodeURIComponent(notification.request_id)}`);
    setNotificationsOpen(false);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/materials?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn navigation-toggle"
        id="navigation-toggle"
        aria-label={isNavigationOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isNavigationOpen}
        aria-controls="company-navigation"
        onClick={onToggleNavigation}
      >
        {isNavigationOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
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

        <button type="button" className="icon-btn notification-trigger" aria-label={`Notifications, ${unreadCount} unread`}
          aria-expanded={notificationsOpen} onClick={handleNotificationPanel}>
          <Bell size={18} />
          {unreadCount > 0 ? <span className="notification-count">{unreadCount}</span> : null}
        </button>

        <Link to="/profile" className="profile-pill">
          <div className="profile-avatar">{getInitials(userProfile.name)}</div>
          <div className="profile-copy">
            <strong>{userProfile.name}</strong>
            <div className="small text-muted">{userProfile.contact || userProfile.role}</div>
          </div>
          <ChevronDown size={16} color="#45645c" />
        </Link>
      </div>
      {notificationsOpen ? (
        <section className="notification-panel" aria-label="Notifications">
          <div className="panel-header">
            <h3>Notifications</h3>
            <span className="badge info">{unreadCount} unread</span>
          </div>
          {notificationError ? <div role="alert" className="inline-message error">{notificationError}</div> : null}
          {!notificationError && !notifications.length ? <p className="text-muted mb-0">No notifications yet.</p> : null}
          <div className="notification-list">
            {notifications.map((notification) => (
              <article className={`notification-item ${notification.read_at ? '' : 'unread'}`} key={notification.id}>
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <strong>{notification.title}</strong>
                  <span className={`badge ${notification.read_at ? 'muted' : 'info'}`}>{notification.read_at ? 'Read' : 'Unread'}</span>
                </div>
                <p>{notification.message || `${notification.buyer_company_name} has expressed interest in your ${notification.material_name} listing.`}</p>
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <time className="text-muted small date-time" dateTime={notification.created_at}>
                    {new Date(notification.created_at).toLocaleString()}
                  </time>
                  <button type="button" className="btn btn-link btn-sm" onClick={() => handleNotificationClick(notification)}>View request</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {toast ? <div role="status" className="notification-toast"><strong>New request received</strong><span>{toast}</span></div> : null}
    </header>
  );
}
