import { ArrowUpRight, MapPin, Package2, Tag } from 'lucide-react';

export default function MaterialCard({ material }) {
  return (
    <article className="material-card">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h4>{material.name}</h4>
          <div className="meta">
            <span className="meta-badge">{material.category}</span>
            <span className="meta-badge">{material.grade}</span>
          </div>
        </div>
        <span className={`badge ${material.status === 'Available' ? 'success' : material.status === 'Reserved' ? 'warning' : 'muted'}`}>
          {material.status}
        </span>
      </div>

      <div className="d-flex align-items-center gap-2 text-muted mb-2">
        <MapPin size={15} />
        <span>{material.location}</span>
      </div>

      <div className="d-flex justify-content-between text-muted small mb-2">
        <span className="d-flex align-items-center gap-2"><Package2 size={14} /> {material.quantity}</span>
        <span className="d-flex align-items-center gap-2"><Tag size={14} /> ₹{material.price}</span>
      </div>

      <p className="text-muted small mb-3">{material.company}</p>

      <div className="material-actions">
        <button type="button" className="btn btn-outline-custom btn-sm">View Details</button>
        <button type="button" className="btn btn-primary-custom btn-sm">
          Request Material
          <ArrowUpRight size={14} className="ms-2" />
        </button>
      </div>
    </article>
  );
}
