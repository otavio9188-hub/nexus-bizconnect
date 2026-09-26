import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, FileKey2, PackageCheck, Search } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/estudio/notas-entrada")({
  component: NotasEntradaPage,
});

function NotasEntradaPage() {
  return (
    <AppShell
      title="Notas de Entrada"
      description="Registro e conferência das notas fiscais recebidas"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Notas de Entrada</h2>
            <p className="text-sm text-muted-foreground">
              Centralize as notas recebidas de fornecedores e conecte entrada, estoque e financeiro.
            </p>
          </div>
          <Button>
            <ArrowDownToLine className="size-4" />
            Registrar nota de entrada
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5"><FileKey2 className="size-4 text-muted-foreground" /><div className="mt-3 text-2xl font-semibold">0</div><div className="text-xs text-muted-foreground">Notas recebidas</div></CardContent></Card>
          <Card><CardContent className="p-5"><PackageCheck className="size-4 text-muted-foreground" /><div className="mt-3 text-2xl font-semibold">0</div><div className="text-xs text-muted-foreground">Aguardando conferência</div></CardContent></Card>
          <Card><CardContent className="p-5"><ArrowDownToLine className="size-4 text-muted-foreground" /><div className="mt-3 text-2xl font-semibold">R$ 0,00</div><div className="text-xs text-muted-foreground">Total no período</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Notas recebidas</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar chave, fornecedor..." />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed p-10 text-center">
              <FileKey2 className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Nenhuma nota de entrada registrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Na próxima etapa, vamos conectar XML/chave de acesso, conferência dos itens, estoque e contas a pagar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
