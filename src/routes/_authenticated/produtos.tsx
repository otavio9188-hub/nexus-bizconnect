// @ts-nocheck
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Edit3, Loader2, MoreHorizontal, Package, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { can } from "@/lib/nexus-shared";
import { listProducts, createProduct, updateProduct, setProductStatus, deleteProduct } from "@/lib/products.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/produtos")({ component: ProductsPage });
type Product = Awaited<ReturnType<typeof listProducts>>[number];
const emptyForm = { name:"", sku:"", barcode:"", category:"", unit:"UN", cost_price:0, sale_price:0, current_stock:0, minimum_stock:0, ncm:"", cest:"", origin:"", image_url:"", notes:"" };

function ProductsPage() {
  const { data: ctx } = useSessionContext();
  const queryClient = useQueryClient();
  const fetch = useServerFn(listProducts), create = useServerFn(createProduct), update = useServerFn(updateProduct), setProductStatusFn = useServerFn(setProductStatus), remove = useServerFn(deleteProduct);
  const [search,setSearch]=useState(""), [status,setStatus]=useState<"ALL"|"ACTIVE"|"INACTIVE">("ALL"), [open,setOpen]=useState(false), [editing,setEditing]=useState<Product|null>(null), [form,setForm]=useState(emptyForm), [deleteTarget,setDeleteTarget]=useState<Product|null>(null);
  const canView=can(ctx,"products","VIEW"), canCreate=can(ctx,"products","CREATE"), canEdit=can(ctx,"products","EDIT"), canDelete=can(ctx,"products","DELETE");
  const {data:products,isLoading}=useQuery({queryKey:["products"],queryFn:()=>fetch(),enabled:!!ctx&&canView,retry:false});
  const filtered=useMemo(()=> (products??[]).filter(p=>{const q=search.trim().toLowerCase(); return (status==="ALL"||p.status===status)&&(!q||[p.name,p.sku,p.barcode,p.category].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))}),[products,search,status]);
  const invalidate=()=>queryClient.invalidateQueries({queryKey:["products"]});
  const fail=(e:unknown)=>toast.error(e instanceof Error&&e.message?e.message:"Não foi possível concluir a operação.");
  const createMut=useMutation({mutationFn:(v:typeof emptyForm)=>create({data:v}),onSuccess:async()=>{setOpen(false);toast.success("Produto cadastrado.");await invalidate()},onError:fail});
  const updateMut=useMutation({mutationFn:(v:typeof emptyForm&{id:string})=>update({data:v}),onSuccess:async()=>{setOpen(false);toast.success("Produto atualizado.");await invalidate()},onError:fail});
  const statusMut=useMutation({mutationFn:(v:{id:string;status:"ACTIVE"|"INACTIVE"})=>setProductStatusFn({data:v}),onSuccess:invalidate,onError:fail});
  const deleteMut=useMutation({mutationFn:(id:string)=>remove({data:{id}}),onSuccess:async()=>{setDeleteTarget(null);toast.success("Produto excluído.");await invalidate()},onError:fail});
  function openCreate(){setEditing(null);setForm({...emptyForm});setOpen(true)}
  function openEdit(p:Product){setEditing(p);setForm({name:p.name,sku:p.sku??"",barcode:p.barcode??"",category:p.category??"",unit:p.unit,cost_price:Number(p.cost_price),sale_price:Number(p.sale_price),current_stock:Number(p.current_stock),minimum_stock:Number(p.minimum_stock),ncm:p.ncm??"",cest:p.cest??"",origin:p.origin??"",image_url:p.image_url??"",notes:p.notes??""});setOpen(true)}
  function submit(e:React.FormEvent){e.preventDefault(); editing?updateMut.mutate({...form,id:editing.id}):createMut.mutate(form)}
  if(!canView)return <AppShell title="Produtos"><div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Você não tem permissão para acessar Produtos.</div></AppShell>;
  return <AppShell title="Produtos" description={ctx?.company?.name??undefined}><div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Buscar por nome, SKU, código de barras ou categoria" value={search} onChange={e=>setSearch(e.target.value)}/></div><Select value={status} onValueChange={v=>setStatus(v as typeof status)}><SelectTrigger className="w-full lg:w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem><SelectItem value="ACTIVE">Ativos</SelectItem><SelectItem value="INACTIVE">Inativos</SelectItem></SelectContent></Select>{canCreate&&<Button onClick={openCreate}><Plus className="mr-2 size-4"/>Novo produto</Button>}</div>
    <div className="rounded-lg border bg-card">{isLoading?<div className="p-8 text-sm text-muted-foreground">Carregando...</div>:filtered.length===0?<div className="p-12 text-center"><Package className="mx-auto mb-3 size-8 text-muted-foreground"/><p className="text-sm text-muted-foreground">{search||status!=="ALL"?"Nenhum produto encontrado.":"Nenhum produto cadastrado."}</p></div>:<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Venda</TableHead><TableHead>Estoque</TableHead><TableHead>Status</TableHead>{(canEdit||canDelete)&&<TableHead className="text-right">Ações</TableHead>}</TableRow></TableHeader><TableBody>{filtered.map(p=><TableRow key={p.id}><TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.category||p.unit}</div></TableCell><TableCell>{p.sku||"—"}</TableCell><TableCell>R$ {Number(p.sale_price).toFixed(2).replace(".",",")}</TableCell><TableCell><span className={Number(p.current_stock)<=Number(p.minimum_stock)?"font-semibold text-destructive":""}>{Number(p.current_stock).toLocaleString("pt-BR")} {p.unit}</span></TableCell><TableCell><Badge variant={p.status==="ACTIVE"?"default":"outline"}>{p.status==="ACTIVE"?"Ativo":"Inativo"}</Badge></TableCell>{(canEdit||canDelete)&&<TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{canEdit&&<DropdownMenuItem onClick={()=>openEdit(p)}><Edit3 className="mr-2 size-4"/>Editar</DropdownMenuItem>}{canEdit&&<DropdownMenuItem onClick={()=>statusMut.mutate({id:p.id,status:p.status==="ACTIVE"?"INACTIVE":"ACTIVE"})}>{p.status==="ACTIVE"?"Desativar":"Ativar"}</DropdownMenuItem>}{canDelete&&<><DropdownMenuSeparator/><DropdownMenuItem className="text-destructive" onClick={()=>setDeleteTarget(p)}><Trash2 className="mr-2 size-4"/>Excluir</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></TableCell>}</TableRow>)}</TableBody></Table></div>}</div>
  </div>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Editar produto":"Novo produto"}</DialogTitle><DialogDescription>Dados comerciais, estoque e fiscais.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    {([["name","Nome do produto",true],["sku","SKU / código interno",false],["barcode","Código de barras",false],["category","Categoria",false],["unit","Unidade",true],["ncm","NCM",false],["cest","CEST",false],["origin","Origem",false],["image_url","URL da imagem",false]] as const).map(([k,l,req])=><div key={k} className="space-y-2"><Label>{l}{req?" *":""}</Label><Input required={req} value={String(form[k])} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}
    <div className="space-y-2"><Label>Preço de custo</Label><Input type="number" min="0" step="0.01" value={form.cost_price} onChange={e=>setForm({...form,cost_price:Number(e.target.value)})}/></div>
    <div className="space-y-2"><Label>Preço de venda</Label><Input type="number" min="0" step="0.01" value={form.sale_price} onChange={e=>setForm({...form,sale_price:Number(e.target.value)})}/></div>
    <div className="space-y-2"><Label>Estoque atual</Label><Input type="number" min="0" step="0.001" value={form.current_stock} onChange={e=>setForm({...form,current_stock:Number(e.target.value)})}/></div>
    <div className="space-y-2"><Label>Estoque mínimo</Label><Input type="number" min="0" step="0.001" value={form.minimum_stock} onChange={e=>setForm({...form,minimum_stock:Number(e.target.value)})}/></div>
    <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
    <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={createMut.isPending||updateMut.isPending}>{(createMut.isPending||updateMut.isPending)&&<Loader2 className="mr-2 size-4 animate-spin"/>}Salvar produto</Button></DialogFooter>
  </form></DialogContent></Dialog>
  <Dialog open={!!deleteTarget} onOpenChange={v=>!v&&setDeleteTarget(null)}><DialogContent><DialogHeader><DialogTitle>Excluir produto?</DialogTitle><DialogDescription>Esta ação excluirá {deleteTarget?.name} do catálogo.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setDeleteTarget(null)}>Cancelar</Button><Button variant="destructive" onClick={()=>deleteTarget&&deleteMut.mutate(deleteTarget.id)}>Excluir</Button></DialogFooter></DialogContent></Dialog>
  </AppShell>;
}