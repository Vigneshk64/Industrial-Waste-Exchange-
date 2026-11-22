import { useEffect, useState } from 'react';
import { ArrowRight, Factory, PackageCheck, XCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import MaterialCard from '../components/MaterialCard';
import { fetchListings, fetchRequests } from '../services/workflow';
import { getDashboardMetrics, getNotifications } from '../services/api';

const emptyMetrics = {
  total_listings: 0,
  pending_requests: 0,
  accepted_requests: 0,
  rejected_requests: 0,
  completed_exchanges: 0,
};

function requestCompany(request) {
  return request.is_incoming
    ? request.buyer_company?.name || request.seeker_name || 'Buyer company'
    : request.supplier_company?.name || request.supplier_name || 'Supplier company';
}

export default function Dashboard() {
  const [materials, setMaterials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(null);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [listingsData, requestsData, metricData, notificationResult] = await Promise.all([
          fetchListings({ mine: true }),
          fetchRequests(),
          getDashboardMetrics(),
          getNotifications().then((data) => ({ data })).catch((error) => ({ error })),
        ]);
        if (!active) return;
        setMaterials(listingsData);
        setRequests(requestsData);
        setMetrics({ ...emptyMetrics, ...metricData });
        if (notificationResult.error) {
          setNotificationError(notificationResult.error.message || 'Unable to load notification count.');
        } else {
          setNotificationUnreadCount(notificationResult.data.unread_count || 0);
        }
      } catch (error) {
        if (active) setLoadError(error.message || 'Unable to load dashboard data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  const stats = [
    { title: 'Active listings', value: metrics.total_listings, change: 'Published', icon: Factory },
    { title: 'Pending buyer requests', value: metrics.pending_requests, change: 'Incoming', icon: PackageCheck, trend: 'down' },
    { title: 'Accepted requests', value: metrics.accepted_requests, change: 'In progress', icon: CheckCircle2 },
    { title: 'Rejected requests', value: metrics.rejected_requests, change: 'Closed', icon: XCircle, trend: 'down' },
    { title: 'Completed exchanges', value: metrics.completed_exchanges, change: 'Recorded', icon: CheckCircle2 },
    { title: 'Unread notifications', value: notificationUnreadCount === null ? '—' : notificationUnreadCount, change: notificationUnreadCount === null ? 'Unavailable' : 'Inbox', icon: PackageCheck },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Company dashboard</h1>
          <p>Track your published materials and exchange requests.</p>
        </div>
        <div className="header-actions">
          <Link to="/add-material" className="btn btn-primary-custom">Publish a listing</Link>
        </div>
      </div>

      {loadError ? <div role="alert" className="inline-message error">{loadError}</div> : null}
      {notificationError ? <div role="alert" className="inline-message error">{notificationError}</div> : null}

      {loading ? (
        <div className="stat-grid" aria-label="Loading dashboard statistics">
          {stats.map((stat) => <div className="stat-card-skeleton" key={stat.title} />)}
        </div>
      ) : !loadError ? (
        <div className="stat-grid">
          {stats.map((stat) => <StatCard key={stat.title} {...stat} value={String(stat.value)} />)}
        </div>
      ) : null}

      <div className="chart-grid mb-4">
        <section className="panel-card">
          <div className="panel-header">
            <h3>Recent material listings</h3>
            <Link to="/materials" className="text-success fw-semibold">View all</Link>
          </div>
          {loading ? <p className="text-muted">Loading listings…</p> : loadError ? null : materials.length ? (
            <div className="material-grid">
              {materials.slice(0, 3).map((material) => (
                <MaterialCard key={material.id} material={{ ...material, is_mine: true }} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>You have not published any material listings yet.</p>
              <Link to="/add-material" className="btn btn-primary-custom btn-sm">Publish a listing</Link>
            </div>
          )}
        </section>

        <section className="panel-card">
          <div className="panel-header">
            <h3>Recent requests</h3>
            <Link to="/requests" className="text-success fw-semibold">Manage requests</Link>
          </div>
          {loading ? <p className="text-muted">Loading requests…</p> : loadError ? null : requests.length ? (
            <div className="data-list">
              {requests.slice(0, 5).map((request) => (
                <div className="list-row" key={request.id}>
                  <div className="list-meta">
                    <strong>{request.material_name || request.listing?.title || 'Material request'}</strong>
                    <span className="text-muted small">
                      {request.is_incoming ? 'Received from' : 'Sent to'} {requestCompany(request)}
                      {' · '}{request.quantity_requested} {request.listing?.unit || ''}
                    </span>
                  </div>
                  <span className={`badge ${String(request.status).toLowerCase() === 'accepted' ? 'success' : 'warning'}`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No exchange requests have been recorded.</p>
              <Link to="/materials" className="btn btn-outline-custom btn-sm">Browse materials</Link>
            </div>
          )}
        </section>
      </div>

      {!loadError ? <section className="panel-card">
        <div className="panel-header">
          <h3>Request activity</h3>
          <Link to="/requests" className="text-success fw-semibold">Open requests <ArrowRight size={14} /></Link>
        </div>
        <div className="chip-list" aria-label="Request activity counts">
          <span className="chip">Pending · {metrics.pending_requests}</span>
          <span className="chip">Accepted · {metrics.accepted_requests}</span>
          <span className="chip">Rejected · {metrics.rejected_requests}</span>
          <span className="chip">Completed · {metrics.completed_exchanges}</span>
        </div>
        <p className="text-muted small mt-3 mb-0">
          Counts reflect requests involving your company. Notification statistics will appear once the notification store is enabled.
        </p>
      </section> : null}
    </div>
  );
}
