import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';

export default function MatchCard({ match }) {
  return (
    <article className="match-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4>{match.material}</h4>
          <div className="text-muted small">{match.company}</div>
        </div>
        <div className="text-end">
          <div className="fw-bold" style={{ fontSize: '1.5rem', color: '#154f47' }}>{match.score}%</div>
          <small className="text-muted">Match score</small>
        </div>
      </div>

      <div className="meta">
        <span className="meta-badge">{match.category}</span>
        <span className="meta-badge">{match.quantity}</span>
        <span className="meta-badge">{match.grade}</span>
      </div>

      <div className="d-flex align-items-center gap-2 text-muted small mb-2">
        <MapPin size={14} />
        {match.location}
      </div>

      <div className="progress-wrap"><div className="progress-bar" style={{ width: `${match.score}%` }} /></div>

      <p className="text-muted small mt-3 mb-3">{match.reason}</p>

      <div className="match-actions">
        <button type="button" className="btn btn-outline-custom btn-sm">View Details</button>
        <button type="button" className="btn btn-primary-custom btn-sm">
          Send Request
          <ArrowRight size={14} className="ms-2" />
        </button>
      </div>

      <div className="mt-3 small text-success d-flex align-items-center gap-2">
        <ShieldCheck size={14} />
        {match.distance}
      </div>
    </article>
  );
}
