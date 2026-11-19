/**
 * Rule-Based Material Matching Engine
 * Implements Objective 2: Match industries based on material type, quantity, location, and requirements.
 */

function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

function computeMatchScore(listing, requirement) {
  let score = 0;
  const reasons = [];

  // 1. Category Matching (Max 35 points)
  const listingCategory = normalizeText(listing.category_name || listing.category);
  const reqCategory = normalizeText(requirement.category_name || requirement.category);

  if (listingCategory && reqCategory && listingCategory === reqCategory) {
    score += 35;
    reasons.push(`Matching category: ${listing.category_name || listing.category}`);
  }

  // 2. Title / Material Name Keyword Matching (Max 25 points)
  const listingTitle = normalizeText(listing.title || listing.name);
  const reqTitle = normalizeText(requirement.title || requirement.material_name);

  if (listingTitle && reqTitle) {
    const listingWords = listingTitle.split(/\s+/).filter(w => w.length > 2);
    const hasOverlap = listingWords.some(word => reqTitle.includes(word));
    if (listingTitle === reqTitle) {
      score += 25;
      reasons.push('Identical material specification');
    } else if (hasOverlap) {
      score += 15;
      reasons.push('High material keyword similarity');
    }
  }

  // 3. Quantity Band Alignment (Max 20 points)
  const listQty = parseFloat(listing.quantity) || 0;
  const reqQty = parseFloat(requirement.quantity_needed || requirement.quantity) || 0;

  if (listQty > 0 && reqQty > 0) {
    const ratio = Math.min(listQty, reqQty) / Math.max(listQty, reqQty);
    if (ratio >= 0.75) {
      score += 20;
      reasons.push('Optimal quantity fulfillment (>= 75% match)');
    } else if (ratio >= 0.4) {
      score += 12;
      reasons.push('Moderate quantity alignment (>= 40% match)');
    } else {
      score += 5;
      reasons.push('Partial batch supply available');
    }
  }

  // 4. Location Proximity (Max 15 points)
  const listLoc = normalizeText(listing.location);
  const reqLoc = normalizeText(requirement.delivery_location || requirement.location);

  if (listLoc && reqLoc) {
    if (listLoc === reqLoc || listLoc.includes(reqLoc) || reqLoc.includes(listLoc)) {
      score += 15;
      reasons.push(`Direct regional proximity (${listing.location})`);
    } else {
      // Check state overlap if specified
      const listParts = listLoc.split(',');
      const reqParts = reqLoc.split(',');
      const listState = (listParts[1] || '').trim();
      const reqState = (reqParts[1] || '').trim();
      if (listState && reqState && listState === reqState) {
        score += 8;
        reasons.push(`Intra-state logistics corridor (${listState})`);
      } else {
        score += 3;
        reasons.push('Inter-state transport required');
      }
    }
  }

  // 5. Quality Grade Alignment (Max 5 points)
  const listGrade = normalizeText(listing.quality_grade || listing.grade);
  const reqGrade = normalizeText(requirement.min_quality_grade || requirement.grade);
  if (listGrade && reqGrade && listGrade === reqGrade) {
    score += 5;
    reasons.push(`Matches required quality grade: ${listing.quality_grade || listing.grade}`);
  }

  return {
    score: Math.min(score, 100),
    reason: reasons.join(' • '),
  };
}

function calculateMatches(listings = [], requirements = []) {
  const matches = [];

  for (const listing of listings) {
    for (const req of requirements) {
      // Prevent a company from matching with itself if company IDs match
      if (listing.provider_id && req.seeker_id && listing.provider_id === req.seeker_id) {
        continue;
      }

      const { score, reason } = computeMatchScore(listing, req);
      if (score >= 35) { // Minimum threshold for relevance
        matches.push({
          id: `match-${listing.id || 'list'}-${req.id || 'req'}`,
          listing_id: listing.id,
          requirement_id: req.id,
          material: listing.title || listing.name,
          category: listing.category_name || listing.category,
          quantity: `${listing.quantity} ${listing.unit || 'kg'} available`,
          required_quantity: `${req.quantity_needed || req.quantity} ${req.unit || 'kg'} needed`,
          supplier: listing.company_name || listing.company || 'Waste Supplier',
          seeker: req.company_name || req.company || 'Material Seeker',
          location: listing.location || 'Location specified on request',
          delivery_location: req.delivery_location || req.location || 'Location specified on request',
          grade: listing.quality_grade || listing.grade || 'Standard',
          price: listing.price_per_unit || listing.price,
          score,
          reason,
        });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

module.exports = {
  computeMatchScore,
  calculateMatches,
};

