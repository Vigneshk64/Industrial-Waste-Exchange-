import { apiFetch } from './api';
import { supabase } from './supabase';

const originalFetch = global.fetch;

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
    error: null,
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('apiFetch preserves plain-text error responses without consuming the body twice', async () => {
  let bodyRead = false;
  const response = {
    ok: false,
    status: 403,
    json: jest.fn().mockImplementation(async () => {
      bodyRead = true;
      throw new SyntaxError('Unexpected token');
    }),
    text: jest.fn().mockImplementation(async () => {
      if (bodyRead) throw new TypeError('body stream already read');
      bodyRead = true;
      return 'Admin role required';
    }),
  };
  global.fetch = jest.fn().mockResolvedValue(response);

  await expect(apiFetch('/admin/reports')).rejects.toThrow('Admin role required');
  expect(response.json).not.toHaveBeenCalled();
  expect(response.text).toHaveBeenCalledTimes(1);

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/admin/reports'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
    }),
  );
});
