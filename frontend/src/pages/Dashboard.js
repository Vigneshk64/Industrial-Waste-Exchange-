import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, BarChart3, Factory, PackageCheck, Recycle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import MaterialCard from '../components/MaterialCard';
import MatchCard from '../components/MatchCard';

const stats = [
  { title: 'Total material listings', value: '486', change: '+12.4%', trend: 'up', icon: Factory, subtitle: 'Compared to last month' },
  { title: 'Active material matches', value: '128', change: '+8.1%', trend: 'up', icon: Recycle, subtitle: 'Across 9 regions' },
  { title: 'Pending requests', value: '34', change: '-4.2%', trend: 'down', icon: PackageCheck, subtitle: 'Lower than expected' },
  { title: 'Completed exchanges', value: '186', change: '+16.8%', trend: 'up', icon: TrendingUp, subtitle: 'This quarter' },
  { title: 'Waste reused', value: '42.6 t', change: '+9.7%', trend: 'up', icon: Recycle, subtitle: 'Waste diverted' },
  { title: 'Cost savings', value: '₹3.8L', change: '+14.2%', trend: 'up', icon: BarChart3, subtitle: 'Estimated value' },
];

const monthlyWaste = [
  { month: 'Jan', value: 14 },
  { month: 'Feb', value: 20 },
  { month: 'Mar', value: 18 },
  { month: 'Apr', value: 27 },
  { month: 'May', value: 22 },
  { month: 'Jun', value: 31 },
  { month: 'Jul', value: 38 },
];

const categoryData = [
  { name: 'Plastics', value: 32 },
  { name: 'Metals', value: 28 },
  { name: 'Organic', value: 18 },
  { name: 'Ash', value: 14 },
  { name: 'Textiles', value: 8 },
];

const activityData = [
  { name: 'Mon', requests: 12, matches: 18 },
  { name: 'Tue', requests: 16, matches: 22 },
  { name: 'Wed', requests: 14, matches: 19 },
  { name: 'Thu', requests: 18, matches: 24 },
  { name: 'Fri', requests: 20, matches: 29 },
  { name: 'Sat', requests: 15, matches: 21 },
  { name: 'Sun', requests: 11, matches: 17 },
];

const materials = [
  { name: 'HDPE Scrap', category: 'Plastic', quantity: '320 kg', location: 'Pune, MH', grade: 'Grade A', company: 'EcoFlow Industries', status: 'Available', price: '48/kg' },
  { name: 'Aluminium Offcuts', category: 'Metal', quantity: '1.2 t', location: 'Vapi, GJ', grade: 'Recycled', company: 'SteelCore Ltd.', status: 'Reserved', price: '145/kg' },
  { name: 'Fly Ash', category: 'Ash', quantity: '800 kg', location: 'Nagpur, MH', grade: 'Industrial', company: 'GreenCem Materials', status: 'Available', price: '22/kg' },
];

const requests = [
  { material: 'Reinforced Plastic Pellets', company: 'GreenWave Manufacturing', status: 'Pending', amount: '250 kg', date: '12 Jun 2026' },
  { material: 'Copper Scrap', company: 'Metro Components', status: 'Accepted', amount: '600 kg', date: '10 Jun 2026' },
  { material: 'Organic Compost Feed', company: 'AgriCycle', status: 'In Transit', amount: '1.1 t', date: '07 Jun 2026' },
];

const matches = [
  { material: 'Polypropylene Pellets', company: 'IndoPlast Ltd.', category: 'Plastic', quantity: '400 kg', grade: 'Food grade', location: 'Pune, MH', score: 92, reason: 'Strong quality match and close pickup distance.', distance: '18 km away' },
  { material: 'Steel Turnings', company: 'MetalMax Works', category: 'Metal', quantity: '1.8 t', grade: 'Grade B', location: 'Nashik, MH', score: 88, reason: 'Better price alignment and suitable volume band.', distance: '64 km away' },
  { material: 'Wood Fiber Blend', company: 'EarthNest Bio', category: 'Organic', quantity: '900 kg', grade: 'Processed', location: 'Aurangabad, MH', score: 84, reason: 'Compatible with composting operations and fast dispatch.', distance: '71 km away' },
];

const COLORS = ['#1b5d4b', '#34a86b', '#7ccaa2', '#d8eedc', '#eff6f1'];

export default function Dashboard() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Industrial Waste Exchange</h1>
          <p>Welcome back, Priya. Here is a snapshot of your exchange ecosystem.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary-custom">View reports</button>
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
            <h3>Monthly waste reused</h3>
            <span className="chip">Last 7 months</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={monthlyWaste}>
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

        <div className="chart-card">
          <div className="panel-header">
            <h3>Material category</h3>
            <span className="chip">Share of listings</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-grid mb-4">
        <div className="chart-card">
          <div className="panel-header">
            <h3>Exchange activity</h3>
            <span className="chip">Weekly overview</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9efe9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="requests" fill="#1a5a46" radius={[8, 8, 0, 0]} />
                <Bar dataKey="matches" fill="#67b98a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Environmental impact summary</h3>
            <span className="chip">Quarterly</span>
          </div>

          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>Waste diverted</strong>
                <div className="text-muted">42.6 tonnes from landfill pathways</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>Materials reused</strong>
                <div className="text-muted">1,840 kg repurposed across trading partners</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>CO₂ avoided</strong>
                <div className="text-muted">Estimated reduction: 8.4 tCO₂e</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-grid mb-4">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Recent material listings</h3>
            <Link to="/materials" className="text-success fw-semibold">Browse all</Link>
          </div>
          <div className="material-grid">
            {materials.map((material) => (
              <MaterialCard key={material.name} material={material} />
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Recent exchange requests</h3>
            <Link to="/requests" className="text-success fw-semibold">Open queue</Link>
          </div>
          <div className="data-list">
            {requests.map((request) => (
              <div key={request.material} className="list-row">
                <div className="list-meta">
                  <strong>{request.material}</strong>
                  <span className="text-muted small">{request.company}</span>
                </div>
                <div className="text-end">
                  <span className={`badge ${request.status === 'Accepted' ? 'success' : request.status === 'Pending' ? 'warning' : 'info'}`}>{request.status}</span>
                  <div className="text-muted small mt-1">{request.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-card mb-4">
        <div className="panel-header">
          <h3>Recommended material matches</h3>
          <Link to="/matches" className="btn btn-outline-custom btn-sm">View all matches</Link>
        </div>
        <div className="matches-grid">
          {matches.map((match) => (
            <MatchCard key={match.material} match={match} />
          ))}
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <h3>Quick actions</h3>
        </div>
        <div className="chip-list">
          <Link className="chip" to="/add-material">Add Material <ArrowRight size={14} className="ms-1" /></Link>
          <Link className="chip" to="/materials">Browse Materials</Link>
          <Link className="chip" to="/matches">View Matches</Link>
          <Link className="chip" to="/impact">View Reports</Link>
        </div>
      </div>
    </div>
  );
}
