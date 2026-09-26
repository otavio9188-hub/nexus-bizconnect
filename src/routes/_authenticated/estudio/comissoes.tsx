import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleDollarSign, Clock3, CheckCircle2, AlertTriangle, Pencil, Trash2, Plus, Loader2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { can } from "@/lib/nexus-shared";
import { listCommissionPayments, createCommissionPayment, updateCommissionPayment, deleteCommissionPayment } from "@/lib/commissions.functions";
import { listAffiliates } from "@/lib/affiliates.functions";
import { listContracts } from "@/lib/contracts.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route=createFileRoute("/_authenticated/estudio/comissoes")({component:CommissionsPage});
type Commission=Awaited<ReturnType<typeof listCommissionPayments>>[number];
const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const empty={affiliate_id:"",contract_id:"none",amount:"",status:"PENDING",due_date:"",paid_at:"",notes:""};

function CommissionsPage(){
 const {data:ctx}=useSessionContext(); const qc=useQueryClient();
 const list=useServerFn(listCommissionPayments), create=useServerFn(createCommissionPayment), update=useServerFn(updateCommissionPayment), remove=useServerFn(deleteCommissionPayment);
 const fa=useServerFn(listAffiliates), fc=useServerFn(listContracts);
 const allowed=can(ctx,"commissions","VIEW"), canCreate=can(ctx,"commissions","CREATE"), canEdit=can(ctx,"commissions","EDIT"), canDelete=can(ctx,"commissions","DELETE");
 const q=useQuery({queryKey:["studio-commissions"],queryFn:()=>list(),enabled:allowed,retry:false}); const affiliates=useQuery({queryKey:["commission-affiliates"],queryFn:()=>fa(),enabled:allowed}); const contracts=useQuery({queryKey:["commission-contracts"],queryFn:()=>fc(),enabled:allowed});
 const rows=q.data??[]; const [open,setOpen]=useState(false),[editing,setEditing]=useState<Commission|null>(null),[target,setTarget]=useState<Commission|null>(null),[form,setForm]=useState(empty);
 const save=useMutation({mutationFn:(v:any)=>editing?update({data:{id:editing.id,...v,affiliate_id:v.affiliate_id,contract_id:v.contract_id==="none"?null:v.contract_id,amount:Number(v.amount),due_date:v.due_date||null,paid_at:v.status==="PAID"?(v.paid_at||new Date().toISOString().slice(0,10)):null}}):create({data:{...v,contract_id:v.contract_id==="none"?null:v.contract_id,amount:Number(v.amount),due_date:v.due_date||null,paid_at:v.status==="PAID"?(v.paid_at||new Date().toISOString().slice(0,10)):null}}),onSuccess:async()=>{setOpen(false);await qc.invalidateQueries({queryKey:["studio-commissions"]});toast.success(editing?"Comissão atualizada.":"Comissão criada.");},onError:e=>toast.error(e instanceof Error?e.message:"Não foi possível salvar.")});
 const del=useMutation({mutationFn:(id:string)=>remove({data:{id}}),onSuccess:async()=>{setTarget(null);await qc.invalidateQueries({queryKey:["studio-commissions"]});toast.success("Comissão excluída.");},onError:e=>toast.error(e instanceof Error?e.message:"Não foi possível excluir.")});
 const start=(row?:Commission)=>{setEditing(row??null);setForm(row?{affiliate_id:row.affiliate_id,contract_id:row.contract_id??"none",amount:String(row.amount??""),status:row.status,due_date:row.due_date??"",paid_at:row.paid_at??"",notes:row.notes??""}:{...empty});setOpen(true)};
 if(!allowed)return <AppShell title="Comissões"><div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Você não possui permissão para visualizar comissões.</div></AppShell>;
 const sum=(s:string)=>rows.filter(x=>x.status===s).reduce((a,x)=>a+Number(x.amount||0),0);
 const metrics:Array<[string,number,LucideIcon]>= [["Pendente",sum("PENDING"),Clock3],["Pago",sum("PAID"),CheckCircle2],["Em atraso",sum("OVERDUE"),AlertTriangle],["Total",rows.reduce((a,x)=>a+Number(x.amount||0),0),CircleDollarSign]];
 return <AppShell title="Comissões" description="Controle de comissões dos filiados"><div className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Comissões</h2><p className="text-sm text-muted-foreground">Acompanhe e lance pagamentos de comissões.</p></div>{canCreate&&<Button onClick={()=>start()}><Plus className="mr-2 size-4"/>Nova comissão</Button>}</div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,value,Icon])=><Card key={label}><CardContent className="p-5"><Icon className="size-4 text-muted-foreground"/><div className="mt-3 text-xl font-semibold">{money(value)}</div><div className="text-xs text-muted-foreground">{label}</div></CardContent></Card>)}</div>
  <Card><CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader><CardContent>{q.isLoading?<p className="text-sm text-muted-foreground">Carregando...</p>:rows.length===0?<div className="py-10 text-center text-sm text-muted-foreground">Nenhuma comissão registrada.</div>:<div className="space-y-2">{rows.map(x=><div key={x.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-4"><div className="min-w-0 flex-1"><div className="font-medium">{x.affiliates?.full_name||"Filiado"}</div><div className="text-xs text-muted-foreground">{x.contracts?.title||"Sem contrato"}{x.due_date?" · vencimento "+new Date(x.due_date+"T00:00:00").toLocaleDateString("pt-BR"):""}</div></div><div className="text-right"><div className="font-semibold">{money(Number(x.amount||0))}</div><div className="text-xs text-muted-foreground">{x.status}</div></div>{(canEdit||canDelete)&&<div className="flex gap-1">{canEdit&&<Button size="icon" variant="ghost" title="Editar" onClick={()=>start(x)}><Pencil className="size-4"/></Button>}{canDelete&&<Button size="icon" variant="ghost" title="Excluir" onClick={()=>setTarget(x)}><Trash2 className="size-4"/></Button>}</div>}</div>)}</div>}</CardContent></Card>
 </div>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Editar comissão":"Nova comissão"}</DialogTitle><DialogDescription>Registre o valor, filiado, contrato e situação do pagamento.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();save.mutate(form)}} className="grid gap-4 sm:grid-cols-2">
  <div><Label>Filiado *</Label><Select value={form.affiliate_id} onValueChange={v=>setForm({...form,affiliate_id:v})}><SelectTrigger><SelectValue placeholder="Selecionar filiado"/></SelectTrigger><SelectContent>{(affiliates.data??[]).filter((a:any)=>a.status==="ACTIVE").map((a:any)=><SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent></Select></div>
  <div><Label>Contrato</Label><Select value={form.contract_id} onValueChange={v=>setForm({...form,contract_id:v})}><SelectTrigger><SelectValue placeholder="Selecionar contrato"/></SelectTrigger><SelectContent><SelectItem value="none">Sem contrato</SelectItem>{(contracts.data??[]).map((c:any)=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
  <div><Label>Valor *</Label><Input required type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
  <div><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
  <div><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="PENDING">Pendente</SelectItem><SelectItem value="PAID">Pago</SelectItem><SelectItem value="OVERDUE">Em atraso</SelectItem><SelectItem value="CANCELLED">Cancelado</SelectItem></SelectContent></Select></div>
  <div><Label>Data do pagamento</Label><Input type="date" disabled={form.status!=="PAID"} value={form.paid_at} onChange={e=>setForm({...form,paid_at:e.target.value})}/></div>
  <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
  <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending||!form.affiliate_id}>{save.isPending&&<Loader2 className="mr-2 size-4 animate-spin"/>}{editing?"Salvar alterações":"Criar comissão"}</Button></DialogFooter>
 </form></DialogContent></Dialog>
 <AlertDialog open={!!target} onOpenChange={v=>!v&&setTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir comissão?</AlertDialogTitle><AlertDialogDescription>O registro será excluído permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>target&&del.mutate(target.id)} disabled={del.isPending}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </AppShell>
}
