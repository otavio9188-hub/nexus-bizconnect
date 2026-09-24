import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { TempPasswordDialog } from "@/components/nexus/TempPasswordDialog";
import {
  createCompany,
  deleteCompany,
  listCompanies,
  setCompanyStatus,
  updateCompany,
} from "@/lib/nexus.functions";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/nexus/empresas")({
  component: CompaniesPage,
});

type Company = Awaited<ReturnType<typeof listCompanies>>[number];
type CompanyStatus = "ACTIVE" | "SUSPENDED" | "BLOCKED";

const emptyForm = {
  name: "",
  legal_name: "",
  cnpj: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  admin_full_name: "",
  admin_email: "",
  admin_phone: "",
};

function CompaniesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const fetchCompanies = useServerFn(listCompanies);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const setStatus = useServerFn(setCompanyStatus);
  const remove = useServerFn(deleteCompany);

  const { data, isLoading } = useQuery({ queryKey: ["companies"], queryFn: () => fetchCompanies() });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["companies"] });
    await queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["platform-audit"] });
  };
  const fail = (e: unknown) =>
    toast.error(e instanceof Error && e.message ? e.message : t("error.unknown"));

  const createMut = useMutation({
    mutationFn: (values: typeof emptyForm) => create({ data: values }),
    onSuccess: async (res) => {
      setFormOpen(false);
      setTemp({ email: res.adminEmail, password: res.tempPassword });
      toast.success(t("nexus.created"));
      await invalidate();
    },
    onError: fail,
  });

  const updateMut = useMutation({
    mutationFn: (values: typeof emptyForm & { id: string }) => {
      const { admin_full_name: _a, admin_email: _b, admin_phone: _c, ...rest } = values;
      return update({ data: rest });
    },
    onSuccess: async () => {
      setFormOpen(false);
      toast.success(t("nexus.statusChanged"));
      await invalidate();
    },
    onError: fail,
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: CompanyStatus }) => setStatus({ data: v }),
    onSuccess: async () => {
      toast.success(t("nexus.statusChanged"));
      await invalidate();
    },
    onError: fail,
  });

  const deleteMut = useMutation({
    mutationFn: (v: { id: string; confirmName: string }) => remove({ data: v }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setConfirmName("");
      toast.success(t("nexus.deleted"));
      await invalidate();
    },
    onError: fail,
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(c: Company) {
    setEditing(c);
    setForm({
      ...emptyForm,
      name: c.name,
      legal_name: c.legal_name ?? "",
      cnpj: c.cnpj ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      zip_code: c.zip_code ?? "",
    });
    setFormOpen(true);
  }

  function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    if (editing) updateMut.mutate({ ...form, id: editing.id });
    else createMut.mutate(form);
  }

  const statusVariant = (s: string) =>
    s === "ACTIVE" ? "default" : s === "SUSPENDED" ? "secondary" : "destructive";

  return (
    <AppShell title={t("nexus.companies")} description={t("nav.platform")}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("nexus.newCompany")}
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (data ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("common.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nexus.company.name")}</TableHead>
                  <TableHead>{t("nexus.company.admin")}</TableHead>
                  <TableHead>{t("nexus.company.users")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.cnpj || c.legal_name || t("common.none")}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.admin_name ?? t("common.none")}
                      <div className="text-xs text-muted-foreground">{c.admin_email ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">{c.user_count}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)}>{t(`status.${c.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        {t("common.edit")}
                      </Button>
                      {c.status === "ACTIVE" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => statusMut.mutate({ id: c.id, status: "SUSPENDED" })}
                          >
                            {t("nexus.suspend")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => statusMut.mutate({ id: c.id, status: "BLOCKED" })}
                          >
                            {t("nexus.block")}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => statusMut.mutate({ id: c.id, status: "ACTIVE" })}
                          >
                            {t("nexus.reactivate")}
                          </Button>
                          {c.status === "SUSPENDED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => statusMut.mutate({ id: c.id, status: "BLOCKED" })}
                            >
                              {t("nexus.block")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              setDeleteTarget(c);
                              setConfirmName("");
                            }}
                          >
                            <Trash2 className="mr-1 size-3.5" />
                            {t("nexus.deleteCompany")}
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("common.edit") : t("nexus.newCompany")}</DialogTitle>
            <DialogDescription>
              {editing
                ? t("nexus.companies")
                : "A empresa e seu administrador inicial serão criados juntos."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("nexus.company.name")}</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("nexus.company.legalName")}</Label>
              <Input
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("nexus.company.cnpj")}</Label>
              <Input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("nexus.company.email")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("nexus.company.phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("nexus.company.address")}</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("nexus.company.city")}</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("nexus.company.state")}</Label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("nexus.company.zip")}</Label>
              <Input
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
              />
            </div>

            {!editing && (
              <>
                <div className="sm:col-span-2">
                  <h3 className="mt-2 text-sm font-semibold">{t("nexus.admin.section")}</h3>
                </div>
                <div className="space-y-2">
                  <Label>{t("nexus.admin.name")}</Label>
                  <Input
                    required
                    value={form.admin_full_name}
                    onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("nexus.admin.email")}</Label>
                  <Input
                    type="email"
                    required
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("nexus.admin.phone")}</Label>
                  <Input
                    value={form.admin_phone}
                    onChange={(e) => setForm({ ...form, admin_phone: e.target.value })}
                  />
                </div>
              </>
            )}

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

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("nexus.deleteCompany")}</DialogTitle>
            <DialogDescription>{t("nexus.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <code className="block rounded-md border bg-muted/50 px-3 py-2 text-sm">
              {deleteTarget?.name}
            </code>
            <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending || confirmName.trim() !== deleteTarget?.name}
              onClick={() =>
                deleteTarget && deleteMut.mutate({ id: deleteTarget.id, confirmName })
              }
            >
              {deleteMut.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
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
