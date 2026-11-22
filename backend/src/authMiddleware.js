const { adminSupabase } = require('./adminSupabase');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured on the backend.');
}

/**
 * Verifies the Bearer JWT from Authorization header.
 * Attaches req.user (Supabase user object) on success.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    req.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed.' });
  }
}

/**
 * Must be used AFTER requireAuth.
 * Checks app_metadata.role === 'admin' — never trusts frontend-supplied roles.
 */
function requireAdmin(req, res, next) {
  const role = req.user?.app_metadata?.role;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator role required.' });
  }
  next();
}

/**
 * Must be used AFTER requireAuth.
 * Ensures user is an active company account and attaches its trusted company record.
 */
async function requireCompany(req, res, next) {
  const role = req.user?.app_metadata?.role || 'company';
  if (role !== 'company') {
    return res.status(403).json({ error: 'Access denied. Company account required.' });
  }

  try {
    const { data: company, error } = await req.supabase
      .from('companies')
      .select('id, name, moderation_status')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      console.error('Company access check failed:', error.message);
      return res.status(503).json({ error: 'Unable to verify company account status.' });
    }
    if (!company) {
      return res.status(403).json({ error: 'A registered company profile is required.' });
    }
    if (company.moderation_status !== 'active') {
      return res.status(403).json({
        error: `Company account is ${company.moderation_status}. Contact platform support.`,
      });
    }

    req.company = company;
    return next();
  } catch (error) {
    console.error('Company access check failed:', error.message);
    return res.status(503).json({ error: 'Unable to verify company account status.' });
  }
}

module.exports = { requireAuth, requireAdmin, requireCompany };
