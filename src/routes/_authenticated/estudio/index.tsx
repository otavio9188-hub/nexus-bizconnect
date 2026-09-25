import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  FileText,
  Handshake,
  LayoutDashboard,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { getStudioDashboard } from "@/lib/session.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/estudio/")({
  component: StudioDashboard,
});

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Metric({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  detail?: string;
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
          <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
            <Icon className="size-4 text-foreground" />
          </div>
        </div>
        <div className="mt-4 text-2xl font-semibold tracking-tight">{value}</div>
        {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
      </CardContent>
    </Card>
  );
}

function StudioDashboard() {
  const dashboard = useServerFn(getStudioDashboard);
  const query = useQuery({
    queryKey: ["studio-dashboard"],
    queryFn: () => dashboard(),
    refetchInterval: 60_000,
  });
  // Loading and error states return early below, so data is present here.
  const data = query.data!;

  return (
    <AppShell
      title="Estúdio Nexus"
      description={query.data?.company?.name ?? "Gestão da operação do estúdio"}
    >
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : query.error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Não foi possível carregar o dashboard. Se você é administrador Nexus, selecione o
            Estúdio Nexus como empresa ativa.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LayoutDashboard className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Visão geral</h2>
              <p className="text-sm text-muted-foreground">
                Operação, clientes e financeiro em um único painel.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Clientes ativos" value={query.data.customers} icon={Users} />
            <Metric label="Contratos ativos" value={query.data.contracts} icon={Handshake} />
            <Metric label="Filiados ativos" value={query.data.affiliates} icon={BriefcaseBusiness} />
            <Metric label="Conteúdos" value={query.data.contents} icon={FileText} />
            <Metric label="Receita no mês" value={money(query.data.income)} icon={ArrowUpRight} />
            <Metric label="Despesas no mês" value={money(query.data.expenses)} icon={ArrowDownRight} />
            <Metric
              label="Lucro no mês"
              value={money(query.data.profit)}
              icon={TrendingUp}
              detail="Receitas pagas menos despesas pagas"
            />
            <Metric
              label="Investimentos"
              value={money(query.data.investmentValue)}
              icon={CircleDollarSign}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Conteúdos por plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(query.data.contentByPlatform).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum conteúdo cadastrado.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(query.data.contentByPlatform).map(([platform, count]) => (
                      <div key={platform} className="rounded-lg border bg-secondary/30 p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {platform}
                        </div>
                        <div className="mt-1 text-2xl font-semibold">{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">A receber</span>
                  <strong>{money(query.data.pendingReceivable)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Em atraso</span>
                  <strong className="text-destructive">{money(query.data.overdueReceivable)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">A pagar</span>
                  <strong>{money(query.data.pendingPayable)}</strong>
                </div>
                <div className="flex items-center gap-2 border-t pt-4 text-sm">
                  <WalletCards className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Resultado mensal</span>
                  <strong className="ml-auto">{money(query.data.profit)}</strong>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status dos conteúdos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(query.data.contentByStatus).map(([status, count]) => (
                  <div key={status} className="rounded-lg border px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {status}
                    </div>
                    <div className="mt-1 text-xl font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
