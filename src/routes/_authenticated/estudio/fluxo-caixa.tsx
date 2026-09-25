import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownCircle, ArrowUpCircle, WalletCards } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { listCashTransactions } from "@/lib/finance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route=createFileRoute("/_authenticated/estudio/fluxo-caixa")({component:CashFlowPage});
const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const month=()=>new Date().toISOString().slice(0,7);

function CashFlowPage(){
 const fn=useServerFn(listCashTransactions);
 const q=useQuery({queryKey:["studio-cash-transactions"],queryFn:()=>fn()});
 const [period,setPeriod]=React.useState(month());
 const rows=(q.data??[]).filter((x:any)=>!period||String(x.transaction_date).startsWith(period));
 const income=rows.filter((x:any)=>x.type==="INCOME").reduce((a:any,x:any)=>a+Number(x.amount||0),0);
 const expense=rows.filter((x:any)=>x.type==="EXPENSE").reduce((a:any,x:any)=>a+Number(x.amount||0),0);
 const balance=income-expense;
 return <AppShell title="Fluxo de Caixa" description="Movimentações reais de entradas e saídas do Estúdio Nexus">
  <div className="space-y-6">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Fluxo de Caixa</h2><p className="text-sm text-muted-foreground">O caixa é alimentado automaticamente quando contas a receber ou a pagar são quitadas.</p></div><div><label className="mb-1 block text-xs text-muted-foreground">Competência</label><Input type="month" value={period} onChange={e=>setPeriod(e.target.value)} /></div></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {[["Entradas",income,ArrowUpCircle],["Saídas",expense,ArrowDownCircle],["Saldo",balance,WalletCards]].map(([l,v,I])=><Card key={String(l)}><CardContent className="p-5"><I className="size-4 text-muted-foreground"/><div className="mt-3 text-xl font-semibold">{money(Number(v))}</div><div className="text-xs text-muted-foreground">{String(l)}</div></CardContent></Card>)}
   </div>
   <Card><CardHeader><CardTitle className="text-base">Movimentações {period&&<span className="text-sm font-normal text-muted-foreground">({period})</span>}</CardTitle></CardHeader><CardContent>{q.isLoading?<p className="py-8 text-sm text-muted-foreground">Carregando...</p>:rows.length===0?<div className="py-10 text-center text-sm text-muted-foreground">Nenhuma movimentação no período.</div>:<div className="space-y-2">{rows.map((x:any)=><div key={x.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="font-medium">{x.description}</div><div className="text-xs text-muted-foreground">{x.category||"Sem categoria"} · {new Date(x.transaction_date+"T00:00:00").toLocaleDateString("pt-BR")}</div></div><div className={x.type==="INCOME"?"font-semibold":"font-semibold"}>{x.type==="INCOME"?"+":"-"} {money(Number(x.amount))}</div></div>)}</div>}</CardContent></Card>
  </div>
 </AppShell>
}

import * as React from "react";