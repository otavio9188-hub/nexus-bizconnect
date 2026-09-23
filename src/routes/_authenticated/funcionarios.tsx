import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { TempPasswordDialog } from "@/components/nexus/TempPasswordDialog";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useI18n } from "@/lib/i18n";
import { MODULES, PERMISSION_ACTIONS } from "@/lib/modules";
import {
  createEmployee,
  listEmployees,
  resetEmployeePassword,
  setEmployeePermissions,
  setEmployeeStatus,
  updateEmployee,
} from "@/lib/employees.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/funcionarios")({
  component: EmployeesPage,
});

type Role = "COMPANY_ADMIN" | "MANAGER" | "EMPLOYEE";
type Employee = Awaited<ReturnType<typeof listEmployees>>[number];

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  cpf: "",
  position: "",
  department: "",
  role: "EMPLOYEE" as Role,
};

function EmployeesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: ctx } = useSessionContext();
  const isAdmin = !!ctx?.isCompanyAdmin;

  const fetchEmployees = useServerFn(listEmployees);
  const create = useServerFn(createEmployee);
  const update = useServerFn(updateEmployee);
  const setStatus = useServerFn(setEmployeeStatus);
  const setPerms = useServerFn(setEmployeePermissions);
  const resetPw = useServerFn(resetEmployeePassword);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [permTarget, setPermTarget] = useState<Employee | null>(null);
  const [permSet, setPermSet] = useState<Set<string>>(new Set());
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["employees"] });
  const fail = (e: unknown) =>
    toast.error(e instanceof Error && e.message ? e.message : t("error.unknown"));

  const createMut = useMutation({
    mutationFn: (values: typeof emptyForm) => create({ data: values }),
    onSuccess: async (res) => {
      setFormOpen(false);
      setTemp({ email: res.email, password: res.tempPassword });
      toast.success(t("employees.created"));
      await invalidate();
    },
    onError: fail,
  });

  const updateMut = useMutation({
    mutationFn: (values: typeof emptyForm & { id: string }) => {
      const { email: _email, ...rest } = values;
      return update({ data: rest });
    },
    onSuccess: async () => {
      setFormOpen(false);
      toast.success(t("employees.updated"));
      await invalidate();
    },
    onError: fail,
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "ACTIVE" | "INACTIVE" }) => setStatus({ data: v }),
    onSuccess: async () => {
      toast.success(t("employees.updated"));
      await invalidate();
    },
    onError: fail,
  });

  const permMut = useMutation({
    mutationFn: (v: { id: string; permissions: { module: string; action: string }[] }) =>
      setPerms({ data: v as never }),
    onSuccess: async () => {
      setPermTarget(null);
      toast.success(t("employees.permissionsSaved"));
      await invalidate();
    },
    onError: fail,
  });

  const resetMut = useMutation({
    mutationFn: (id: string) => resetPw({ data: { id } }),
    onSuccess: (res) => setTemp({ email: res.email, password: res.tempPassword }),
    onError: fail,
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      full_name: e.full_name,
      email: e.email,
      phone: e.phone ?? "",
      cpf: e.cpf ?? "",
      position: e.position ?? "",
      department: e.department ?? "",
      role: e.role as Role,
    });
    setFormOpen(true);
  }

  function openPermissions(e: Employee) {
    setPermTarget(e);
    setPermSet(new Set(e.permissions.map((p) => `${p.module}:${p.action}`)));
  }

  function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    if (editing) updateMut.mutate({ ...form, id: editing.id });
    else createMut.mutate(form);
  }

  function togglePerm(key: string, checked: boolean) {
    setPermSet((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <AppShell title={t("employees.title")} description={ctx?.company?.name ?? undefined}>
      <div className="space-y-4">
        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              {t("employees.new")}
            </Button>
          </div>
        )}

        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (employees ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employees.name")}</TableHead>
                  <TableHead>{t("employees.email")}</TableHead>
                  <TableHead>{t("employees.role")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(employees ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.position || t("common.none")}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{e.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`role.${e.role}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.status === "ACTIVE" ? "default" : "outline"}>
                        {t(`status.user${e.status}`)}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="space-x-1 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                          {t("common.edit")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openPermissions(e)}>
                          <ShieldCheck className="mr-1 size-3.5" />
                          {t("employees.permissions")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetMut.mutate(e.id)}
                          disabled={resetMut.isPending}
                        >
                          <KeyRound className="mr-1 size-3.5" />
                          {t("employees.resetPassword")}
                        </Button>
                        {e.id !== ctx?.profile.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              statusMut.mutate({
                                id: e.id,
                                status: e.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                              })
                            }
                          >
                            {e.status === "ACTIVE"
                              ? t("employees.deactivate")
                              : t("employees.reactivate")}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("common.edit") : t("employees.new")}</DialogTitle>
            <DialogDescription>
              {editing
                ? t("employees.title")
                : "Uma senha temporária será gerada e exibida uma única vez."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("employees.name")}</Label>
              <Input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("employees.email")}</Label>
              <Input
                type="email"
                required
                disabled={!!editing}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("employees.phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("employees.cpf")}</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("employees.position")}</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("employees.department")}</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("employees.role")}</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY_ADMIN">{t("role.COMPANY_ADMIN")}</SelectItem>
                  <SelectItem value="MANAGER">{t("role.MANAGER")}</SelectItem>
                  <SelectItem value="EMPLOYEE">{t("role.EMPLOYEE")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permTarget} onOpenChange={(v) => !v && setPermTarget(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("employees.permissions")}</DialogTitle>
            <DialogDescription>{permTarget?.full_name}</DialogDescription>
          </DialogHeader>
          {permTarget?.role === "COMPANY_ADMIN" ? (
            <p className="text-sm text-muted-foreground">
              Administradores têm acesso completo à empresa automaticamente.
            </p>
          ) : (
            <div className="space-y-2">
              {MODULES.map((m) => (
                <div
                  key={m}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <span className="text-sm font-medium">{t(`nav.${m}`, m)}</span>
                  <div className="flex gap-4">
                    {PERMISSION_ACTIONS.map((a) => {
                      const key = `${m}:${a}`;
                      return (
                        <label key={a} className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={permSet.has(key)}
                            onCheckedChange={(c) => togglePerm(key, c === true)}
                          />
                          {t(`action.${a}`)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={permMut.isPending || permTarget?.role === "COMPANY_ADMIN"}
              onClick={() =>
                permTarget &&
                permMut.mutate({
                  id: permTarget.id,
                  permissions: [...permSet].map((k) => {
                    const [module, action] = k.split(":");
                    return { module: module!, action: action! };
                  }),
                })
              }
            >
              {permMut.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TempPasswordDialog
        open={!!temp}
        email={temp?.email ?? ""}
        password={temp?.password ?? ""}
        onClose={() => setTemp(null)}
      />
    </AppShell>
  );
}
