process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const test = require('node:test');
const assert = require('node:assert/strict');
const { requireAdmin, requireCompany } = require('../src/authMiddleware');

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('admin access uses verified app_metadata and ignores frontend roles', () => {
  const adminResponse = makeResponse();
  let adminNext = false;
  requireAdmin(
    { user: { app_metadata: { role: 'admin' } }, body: { role: 'company' } },
    adminResponse,
    () => { adminNext = true; },
  );
  assert.equal(adminNext, true);

  const companyResponse = makeResponse();
  let companyNext = false;
  requireAdmin(
    { user: { app_metadata: { role: 'company' } }, body: { role: 'admin' } },
    companyResponse,
    () => { companyNext = true; },
  );
  assert.equal(companyNext, false);
  assert.equal(companyResponse.statusCode, 403);
});

test('active company access attaches the server-resolved company record', async () => {
  const req = {
    user: { id: 'user-id', app_metadata: { role: 'company' } },
    supabase: {
      from(table) {
        assert.equal(table, 'companies');
        return {
          select(fields) {
            assert.equal(fields, 'id, name, moderation_status');
            return {
              eq(column, value) {
                assert.equal(column, 'user_id');
                assert.equal(value, 'user-id');
                return {
                  maybeSingle: async () => ({
                    data: { id: 'company-id', name: 'Test company', moderation_status: 'active' },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      },
    },
  };
  const response = makeResponse();
  let nextCalled = false;

  await requireCompany(req, response, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.company.id, 'company-id');
});

test('suspended and blacklisted companies cannot pass company middleware', async () => {
  for (const moderationStatus of ['suspended', 'blacklisted']) {
    const req = {
      user: { id: 'user-id', app_metadata: { role: 'company' } },
      supabase: {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { id: 'company-id', moderation_status: moderationStatus },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
      },
    };
    const response = makeResponse();
    let nextCalled = false;

    await requireCompany(req, response, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 403);
    assert.match(response.body.error, new RegExp(moderationStatus));
  }
});
