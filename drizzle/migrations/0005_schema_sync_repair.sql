-- ============ NEXUS SCHEMA SYNC / REPAIR ============
-- Idempotent repair for environments where the repository migrations 0001-0004
-- were not applied by the host migration runner. This migration intentionally
-- consolidates their schema effects so the database can be brought to the
-- expected application schema without replaying non-idempotent policies.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_kind') THEN
    CREATE TYPE public.company_kind AS ENUM ('STUDIO_NEXUS', 'CLIENT');
  END IF;
END $$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS kind public.company_kind NOT NULL DEFAULT 'CLIENT';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_kind ON public.companies(kind);
CREATE INDEX IF NOT EXISTS idx_profiles_active_company ON public.profiles(active_company_id);

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document text,
  phone text,
  email text,
  pix_key text,
  registered_at date NOT NULL DEFAULT current_date,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  title text NOT NULL,
  service text,
  start_date date,
  end_date date,
  monthly_value numeric(14,2) NOT NULL DEFAULT 0,
  commission_percent numeric(7,4) NOT NULL DEFAULT 0,
  commission_value numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  responsible_user_id uuid,
  platform text NOT NULL,
  format text NOT NULL,
  title text,
  caption text,
  media_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  status public.finance_status NOT NULL DEFAULT 'PENDING',
  due_date date,
  paid_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  institution text,
  invested_amount numeric(14,2) NOT NULL DEFAULT 0,
  current_value numeric(14,2) NOT NULL DEFAULT 0,
  invested_at date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fiscal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  provider text,
  external_id text,
  number text,
  series text,
  access_key text,
  status text NOT NULL DEFAULT 'DRAFT',
  issued_at timestamptz,
  xml_url text,
  pdf_url text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_company_status ON public.customers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON public.customers(company_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_customers_company_document ON public.customers(company_id, document);
CREATE INDEX IF NOT EXISTS idx_customers_company_email ON public.customers(company_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_affiliates_company ON public.affiliates(company_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_company_status ON public.affiliates(company_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON public.contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_affiliate ON public.contracts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON public.contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_content_company ON public.content_items(company_id);
CREATE INDEX IF NOT EXISTS idx_content_customer ON public.content_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_content_schedule ON public.content_items(company_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_status ON public.content_items(company_id, status);
CREATE INDEX IF NOT EXISTS idx_commission_company ON public.commission_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_commission_affiliate ON public.commission_payments(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commission_status ON public.commission_payments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_investments_company ON public.investments(company_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_fiscal_company ON public.fiscal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_status ON public.fiscal_documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_fiscal_access_key ON public.fiscal_documents(access_key);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_contract ON public.accounts_receivable(contract_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_receivable_contract_initial
  ON public.accounts_receivable(contract_id) WHERE contract_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_nexus_owner() THEN p.active_company_id
    ELSE p.company_id
  END
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.tenant_access_ok()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.companies c ON c.id = CASE
      WHEN public.is_nexus_owner() THEN p.active_company_id
      ELSE p.company_id
    END
    WHERE p.id = auth.uid() AND p.status = 'ACTIVE' AND c.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_module text, _action public.perm_action)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tenant_access_ok() AND (
    public.is_nexus_owner()
    OR public.has_role(auth.uid(), 'COMPANY_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = _module AND action = _action
    )
  );
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['affiliates','contracts','content_items','commission_payments','investments','fiscal_documents']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('affiliates','affiliates'),
    ('contracts','contracts'),
    ('content_items','content'),
    ('commission_payments','commissions'),
    ('investments','investments'),
    ('fiscal_documents','fiscal')
  ) AS v(tbl, module)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_select" ON public.%1$I;', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_insert" ON public.%1$I;', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_update" ON public.%1$I;', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_delete" ON public.%1$I;', r.tbl);
    EXECUTE format('CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT TO authenticated USING (company_id = public.current_company_id() AND public.has_permission(%2$L,''VIEW''));', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "%1$s_insert" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id() AND public.has_permission(%2$L,''CREATE''));', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "%1$s_update" ON public.%1$I FOR UPDATE TO authenticated USING (company_id = public.current_company_id() AND public.has_permission(%2$L,''EDIT'')) WITH CHECK (company_id = public.current_company_id() AND public.has_permission(%2$L,''EDIT''));', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "%1$s_delete" ON public.%1$I FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.has_permission(%2$L,''DELETE''));', r.tbl, r.module);
  END LOOP;
END $$;
