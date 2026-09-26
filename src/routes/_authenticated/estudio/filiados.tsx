import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BriefcaseBusiness, Mail, Phone, UserPlus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { can } from "@/lib/nexus-shared";
import { listAffiliates, createAffiliate, updateAffiliate, deleteAffiliate } from "@/lib/affiliates.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route=createFileRoute("/_authenticated/estudio/filiados")({component:AffiliatesPage});
type Affiliate=Awaited<ReturnType<typeof listAffiliates>>[number];
const empty={full_name:"",document:"",phone:"",email:"",pix_key:"",registered_at:"",status:"ACTIVE",notes:""};

function AffiliatesPage(){
 const {data:ctx}=useSessionContext(); const qc=useQueryClient();
 const list=useServerFn(listAffiliates), create=useServerFn(createAffiliate), update=useServerFn(updateAffiliate), remove=useServerFn(deleteAffiliate);
 const allowed=can(ctx,"affiliates","VIEW"), canCreate=can(ctx,"affiliates","CREATE"), canEdit=can(ctx,"affiliates","EDIT"), canDelete=can(ctx,"affiliates","DELETE");
 const q=useQuery({queryKey:["studio-affiliates"],queryFn:()=>list(),enabled:allowed,retry:false}); const rows=q.data??[];
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<Affiliate|null>(null),[target,setTarget]=useState<Affiliate|null>(null),[form,setForm]=useState(empty);
 const save=useMutation({mutationFn:(v:any)=>editing?update({data:{id:editing.id,...v}}):create({data:v}),onSuccess:async()=>{setOpen(false);await qc.invalidateQueries({queryKey:["studio-affiliates"]});toast.success(editing?"Filiado atualizado.":"Filiado criado.");},onError:(e)=>toast.error(e instanceof Error?e.message:"Não foi possível salvar.")});
 const del=useMutation({mutationFn:(id:string)=>remove({data:{id}}),onSuccess:async()=>{setTarget(null);await qc.invalidateQueries({queryKey:["studio-affiliates"]});toast.success("Filiado excluído.");},onError:(e)=>toast.error(e instanceof Error?e.message:"Não foi possível excluir.")});
 const start=(row?:Affiliate)=>{setEditing(row??null);setForm(row?{full_name:row.full_name,document:row.document??"",phone:row.phone??"",email:row.email??"",pix_key:row.pix_key??"",registered_at:row.registered_at??"",status:row.status??"ACTIVE",notes:row.notes??""}:{...empty});setOpen(true)};
 if(!allowed)return <AppShell title="Filiados"><div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Você não possui permissão para visualizar filiados.</div></AppShell>;
 const active=rows.filter(x=>x.status==="ACTIVE").length;
 return <AppShell title="Filiados" description="Parceiros comerciais e comissões do Estúdio Nexus"><div className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Filiados</h2><p className="text-sm text-muted-foreground">Gerencie parceiros que indicam e fecham contratos.</p></div>{canCreate&&<Button onClick={()=>start()}><UserPlus className="mr-2 size-4"/>Novo filiado</Button>}</div>
  <div className="grid gap-4 sm:grid-cols-2"><Card><CardContent className="p-5"><BriefcaseBusiness className="size-4 text-muted-foreground"/><div className="mt-3 text-2xl font-semibold">{rows.length}</div><div className="text-xs text-muted-foreground">Total de filiados</div></CardContent></Card><Card><CardContent className="p-5"><BriefcaseBusiness className="size-4 text-muted-foreground"/><div className="mt-3 text-2xl font-semibold">{active}</div><div className="text-xs text-muted-foreground">Ativos</div></CardContent></Card></div>
  <Card><CardHeader><CardTitle className="text-base">Parceiros cadastrados</CardTitle></CardHeader><CardContent>{q.isLoading?<p className="text-sm text-muted-foreground">Carregando...</p>:rows.length===0?<div className="py-10 text-center text-sm text-muted-foreground">Nenhum filiado cadastrado ainda.</div>:<div className="space-y-2">{rows.map(x=><div key={x.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-4"><div className="flex size-10 items-center justify-center rounded-full bg-secondary font-semibold">{x.full_name.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="font-medium">{x.full_name}</div><div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">{x.email&&<span className="flex items-center gap-1"><Mail className="size-3"/> {x.email}</span>}{x.phone&&<span className="flex items-center gap-1"><Phone className="size-3"/> {x.phone}</span>}</div></div><span className="rounded-full border px-2 py-1 text-[11px]">{x.status==="ACTIVE"?"Ativo":"Inativo"}</span>{(canEdit||canDelete)&&<div className="flex gap-1">{canEdit&&<Button size="icon" variant="ghost" title="Editar" onClick={()=>start(x)}><Pencil className="size-4"/></Button>}{canDelete&&<Button size="icon" variant="ghost" title="Excluir" onClick={()=>setTarget(x)}><Trash2 className="size-4"/></Button>}</div>}</div>)}</div>}</CardContent></Card>
 </div>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing?"Editar filiado":"Novo filiado"}</DialogTitle><DialogDescription>Cadastre os dados do parceiro comercial.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();save.mutate(form)}} className="grid gap-4 sm:grid-cols-2">
  <div className="sm:col-span-2"><Label>Nome completo *</Label><Input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
  <div><Label>Documento</Label><Input value={form.document} onChange={e=>setForm({...form,document:e.target.value})}/></div><div><Label>Telefone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
  <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><Label>Chave PIX</Label><Input value={form.pix_key} onChange={e=>setForm({...form,pix_key:e.target.value})}/></div>
  <div><Label>Data de cadastro</Label><Input type="date" value={form.registered_at} onChange={e=>setForm({...form,registered_at:e.target.value})}/></div><div><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Ativo</SelectItem><SelectItem value="INACTIVE">Inativo</SelectItem></SelectContent></Select></div>
  <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
  <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending&&<Loader2 className="mr-2 size-4 animate-spin"/>}{editing?"Salvar":"Criar filiado"}</Button></DialogFooter>
 </form></DialogContent></Dialog>
 <AlertDialog open={!!target} onOpenChange={v=>!v&&setTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir filiado?</AlertDialogTitle><AlertDialogDescription>O filiado será removido. Contratos existentes perderão essa associação.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>target&&del.mutate(target.id)} disabled={del.isPending}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </AppShell>
}
