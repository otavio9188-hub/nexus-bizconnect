import { createFileRoute } from "@tanstack/react-router";
import { Calculator, CreditCard, FileText, ShoppingCart, UserRound } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/estudio/frente-caixa")({
  component: FrenteCaixaPage,
});

function FrenteCaixaPage() {
  return (
    <AppShell
      title="Frente de Caixa"
      description="Venda rápida, recebimento e emissão do documento fiscal"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Frente de Caixa</h2>
            <p className="text-sm text-muted-foreground">
              O ponto central para registrar vendas e, quando configurado, solicitar a emissão fiscal.
            </p>
          </div>
          <Button>
            <ShoppingCart className="size-4" />
            Nova venda
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="size-4" />
                Venda atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Buscar produto por nome, SKU ou código de barras..." />
              <div className="rounded-xl border border-dashed p-10 text-center">
                <ShoppingCart className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-medium">Nenhum item adicionado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Os produtos selecionados aparecerão aqui.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="size-4" />
                Fechamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <UserRound className="size-4 text-muted-foreground" />
                Cliente não identificado
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <strong>R$ 0,00</strong>
              </div>
              <div className="flex justify-between border-t pt-4 text-lg font-semibold">
                <span>Total</span>
                <span>R$ 0,00</span>
              </div>
              <Button className="w-full" disabled>
                <CreditCard className="size-4" />
                Finalizar venda
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <FileText className="size-4" />
                Emitir documento fiscal
              </Button>
              <p className="text-xs text-muted-foreground">
                A emissão real será conectada ao provedor fiscal da empresa. O Nexus não deve marcar uma
                nota como autorizada sem retorno da autoridade fiscal.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo planejado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {[
              ["1", "Venda", "Produtos e cliente"],
              ["2", "Pagamento", "Forma de recebimento"],
              ["3", "Fiscal", "Solicitação de emissão"],
              ["4", "Financeiro", "Caixa e contas a receber"],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-lg border p-4">
                <div className="text-xs font-semibold text-muted-foreground">ETAPA {step}</div>
                <div className="mt-1 font-medium">{title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{text}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
