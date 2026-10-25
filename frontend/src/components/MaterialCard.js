import { useState } from 'react';
import { ArrowUpRight, MapPin, Package2, Tag } from 'lucide-react';

export default function MaterialCard({ material, onRequest, onApprove }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const statusClass = material.status === 'Available'
    ? 'success'
    : material.status === 'Pending review'
      ? 'info'
      : material.status === 'Reserved'
        ? 'warning'
        : 'muted';

  const handleRequest = (event) => {
    event.preventDefault();
    setRequestError('');
    try {
      onRequest(material, { quantity, message });
      setShowRequestForm(false);
      setQuantity('');
      setMessage('');
    } catch (error) {
      setRequestError(error.message || 'Unable to send this request.');
    }
  };

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
        <span className={`badge ${statusClass}`}>
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

      <p className="text-muted small mb-3">Provided by {material.company}</p>

      {showDetails ? (
        <div className="listing-details">
          <p>{material.description || 'No additional material details have been provided.'}</p>
          {material.pickup ? <p><strong>Collection:</strong> {material.pickup}</p> : null}
          {material.date ? <p><strong>Available from:</strong> {material.date}</p> : null}
          {material.notes ? <p><strong>Handling:</strong> {material.notes}</p> : null}
          {material.imageName ? <p><strong>Image:</strong> {material.imageName}</p> : null}
        </div>
      ) : null}

      {showRequestForm ? (
        <form className="listing-request-form" onSubmit={handleRequest}>
          <label className="form-label" htmlFor={`quantity-${material.id}`}>Quantity needed</label>
          <input
            id={`quantity-${material.id}`}
            className="form-control"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={`e.g. 100 ${material.unit || 'kg'}`}
            required
          />
          <label className="form-label mt-3" htmlFor={`message-${material.id}`}>Message to provider</label>
          <textarea
            id={`message-${material.id}`}
            className="form-control"
            rows="2"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share your requirements or proposed terms"
          />
          {requestError ? <div className="inline-message error mt-3">{requestError}</div> : null}
          <div className="material-actions">
            <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowRequestForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary-custom btn-sm">Send interest</button>
          </div>
        </form>
      ) : null}

      <div className="material-actions">
        <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setShowDetails((current) => !current)}>
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
        {material.status === 'Pending review' ? (
          <button type="button" className="btn btn-primary-custom btn-sm" onClick={() => onApprove(material)}>
            Approve &amp; publish
          </button>
        ) : material.status === 'Available' ? (
          <button type="button" className="btn btn-primary-custom btn-sm" onClick={() => setShowRequestForm((current) => !current)}>
            Send interest
            <ArrowUpRight size={14} className="ms-2" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
