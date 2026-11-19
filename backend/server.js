const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { supabase } = require('./src/supabase');
const { calculateMatches } = require('./src/matching');
const { estimateTransportCost } = require('./src/transport');
const { answerIndustrialQuery } = require('./src/chatbot');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory fallback stores if Supabase tables are being initialized
let memoryListings = [];
let memoryRequirements = [];
let memoryRequests = [];
let memoryTransactions = [];
let memoryFeedback = [];

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
app.get('/api/listings', async (req, res) => {
  const { category, search, status, sort } = req.query;

  try {
    let query = supabase.from('waste_listings').select('*');

    if (category && category !== 'All') {
      query = query.eq('category_name', category);
    }
    if (status && status !== 'All') {
      query = query.eq('availability_status', status.toLowerCase());
    }

    const { data, error } = await query;
    if (!error && data) {
      let results = data;
      if (search) {
        const s = search.toLowerCase();
        results = results.filter(item => 
          (item.title && item.title.toLowerCase().includes(s)) ||
          (item.description && item.description.toLowerCase().includes(s)) ||
          (item.location && item.location.toLowerCase().includes(s))
        );
      }
      return res.json(results);
    }
  } catch (err) {
    // Fall back to memory store
  }

  // Filter memory store
  let results = [...memoryListings];
  if (category && category !== 'All') {
    results = results.filter(item => (item.category_name || item.category) === category);
  }
  if (status && status !== 'All') {
    results = results.filter(item => (item.availability_status || item.status) === status);
  }
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(item => 
      (item.title && item.title.toLowerCase().includes(s)) ||
      (item.name && item.name.toLowerCase().includes(s))
    );
  }
  if (sort === 'Price: High to Low') {
    results.sort((a, b) => Number(b.price_per_unit || b.price || 0) - Number(a.price_per_unit || a.price || 0));
  } else if (sort === 'Price: Low to High') {
    results.sort((a, b) => Number(a.price_per_unit || a.price || 0) - Number(b.price_per_unit || b.price || 0));
  }

  res.json(results);
});

app.post('/api/listings', async (req, res) => {
  const payload = req.body;

  if (!payload.name && !payload.title) {
    return res.status(400).json({ error: 'Material title is required' });
  }

  const newListing = {
    id: `listing-${Date.now()}`,
    title: payload.name || payload.title,
    description: payload.description || '',
    category_name: payload.category || payload.category_name || 'Plastic',
    quantity: parseFloat(payload.quantity) || 0,
    unit: payload.unit || 'kg',
    quality_grade: payload.grade || payload.quality_grade || 'Standard',
    price_per_unit: parseFloat(payload.price) || 0,
    company_name: payload.company || 'Your Enterprise',
    location: payload.location || 'Maharashtra',
    availability_status: 'available',
    safety_notes: payload.notes || '',
    available_from: payload.date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('waste_listings').insert([newListing]).select();
    if (!error && data && data.length > 0) {
      return res.status(201).json(data[0]);
    }
  } catch (err) {
    // Save to memory
  }

  memoryListings.unshift(newListing);
  res.status(201).json(newListing);
});

// ------------------------------------------------------------------------------
// Material Requirements (Seeker Side - Objective 1)
// ------------------------------------------------------------------------------
app.get('/api/requirements', async (req, res) => {
  try {
    const { data, error } = await supabase.from('material_requirements').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      return res.json(data);
    }
  } catch (err) {
    // memory store fallback
  }

  res.json(memoryRequirements);
});

app.post('/api/requirements', async (req, res) => {
  const payload = req.body;

  if (!payload.title && !payload.name) {
    return res.status(400).json({ error: 'Required material title is required' });
  }

  const newRequirement = {
    id: `req-${Date.now()}`,
    title: payload.title || payload.name,
    description: payload.description || '',
    category_name: payload.category || payload.category_name || 'Plastic',
    quantity_needed: parseFloat(payload.quantity_needed || payload.quantity) || 0,
    unit: payload.unit || 'kg',
    min_quality_grade: payload.grade || payload.min_quality_grade || 'Standard',
    target_price_per_unit: parseFloat(payload.price || payload.target_price_per_unit) || 0,
    company_name: payload.company || 'Material Seeker Ltd.',
    delivery_location: payload.delivery_location || payload.location || 'Industrial Area',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('material_requirements').insert([newRequirement]).select();
    if (!error && data && data.length > 0) {
      return res.status(201).json(data[0]);
    }
  } catch (err) {
    // save to memory
  }

  memoryRequirements.unshift(newRequirement);
  res.status(201).json(newRequirement);
});

// ------------------------------------------------------------------------------
// Dynamic Rule-Based Matching (Objective 2)
// ------------------------------------------------------------------------------
app.get('/api/matches', async (req, res) => {
  let listings = [];
  let requirements = [];

  try {
    const [lRes, rRes] = await Promise.all([
      supabase.from('waste_listings').select('*'),
      supabase.from('material_requirements').select('*'),
    ]);

    if (!lRes.error && lRes.data) listings = lRes.data;
    if (!rRes.error && rRes.data) requirements = rRes.data;
  } catch (err) {
    // use memory
  }

  if (listings.length === 0) listings = memoryListings;
  if (requirements.length === 0) requirements = memoryRequirements;

  const matches = calculateMatches(listings, requirements);
  res.json(matches);
});

// ------------------------------------------------------------------------------
// Exchange Requests (Objectives 3 & 4)
// ------------------------------------------------------------------------------
app.get('/api/requests', async (req, res) => {
  try {
    const { data, error } = await supabase.from('exchange_requests').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      return res.json(data);
    }
  } catch (err) {
    // fallback
  }

  res.json(memoryRequests);
});

app.post('/api/requests', async (req, res) => {
  const { listing_id, material_name, supplier_name, seeker_name, quantity_requested, offered_price, message } = req.body;

  if (!quantity_requested) {
    return res.status(400).json({ error: 'Requested quantity is required' });
  }

  const newRequest = {
    id: `req-tx-${Date.now()}`,
    listing_id: listing_id || null,
    material_name: material_name || 'Industrial Material',
    supplier_name: supplier_name || 'Waste Supplier',
    seeker_name: seeker_name || 'Your Enterprise',
    quantity_requested: parseFloat(quantity_requested) || 0,
    offered_price: parseFloat(offered_price) || 0,
    message: message || '',
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('exchange_requests').insert([newRequest]).select();
    if (!error && data && data.length > 0) {
      return res.status(201).json(data[0]);
    }
  } catch (err) {
    // fallback
  }

  memoryRequests.unshift(newRequest);
  res.status(201).json(newRequest);
});

const transitionMap = {
  pending: 'accepted',
  accepted: 'in_transit',
  in_transit: 'completed',
};

app.patch('/api/requests/:id/advance', async (req, res) => {
  const { id } = req.params;

  let request = memoryRequests.find(r => r.id === id);

  try {
    const { data } = await supabase.from('exchange_requests').select('*').eq('id', id).single();
    if (data) request = data;
  } catch (err) {}

  if (!request) {
    return res.status(404).json({ error: 'Exchange request not found' });
  }

  const nextStatus = transitionMap[request.status.toLowerCase()];
  if (!nextStatus) {
    return res.status(400).json({ error: `Cannot advance request beyond '${request.status}'` });
  }

  const updatedFields = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('exchange_requests').update(updatedFields).eq('id', id).select();
    if (!error && data && data.length > 0) {
      return res.json(data[0]);
    }
  } catch (err) {}

  Object.assign(request, updatedFields);
  res.json(request);
});

app.post('/api/requests/:id/feedback', async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  const feedbackRecord = {
    id: `fb-${Date.now()}`,
    transaction_id: id,
    rating: parseInt(rating, 10),
    comment: (comment || '').trim(),
    created_at: new Date().toISOString(),
  };

  memoryFeedback.push(feedbackRecord);
  res.status(201).json({ message: 'Feedback recorded successfully', feedback: feedbackRecord });
});

// ------------------------------------------------------------------------------
// Dashboard & Environmental Impact Analytics (Objective 5: SDG 9 & 12)
// ------------------------------------------------------------------------------
app.get('/api/analytics/dashboard', async (req, res) => {
  let listingsCount = memoryListings.length;
  let requestsCount = memoryRequests.length;
  let completedCount = memoryRequests.filter(r => r.status === 'completed').length;
  let matchesCount = 0;

  try {
    const [lRes, rRes] = await Promise.all([
      supabase.from('waste_listings').select('id, quantity, price_per_unit'),
      supabase.from('exchange_requests').select('id, status, quantity_requested, offered_price'),
    ]);

    if (!lRes.error && lRes.data) {
      listingsCount = lRes.data.length;
    }
    if (!rRes.error && rRes.data) {
      requestsCount = rRes.data.length;
      completedCount = rRes.data.filter(r => r.status === 'completed').length;
    }
  } catch (err) {}

  // Waste reused in tonnes & Cost savings
  const totalKgReused = memoryRequests
    .filter(r => r.status === 'completed')
    .reduce((acc, curr) => acc + (parseFloat(curr.quantity_requested) || 0), 0);
  
  const wasteReusedTonnes = (totalKgReused / 1000).toFixed(2);
  const costSavingsInr = Math.round(totalKgReused * 35); // Benchmark INR 35/kg savings over virgin feed

  res.json({
    total_listings: listingsCount,
    active_matches: matchesCount,
    pending_requests: requestsCount - completedCount,
    completed_exchanges: completedCount,
    waste_reused_tonnes: wasteReusedTonnes,
    cost_savings_inr: costSavingsInr,
  });
});

app.get('/api/analytics/impact', (req, res) => {
  const completed = memoryRequests.filter(r => r.status === 'completed');
  const totalKg = completed.reduce((sum, item) => sum + (parseFloat(item.quantity_requested) || 0), 0);
  const totalTonnes = totalKg / 1000;
  
  // Life Cycle Assessment (LCA) benchmark conversions:
  // 1 tonne industrial waste diverted = approx 1.85 tonnes CO2 equivalent avoided
  const co2AvoidedTonnes = (totalTonnes * 1.85).toFixed(2);

  res.json({
    total_diverted_tonnes: totalTonnes.toFixed(2),
    materials_reused_kg: totalKg.toFixed(1),
    co2_avoided_tonnes: co2AvoidedTonnes,
    sdg_goals_supported: [
      { goal: 'SDG 9', name: 'Industry, Innovation, and Infrastructure', target: 'Upgrade infrastructure and retrofit industries to make them sustainable' },
      { goal: 'SDG 12', name: 'Responsible Consumption and Production', target: 'Substantially reduce waste generation through prevention, reduction, recycling, and reuse' }
    ]
  });
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

