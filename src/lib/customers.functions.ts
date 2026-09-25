import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, FORBIDDEN, loadSessionContext, writeAudit } from "./actor";
import type { Db } from "./actor";

const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  document: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().max(255).optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(2).optional().nullable(),
  zip_code: z.string().trim().max(12).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const customerIdSchema = z.object({ id: z.string().uuid() });

async function getCustomerContext(supabase: Db, userId: string) {
  const ctx = await loadSessionContext(supabase, userId);
  if (!ctx.activeCompanyId) throw FORBIDDEN();
  if (ctx.profile.status !== "ACTIVE" || ctx.company?.status !== "ACTIVE") {
    throw new AppError(
      "COMPANY_BLOCKED",
      "Sua empresa está suspensa ou bloqueada no momento. Entre em contato com o Suporte Nexus.",
    );
  }
  return ctx;
}

async function requireCustomerPermission(
  supabase: Db,
  userId: string,
  action: "VIEW" | "CREATE" | "EDIT" | "DELETE",
) {
  const ctx = await getCustomerContext(supabase, userId);
  const allowed =
    ctx.isCompanyAdmin ||
    ctx.permissions.some((p) => p.module === "customers" && p.action === action);
  if (!allowed) throw FORBIDDEN();
  return ctx;
}

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await requireCustomerPermission(context.supabase, context.userId, "VIEW");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("company_id", ctx.activeCompanyId!)
      .order("name", { ascending: true });

    if (error) throw new AppError("LIST_FAILED", "Não foi possível carregar os clientes.");
    return data ?? [];
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await requireCustomerPermission(context.supabase, context.userId, "CREATE");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin
      .from("customers")
      .insert({
        company_id: ctx.activeCompanyId!,
        name: data.name,
        document: data.document || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state?.toUpperCase() || null,
        zip_code: data.zip_code || null,
        notes: data.notes || null,
        status: "ACTIVE",
      })
      .select("*")
      .single();

    if (error || !created) {
      throw new AppError("CREATE_FAILED", "Não foi possível cadastrar o cliente.");
    }

    await writeAudit(supabaseAdmin, {
      company_id: ctx.profile.company_id,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "CUSTOMER_CREATED",
      module: "customers",
      record_id: created.id,
      record_label: created.name,
      new_value: created,
    });

    return created;
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    customerIdSchema.merge(customerSchema).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await requireCustomerPermission(context.supabase, context.userId, "EDIT");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", data.id)
      .eq("company_id", ctx.activeCompanyId!)
      .maybeSingle();

    if (!before) throw new AppError("NOT_FOUND", "Cliente não encontrado.");

    const { id, ...fields } = data;
    const { data: updated, error } = await supabaseAdmin
      .from("customers")
      .update({
        name: fields.name,
        document: fields.document || null,
        email: fields.email || null,
        phone: fields.phone || null,
        address: fields.address || null,
        city: fields.city || null,
        state: fields.state?.toUpperCase() || null,
        zip_code: fields.zip_code || null,
        notes: fields.notes || null,
      })
      .eq("id", id)
      .eq("company_id", ctx.activeCompanyId!)
      .select("*")
      .single();

    if (error || !updated) {
      throw new AppError("UPDATE_FAILED", "Não foi possível atualizar o cliente.");
    }

    await writeAudit(supabaseAdmin, {
      company_id: ctx.profile.company_id,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "CUSTOMER_UPDATED",
      module: "customers",
      record_id: updated.id,
      record_label: updated.name,
      old_value: before,
      new_value: updated,
    });

    return updated;
  });

export const setCustomerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    customerIdSchema.extend({ status: z.enum(["ACTIVE", "INACTIVE"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await requireCustomerPermission(context.supabase, context.userId, "EDIT");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("customers")
      .select("id, name, status")
      .eq("id", data.id)
      .eq("company_id", ctx.activeCompanyId!)
      .maybeSingle();

    if (!before) throw new AppError("NOT_FOUND", "Cliente não encontrado.");

    const { data: updated, error } = await supabaseAdmin
      .from("customers")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("company_id", ctx.activeCompanyId!)
      .select("*")
      .single();

    if (error || !updated) {
      throw new AppError("STATUS_FAILED", "Não foi possível alterar o status do cliente.");
    }

    await writeAudit(supabaseAdmin, {
      company_id: ctx.profile.company_id,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: data.status === "ACTIVE" ? "CUSTOMER_REACTIVATED" : "CUSTOMER_DEACTIVATED",
      module: "customers",
      record_id: updated.id,
      record_label: updated.name,
      old_value: { status: before.status },
      new_value: { status: updated.status },
    });

    return updated;
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await requireCustomerPermission(context.supabase, context.userId, "DELETE");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", data.id)
      .eq("company_id", ctx.activeCompanyId!)
      .maybeSingle();

    if (!customer) throw new AppError("NOT_FOUND", "Cliente não encontrado.");

    const { error } = await supabaseAdmin
      .from("customers")
      .delete()
      .eq("id", data.id)
      .eq("company_id", ctx.activeCompanyId!);

    if (error) throw new AppError("DELETE_FAILED", "Não foi possível excluir o cliente.");

    await writeAudit(supabaseAdmin, {
      company_id: ctx.profile.company_id,
      user_id: context.userId,
      user_email: ctx.profile.email,
      action: "CUSTOMER_DELETED",
      module: "customers",
      record_id: customer.id,
      record_label: customer.name,
      old_value: customer,
    });

    return { ok: true };
  });
