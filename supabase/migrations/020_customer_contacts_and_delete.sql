-- =============================================================================
-- Migration 020: Customer Contacts, Hard-Delete with Archive, Enhanced Audit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. customer_contacts — Ansprechpersonen pro Endkunde
-- -----------------------------------------------------------------------------

CREATE TABLE public.customer_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES public.client_customers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            text NOT NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text,
  phone           text,
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_contacts_customer ON public.customer_contacts(customer_id);

-- -----------------------------------------------------------------------------
-- 2. deleted_customers_archive — Archiv gelöschter Kunden (SRO-konform)
-- -----------------------------------------------------------------------------

CREATE TABLE public.deleted_customers_archive (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL,
  original_customer_id uuid NOT NULL,
  customer_data        jsonb NOT NULL,
  contacts_data        jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents_data       jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_log_data       jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at           timestamptz NOT NULL DEFAULT now(),
  reason               text
);

CREATE INDEX idx_deleted_customers_org ON public.deleted_customers_archive(organization_id);

-- -----------------------------------------------------------------------------
-- 3. Extend customer_audit_log action constraint
-- -----------------------------------------------------------------------------

ALTER TABLE public.customer_audit_log
  DROP CONSTRAINT IF EXISTS customer_audit_log_action_check;

ALTER TABLE public.customer_audit_log
  ADD CONSTRAINT customer_audit_log_action_check
  CHECK (action IN (
    'created', 'updated', 'status_changed', 'archived', 'deleted',
    'contact_added', 'contact_updated', 'contact_removed'
  ));

-- -----------------------------------------------------------------------------
-- 4. Audit trigger for customer_contacts
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_customer_contact_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.customer_audit_log(customer_id, action, changed_by, details, new_data)
    VALUES (
      NEW.customer_id, 'contact_added',
      COALESCE(NEW.created_by, auth.uid()),
      'Kontakt hinzugefügt: ' || NEW.first_name || ' ' || NEW.last_name || ' (' || NEW.role || ')',
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.customer_audit_log(customer_id, action, changed_by, details, old_data, new_data)
    VALUES (
      NEW.customer_id, 'contact_updated',
      auth.uid(),
      'Kontakt aktualisiert: ' || NEW.first_name || ' ' || NEW.last_name,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.customer_audit_log(customer_id, action, changed_by, details, old_data)
    VALUES (
      OLD.customer_id, 'contact_removed',
      auth.uid(),
      'Kontakt entfernt: ' || OLD.first_name || ' ' || OLD.last_name || ' (' || OLD.role || ')',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_contact_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_customer_contact_change();

-- -----------------------------------------------------------------------------
-- 5. RPC: delete_customer_with_archive — Archiviert und löscht Kunden
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_customer_with_archive(
  p_customer_id uuid,
  p_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _customer jsonb;
  _contacts jsonb;
  _documents jsonb;
  _audit jsonb;
  _org_id uuid;
BEGIN
  -- Snapshot customer
  SELECT to_jsonb(cc.*) INTO _customer
  FROM public.client_customers cc WHERE cc.id = p_customer_id;

  IF _customer IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  _org_id := (_customer->>'organization_id')::uuid;

  -- Verify caller is approver or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = _org_id
      AND om.user_id = auth.uid()
      AND om.role = 'approver'
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Snapshot contacts
  SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) INTO _contacts
  FROM public.customer_contacts c WHERE c.customer_id = p_customer_id;

  -- Snapshot documents + their audit logs
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'document', to_jsonb(cd),
    'audit', (
      SELECT COALESCE(jsonb_agg(to_jsonb(al)), '[]'::jsonb)
      FROM public.customer_document_audit_log al WHERE al.document_id = cd.id
    )
  )), '[]'::jsonb) INTO _documents
  FROM public.customer_documents cd WHERE cd.customer_id = p_customer_id;

  -- Snapshot customer audit log
  SELECT COALESCE(jsonb_agg(to_jsonb(al)), '[]'::jsonb) INTO _audit
  FROM public.customer_audit_log al WHERE al.customer_id = p_customer_id;

  -- Log deletion in audit before archiving
  INSERT INTO public.customer_audit_log(customer_id, action, changed_by, details, old_data)
  VALUES (
    p_customer_id, 'deleted', auth.uid(),
    'Kunde gelöscht' || COALESCE(': ' || p_reason, ''),
    _customer
  );

  -- Re-snapshot audit (now includes the 'deleted' entry)
  SELECT COALESCE(jsonb_agg(to_jsonb(al)), '[]'::jsonb) INTO _audit
  FROM public.customer_audit_log al WHERE al.customer_id = p_customer_id;

  -- Insert archive
  INSERT INTO public.deleted_customers_archive(
    organization_id, original_customer_id, customer_data, contacts_data,
    documents_data, audit_log_data, deleted_by, deleted_at, reason
  ) VALUES (
    _org_id, p_customer_id, _customer, _contacts, _documents, _audit,
    auth.uid(), now(), p_reason
  );

  -- CASCADE delete (removes customer + contacts, documents, audit logs)
  DELETE FROM public.client_customers WHERE id = p_customer_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. RLS Policies — customer_contacts
-- -----------------------------------------------------------------------------

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "customer_contacts: admin select" ON public.customer_contacts
  FOR SELECT USING (public.is_admin());

CREATE POLICY "customer_contacts: admin insert" ON public.customer_contacts
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "customer_contacts: admin update" ON public.customer_contacts
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "customer_contacts: admin delete" ON public.customer_contacts
  FOR DELETE USING (public.is_admin());

-- Client: SELECT own org
CREATE POLICY "customer_contacts: client select own org" ON public.customer_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_contacts.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- Client: editor/approver INSERT
CREATE POLICY "customer_contacts: client editor insert" ON public.customer_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_contacts.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- Client: editor/approver UPDATE
CREATE POLICY "customer_contacts: client editor update" ON public.customer_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_contacts.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- Client: editor/approver DELETE
CREATE POLICY "customer_contacts: client editor delete" ON public.customer_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = customer_contacts.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('editor', 'approver')
    )
  );

-- -----------------------------------------------------------------------------
-- 7. RLS Policies — deleted_customers_archive (read-only)
-- -----------------------------------------------------------------------------

ALTER TABLE public.deleted_customers_archive ENABLE ROW LEVEL SECURITY;

-- Admin SELECT
CREATE POLICY "deleted_archive: admin select" ON public.deleted_customers_archive
  FOR SELECT USING (public.is_admin());

-- Client: approver SELECT own org
CREATE POLICY "deleted_archive: client approver select" ON public.deleted_customers_archive
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = deleted_customers_archive.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'approver'
    )
  );
