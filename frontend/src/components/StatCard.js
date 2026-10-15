import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatCard({ title, value, change, trend = 'up', icon: Icon, subtitle }) {
  return (
    <div className="metric-card stat-card">
      <div className="stat-copy">
        <small>{title}</small>
        <h3>{value}</h3>
        <span className={`stat-trend ${trend === 'up' ? 'positive' : 'negative'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
        {subtitle ? <small className="d-block mt-2 text-muted">{subtitle}</small> : null}
      </div>
      {Icon ? (
        <div className="stat-icon">
          <Icon size={22} />
        </div>
      ) : null}
    </div>
  );
}
