process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createNotificationRouter } = require('../src/notificationRoutes');

const companyId = '550e8400-e29b-41d4-a716-446655440001';
const notificationId = '550e8400-e29b-41d4-a716-446655440002';

async function startTestServer(t, router) {
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', router);
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}/api/notifications`;
}

function testIdentity(req, res, next) {
  req.user = { id: 'auth-user-id' };
  req.company = { id: companyId, moderation_status: 'active' };
  next();
}

function makeClient() {
  const queries = [];
  return {
    queries,
    from(table) {
      const query = { table, filters: [], operation: 'select' };
      queries.push(query);
      const builder = {
        select() { return builder; },
        update(payload) { query.operation = 'update'; query.payload = payload; return builder; },
        eq(column, value) { query.filters.push([column, value]); return builder; },
        is(column, value) { query.filters.push([column, value]); return builder; },
        order() { return builder; },
        limit() { return builder; },
        maybeSingle: async () => ({ data: { id: notificationId, read_at: '2026-11-22T00:00:00Z' }, error: null }),
        then(resolve, reject) {
          if (table === 'notifications') return Promise.resolve({ data: [], error: null }).then(resolve, reject);
          if (table === 'companies' || table === 'exchange_requests') return Promise.resolve({ data: [], error: null }).then(resolve, reject);
          return Promise.reject(new Error(`Unexpected table: ${table}`)).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

test('notification reads and mark-as-read always scope updates to the server-resolved company', async (t) => {
  const client = makeClient();
  const router = createNotificationRouter({
    adminSupabase: client,
    requireAuth: testIdentity,
    requireCompany: (req, res, next) => next(),
  });
  const baseUrl = await startTestServer(t, router);

  const listResponse = await fetch(baseUrl);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(client.queries[0].filters, [['recipient_company_id', companyId]]);

  const updateResponse = await fetch(`${baseUrl}/${notificationId}/read`, { method: 'PATCH' });
  assert.equal(updateResponse.status, 200);
  const updateQuery = client.queries.find((query) => query.operation === 'update');
  assert.deepEqual(updateQuery.filters, [
    ['id', notificationId],
    ['recipient_company_id', companyId],
    ['read_at', null],
  ]);
});
