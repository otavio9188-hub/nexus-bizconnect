import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Search } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { TempPasswordDialog } from "@/components/nexus/TempPasswordDialog";
import { listPlatformUsers, resetUserPasswordAsOwner } from "@/lib/nexus.functions";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/nexus/usuarios")({
  component: PlatformUsersPage,
});

function PlatformUsersPage() {
  const { t } = useI18n();
  const fetchUsers = useServerFn(listPlatformUsers);
  const resetPw = useServerFn(resetUserPasswordAsOwner);
  const { data, isLoading } = useQuery({ queryKey: ["platform-users"], queryFn: () => fetchUsers() });
  const [query, setQuery] = useState("");
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

  const resetMut = useMutation({
    mutationFn: (userId: string) => resetPw({ data: { userId } }),
    onSuccess: (res) => setTemp({ email: res.email, password: res.tempPassword }),
    onError: (e: unknown) =>
      toast.error(e instanceof Error && e.message ? e.message : t("error.unknown")),
  });

  const rows = (data ?? []).filter((u) =>
    `${u.full_name} ${u.email} ${u.company_name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell title={t("nav.users")} description={t("nav.platform")}>
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
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employees.name")}</TableHead>
                  <TableHead>{t("audit.company")}</TableHead>
                  <TableHead>{t("employees.role")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{u.company_name ?? t("common.none")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {u.role ? t(`role.${u.role}`) : t("common.none")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "ACTIVE" ? "default" : "outline"}>
                        {t(`status.user${u.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={resetMut.isPending}
                        onClick={() => resetMut.mutate(u.id)}
                      >
                        <KeyRound className="mr-1 size-3.5" />
                        {t("employees.resetPassword")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <TempPasswordDialog
        open={!!temp}
        email={temp?.email ?? ""}
        password={temp?.password ?? ""}
        onClose={() => setTemp(null)}
      />
    </AppShell>
  );
}
