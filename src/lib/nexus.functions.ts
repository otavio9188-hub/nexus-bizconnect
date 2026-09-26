import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, FORBIDDEN, generateTempPassword, loadSessionContext, writeAudit } from "./actor";
import type { Db } from "./actor";

async function requireOwner(supabase: Db, userId: string) {
  const ctx = await loadSessionContext(supabase, userId);
  if (!ctx.isNexusOwner) throw FORBIDDEN();
  return ctx;
}

const companyFields = {
  name: z.string().min(2),
  legal_name: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
};

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: companies }, { data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("companies").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("id, company_id, full_name, email, status"),
      supabaseAdmin.from("user_roles").select("user_id, company_id, role"),
    ]);

    const adminIds = new Set(
      (roles ?? []).filter((r) => r.role === "COMPANY_ADMIN").map((r) => r.user_id),
    );

    return (companies ?? []).map((c) => {
      const members = (profiles ?? []).filter((p) => p.company_id === c.id);
      const admin = members.find((m) => adminIds.has(m.id));
      return {
        ...c,
        user_count: members.length,
        admin_name: admin?.full_name ?? null,
        admin_email: admin?.email ?? null,
      };
    });
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ...companyFields,
        admin_full_name: z.string().min(2),
        admin_email: z.string().email(),
        admin_phone: z.string().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.name,
        legal_name: data.legal_name || null,
        cnpj: data.cnpj || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        kind: "CLIENT",
      })
      .select("*")
      .single();
    if (companyError || !company)
      throw new AppError("COMPANY_FAILED", "Não foi possível criar a empresa. Verifique o CNPJ.");

    const tempPassword = generateTempPassword();
    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: data.admin_email,
      password: tempPassword,
      email_confirm: true,
    });

    if (userError || !created?.user) {
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      throw new AppError(
        "ADMIN_FAILED",
        "Não foi possível criar o administrador. O e-mail pode já estar em uso.",
      );
    }

    const adminId = created.user.id;
    await supabaseAdmin.from("profiles").insert({
      id: adminId,
      company_id: company.id,
      full_name: data.admin_full_name,
      email: data.admin_email,
      phone: data.admin_phone || null,
      must_change_password: true,
    });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: adminId, company_id: company.id, role: "COMPANY_ADMIN" });

    await writeAudit(supabaseAdmin, {
      company_id: company.id,
      user_id: context.userId,
      user_email: actor.profile.email,
      action: "COMPANY_CREATED",
      module: "companies",
      record_id: company.id,
      record_label: company.name,
      new_value: { name: company.name, admin_email: data.admin_email },
    });

    return { company, tempPassword, adminEmail: data.admin_email };
  });

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), ...companyFields }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...fields } = data;

    const { data: before } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { data: updated, error } = await supabaseAdmin
      .from("companies")
      .update({
        name: fields.name,
        legal_name: fields.legal_name || null,
        cnpj: fields.cnpj || null,
        email: fields.email || null,
        phone: fields.phone || null,
        address: fields.address || null,
        city: fields.city || null,
        state: fields.state || null,
        zip_code: fields.zip_code || null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError("UPDATE_FAILED", "Não foi possível atualizar a empresa.");

    await writeAudit(supabaseAdmin, {
      company_id: id,
      user_id: context.userId,
      user_email: actor.profile.email,
      action: "COMPANY_UPDATED",
      module: "companies",
      record_id: id,
      record_label: updated.name,
      old_value: before,
      new_value: updated,
    });
    return updated;
  });

export const setCompanyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("companies")
      .select("id, name, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new AppError("NOT_FOUND", "Empresa não encontrada.");

    const { data: updated, error } = await supabaseAdmin
      .from("companies")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new AppError("UPDATE_FAILED", "Não foi possível atualizar o status.");

    const actionMap = {
      ACTIVE: "COMPANY_REACTIVATED",
      SUSPENDED: "COMPANY_SUSPENDED",
      BLOCKED: "COMPANY_BLOCKED",
    } as const;

    await writeAudit(supabaseAdmin, {
      company_id: data.id,
      user_id: context.userId,
      user_email: actor.profile.email,
      action: actionMap[data.status],
      module: "companies",
      record_id: data.id,
      record_label: before.name,
      old_value: { status: before.status },
      new_value: { status: data.status },
    });
    return updated;
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), confirmName: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!company) throw new AppError("NOT_FOUND", "Empresa não encontrada.");
    if (company.status === "ACTIVE")
      throw new AppError(
        "NOT_BLOCKED",
        "Só é possível excluir empresas suspensas ou bloqueadas. Suspenda a empresa antes.",
      );
    if (data.confirmName.trim() !== company.name)
      throw new AppError("NAME_MISMATCH", "O nome digitado não confere com o nome da empresa.");

    const { data: members } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_id", company.id);

    for (const member of members ?? []) {
      await supabaseAdmin.auth.admin.deleteUser(member.id);
    }

    const { error } = await supabaseAdmin.from("companies").delete().eq("id", company.id);
    if (error) throw new AppError("DELETE_FAILED", "Não foi possível excluir a empresa.");

    await writeAudit(supabaseAdmin, {
      company_id: null,
      user_id: context.userId,
      user_email: actor.profile.email,
      action: "COMPANY_DELETED",
      module: "companies",
      record_id: company.id,
      record_label: company.name,
      old_value: company,
    });
    return { ok: true };
  });

export const createNexusOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        full_name: z.string().min(2).max(120),
        email: z.string().email().max(255),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const actor = await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = generateTempPassword();
    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (userError || !created?.user) {
      throw new AppError(
        "OWNER_FAILED",
        "Não foi possível criar o administrador. O e-mail pode já estar em uso.",
      );
    }

    const ownerId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: ownerId,
      company_id: null,
      full_name: data.full_name,
      email: data.email,
      status: "ACTIVE",
      must_change_password: true,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      throw new AppError("OWNER_PROFILE_FAILED", "Não foi possível criar o perfil do administrador.");
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: ownerId,
      company_id: null,
      role: "NEXUS_OWNER",
    });

    if (roleError) {
      await supabaseAdmin.from("profiles").delete().eq("id", ownerId);
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      throw new AppError("OWNER_ROLE_FAILED", "Não foi possível atribuir o acesso de administrador.");
    }

    await writeAudit(supabaseAdmin, {
      company_id: null,
      user_id: context.userId,
      user_email: actor.profile.email,
      action: "NEXUS_OWNER_CREATED",
      module: "users",
      record_id: ownerId,
      record_label: data.email,
      new_value: { full_name: data.full_name, email: data.email, role: "NEXUS_OWNER" },
    });

    return { tempPassword, email: data.email };
  });

export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }, { data: companies }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, company_id, full_name, email, status, last_login_at, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("companies").select("id, name"),
    ]);

    return (profiles ?? []).map((p) => ({
      ...p,
      role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? null,
      company_name: (companies ?? []).find((c) => c.id === p.company_id)?.name ?? null,
    }));
  });

export const listPlatformAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: logs }, { data: companies }] = await Promise.all([
      supabaseAdmin
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabaseAdmin.from("companies").select("id, name"),
    ]);

    return (logs ?? []).map((l) => ({
      ...l,
      company_name: (companies ?? []).find((c) => c.id === l.company_id)?.name ?? null,
    }));
  });

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: companies }, { count: userCount }] = await Promise.all([
      supabaseAdmin.from("companies").select("id, status, created_at"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const list = companies ?? [];
    return {
      total: list.length,
      active: list.filter((c) => c.status === "ACTIVE").length,
      suspended: list.filter((c) => c.status === "SUSPENDED").length,
      blocked: list.filter((c) => c.status === "BLOCKED").length,
      users: userCount ?? 0,
    };
  });

/** Generates a new temporary password for any platform user (owner only). */
export const resetUserPasswordAsOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const actor = await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, email, company_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new AppError("NOT_FOUND", "Usuário não encontrado.");

    const tempPassword = generateTempPassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: tempPassword,
    });
    if (error) throw new AppError("RESET_FAILED", "Não foi possível redefinir a senha.");

    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", data.userId);

    await writeAudit(supabaseAdmin, {
      company_id: target.company_id,
      user_id: context.userId,
      user_email: actor.profile.email,
      action: "PASSWORD_RESET",
      module: "users",
      record_id: target.id,
      record_label: target.email,
    });

    return { tempPassword, email: target.email };
  });
