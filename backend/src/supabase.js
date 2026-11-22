const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabaseUrl = process.env.SUPABASE_URL || '';
supabaseUrl = supabaseUrl.trim();

const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured on the backend.');
}

// Auto-correct if user provided only project ID without https:// or .supabase.co
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  if (!supabaseUrl.includes('.')) {
    supabaseUrl = `https://${supabaseUrl}.supabase.co`;
  } else {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = { supabase };
