-- ============ NEXUS SCHEMA REPAIR V2 ============
-- Repairs partially-created tables left behind when an earlier
-- CREATE TABLE IF NOT EXISTS ran against an incomplete schema.
-- Idempotent: safe to run on already-correct databases.

-- AFFILIATES
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS document text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS registered_at date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS status public.user_status DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.affiliates
SET
  full_name = COALESCE(full_name, 'Sem nome'),
  registered_at = COALESCE(registered_at, current_date),
  status = COALESCE(status, 'ACTIVE'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.affiliates
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN registered_at SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- CONTRACTS
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

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS affiliate_id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS service text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS monthly_value numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percent numeric(7,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_value numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.contracts
SET
  title = COALESCE(title, 'Contrato sem título'),
  monthly_value = COALESCE(monthly_value, 0),
  commission_percent = COALESCE(commission_percent, 0),
  commission_value = COALESCE(commission_value, 0),
  status = COALESCE(status, 'ACTIVE'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

-- COMMISSION PAYMENTS
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

-- CONTENT
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

-- INVESTMENTS
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

-- FISCAL DOCUMENTS
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

-- FINANCE LINK
ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS contract_id uuid
  REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Indexes
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
  ON public.accounts_receivable(contract_id)
  WHERE contract_id IS NOT NULL;

-- Triggers / grants / RLS for repaired module tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'affiliates','contracts','content_items',
    'commission_payments','investments','fiscal_documents'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
