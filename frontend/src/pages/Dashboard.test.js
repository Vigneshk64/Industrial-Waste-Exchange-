import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { fetchListings, fetchRequests } from '../services/workflow';
import { getDashboardMetrics, getNotifications } from '../services/api';

jest.mock('../services/workflow', () => ({
  fetchListings: jest.fn(),
  fetchRequests: jest.fn(),
}));

jest.mock('../services/api', () => ({
  getDashboardMetrics: jest.fn(),
  getNotifications: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchListings.mockResolvedValue([{
    id: 'listing-1',
    is_mine: true,
    title: 'Regrind pellets',
    category_name: 'Plastic',
    quantity: 240,
    unit: 'kg',
    availability_status: 'available',
    moderation_status: 'active',
  }]);
  fetchRequests.mockResolvedValue([{
    id: 'request-1',
    is_incoming: true,
    material_name: 'Regrind pellets',
    seeker_name: 'Registered Buyer',
    buyer_company: { name: 'Registered Buyer' },
    quantity_requested: 20,
    status: 'pending',
  }]);
  getDashboardMetrics.mockResolvedValue({
    total_listings: 1,
    pending_requests: 1,
    accepted_requests: 2,
    rejected_requests: 3,
    completed_exchanges: 4,
  });
  getNotifications.mockResolvedValue({ unread_count: 7 });
});

test('dashboard shows authenticated-company listing and request metrics without fabricated charts', async () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>);

  expect(fetchListings).toHaveBeenCalledWith({ mine: true });
  expect(await screen.findAllByText('Regrind pellets')).toHaveLength(2);
  expect(screen.getByText('Pending buyer requests')).toBeInTheDocument();
  expect(screen.getByText('Rejected requests')).toBeInTheDocument();
  expect(screen.getByText(/Received from Registered Buyer/)).toBeInTheDocument();
  expect(Array.from(document.querySelectorAll('.stat-copy h3')).map((node) => node.textContent))
    .toEqual(['1', '1', '2', '3', '4', '7']);
  expect(screen.queryByText(/cumulative waste reused/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /impact/i })).not.toBeInTheDocument();
});
