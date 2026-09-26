// @ts-nocheck
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Calculator, CreditCard, FileText, Minus, Plus, Search, ShoppingCart, Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { can } from "@/lib/nexus-shared";
import { finalizePosSale, listPosCustomers, listPosProducts } from "@/lib/sales.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/estudio/frente-caixa")({ component: FrenteCaixaPage });

type Product = Awaited<ReturnType<typeof listPosProducts>>[number];
type Customer = Awaited<ReturnType<typeof listPosCustomers>>[number];
type CartItem = { product: Product; quantity: number };

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FrenteCaixaPage() {
  const { data: ctx } = useSessionContext();
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listPosProducts);
  const fetchCustomers = useServerFn(listPosCustomers);
  const finalize = useServerFn(finalizePosSale);
  const canView = can(ctx, "sales", "VIEW");
  const canCreate = can(ctx, "sales", "CREATE");

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("NONE");
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState(0);
  const [saleNotes, setSaleNotes] = useState("");

  const productsQuery = useQuery({
    queryKey: ["pos-products"],
    queryFn: () => fetchProducts(),
    enabled: !!ctx && canView,
    retry: false,
  });
  const customersQuery = useQuery({
    queryKey: ["pos-customers"],
    queryFn: () => fetchCustomers(),
    enabled: !!ctx && canView,
    retry: false,
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return (productsQuery.data ?? []).slice(0, 12);
    return (productsQuery.data ?? []).filter((p) =>
      [p.name, p.sku, p.barcode].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    ).slice(0, 12);
  }, [productsQuery.data, search]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.sale_price) * item.quantity, 0);
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - safeDiscount;

  function addProduct(product: Product) {
    if (Number(product.current_stock ?? 0) <= 0) {
      toast.error("Este produto está sem estoque.");
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (!existing) return [...current, { product, quantity: 1 }];
      if (existing.quantity >= Number(product.current_stock)) {
        toast.error("Quantidade maior que o estoque disponível.");
        return current;
      }
      return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
    });
    setSearch("");
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.product.id !== productId) return [item];
      const next = item.quantity + delta;
      if (next <= 0) return [];
      if (next > Number(item.product.current_stock)) {
        toast.error("Quantidade maior que o estoque disponível.");
        return [item];
      }
      return [{ ...item, quantity: next }];
    }));
  }

  const finalizeMutation = useMutation({
    mutationFn: () => finalize({
      data: {
        customer_id: customerId === "NONE" ? null : customerId,
        payment_method: paymentMethod,
        due_date: paymentMethod === "FIADO" ? dueDate : null,
        discount: safeDiscount,
        notes: saleNotes || null,
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      },
    }),
    onSuccess: async (result) => {
      toast.success(`Venda #${result.sale.code} finalizada com sucesso.`);
      setCart([]);
      setCustomerId("NONE");
      setPaymentMethod("DINHEIRO");
      setDueDate("");
      setDiscount(0);
      setSaleNotes("");
      setSearch("");
      await queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível finalizar a venda."),
  });

  function newSale() {
    setCart([]);
    setCustomerId("NONE");
    setPaymentMethod("DINHEIRO");
    setDueDate("");
    setDiscount(0);
    setSaleNotes("");
    setSearch("");
  }

  if (!canView) {
    return <AppShell title="Frente de Caixa"><div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">Você não tem permissão para acessar o Frente de Caixa.</div></AppShell>;
  }

  return (
    <AppShell title="Frente de Caixa" description={ctx?.company?.name ?? "Venda rápida e recebimento"}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Nova venda</h2>
            <p className="text-sm text-muted-foreground">Adicione produtos, escolha o recebimento e finalize a venda.</p>
          </div>
          <Button variant="outline" onClick={newSale}><Plus className="mr-2 size-4" />Nova venda</Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="size-4" />Produtos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar produto por nome, SKU ou código de barras..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              {search.trim() && (
                <div className="rounded-lg border divide-y">
                  {filteredProducts.length === 0 ? <div className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado.</div> :
                    filteredProducts.map((product) => (
                      <button type="button" key={product.id} className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50" onClick={() => addProduct(product)}>
                        <div><div className="font-medium">{product.name}</div><div className="text-xs text-muted-foreground">{product.sku || product.barcode || product.unit} · estoque {Number(product.current_stock).toLocaleString("pt-BR")}</div></div>
                        <div className="font-semibold">{money(Number(product.sale_price))}</div>
                      </button>
                    ))
                  }
                </div>
              )}

              {cart.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                  <ShoppingCart className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">Nenhum item adicionado</p>
                  <p className="mt-1 text-sm text-muted-foreground">Digite o nome, SKU ou código de barras acima para adicionar um produto.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <div className="divide-y">
                    {cart.map((item) => {
                      const lineTotal = Number(item.product.sale_price) * item.quantity;
                      return <div key={item.product.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1"><div className="truncate font-medium">{item.product.name}</div><div className="text-xs text-muted-foreground">{money(Number(item.product.sale_price))} / {item.product.unit}</div></div>
                        <div className="flex items-center gap-1 rounded-md border">
                          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => changeQuantity(item.product.id, -1)}><Minus className="size-3" /></Button>
                          <span className="w-7 text-center text-sm">{item.quantity}</span>
                          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => changeQuantity(item.product.id, 1)}><Plus className="size-3" /></Button>
                        </div>
                        <div className="w-24 text-right font-semibold">{money(lineTotal)}</div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => changeQuantity(item.product.id, -item.quantity)}><Trash2 className="size-4" /></Button>
                      </div>;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="size-4" />Fechamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Cliente não identificado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Consumidor não identificado</SelectItem>
                    {(customersQuery.data ?? []).map((customer: Customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Subtotal</Label><div className="mt-2 text-lg font-semibold">{money(subtotal)}</div></div>
                <div><Label>Desconto</Label><Input className="mt-1" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
              </div>

              <div className="flex justify-between border-t pt-4 text-xl font-bold"><span>Total</span><span>{money(total)}</span></div>

              <div className="space-y-2">
                <Label>Forma de recebimento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão de débito</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão de crédito</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="FIADO">A prazo / fiado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "FIADO" && (
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Observação</Label>
                <Input placeholder="Opcional" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />
              </div>

              <Button className="w-full" disabled={!canCreate || cart.length === 0 || total <= 0 || finalizeMutation.isPending} onClick={() => finalizeMutation.mutate()}>
                <CreditCard className="mr-2 size-4" />
                {finalizeMutation.isPending ? "Finalizando..." : "Finalizar venda"}
              </Button>

              <Button variant="outline" className="w-full" disabled>
                <FileText className="mr-2 size-4" />
                Emitir documento fiscal
              </Button>
              <p className="text-xs text-muted-foreground">A venda e o recebimento já são registrados. A emissão fiscal ficará disponível quando o provedor fiscal da empresa estiver conectado.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Como o caixa funciona</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {[["1","Venda","Produtos e cliente"],["2","Pagamento","Forma de recebimento"],["3","Estoque","Baixa automática"],["4","Financeiro","Caixa ou contas a receber"]].map(([step,title,text]) => (
              <div key={step} className="rounded-lg border p-4"><div className="text-xs font-semibold text-muted-foreground">ETAPA {step}</div><div className="mt-1 font-medium">{title}</div><div className="mt-1 text-xs text-muted-foreground">{text}</div></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
