import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2, FileText, Search, XCircle } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/estudio/notas-emitidas")({
  component: NotasEmitidasPage,
});

function NotasEmitidasPage() {
  return (
    <AppShell
      title="Notas Emitidas"
      description="Histórico e acompanhamento dos documentos fiscais da empresa"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Notas Emitidas</h2>
            <p className="text-sm text-muted-foreground">
              Consulte documentos autorizados, rejeitados, cancelados e rascunhos.
            </p>
          </div>
          <Button variant="outline">
            <FileText className="size-4" />
            Novo documento fiscal
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5"><FileCheck2 className="size-4 text-muted-foreground" /><div className="mt-3 text-2xl font-semibold">0</div><div className="text-xs text-muted-foreground">Autorizadas</div></CardContent></Card>
          <Card><CardContent className="p-5"><FileText className="size-4 text-muted-foreground" /><div className="mt-3 text-2xl font-semibold">0</div><div className="text-xs text-muted-foreground">Em processamento</div></CardContent></Card>
          <Card><CardContent className="p-5"><XCircle className="size-4 text-muted-foreground" /><div className="mt-3 text-2xl font-semibold">0</div><div className="text-xs text-muted-foreground">Canceladas/rejeitadas</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Documentos fiscais</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar número, chave..." />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed p-10 text-center">
              <FileText className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Nenhum documento fiscal emitido</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Os documentos gerados pela Frente de Caixa e por outras operações aparecerão aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
