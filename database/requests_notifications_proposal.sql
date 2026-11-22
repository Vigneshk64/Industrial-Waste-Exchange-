-- Proposal only: review and approve before running in Supabase.
-- Adds request rejection/cancellation history and persistent, owner-scoped notifications.
BEGIN;

ALTER TABLE public.exchange_requests
  ADD COLUMN IF NOT EXISTS supplier_response TEXT;

ALTER TABLE public.exchange_requests
  DROP CONSTRAINT IF EXISTS exchange_requests_status_check;
ALTER TABLE public.exchange_requests
  ADD CONSTRAINT exchange_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'in_transit', 'completed'));

CREATE TABLE IF NOT EXISTS public.request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.exchange_requests(id) ON DELETE CASCADE,
  old_status VARCHAR(25),
  new_status VARCHAR(25) NOT NULL,
  actor_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS request_status_history_request_time_idx
  ON public.request_status_history (request_id, changed_at);

ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.request_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.request_status_history TO authenticated;
GRANT ALL ON TABLE public.request_status_history TO service_role;

DROP POLICY IF EXISTS "Request history read participants" ON public.request_status_history;
CREATE POLICY "Request history read participants" ON public.request_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.exchange_requests r
    JOIN public.waste_listings l ON l.id = r.listing_id
    JOIN public.companies c ON c.id IN (r.seeker_id, l.provider_id)
    WHERE r.id = request_id AND c.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.validate_exchange_request_update()
RETURNS TRIGGER AS $$
DECLARE
  is_provider BOOLEAN;
  is_seeker BOOLEAN;
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
    OR NEW.supplier_response IS DISTINCT FROM OLD.supplier_response
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Exchange request details cannot be changed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.waste_listings l
    JOIN public.companies c ON c.id = l.provider_id
    WHERE l.id = OLD.listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ) INTO is_provider;
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = OLD.seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ) INTO is_seeker;

  IF is_provider AND NEW.status = OLD.status
    AND NEW.status IN ('pending', 'accepted') THEN
    RETURN NEW;
  END IF;

  IF is_provider AND (
    (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected'))
    OR (OLD.status = 'accepted' AND NEW.status = 'in_transit')
    OR (OLD.status = 'in_transit' AND NEW.status = 'completed')
  ) THEN
    RETURN NEW;
  END IF;
  IF is_seeker AND OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid exchange request status transition or actor';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP POLICY IF EXISTS "Exchange requests update provider" ON public.exchange_requests;
DROP POLICY IF EXISTS "Exchange requests update participants" ON public.exchange_requests;
CREATE POLICY "Exchange requests update participants" ON public.exchange_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.waste_listings l
      JOIN public.companies c ON c.id = l.provider_id
      WHERE l.id = listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR (
      status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.waste_listings l
      JOIN public.companies c ON c.id = l.provider_id
      WHERE l.id = listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR (
      status = 'cancelled'
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Moderation active request updates" ON public.exchange_requests;
CREATE POLICY "Moderation active request updates" ON public.exchange_requests
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.waste_listings l
      JOIN public.companies c ON c.id = l.provider_id
      WHERE l.id = listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR (
      status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.waste_listings l
      JOIN public.companies c ON c.id = l.provider_id
      WHERE l.id = listing_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
    )
    OR (
      status = 'cancelled'
      AND EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = seeker_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
      )
    )
  );

CREATE OR REPLACE FUNCTION public.record_request_status_history()
RETURNS TRIGGER AS $$
DECLARE
  provider_company_id UUID;
  actor_company UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT provider_id INTO provider_company_id
  FROM public.waste_listings WHERE id = NEW.listing_id;

  IF TG_OP = 'INSERT' THEN
    actor_company := NEW.seeker_id;
  ELSE
    SELECT id INTO actor_company
    FROM public.companies
    WHERE user_id = auth.uid()
      AND id IN (NEW.seeker_id, provider_company_id)
    LIMIT 1;
  END IF;

  INSERT INTO public.request_status_history (
    request_id, old_status, new_status, actor_company_id, actor_user_id
  ) VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    NEW.status,
    actor_company,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS record_request_status_history_trigger ON public.exchange_requests;
CREATE TRIGGER record_request_status_history_trigger
  AFTER INSERT OR UPDATE OF status ON public.exchange_requests
  FOR EACH ROW EXECUTE PROCEDURE public.record_request_status_history();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  request_id UUID NOT NULL REFERENCES public.exchange_requests(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  message VARCHAR(300) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS notifications_recipient_time_idx
  ON public.notifications (recipient_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_recipient_idx
  ON public.notifications (recipient_company_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE (read_at) ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

DROP POLICY IF EXISTS "Companies read own notifications" ON public.notifications;
CREATE POLICY "Companies read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = recipient_company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));

DROP POLICY IF EXISTS "Companies mark own notifications read" ON public.notifications;
CREATE POLICY "Companies mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = recipient_company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = recipient_company_id AND c.user_id = auth.uid() AND c.moderation_status = 'active'
  ));

CREATE OR REPLACE FUNCTION public.notify_listing_supplier_of_request()
RETURNS TRIGGER AS $$
DECLARE
  supplier_company UUID;
  supplier_listing_title TEXT;
  buyer_company_name TEXT;
  notification_message TEXT;
BEGIN
  SELECT l.provider_id, l.title, c.name
    INTO supplier_company, supplier_listing_title, buyer_company_name
  FROM public.waste_listings l
  JOIN public.companies c ON c.id = NEW.seeker_id
  WHERE l.id = NEW.listing_id;

  IF supplier_company IS NULL OR supplier_company = NEW.seeker_id THEN
    RAISE EXCEPTION 'A valid supplier listing is required for a request notification';
  END IF;

  notification_message := LEFT(
    buyer_company_name || ' expressed interest in your ' || supplier_listing_title || ' listing.',
    300
  );
  IF NULLIF(BTRIM(NEW.message), '') IS NOT NULL THEN
    notification_message := LEFT(notification_message || ' Message: ' || BTRIM(NEW.message), 300);
  END IF;

  INSERT INTO public.notifications (
    recipient_company_id, actor_company_id, request_id, title, message
  ) VALUES (
    supplier_company, NEW.seeker_id, NEW.id, 'New request received', notification_message
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS notify_listing_supplier_of_request_trigger ON public.exchange_requests;
CREATE TRIGGER notify_listing_supplier_of_request_trigger
  AFTER INSERT ON public.exchange_requests
  FOR EACH ROW EXECUTE PROCEDURE public.notify_listing_supplier_of_request();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END;
$$;

COMMIT;
