// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, FORBIDDEN, loadSessionContext, writeAudit } from "./actor";
import type { Db } from "./actor";

const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().max(80).optional().nullable(),
  barcode: z.string().trim().max(80).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  unit: z.string().trim().max(10).default("UN"),
  cost_price: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).default(0),
  current_stock: z.coerce.number().min(0).default(0),
  minimum_stock: z.coerce.number().min(0).default(0),
  ncm: z.string().trim().max(20).optional().nullable(),
  cest: z.string().trim().max(20).optional().nullable(),
  origin: z.string().trim().max(20).optional().nullable(),
  image_url: z.string().trim().url().max(2000).optional().or(z.literal("")).nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
const idSchema = z.object({ id: z.string().uuid() });

async function requireProductPermission(supabase: Db, userId: string, action: "VIEW"|"CREATE"|"EDIT"|"DELETE") {
  const ctx = await loadSessionContext(supabase, userId);
  if (!ctx.activeCompanyId || ctx.profile.status !== "ACTIVE" || ctx.company?.status !== "ACTIVE") {
    throw new AppError("COMPANY_BLOCKED", "Sua empresa está suspensa ou bloqueada no momento.");
  }
  const allowed = ctx.isNexusOwner || ctx.isCompanyAdmin || ctx.permissions.some(p => p.module === "products" && p.action === action);
  if (!allowed) throw FORBIDDEN();
  return ctx;
}

export const listProducts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const ctx = await requireProductPermission(context.supabase, context.userId, "VIEW");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("products").select("*").eq("company_id", ctx.activeCompanyId!).order("name", { ascending: true });
  if (error) throw new AppError("LIST_FAILED", "Não foi possível carregar os produtos.");
  return data ?? [];
});

export const createProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => productSchema.parse(input)).handler(async ({ data, context }) => {
  const ctx = await requireProductPermission(context.supabase, context.userId, "CREATE");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: created, error } = await supabaseAdmin.from("products").insert({ company_id: ctx.activeCompanyId!, ...data, sku: data.sku || null, barcode: data.barcode || null, category: data.category || null, ncm: data.ncm || null, cest: data.cest || null, origin: data.origin || null, image_url: data.image_url || null, notes: data.notes || null }).select("*").single();
  if (error || !created) throw new AppError("CREATE_FAILED", "Não foi possível cadastrar o produto.");
  await writeAudit(supabaseAdmin, { company_id: ctx.profile.company_id, user_id: context.userId, user_email: ctx.profile.email, action: "PRODUCT_CREATED", module: "products", record_id: created.id, record_label: created.name, new_value: created });
  return created;
});

export const updateProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => idSchema.merge(productSchema).parse(input)).handler(async ({ data, context }) => {
  const ctx = await requireProductPermission(context.supabase, context.userId, "EDIT");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: before } = await supabaseAdmin.from("products").select("*").eq("id", data.id).eq("company_id", ctx.activeCompanyId!).maybeSingle();
  if (!before) throw new AppError("NOT_FOUND", "Produto não encontrado.");
  const { id, ...fields } = data;
  const { data: updated, error } = await supabaseAdmin.from("products").update({ ...fields, sku: fields.sku || null, barcode: fields.barcode || null, category: fields.category || null, ncm: fields.ncm || null, cest: fields.cest || null, origin: fields.origin || null, image_url: fields.image_url || null, notes: fields.notes || null }).eq("id", id).eq("company_id", ctx.activeCompanyId!).select("*").single();
  if (error || !updated) throw new AppError("UPDATE_FAILED", "Não foi possível atualizar o produto.");
  await writeAudit(supabaseAdmin, { company_id: ctx.profile.company_id, user_id: context.userId, user_email: ctx.profile.email, action: "PRODUCT_UPDATED", module: "products", record_id: updated.id, record_label: updated.name, old_value: before, new_value: updated });
  return updated;
});

export const setProductStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => idSchema.extend({ status: z.enum(["ACTIVE","INACTIVE"]) }).parse(input)).handler(async ({ data, context }) => {
  const ctx = await requireProductPermission(context.supabase, context.userId, "EDIT");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: before } = await supabaseAdmin.from("products").select("id,name,status").eq("id", data.id).eq("company_id", ctx.activeCompanyId!).maybeSingle();
  if (!before) throw new AppError("NOT_FOUND", "Produto não encontrado.");
  const { data: updated, error } = await supabaseAdmin.from("products").update({ status: data.status }).eq("id", data.id).eq("company_id", ctx.activeCompanyId!).select("*").single();
  if (error || !updated) throw new AppError("STATUS_FAILED", "Não foi possível alterar o status do produto.");
  await writeAudit(supabaseAdmin, { company_id: ctx.profile.company_id, user_id: context.userId, user_email: ctx.profile.email, action: data.status === "ACTIVE" ? "PRODUCT_REACTIVATED" : "PRODUCT_DEACTIVATED", module: "products", record_id: updated.id, record_label: updated.name, old_value: before, new_value: { status: updated.status } });
  return updated;
});

export const deleteProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => idSchema.parse(input)).handler(async ({ data, context }) => {
  const ctx = await requireProductPermission(context.supabase, context.userId, "DELETE");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", data.id).eq("company_id", ctx.activeCompanyId!).maybeSingle();
  if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado.");
  const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id).eq("company_id", ctx.activeCompanyId!);
  if (error) throw new AppError("DELETE_FAILED", "Não foi possível excluir o produto.");
  await writeAudit(supabaseAdmin, { company_id: ctx.profile.company_id, user_id: context.userId, user_email: ctx.profile.email, action: "PRODUCT_DELETED", module: "products", record_id: product.id, record_label: product.name, old_value: product });
  return { ok: true };
});