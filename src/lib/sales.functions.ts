// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, FORBIDDEN, loadSessionContext, writeAudit } from "./actor";
import type { Db } from "./actor";

const id = z.string().uuid();

async function salesContext(db: Db, userId: string, action: "VIEW" | "CREATE") {
  const ctx = await loadSessionContext(db, userId);
  if (!ctx.activeCompanyId || ctx.profile.status !== "ACTIVE" || ctx.company?.status !== "ACTIVE") {
    throw new AppError("COMPANY_BLOCKED", "Sua empresa está suspensa ou bloqueada no momento.");
  }
  const allowed = ctx.isNexusOwner || ctx.isCompanyAdmin || ctx.permissions.some((p) => p.module === "sales" && p.action === action);
  if (!allowed) throw FORBIDDEN();
  return ctx;
}

export const listPosProducts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const ctx = await salesContext(context.supabase, context.userId, "VIEW");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("products").select("id,name,sku,barcode,unit,sale_price,current_stock,status").eq("company_id", ctx.activeCompanyId!).eq("status", "ACTIVE").order("name", { ascending: true });
  if (error) throw new AppError("LIST_FAILED", "Não foi possível carregar os produtos do caixa.");
  return data ?? [];
});

export const listPosCustomers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const ctx = await salesContext(context.supabase, context.userId, "VIEW");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("customers").select("id,name,document").eq("company_id", ctx.activeCompanyId!).eq("status", "ACTIVE").order("name", { ascending: true });
  if (error) throw new AppError("LIST_FAILED", "Não foi possível carregar os clientes do caixa.");
  return data ?? [];
});

const finalizeSchema = z.object({
  customer_id: id.nullable().optional(),
  payment_method: z.enum(["DINHEIRO", "PIX", "CARTAO_DEBITO", "CARTAO_CREDITO", "BOLETO", "FIADO"]),
  due_date: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(z.object({ product_id: id, quantity: z.coerce.number().positive() })).min(1),
});

export const finalizePosSale = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => finalizeSchema.parse(input)).handler(async ({ data, context }) => {
  const ctx = await salesContext(context.supabase, context.userId, "CREATE");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const productIds = [...new Set(data.items.map((item) => item.product_id))];
  const { data: products, error: productError } = await supabaseAdmin.from("products").select("id,name,sale_price,current_stock,status").eq("company_id", ctx.activeCompanyId!).in("id", productIds);
  if (productError) throw new AppError("PRODUCTS_FAILED", "Não foi possível consultar os produtos.");

  const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
  const items = data.items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product || product.status !== "ACTIVE") throw new AppError("PRODUCT_UNAVAILABLE", "Um dos produtos da venda não está disponível.");
    const stock = Number(product.current_stock ?? 0);
    if (stock < item.quantity) throw new AppError("INSUFFICIENT_STOCK", `Estoque insuficiente para "${product.name}". Disponível: ${stock}.`);
    const unitPrice = Number(product.sale_price ?? 0);
    return { product_id: product.id, description: product.name, quantity: item.quantity, unit_price: unitPrice, discount: 0, total: unitPrice * item.quantity, current_stock: stock };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.min(Number(data.discount || 0), subtotal);
  const total = subtotal - discount;
  if (total <= 0) throw new AppError("INVALID_TOTAL", "O total da venda precisa ser maior que zero.");
  if (data.payment_method === "FIADO" && !data.customer_id) throw new AppError("CUSTOMER_REQUIRED", "Selecione um cliente para vendas a prazo.");
  if (data.payment_method === "FIADO" && !data.due_date) throw new AppError("DUE_DATE_REQUIRED", "Informe a data de vencimento da venda a prazo.");

  const { data: sale, error: saleError } = await supabaseAdmin.from("sales").insert({
    company_id: ctx.activeCompanyId!, customer_id: data.customer_id || null, seller_id: context.userId,
    subtotal, discount, total, payment_method: data.payment_method, status: "COMPLETED", notes: data.notes || null,
  }).select("*").single();
  if (saleError || !sale) throw new AppError("SALE_FAILED", `Não foi possível finalizar a venda: ${saleError?.message || "erro desconhecido"}`);

  const { error: itemsError } = await supabaseAdmin.from("sale_items").insert(items.map((item) => ({
    company_id: ctx.activeCompanyId!, sale_id: sale.id, product_id: item.product_id, description: item.description,
    quantity: item.quantity, unit_price: item.unit_price, discount: item.discount, total: item.total,
  })));
  if (itemsError) {
    await supabaseAdmin.from("sales").delete().eq("id", sale.id).eq("company_id", ctx.activeCompanyId!);
    throw new AppError("SALE_ITEMS_FAILED", `Não foi possível registrar os itens da venda: ${itemsError.message}`);
  }

  for (const item of items) {
    const newStock = item.current_stock - item.quantity;
    const { error: stockError } = await supabaseAdmin.from("products").update({ current_stock: newStock }).eq("id", item.product_id).eq("company_id", ctx.activeCompanyId!);
    if (stockError) throw new AppError("STOCK_FAILED", `A venda foi criada, mas não foi possível atualizar o estoque: ${stockError.message}`);
    const { error: movementError } = await supabaseAdmin.from("inventory_movements").insert({
      company_id: ctx.activeCompanyId!, product_id: item.product_id, type: "OUT", quantity: item.quantity,
      balance_after: newStock, reason: "Venda no Frente de Caixa", reference_type: "sales", reference_id: sale.id, user_id: context.userId,
    });
    if (movementError) throw new AppError("STOCK_MOVEMENT_FAILED", `A venda foi criada, mas não foi possível registrar a movimentação de estoque: ${movementError.message}`);
  }

  if (data.payment_method === "FIADO") {
    const { error } = await supabaseAdmin.from("accounts_receivable").insert({
      company_id: ctx.activeCompanyId!, customer_id: data.customer_id || null, sale_id: sale.id,
      description: `Venda #${sale.code}`, amount: total, due_date: data.due_date, status: "PENDING", notes: data.notes || null,
    });
    if (error) throw new AppError("RECEIVABLE_FAILED", `A venda foi criada, mas não foi possível gerar a conta a receber: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin.from("cash_transactions").insert({
      company_id: ctx.activeCompanyId!, type: "INCOME", category: "Vendas", description: `Venda #${sale.code}`,
      amount: total, transaction_date: new Date().toISOString().slice(0, 10), payment_method: data.payment_method,
      status: "PAID", reference_type: "sales", reference_id: sale.id, user_id: context.userId,
    });
    if (error) throw new AppError("CASH_FAILED", `A venda foi criada, mas não foi possível registrar o recebimento: ${error.message}`);
  }

  await writeAudit(supabaseAdmin, {
    company_id: ctx.activeCompanyId, user_id: context.userId, user_email: ctx.profile.email,
    action: "SALE_COMPLETED", module: "sales", record_id: sale.id, record_label: `Venda #${sale.code}`, new_value: sale,
  });
  return { sale, total, item_count: items.length };
});