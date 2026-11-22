import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { getNotifications, markNotificationRead } from '../services/api';

jest.mock('../services/authProfile', () => ({
  getCurrentUserProfile: jest.fn().mockResolvedValue({
    name: 'Registered Company',
    role: 'Partner',
  }),
}));

jest.mock('../services/api', () => ({
  getNotifications: jest.fn().mockResolvedValue({
    notifications: [],
    unread_count: 0,
    recipient_company_id: 'company-id',
  }),
  markNotificationRead: jest.fn(),
}));

jest.mock('../services/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

function NavigationHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  return (
    <>
      <Sidebar isOpen={isOpen} onClose={close} onOpenChat={() => {}} onOpenHelp={() => {}} />
      <Navbar
        isNavigationOpen={isOpen}
        onToggleNavigation={() => setIsOpen((open) => !open)}
        onOpenChat={() => {}}
        onOpenHelp={() => {}}
      />
    </>
  );
}

function LocationOutput() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}{location.search}</output>;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.matchMedia = jest.fn().mockReturnValue({
    matches: true,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
});

test('mobile navigation button opens the drawer and selecting a route closes it', async () => {
  render(<MemoryRouter><NavigationHarness /></MemoryRouter>);

  const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });
  fireEvent.click(menuButton);
  expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
  await waitFor(() => expect(document.getElementById('company-navigation')).toHaveAttribute('aria-hidden', 'false'));

  fireEvent.click(screen.getByRole('link', { name: 'Materials' }));
  expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => expect(document.getElementById('company-navigation')).toHaveAttribute('aria-hidden', 'true'));
});

test('notification panel displays unread notices and opens the related request', async () => {
  getNotifications.mockResolvedValue({
    recipient_company_id: 'company-id',
    unread_count: 1,
    notifications: [{
      id: 'notice-1',
      request_id: 'request-1',
      title: 'New request received',
      buyer_company_name: 'Registered Buyer',
      material_name: 'Steel offcuts',
      message: 'Registered Buyer expressed interest in your Steel offcuts listing.',
      created_at: '2026-11-22T10:00:00.000Z',
      read_at: null,
    }],
  });
  markNotificationRead.mockResolvedValue({ id: 'notice-1' });
  render(<MemoryRouter><><Navbar onOpenChat={() => {}} onOpenHelp={() => {}} /><LocationOutput /></></MemoryRouter>);

  const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
  fireEvent.click(bell);
  expect(await screen.findByText('New request received')).toBeInTheDocument();
  expect(screen.getByText('Registered Buyer expressed interest in your Steel offcuts listing.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View request' }));

  expect(markNotificationRead).toHaveBeenCalledWith('notice-1');
  await waitFor(() => expect(screen.getByLabelText('Current path')).toHaveTextContent('/requests?request=request-1'));
});
