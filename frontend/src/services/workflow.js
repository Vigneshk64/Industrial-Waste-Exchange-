const LISTINGS_KEY = 'wasteExchangeListings';
const REQUESTS_KEY = 'wasteExchangeRequests';

const initialListings = [
  { id: 'hdpe-scrap', name: 'HDPE Scrap', category: 'Plastic', quantity: '320 kg', grade: 'Grade A', company: 'EcoFlow Industries', location: 'Pune, MH', status: 'Available', price: '48', description: 'Clean, sorted HDPE scrap ready for recycling.' },
  { id: 'aluminium-offcuts', name: 'Aluminium Offcuts', category: 'Metal', quantity: '1.2 t', grade: 'Recycled', company: 'SteelCore Ltd.', location: 'Vapi, GJ', status: 'Reserved', price: '145', description: 'Sorted aluminium offcuts from manufacturing.' },
  { id: 'fly-ash', name: 'Fly Ash', category: 'Ash', quantity: '800 kg', grade: 'Industrial', company: 'GreenCem Materials', location: 'Nagpur, MH', status: 'Available', price: '22', description: 'Industrial fly ash suitable for cement blending.' },
  { id: 'copper-wire-scrap', name: 'Copper Wire Scrap', category: 'Metal', quantity: '620 kg', grade: 'Grade B', company: 'Ramco Metals', location: 'Ahmedabad, GJ', status: 'Available', price: '176', description: 'Recovered copper wire scrap.' },
  { id: 'organic-compost-feed', name: 'Organic Compost Feed', category: 'Organic', quantity: '1.4 t', grade: 'Processed', company: 'AgriCycle', location: 'Nashik, MH', status: 'Low stock', price: '31', description: 'Processed organic feedstock for composting.' },
  { id: 'pp-granules', name: 'PP Granules', category: 'Plastic', quantity: '950 kg', grade: 'Virgin grade', company: 'PolyCycle', location: 'Hyderabad, TS', status: 'Available', price: '59', description: 'Reusable polypropylene granules.' },
];

const initialRequests = [
  { id: 'request-hdpe', material: 'HDPE Scrap', buyer: 'Apex Packaging', supplier: 'EcoFlow Industries', quantity: '250 kg', date: '14 Jun 2026', status: 'Pending', price: '₹12,500' },
  { id: 'request-copper', material: 'Copper Wire Scrap', buyer: 'Metro Components', supplier: 'Ramco Metals', quantity: '600 kg', date: '10 Jun 2026', status: 'Accepted', price: '₹34,600' },
  { id: 'request-organic', material: 'Organic Compost Feed', buyer: 'AgriCycle', supplier: 'EarthNest Bio', quantity: '1.1 t', date: '07 Jun 2026', status: 'In Transit', price: '₹18,000' },
  { id: 'request-steel', material: 'Steel Turnings', buyer: 'MetalMax Works', supplier: 'Hitech Alloy', quantity: '1.4 t', date: '05 Jun 2026', status: 'Rejected', price: '₹27,800' },
];

function readCollection(key, initialValue, label) {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    localStorage.setItem(key, JSON.stringify(initialValue));
    return initialValue;
  }

  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('Expected a list');
    return value;
  } catch (error) {
    throw new Error(`Saved ${label} data is invalid. Clear this app's local storage to restore the demo data.`);
  }
}

function writeCollection(key, values) {
  localStorage.setItem(key, JSON.stringify(values));
}

export function getListings() {
  return readCollection(LISTINGS_KEY, initialListings, 'listing');
}

export function saveListing(form) {
  const listings = getListings();
  const listing = {
    ...form,
    id: `listing-${Date.now()}`,
    company: 'Your company',
    status: 'Pending review',
    description: form.description || '',
    imageName: form.image ? form.image.name : '',
  };
  delete listing.image;
  writeCollection(LISTINGS_KEY, [listing, ...listings]);
  return listing;
}

export function approveListing(id) {
  const listings = getListings();
  const index = listings.findIndex((listing) => listing.id === id);
  if (index === -1) throw new Error('This listing could not be found.');
  if (listings[index].status !== 'Pending review') {
    throw new Error('Only listings pending review can be published.');
  }

  const approved = { ...listings[index], status: 'Available' };
  listings[index] = approved;
  writeCollection(LISTINGS_KEY, listings);
  return approved;
}

export function getRequests() {
  return readCollection(REQUESTS_KEY, initialRequests, 'request');
}

export function createRequest(listing, details) {
  if (!listing || listing.status !== 'Available') {
    throw new Error('This listing is no longer available for requests.');
  }
  if (!details.quantity.trim()) throw new Error('Enter the quantity you need.');

  const requests = getRequests();
  const request = {
    id: `request-${Date.now()}`,
    listingId: listing.id,
    material: listing.name,
    buyer: 'Your company',
    supplier: listing.company,
    quantity: details.quantity.trim(),
    message: details.message.trim(),
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: 'Pending',
    price: listing.price ? `₹${listing.price}` : 'To be agreed',
  };
  writeCollection(REQUESTS_KEY, [request, ...requests]);
  return request;
}

const requestTransitions = {
  Pending: 'Accepted',
  Accepted: 'In Transit',
  'In Transit': 'Awaiting confirmation',
  'Awaiting confirmation': 'Completed',
};

export function advanceRequest(id) {
  const requests = getRequests();
  const index = requests.findIndex((request) => request.id === id);
  if (index === -1) throw new Error('This request could not be found.');

  const nextStatus = requestTransitions[requests[index].status];
  if (!nextStatus) throw new Error('This request cannot move to another step.');

  const updated = { ...requests[index], status: nextStatus };
  requests[index] = updated;
  writeCollection(REQUESTS_KEY, requests);
  return updated;
}

export function saveFeedback(id, rating, comment) {
  const requests = getRequests();
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
  return updated;
}
