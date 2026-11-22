process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { requireAdmin } = require('../src/authMiddleware');
const { createAdminRouter } = require('../src/adminRoutes');

const adminId = '550e8400-e29b-41d4-a716-446655440000';
const listingId = '550e8400-e29b-41d4-a716-446655440001';

async function startTestServer(t, router) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', router);
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

function testAuth(req, res, next) {
  req.user = {
    id: adminId,
    app_metadata: { role: req.headers['x-test-role'] || 'admin' },
  };
  next();
}

test('admin listing moderation requires a reason and writes through the trusted audit RPC', async (t) => {
  const rpcCalls = [];
  const client = {
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      return { data: { id: listingId, moderation_status: args.p_status }, error: null };
    },
  };
  const router = createAdminRouter({
    adminSupabase: client,
    requireAuth: testAuth,
    requireAdmin,
  });
  const baseUrl = await startTestServer(t, router);

  const rejected = await fetch(`${baseUrl}/api/admin/listings/${listingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'hidden', reason: '   ', admin_id: 'untrusted' }),
  });
  assert.equal(rejected.status, 400);
  assert.equal(rpcCalls.length, 0);

  const accepted = await fetch(`${baseUrl}/api/admin/listings/${listingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'hidden', reason: 'Confirmed misleading listing', admin_id: 'untrusted' }),
  });
  assert.equal(accepted.status, 200);
  assert.deepEqual(rpcCalls[0], {
    name: 'admin_set_listing_status',
    args: {
      p_admin_id: adminId,
      p_listing_id: listingId,
      p_status: 'hidden',
      p_reason: 'Confirmed misleading listing',
    },
  });
});

test('company-role callers cannot use admin moderation routes', async (t) => {
  let rpcCalled = false;
  const router = createAdminRouter({
    adminSupabase: {
      rpc: async () => {
        rpcCalled = true;
        return { data: null, error: null };
      },
    },
    requireAuth: testAuth,
    requireAdmin,
  });
  const baseUrl = await startTestServer(t, router);
  const response = await fetch(`${baseUrl}/api/admin/listings/${listingId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-test-role': 'company' },
    body: JSON.stringify({ status: 'hidden', reason: 'attempted by company' }),
  });

  assert.equal(response.status, 403);
  assert.equal(rpcCalled, false);
});
