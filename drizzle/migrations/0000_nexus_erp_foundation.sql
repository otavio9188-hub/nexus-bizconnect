-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('NEXUS_OWNER','COMPANY_ADMIN','MANAGER','EMPLOYEE');
CREATE TYPE public.company_status AS ENUM ('ACTIVE','SUSPENDED','BLOCKED');
CREATE TYPE public.perm_action AS ENUM ('VIEW','CREATE','EDIT','DELETE');
CREATE TYPE public.user_status AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE public.doc_status AS ENUM ('DRAFT','COMPLETED','CANCELLED');
CREATE TYPE public.movement_type AS ENUM ('IN','OUT','ADJUSTMENT');
CREATE TYPE public.finance_status AS ENUM ('PENDING','PAID','OVERDUE','CANCELLED');
CREATE TYPE public.transaction_type AS ENUM ('INCOME','EXPENSE');

-- ============ UTIL ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ CORE TABLES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  cnpj text UNIQUE,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  status public.company_status NOT NULL DEFAULT 'ACTIVE',
  plan text NOT NULL DEFAULT 'STANDARD',
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  cpf text,
  position text,
  department text,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  must_change_password boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_company ON public.profiles(company_id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module text NOT NULL,
  action public.perm_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, action)
);
CREATE INDEX idx_user_permissions_user ON public.user_permissions(user_id);

-- ============ SECURITY DEFINER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_nexus_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'NEXUS_OWNER');
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.tenant_access_ok()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies c ON c.id = p.company_id
    WHERE p.id = auth.uid() AND p.status = 'ACTIVE' AND c.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_module text, _action public.perm_action)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tenant_access_ok() AND (
    public.has_role(auth.uid(), 'COMPANY_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = auth.uid() AND module = _module AND action = _action
    )
  );
$$;

-- ============ TENANT TABLES ============
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  document text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  notes text,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_company ON public.customers(company_id);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  document text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  notes text,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  barcode text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  cost_price numeric(14,2) NOT NULL DEFAULT 0,
  sale_price numeric(14,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(14,3) NOT NULL DEFAULT 0,
  min_stock numeric(14,3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'UN',
  description text,
  status public.user_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku)
);
CREATE INDEX idx_products_company ON public.products(company_id);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code serial,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  seller_id uuid,
  sale_date date NOT NULL DEFAULT current_date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text,
  status public.doc_status NOT NULL DEFAULT 'DRAFT',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_company ON public.sales(company_id);

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code serial,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  buyer_id uuid,
  purchase_date date NOT NULL DEFAULT current_date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text,
  status public.doc_status NOT NULL DEFAULT 'DRAFT',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchases_company ON public.purchases(company_id);

CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_items_purchase ON public.purchase_items(purchase_id);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type public.movement_type NOT NULL,
  quantity numeric(14,3) NOT NULL,
  balance_after numeric(14,3),
  reason text,
  reference_type text,
  reference_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_mov_company ON public.inventory_movements(company_id);
CREATE INDEX idx_inv_mov_product ON public.inventory_movements(product_id);

CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  category text,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  transaction_date date NOT NULL DEFAULT current_date,
  payment_method text,
  status public.finance_status NOT NULL DEFAULT 'PAID',
  reference_type text,
  reference_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cash_company ON public.cash_transactions(company_id);

CREATE TABLE public.accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  due_date date NOT NULL,
  payment_date date,
  status public.finance_status NOT NULL DEFAULT 'PENDING',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ap_company ON public.accounts_payable(company_id);

CREATE TABLE public.accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  due_date date NOT NULL,
  receipt_date date,
  status public.finance_status NOT NULL DEFAULT 'PENDING',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_company ON public.accounts_receivable(company_id);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  action text NOT NULL,
  module text NOT NULL,
  record_id uuid,
  record_label text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_company ON public.audit_logs(company_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  title text NOT NULL,
  body text,
  level text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- ============ UPDATED_AT TRIGGERS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','profiles','categories','customers','suppliers','products','sales','sale_items','purchases','purchase_items','inventory_movements','cash_transactions','accounts_payable','accounts_receivable']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
  END LOOP;
END $$;

-- ============ GRANTS + RLS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','profiles','user_roles','user_permissions','categories','customers','suppliers','products','sales','sale_items','purchases','purchase_items','inventory_movements','cash_transactions','accounts_payable','accounts_receivable','audit_logs','notifications']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Tenant module tables: generic permission-driven policies
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('categories','products'),
    ('customers','customers'),
    ('suppliers','suppliers'),
    ('products','products'),
    ('sales','sales'),
    ('sale_items','sales'),
    ('purchases','purchases'),
    ('purchase_items','purchases'),
    ('inventory_movements','inventory'),
    ('cash_transactions','finance'),
    ('accounts_payable','accounts_payable'),
    ('accounts_receivable','accounts_receivable')
  ) AS v(tbl, module)
  LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT TO authenticated
      USING (company_id = public.current_company_id() AND public.has_permission(%2$L,'VIEW'));$f$, r.tbl, r.module);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON public.%1$I FOR INSERT TO authenticated
      WITH CHECK (company_id = public.current_company_id() AND public.has_permission(%2$L,'CREATE'));$f$, r.tbl, r.module);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON public.%1$I FOR UPDATE TO authenticated
      USING (company_id = public.current_company_id() AND public.has_permission(%2$L,'EDIT'))
      WITH CHECK (company_id = public.current_company_id() AND public.has_permission(%2$L,'EDIT'));$f$, r.tbl, r.module);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON public.%1$I FOR DELETE TO authenticated
      USING (company_id = public.current_company_id() AND public.has_permission(%2$L,'DELETE'));$f$, r.tbl, r.module);
  END LOOP;
END $$;

-- companies
CREATE POLICY "companies_owner_all" ON public.companies FOR ALL TO authenticated
  USING (public.is_nexus_owner()) WITH CHECK (public.is_nexus_owner());
CREATE POLICY "companies_member_select" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());
CREATE POLICY "companies_admin_update" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id() AND public.has_permission('company_settings','EDIT'))
  WITH CHECK (id = public.current_company_id() AND public.has_permission('company_settings','EDIT'));

-- profiles
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_company_select" ON public.profiles FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = public.current_company_id() AND public.has_permission('employees','VIEW'));
CREATE POLICY "profiles_owner_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_nexus_owner());

-- user_roles
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_roles_company_select" ON public.user_roles FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = public.current_company_id() AND public.has_permission('employees','VIEW'));
CREATE POLICY "user_roles_owner_select" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_nexus_owner());

-- user_permissions
CREATE POLICY "user_permissions_self_select" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_permissions_company_select" ON public.user_permissions FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_permission('employees','VIEW'));
CREATE POLICY "user_permissions_owner_select" ON public.user_permissions FOR SELECT TO authenticated
  USING (public.is_nexus_owner());

-- audit_logs (read only from client; writes go through privileged server code)
CREATE POLICY "audit_owner_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_nexus_owner());
CREATE POLICY "audit_company_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() AND public.has_permission('audit_logs','VIEW'));

-- notifications
CREATE POLICY "notifications_self_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_self_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());