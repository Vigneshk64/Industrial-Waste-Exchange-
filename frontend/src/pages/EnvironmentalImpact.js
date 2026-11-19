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
import { fetchRequests } from '../services/workflow';
import { getImpactMetrics } from '../services/api';

export default function EnvironmentalImpact() {
  const [impactData, setImpactData] = useState({
    total_diverted_tonnes: '0.00',
    materials_reused_kg: '0.0',
    co2_avoided_tonnes: '0.00',
  });

  useEffect(() => {
    async function loadImpact() {
      try {
        const metrics = await getImpactMetrics();
        if (metrics && metrics.total_diverted_tonnes) {
          setImpactData(metrics);
          return;
        }
      } catch {}

      // Fallback: derive from completed requests
      try {
        const requests = await fetchRequests();
        const completed = (requests || []).filter(r => (r.status || '').toLowerCase() === 'completed');
        const kg = completed.reduce((sum, r) => sum + (parseFloat(r.quantity_requested || r.quantity) || 0), 0);
        const tonnes = kg / 1000;
        setImpactData({
          total_diverted_tonnes: tonnes.toFixed(2),
          materials_reused_kg: kg.toFixed(1),
          co2_avoided_tonnes: (tonnes * 1.85).toFixed(2),
        });
      } catch (err) {
        console.error(err);
      }
    }

    loadImpact();
  }, []);

  const impactSummary = [
    { label: 'Landfill Waste Diverted', value: `${impactData.total_diverted_tonnes} t`, icon: '♻️' },
    { label: 'Secondary Materials Reused', value: `${impactData.materials_reused_kg} kg`, icon: '🔄' },
    { label: 'GHG Emissions Avoided', value: `${impactData.co2_avoided_tonnes} tCO₂e`, icon: '🌱' },
  ];

  const trendData = [
    { checkpoint: 'Baseline', diverted: 0 },
    { checkpoint: 'Cumulative', diverted: parseFloat(impactData.total_diverted_tonnes) || 0 },
  ];

  const handleDownloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Metric,Value,Unit\n"
      + `Waste Diverted,${impactData.total_diverted_tonnes},Tonnes\n`
      + `Materials Reused,${impactData.materials_reused_kg},Kg\n`
      + `CO2 Avoided,${impactData.co2_avoided_tonnes},tCO2e\n`
      + "Framework,SDG 9 & SDG 12,UN Sustainability\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "waste_exchange_impact_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Environmental Impact & Sustainability</h2>
          <p>Verified lifecycle metrics contributing to UN Sustainable Development Goals (SDG 9 & SDG 12).</p>
        </div>
        <button type="button" className="btn btn-primary-custom" onClick={handleDownloadCSV}>
          Download Impact CSV
        </button>
      </div>

      <div className="stat-grid mb-4">
        {impactSummary.map((item) => (
          <div key={item.label} className="metric-card stat-card">
            <div>
              <small>{item.label}</small>
              <h3>{item.value}</h3>
            </div>
            <div className="stat-icon" style={{ fontSize: '1.25rem' }}>
              <span>{item.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-grid mb-4">
        <div className="chart-card">
          <div className="panel-header">
            <h3>Cumulative Waste Diversion Trend</h3>
            <span className="chip">Measured in Tonnes</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="impactFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#34a86b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34a86b" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9efe9" />
                <XAxis dataKey="checkpoint" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="diverted"
                  name="Waste diverted (t)"
                  stroke="#1a5a46"
                  fill="url(#impactFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>UN Sustainable Development Goals Alignment</h3>
            <span className="chip">Global Benchmarks</span>
          </div>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>SDG 9: Industry, Innovation, and Infrastructure</strong>
                <div className="text-muted small mt-1">
                  Target 9.4: Upgrade infrastructure and retrofit industries to make them sustainable, with increased resource-use efficiency and greater adoption of clean and environmentally sound circular technologies.
                </div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <strong>SDG 12: Responsible Consumption and Production</strong>
                <div className="text-muted small mt-1">
                  Target 12.5: By 2030, substantially reduce waste generation through prevention, reduction, recycling, and secondary material reuse across industrial supply chains.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
