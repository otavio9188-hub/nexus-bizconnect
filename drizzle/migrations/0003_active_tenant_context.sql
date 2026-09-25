-- ============ ACTIVE TENANT CONTEXT FOR NEXUS OWNER ============
-- NEXUS_OWNER remains platform-global (profiles.company_id stays NULL),
-- but can select a tenant to operate its modules through active_company_id.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_company ON public.profiles(active_company_id);

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
    JOIN public.companies c
      ON c.id = CASE
        WHEN public.is_nexus_owner() THEN p.active_company_id
        ELSE p.company_id
      END
    WHERE p.id = auth.uid()
      AND p.status = 'ACTIVE'
      AND c.status = 'ACTIVE'
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
