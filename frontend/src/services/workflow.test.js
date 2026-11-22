import {
  advanceRequest,
  createRequest,
  fetchListings,
  getListings,
  saveFeedback,
  saveListing,
} from './workflow';
import * as api from './api';

jest.mock('./api', () => ({
  createListing: jest.fn(),
  getListings: jest.fn(),
  getRequests: jest.fn(),
  createRequest: jest.fn(),
  updateListing: jest.fn(),
  advanceRequest: jest.fn(),
  submitFeedback: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  api.createListing.mockResolvedValue({
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Recycled resin',
    category_name: 'Plastic',
    quantity: 400,
    unit: 'kg',
    quality_grade: 'Grade A',
    price_per_unit: 50,
    company_name: 'Resin Supplier',
    availability_status: 'available',
    moderation_status: 'active',
  });
  api.createRequest.mockResolvedValue({});
  api.advanceRequest.mockResolvedValue({});
  api.submitFeedback.mockResolvedValue({});
  api.getRequests.mockResolvedValue([]);
});

test('provider listing publishes immediately through the backend and accepts seeker interest', async () => {
  const listing = await saveListing({
    name: 'Recycled resin',
    category: 'Plastic',
    quantity: 400,
    unit: 'kg',
    grade: 'Grade A',
    price: '50',
    location: 'Pune',
    date: '2026-11-01',
    image: { name: 'resin.jpg' },
  });

  expect(api.createListing).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Recycled resin',
    category: 'Plastic',
    quantity: 400,
  }));
  expect(listing.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  expect(listing.status).toBe('Available');
  expect(listing.imageName).toBe('resin.jpg');
  expect(getListings()).toContainEqual(listing);

  await createRequest(listing, { quantity: '100 kg', message: 'Ready to collect next week.' });
  expect(api.createRequest).toHaveBeenCalledWith({
    listing_id: listing.id,
    quantity_requested: '100 kg',
    offered_price: 50,
    message: 'Ready to collect next week.',
  });
});

test('exchange request status advances through the authenticated API', async () => {
  api.advanceRequest.mockResolvedValue({ id: 'request-id', status: 'accepted' });
  api.submitFeedback.mockResolvedValue({});
  const listing = {
    id: 'available-listing',
    name: 'Copper scrap',
    company: 'Supplier Co.',
    status: 'Available',
    price: '75',
  };
  await createRequest(listing, { quantity: '50 kg', message: '' });
  await expect(advanceRequest('request-id')).resolves.toEqual({ id: 'request-id', status: 'accepted' });
  await expect(saveFeedback('request-id', '5', 'Smooth exchange.')).resolves.toEqual({
    id: 'request-id',
    rating: 5,
    feedback: 'Smooth exchange.',
  });
  expect(api.advanceRequest).toHaveBeenCalledWith('request-id');
});

test('rejects requests for listings that are not published', async () => {
  await expect(createRequest(
    { id: 'pending-listing', name: 'Pending stock', status: 'Pending review' },
    { quantity: '10 kg', message: '' },
  )).rejects.toThrow('This listing is no longer available for requests.');
});

test('normalizes moderation statuses so hidden listings cannot be requested', async () => {
  api.getListings.mockResolvedValue([{
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Hidden stock',
    quantity: 20,
    unit: 'kg',
    moderation_status: 'hidden',
    availability_status: 'available',
  }]);

  const [listing] = await fetchListings();
  expect(listing.status).toBe('Hidden');
  await expect(createRequest(listing, { quantity: '5 kg' })).rejects.toThrow('This listing is no longer available for requests.');
});
