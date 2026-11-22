import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExchangeRequests from './ExchangeRequests';
import { advanceRequest, fetchRequests, saveFeedback } from '../services/workflow';
import { getRequestHistory, respondToRequest, updateRequestStatus } from '../services/api';

jest.mock('../services/workflow', () => ({
  advanceRequest: jest.fn(),
  fetchRequests: jest.fn(),
  saveFeedback: jest.fn(),
}));

jest.mock('../services/api', () => ({
  getRequestHistory: jest.fn(),
  respondToRequest: jest.fn(),
  updateRequestStatus: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchRequests.mockResolvedValue([
    {
      id: 'incoming-1',
      is_incoming: true,
      material_name: 'Aluminium offcuts',
      seeker_name: 'Northstar Buyer',
      supplier_name: 'Current Company',
      quantity_requested: 120,
      status: 'pending',
      message: 'Please confirm batch availability.',
      created_at: '2026-11-20T10:00:00.000Z',
      updated_at: '2026-11-20T10:00:00.000Z',
      listing: { title: 'Aluminium offcuts', quantity: 800, unit: 'kg' },
      buyer_company: { name: 'Northstar Buyer', industry_type: 'Manufacturing', location: 'Pune' },
      supplier_company: { name: 'Current Company' },
    },
    {
      id: 'outgoing-1',
      is_incoming: false,
      material_name: 'Regrind pellets',
      seeker_name: 'Current Company',
      supplier_name: 'East Plant',
      quantity_requested: 50,
      status: 'accepted',
      listing: { title: 'Regrind pellets', quantity: 500, unit: 'kg' },
      buyer_company: { name: 'Current Company' },
      supplier_company: { name: 'East Plant', industry_type: 'Recycling', location: 'Nashik' },
    },
  ]);
  getRequestHistory.mockResolvedValue([]);
});

test('incoming and outgoing requests are separated and details use database records', async () => {
  render(<MemoryRouter><ExchangeRequests /></MemoryRouter>);

  expect(await screen.findByText('Northstar Buyer')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirm Accept' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Outgoing Requests' }));
  expect(await screen.findByText('East Plant')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirm Accept' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Incoming Requests' }));
  fireEvent.click(await screen.findByRole('button', { name: 'View details' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Please confirm batch availability.');
  expect(screen.getByRole('dialog')).toHaveTextContent('800 kg');
});
