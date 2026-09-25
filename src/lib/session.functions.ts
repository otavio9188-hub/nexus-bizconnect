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
    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) {
      console.error("[Nexus] Could not load user roles:", rolesError);
      throw new AppError("ROLES_FAILED", "Não foi possível validar as permissões do usuário.");
    }

    if (!(roles ?? []).some((r) => r.role === "NEXUS_OWNER")) {
      throw new AppError("FORBIDDEN", "Apenas administradores Nexus podem selecionar uma empresa.");
    }

    // Use the authenticated Supabase client. This keeps the request inside the
    // user's session and avoids depending on a server-only service-role secret.
    // Keep this selector compatible with databases where the optional
    // Estúdio Nexus `kind` migration has not been applied yet.
    // The base company fields exist since the initial ERP migration.
    const { data, error } = await context.supabase
      .from("companies")
      .select("id, name, status")
      .order("name", { ascending: true });

    if (error) {
      console.error("[Nexus] listNexusCompanies failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new AppError(
        "COMPANIES_FAILED",
        `Não foi possível carregar as empresas (Supabase: ${error.code}).`,
      );
    }

    return (data ?? []).map((company) => ({
      id: company.id,
      name: company.name,
      status: company.status,
      kind: null,
    }));
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
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: company } = await supabaseAdmin
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


export const getStudioDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadSessionContext(context.supabase, context.userId);
    if (!ctx.activeCompanyId || ctx.company?.kind !== "STUDIO_NEXUS") {
      throw new AppError("STUDIO_REQUIRED", "Selecione o Estúdio Nexus como empresa ativa.");
    }

    const companyId = ctx.activeCompanyId;
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const startDate = start.toISOString().slice(0, 10);

    const [customers, contracts, contents, affiliates, cash, receivable, payable, investments] =
      await Promise.all([
        context.supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "ACTIVE"),
        context.supabase.from("contracts").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "ACTIVE"),
        context.supabase.from("content_items").select("id,status,platform", { count: "exact" }).eq("company_id", companyId),
        context.supabase.from("affiliates").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "ACTIVE"),
        context.supabase.from("cash_transactions").select("type,amount").eq("company_id", companyId).gte("transaction_date", startDate).eq("status", "PAID"),
        context.supabase.from("accounts_receivable").select("amount,status").eq("company_id", companyId),
        context.supabase.from("accounts_payable").select("amount,status").eq("company_id", companyId),
        context.supabase.from("investments").select("invested_amount,current_value").eq("company_id", companyId).eq("status", "ACTIVE"),
      ]);

    const income = (cash.data ?? []).filter((x) => x.type === "INCOME").reduce((s, x) => s + Number(x.amount || 0), 0);
    const expenses = (cash.data ?? []).filter((x) => x.type === "EXPENSE").reduce((s, x) => s + Number(x.amount || 0), 0);
    const pendingReceivable = (receivable.data ?? []).filter((x) => x.status === "PENDING" || x.status === "OVERDUE").reduce((s, x) => s + Number(x.amount || 0), 0);
    const overdueReceivable = (receivable.data ?? []).filter((x) => x.status === "OVERDUE").reduce((s, x) => s + Number(x.amount || 0), 0);
    const pendingPayable = (payable.data ?? []).filter((x) => x.status === "PENDING" || x.status === "OVERDUE").reduce((s, x) => s + Number(x.amount || 0), 0);
    const investmentValue = (investments.data ?? []).reduce((s, x) => s + Number(x.current_value || 0), 0);

    const contentRows = contents.data ?? [];
    const contentByStatus = contentRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});
    const contentByPlatform = contentRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.platform] = (acc[row.platform] ?? 0) + 1;
      return acc;
    }, {});

    return {
      company: ctx.company,
      customers: customers.count ?? 0,
      contracts: contracts.count ?? 0,
      affiliates: affiliates.count ?? 0,
      contents: contentRows.length,
      contentByStatus,
      contentByPlatform,
      income,
      expenses,
      profit: income - expenses,
      pendingReceivable,
      overdueReceivable,
      pendingPayable,
      investmentValue,
    };
  });
