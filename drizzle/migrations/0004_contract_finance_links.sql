-- ============ CONTRACT -> FINANCE LINKS ============
-- Keeps automatically generated financial records idempotent and editable.
ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_contract
  ON public.accounts_receivable(contract_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_receivable_contract_initial
  ON public.accounts_receivable(contract_id)
  WHERE contract_id IS NOT NULL;
