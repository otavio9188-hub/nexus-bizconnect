import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, FORBIDDEN, generateTempPassword, loadSessionContext, writeAudit } from "./actor";
import type { Db } from "./actor";
import { MODULES, PERMISSION_ACTIONS } from "./modules";

async function requireCompanyAdmin(supabase: Db, userId: string) {
  const ctx = await loadSessionContext(supabase, userId);
  if (!ctx.isCompanyAdmin || !ctx.profile.company_id) throw FORBIDDEN();
  if (ctx.profile.status !== "ACTIVE" || ctx.company?.status !== "ACTIVE")
    throw new AppError(
      "COMPANY_BLOCKED",
      "Sua empresa está suspensa ou bloqueada no momento. Entre em contato com o Suporte Nexus.",
    );
  return ctx;
}

async function requireEmployeeViewer(supabase: Db, userId: string) {
  const ctx = await loadSessionContext(supabase, userId);
  if (!ctx.profile.company_id) throw FORBIDDEN();
  const allowed =
    ctx.isCompanyAdmin ||
    ctx.permissions.some((p) => p.module === "employees" && p.action === "VIEW");
  if (!allowed) throw FORBIDDEN();
  return ctx;
}

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await requireEmployeeViewer(context.supabase, context.userId);
    const companyId = ctx.profile.company_id!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id, role").eq("company_id", companyId),
      supabaseAdmin
        .from("user_permissions")
        .select("user_id, module, action")
        .eq("company_id", companyId),
    ]);

    return (profiles ?? []).map((p) => ({
      ...p,
      role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "EMPLOYEE",
      permissions: (perms ?? [])
        .filter((x) => x.user_id === p.id)
        .map((x) => ({ module: x.module, action: x.action })),
    }));
  });

const employeeSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  role: z.enum(["COMPANY_ADMIN", "MANAGER", "EMPLOYEE"]),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => employeeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await requireCompanyAdmin(context.supabase, context.userId);
    const companyId = ctx.profile.company_id!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = generateTempPassword();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (error || !created?.user)
      throw new AppError("CREATE_FAILED", "Não foi possível criar o usuário. E-mail já em uso?");

    const userId = created.user.id;
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      company_id: companyId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      cpf: data.cpf || null,
      position: data.position || null,
      department: data.department || null,
      must_change_password: true,
    });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, company_id: companyId, role: data.role });

    await writeAudit(supabaseAdmin, {
      company_id: companyId,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "USER_CREATED",
      module: "employees",
      record_id: userId,
      record_label: data.email,
      new_value: { full_name: data.full_name, role: data.role },
    });

    return { userId, tempPassword, email: data.email };
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid() })
      .merge(employeeSchema.omit({ email: true }))
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await requireCompanyAdmin(context.supabase, context.userId);
    const companyId = ctx.profile.company_id!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!before) throw new AppError("NOT_FOUND", "Funcionário não encontrado.");

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
        cpf: data.cpf || null,
        position: data.position || null,
        department: data.department || null,
      })
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("*")
      .single();
    if (error) throw new AppError("UPDATE_FAILED", "Não foi possível atualizar o funcionário.");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, company_id: companyId, role: data.role });

    await writeAudit(supabaseAdmin, {
      company_id: companyId,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "USER_UPDATED",
      module: "employees",
      record_id: data.id,
      record_label: before.email,
      old_value: { full_name: before.full_name },
      new_value: { full_name: data.full_name, role: data.role },
    });

    return updated;
  });

export const setEmployeeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["ACTIVE", "INACTIVE"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await requireCompanyAdmin(context.supabase, context.userId);
    const companyId = ctx.profile.company_id!;
    if (data.id === context.userId)
      throw new AppError("SELF", "Você não pode desativar o próprio usuário.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();
    if (error || !updated) throw new AppError("UPDATE_FAILED", "Não foi possível atualizar.");

    await writeAudit(supabaseAdmin, {
      company_id: companyId,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: data.status === "ACTIVE" ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      module: "employees",
      record_id: data.id,
      record_label: updated.email,
    });
    return updated;
  });

export const setEmployeePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        permissions: z.array(
          z.object({
            module: z.enum(MODULES),
            action: z.enum(PERMISSION_ACTIONS),
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await requireCompanyAdmin(context.supabase, context.userId);
    const companyId = ctx.profile.company_id!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", data.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!target) throw new AppError("NOT_FOUND", "Funcionário não encontrado.");

    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.id);
    if (data.permissions.length > 0) {
      await supabaseAdmin.from("user_permissions").insert(
        data.permissions.map((p) => ({
          user_id: data.id,
          company_id: companyId,
          module: p.module,
          action: p.action,
        })),
      );
    }

    await writeAudit(supabaseAdmin, {
      company_id: companyId,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "PERMISSION_CHANGED",
      module: "employees",
      record_id: data.id,
      record_label: target.email,
      new_value: data.permissions,
    });
    return { ok: true };
  });

export const resetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await requireCompanyAdmin(context.supabase, context.userId);
    const companyId = ctx.profile.company_id!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", data.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!target) throw new AppError("NOT_FOUND", "Funcionário não encontrado.");

    const tempPassword = generateTempPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: tempPassword,
    });
    if (error) throw new AppError("RESET_FAILED", "Não foi possível redefinir a senha.");
    await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("id", data.id);

    await writeAudit(supabaseAdmin, {
      company_id: companyId,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "PASSWORD_RESET",
      module: "employees",
      record_id: data.id,
      record_label: target.email,
    });

    return { tempPassword, email: target.email };
  });

export const listCompanyAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadSessionContext(context.supabase, context.userId);
    if (!ctx.profile.company_id) throw FORBIDDEN();
    const allowed =
      ctx.isCompanyAdmin ||
      ctx.permissions.some((p) => p.module === "audit_logs" && p.action === "VIEW");
    if (!allowed) throw FORBIDDEN();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .eq("company_id", ctx.profile.company_id)
      .order("created_at", { ascending: false })
      .limit(300);
    return data ?? [];
  });
