const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabaseUrl = process.env.SUPABASE_URL || 'https://wkodgklchuvzaqzshwkl.supabase.co';
supabaseUrl = supabaseUrl.trim();

// Auto-correct if user provided only project ID without https:// or .supabase.co
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  if (!supabaseUrl.includes('.')) {
    supabaseUrl = `https://${supabaseUrl}.supabase.co`;
  } else {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}

const supabaseKey = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_WyxWhy4Z7KQLRLmAmiOAuw_r9VhPbk5').trim();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = { supabase };
