import { useState } from 'react';
import { ArrowUpRight, MapPin, Package2, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReportForm from './ReportForm';

export default function MaterialCard({ material, onRequest, onDelete, onAvailabilityChange }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const name = material.name || material.title || 'Material listing';
  const category = material.category || material.category_name || 'Uncategorized';
  const grade = material.grade || material.quality_grade || 'Standard';
  const supplier = material.supplier_company;
  const company = supplier?.name || material.company || material.company_name || 'Supplier details unavailable';
  const status = material.status || material.availability_status || 'Available';
  const quantityLabel = typeof material.quantity === 'number'
    ? `${material.quantity} ${material.unit || 'kg'}`
    : material.quantity;
  const price = material.price ?? material.price_per_unit;
  const statusClass = status === 'Available' || status === 'available' || status === 'active'
    ? 'success'
    : status === 'Pending review' || status === 'pending_review'
      ? 'info'
      : status === 'Reserved' || status === 'booked'
        ? 'warning'
        : 'muted';

  const handleRequest = async (event) => {
    event.preventDefault();
    setRequestError('');
    try {
      await onRequest(material, { quantity, message });
      setShowRequestForm(false);
      setQuantity('');
      setMessage('');
    } catch (error) {
      setRequestError(error.message || 'Unable to send this request.');
    }
  };

  return (
    <article className="material-card">
      {material.images?.[0] ? <img className="listing-photo" src={material.images[0]} alt={`${name} listing`} /> : null}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h4>{name}</h4>
          <div className="meta">
            <span className="meta-badge">{category}</span>
            <span className="meta-badge">{grade}</span>
          </div>
        </div>
        <span className={`badge ${statusClass}`}>
          {status}
        </span>
      </div>

      {material.description ? <p className="listing-description">{material.description}</p> : null}
      <div className="d-flex align-items-center gap-2 text-muted mb-2">
        <MapPin size={15} />
        <span>{material.location}</span>
      </div>

      <div className="d-flex justify-content-between text-muted small mb-2">
        <span className="d-flex align-items-center gap-2"><Package2 size={14} /> {quantityLabel}</span>
        <span className="d-flex align-items-center gap-2"><Tag size={14} /> {price === null || price === undefined ? 'Price on request' : `₹${price} / ${material.unit || 'unit'}`}</span>
      </div>
      {material.available_from ? <p className="text-muted small mb-2">Available from {material.available_from}</p> : null}

      <p className="text-muted small mb-3">Provided by {company}</p>
      {supplier ? (
        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setShowCompany((current) => !current)}>
          {showCompany ? 'Hide company profile' : 'View company profile'}
        </button>
      ) : null}
      {showCompany && supplier ? (
        <div className="listing-details">
          <strong>{supplier.name}</strong>
          <p className="mb-1">{supplier.industry_type || 'Business category not provided'}</p>
          <p className="mb-1">{supplier.location || 'Business location not provided'}</p>
          <p className="mb-1">Platform status: {supplier.account_status || 'Not available'}</p>
          <p className="mb-0">Verification: Not tracked in the current company profile.</p>
        </div>
      ) : null}

      {showDetails ? (
        <div className="listing-details">
          <p>{material.description || 'No additional material details have been provided.'}</p>
          {material.available_from ? <p><strong>Available from:</strong> {material.available_from}</p> : null}
          {material.safety_notes ? <p><strong>Handling:</strong> {material.safety_notes}</p> : null}
          {material.images?.length ? material.images.map((image) => (
            <img key={image} className="listing-photo" src={image} alt={`${name} material`} />
          )) : null}
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
        {material.is_mine ? (
          <>
            <Link to={`/add-material?edit=${encodeURIComponent(material.id)}`} className="btn btn-outline-custom btn-sm">Edit</Link>
            {onAvailabilityChange ? (
              <>
                <label className="visually-hidden" htmlFor={`availability-${material.id}`}>Manage availability for {name}</label>
                <select
                  id={`availability-${material.id}`}
                  className="form-select form-select-sm availability-select"
                  value={material.availability_status || 'available'}
                  onChange={(event) => onAvailabilityChange(material, event.target.value)}
                >
                  <option value="available">Available</option>
                  <option value="booked">Reserved</option>
                  <option value="completed">Completed</option>
                </select>
              </>
            ) : null}
            {onDelete ? <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete(material)}>Delete</button> : null}
          </>
        ) : (status === 'Available' || status === 'available' || status === 'active') ? (
          <button type="button" className="btn btn-primary-custom btn-sm" onClick={() => setShowRequestForm((current) => !current)}>
            Send interest
            <ArrowUpRight size={14} className="ms-2" />
          </button>
        ) : null}
      </div>
      {!material.is_mine && material.id ? <ReportForm targetType="listing" targetId={material.id} targetName={name} /> : null}
      {!material.is_mine && material.provider_id ? <ReportForm targetType="company" targetId={material.provider_id} targetName={company} /> : null}
    </article>
  );
}
