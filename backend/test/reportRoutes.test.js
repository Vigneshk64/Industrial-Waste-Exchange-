process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createReportRouter } = require('../src/reportRoutes');

const reporterUserId = '550e8400-e29b-41d4-a716-446655440000';
const reporterCompanyId = '550e8400-e29b-41d4-a716-446655440001';
const targetListingId = '550e8400-e29b-41d4-a716-446655440002';
const targetCompanyId = '550e8400-e29b-41d4-a716-446655440003';

async function startTestServer(t, router) {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', router);
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

function testAuth(req, res, next) {
  req.user = { id: reporterUserId, app_metadata: { role: 'company' } };
  req.company = { id: reporterCompanyId, name: 'Reporter Inc.', moderation_status: 'active' };
  next();
}

function makeClient(targetProviderId = '550e8400-e29b-41d4-a716-446655440004') {
  const insertedReports = [];
  return {
    insertedReports,
    from(table) {
      if (table === 'waste_listings') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { id: targetListingId, provider_id: targetProviderId, moderation_status: 'active' },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }
      if (table === 'companies') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: { id: targetCompanyId }, error: null }),
                };
              },
            };
          },
        };
      }
      if (table === 'moderation_reports') {
        return {
          insert(report) {
            insertedReports.push(report);
            return {
              select() {
                return {
                  single: async () => ({ data: { ...report, id: 'report-id' }, error: null }),
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

test('company report submissions validate input and derive reporter IDs from verified identity', async (t) => {
  const client = makeClient();
  const router = createReportRouter({
    adminSupabase: client,
    requireAuth: testAuth,
    requireCompany: (req, res, next) => next(),
  });
  const baseUrl = await startTestServer(t, router);

  const invalid = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_type: 'listing',
      listing_id: targetListingId,
      category: 'unknown',
      reason: '',
      description: 'too short',
      reporter_user_id: 'attacker',
    }),
  });
  assert.equal(invalid.status, 400);
  assert.equal(client.insertedReports.length, 0);

  const submitted = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_type: 'listing',
      listing_id: targetListingId,
      category: 'unsafe_material',
      reason: 'Safety details missing',
      description: 'The listing describes chemical material but contains no handling information.',
      reporter_user_id: 'attacker',
      reporter_company_id: 'attacker',
    }),
  });
  assert.equal(submitted.status, 201);
  assert.deepEqual(client.insertedReports[0], {
    reporter_user_id: reporterUserId,
    reporter_company_id: reporterCompanyId,
    target_type: 'listing',
    reported_listing_id: targetListingId,
    reported_company_id: null,
    category: 'unsafe_material',
    reason: 'Safety details missing',
    description: 'The listing describes chemical material but contains no handling information.',
    status: 'pending',
  });
});

test('companies cannot report their own listings or themselves', async (t) => {
  const client = makeClient(reporterCompanyId);
  const router = createReportRouter({
    adminSupabase: client,
    requireAuth: testAuth,
    requireCompany: (req, res, next) => next(),
  });
  const baseUrl = await startTestServer(t, router);
  const reportBody = {
    category: 'other',
    reason: 'Possible conflict',
    description: 'This report is included to verify company ownership checks.',
  };

  const ownListing = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...reportBody, target_type: 'listing', listing_id: targetListingId }),
  });
  assert.equal(ownListing.status, 400);

  const ownCompanyClient = makeClient();
  const ownCompanyRouter = createReportRouter({
    adminSupabase: {
      from(table) {
        if (table === 'companies') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: { id: reporterCompanyId }, error: null }),
                  };
                },
              };
            },
          };
        }
        return ownCompanyClient.from(table);
      },
    },
    requireAuth: testAuth,
    requireCompany: (req, res, next) => next(),
  });
  const ownCompanyBase = await startTestServer(t, ownCompanyRouter);
  const ownCompany = await fetch(`${ownCompanyBase}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...reportBody, target_type: 'company', company_id: targetCompanyId }),
  });
  assert.equal(ownCompany.status, 400);
});
