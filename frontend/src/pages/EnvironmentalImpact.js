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

const impactSummary = [
  { label: 'Waste diverted', value: '42.6 t' },
  { label: 'Materials reused', value: '31.8 t' },
  { label: 'CO₂ avoided', value: '8.4 tCO₂e' },
  { label: 'Cost savings', value: '₹3.8L' },
];

const monthlyTrend = [
  { month: 'Jan', diverted: 8, reused: 6 },
  { month: 'Feb', diverted: 10, reused: 7 },
  { month: 'Mar', diverted: 11, reused: 9 },
  { month: 'Apr', diverted: 14, reused: 10 },
  { month: 'May', diverted: 16, reused: 12 },
  { month: 'Jun', diverted: 17, reused: 14 },
];

const categoryReuse = [
  { name: 'Plastic', value: 32 },
  { name: 'Metal', value: 27 },
  { name: 'Organic', value: 20 },
  { name: 'Ash', value: 13 },
  { name: 'Textile', value: 8 },
];

const COLORS = ['#1b5d4b', '#34a86b', '#7ccaa2', '#d8eedc', '#eff6f1'];

export default function EnvironmentalImpact() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Environmental impact</h2>
          <p>Track sustainability outcomes using estimated, clearly labeled impact figures.</p>
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
            <h3>Monthly diversion trend</h3>
            <span className="chip">12-month view</span>
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
                <Area type="monotone" dataKey="diverted" stroke="#1a5a46" fill="url(#impactFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="panel-header">
            <h3>Material categories reused</h3>
            <span className="chip">Share of reuse</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryReuse} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4}>
                  {categoryReuse.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="panel-header">
          <h3>Annual impact by category</h3>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9efe9" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="reused" fill="#34a86b" radius={[8, 8, 0, 0]} />
              <Bar dataKey="diverted" fill="#1a5a46" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
