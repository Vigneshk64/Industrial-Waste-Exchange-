import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { apiFetch } from '../services/api';

jest.mock('../services/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
    },
  },
}));

const reportId = '550e8400-e29b-41d4-a716-446655440099';

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockImplementation((endpoint) => {
    if (endpoint === '/admin/stats') {
      return Promise.resolve({ totalUsers: 4, totalCompanies: 3, totalListings: 5, totalReports: 1 });
    }
    if (endpoint.startsWith('/admin/reports')) {
      return Promise.resolve({
        reports: [{
          id: reportId,
          target_type: 'listing',
          reported_listing_id: '550e8400-e29b-41d4-a716-446655440001',
          category: 'unsafe_material',
          reason: 'Safety details missing',
          description: 'The listing needs further review.',
          status: 'pending',
          created_at: '2026-11-22T00:00:00.000Z',
        }],
      });
    }
    return Promise.resolve({});
  });
});

test('admin report controls send the selected status and required reason to the API', async () => {
  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

  await screen.findByText('4');
  fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
  await screen.findByText('Safety details missing');

  const prompt = jest.spyOn(window, 'prompt').mockReturnValue('Verified details are needed');
  fireEvent.click(screen.getByRole('button', { name: 'Take review' }));

  await waitFor(() => {
    expect(apiFetch).toHaveBeenCalledWith(`/admin/reports/${reportId}`, expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'under_review', reason: 'Verified details are needed' }),
    }));
  });
  prompt.mockRestore();
});
