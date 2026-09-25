import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, Clock3, DollarSign, Pencil, Plus, Trash2, WalletCards, X } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listCustomers } from "@/lib/customers.functions";
import { createReceivable, deleteReceivable, listReceivables, updateReceivable } from "@/lib/finance.functions";
import { createPayable, deletePayable, listPayables, updatePayable } from "@/lib/payables.functions";

export const Route=createFileRoute("/_authenticated/estudio/financeiro")({component:FinancePage});
const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today=()=>new Date().toISOString().slice(0,10);
type Kind="receivable"|"payable";
type Form={description:string;amount:string;due_date:string;status:"PENDING"|"PAID"|"OVERDUE"|"CANCELLED";notes:string;customer_id:string;payment_date:string};
const empty=(kind:Kind):Form=>({description:"",amount:"",due_date:today(),status:"PENDING",notes:"",customer_id:"none",payment_date:kind==="receivable"?today():today()});
const statusLabel=(s:string)=>({PENDING:"Pendente",PAID:"Pago",OVERDUE:"Em atraso",CANCELLED:"Cancelado"}[s]||s);
const statusVariant=(s:string)=>s==="PAID"?"default":s==="OVERDUE"?"destructive":s==="CANCELLED"?"outline":"secondary";

function FinancePage(){
 const qc=useQueryClient();
 const rf=useServerFn(listReceivables), pf=useServerFn(listPayables), cf=useServerFn(listCustomers);
 const cr=useServerFn(createReceivable), ur=useServerFn(updateReceivable), dr=useServerFn(deleteReceivable);
 const cp=useServerFn(createPayable), up=useServerFn(updatePayable), dp=useServerFn(deletePayable);
 const r=useQuery({queryKey:["studio-finance-receivables"],queryFn:()=>rf()});
 const p=useQuery({queryKey:["studio-finance-payables"],queryFn:()=>pf()});
 const customers=useQuery({queryKey:["studio-finance-customers"],queryFn:()=>cf()});
 const rec=r.data??[], pay=p.data??[];
 const [tab,setTab]=useState<Kind>("receivable"),[search,setSearch]=useState(""),[status,setStatus]=useState("ALL");
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<any|null>(null),[form,setForm]=useState<Form>(empty("receivable")), [busy,setBusy]=useState(false);
 const rows=useMemo(()=>{const source=tab==="receivable"?rec:pay;return source.filter((x:any)=>{const q=search.toLowerCase();const match=!q||x.description.toLowerCase().includes(q)||(tab==="receivable"?(x.customers?.name||""):"").toLowerCase().includes(q);return match&&(status==="ALL"||x.status===status);});},[tab,rec,pay,search,status]);
 const totals={receivable:rec.filter((x:any)=>x.status==="PENDING"||x.status==="OVERDUE").reduce((a,x)=>a+Number(x.amount),0),payable:pay.filter((x:any)=>x.status==="PENDING"||x.status==="OVERDUE").reduce((a,x)=>a+Number(x.amount),0),received:rec.filter((x:any)=>x.status==="PAID").reduce((a,x)=>a+Number(x.amount),0),paid:pay.filter((x:any)=>x.status==="PAID").reduce((a,x)=>a+Number(x.amount),0)};
 const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:["studio-finance-receivables"]}),qc.invalidateQueries({queryKey:["studio-finance-payables"]})]);
 const start=(kind:Kind,row?:any)=>{setTab(kind);setEditing(row||null);setForm(row?{description:row.description,amount:String(row.amount),due_date:row.due_date,status:row.status,notes:row.notes||"",customer_id:row.customer_id||"none",payment_date:row.receipt_date||row.payment_date||today()}:empty(kind));setOpen(true);};
 const save=async()=>{setBusy(true);try{const payload={description:form.description,amount:Number(form.amount),due_date:form.due_date,status:form.status,notes:form.notes||null,...(tab==="receivable"?{customer_id:form.customer_id==="none"?null:form.customer_id,receipt_date:form.status==="PAID"?form.payment_date:null}:{supplier_id:null,payment_date:form.status==="PAID"?form.payment_date:null})};if(tab==="receivable"){if(editing)await ur({data:{id:editing.id,...payload}} as any);else await cr({data:payload} as any)}else{if(editing)await up({data:{id:editing.id,...payload}} as any);else await cp({data:payload} as any)}await refresh();setOpen(false)}catch(e){console.error(e);alert("Não foi possível salvar o lançamento.")}finally{setBusy(false)}};
 const remove=async(row:any)=>{if(!confirm("Excluir este lançamento? O registro financeiro relacionado também será removido."))return;try{if(tab==="receivable")await dr({data:{id:row.id}} as any);else await dp({data:{id:row.id}} as any);await refresh()}catch(e){console.error(e);alert("Não foi possível excluir o lançamento.")}};
 return <AppShell title="Financeiro" description="Contas a receber, contas a pagar e controle financeiro do Estúdio Nexus">
  <div className="space-y-6">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Financeiro</h2><p className="text-sm text-muted-foreground">Registre, edite, quite e acompanhe receitas e despesas.</p></div><Button onClick={()=>start(tab)}><Plus/>Novo lançamento</Button></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {[["A receber",totals.receivable,WalletCards],["A pagar",totals.payable,DollarSign],["Recebido",totals.received,ArrowUpCircle],["Pago",totals.paid,ArrowDownCircle]].map(([l,v,I])=><Card key={String(l)}><CardContent className="p-5"><I className="size-4 text-muted-foreground"/><div className="mt-3 text-xl font-semibold">{money(Number(v))}</div><div className="text-xs text-muted-foreground">{String(l)}</div></CardContent></Card>)}
   </div>
   <div className="flex flex-col gap-3 md:flex-row"><div className="flex rounded-lg border p-1"><Button size="sm" variant={tab==="receivable"?"default":"ghost"} onClick={()=>{setTab("receivable");setStatus("ALL")}}><ArrowUpCircle/>A receber</Button><Button size="sm" variant={tab==="payable"?"default":"ghost"} onClick={()=>{setTab("payable");setStatus("ALL")}}><ArrowDownCircle/>A pagar</Button></div><Input className="md:max-w-sm" placeholder="Buscar por descrição..." value={search} onChange={e=>setSearch(e.target.value)}/><select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Todos os status</option><option value="PENDING">Pendentes</option><option value="OVERDUE">Em atraso</option><option value="PAID">Pagos</option><option value="CANCELLED">Cancelados</option></select></div>
   <Card><CardHeader><CardTitle className="text-base">{tab==="receivable"?"Contas a receber":"Contas a pagar"} <span className="text-sm font-normal text-muted-foreground">({rows.length})</span></CardTitle></CardHeader><CardContent>{(r.isLoading||p.isLoading)?<p className="py-8 text-sm text-muted-foreground">Carregando...</p>:rows.length===0?<div className="py-10 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</div>:<div className="space-y-2">{rows.map((x:any)=><div key={x.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="font-medium">{x.description}</div><div className="text-xs text-muted-foreground">{tab==="receivable"?(x.customers?.name||"Sem cliente"):"Conta a pagar"} · vencimento {new Date(x.due_date+"T00:00:00").toLocaleDateString("pt-BR")}</div></div><div className="flex items-center gap-3"><Badge variant={statusVariant(x.status) as any}>{statusLabel(x.status)}</Badge><div className="min-w-28 text-right font-semibold">{money(Number(x.amount))}</div><Button size="icon" variant="ghost" onClick={()=>start(tab,x)} title="Editar"><Pencil/></Button><Button size="icon" variant="ghost" onClick={()=>remove(x)} title="Excluir"><Trash2/></Button></div></div>)}</div>}</CardContent></Card>
   <Card><CardHeader><CardTitle className="text-base">Regra do caixa</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Ao marcar uma conta como paga/recebida, o Nexus cria ou atualiza automaticamente o lançamento correspondente no caixa. Ao voltar para pendente, o lançamento automático é removido.</p></CardContent></Card>
  </div>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing?"Editar":"Novo"} {tab==="receivable"?"conta a receber":"conta a pagar"}</DialogTitle><DialogDescription>Preencha os dados financeiros. Valores pagos entram automaticamente no fluxo de caixa.</DialogDescription></DialogHeader>
   <div className="grid gap-4">
    {tab==="receivable"&&<div><label className="mb-1 block text-sm font-medium">Cliente</label><Select value={form.customer_id} onValueChange={v=>setForm({...form,customer_id:v})}><SelectTrigger><SelectValue placeholder="Selecione o cliente"/></SelectTrigger><SelectContent><SelectItem value="none">Sem cliente</SelectItem>{(customers.data??[]).map((c:any)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>}
    <div><label className="mb-1 block text-sm font-medium">Descrição</label><Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ex.: Mensalidade de gestão de marketing"/></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Valor</label><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div><div><label className="mb-1 block text-sm font-medium">Vencimento</label><Input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Status</label><Select value={form.status} onValueChange={(v:any)=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["PENDING","OVERDUE","PAID","CANCELLED"].map(s=><SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1 block text-sm font-medium">{tab==="receivable"?"Data do recebimento":"Data do pagamento"}</label><Input type="date" value={form.payment_date} disabled={form.status!=="PAID"} onChange={e=>setForm({...form,payment_date:e.target.value})}/></div></div>
    <div><label className="mb-1 block text-sm font-medium">Observações</label><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Opcional"/></div>
   </div>
   <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)} disabled={busy}><X/>Cancelar</Button><Button onClick={save} disabled={busy||!form.description||!form.amount||!form.due_date}>{busy?"Salvando...":<><Check/>Salvar</>}</Button></DialogFooter>
  </DialogContent></Dialog>
 </AppShell>
}