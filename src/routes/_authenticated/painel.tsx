import { createFileRoute } from "@tanstack/react-router";
import { Boxes, LineChart, Receipt, Wallet } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/painel")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useI18n();
  const { data: ctx } = useSessionContext();

  const upcoming = [
    { icon: Receipt, label: t("nav.sales") },
    { icon: Boxes, label: t("nav.inventory") },
    { icon: Wallet, label: t("nav.finance") },
    { icon: LineChart, label: t("nav.reports") },
  ];

  return (
    <AppShell title={t("dashboard.title")} description={ctx?.company?.name ?? undefined}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.welcome")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Seu acesso está ativo em <strong>{ctx?.company?.name}</strong> como{" "}
              <strong>{t(`role.${ctx?.roles[0] ?? "EMPLOYEE"}`)}</strong>.
            </p>
            <p>
              A gestão de funcionários, permissões e os registros de auditoria já estão
              disponíveis no menu lateral.
            </p>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Próximas fases
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((u) => (
              <Card key={u.label} className="border-dashed">
                <CardContent className="flex items-center gap-3 p-5">
                  <u.icon className="size-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{u.label}</div>
                    <div className="text-xs text-muted-foreground">{t("dashboard.soon")}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
