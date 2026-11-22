import * as api from './api';

const LISTINGS_KEY = 'wasteExchangeListings_clean';

// Clean empty collections - NO trash dataset
function readCollection(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCollection(key, values) {
  localStorage.setItem(key, JSON.stringify(values));
}

// -----------------------------------------------------------------------------
// Listings (Provider Waste)
// -----------------------------------------------------------------------------
export function getListingsSync() {
  return readCollection(LISTINGS_KEY);
}

export async function fetchListings(params = {}) {
  const pageSize = 100;
  const results = [];
  for (let offset = 0; ; offset += pageSize) {
    const data = await api.getListings({ ...params, limit: pageSize, offset });
    if (!Array.isArray(data)) throw new Error('The listings response was invalid.');
    results.push(...data);
    if (data.length < pageSize) return results.map(normalizeListing);
  }
}

export function getListings() {
  return readCollection(LISTINGS_KEY);
}

function normalizeListing(listing) {
  const moderationStatus = listing.moderation_status || 'active';
  const availabilityStatus = listing.availability_status || 'available';
  const status = moderationStatus !== 'active'
    ? moderationStatus[0].toUpperCase() + moderationStatus.slice(1)
    : ({
      available: 'Available',
      booked: 'Reserved',
      completed: 'Completed',
      pending_review: 'Pending review',
    }[availabilityStatus] || availabilityStatus);

  return {
    ...listing,
    name: listing.name || listing.title,
    category: listing.category || listing.category_name,
    grade: listing.grade || listing.quality_grade,
    quantity: typeof listing.quantity === 'number'
      ? `${listing.quantity} ${listing.unit || 'kg'}`
      : listing.quantity,
    price: listing.price ?? listing.price_per_unit ?? null,
    company: listing.company || listing.company_name,
    status,
  };
}

export async function saveListing(form, listingId) {
  const rawPrice = form.price || form.price_per_unit;
  const quantity = Number.parseFloat(form.quantity);
  const price = rawPrice === undefined || rawPrice === null || rawPrice === '' ? null : Number(rawPrice);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Enter a positive listing quantity.');
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Enter a valid non-negative unit price.');
  const payload = {
    title: form.name || form.title,
    description: form.description || '',
    category_name: form.category || form.category_name,
    quantity,
    unit: form.unit || 'kg',
    quality_grade: form.grade || form.quality_grade,
    price_per_unit: price,
    location: form.location,
    safety_notes: form.notes || form.safety_notes || '',
    available_from: form.date || form.available_from,
  };
  const saved = listingId
    ? await api.updateListing(listingId, payload)
    : await api.createListing({ ...payload, category: payload.category_name, grade: payload.quality_grade, price: payload.price_per_unit, notes: payload.safety_notes, date: payload.available_from });
  const listing = normalizeListing({
    ...saved,
    imageName: form.image ? form.image.name : '',
  });
  const listings = readCollection(LISTINGS_KEY);
  writeCollection(LISTINGS_KEY, [listing, ...listings]);
  return listing;
}

// -----------------------------------------------------------------------------
// Seeker Material Requirements (Objective 1)
// -----------------------------------------------------------------------------
export async function fetchRequirements() {
  const data = await api.getRequirements();
  if (!Array.isArray(data)) throw new Error('The requirements response was invalid.');
  return data;
}

export async function saveRequirement(form) {
  const quantity = Number.parseFloat(form.quantity || form.quantity_needed);
  const price = form.price || form.target_price_per_unit;
  const pricePerUnit = price === undefined || price === null || price === '' ? null : Number(price);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Enter a positive requirement quantity.');
  if (pricePerUnit !== null && (!Number.isFinite(pricePerUnit) || pricePerUnit < 0)) {
    throw new Error('Enter a valid non-negative target price.');
  }
  return api.createRequirement({
    title: form.title || form.name,
    description: form.description || '',
    category_name: form.category || form.category_name,
    quantity_needed: quantity,
    unit: form.unit || 'kg',
    min_quality_grade: form.grade || form.min_quality_grade || 'Standard',
    target_price_per_unit: pricePerUnit,
    delivery_location: form.location || form.delivery_location,
    required_by: form.date || form.required_by,
  });
}

// -----------------------------------------------------------------------------
// Exchange Requests & Lifecycle (Objectives 3 & 4)
// -----------------------------------------------------------------------------
export async function fetchRequests() {
  const data = await api.getRequests();
  if (!Array.isArray(data)) throw new Error('The requests response was invalid.');
  return data;
}

export async function createRequest(listing, details) {
  if (!listing || listing.status !== 'Available') {
    throw new Error('This listing is no longer available for requests.');
  }
  if (!details.quantity || !String(details.quantity).trim()) {
    throw new Error('Enter the quantity you need.');
  }

  return api.createRequest({
    listing_id: listing.listing_id || listing.id,
    quantity_requested: details.quantity.trim(),
    offered_price: details.offered_price || listing.price || listing.price_per_unit || null,
    message: (details.message || '').trim(),
  });
}

export async function advanceRequest(id) {
  return api.advanceRequest(id);
}

export async function saveFeedback(id, rating, comment = '') {
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    throw new Error('Choose a rating from 1 to 5.');
  }

  await api.submitFeedback(id, rating, comment);
  return { id, rating: Number(rating), feedback: comment.trim() };
}
