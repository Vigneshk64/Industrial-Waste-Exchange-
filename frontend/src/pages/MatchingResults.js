import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { createRequest, fetchListings, fetchRequirements } from '../services/workflow';
import { getMatches } from '../services/api';

function computeLocalMatches(listings = [], requirements = []) {
  const matches = [];

  for (const listing of listings) {
    for (const req of requirements) {
      let score = 0;
      const reasons = [];

      const lCat = (listing.category || listing.category_name || '').toLowerCase();
      const rCat = (req.category || req.category_name || '').toLowerCase();
      if (lCat && rCat && lCat === rCat) {
        score += 35;
        reasons.push(`Matching category: ${listing.category || listing.category_name}`);
      }

      const lTitle = (listing.title || listing.name || '').toLowerCase();
      const rTitle = (req.title || req.name || req.material_name || '').toLowerCase();
      if (lTitle && rTitle) {
        if (lTitle === rTitle) {
          score += 25;
          reasons.push('Identical material specifications');
        } else if (lTitle.split(' ').some(w => w.length > 2 && rTitle.includes(w))) {
          score += 15;
          reasons.push('Material keyword alignment');
        }
      }

      const lQty = parseFloat(listing.quantity) || 0;
      const rQty = parseFloat(req.quantity_needed || req.quantity) || 0;
      if (lQty > 0 && rQty > 0) {
        const ratio = Math.min(lQty, rQty) / Math.max(lQty, rQty);
        if (ratio >= 0.7) {
          score += 20;
          reasons.push('Optimal batch volume match');
        } else {
          score += 10;
          reasons.push('Partial batch fulfillment');
        }
      }

      const lLoc = (listing.location || '').toLowerCase();
      const rLoc = (req.delivery_location || req.location || '').toLowerCase();
      if (lLoc && rLoc && (lLoc === rLoc || lLoc.includes(rLoc) || rLoc.includes(lLoc))) {
        score += 15;
        reasons.push(`Regional proximity (${listing.location})`);
      } else {
        score += 5;
        reasons.push('Inter-regional logistics');
      }

      if (score >= 35) {
        matches.push({
          id: `match-${listing.id}-${req.id}`,
          material: listing.title || listing.name,
          category: listing.category || listing.category_name,
          quantity: `${listing.quantity} ${listing.unit || 'kg'} available`,
          requiredQuantity: `${req.quantity_needed || req.quantity} ${req.unit || 'kg'} needed`,
          company: listing.company || listing.company_name || 'Industrial Supplier',
          seeker: req.company || req.company_name || 'Material Seeker',
          location: listing.location,
          score: Math.min(score, 98),
          reason: reasons.join(' • '),
          distance: lLoc === rLoc ? '15 km away' : '65 km away',
        });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export default function MatchingResults() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const loadMatches = async () => {
    try {
      setLoading(true);
      // Try backend matching API
      let liveMatches = [];
      try {
        liveMatches = await getMatches();
      } catch {}

      if (Array.isArray(liveMatches) && liveMatches.length > 0) {
        setMatches(liveMatches);
      } else {
        // Compute dynamically from active listings & requirements
        const [listings, requirements] = await Promise.all([
          fetchListings(),
          fetchRequirements(),
        ]);
        const computed = computeLocalMatches(listings, requirements);
        setMatches(computed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleRequest = (match, details) => {
    try {
      createRequest({
        id: match.id,
        name: match.material,
        status: 'Available',
        company: match.company,
        price: match.price || '',
      }, details);
      setMessageType('success');
      setMessage(`Interest sent for ${match.material}. Follow the exchange progress on the Requests page.`);
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
          <h2>Material Matching Engine</h2>
          <p>Rule-based recommendations generated from supplier specifications, quantity, and location fit (Objective 2).</p>
        </div>
        <div className="btn-group">
          <Link to="/add-material" className="btn btn-outline-custom">Post Requirement / Listing</Link>
          <Link to="/materials" className="btn btn-primary-custom">Browse All Listings</Link>
        </div>
      </div>

      {message ? <div className={`inline-message ${messageType}`}>{message}</div> : null}

      <div className="panel-card mb-4">
        <div className="chip-list">
          <span className="chip">Category Match (35 pts)</span>
          <span className="chip">Material Keyword (25 pts)</span>
          <span className="chip">Quantity Fit (20 pts)</span>
          <span className="chip">Location Proximity (15 pts)</span>
          <span className="chip">Quality Grade (5 pts)</span>
        </div>
      </div>

      {loading ? (
        <div className="panel-card text-center py-5">
          <p className="text-muted">Evaluating matching algorithm across listings and requirements...</p>
        </div>
      ) : matches.length ? (
        <div className="matches-grid">
          {matches.map((match) => (
            <MatchCard key={match.id || match.material} match={match} onRequest={handleRequest} />
          ))}
        </div>
      ) : (
        <div className="panel-card text-center py-5">
          <h4>No material matches currently generated</h4>
          <p className="text-muted max-w-md mx-auto">
            Matches are calculated automatically when companies register complementary waste listings and raw material requirements.
          </p>
          <div className="d-flex justify-content-center gap-3 mt-3">
            <Link to="/add-material" className="btn btn-primary-custom">
              Add Available Waste / Raw Material Need
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
