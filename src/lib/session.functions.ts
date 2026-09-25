import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadSessionContext, writeAudit, AppError } from "./actor";

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return loadSessionContext(context.supabase, context.userId);
  });

const passwordSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

/** Sets a new permanent password and clears the temporary-password flag. */
export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { password: string }) => passwordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await loadSessionContext(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    if (error) throw new AppError("PASSWORD_FAILED", "Não foi possível alterar a senha.");

    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", context.userId);

    await writeAudit(supabaseAdmin, {
      company_id: ctx.profile.company_id,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "PASSWORD_CHANGED",
      module: "auth",
      record_id: context.userId,
      record_label: ctx.profile.email,
    });

    return { ok: true };
  });

/** Records the login timestamp; also used to refresh company last activity. */
export const touchLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .update({ last_login_at: now })
      .eq("id", context.userId)
      .select("company_id")
      .maybeSingle();
    if (profile?.company_id) {
      await supabaseAdmin
        .from("companies")
        .update({ last_activity_at: now })
        .eq("id", profile.company_id);
    }
    return { ok: true };
  });


export const listNexusCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "NEXUS_OWNER")) {
      throw new AppError("FORBIDDEN", "Apenas administradores Nexus podem selecionar uma empresa.");
    }
    const { data, error } = await context.supabase
      .from("companies")
      .select("id, name, status, kind")
      .order("name");
    if (error) throw new AppError("COMPANIES_FAILED", "Não foi possível carregar as empresas.");
    return data ?? [];
  });

export const setActiveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string | null }) =>
    z.object({ companyId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "NEXUS_OWNER")) {
      throw new AppError("FORBIDDEN", "Apenas administradores Nexus podem selecionar uma empresa.");
    }

    if (data.companyId) {
      const { data: company } = await context.supabase
        .from("companies")
        .select("id, status")
        .eq("id", data.companyId)
        .maybeSingle();
      if (!company || company.status !== "ACTIVE") {
        throw new AppError("COMPANY_UNAVAILABLE", "A empresa selecionada não está ativa.");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({ active_company_id: data.companyId })
      .eq("id", context.userId);
    if (error) throw new AppError("ACTIVE_COMPANY_FAILED", "Não foi possível alterar a empresa ativa.");

    await writeAudit(supabaseAdmin, {
      company_id: data.companyId,
      user_id: context.userId,
      action: "ACTIVE_COMPANY_CHANGED",
      module: "platform",
      record_id: data.companyId,
    });

    return { ok: true, companyId: data.companyId };
  });
