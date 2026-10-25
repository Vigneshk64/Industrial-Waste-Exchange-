import { useState } from 'react';
import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { createRequest } from '../services/workflow';

const matches = [
  { material: 'Polypropylene Pellets', company: 'IndoPlast Ltd.', category: 'Plastic', quantity: '400 kg', grade: 'Food grade', location: 'Pune, MH', score: 92, reason: 'Strong specification compatibility and warehouse proximity.', distance: '18 km away' },
  { material: 'Steel Turnings', company: 'MetalMax Works', category: 'Metal', quantity: '1.8 t', grade: 'Grade B', location: 'Nashik, MH', score: 88, reason: 'Good volume matching and suitable impurity profile.', distance: '64 km away' },
  { material: 'Wood Fiber Blend', company: 'EarthNest Bio', category: 'Organic', quantity: '900 kg', grade: 'Processed', location: 'Aurangabad, MH', score: 84, reason: 'Compatible with composting operations and fast dispatch.', distance: '71 km away' },
  { material: 'Fly Ash', company: 'GreenCem Materials', category: 'Ash', quantity: '800 kg', grade: 'Industrial', location: 'Nagpur, MH', score: 80, reason: 'Cost-efficient and consistent supply for cement blending.', distance: '118 km away' },
];

export default function MatchingResults() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const handleRequest = (match, details) => {
    try {
      createRequest({
        ...match,
        id: `match-${match.material.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: match.material,
        status: 'Available',
      }, details);
      setMessageType('success');
      setMessage(`Interest sent for ${match.material}. Track the exchange from Requests.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to send this request.');
      throw error;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Material matching</h2>
          <p>Rule-based recommendations generated from supplier specifications, quantity, and location fit.</p>
        </div>
        <Link to="/materials" className="btn btn-primary-custom">Browse all listings</Link>
      </div>

      {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

      <div className="panel-card mb-4">
        <div className="chip-list">
          <span className="chip">Category match</span>
          <span className="chip">Quantity fit</span>
          <span className="chip">Location proximity</span>
          <span className="chip">Quality alignment</span>
        </div>
      </div>

      <div className="matches-grid">
        {matches.map((match) => (
          <MatchCard key={match.material} match={match} onRequest={handleRequest} />
        ))}
      </div>
    </div>
  );
}
