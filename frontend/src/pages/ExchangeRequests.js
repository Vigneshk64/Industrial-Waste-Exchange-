import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { advanceRequest, fetchRequests, saveFeedback } from '../services/workflow';
import { getRequestHistory, respondToRequest, updateRequestStatus } from '../services/api';

const filters = ['All', 'Pending', 'Accepted', 'In Transit', 'Completed', 'Rejected'];
const statusClasses = {
  Pending: 'warning',
  pending: 'warning',
  Accepted: 'success',
  accepted: 'success',
  'In Transit': 'info',
  in_transit: 'info',
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
};

export default function ExchangeRequests() {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [direction, setDirection] = useState('incoming');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [supplierResponse, setSupplierResponse] = useState('');
  const [statusHistory, setStatusHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
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

  useEffect(() => {
    const requestId = searchParams.get('request');
    if (!requestId) return;
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;
    setDirection(request.is_incoming ? 'incoming' : 'outgoing');
    setSelectedRequest(request);
    setSupplierResponse(request.supplier_response || '');
  }, [requests, searchParams]);

  const visibleRequests = useMemo(() => requests
    .filter((request) => direction === 'incoming' ? request.is_incoming : !request.is_incoming)
    .filter((request) => activeFilter === 'All'
      || (request.status || '').toLowerCase() === activeFilter.toLowerCase().replace(' ', '_')),
  [activeFilter, direction, requests]);
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

  const handleStatusChange = async (request, status) => {
    try {
      const updated = await updateRequestStatus(request.id, status);
      setRequests((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setMessageType('success');
      setMessage(`Request ${status}.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || `Unable to ${status} this request.`);
    }
  };

  const handleSupplierResponse = async (event) => {
    event.preventDefault();
    try {
      const updated = await respondToRequest(selectedRequest.id, supplierResponse);
      setRequests((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setSelectedRequest((current) => ({ ...current, ...updated }));
      setMessageType('success');
      setMessage('Response sent to the buyer.');
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to send a response.');
    }
  };

  useEffect(() => {
    if (!selectedRequest) return undefined;
    let active = true;
    setStatusHistory([]);
    setHistoryError('');
    getRequestHistory(selectedRequest.id)
      .then((history) => { if (active) setStatusHistory(history); })
      .catch((error) => { if (active) setHistoryError(error.message || 'Unable to load request history.'); });
    return () => { active = false; };
  }, [selectedRequest?.id]);

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
          <p>Review incoming buyer interest and track the requests your company has sent.</p>
        </div>
      </div>

      {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

      <div className="panel-card mb-4">
        <div className="chip-list mb-3" role="tablist" aria-label="Request direction">
          {['incoming', 'outgoing'].map((tab) => (
            <button type="button" role="tab" aria-selected={direction === tab} key={tab}
              className={`chip ${direction === tab ? 'active' : ''}`}
              onClick={() => { setDirection(tab); setActiveFilter('All'); }}>
              {tab === 'incoming' ? 'Incoming Requests' : 'Outgoing Requests'}
            </button>
          ))}
        </div>
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
          <table className="table align-middle requests-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>{direction === 'incoming' ? 'Buyer company' : 'Supplier company'}</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Offer</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-4 text-muted">Loading requests...</td></tr>
              ) : visibleRequests.length ? visibleRequests.map((request) => (
                <React.Fragment key={request.id}>
                  <tr className="request-table-row">
                    <td data-label="Material"><strong>{request.material_name || request.listing?.title || request.material}</strong></td>
                    <td data-label={direction === 'incoming' ? 'Buyer company' : 'Supplier company'}>{direction === 'incoming'
                      ? request.buyer_company?.name || request.seeker_name
                      : <>{request.supplier_company?.name || request.supplier_name}
                        {request.supplier_response ? <div className="text-muted small">Response: {request.supplier_response}</div> : null}
                      </>}</td>
                    <td data-label="Quantity">{request.quantity_requested} {request.listing?.unit || ''}</td>
                    <td data-label="Date">{request.created_at ? new Date(request.created_at).toLocaleDateString() : '—'}</td>
                    <td data-label="Offer">{request.offered_price ? `₹${request.offered_price}` : 'Not specified'}</td>
                    <td data-label="Status">
                      <span className={`badge ${statusClasses[request.status] || statusClasses[String(request.status || '').toLowerCase()] || 'muted'}`}>
                        {String(request.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div className="request-table-actions">
                        <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => { setSelectedRequest(request); setSupplierResponse(request.supplier_response || ''); }}>View details</button>
                        {direction === 'incoming' && ['pending', 'accepted'].includes(request.status) ? (
                          <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => { setSelectedRequest(request); setSupplierResponse(request.supplier_response || ''); }}>Respond to buyer</button>
                        ) : null}
                        {direction === 'incoming' && nextAction[request.status] ? (
                          <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => handleAdvance(request)}>
                            {nextAction[request.status]}
                          </button>
                        ) : null}
                        {direction === 'incoming' && request.status === 'pending' ? (
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleStatusChange(request, 'rejected')}>Reject</button>
                        ) : null}
                        {direction === 'outgoing' && request.status === 'pending' ? (
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleStatusChange(request, 'cancelled')}>Cancel request</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {(request.status || '').toLowerCase() === 'completed' && !request.rating ? (
                    <tr className="request-feedback-row" key={`${request.id}-feedback`}>
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
                    No {direction} requests recorded yet.
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

      {selectedRequest ? (
        <div className="modal-backdrop-custom" role="presentation" onClick={() => setSelectedRequest(null)}>
          <section className="panel-card request-detail-modal" role="dialog" aria-modal="true" aria-labelledby="request-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h3 id="request-detail-title">Request details</h3>
              <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => setSelectedRequest(null)}>Close</button>
            </div>
            <dl className="request-detail-list">
              <dt>Material</dt><dd>{selectedRequest.listing?.title || selectedRequest.material_name}</dd>
              <dt>Buyer</dt><dd>{selectedRequest.buyer_company?.name || selectedRequest.seeker_name || 'Not available'}</dd>
              <dt>Supplier</dt><dd>{selectedRequest.supplier_company?.name || selectedRequest.supplier_name || 'Not available'}</dd>
              <dt>Requested quantity</dt><dd>{selectedRequest.quantity_requested} {selectedRequest.listing?.unit || ''}</dd>
              <dt>Listing quantity</dt><dd>{selectedRequest.listing?.quantity ?? 'Not available'} {selectedRequest.listing?.unit || ''}</dd>
              <dt>Buyer message</dt><dd>{selectedRequest.message || 'No message provided.'}</dd>
              <dt>Supplier response</dt><dd>{selectedRequest.supplier_response || 'No supplier response yet.'}</dd>
              <dt>Status</dt><dd>{String(selectedRequest.status || '').replace('_', ' ')}</dd>
              <dt>Created</dt><dd>{selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'Not available'}</dd>
              <dt>Last updated</dt><dd>{selectedRequest.updated_at ? new Date(selectedRequest.updated_at).toLocaleString() : 'Not available'}</dd>
            </dl>
            {direction === 'incoming' && ['pending', 'accepted'].includes(selectedRequest.status) ? (
              <form className="mt-3" onSubmit={handleSupplierResponse}>
                <label className="form-label" htmlFor="supplier-response">Respond to buyer</label>
                <textarea id="supplier-response" className="form-control" rows="3" maxLength="2000"
                  value={supplierResponse} onChange={(event) => setSupplierResponse(event.target.value)} required />
                <button type="submit" className="btn btn-primary-custom btn-sm mt-2">Send response</button>
              </form>
            ) : null}
            <h4 className="mt-4">Status history</h4>
            {historyError ? <p role="alert" className="text-muted small">{historyError}</p> : statusHistory.length ? (
              <div className="timeline">
                {statusHistory.map((entry) => (
                  <div className="timeline-item" key={entry.id}>
                    <div className="timeline-dot" />
                    <div>
                      <strong>{entry.old_status ? `${entry.old_status} → ` : ''}{entry.new_status}</strong>
                      <div className="text-muted small">{entry.actor_company_name || 'Platform'} · {new Date(entry.changed_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !historyError ? <p className="text-muted small mb-0">No status changes recorded.</p> : null}
          </section>
        </div>
      ) : null}

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
