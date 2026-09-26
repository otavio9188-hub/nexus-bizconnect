-- Nexus ERP: product catalog
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  barcode text,
  category text,
  unit text NOT NULL DEFAULT 'UN',
  cost_price numeric(14,2) NOT NULL DEFAULT 0,
  sale_price numeric(14,2) NOT NULL DEFAULT 0,
  current_stock numeric(14,3) NOT NULL DEFAULT 0,
  minimum_stock numeric(14,3) NOT NULL DEFAULT 0,
  ncm text,
  cest text,
  origin text,
  image_url text,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON public.products(company_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_products_company_sku ON public.products(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_company_barcode ON public.products(company_id, barcode);

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select ON public.products;
DROP POLICY IF EXISTS products_insert ON public.products;
DROP POLICY IF EXISTS products_update ON public.products;
DROP POLICY IF EXISTS products_delete ON public.products;

CREATE POLICY products_select ON public.products FOR SELECT TO authenticated
USING (company_id = public.current_company_id() AND public.has_permission('products','VIEW'));
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.has_permission('products','CREATE'));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated
USING (company_id = public.current_company_id() AND public.has_permission('products','EDIT'))
WITH CHECK (company_id = public.current_company_id() AND public.has_permission('products','EDIT'));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.has_permission('products','DELETE'));
