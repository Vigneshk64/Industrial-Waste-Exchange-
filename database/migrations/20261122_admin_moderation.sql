BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

ALTER TABLE public.waste_listings
  ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass
      AND conname = 'companies_moderation_status_check'
  ) THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_moderation_status_check
      CHECK (moderation_status IN ('active', 'suspended', 'blacklisted'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.waste_listings'::regclass
      AND conname = 'waste_listings_moderation_status_check'
  ) THEN
    ALTER TABLE public.waste_listings ADD CONSTRAINT waste_listings_moderation_status_check
      CHECK (moderation_status IN ('active', 'hidden', 'suspended', 'removed'));
  END IF;
END;
$$;

DO $$
DECLARE
  listing_fk RECORD;
  listing_attnum SMALLINT;
  id_attnum SMALLINT;
BEGIN
  SELECT attnum INTO listing_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.exchange_requests'::regclass
    AND attname = 'listing_id'
    AND NOT attisdropped;
  SELECT attnum INTO id_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.waste_listings'::regclass
    AND attname = 'id'
    AND NOT attisdropped;

  SELECT * INTO listing_fk
  FROM pg_catalog.pg_constraint
  WHERE conrelid = 'public.exchange_requests'::regclass
    AND conname = 'exchange_requests_listing_id_fkey'
    AND contype = 'f';

  IF NOT FOUND THEN
    ALTER TABLE public.exchange_requests
      ADD CONSTRAINT exchange_requests_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES public.waste_listings(id) ON DELETE RESTRICT;
  ELSIF listing_fk.confrelid <> 'public.waste_listings'::regclass
    OR listing_fk.conkey <> ARRAY[listing_attnum]::SMALLINT[]
    OR listing_fk.confkey <> ARRAY[id_attnum]::SMALLINT[]
    OR listing_fk.confdeltype <> 'r' THEN
    ALTER TABLE public.exchange_requests DROP CONSTRAINT exchange_requests_listing_id_fkey;
    ALTER TABLE public.exchange_requests
      ADD CONSTRAINT exchange_requests_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES public.waste_listings(id) ON DELETE RESTRICT;
  ELSIF NOT listing_fk.convalidated THEN
    ALTER TABLE public.exchange_requests VALIDATE CONSTRAINT exchange_requests_listing_id_fkey;
  END IF;
END;
$$;

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
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.moderation_reports'::regclass
      AND conname = 'moderation_reports_reason_check'
  ) THEN
    ALTER TABLE public.moderation_reports ADD CONSTRAINT moderation_reports_reason_check
      CHECK (length(btrim(reason)) > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.moderation_reports'::regclass
      AND conname = 'moderation_reports_description_check'
  ) THEN
    ALTER TABLE public.moderation_reports ADD CONSTRAINT moderation_reports_description_check
      CHECK (length(btrim(description)) BETWEEN 10 AND 2000);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.admin_activity_logs'::regclass
      AND conname = 'admin_activity_logs_reason_check'
  ) THEN
    ALTER TABLE public.admin_activity_logs ADD CONSTRAINT admin_activity_logs_reason_check
      CHECK (length(btrim(reason)) > 0);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS moderation_reports_status_category_created_idx
  ON public.moderation_reports (status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_reports_listing_idx
  ON public.moderation_reports (reported_listing_id);
CREATE INDEX IF NOT EXISTS moderation_reports_company_idx
  ON public.moderation_reports (reported_company_id);
CREATE INDEX IF NOT EXISTS admin_activity_logs_created_idx
  ON public.admin_activity_logs (created_at DESC);

ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

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
  IF auth.role() IS DISTINCT FROM 'service_role' AND (
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
  IF auth.role() IS DISTINCT FROM 'service_role' AND (
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
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_admin_id IS NULL OR p_status IS NULL
    OR p_status NOT IN ('active', 'suspended', 'blacklisted')
    OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
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
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_admin_id IS NULL OR p_status IS NULL
    OR p_status NOT IN ('active', 'hidden', 'suspended', 'removed')
    OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
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
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_admin_id IS NULL THEN RAISE EXCEPTION 'Admin user is required'; END IF;
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
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_admin_id IS NULL OR p_status IS NULL
    OR p_status NOT IN ('pending', 'under_review', 'resolved', 'dismissed')
    OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
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

-- Add admin visibility without replacing existing application read policies.
CREATE POLICY "Moderation admins read all companies" ON public.companies
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Moderation admins read all listings" ON public.waste_listings
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Moderation report readers" ON public.moderation_reports
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR (
      reporter_user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = reporter_company_id AND c.moderation_status = 'active'
      )
    )
  );
CREATE POLICY "Moderation report reader guard" ON public.moderation_reports
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR (
      reporter_user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = reporter_company_id AND c.moderation_status = 'active'
      )
    )
  );
CREATE POLICY "Moderation report inserts" ON public.moderation_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_user_id = auth.uid()
    AND reporter_company_id IS NOT NULL
    AND status = 'pending'
    AND handled_by IS NULL
    AND handled_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = reporter_company_id
        AND c.user_id = auth.uid()
        AND c.moderation_status = 'active'
    )
    AND (
      (
        target_type = 'listing'
        AND EXISTS (
          SELECT 1 FROM public.waste_listings l
          WHERE l.id = reported_listing_id
            AND l.provider_id <> reporter_company_id
            AND l.moderation_status <> 'removed'
        )
      )
      OR (
        target_type = 'company'
        AND reported_company_id <> reporter_company_id
        AND public.company_exists(reported_company_id)
      )
    )
  );
CREATE POLICY "Moderation report insert guard" ON public.moderation_reports
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    reporter_user_id = auth.uid()
    AND reporter_company_id IS NOT NULL
    AND status = 'pending'
    AND handled_by IS NULL
    AND handled_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = reporter_company_id
        AND c.user_id = auth.uid()
        AND c.moderation_status = 'active'
    )
    AND (
      (
        target_type = 'listing'
        AND EXISTS (
          SELECT 1 FROM public.waste_listings l
          WHERE l.id = reported_listing_id
            AND l.provider_id <> reporter_company_id
            AND l.moderation_status <> 'removed'
        )
      )
      OR (
        target_type = 'company'
        AND reported_company_id <> reporter_company_id
        AND public.company_exists(reported_company_id)
      )
    )
  );

CREATE POLICY "Moderation admins read audit logs" ON public.admin_activity_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');
CREATE POLICY "Moderation audit log reader guard" ON public.admin_activity_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

-- These restrictive policies preserve the existing permissive workflow policies,
-- while preventing any broader legacy policy from bypassing ownership or status checks.
CREATE POLICY "Moderation active company updates" ON public.companies
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND moderation_status = 'active')
  WITH CHECK (user_id = auth.uid() AND moderation_status = 'active');

CREATE POLICY "Moderation active address inserts" ON public.addresses
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));
CREATE POLICY "Moderation active address updates" ON public.addresses
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));
CREATE POLICY "Moderation active address deletes" ON public.addresses
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));

CREATE POLICY "Moderation active listing inserts" ON public.waste_listings
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    moderation_status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
  );
CREATE POLICY "Moderation active listing updates" ON public.waste_listings
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ))
  WITH CHECK (
    moderation_status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
  );
CREATE POLICY "Moderation active listing deletes" ON public.waste_listings
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = provider_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));

CREATE POLICY "Moderation active requirement inserts" ON public.material_requirements
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));
CREATE POLICY "Moderation active requirement updates" ON public.material_requirements
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));
CREATE POLICY "Moderation active requirement deletes" ON public.material_requirements
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));

CREATE POLICY "Moderation active request inserts" ON public.exchange_requests
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.waste_listings l
      WHERE l.id = listing_id
        AND l.provider_id <> seeker_id
        AND l.moderation_status = 'active'
        AND public.is_company_active(l.provider_id)
    )
  );
CREATE POLICY "Moderation active request updates" ON public.exchange_requests
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.waste_listings l
    JOIN public.companies c ON c.id = l.provider_id
    WHERE l.id = listing_id
      AND c.user_id = auth.uid()
      AND c.moderation_status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.waste_listings l
    JOIN public.companies c ON c.id = l.provider_id
    WHERE l.id = listing_id
      AND c.user_id = auth.uid()
      AND c.moderation_status = 'active'
  ));

CREATE POLICY "Moderation active feedback inserts" ON public.feedback
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.companies c ON c.id IN (t.provider_id, t.seeker_id)
      WHERE t.id = transaction_id
        AND t.status = 'completed'
        AND c.user_id = auth.uid()
        AND c.moderation_status = 'active'
    )
  );

REVOKE ALL ON TABLE public.moderation_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.moderation_reports TO authenticated;
GRANT ALL ON TABLE public.moderation_reports TO service_role;
REVOKE ALL ON TABLE public.admin_activity_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_activity_logs TO authenticated;
GRANT ALL ON TABLE public.admin_activity_logs TO service_role;


COMMIT;
