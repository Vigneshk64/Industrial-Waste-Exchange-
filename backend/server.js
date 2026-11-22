const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { supabase } = require('./src/supabase');
const { adminSupabase } = require('./src/adminSupabase');
const { calculateMatches } = require('./src/matching');
const { estimateTransportCost } = require('./src/transport');
const { answerIndustrialQuery } = require('./src/chatbot');
const adminRoutes = require('./src/adminRoutes');
const reportRoutes = require('./src/reportRoutes');
const notificationRoutes = require('./src/notificationRoutes');
const { requireAuth, requireCompany } = require('./src/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Admin routes — all protected by requireAuth + requireAdmin inside adminRoutes.js
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

async function getCompany(req) {
  if (req.company) return req.company;

  const { data, error } = await req.supabase
    .from('companies')
    .select('id, name')
    .eq('user_id', req.user.id)
    .single();
  if (error || !data) throw error || new Error('Company profile not found.');
  return data;
}

async function getPublicCompanyProfiles(companyIds) {
  const ids = [...new Set(companyIds.filter(Boolean))];
  if (!ids.length) return new Map();

  const [companiesResult, addressesResult] = await Promise.all([
    adminSupabase.from('companies')
      .select('id, name, industry_type, moderation_status')
      .in('id', ids),
    adminSupabase.from('addresses')
      .select('company_id, city, state')
      .in('company_id', ids)
      .eq('is_primary', true),
  ]);
  if (companiesResult.error) throw companiesResult.error;
  if (addressesResult.error) throw addressesResult.error;

  const addressByCompany = new Map((addressesResult.data || []).map((address) => [address.company_id, address]));
  return new Map((companiesResult.data || []).map((company) => {
    const address = addressByCompany.get(company.id);
    return [company.id, {
      id: company.id,
      name: company.name,
      industry_type: company.industry_type,
      location: [address?.city, address?.state].filter(Boolean).join(', '),
      account_status: company.moderation_status,
    }];
  }));
}

function sendDatabaseError(res, error) {
  console.error('Database request failed:', error.message);
  return res.status(500).json({ error: 'Unable to complete the requested operation.' });
}

// ------------------------------------------------------------------------------
// Health Check
// ------------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Industrial Waste Exchange REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------------------------------------------
// Material Categories
// ------------------------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase.from('material_categories').select('*').order('name');
    if (!error && data && data.length > 0) {
      return res.json(data);
    }
  } catch (err) {
    // fallback to standard taxonomy
  }

  res.json([
    { id: 'cat-1', name: 'Plastic', description: 'Industrial polymer scrap and pellets' },
    { id: 'cat-2', name: 'Metal', description: 'Ferrous and non-ferrous turnings and offcuts' },
    { id: 'cat-3', name: 'Organic', description: 'Agricultural by-products and biomass' },
    { id: 'cat-4', name: 'Ash', description: 'Fly ash and boiler residues' },
    { id: 'cat-5', name: 'Textile', description: 'Fabric scraps and yarn waste' },
    { id: 'cat-6', name: 'Chemical', description: 'Neutralized by-products and recovered solvents' },
  ]);
});

// ------------------------------------------------------------------------------
// Waste Listings (Provider Side)
// ------------------------------------------------------------------------------
app.get('/api/listings', requireAuth, requireCompany, async (req, res) => {
  const { category, search, status, sort, location, mine } = req.query;
  if ((req.query.limit && !/^\d+$/.test(String(req.query.limit)))
    || (req.query.offset && !/^\d+$/.test(String(req.query.offset)))) {
    return res.status(400).json({ error: 'Listing pagination values must be non-negative integers.' });
  }
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 100);
  const offset = Number.parseInt(req.query.offset, 10) || 0;

  try {
    let query = req.supabase.from('waste_listings').select('*');

    if (mine === 'true') query = query.eq('provider_id', req.company.id);
    if (category && category !== 'All') {
      query = query.eq('category_name', category);
    }
    if (status && status !== 'All') {
      query = query.eq('availability_status', status.toLowerCase());
    }
    if (location) query = query.ilike('location', `%${location}%`);

    const { data, error } = await query.order('created_at', { ascending: sort !== 'Oldest' })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    let results = data || [];
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(item =>
        (item.title && item.title.toLowerCase().includes(s)) ||
        (item.description && item.description.toLowerCase().includes(s)) ||
        (item.location && item.location.toLowerCase().includes(s))
      );
    }
    if (sort === 'Price: High to Low') {
      results.sort((a, b) => Number(b.price_per_unit || 0) - Number(a.price_per_unit || 0));
    } else if (sort === 'Price: Low to High') {
      results.sort((a, b) => Number(a.price_per_unit || 0) - Number(b.price_per_unit || 0));
    }
    const profiles = await getPublicCompanyProfiles(results.map((item) => item.provider_id));
    return res.json(results.map((item) => ({
      ...item,
      supplier_company: profiles.get(item.provider_id) || null,
      is_mine: item.provider_id === req.company.id,
    })));
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

app.post('/api/listings', requireAuth, requireCompany, async (req, res) => {
  const payload = req.body;

  if (!payload.name && !payload.title) {
    return res.status(400).json({ error: 'Material title is required' });
  }
  const quantity = Number.parseFloat(payload.quantity);
  const price = payload.price ?? payload.price_per_unit;
  const pricePerUnit = price === undefined || price === null || price === '' ? null : Number(price);
  if (!Number.isFinite(quantity) || quantity <= 0
    || (pricePerUnit !== null && (!Number.isFinite(pricePerUnit) || pricePerUnit < 0))) {
    return res.status(400).json({ error: 'Enter a positive quantity and a valid non-negative unit price.' });
  }

  try {
    const company = await getCompany(req);
    const newListing = {
      title: payload.name || payload.title,
      description: payload.description || '',
      category_name: payload.category || payload.category_name || 'Plastic',
      quantity,
      unit: payload.unit || 'kg',
      quality_grade: payload.grade || payload.quality_grade || 'Standard',
      price_per_unit: pricePerUnit,
      provider_id: company.id,
      company_name: company.name,
      location: payload.location || 'Maharashtra',
      availability_status: 'available',
      safety_notes: payload.notes || '',
      available_from: payload.date || new Date().toISOString().split('T')[0],
    };
    const { data, error } = await req.supabase.from('waste_listings').insert(newListing).select().single();
    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

app.patch('/api/listings/:id', requireAuth, requireCompany, async (req, res) => {
  const fields = {
    title: req.body.title,
    description: req.body.description,
    category_name: req.body.category_name,
    quantity: req.body.quantity,
    unit: req.body.unit,
    quality_grade: req.body.quality_grade,
    price_per_unit: req.body.price_per_unit,
    location: req.body.location,
    safety_notes: req.body.safety_notes,
    available_from: req.body.available_from,
    availability_status: req.body.availability_status,
  };
  const updates = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'At least one listing field is required.' });
  if (updates.quantity !== undefined) {
    updates.quantity = Number(updates.quantity);
    if (!Number.isFinite(updates.quantity) || updates.quantity <= 0) {
      return res.status(400).json({ error: 'Listing quantity must be a positive number.' });
    }
  }
  if (updates.price_per_unit !== undefined && updates.price_per_unit !== null) {
    updates.price_per_unit = Number(updates.price_per_unit);
    if (!Number.isFinite(updates.price_per_unit) || updates.price_per_unit < 0) {
      return res.status(400).json({ error: 'Unit price must be a non-negative number.' });
    }
  }
  if (updates.availability_status && !['available', 'booked', 'completed'].includes(updates.availability_status)) {
    return res.status(400).json({ error: 'Invalid availability status.' });
  }

  try {
    const { data, error } = await req.supabase.from('waste_listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('provider_id', req.company.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Listing not found or not owned by your company.' });
    return res.json(data);
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

app.delete('/api/listings/:id', requireAuth, requireCompany, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('waste_listings')
      .delete()
      .eq('id', req.params.id)
      .eq('provider_id', req.company.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Listing not found or not owned by your company.' });
    return res.status(204).end();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'This listing has exchange history and cannot be deleted.' });
    }
    return sendDatabaseError(res, err);
  }
});

// ------------------------------------------------------------------------------
// Material Requirements (Seeker Side - Objective 1)
// ------------------------------------------------------------------------------
app.get('/api/requirements', requireAuth, requireCompany, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('material_requirements').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

app.post('/api/requirements', requireAuth, requireCompany, async (req, res) => {
  const payload = req.body;

  if (!payload.title && !payload.name) {
    return res.status(400).json({ error: 'Required material title is required' });
  }

  try {
    const company = await getCompany(req);
    const newRequirement = {
      title: payload.title || payload.name,
      description: payload.description || '',
      category_name: payload.category || payload.category_name || 'Plastic',
      quantity_needed: parseFloat(payload.quantity_needed || payload.quantity) || 0,
      unit: payload.unit || 'kg',
      min_quality_grade: payload.grade || payload.min_quality_grade || 'Standard',
      target_price_per_unit: parseFloat(payload.price || payload.target_price_per_unit) || 0,
      seeker_id: company.id,
      company_name: company.name,
      delivery_location: payload.delivery_location || payload.location || 'Industrial Area',
      status: 'active',
    };
    const { data, error } = await req.supabase.from('material_requirements').insert(newRequirement).select().single();
    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

// ------------------------------------------------------------------------------
// Dynamic Rule-Based Matching (Objective 2)
// ------------------------------------------------------------------------------
app.get('/api/matches', requireAuth, requireCompany, async (req, res) => {
  try {
    const [lRes, rRes] = await Promise.all([
      req.supabase.from('waste_listings').select('*'),
      req.supabase.from('material_requirements').select('*'),
    ]);
    if (lRes.error) throw lRes.error;
    if (rRes.error) throw rRes.error;
    return res.json(calculateMatches(lRes.data || [], rRes.data || []));
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

// ------------------------------------------------------------------------------
// Exchange Requests (Objectives 3 & 4)
// ------------------------------------------------------------------------------
app.get('/api/requests', requireAuth, requireCompany, async (req, res) => {
  try {
    const { data, error } = await req.supabase.from('exchange_requests')
      .select('*, listing:waste_listings!exchange_requests_listing_id_fkey(id, provider_id, title, quantity, unit, category_name, quality_grade, price_per_unit, location, description)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const requests = data || [];
    const listingIds = [...new Set(requests.map((request) => request.listing_id).filter(Boolean))];
    let listingById = new Map();
    if (listingIds.length) {
      const { data: listings, error: listingError } = await adminSupabase.from('waste_listings')
        .select('id, provider_id, title, quantity, unit, category_name, quality_grade, price_per_unit, location, description')
        .in('id', listingIds);
      if (listingError) throw listingError;
      listingById = new Map((listings || []).map((listing) => [listing.id, listing]));
    }
    const enrichedRequests = requests.map((request) => ({
      ...request,
      listing: listingById.get(request.listing_id) || request.listing,
    }));
    const profiles = await getPublicCompanyProfiles(requests.flatMap((request) => [
      request.seeker_id,
      listingById.get(request.listing_id)?.provider_id || request.listing?.provider_id,
    ]));
    return res.json(enrichedRequests.map((request) => ({
      ...request,
      buyer_company: profiles.get(request.seeker_id) || null,
      supplier_company: profiles.get(request.listing?.provider_id) || null,
      is_incoming: request.listing?.provider_id === req.company.id,
    })));
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

app.get('/api/requests/:id/history', requireAuth, requireCompany, async (req, res) => {
  try {
    const { data: request, error: requestError } = await req.supabase.from('exchange_requests')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!request) return res.status(404).json({ error: 'Exchange request not found.' });

    const { data: history, error } = await adminSupabase.from('request_status_history')
      .select('id, old_status, new_status, actor_company_id, changed_at')
      .eq('request_id', req.params.id)
      .order('changed_at', { ascending: true });
    if (error) throw error;
    const actorIds = [...new Set((history || []).map((item) => item.actor_company_id).filter(Boolean))];
    const companiesResult = actorIds.length
      ? await adminSupabase.from('companies').select('id, name').in('id', actorIds)
      : { data: [], error: null };
    if (companiesResult.error) throw companiesResult.error;
    const companyNames = new Map((companiesResult.data || []).map((company) => [company.id, company.name]));
    return res.json((history || []).map((item) => ({
      ...item,
      actor_company_name: companyNames.get(item.actor_company_id) || null,
    })));
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.post('/api/requests', requireAuth, requireCompany, async (req, res) => {
  const { listing_id, quantity_requested, offered_price, message } = req.body;
  const quantity = Number.parseFloat(String(quantity_requested || '').trim());
  const offeredPrice = offered_price === undefined || offered_price === null || offered_price === ''
    ? null
    : Number(offered_price);

  if (!listing_id || !Number.isFinite(quantity) || quantity <= 0
    || !/^\d+(?:\.\d+)?(?:\s*[a-zA-Z]+)?$/.test(String(quantity_requested || '').trim())
    || (offeredPrice !== null && (!Number.isFinite(offeredPrice) || offeredPrice < 0))) {
    return res.status(400).json({ error: 'Enter a valid requested quantity and optional non-negative price.' });
  }

  try {
    const [company, listingResult] = await Promise.all([
      getCompany(req),
      req.supabase.from('waste_listings')
        .select('id, title, company_name, provider_id, moderation_status')
        .eq('id', listing_id)
        .single(),
    ]);
    if (listingResult.error?.code === 'PGRST116' || !listingResult.data) {
      return res.status(404).json({ error: 'Waste listing is not available.' });
    }
    if (listingResult.error) throw listingResult.error;
    if (!listingResult.data) {
      return res.status(404).json({ error: 'Waste listing not found.' });
    }

    const listing = listingResult.data;
    if (listing.moderation_status && listing.moderation_status !== 'active') {
      return res.status(404).json({ error: 'Waste listing is not available.' });
    }
    if (listing.provider_id === company.id) {
      return res.status(400).json({ error: 'You cannot request your own listing.' });
    }

    const { data, error } = await req.supabase.from('exchange_requests').insert({
      listing_id: listing.id,
      seeker_id: company.id,
      seeker_name: company.name,
      supplier_name: listing.company_name,
      material_name: listing.title,
      quantity_requested: quantity,
      offered_price: offeredPrice,
      message: message || '',
      status: 'pending',
    }).select().single();
    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

const transitionMap = {
  pending: 'accepted',
  accepted: 'in_transit',
  in_transit: 'completed',
};

app.patch('/api/requests/:id/advance', requireAuth, requireCompany, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: request, error: getError } = await req.supabase.from('exchange_requests').select('*').eq('id', id).single();
    if (getError?.code === 'PGRST116' || !request) return res.status(404).json({ error: 'Exchange request not found.' });
    if (getError) throw getError;

    const { data: listing, error: listingError } = await req.supabase.from('waste_listings')
      .select('provider_id')
      .eq('id', request.listing_id)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing || listing.provider_id !== req.company.id) {
      return res.status(403).json({ error: 'Only the supplier company can advance this request.' });
    }

    const nextStatus = transitionMap[request.status.toLowerCase()];
    if (!nextStatus) {
      return res.status(400).json({ error: `Cannot advance request beyond '${request.status}'` });
    }

    const { data, error } = await req.supabase.from('exchange_requests')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

app.patch('/api/requests/:id/status', requireAuth, requireCompany, async (req, res) => {
  const { status } = req.body || {};
  if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Request status must be accepted, rejected, or cancelled.' });
  }

  try {
    const { data: request, error: requestError } = await req.supabase.from('exchange_requests')
      .select('id, listing_id, seeker_id, status')
      .eq('id', req.params.id)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!request) return res.status(404).json({ error: 'Exchange request not found.' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'Only pending requests can be accepted, rejected, or cancelled.' });
    }

    const { data: listing, error: listingError } = await req.supabase.from('waste_listings')
      .select('provider_id')
      .eq('id', request.listing_id)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing) return res.status(404).json({ error: 'The listing for this request was not found.' });
    const isSupplier = listing.provider_id === req.company.id;
    const isBuyer = request.seeker_id === req.company.id;
    if ((status === 'cancelled' && !isBuyer) || (status !== 'cancelled' && !isSupplier)) {
      return res.status(403).json({
        error: status === 'cancelled'
          ? 'Only the buyer company can cancel this request.'
          : 'Only the supplier company can accept or reject this request.',
      });
    }

    const { data, error } = await req.supabase.from('exchange_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('status', 'pending')
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ error: 'This request was updated by another user. Refresh and try again.' });
    return res.json(data);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.patch('/api/requests/:id/response', requireAuth, requireCompany, async (req, res) => {
  const response = typeof req.body.response === 'string' ? req.body.response.trim() : '';
  if (!response || response.length > 2000) {
    return res.status(400).json({ error: 'A response of 1 to 2000 characters is required.' });
  }

  try {
    const { data: request, error: requestError } = await req.supabase.from('exchange_requests')
      .select('id, listing_id, status')
      .eq('id', req.params.id)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!request) return res.status(404).json({ error: 'Exchange request not found.' });
    if (!['pending', 'accepted'].includes(request.status)) {
      return res.status(409).json({ error: 'This request can no longer receive a supplier response.' });
    }

    const { data: listing, error: listingError } = await req.supabase.from('waste_listings')
      .select('provider_id')
      .eq('id', request.listing_id)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing || listing.provider_id !== req.company.id) {
      return res.status(403).json({ error: 'Only the supplier company can respond to this buyer.' });
    }

    const { data, error } = await req.supabase.from('exchange_requests')
      .update({ supplier_response: response, updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .in('status', ['pending', 'accepted'])
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ error: 'This request changed before your response was saved.' });
    return res.json(data);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.post('/api/requests/:id/feedback', requireAuth, requireCompany, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const ratingValue = Number(rating);
  if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  try {
    const { data: transaction, error: transactionError } = await req.supabase
      .from('transactions')
      .select('id')
      .eq('request_id', id)
      .single();
    if (transactionError || !transaction) return res.status(404).json({ error: 'Completed exchange not found.' });

    const { data, error } = await req.supabase.from('feedback').insert({
      transaction_id: transaction.id,
      user_id: req.user.id,
      rating: ratingValue,
      comment: (comment || '').trim(),
    }).select().single();
    if (error) throw error;
    return res.status(201).json({ message: 'Feedback recorded successfully', feedback: data });
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

// ------------------------------------------------------------------------------
// Dashboard & Environmental Impact Analytics (Objective 5: SDG 9 & 12)
// ------------------------------------------------------------------------------
app.get('/api/analytics/dashboard', requireAuth, requireCompany, async (req, res) => {
  try {
    const [lRes, rRes] = await Promise.all([
      req.supabase.from('waste_listings').select('id', { count: 'exact', head: true })
        .eq('provider_id', req.company.id)
        .eq('availability_status', 'available')
        .eq('moderation_status', 'active'),
      req.supabase.from('exchange_requests')
        .select('id, status, seeker_id, listing:waste_listings!exchange_requests_listing_id_fkey(provider_id)'),
    ]);
    if (lRes.error) throw lRes.error;
    if (rRes.error) throw rRes.error;

    const requests = (rRes.data || []).filter((request) => (
      request.seeker_id === req.company.id || request.listing?.provider_id === req.company.id
    ));
    const incoming = requests.filter((request) => request.listing?.provider_id === req.company.id);
    return res.json({
      total_listings: lRes.count || 0,
      pending_requests: incoming.filter((request) => request.status === 'pending').length,
      accepted_requests: requests.filter((request) => request.status === 'accepted').length,
      rejected_requests: requests.filter((request) => request.status === 'rejected').length,
      completed_exchanges: requests.filter((request) => request.status === 'completed').length,
    });
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

app.get('/api/analytics/impact', requireAuth, requireCompany, async (req, res) => {
  try {
    const { data: completed, error } = await req.supabase
      .from('exchange_requests')
      .select('quantity_requested')
      .eq('status', 'completed');
    if (error) throw error;

    const totalKg = (completed || []).reduce((sum, item) => sum + (Number(item.quantity_requested) || 0), 0);
    const totalTonnes = totalKg / 1000;

    // Life Cycle Assessment benchmark: 1 tonne diverted is estimated to avoid 1.85 tonnes CO2e.
    const co2AvoidedTonnes = (totalTonnes * 1.85).toFixed(2);

    return res.json({
      total_diverted_tonnes: totalTonnes.toFixed(2),
      materials_reused_kg: totalKg.toFixed(1),
      co2_avoided_tonnes: co2AvoidedTonnes,
      sdg_goals_supported: [
        { goal: 'SDG 9', name: 'Industry, Innovation, and Infrastructure', target: 'Upgrade infrastructure and retrofit industries to make them sustainable' },
        { goal: 'SDG 12', name: 'Responsible Consumption and Production', target: 'Substantially reduce waste generation through prevention, reduction, recycling, and reuse' }
      ]
    });
  } catch (err) {
    return sendDatabaseError(res, err);
  }
});

// ------------------------------------------------------------------------------
// Transport Cost Estimation (Architecture Diagram)
// ------------------------------------------------------------------------------
app.post('/api/transport/estimate', (req, res) => {
  const { origin, destination, weightKg, vehicleType } = req.body;
  const estimate = estimateTransportCost({ origin, destination, weightKg, vehicleType });
  res.json(estimate);
});

// ------------------------------------------------------------------------------
// AI Chatbot Interface (Architecture Diagram)
// ------------------------------------------------------------------------------
app.post('/api/chatbot', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message query is required' });
  }

  const response = answerIndustrialQuery(message);
  res.json(response);
});

// ------------------------------------------------------------------------------
// Predefined Help Guides (Architecture Diagram)
// ------------------------------------------------------------------------------
app.get('/api/guides', (req, res) => {
  res.json([
    {
      id: 'g-1',
      title: 'Industrial Waste Segregation & Grading',
      category: 'Compliance',
      summary: 'Guidelines on how to segregate scrap plastics, non-ferrous metals, and fly ash according to quality grade requirements.'
    },
    {
      id: 'g-2',
      title: 'Exchange Workflow & Legal Handover',
      category: 'Process',
      summary: 'Step-by-step documentation on converting an exchange request into a completed handover with signed consignment slips.'
    },
    {
      id: 'g-3',
      title: 'Transport Logistics & Freight Optimization',
      category: 'Logistics',
      summary: 'How to organize LCV/MCV freight carriers, consolidate transport routes, and minimize inter-city transit carbon footprints.'
    },
    {
      id: 'g-4',
      title: 'SDG 9 & SDG 12 Verification Framework',
      category: 'Sustainability',
      summary: 'Methodology used to calculate tonnes of landfill waste diverted and GHG emissions saved through circular raw material replacement.'
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`Industrial Waste Exchange Server running on port ${PORT}`);
});

