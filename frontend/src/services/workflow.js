import * as api from './api';

const LISTINGS_KEY = 'wasteExchangeListings_clean';
const REQUESTS_KEY = 'wasteExchangeRequests_clean';
const REQUIREMENTS_KEY = 'wasteExchangeRequirements_clean';

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
  try {
    const data = await api.getListings(params);
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {}
  return readCollection(LISTINGS_KEY);
}

export function getListings() {
  return readCollection(LISTINGS_KEY);
}

export function saveListing(form) {
  const listings = readCollection(LISTINGS_KEY);
  const listing = {
    ...form,
    id: `listing-${Date.now()}`,
    name: form.name || form.title,
    title: form.name || form.title,
    company: form.company || 'Your company',
    company_name: form.company || 'Your company',
    status: 'Pending review',
    availability_status: 'pending_review',
    description: form.description || '',
    imageName: form.image ? form.image.name : '',
    created_at: new Date().toISOString(),
  };
  delete listing.image;
  writeCollection(LISTINGS_KEY, [listing, ...listings]);

  // Attempt backend async push if available
  api.createListing(listing).catch(() => {});
  return listing;
}

export function approveListing(id) {
  const listings = readCollection(LISTINGS_KEY);
  const index = listings.findIndex((listing) => listing.id === id);
  if (index === -1) throw new Error('This listing could not be found.');
  if (listings[index].status !== 'Pending review') {
    throw new Error('Only listings pending review can be published.');
  }

  const approved = { ...listings[index], status: 'Available', availability_status: 'available' };
  listings[index] = approved;
  writeCollection(LISTINGS_KEY, listings);
  return approved;
}

// -----------------------------------------------------------------------------
// Seeker Material Requirements (Objective 1)
// -----------------------------------------------------------------------------
export function getRequirements() {
  return readCollection(REQUIREMENTS_KEY);
}

export async function fetchRequirements() {
  try {
    const data = await api.getRequirements();
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {}
  return readCollection(REQUIREMENTS_KEY);
}

export function saveRequirement(form) {
  const reqs = readCollection(REQUIREMENTS_KEY);
  const newReq = {
    ...form,
    id: `req-${Date.now()}`,
    title: form.title || form.name,
    name: form.title || form.name,
    company: form.company || 'Your company',
    company_name: form.company || 'Your company',
    quantity_needed: form.quantity || form.quantity_needed,
    unit: form.unit || 'kg',
    delivery_location: form.location || form.delivery_location,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  writeCollection(REQUIREMENTS_KEY, [newReq, ...reqs]);
  api.createRequirement(newReq).catch(() => {});
  return newReq;
}

// -----------------------------------------------------------------------------
// Exchange Requests & Lifecycle (Objectives 3 & 4)
// -----------------------------------------------------------------------------
export function getRequests() {
  return readCollection(REQUESTS_KEY);
}

export async function fetchRequests() {
  try {
    const data = await api.getRequests();
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {}
  return readCollection(REQUESTS_KEY);
}

export function createRequest(listing, details) {
  if (!listing || listing.status !== 'Available') {
    throw new Error('This listing is no longer available for requests.');
  }
  if (!details.quantity || !String(details.quantity).trim()) {
    throw new Error('Enter the quantity you need.');
  }

  const requests = readCollection(REQUESTS_KEY);
  const request = {
    id: `request-${Date.now()}`,
    listingId: listing.id,
    listing_id: listing.id,
    material: listing.name || listing.title,
    material_name: listing.name || listing.title,
    buyer: 'Your company',
    seeker_name: 'Your company',
    supplier: listing.company || listing.company_name || 'Waste Supplier',
    supplier_name: listing.company || listing.company_name || 'Waste Supplier',
    quantity: details.quantity.trim(),
    quantity_requested: details.quantity.trim(),
    message: (details.message || '').trim(),
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: 'Pending',
    price: listing.price ? `₹${listing.price}` : 'To be agreed',
    created_at: new Date().toISOString(),
  };
  writeCollection(REQUESTS_KEY, [request, ...requests]);
  api.createRequest(request).catch(() => {});
  return request;
}

const requestTransitions = {
  Pending: 'Accepted',
  pending: 'accepted',
  Accepted: 'In Transit',
  accepted: 'in_transit',
  'In Transit': 'Awaiting confirmation',
  'Awaiting confirmation': 'Completed',
  in_transit: 'completed',
};

export function advanceRequest(id) {
  const requests = readCollection(REQUESTS_KEY);
  const index = requests.findIndex((request) => request.id === id);
  if (index === -1) throw new Error('This request could not be found.');

  const nextStatus = requestTransitions[requests[index].status];
  if (!nextStatus) throw new Error('This request cannot move to another step.');

  const updated = { ...requests[index], status: nextStatus };
  requests[index] = updated;
  writeCollection(REQUESTS_KEY, requests);
  api.advanceRequest(id).catch(() => {});
  return updated;
}

export function saveFeedback(id, rating, comment = '') {
  const requests = readCollection(REQUESTS_KEY);
  const index = requests.findIndex((request) => request.id === id);
  if (index === -1 || requests[index].status !== 'Completed') {
    throw new Error('Feedback is available after the exchange is completed.');
  }
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    throw new Error('Choose a rating from 1 to 5.');
  }

  const updated = { ...requests[index], rating: Number(rating), feedback: comment.trim() };
  requests[index] = updated;
  writeCollection(REQUESTS_KEY, requests);
  api.submitFeedback(id, rating, comment).catch(() => {});
  return updated;
}
