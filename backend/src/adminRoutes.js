const express = require('express');
const { adminSupabase } = require('./adminSupabase');
const { requireAuth, requireAdmin } = require('./authMiddleware');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMPANY_STATUSES = new Set(['active', 'suspended', 'blacklisted']);
const LISTING_STATUSES = new Set(['active', 'hidden', 'suspended', 'removed']);
const REPORT_STATUSES = new Set(['pending', 'under_review', 'resolved', 'dismissed']);
const REPORT_CATEGORIES = new Set([
  'misleading_listing',
  'unsafe_material',
  'fraudulent_company',
  'duplicate_listing',
  'prohibited_material',
  'other',
]);

async function getAllAuthUsers(client) {
  const users = [];
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users || data.users.length < perPage) break;
  }

  return users;
}

async function getAllRows(createQuery) {
  const rows = [];
  const pageSize = 1000;

  for (let offset = 0; offset < 100000; offset += pageSize) {
    const { data, error } = await createQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }

  throw new Error('The requested dataset exceeds the supported admin page limit.');
}

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function validateReason(reason) {
  return typeof reason === 'string' && reason.trim().length > 0 && reason.trim().length <= 1000;
}

function createAdminRouter(dependencies = {}) {
  const client = dependencies.adminSupabase || adminSupabase;
  const router = express.Router();
  router.use(dependencies.requireAuth || requireAuth, dependencies.requireAdmin || requireAdmin);

  router.get('/stats', async (req, res) => {
    try {
      const [listings, requests, companies, transactions, reports, users] = await Promise.all([
        client.from('waste_listings').select('id', { count: 'exact', head: true }),
        client.from('exchange_requests').select('id', { count: 'exact', head: true }),
        client.from('companies').select('id', { count: 'exact', head: true }),
        client.from('transactions').select('id', { count: 'exact', head: true }),
        client.from('moderation_reports').select('id', { count: 'exact', head: true }),
        getAllAuthUsers(client),
      ]);
      const countError = [listings, requests, companies, transactions, reports].find((result) => result.error);
      if (countError) throw countError.error;
      res.json({
        totalUsers: users.length,
        totalAdmins: users.filter((user) => user.app_metadata?.role === 'admin').length,
        totalCompanies: companies.count || 0,
        totalListings: listings.count || 0,
        totalRequests: requests.count || 0,
        totalTransactions: transactions.count || 0,
        totalReports: reports.count || 0,
      });
    } catch (error) {
      console.error('Admin statistics request failed:', error.message);
      res.status(500).json({ error: 'Unable to load admin statistics.' });
    }
  });

  router.get('/users', async (req, res) => {
    if (String(req.query.search || '').length > 200) {
      return res.status(400).json({ error: 'Search text must be 200 characters or fewer.' });
    }

    try {
      const [users, companies] = await Promise.all([
        getAllAuthUsers(client),
        getAllRows(() => client.from('companies').select('id, user_id, name, moderation_status')),
      ]);

      const companyByUserId = new Map(companies.map((company) => [company.user_id, company]));
      const search = String(req.query.search || '').trim().toLowerCase();
      const result = users.map((user) => {
        const company = companyByUserId.get(user.id);
        return {
          id: user.id,
          email: user.email,
          role: user.app_metadata?.role || 'company',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          company_id: company?.id || null,
          company_name: company?.name || null,
          company_status: company?.moderation_status || null,
        };
      }).filter((user) => !search
        || (user.email || '').toLowerCase().includes(search)
        || (user.company_name || '').toLowerCase().includes(search));

      res.json({ users: result });
    } catch (error) {
      console.error('Admin users request failed:', error.message);
      res.status(500).json({ error: 'Unable to load admin users.' });
    }
  });

  router.get('/companies', async (req, res) => {
    if (String(req.query.search || '').length > 200) {
      return res.status(400).json({ error: 'Search text must be 200 characters or fewer.' });
    }

    try {
      const [companies, users, reports, listings] = await Promise.all([
        getAllRows(() => client.from('companies').select('*').order('created_at', { ascending: false })),
        getAllAuthUsers(client),
        getAllRows(() => client.from('moderation_reports').select('reported_company_id')),
        getAllRows(() => client.from('waste_listings').select('provider_id')),
      ]);

      const usersById = new Map(users.map((user) => [user.id, user]));
      const reportCounts = new Map();
      const listingCounts = new Map();
      for (const report of reports) {
        if (report.reported_company_id) {
          reportCounts.set(report.reported_company_id, (reportCounts.get(report.reported_company_id) || 0) + 1);
        }
      }
      for (const listing of listings) {
        listingCounts.set(listing.provider_id, (listingCounts.get(listing.provider_id) || 0) + 1);
      }

      const search = String(req.query.search || '').trim().toLowerCase();
      const result = companies.map((company) => ({
        ...company,
        email: usersById.get(company.user_id)?.email || '',
        report_count: reportCounts.get(company.id) || 0,
        listing_count: listingCounts.get(company.id) || 0,
      })).filter((company) => !search
        || company.name.toLowerCase().includes(search)
        || company.email.toLowerCase().includes(search));

      res.json({ companies: result });
    } catch (error) {
      console.error('Admin companies request failed:', error.message);
      res.status(500).json({ error: 'Unable to load admin companies.' });
    }
  });

  router.get('/companies/:id', async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid company ID.' });

    try {
      const [companyResult, listings, reports] = await Promise.all([
        client.from('companies').select('*').eq('id', req.params.id).single(),
        getAllRows(() => client.from('waste_listings').select('*').eq('provider_id', req.params.id).order('created_at', { ascending: false })),
        getAllRows(() => client.from('moderation_reports').select('*').eq('reported_company_id', req.params.id).order('created_at', { ascending: false })),
      ]);
      if (companyResult.error?.code === 'PGRST116' || !companyResult.data) {
        return res.status(404).json({ error: 'Company not found.' });
      }
      if (companyResult.error) throw companyResult.error;

      const userResult = companyResult.data.user_id
        ? await client.auth.admin.getUserById(companyResult.data.user_id)
        : { data: { user: null }, error: null };
      if (userResult.error) throw userResult.error;
      res.json({
        company: { ...companyResult.data, email: userResult.data.user?.email || '' },
        listings,
        reports,
      });
    } catch (error) {
      console.error('Admin company detail request failed:', error.message);
      res.status(500).json({ error: 'Unable to load company details.' });
    }
  });

  router.patch('/companies/:id/status', async (req, res) => {
    const { status, reason } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid company ID.' });
    if (!COMPANY_STATUSES.has(status) || !validateReason(reason)) {
      return res.status(400).json({ error: 'A valid company status and moderation reason are required.' });
    }

    try {
      const { data, error } = await client.rpc('admin_set_company_status', {
        p_admin_id: req.user.id,
        p_company_id: req.params.id,
        p_status: status,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      res.json({ company: data });
    } catch (error) {
      if (/company not found/i.test(error.message || '')) {
        return res.status(404).json({ error: 'Company not found.' });
      }
      console.error('Company moderation failed:', error.message);
      res.status(500).json({ error: 'Unable to update company moderation status.' });
    }
  });

  router.get('/listings', async (req, res) => {
    const searchInput = String(req.query.search || '');
    const status = String(req.query.status || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();
    if (searchInput.length > 200 || (status && !LISTING_STATUSES.has(status)) || category.length > 100) {
      return res.status(400).json({ error: 'Invalid listing search or filter.' });
    }

    try {
      const [data, users, reports] = await Promise.all([
        getAllRows(() => client
          .from('waste_listings')
          .select('*, companies(id, name, user_id)')
          .order('created_at', { ascending: false })),
        getAllAuthUsers(client),
        getAllRows(() => client.from('moderation_reports').select('reported_listing_id')),
      ]);
      const emails = new Map(users.map((user) => [user.id, user.email || '']));
      const reportCounts = new Map();
      for (const report of reports) {
        if (report.reported_listing_id) {
          reportCounts.set(report.reported_listing_id, (reportCounts.get(report.reported_listing_id) || 0) + 1);
        }
      }

      const search = String(req.query.search || '').trim().toLowerCase();
      const listings = data.map((listing) => ({
        ...listing,
        owner_email: emails.get(listing.companies?.user_id) || '',
        report_count: reportCounts.get(listing.id) || 0,
      })).filter((listing) => (!status || listing.moderation_status === status)
        && (!category || (listing.category_name || '').toLowerCase() === category)
        && (!search || [
          listing.title,
          listing.description,
          listing.category_name,
          listing.company_name,
          listing.companies?.name,
          listing.owner_email,
        ].some((value) => String(value || '').toLowerCase().includes(search))));

      res.json({ listings });
    } catch (error) {
      console.error('Admin listings request failed:', error.message);
      res.status(500).json({ error: 'Unable to load admin listings.' });
    }
  });

  router.get('/listings/:id', async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid listing ID.' });

    try {
      const [listingResult, reports] = await Promise.all([
        client.from('waste_listings').select('*, companies(id, name, user_id)').eq('id', req.params.id).single(),
        getAllRows(() => client.from('moderation_reports').select('*').eq('reported_listing_id', req.params.id).order('created_at', { ascending: false })),
      ]);
      if (listingResult.error?.code === 'PGRST116' || !listingResult.data) {
        return res.status(404).json({ error: 'Listing not found.' });
      }
      if (listingResult.error) throw listingResult.error;

      const ownerUser = listingResult.data.companies?.user_id
        ? await client.auth.admin.getUserById(listingResult.data.companies.user_id)
        : { data: { user: null }, error: null };
      if (ownerUser.error) throw ownerUser.error;

      res.json({
        listing: {
          ...listingResult.data,
          owner_email: ownerUser.data.user?.email || '',
        },
        reports,
      });
    } catch (error) {
      console.error('Admin listing detail request failed:', error.message);
      res.status(500).json({ error: 'Unable to load listing details.' });
    }
  });

  router.get('/requests', async (req, res) => {
    try {
      const { data, error } = await client
        .from('exchange_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ requests: data || [] });
    } catch (error) {
      console.error('Admin requests request failed:', error.message);
      res.status(500).json({ error: 'Unable to load admin requests.' });
    }
  });

  router.patch('/listings/:id/status', async (req, res) => {
    const { status, reason } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid listing ID.' });
    if (!LISTING_STATUSES.has(status) || !validateReason(reason)) {
      return res.status(400).json({ error: 'A valid listing status and moderation reason are required.' });
    }

    try {
      const { data, error } = await client.rpc('admin_set_listing_status', {
        p_admin_id: req.user.id,
        p_listing_id: req.params.id,
        p_status: status,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      res.json({ listing: data });
    } catch (error) {
      if (/listing not found/i.test(error.message || '')) {
        return res.status(404).json({ error: 'Listing not found.' });
      }
      console.error('Listing moderation failed:', error.message);
      res.status(500).json({ error: 'Unable to update listing moderation status.' });
    }
  });

  router.delete('/listings/:id', async (req, res) => {
    const { reason } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid listing ID.' });
    if (!validateReason(reason)) {
      return res.status(400).json({ error: 'A reason is required to permanently delete a listing.' });
    }

    try {
      const { data, error } = await client.rpc('admin_delete_listing', {
        p_admin_id: req.user.id,
        p_listing_id: req.params.id,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      res.json({ deleted_listing_id: data });
    } catch (error) {
      if (/listing not found/i.test(error.message || '')) {
        return res.status(404).json({ error: 'Listing not found.' });
      }
      if (/exchange history/i.test(error.message || '')) {
        return res.status(409).json({ error: 'This listing has exchange history and cannot be permanently deleted. Hide it instead.' });
      }
      console.error('Listing deletion failed:', error.message);
      res.status(500).json({ error: 'Unable to permanently delete listing.' });
    }
  });

  router.get('/reports', async (req, res) => {
    const status = String(req.query.status || '').trim();
    const category = String(req.query.category || '').trim();
    if ((status && !REPORT_STATUSES.has(status)) || (category && !REPORT_CATEGORIES.has(category))) {
      return res.status(400).json({ error: 'Invalid report status or category filter.' });
    }

    try {
      const reports = await getAllRows(() => {
        let query = client.from('moderation_reports').select('*').order('created_at', { ascending: false });
        if (status) query = query.eq('status', status);
        if (category) query = query.eq('category', category);
        return query;
      });
      res.json({ reports });
    } catch (error) {
      console.error('Admin reports request failed:', error.message);
      res.status(500).json({ error: 'Unable to load reports.' });
    }
  });

  router.get('/reports/:id', async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID.' });

    try {
      const { data: report, error } = await client
        .from('moderation_reports')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error?.code === 'PGRST116' || !report) return res.status(404).json({ error: 'Report not found.' });
      if (error) throw error;

      const targetResult = report.target_type === 'listing'
        ? await client.from('waste_listings').select('*, companies(id, name, user_id)')
          .eq('id', report.reported_listing_id).maybeSingle()
        : await client.from('companies').select('*').eq('id', report.reported_company_id).maybeSingle();
      if (targetResult.error) throw targetResult.error;

      const reporterResult = report.reporter_company_id
        ? await client.from('companies').select('id, name, user_id')
          .eq('id', report.reporter_company_id).maybeSingle()
        : { data: null, error: null };
      if (reporterResult.error) throw reporterResult.error;

      const reporterUser = report.reporter_user_id
        ? await client.auth.admin.getUserById(report.reporter_user_id)
        : { data: { user: null }, error: null };
      if (reporterUser.error) throw reporterUser.error;

      let target = targetResult.data;
      if (target && report.target_type === 'company' && target.user_id) {
        const targetUser = await client.auth.admin.getUserById(target.user_id);
        if (targetUser.error) throw targetUser.error;
        target = { ...target, email: targetUser.data.user?.email || '' };
      }

      res.json({
        report,
        target,
        reporter: {
          company: reporterResult.data,
          email: reporterUser.data.user?.email || '',
        },
      });
    } catch (error) {
      console.error('Admin report detail request failed:', error.message);
      res.status(500).json({ error: 'Unable to load report details.' });
    }
  });

  router.patch('/reports/:id', async (req, res) => {
    const { status, reason } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID.' });
    if (!REPORT_STATUSES.has(status) || !validateReason(reason)) {
      return res.status(400).json({ error: 'A valid report status and handling reason are required.' });
    }

    try {
      const { data, error } = await client.rpc('admin_update_report', {
        p_admin_id: req.user.id,
        p_report_id: req.params.id,
        p_status: status,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      res.json({ report: data });
    } catch (error) {
      if (/report not found/i.test(error.message || '')) {
        return res.status(404).json({ error: 'Report not found.' });
      }
      console.error('Report handling failed:', error.message);
      res.status(500).json({ error: 'Unable to update report.' });
    }
  });

  router.get('/activity', async (req, res) => {
    if (req.query.limit && !/^\d+$/.test(String(req.query.limit))) {
      return res.status(400).json({ error: 'Activity limit must be a positive integer.' });
    }
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
    try {
      const { data, error } = await client
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      const users = await getAllAuthUsers(client);
      const emails = new Map(users.map((user) => [user.id, user.email || '']));
      res.json({
        activity: (data || []).map((entry) => ({
          ...entry,
          admin_email: emails.get(entry.admin_user_id) || '',
        })),
      });
    } catch (error) {
      console.error('Admin activity request failed:', error.message);
      res.status(500).json({ error: 'Unable to load admin activity logs.' });
    }
  });

  return router;
}

module.exports = createAdminRouter();
module.exports.createAdminRouter = createAdminRouter;
