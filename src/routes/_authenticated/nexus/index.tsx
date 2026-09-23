import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, ShieldAlert, ShieldOff, Users } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { getPlatformStats, listPlatformAuditLogs } from "@/lib/nexus.functions";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/nexus/")({
  component: NexusDashboard,
});

function NexusDashboard() {
  const { t } = useI18n();
  const stats = useServerFn(getPlatformStats);
  const logs = useServerFn(listPlatformAuditLogs);

  const statsQuery = useQuery({ queryKey: ["platform-stats"], queryFn: () => stats() });
  const logsQuery = useQuery({ queryKey: ["platform-audit"], queryFn: () => logs() });

  const cards = [
    { label: t("nexus.companies"), value: statsQuery.data?.total, icon: Building2 },
    { label: t("status.ACTIVE"), value: statsQuery.data?.active, icon: Building2 },
    { label: t("status.SUSPENDED"), value: statsQuery.data?.suspended, icon: ShieldAlert },
    { label: t("status.BLOCKED"), value: statsQuery.data?.blocked, icon: ShieldOff },
    { label: t("nav.users"), value: statsQuery.data?.users, icon: Users },
  ];

  return (
    <AppShell title={t("nexus.title")} description={t("nav.platform")}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
                  <c.icon className="size-4" />
                </div>
                {statsQuery.isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-semibold">{c.value ?? 0}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("audit.title")}</h2>
              <Link to="/nexus/auditoria" className="text-xs text-primary hover:underline">
                {t("common.all")}
              </Link>
            </div>
            {logsQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (logsQuery.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
            ) : (
              <ul className="divide-y text-sm">
                {(logsQuery.data ?? []).slice(0, 8).map((l) => (
                  <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-mono text-xs text-primary">{l.action}</span>{" "}
                      {l.record_label ?? ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {l.user_email} · {new Date(l.created_at).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
