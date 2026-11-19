import { isSupabaseConfigured, supabase } from './supabase';
import { fetchListings, fetchRequests } from './workflow';

const LOCAL_PROFILE_KEY = 'wasteExchangeUserProfile';

export async function getCurrentUserProfile() {
  let profile = {
    name: 'Industrial Partner Enterprise',
    contact: 'Authorized Representative',
    email: 'user@company.com',
    phone: '+91 (Not specified)',
    industry: 'Manufacturing & Circular Economy',
    location: 'Maharashtra, India',
    role: 'Waste Supplier & Seeker',
    description: 'Registered industrial enterprise participating in circular waste exchange and secondary raw material utilization.',
    totalListings: 0,
    completedExchanges: 0,
    status: 'Verified Partner',
  };

  // 1. Check local saved profile edits
  try {
    const saved = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (saved) {
      profile = { ...profile, ...JSON.parse(saved) };
    }
  } catch {}

  // 2. Fetch live credentials from Supabase Auth if available
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        profile.email = user.email || profile.email;
        const meta = user.user_metadata || {};

        if (meta.company_name) profile.name = meta.company_name;
        if (meta.full_name) profile.contact = meta.full_name;
        if (meta.phone) profile.phone = meta.phone;
        if (meta.industry) profile.industry = meta.industry;
        if (meta.location) profile.location = meta.location;
        if (meta.company_role) profile.role = meta.company_role;
        if (meta.description) profile.description = meta.description;

        // Try reading public.companies table
        try {
          const { data: companyRecord } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (companyRecord) {
            profile.name = companyRecord.name || profile.name;
            profile.industry = companyRecord.industry_type || profile.industry;
            profile.description = companyRecord.description || profile.description;
          }
        } catch {}
      }
    } catch {}
  }

  // 3. Compute real live statistics from listings and requests
  try {
    const [listings, requests] = await Promise.all([
      fetchListings(),
      fetchRequests(),
    ]);

    if (Array.isArray(listings)) {
      profile.totalListings = listings.length;
    }

    if (Array.isArray(requests)) {
      profile.completedExchanges = requests.filter(
        (r) => (r.status || '').toLowerCase() === 'completed'
      ).length;
    }
  } catch {}

  return profile;
}

export async function updateUserProfile(updatedFields) {
  // 1. Save locally
  const current = await getCurrentUserProfile();
  const merged = { ...current, ...updatedFields };
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(merged));
  } catch {}

  // 2. Update Supabase Auth user_metadata
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.updateUser({
        data: {
          company_name: merged.name,
          full_name: merged.contact,
          phone: merged.phone,
          industry: merged.industry,
          location: merged.location,
          company_role: merged.role,
          description: merged.description,
        },
      });

      // Also update public.companies if present
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('companies')
          .update({
            name: merged.name,
            industry_type: merged.industry,
            description: merged.description,
          })
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.warn('Could not update remote Supabase profile', err);
    }
  }

  // Dispatch custom window event so Navbar and components refresh immediately
  window.dispatchEvent(new Event('user-profile-updated'));
  return merged;
}
