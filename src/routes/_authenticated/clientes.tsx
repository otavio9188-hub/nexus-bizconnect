import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Edit3,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useI18n } from "@/lib/i18n";
import { can } from "@/lib/nexus-shared";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  setCustomerStatus,
  updateCustomer,
} from "@/lib/customers.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: CustomersPage,
});

type Customer = Awaited<ReturnType<typeof listCustomers>>[number];

const emptyForm = {
  name: "",
  document: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  notes: "",
};

function CustomersPage() {
  const { t } = useI18n();
  const { data: ctx } = useSessionContext();
  const queryClient = useQueryClient();

  const fetchCustomers = useServerFn(listCustomers);
  const create = useServerFn(createCustomer);
  const update = useServerFn(updateCustomer);
  const setStatus = useServerFn(setCustomerStatus);
  const remove = useServerFn(deleteCustomer);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchCustomers(),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const canView = can(ctx, "customers", "VIEW");
  const canCreate = can(ctx, "customers", "CREATE");
  const canEdit = can(ctx, "customers", "EDIT");
  const canDelete = can(ctx, "customers", "DELETE");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (customers ?? []).filter((customer) => {
      const matchesStatus =
        statusFilter === "ALL" || customer.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      return [customer.name, customer.document, customer.email, customer.phone, customer.city]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [customers, search, statusFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customers"] });
  const fail = (e: unknown) =>
    toast.error(e instanceof Error && e.message ? e.message : t("error.unknown"));

  const createMut = useMutation({
    mutationFn: (values: typeof emptyForm) => create({ data: values }),
    onSuccess: async () => {
      setFormOpen(false);
      toast.success(t("customers.created"));
      await invalidate();
    },
    onError: fail,
  });

  const updateMut = useMutation({
    mutationFn: (values: typeof emptyForm & { id: string }) => update({ data: values }),
    onSuccess: async () => {
      setFormOpen(false);
      toast.success(t("customers.updated"));
      await invalidate();
    },
    onError: fail,
  });

  const statusMut = useMutation({
    mutationFn: (values: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      setStatus({ data: values }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "ACTIVE"
          ? t("customers.reactivated")
          : t("customers.deactivated"),
      );
      await invalidate();
    },
    onError: fail,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success(t("customers.deleted"));
      await invalidate();
    },
    onError: fail,
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      document: customer.document ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      zip_code: customer.zip_code ?? "",
      notes: customer.notes ?? "",
    });
    setFormOpen(true);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (editing) updateMut.mutate({ ...form, id: editing.id });
    else createMut.mutate(form);
  }

  if (!canView) {
    return (
      <AppShell title={t("customers.title")}>
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("error.forbidden")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("customers.title")} description={ctx?.company?.name ?? undefined}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("customers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("common.all")}</SelectItem>
              <SelectItem value="ACTIVE">{t("status.userACTIVE")}</SelectItem>
              <SelectItem value="INACTIVE">{t("status.userINACTIVE")}</SelectItem>
            </SelectContent>
          </Select>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              {t("customers.new")}
            </Button>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "ALL"
                  ? t("customers.noMatch")
                  : t("common.empty")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customers.name")}</TableHead>
                    <TableHead>{t("customers.document")}</TableHead>
                    <TableHead>{t("customers.contact")}</TableHead>
                    <TableHead>{t("customers.location")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        {customer.notes && (
                          <div className="max-w-xs truncate text-xs text-muted-foreground">
                            {customer.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{customer.document || t("common.none")}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {customer.email && <div>{customer.email}</div>}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="size-3.5" />
                              {customer.phone}
                            </div>
                          )}
                          {!customer.email && !customer.phone && t("common.none")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          {customer.city || customer.state ? <MapPin className="size-3.5" /> : null}
                          {[customer.city, customer.state].filter(Boolean).join(" / ") || t("common.none")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.status === "ACTIVE" ? "default" : "outline"}>
                          {customer.status === "ACTIVE"
                            ? t("status.userACTIVE")
                            : t("status.userINACTIVE")}
                        </Badge>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={t("common.actions")}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => openEdit(customer)}>
                                  <Edit3 className="mr-2 size-4" />
                                  {t("common.edit")}
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    statusMut.mutate({
                                      id: customer.id,
                                      status:
                                        customer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                    })
                                  }
                                >
                                  {customer.status === "ACTIVE"
                                    ? t("customers.deactivate")
                                    : t("customers.reactivate")}
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTarget(customer)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    {t("common.delete")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("customers.edit") : t("customers.new")}</DialogTitle>
            <DialogDescription>{t("customers.formDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("customers.name")} *</Label>
              <Input
                required
                maxLength={160}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.document")}</Label>
              <Input
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
                placeholder="CPF / CNPJ"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("customers.email")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("customers.address")}</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.city")}</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.state")}</Label>
              <Input
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customers.zip")}</Label>
              <Input
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("customers.notes")}</Label>
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("customers.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("customers.deleteDescription")} <strong>{deleteTarget?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
