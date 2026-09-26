-- Nexus ERP: repair product schema created before migration 0007
-- Adds any product columns that may be missing from an existing products table.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS cost_price numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_stock numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_stock numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS cest text,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

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

-- Refresh PostgREST's schema cache after the repair.
NOTIFY pgrst, 'reload schema';
