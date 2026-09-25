import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, FORBIDDEN, loadSessionContext, writeAudit } from "./actor";
import type { Db } from "./actor";

const schema=z.object({customer_id:z.string().uuid().nullable().optional(),description:z.string().trim().min(2).max(180),amount:z.number().positive(),due_date:z.string().min(10).max(10),status:z.enum(["PENDING","PAID","OVERDUE","CANCELLED"]).default("PENDING"),notes:z.string().trim().max(4000).optional().nullable(),receipt_date:z.string().min(10).max(10).nullable().optional()});
const id=z.object({id:z.string().uuid()});

async function ctxFor(db:Db,userId:string,action:"VIEW"|"CREATE"|"EDIT"|"DELETE"){
  const ctx=await loadSessionContext(db,userId);
  if(!ctx.activeCompanyId||ctx.profile.status!=="ACTIVE"||ctx.company?.status!=="ACTIVE")throw FORBIDDEN();
  if(!(ctx.isCompanyAdmin||ctx.isNexusOwner||ctx.permissions.some(p=>p.module==="finance"&&p.action===action)))throw FORBIDDEN();
  return ctx;
}

async function syncCash(supabaseAdmin:any,row:any,userId:string,companyId:string){
  const referenceType="accounts_receivable";
  const {data:existing}=await supabaseAdmin.from("cash_transactions").select("id").eq("company_id",companyId).eq("reference_type",referenceType).eq("reference_id",row.id).maybeSingle();
  if(row.status==="PAID"){
    const payload={company_id:companyId,type:"INCOME",category:"Recebimentos",description:row.description,amount:Number(row.amount),transaction_date:row.receipt_date||new Date().toISOString().slice(0,10),status:"PAID",reference_type:referenceType,reference_id:row.id,user_id:userId};
    if(existing?.id) await supabaseAdmin.from("cash_transactions").update(payload).eq("id",existing.id).eq("company_id",companyId);
    else await supabaseAdmin.from("cash_transactions").insert(payload);
  }else if(existing?.id){
    await supabaseAdmin.from("cash_transactions").delete().eq("id",existing.id).eq("company_id",companyId);
  }
}

export const listReceivables=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"VIEW");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("accounts_receivable").select("*, customers(name)").eq("company_id",ctx.activeCompanyId!).order("due_date",{ascending:true});
  if(error)throw new AppError("LIST_FAILED","Não foi possível carregar contas a receber.");
  return data??[];
});

export const listCashTransactions=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"VIEW");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("cash_transactions").select("*").eq("company_id",ctx.activeCompanyId!).order("transaction_date",{ascending:false}).order("created_at",{ascending:false});
  if(error)throw new AppError("LIST_FAILED","Não foi possível carregar o fluxo de caixa.");
  return data??[];
});

export const listFinanceCustomers=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"VIEW");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("customers").select("id,name").eq("company_id",ctx.activeCompanyId!).eq("status","ACTIVE").order("name",{ascending:true});
  if(error)throw new AppError("LIST_FAILED","Não foi possível carregar os clientes financeiros.");
  return data??[];
});
export const listFinanceSuppliers=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"VIEW");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("suppliers").select("id,name").eq("company_id",ctx.activeCompanyId!).eq("status","ACTIVE").order("name",{ascending:true});
  if(error)throw new AppError("LIST_FAILED","Não foi possível carregar os fornecedores financeiros.");
  return data??[];
});

export const createReceivable=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>schema.parse(v)).handler(async({data,context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"CREATE");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const payload={...data,company_id:ctx.activeCompanyId!,customer_id:data.customer_id||null,due_date:data.due_date,receipt_date:data.status==="PAID"?(data.receipt_date||new Date().toISOString().slice(0,10)):null};
  const {data:row,error}=await supabaseAdmin.from("accounts_receivable").insert(payload).select("*").single();
  if(error||!row)throw new AppError("CREATE_FAILED","Não foi possível criar a conta a receber.");
  await syncCash(supabaseAdmin,row,context.userId,ctx.activeCompanyId!);
  await writeAudit(supabaseAdmin,{company_id:ctx.activeCompanyId,user_id:context.userId,user_email:ctx.profile.email,action:"RECEIVABLE_CREATED",module:"finance",record_id:row.id,record_label:row.description,new_value:row});
  return row;
});

export const updateReceivable=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>id.merge(schema)).handler(async({data,context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"EDIT");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:before}=await supabaseAdmin.from("accounts_receivable").select("*").eq("id",data.id).eq("company_id",ctx.activeCompanyId!).maybeSingle();
  if(!before)throw new AppError("NOT_FOUND","Conta a receber não encontrada.");
  const {id:rid,...fields}=data;
  const payload={...fields,customer_id:fields.customer_id||null,receipt_date:fields.status==="PAID"?(fields.receipt_date||before.receipt_date||new Date().toISOString().slice(0,10)):null};
  const {data:row,error}=await supabaseAdmin.from("accounts_receivable").update(payload).eq("id",rid).eq("company_id",ctx.activeCompanyId!).select("*").single();
  if(error||!row)throw new AppError("UPDATE_FAILED","Não foi possível atualizar a conta.");
  await syncCash(supabaseAdmin,row,context.userId,ctx.activeCompanyId!);
  await writeAudit(supabaseAdmin,{company_id:ctx.activeCompanyId,user_id:context.userId,user_email:ctx.profile.email,action:"RECEIVABLE_UPDATED",module:"finance",record_id:rid,record_label:row.description,old_value:before,new_value:row});
  return row;
});

export const deleteReceivable=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>id.parse(v)).handler(async({data,context})=>{
  const ctx=await ctxFor(context.supabase,context.userId,"DELETE");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data:row}=await supabaseAdmin.from("accounts_receivable").select("*").eq("id",data.id).eq("company_id",ctx.activeCompanyId!).maybeSingle();
  if(!row)throw new AppError("NOT_FOUND","Conta a receber não encontrada.");
  await supabaseAdmin.from("cash_transactions").delete().eq("company_id",ctx.activeCompanyId!).eq("reference_type","accounts_receivable").eq("reference_id",row.id);
  const {error}=await supabaseAdmin.from("accounts_receivable").delete().eq("id",row.id).eq("company_id",ctx.activeCompanyId!);
  if(error)throw new AppError("DELETE_FAILED","Não foi possível excluir a conta.");
  await writeAudit(supabaseAdmin,{company_id:ctx.activeCompanyId,user_id:context.userId,user_email:ctx.profile.email,action:"RECEIVABLE_DELETED",module:"finance",record_id:row.id,record_label:row.description,old_value:row});
  return {ok:true};
});