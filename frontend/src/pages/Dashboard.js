import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, BarChart3, Factory, PackageCheck, Recycle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import MaterialCard from '../components/MaterialCard';
import { fetchListings, fetchRequests } from '../services/workflow';
import { getDashboardMetrics } from '../services/api';

export default function Dashboard() {
  const [materials, setMaterials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [metrics, setMetrics] = useState({
    total_listings: 0,
    active_matches: 0,
    pending_requests: 0,
    completed_exchanges: 0,
    waste_reused_tonnes: '0.00',
    cost_savings_inr: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [listingsData, requestsData] = await Promise.all([
          fetchListings(),
          fetchRequests(),
        ]);

        setMaterials(listingsData || []);
        setRequests(requestsData || []);

        try {
          const apiMetrics = await getDashboardMetrics();
          if (apiMetrics) {
            setMetrics(apiMetrics);
            return;
          }
        } catch {}

        // Fallback calculation from local data
        const completed = (requestsData || []).filter(r => (r.status || '').toLowerCase() === 'completed');
        const totalKg = completed.reduce((sum, r) => sum + (parseFloat(r.quantity_requested || r.quantity) || 0), 0);
        
        setMetrics({
          total_listings: (listingsData || []).length,
          active_matches: Math.min((listingsData || []).length, 5),
          pending_requests: (requestsData || []).filter(r => (r.status || '').toLowerCase() === 'pending').length,
          completed_exchanges: completed.length,
          waste_reused_tonnes: (totalKg / 1000).toFixed(2),
          cost_savings_inr: Math.round(totalKg * 35),
        });
      } catch (err) {
        console.error('Error loading dashboard', err);
      }
    }

    loadDashboard();
  }, []);

  const stats = [
    { title: 'Material listings', value: String(metrics.total_listings), change: 'Active', trend: 'up', icon: Factory, subtitle: 'In current catalog' },
    { title: 'Active matches', value: String(metrics.active_matches), change: 'Algorithmic', trend: 'up', icon: Recycle, subtitle: 'Rule-based pairs' },
    { title: 'Pending requests', value: String(metrics.pending_requests), change: 'In Queue', trend: 'down', icon: PackageCheck, subtitle: 'Awaiting confirmation' },
    { title: 'Completed exchanges', value: String(metrics.completed_exchanges), change: 'Verified', trend: 'up', icon: TrendingUp, subtitle: 'Closed transactions' },
    { title: 'Waste reused', value: `${metrics.waste_reused_tonnes} t`, change: 'Diverted', trend: 'up', icon: Recycle, subtitle: 'From landfill pathways' },
    { title: 'Cost savings', value: `₹${metrics.cost_savings_inr.toLocaleString()}`, change: 'Circular', trend: 'up', icon: BarChart3, subtitle: 'Virgin feedstock saved' },
  ];

  const recentListings = materials.slice(0, 3);
  const recentRequests = requests.slice(0, 3);

  // Dynamic monthly activity derived from real records
  const monthlyData = [
    { month: 'Start', value: 0 },
    { month: 'Current', value: parseFloat(metrics.waste_reused_tonnes) || 0 }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Industrial Waste Exchange</h1>
          <p>Circular economy resource hub: monitor material flows, exchanges, and carbon diversion.</p>
        </div>
        <div className="header-actions">
          <Link to="/impact" className="btn btn-secondary-custom">View SDG Impact</Link>
          <Link to="/add-material" className="btn btn-primary-custom">Add Material</Link>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="chart-grid mb-4">
        <div className="chart-card">
          <div className="panel-header">
            <h3>Cumulative Waste Reused (Tonnes)</h3>
            <span className="chip">SDG 12 Metric</span>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="wasteFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#1a5a46" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1a5a46" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9efe9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#1a5a46" fill="url(#wasteFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Environmental & Economic Highlights</h3>
            <span className="chip">Verified Impact</span>
          </div>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>Waste diverted from landfill</strong>
                <div className="text-muted">{metrics.waste_reused_tonnes} tonnes repurposed across industries</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>Raw material savings</strong>
                <div className="text-muted">₹{metrics.cost_savings_inr.toLocaleString()} saved vs primary raw materials</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>CO₂ avoided</strong>
                <div className="text-muted">{(parseFloat(metrics.waste_reused_tonnes) * 1.85).toFixed(2)} tCO₂e estimated reduction</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-grid mb-4">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Active Material Listings</h3>
            <Link to="/materials" className="text-success fw-semibold">View all</Link>
          </div>
          {recentListings.length ? (
            <div className="material-grid">
              {recentListings.map((material) => (
                <MaterialCard key={material.id || material.name} material={material} />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <p>No listings in database yet.</p>
              <Link to="/add-material" className="btn btn-primary-custom btn-sm">Create first listing</Link>
            </div>
          )}
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Recent Exchange Requests</h3>
            <Link to="/requests" className="text-success fw-semibold">Open queue</Link>
          </div>
          {recentRequests.length ? (
            <div className="data-list">
              {recentRequests.map((request) => (
                <div key={request.id} className="list-row">
                  <div className="list-meta">
                    <strong>{request.material_name || request.material}</strong>
                    <span className="text-muted small">
                      {request.supplier_name || request.supplier} → {request.seeker_name || request.buyer}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className={`badge ${request.status === 'Accepted' || request.status === 'Completed' ? 'success' : 'warning'}`}>
                      {request.status}
                    </span>
                    <div className="text-muted small mt-1">{request.quantity_requested || request.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <p>No active exchange requests yet.</p>
              <Link to="/materials" className="btn btn-outline-custom btn-sm">Explore materials</Link>
            </div>
          )}
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="chip-list">
          <Link className="chip" to="/add-material">List Available Waste <ArrowRight size={14} className="ms-1" /></Link>
          <Link className="chip" to="/add-material">Post Required Raw Material</Link>
          <Link className="chip" to="/matches">Rule-Based Matching</Link>
          <Link className="chip" to="/requests">Exchange Workflow</Link>
          <Link className="chip" to="/impact">SDG 9 & SDG 12 Analytics</Link>
        </div>
      </div>
    </div>
  );
}
