import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, FilePlus2, Instagram, Facebook, Youtube, Clock3, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { listContent } from "@/lib/content.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route=createFileRoute("/_authenticated/estudio/conteudos")({component:ContentPage});

function ContentPage(){const metricCards:Array<[string,number,LucideIcon]>=[["Total",0,CalendarDays],["Rascunhos",0,Clock3],["Agendados",0,CalendarDays],["Publicados",0,Instagram],["Aprovação",0,FilePlus2]];
 const fn=useServerFn(listContent); const q=useQuery({queryKey:["studio-content"],queryFn:()=>fn()});
 const rows=q.data??[];
 const status=(s:string)=>rows.filter(x=>x.status===s).length;
 return <AppShell title="Conteúdos" description="Calendário editorial e produção do Estúdio Nexus">
  <div className="space-y-6">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Produção de conteúdo</h2><p className="text-sm text-muted-foreground">Planeje, aprove e acompanhe as publicações dos clientes.</p></div><Button><FilePlus2 className="mr-2 size-4"/>Novo conteúdo</Button></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{metricCards.map(([label,_value,Icon])=><Card key={String(label)}><CardContent className="p-5"><Icon className="size-4 text-muted-foreground"/><div className="mt-3 text-2xl font-semibold">{String(label==="Total"?rows.length:label==="Rascunhos"?status("DRAFT"):label==="Agendados"?status("SCHEDULED"):label==="Publicados"?status("PUBLISHED"):status("PENDING_APPROVAL"))}</div><div className="text-xs text-muted-foreground">{String(label)}</div></CardContent></Card>)}</div>
   <Card><CardHeader><CardTitle className="text-base">Calendário</CardTitle></CardHeader><CardContent>{q.isLoading?<p className="text-sm text-muted-foreground">Carregando...</p>:rows.length===0?<div className="py-10 text-center text-sm text-muted-foreground">Nenhum conteúdo cadastrado ainda.</div>:<div className="space-y-2">{rows.map(x=><div key={x.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3"><div className="flex size-9 items-center justify-center rounded-md bg-secondary">{x.platform.toLowerCase().includes("instagram")?<Instagram className="size-4"/>:x.platform.toLowerCase().includes("facebook")?<Facebook className="size-4"/>:x.platform.toLowerCase().includes("youtube")?<Youtube className="size-4"/>:<CalendarDays className="size-4"/>}</div><div className="min-w-0 flex-1"><div className="truncate font-medium">{x.title||x.format}</div><div className="text-xs text-muted-foreground">{x.customers?.name||"Sem cliente"} · {x.platform} · {x.status}</div></div><div className="text-xs text-muted-foreground">{x.scheduled_at?new Date(x.scheduled_at).toLocaleString("pt-BR"):"Sem data"}</div></div>)}</div>}</CardContent></Card>
  </div>
 </AppShell>;
}