import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { advanceRequest, fetchRequests, saveFeedback } from '../services/workflow';

const filters = ['All', 'Pending', 'Accepted', 'In Transit', 'Awaiting confirmation', 'Completed', 'Rejected'];
const statusClasses = {
  Pending: 'warning',
  pending: 'warning',
  Accepted: 'success',
  accepted: 'success',
  'In Transit': 'info',
  in_transit: 'info',
  'Awaiting confirmation': 'warning',
  Completed: 'success',
  completed: 'success',
  Rejected: 'muted',
  rejected: 'muted',
};
const nextAction = {
  Pending: 'Confirm Accept',
  pending: 'Confirm Accept',
  Accepted: 'Confirm Dispatch',
  accepted: 'Confirm Dispatch',
  'In Transit': 'Confirm Delivery',
  in_transit: 'Confirm Delivery',
  'Awaiting confirmation': 'Confirm Completion',
};

export default function ExchangeRequests() {
  const [requests, setRequests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadRequests = async () => {
      try {
        setLoading(true);
        const data = await fetchRequests();
        if (!isActive) return;
        setRequests(data || []);
      } catch (error) {
        if (!isActive) return;
        setMessageType('error');
        setMessage(error.message || 'Unable to load exchange requests.');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadRequests();

    return () => {
      isActive = false;
    };
  }, []);

  const visibleRequests = useMemo(
    () => activeFilter === 'All'
      ? requests
      : requests.filter((request) => (request.status || '').toLowerCase() === activeFilter.toLowerCase()),
    [activeFilter, requests],
  );
  const completedRequests = requests.filter(
    (request) => (request.status || '').toLowerCase() === 'completed'
  );

  const handleAdvance = async (request) => {
    try {
      const updated = await advanceRequest(request.id);
      setRequests((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setMessageType('success');
      setMessage(`Exchange for ${request.material_name || request.material}: status updated to ${updated.status}.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to update this request.');
    }
  };

  const handleFeedbackChange = (id, field, value) => {
    setFeedbackDrafts((current) => ({
      ...current,
      [id]: { rating: '5', comment: '', ...current[id], [field]: value },
    }));
  };

  const handleFeedbackSubmit = async (event, request) => {
    event.preventDefault();
    const draft = feedbackDrafts[request.id] || { rating: '5', comment: '' };
    try {
      const updated = await saveFeedback(request.id, draft.rating, draft.comment);
      setRequests((current) => current.map((item) => (item.id === request.id ? { ...item, ...updated, rating: draft.rating, feedback: draft.comment } : item)));
      setMessageType('success');
      setMessage('Feedback recorded to the completed transaction record.');
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to save feedback.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Exchange Requests</h2>
          <p>Coordinate industrial material transfer, confirm dispatch and receipt, and track circular transactions.</p>
        </div>
      </div>

      {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

      <div className="panel-card mb-4">
        <div className="chip-list">
          {filters.map((filter) => (
            <button
              type="button"
              key={filter}
              className={`chip ${activeFilter === filter ? 'active' : ''}`}
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-card">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Material</th>
                <th>Supplier / Seeker</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted">Loading requests...</td></tr>
              ) : visibleRequests.length ? visibleRequests.map((request) => (
                <React.Fragment key={request.id}>
                  <tr>
                    <td><strong>{request.material_name || request.material}</strong></td>
                    <td>{request.supplier_name || request.supplier} / {request.seeker_name || request.buyer}</td>
                    <td>{request.quantity_requested || request.quantity}</td>
                    <td>{request.date || (request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Today')}</td>
                    <td>{request.price || (request.offered_price ? `₹${request.offered_price}` : 'Negotiable')}</td>
                    <td>
                      <span className={`badge ${statusClasses[request.status] || 'muted'}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>
                      {nextAction[request.status] ? (
                        <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => handleAdvance(request)}>
                          {nextAction[request.status]}
                        </button>
                      ) : (request.status || '').toLowerCase() === 'completed' && !request.rating ? (
                        <span className="text-muted small">Feedback needed</span>
                      ) : (request.status || '').toLowerCase() === 'completed' ? (
                        <span className="text-success small">Completed & Rated</span>
                      ) : <span className="text-muted small">No action</span>}
                    </td>
                  </tr>
                  {(request.status || '').toLowerCase() === 'completed' && !request.rating ? (
                    <tr key={`${request.id}-feedback`}>
                      <td colSpan="7">
                        <form className="feedback-form" onSubmit={(event) => handleFeedbackSubmit(event, request)}>
                          <strong>Rate {request.material_name || request.material} exchange</strong>
                          <div className="feedback-fields">
                            <label>
                              Rating
                              <select
                                className="form-select"
                                value={(feedbackDrafts[request.id] || {}).rating || '5'}
                                onChange={(event) => handleFeedbackChange(request.id, 'rating', event.target.value)}
                              >
                                <option value="5">5 - Excellent (Purity & schedule met)</option>
                                <option value="4">4 - Good</option>
                                <option value="3">3 - Average</option>
                                <option value="2">2 - Below standard</option>
                                <option value="1">1 - Defective batch</option>
                              </select>
                            </label>
                            <label>
                              Quality / Logistics Remarks
                              <input
                                className="form-control"
                                value={(feedbackDrafts[request.id] || {}).comment || ''}
                                onChange={(event) => handleFeedbackChange(request.id, 'comment', event.target.value)}
                                placeholder="Verification feedback for industrial ledger"
                              />
                            </label>
                            <button type="submit" className="btn btn-primary-custom">Save Feedback</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No exchange requests recorded yet.
                    <div className="mt-2">
                      <Link to="/materials" className="btn btn-outline-custom btn-sm">
                        Browse Materials & Request Exchange
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="panel-card mt-4">
        <div className="panel-header">
          <h3>Completed Transaction Ledger</h3>
          <span className="chip">{completedRequests.length} verified completed</span>
        </div>
        {completedRequests.length ? (
          <div className="data-list">
            {completedRequests.map((request) => (
              <div className="list-row" key={request.id}>
                <div className="list-meta">
                  <strong>{request.material_name || request.material}</strong>
                  <span className="text-muted small">
                    {request.supplier_name || request.supplier} → {request.seeker_name || request.buyer} · {request.quantity_requested || request.quantity}
                  </span>
                </div>
                <span className="text-muted small">
                  {request.rating ? `${request.rating}/5 rating • Verified` : 'Awaiting feedback rating'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted mb-0">Completed exchanges, verified weights, and ratings will appear here as transactions complete.</p>
        )}
      </section>
    </div>
  );
}
