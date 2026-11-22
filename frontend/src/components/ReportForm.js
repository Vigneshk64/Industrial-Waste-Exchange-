import { useState } from 'react';
import { apiFetch } from '../services/api';

const categories = [
  ['misleading_listing', 'Misleading information'],
  ['unsafe_material', 'Unsafe material'],
  ['fraudulent_company', 'Fraudulent company'],
  ['duplicate_listing', 'Duplicate listing'],
  ['prohibited_material', 'Prohibited material'],
  ['other', 'Other'],
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ReportForm({ targetType, targetId, targetName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('misleading_listing');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!uuidPattern.test(String(targetId || ''))) return null;

  const submitReport = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          target_type: targetType,
          ...(targetType === 'listing' ? { listing_id: targetId } : { company_id: targetId }),
          category,
          reason,
          description,
        }),
      });
      setSubmitted(true);
      setIsOpen(false);
      setReason('');
      setDescription('');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit this report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-control">
      {submitted ? (
        <span className="small text-success">Report submitted</span>
      ) : (
        <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setIsOpen((open) => !open)}>
          Report {targetType === 'listing' ? 'listing' : 'company'}
        </button>
      )}
      {isOpen ? (
        <form className="report-form" onSubmit={submitReport}>
          <strong>Report {targetName || (targetType === 'listing' ? 'listing' : 'company')}</strong>
          <label className="form-label mt-2">Category</label>
          <select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="form-label mt-2">Reason</label>
          <input
            className="form-control"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            minLength={5}
            required
          />
          <label className="form-label mt-2">Description</label>
          <textarea
            className="form-control"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            minLength={10}
            maxLength={2000}
            rows={3}
            required
          />
          {error ? <div className="inline-message error mt-2">{error}</div> : null}
          <div className="material-actions mt-2">
            <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary-custom btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
