import React, { useEffect, useMemo, useState } from 'react';
import { advanceRequest, getRequests, saveFeedback } from '../services/workflow';

const filters = ['All', 'Pending', 'Accepted', 'In Transit', 'Awaiting confirmation', 'Completed', 'Rejected'];
const statusClasses = {
  Pending: 'warning',
  Accepted: 'success',
  'In Transit': 'info',
  'Awaiting confirmation': 'warning',
  Completed: 'success',
  Rejected: 'muted',
};
const nextAction = {
  Pending: 'Review request',
  Accepted: 'Confirm dispatch',
  'In Transit': 'Confirm receipt',
  'Awaiting confirmation': 'Confirm completion',
};

export default function ExchangeRequests() {
  const [requests, setRequests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    try {
      setRequests(getRequests());
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to load exchange requests.');
    }
  }, []);

  const visibleRequests = useMemo(
    () => activeFilter === 'All' ? requests : requests.filter((request) => request.status === activeFilter),
    [activeFilter, requests],
  );
  const completedRequests = requests.filter((request) => request.status === 'Completed');

  const handleAdvance = (request) => {
    try {
      const updated = advanceRequest(request.id);
      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessageType('success');
      setMessage(`Exchange ${request.material}: ${updated.status === 'Completed' ? 'both parties confirmed completion.' : `status updated to ${updated.status}.`}`);
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

  const handleFeedbackSubmit = (event, request) => {
    event.preventDefault();
    const draft = feedbackDrafts[request.id] || { rating: '5', comment: '' };
    try {
      const updated = saveFeedback(request.id, draft.rating, draft.comment);
      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessageType('success');
      setMessage('Feedback saved to the completed transaction record.');
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to save feedback.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Exchange requests</h2>
          <p>Review interest, coordinate transfer, confirm completion, and record feedback.</p>
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
                <th>Supplier / Buyer</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.length ? visibleRequests.map((request) => (
                <React.Fragment key={request.id}>
                  <tr>
                    <td>{request.material}</td>
                    <td>{request.supplier} / {request.buyer}</td>
                    <td>{request.quantity}</td>
                    <td>{request.date}</td>
                    <td>{request.price}</td>
                    <td>
                      <span className={`badge ${statusClasses[request.status] || 'muted'}`}>{request.status}</span>
                    </td>
                    <td>
                      {nextAction[request.status] ? (
                        <button type="button" className="btn btn-outline-custom btn-sm" onClick={() => handleAdvance(request)}>
                          {nextAction[request.status]}
                        </button>
                      ) : request.status === 'Completed' && !request.rating ? (
                        <span className="text-muted small">Feedback needed</span>
                      ) : request.status === 'Completed' ? (
                        <span className="text-success small">Recorded</span>
                      ) : <span className="text-muted small">No action</span>}
                    </td>
                  </tr>
                  {request.status === 'Completed' && !request.rating ? (
                    <tr key={`${request.id}-feedback`}>
                      <td colSpan="7">
                        <form className="feedback-form" onSubmit={(event) => handleFeedbackSubmit(event, request)}>
                          <strong>Rate {request.material} exchange</strong>
                          <div className="feedback-fields">
                            <label>
                              Rating
                              <select
                                className="form-select"
                                value={(feedbackDrafts[request.id] || {}).rating || '5'}
                                onChange={(event) => handleFeedbackChange(request.id, 'rating', event.target.value)}
                              >
                                <option value="5">5 - Excellent</option>
                                <option value="4">4 - Good</option>
                                <option value="3">3 - Average</option>
                                <option value="2">2 - Poor</option>
                                <option value="1">1 - Very poor</option>
                              </select>
                            </label>
                            <label>
                              Feedback
                              <input
                                className="form-control"
                                value={(feedbackDrafts[request.id] || {}).comment || ''}
                                onChange={(event) => handleFeedbackChange(request.id, 'comment', event.target.value)}
                                placeholder="Share your experience"
                              />
                            </label>
                            <button type="submit" className="btn btn-primary-custom">Save feedback</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )) : (
                <tr><td colSpan="7" className="text-center py-4 text-muted">No requests in this status.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="panel-card mt-4">
        <div className="panel-header">
          <h3>Transaction records</h3>
          <span className="chip">{completedRequests.length} completed</span>
        </div>
        {completedRequests.length ? (
          <div className="data-list">
            {completedRequests.map((request) => (
              <div className="list-row" key={request.id}>
                <div className="list-meta">
                  <strong>{request.material}</strong>
                  <span className="text-muted small">{request.supplier} / {request.buyer} · {request.quantity}</span>
                </div>
                <span className="text-muted small">
                  {request.rating ? `${request.rating}/5 rating` : 'Awaiting feedback'}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="text-muted mb-0">Completed exchanges and ratings will appear here.</p>}
      </section>
    </div>
  );
}
