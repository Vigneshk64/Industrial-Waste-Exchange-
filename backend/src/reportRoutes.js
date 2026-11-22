const express = require('express');
const { adminSupabase } = require('./adminSupabase');
const { requireAuth, requireCompany } = require('./authMiddleware');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORT_CATEGORIES = new Set([
  'misleading_listing',
  'unsafe_material',
  'fraudulent_company',
  'duplicate_listing',
  'prohibited_material',
  'other',
]);

function createReportRouter(dependencies = {}) {
  const client = dependencies.adminSupabase || adminSupabase;
  const router = express.Router();
  router.use(dependencies.requireAuth || requireAuth, dependencies.requireCompany || requireCompany);

  router.post('/', async (req, res) => {
  const {
    target_type: targetType,
    listing_id: listingId,
    company_id: companyId,
    category,
    reason,
    description,
  } = req.body || {};
  const targetId = targetType === 'listing' ? listingId : companyId;

  if (!['listing', 'company'].includes(targetType)
    || !UUID_PATTERN.test(String(targetId || ''))
    || (targetType === 'listing' ? Boolean(companyId) : Boolean(listingId))
    || !REPORT_CATEGORIES.has(category)
    || typeof reason !== 'string'
    || reason.trim().length < 5
    || reason.trim().length > 200
    || typeof description !== 'string'
    || description.trim().length < 10
    || description.trim().length > 2000) {
    return res.status(400).json({ error: 'Provide a valid report target, category, reason, and description.' });
  }

  try {
    if (targetType === 'listing') {
      const { data: listing, error } = await client
        .from('waste_listings')
        .select('id, provider_id, moderation_status')
        .eq('id', listingId)
        .maybeSingle();
      if (error) throw error;
      if (!listing || listing.moderation_status === 'removed') {
        return res.status(404).json({ error: 'Reported listing not found.' });
      }
      if (listing.provider_id === req.company.id) {
        return res.status(400).json({ error: 'You cannot report your own listing.' });
      }
    } else {
      const { data: company, error } = await client
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .maybeSingle();
      if (error) throw error;
      if (!company) return res.status(404).json({ error: 'Reported company not found.' });
      if (company.id === req.company.id) {
        return res.status(400).json({ error: 'You cannot report your own company.' });
      }
    }

    const report = {
      reporter_user_id: req.user.id,
      reporter_company_id: req.company.id,
      target_type: targetType,
      reported_listing_id: targetType === 'listing' ? listingId : null,
      reported_company_id: targetType === 'company' ? companyId : null,
      category,
      reason: reason.trim(),
      description: description.trim(),
      status: 'pending',
    };
    const { data, error } = await client
      .from('moderation_reports')
      .insert(report)
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ report: data });
  } catch (error) {
    console.error('Report submission failed:', error.message);
    return res.status(500).json({ error: 'Unable to submit report.' });
  }
  });

  return router;
}

module.exports = createReportRouter();
module.exports.createReportRouter = createReportRouter;
