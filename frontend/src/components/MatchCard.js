import { useState } from 'react';
import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';

export default function MatchCard({ match, onRequest }) {
  const matchId = match.id || match.material.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [requestOpen, setRequestOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    try {
      onRequest(match, { quantity, message });
      setRequestOpen(false);
      setQuantity('');
      setMessage('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to send this request.');
    }
  };

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

      {detailsOpen ? <p className="text-muted small mt-3 mb-3">{match.reason}</p> : null}

      {requestOpen ? (
        <form className="listing-request-form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor={`match-quantity-${match.id}`}>Quantity needed</label>
          <input
            id={`match-quantity-${matchId}`}
            className="form-control"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Enter quantity and unit"
            required
          />
          <label className="form-label mt-3" htmlFor={`match-message-${match.id}`}>Message to provider</label>
          <textarea
            id={`match-message-${matchId}`}
            className="form-control"
            rows="2"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share your requirements or proposed terms"
          />
          {error ? <div className="inline-message error mt-3">{error}</div> : null}
          <div className="match-actions">
            <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setRequestOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary-custom btn-sm">Send interest</button>
          </div>
        </form>
      ) : null}

      <div className="match-actions">
        <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setDetailsOpen((current) => !current)}>
          {detailsOpen ? 'Hide Details' : 'View Details'}
        </button>
        <button type="button" className="btn btn-primary-custom btn-sm" onClick={() => setRequestOpen((current) => !current)}>
          Send interest
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
