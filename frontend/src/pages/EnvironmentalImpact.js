import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const impactSummary = [
  { label: 'Waste diverted', value: '42.6 t' },
  { label: 'Materials reused', value: '31.8 t' },
];

const monthlyTrend = [
  { month: 'Jan', diverted: 8 },
  { month: 'Feb', diverted: 10 },
  { month: 'Mar', diverted: 11 },
  { month: 'Apr', diverted: 14 },
  { month: 'May', diverted: 16 },
  { month: 'Jun', diverted: 17 },
];

export default function EnvironmentalImpact() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Environmental impact</h2>
          <p>Waste diversion and material reuse at a glance.</p>
        </div>
        <button type="button" className="btn btn-primary-custom">Download CSV</button>
      </div>

      <div className="stat-grid mb-4">
        {impactSummary.map((item) => (
          <div key={item.label} className="metric-card stat-card">
            <div>
              <small>{item.label}</small>
              <h3>{item.value}</h3>
            </div>
            <div className="stat-icon">
              <span>↗</span>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-grid mb-4">
        <div className="chart-card">
          <div className="panel-header">
            <h3>Monthly waste diverted</h3>
            <span className="chip">6-month view</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="impactFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#34a86b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34a86b" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9efe9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="diverted"
                  name="Waste diverted"
                  stroke="#1a5a46"
                  fill="url(#impactFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
