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
    listing_id UUID REFERENCES public.waste_listings(id) ON DELETE CASCADE,
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

-- Auto-provision company profile and primary address when a new user signs up in auth.users
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Permissive public policies for authenticated web application operations
CREATE POLICY "Public read categories" ON public.material_categories FOR SELECT USING (true);
CREATE POLICY "Allow read listings" ON public.waste_listings FOR SELECT USING (true);
CREATE POLICY "Allow insert listings" ON public.waste_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update listings" ON public.waste_listings FOR UPDATE USING (true);
CREATE POLICY "Allow delete listings" ON public.waste_listings FOR DELETE USING (true);

CREATE POLICY "Allow read requirements" ON public.material_requirements FOR SELECT USING (true);
CREATE POLICY "Allow insert requirements" ON public.material_requirements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update requirements" ON public.material_requirements FOR UPDATE USING (true);

CREATE POLICY "Allow read requests" ON public.exchange_requests FOR SELECT USING (true);
CREATE POLICY "Allow insert requests" ON public.exchange_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update requests" ON public.exchange_requests FOR UPDATE USING (true);

CREATE POLICY "Allow read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update transactions" ON public.transactions FOR UPDATE USING (true);

CREATE POLICY "Allow read feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Allow insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow insert companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update companies" ON public.companies FOR UPDATE USING (true);

