import {
  advanceRequest,
  approveListing,
  createRequest,
  getListings,
  getRequests,
  saveFeedback,
  saveListing,
} from './workflow';

beforeEach(() => {
  localStorage.clear();
});

test('provider listing moves through review and seeker interest', () => {
  const listing = saveListing({
    name: 'Recycled resin',
    category: 'Plastic',
    quantity: '400 kg',
    unit: 'kg',
    grade: 'Grade A',
    price: '50',
    location: 'Pune',
    date: '2026-11-01',
    image: { name: 'resin.jpg' },
  });

  expect(listing.status).toBe('Pending review');
  expect(listing.imageName).toBe('resin.jpg');
  expect(getListings()).toContainEqual(listing);

  const published = approveListing(listing.id);
  expect(published.status).toBe('Available');

  const request = createRequest(published, { quantity: '100 kg', message: 'Ready to collect next week.' });
  expect(request.status).toBe('Pending');
  expect(getRequests()).toContainEqual(request);
});

test('exchange request progresses through completion and stores feedback', () => {
  const listing = {
    id: 'available-listing',
    name: 'Copper scrap',
    company: 'Supplier Co.',
    status: 'Available',
    price: '75',
  };
  const request = createRequest(listing, { quantity: '50 kg', message: '' });

  expect(advanceRequest(request.id).status).toBe('Accepted');
  expect(advanceRequest(request.id).status).toBe('In Transit');
  expect(advanceRequest(request.id).status).toBe('Awaiting confirmation');
  expect(advanceRequest(request.id).status).toBe('Completed');
  expect(saveFeedback(request.id, '5', 'Smooth exchange.').rating).toBe(5);
});

test('rejects requests for listings that are not published', () => {
  expect(() => createRequest(
    { id: 'pending-listing', name: 'Pending stock', status: 'Pending review' },
    { quantity: '10 kg', message: '' },
  )).toThrow('This listing is no longer available for requests.');
});
