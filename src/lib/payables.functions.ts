import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, FORBIDDEN, loadSessionContext, writeAudit } from "./actor";
import type { Db } from "./actor";

const schema=z.object({supplier_id:z.string().uuid().nullable().optional(),description:z.string().trim().min(2).max(180),amount:z.number().positive(),due_date:z.string().min(10).max(10),status:z.enum(["PENDING","PAID","OVERDUE","CANCELLED"]).default("PENDING"),notes:z.string().trim().max(4000).optional().nullable(),payment_date:z.string().min(10).max(10).nullable().optional()});
const id=z.object({id:z.string().uuid()});

async function ctxFor(db:Db,userId:string,action:"VIEW"|"CREATE"|"EDIT"|"DELETE"){
  const ctx=await loadSessionContext(db,userId);
  if(!ctx.activeCompanyId||ctx.profile.status!=="ACTIVE"||ctx.company?.status!=="ACTIVE")throw FORBIDDEN();
  if(!(ctx.isCompanyAdmin||ctx.isNexusOwner||ctx.permissions.some(p=>p.module==="finance"&&p.action===action)))throw FORBIDDEN();
  return ctx;
}

async function syncCash(supabaseAdmin:any,row:any,userId:string,companyId:string){
  const referenceType="accounts_payable";
  const {data:existing}=await supabaseAdmin.from("cash_transactions").select("id").eq("company_id",companyId).eq("reference_type",referenceType).eq("reference_id",row.id).maybeSingle();
  if(row.status==="PAID"){
    const payload={company_id:companyId,type:"EXPENSE",category:"Pagamentos",description:row.description,amount:Number(row.amount),transaction_date:row.payment_date||new Date().toISOString().slice(0,10),status:"PAID",reference_type:referenceType,reference_id:row.id,user_id:userId};
    if(existing?.id) await supabaseAdmin.from("cash_transactions").update(payload).eq("id",existing.id).eq("company_id",companyId);
    else await supabaseAdmin.from("cash_transactions").insert(payload as any);
  }else if(existing?.id){
    await supabaseAdmin.from("cash_transactions").delete().eq("id",existing.id).eq("company_id",companyId);
  }
}

export const listPayables=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"VIEW");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("accounts_payable").select("*, suppliers(name)").eq("company_id",ctx.activeCompanyId!).order("due_date",{ascending:true});
  if(error)throw new AppError("LIST_FAILED","Não foi possível carregar contas a pagar.");
  const today=new Date().toISOString().slice(0,10);
  const payables=(data??[]).map((row:any)=>row.status==="PENDING"&&row.due_date<today?{...row,status:"OVERDUE"}:row);

  // Comissões são obrigações financeiras da empresa e também aparecem
  // em "Contas a pagar", sem criar uma segunda obrigação no banco.
  const {data:commissions,error:commissionError}=await supabaseAdmin
    .from("commission_payments")
    .select("id, affiliate_id, amount, status, due_date, paid_at, notes, affiliates(full_name)")
    .eq("company_id",ctx.activeCompanyId!)
    .order("due_date",{ascending:true});
  if(commissionError)throw new AppError("LIST_FAILED","Não foi possível carregar as comissões a pagar.");

  const commissionPayables=(commissions??[]).map((row:any)=>({
    id:`commission-${row.id}`,
    description:"Comissão"+(row.notes?" - "+row.notes:""),
    amount:Number(row.amount),
    due_date:row.due_date||row.paid_at||today,
    status:row.status==="PENDING"&&row.due_date&&row.due_date<today?"OVERDUE":row.status,
    notes:row.notes,
    supplier_id:null,
    suppliers:null,
    source:"commission",
    commission_id:row.id,
    commission_affiliate_name:row.affiliates?.full_name||"Filiado"
  }));

  return [...payables,...commissionPayables].sort((a:any,b:any)=>String(a.due_date).localeCompare(String(b.due_date)));
});

export const createPayable=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>schema.parse(v)).handler(async({data,context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"CREATE");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const payload={...data,company_id:ctx.activeCompanyId!,supplier_id:data.supplier_id||null,payment_date:data.status==="PAID"?(data.payment_date||new Date().toISOString().slice(0,10)):null};
  const {data:row,error}=await supabaseAdmin.from("accounts_payable").insert(payload as any).select("*").single();
  if(error||!row)throw new AppError("CREATE_FAILED","Não foi possível criar a conta a pagar.");
  await syncCash(supabaseAdmin,row,context.userId,ctx.activeCompanyId!);
  await writeAudit(supabaseAdmin,{company_id:ctx.activeCompanyId,user_id:context.userId,user_email:ctx.profile.email,action:"PAYABLE_CREATED",module:"finance",record_id:row.id,record_label:row.description,new_value:row});
  return row;
});

export const updatePayable=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>id.merge(schema).parse(v)).handler(async({data,context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"EDIT");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:before}=await supabaseAdmin.from("accounts_payable").select("*").eq("id",data.id).eq("company_id",ctx.activeCompanyId!).maybeSingle();
  if(!before)throw new AppError("NOT_FOUND","Conta a pagar não encontrada.");
  const {id:pid,...fields}=data;
  const payload={...fields, supplier_id:fields.supplier_id||null, payment_date:fields.status==="PAID"?(fields.payment_date||before.payment_date||new Date().toISOString().slice(0,10)):null};
  const {data:row,error}=await supabaseAdmin.from("accounts_payable").update(payload as any).eq("id",pid).eq("company_id",ctx.activeCompanyId!).select("*").single();
  if(error||!row)throw new AppError("UPDATE_FAILED","Não foi possível atualizar a conta.");
  await syncCash(supabaseAdmin,row,context.userId,ctx.activeCompanyId!);
  await writeAudit(supabaseAdmin,{company_id:ctx.activeCompanyId,user_id:context.userId,user_email:ctx.profile.email,action:"PAYABLE_UPDATED",module:"finance",record_id:pid,record_label:row.description,old_value:before,new_value:row});
  return row;
});

export const deletePayable=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>id.parse(v)).handler(async({data,context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"DELETE");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:row}=await supabaseAdmin.from("accounts_payable").select("*").eq("id",data.id).eq("company_id",ctx.activeCompanyId!).maybeSingle();
  if(!row)throw new AppError("NOT_FOUND","Conta a pagar não encontrada.");
  await supabaseAdmin.from("cash_transactions").delete().eq("company_id",ctx.activeCompanyId!).eq("reference_type","accounts_payable").eq("reference_id",row.id);
  const {error}=await supabaseAdmin.from("accounts_payable").delete().eq("id",row.id).eq("company_id",ctx.activeCompanyId!);
  if(error)throw new AppError("DELETE_FAILED","Não foi possível excluir a conta.");
  await writeAudit(supabaseAdmin,{company_id:ctx.activeCompanyId,user_id:context.userId,user_email:ctx.profile.email,action:"PAYABLE_DELETED",module:"finance",record_id:row.id,record_label:row.description,old_value:row});
  return {ok:true};
});