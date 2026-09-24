-- ============ CUSTOMERS MODULE OPTIMIZATION ============
-- The customers table is created by 0000_nexus_erp_foundation.sql.
-- This migration adds indexes used by the customer search/list screen.

CREATE INDEX IF NOT EXISTS idx_customers_company_status
  ON public.customers(company_id, status);

CREATE INDEX IF NOT EXISTS idx_customers_company_name
  ON public.customers(company_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_customers_company_document
  ON public.customers(company_id, document);

CREATE INDEX IF NOT EXISTS idx_customers_company_email
  ON public.customers(company_id, lower(email));

COMMENT ON TABLE public.customers IS 'Clientes por empresa/tenant. Acesso protegido por RLS e permissões do módulo customers.';
