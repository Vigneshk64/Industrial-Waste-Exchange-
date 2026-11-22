-- ==============================================================================
-- Industrial Waste Exchange Platform - Supabase PostgreSQL Schema
-- Aligned with System Architecture & ER Diagram
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. MATERIAL CATEGORIES (Standard circular economy categories)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed basic categories for selection (No mock/trash listings, pure lookup taxonomy)
INSERT INTO public.material_categories (name, description)
VALUES 
    ('Plastic', 'Industrial polymer scrap, pellets, offcuts, and packaging waste'),
    ('Metal', 'Ferrous and non-ferrous turnings, slag, offcuts, and copper/aluminium scrap'),
    ('Organic', 'Agricultural by-products, biomass, compost feed, and food processing residues'),
    ('Ash', 'Fly ash, bottom ash, boiler residues for cement and road construction'),
    ('Textile', 'Fabric scraps, yarn waste, fiber offcuts from garment manufacturing'),
    ('Chemical', 'Spent solvents, recovered acids, neutralized chemical by-products'),
    ('Construction', 'Crushed concrete, brick aggregate, drywall, and structural offcuts'),
    ('Rubber', 'Tire crumb, conveyor belting, cured/uncured rubber trims')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. COMPANIES (Profile for industrial entities linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    industry_type VARCHAR(100),
    gst_number VARCHAR(30),
    website VARCHAR(100),
    description TEXT,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (moderation_status IN ('active', 'suspended', 'blacklisted')),
    moderation_reason TEXT,
    moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. ADDRESSES (Pickup & delivery locations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    address_line VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10) NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. WASTE LISTINGS (Available waste supplied by providers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waste_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.material_categories(id),
    category_name VARCHAR(100),
    quantity DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    quality_grade VARCHAR(50),
    price_per_unit DECIMAL(12,2),
    company_name VARCHAR(100),
    location VARCHAR(100),
    pickup_address_id UUID REFERENCES public.addresses(id),
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'booked', 'completed', 'pending_review')),
    images TEXT[] DEFAULT '{}',
    safety_notes TEXT,
    available_from DATE,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (moderation_status IN ('active', 'hidden', 'suspended', 'removed')),
    moderation_reason TEXT,
    moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. MATERIAL REQUIREMENTS (Required raw materials posted by seekers - Objective 1)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seeker_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    company_name VARCHAR(100),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.material_categories(id),
    category_name VARCHAR(100),
    quantity_needed DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    min_quality_grade VARCHAR(50),
    target_price_per_unit DECIMAL(12,2),
    delivery_location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matched', 'fulfilled', 'cancelled')),
    required_by DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. EXCHANGE REQUESTS (Connecting seeker interest to provider waste)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.waste_listings(id) ON DELETE RESTRICT,
    seeker_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    seeker_name VARCHAR(100),
    supplier_name VARCHAR(100),
    material_name VARCHAR(100),
    quantity_requested DECIMAL(12,2) NOT NULL,
    offered_price DECIMAL(12,2),
    message TEXT,
    status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_transit', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TRANSACTIONS (Financial & contractual lifecycle)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.exchange_requests(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.companies(id),
    seeker_id UUID REFERENCES public.companies(id),
    material_name VARCHAR(100),
    quantity_final DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    unit_price DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. TRANSPORT DETAILS (Logistics, distance & transport cost estimation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    pickup_address_id UUID REFERENCES public.addresses(id),
    delivery_address_id UUID REFERENCES public.addresses(id),
    distance_km DECIMAL(10,2),
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    vehicle_type VARCHAR(50),
    transport_status VARCHAR(20) DEFAULT 'not_assigned' CHECK (transport_status IN ('not_assigned', 'in_transit', 'delivered')),
    pickup_date DATE,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TRANSACTION DOCUMENTS (Compliance manifests, gate passes, weighbridge slips)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. FEEDBACK (Post-exchange ratings and verification)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. MODERATION REPORTS AND IMMUTABLE ADMIN ACTIVITY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'company')),
    reported_listing_id UUID,
    reported_company_id UUID,
    category VARCHAR(40) NOT NULL CHECK (category IN (
      'misleading_listing', 'unsafe_material', 'fraudulent_company',
      'duplicate_listing', 'prohibited_material', 'other'
    )),
    reason VARCHAR(200) NOT NULL CHECK (length(btrim(reason)) > 0),
    description TEXT NOT NULL CHECK (length(btrim(description)) BETWEEN 10 AND 2000),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    handling_reason TEXT,
    handled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (
      (target_type = 'listing' AND reported_listing_id IS NOT NULL AND reported_company_id IS NULL)
      OR (target_type = 'company' AND reported_company_id IS NOT NULL AND reported_listing_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'company', 'report')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moderation_reports_status_category_created_idx
  ON public.moderation_reports (status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_reports_listing_idx
  ON public.moderation_reports (reported_listing_id);
CREATE INDEX IF NOT EXISTS moderation_reports_company_idx
  ON public.moderation_reports (reported_company_id);
CREATE INDEX IF NOT EXISTS admin_activity_logs_created_idx
  ON public.admin_activity_logs (created_at DESC);

-- Enable Row Level Security (RLS) on all public tables
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Auto-provision company profile and primary address when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.set_signup_role()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(NEW.raw_app_meta_data->>'role', '') = '' THEN
        NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
            || jsonb_build_object('role', 'company');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS set_signup_role_before_insert ON auth.users;
CREATE TRIGGER set_signup_role_before_insert
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.set_signup_role();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_company_id UUID;
BEGIN
    INSERT INTO public.companies (user_id, name, industry_type, description)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Industrial Enterprise'),
        COALESCE(NEW.raw_user_meta_data->>'industry', 'Manufacturing'),
        'Registered partner in Industrial Waste Exchange platform.'
    )
    RETURNING id INTO new_company_id;

    INSERT INTO public.addresses (company_id, address_line, city, state, country, pincode, is_primary)
    VALUES (
        new_company_id,
        COALESCE(NEW.raw_user_meta_data->>'location', 'Industrial Zone'),
        'Pune',
        'Maharashtra',
        'India',
        '411001',
        TRUE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Admin Role Support
-- Roles are stored in auth.users.app_metadata (service_role only)
-- Never in user_metadata (user-editable)
-- ============================================================

-- Helper: get current user role from JWT app_metadata (safe, server-set only)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'company');
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_company_active(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = p_company_id AND c.moderation_status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.company_exists(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = p_company_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.is_company_active(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_exists(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_active(UUID), public.company_exists(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_company_moderation_edits()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (
    NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
    OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
    OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
    OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
  ) THEN
    RAISE EXCEPTION 'Company moderation fields are admin-managed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS prevent_company_moderation_edits_trigger ON public.companies;
CREATE TRIGGER prevent_company_moderation_edits_trigger
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_company_moderation_edits();

CREATE OR REPLACE FUNCTION public.prevent_listing_moderation_edits()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (
    NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
    OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason
    OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
    OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
  ) THEN
    RAISE EXCEPTION 'Listing moderation fields are admin-managed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS prevent_listing_moderation_edits_trigger ON public.waste_listings;
CREATE TRIGGER prevent_listing_moderation_edits_trigger
  BEFORE UPDATE ON public.waste_listings
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_listing_moderation_edits();

CREATE OR REPLACE FUNCTION public.admin_set_company_status(
  p_admin_id UUID, p_company_id UUID, p_status TEXT, p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  updated_company public.companies%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_status NOT IN ('active', 'suspended', 'blacklisted') OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Valid company status and reason are required';
  END IF;
  UPDATE public.companies
    SET moderation_status = p_status, moderation_reason = BTRIM(p_reason),
        moderated_by = p_admin_id, moderated_at = NOW(), updated_at = NOW()
    WHERE id = p_company_id
    RETURNING * INTO updated_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Company not found'; END IF;
  INSERT INTO public.admin_activity_logs (admin_user_id, action, target_type, target_id, reason, details)
    VALUES (p_admin_id, 'company_status_changed', 'company', p_company_id, BTRIM(p_reason),
      jsonb_build_object('status', p_status));
  RETURN to_jsonb(updated_company);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.admin_set_listing_status(
  p_admin_id UUID, p_listing_id UUID, p_status TEXT, p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  updated_listing public.waste_listings%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_status NOT IN ('active', 'hidden', 'suspended', 'removed') OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Valid listing status and reason are required';
  END IF;
  UPDATE public.waste_listings
    SET moderation_status = p_status, moderation_reason = BTRIM(p_reason),
        moderated_by = p_admin_id, moderated_at = NOW(), updated_at = NOW()
    WHERE id = p_listing_id
    RETURNING * INTO updated_listing;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  INSERT INTO public.admin_activity_logs (admin_user_id, action, target_type, target_id, reason, details)
    VALUES (p_admin_id, 'listing_status_changed', 'listing', p_listing_id, BTRIM(p_reason),
      jsonb_build_object('status', p_status));
  RETURN to_jsonb(updated_listing);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.admin_delete_listing(
  p_admin_id UUID, p_listing_id UUID, p_reason TEXT
) RETURNS UUID AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF NULLIF(BTRIM(p_reason), '') IS NULL THEN RAISE EXCEPTION 'A deletion reason is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.waste_listings WHERE id = p_listing_id) THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.exchange_requests
    WHERE listing_id = p_listing_id
  ) THEN
    RAISE EXCEPTION 'Listing has exchange history; hide it instead';
  END IF;
  INSERT INTO public.admin_activity_logs (admin_user_id, action, target_type, target_id, reason)
    VALUES (p_admin_id, 'listing_deleted', 'listing', p_listing_id, BTRIM(p_reason));
  DELETE FROM public.waste_listings WHERE id = p_listing_id;
  RETURN p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.admin_update_report(
  p_admin_id UUID, p_report_id UUID, p_status TEXT, p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  updated_report public.moderation_reports%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_status NOT IN ('pending', 'under_review', 'resolved', 'dismissed') OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Valid report status and reason are required';
  END IF;
  UPDATE public.moderation_reports
    SET status = p_status, handling_reason = BTRIM(p_reason),
        handled_by = p_admin_id, handled_at = NOW(), updated_at = NOW()
    WHERE id = p_report_id
    RETURNING * INTO updated_report;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
  INSERT INTO public.admin_activity_logs (admin_user_id, action, target_type, target_id, reason, details)
    VALUES (p_admin_id, 'report_status_changed', 'report', p_report_id, BTRIM(p_reason),
      jsonb_build_object('status', p_status));
  RETURN to_jsonb(updated_report);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.admin_set_company_status(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_listing_status(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_listing(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_report(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_company_status(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_listing_status(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_listing(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_report(UUID, UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_exchange_request_update()
RETURNS TRIGGER AS $$
BEGIN
  IF public.get_user_role() = 'admin' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
    OR NEW.seeker_id IS DISTINCT FROM OLD.seeker_id
    OR NEW.seeker_name IS DISTINCT FROM OLD.seeker_name
    OR NEW.supplier_name IS DISTINCT FROM OLD.supplier_name
    OR NEW.material_name IS DISTINCT FROM OLD.material_name
    OR NEW.quantity_requested IS DISTINCT FROM OLD.quantity_requested
    OR NEW.offered_price IS DISTINCT FROM OLD.offered_price
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Exchange request details cannot be changed';
  END IF;

  IF NOT (
    (OLD.status = 'pending' AND NEW.status = 'accepted')
    OR (OLD.status = 'accepted' AND NEW.status = 'in_transit')
    OR (OLD.status = 'in_transit' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid exchange request status transition';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS validate_exchange_request_update_trigger ON public.exchange_requests;
CREATE TRIGGER validate_exchange_request_update_trigger
  BEFORE UPDATE ON public.exchange_requests
  FOR EACH ROW EXECUTE PROCEDURE public.validate_exchange_request_update();

CREATE OR REPLACE FUNCTION public.create_transaction_for_completed_request()
RETURNS TRIGGER AS $$
DECLARE
  listing public.waste_listings%ROWTYPE;
  transaction_price NUMERIC(12,2);
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    SELECT * INTO listing
    FROM public.waste_listings
    WHERE id = NEW.listing_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Waste listing for exchange request was not found';
    END IF;

    transaction_price := COALESCE(NEW.offered_price, listing.price_per_unit, 0);

    INSERT INTO public.transactions (
      request_id, provider_id, seeker_id, material_name, quantity_final,
      unit, unit_price, total_amount, status, completed_at
    )
    VALUES (
      NEW.id, listing.provider_id, NEW.seeker_id, NEW.material_name,
      NEW.quantity_requested, listing.unit, transaction_price,
      NEW.quantity_requested * transaction_price, 'completed', NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS create_transaction_for_completed_request_trigger ON public.exchange_requests;
CREATE TRIGGER create_transaction_for_completed_request_trigger
  AFTER UPDATE OF status ON public.exchange_requests
  FOR EACH ROW EXECUTE PROCEDURE public.create_transaction_for_completed_request();

-- Replace all policies on these tables to avoid retaining older permissive rules.
DO $$
DECLARE
  existing_policy RECORD;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'material_categories', 'companies', 'addresses', 'waste_listings',
        'material_requirements', 'exchange_requests', 'transactions',
        'transport_details', 'transaction_documents', 'feedback',
        'moderation_reports', 'admin_activity_logs'
      ])
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',
      existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  END LOOP;
END;
$$;

CREATE POLICY "Categories are readable" ON public.material_categories
  FOR SELECT USING (true);

CREATE POLICY "Companies read own" ON public.companies
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role() = 'admin');
CREATE POLICY "Companies update own" ON public.companies
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND moderation_status = 'active')
  WITH CHECK (user_id = auth.uid() AND moderation_status = 'active');

CREATE POLICY "Addresses read own" ON public.addresses
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid())
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Addresses insert own" ON public.addresses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));
CREATE POLICY "Addresses update own" ON public.addresses
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));
CREATE POLICY "Addresses delete own" ON public.addresses
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));

-- Listings are the marketplace catalog; every mutation must belong to its provider.
CREATE POLICY "Listings are readable" ON public.waste_listings
  FOR SELECT USING (
    (moderation_status = 'active' AND public.is_company_active(provider_id))
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Listings insert own" ON public.waste_listings
  FOR INSERT TO authenticated
  WITH CHECK (moderation_status = 'active' AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));
CREATE POLICY "Listings update own" ON public.waste_listings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'))
  WITH CHECK (
    moderation_status = 'active'
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active')
  );
CREATE POLICY "Listings delete own" ON public.waste_listings
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));

CREATE POLICY "Requirements are readable" ON public.material_requirements
  FOR SELECT USING (true);
CREATE POLICY "Requirements insert own" ON public.material_requirements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));
CREATE POLICY "Requirements update own" ON public.material_requirements
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));
CREATE POLICY "Requirements delete own" ON public.material_requirements
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'));

CREATE POLICY "Exchange requests read participants" ON public.exchange_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active')
    OR EXISTS (
      SELECT 1 FROM public.waste_listings l
      JOIN public.companies c ON c.id = l.provider_id
      WHERE l.id = listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Exchange requests insert own" ON public.exchange_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active')
    AND EXISTS (
      SELECT 1 FROM public.waste_listings l
      WHERE l.id = listing_id AND l.provider_id <> seeker_id
        AND l.moderation_status = 'active' AND public.is_company_active(l.provider_id)
    )
  );
CREATE POLICY "Exchange requests update provider" ON public.exchange_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.waste_listings l
      JOIN public.companies c ON c.id = l.provider_id
      WHERE l.id = listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.waste_listings l
      JOIN public.companies c ON c.id = l.provider_id
      WHERE l.id = listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
  );

CREATE POLICY "Transactions read participants" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id IN (provider_id, seeker_id) AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Transport details read participants" ON public.transport_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.companies c ON c.id IN (t.provider_id, t.seeker_id)
      WHERE t.id = transaction_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Transaction documents read participants" ON public.transaction_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.companies c ON c.id IN (t.provider_id, t.seeker_id)
      WHERE t.id = transaction_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Feedback read own" ON public.feedback
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.companies c WHERE c.user_id = auth.uid() AND c.moderation_status = 'active'
    ))
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Feedback insert for participant" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.companies c ON c.id IN (t.provider_id, t.seeker_id)
      WHERE t.id = transaction_id AND t.status = 'completed'
        AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
  );

CREATE POLICY "Reports read own or admin" ON public.moderation_reports
  FOR SELECT TO authenticated
  USING (
    (reporter_user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = reporter_company_id AND c.moderation_status = 'active'
    ))
    OR public.get_user_role() = 'admin'
  );
CREATE POLICY "Reports insert own" ON public.moderation_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_user_id = auth.uid()
    AND status = 'pending'
    AND handled_by IS NULL
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = reporter_company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    AND (
      (target_type = 'listing' AND EXISTS (
        SELECT 1 FROM public.waste_listings l
        WHERE l.id = reported_listing_id AND l.provider_id <> reporter_company_id
          AND l.moderation_status <> 'removed'
      ))
      OR (target_type = 'company' AND reported_company_id <> reporter_company_id
        AND public.company_exists(reported_company_id))
    )
  );
CREATE POLICY "Admin activity logs read admin" ON public.admin_activity_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

REVOKE ALL ON TABLE public.admin_activity_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_activity_logs TO authenticated;
GRANT ALL ON TABLE public.admin_activity_logs TO service_role;
REVOKE ALL ON TABLE public.moderation_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.moderation_reports TO authenticated;
GRANT ALL ON TABLE public.moderation_reports TO service_role;
