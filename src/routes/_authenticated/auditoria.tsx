import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { listCompanyAuditLogs } from "@/lib/employees.functions";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditPage,
});

function AuditPage() {
  const { t } = useI18n();
  const fetchLogs = useServerFn(listCompanyAuditLogs);
  const { data, isLoading } = useQuery({ queryKey: ["company-audit"], queryFn: () => fetchLogs() });
  const [query, setQuery] = useState("");

  const rows = (data ?? []).filter((l) =>
    `${l.user_email ?? ""} ${l.action} ${l.module} ${l.record_label ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <AppShell title={t("audit.title")} description="Histórico de operações da sua empresa">
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("common.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("audit.date")}</TableHead>
                  <TableHead>{t("audit.user")}</TableHead>
                  <TableHead>{t("audit.action")}</TableHead>
                  <TableHead>{t("audit.module")}</TableHead>
                  <TableHead>{t("audit.record")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">{l.user_email ?? t("common.none")}</TableCell>
                    <TableCell className="font-mono text-xs">{l.action}</TableCell>
                    <TableCell className="text-sm">{l.module}</TableCell>
                    <TableCell className="text-sm">{l.record_label ?? t("common.none")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
