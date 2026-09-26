// @ts-nocheck
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, FilePlus2, Instagram, Facebook, Youtube, Pencil, Trash2, Loader2, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { can } from "@/lib/nexus-shared";
import { listContent, createContent, updateContent, deleteContent } from "@/lib/content.functions";
import { listCustomers } from "@/lib/customers.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route=createFileRoute("/_authenticated/estudio/conteudos")({component:ContentPage});
type Content=Awaited<ReturnType<typeof listContent>>[number];
const empty={customer_id:"",responsible_user_id:"",platform:"Instagram",format:"Post",title:"",caption:"",media_url:"",scheduled_at:"",published_at:"",status:"DRAFT",notes:""};
const platforms=["Instagram","Facebook","YouTube","TikTok","LinkedIn"];
const formats=["Post","Reels","Story","Vídeo","Carrossel","Artigo"];

function ContentPage(){
 const {data:ctx}=useSessionContext(); const qc=useQueryClient();
 const list=useServerFn(listContent),create=useServerFn(createContent),update=useServerFn(updateContent),remove=useServerFn(deleteContent),listClients=useServerFn(listCustomers);
 const allowed=can(ctx,"content","VIEW"),canCreate=can(ctx,"content","CREATE"),canEdit=can(ctx,"content","EDIT"),canDelete=can(ctx,"content","DELETE");
 const q=useQuery({queryKey:["studio-content"],queryFn:()=>list(),enabled:allowed,retry:false});
 const clients=useQuery({queryKey:["studio-content-customers"],queryFn:()=>listClients(),enabled:allowed,retry:false});
 const rows=q.data??[]; const [open,setOpen]=useState(false),[editing,setEditing]=useState<Content|null>(null),[target,setTarget]=useState<Content|null>(null),[form,setForm]=useState(empty);
 const iso=(v:string)=>v?new Date(v).toISOString():null;
 const save=useMutation({mutationFn:(v:any)=>{const data={...v,customer_id:v.customer_id||null,responsible_user_id:v.responsible_user_id||null,media_url:v.media_url||null,scheduled_at:iso(v.scheduled_at),published_at:iso(v.published_at)};return editing?update({data:{id:editing.id,...data}}):create({data})},onSuccess:async()=>{setOpen(false);await qc.invalidateQueries({queryKey:["studio-content"]});toast.success(editing?"Conteúdo atualizado.":"Conteúdo criado.")},onError:e=>toast.error(e instanceof Error?e.message:"Não foi possível salvar.")});
 const del=useMutation({mutationFn:(id:string)=>remove({data:{id}}),onSuccess:async()=>{setTarget(null);await qc.invalidateQueries({queryKey:["studio-content"]});toast.success("Conteúdo excluído.")},onError:e=>toast.error(e instanceof Error?e.message:"Não foi possível excluir.")});
 const start=(row?:Content)=>{setEditing(row??null);const local=(v?:string|null)=>v?new Date(v).toISOString().slice(0,16):"";setForm(row?{customer_id:row.customer_id??"",responsible_user_id:row.responsible_user_id??"",platform:row.platform,format:row.format,title:row.title??"",caption:row.caption??"",media_url:row.media_url??"",scheduled_at:local(row.scheduled_at),published_at:local(row.published_at),status:row.status,notes:row.notes??""}:{...empty});setOpen(true)};
 const icon=(p:string)=>p==="Instagram"?<Instagram className="size-4"/>:p==="Facebook"?<Facebook className="size-4"/>:p==="YouTube"?<Youtube className="size-4"/>:p==="LinkedIn"?<Linkedin className="size-4"/>:<CalendarDays className="size-4"/>;
 if(!allowed)return <AppShell title="Conteúdos"><div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Você não possui permissão para visualizar conteúdos.</div></AppShell>;
 const metrics=[["Total",rows.length,CalendarDays],["Rascunhos",rows.filter(x=>x.status==="DRAFT").length,CalendarDays],["Agendados",rows.filter(x=>x.status==="SCHEDULED").length,CalendarDays],["Publicados",rows.filter(x=>x.status==="PUBLISHED").length,Instagram],["Aprovação",rows.filter(x=>x.status==="PENDING_APPROVAL").length,FilePlus2]] as const;
 return <AppShell title="Conteúdos" description="Calendário editorial e produção do Estúdio Nexus"><div className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Produção de conteúdo</h2><p className="text-sm text-muted-foreground">Planeje, aprove e acompanhe as publicações dos clientes.</p></div>{canCreate&&<Button onClick={()=>start()}><FilePlus2 className="mr-2 size-4"/>Novo conteúdo</Button>}</div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([l,v,I])=><Card key={l}><CardContent className="p-5"><I className="size-4 text-muted-foreground"/><div className="mt-3 text-2xl font-semibold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></CardContent></Card>)}</div>
  <Card><CardHeader><CardTitle className="text-base">Calendário</CardTitle></CardHeader><CardContent>{q.isLoading?<p className="text-sm text-muted-foreground">Carregando...</p>:q.isError?<p className="text-sm text-destructive">Não foi possível carregar os conteúdos.</p>:rows.length===0?<div className="py-10 text-center text-sm text-muted-foreground">Nenhum conteúdo cadastrado ainda.</div>:<div className="space-y-2">{rows.map(x=><div key={x.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><div className="flex size-9 items-center justify-center rounded-md bg-secondary">{icon(x.platform)}</div><div className="min-w-0 flex-1"><div className="truncate font-medium">{x.title||x.format}</div><div className="text-xs text-muted-foreground">{x.customers?.name||"Sem cliente"} · {x.platform} · {x.status}</div></div><div className="text-xs text-muted-foreground">{x.scheduled_at?new Date(x.scheduled_at).toLocaleString("pt-BR"):"Sem data"}</div>{(canEdit||canDelete)&&<div className="flex gap-1">{canEdit&&<Button size="icon" variant="ghost" onClick={()=>start(x)}><Pencil className="size-4"/></Button>}{canDelete&&<Button size="icon" variant="ghost" onClick={()=>setTarget(x)}><Trash2 className="size-4"/></Button>}</div>}</div>)}</div>}</CardContent></Card>
 </div>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing?"Editar conteúdo":"Novo conteúdo"}</DialogTitle><DialogDescription>Cadastre o conteúdo e defina seu status de produção.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();save.mutate(form)}} className="grid gap-4 sm:grid-cols-2">
  <div className="sm:col-span-2"><Label>Título</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
  <div><Label>Cliente</Label><Select value={form.customer_id||"none"} onValueChange={v=>setForm({...form,customer_id:v==="none"?"":v})}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><SelectItem value="none">Sem cliente</SelectItem>{(clients.data??[]).map((c:any)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
  <div><Label>Plataforma</Label><Select value={form.platform} onValueChange={v=>setForm({...form,platform:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{platforms.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
  <div><Label>Formato</Label><Select value={form.format} onValueChange={v=>setForm({...form,format:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{formats.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
  <div><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="DRAFT">Rascunho</SelectItem><SelectItem value="PENDING_APPROVAL">Aguardando aprovação</SelectItem><SelectItem value="SCHEDULED">Agendado</SelectItem><SelectItem value="PUBLISHED">Publicado</SelectItem></SelectContent></Select></div>
  <div><Label>Agendado para</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})}/></div><div><Label>Publicado em</Label><Input type="datetime-local" value={form.published_at} onChange={e=>setForm({...form,published_at:e.target.value})}/></div>
  <div className="sm:col-span-2"><Label>URL da mídia</Label><Input type="url" value={form.media_url} onChange={e=>setForm({...form,media_url:e.target.value})} placeholder="https://..."/></div>
  <div className="sm:col-span-2"><Label>Legenda</Label><Textarea value={form.caption} onChange={e=>setForm({...form,caption:e.target.value})} rows={5}/></div><div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
  <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending&&<Loader2 className="mr-2 size-4 animate-spin"/>}{editing?"Salvar":"Criar conteúdo"}</Button></DialogFooter>
 </form></DialogContent></Dialog>
 <AlertDialog open={!!target} onOpenChange={v=>!v&&setTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle><AlertDialogDescription>O conteúdo será removido permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>target&&del.mutate(target.id)} disabled={del.isPending}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </AppShell>
}