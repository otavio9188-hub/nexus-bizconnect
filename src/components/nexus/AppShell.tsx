import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n";
import { can } from "@/lib/nexus-shared";
import { listNexusCompanies, setActiveCompany } from "@/lib/session.functions";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

type NavItem = { to: string; label: string; icon: typeof Users };

export function AppShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string | undefined;
}) {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: ctx, isLoading, error } = useSessionContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const companiesFn = useServerFn(listNexusCompanies);
  const setCompanyFn = useServerFn(setActiveCompany);
  const companiesQuery = useQuery({
    queryKey: ["nexus-companies-selector"],
    queryFn: () => companiesFn(),
    enabled: Boolean(ctx?.isNexusOwner),
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!ctx) return;
    if (ctx.profile.must_change_password) {
      navigate({ to: "/trocar-senha", replace: true });
      return;
    }
    if (!ctx.isNexusOwner) {
      const blocked = ctx.profile.status !== "ACTIVE" || ctx.company?.status !== "ACTIVE";
      if (blocked) navigate({ to: "/acesso-bloqueado", replace: true });
    }
  }, [ctx, navigate]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav: NavItem[] = [];
  if (ctx?.isNexusOwner) {
    nav.push(
      { to: "/nexus", label: t("nav.dashboard"), icon: LayoutDashboard },
      ...(ctx.company?.kind === "STUDIO_NEXUS"
        ? [{ to: "/estudio", label: "Estúdio Nexus", icon: LayoutDashboard as typeof Users },
          { to: "/estudio/conteudos", label: "Conteúdos", icon: CalendarDays }]
        : []),
      { to: "/nexus/empresas", label: t("nav.companies"), icon: Building2 },
      { to: "/nexus/usuarios", label: t("nav.users"), icon: Users },
      { to: "/nexus/auditoria", label: t("nav.audit_logs"), icon: ScrollText },
      { to: "/nexus/configuracoes", label: t("nav.settings"), icon: Settings },
    );
  } else if (ctx) {
    nav.push({ to: "/painel", label: t("nav.dashboard"), icon: LayoutDashboard });
    if (can(ctx, "customers", "VIEW"))
      nav.push({ to: "/clientes", label: t("nav.customers"), icon: Users });
    if (can(ctx, "employees", "VIEW"))
      nav.push({ to: "/funcionarios", label: t("nav.employees"), icon: Users });
    if (can(ctx, "audit_logs", "VIEW"))
      nav.push({ to: "/auditoria", label: t("nav.audit_logs"), icon: ScrollText });
    nav.push({ to: "/ajuda", label: t("nav.help"), icon: LifeBuoy });
  }

  const initials = (ctx?.profile.full_name || ctx?.profile.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <Logo />
        <button
          className="text-sidebar-foreground/70 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label={t("common.close")}
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
          {ctx?.isNexusOwner ? t("nav.platform") : (ctx?.company?.name ?? "")}
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/45">
        Nexus ERP · {new Date().getFullYear()}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="fixed inset-y-0 w-64">{sidebar}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {description && (
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          {ctx?.isNexusOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-48 gap-1 text-xs">
                  <Building2 className="size-3.5" />
                  <span className="truncate">{ctx.company?.name ?? "Selecionar empresa"}</span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Empresa ativa</DropdownMenuLabel>
                {companiesQuery.data?.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={async () => {
                      await setCompanyFn({ data: { companyId: company.id } });
                      await queryClient.invalidateQueries({ queryKey: ["session-context"] });
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{company.name}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {company.kind === "STUDIO_NEXUS" ? "Estúdio Nexus" : "Cliente"}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                {locale.toUpperCase()}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
              {LOCALES.map((l) => (
                <DropdownMenuItem key={l.value} onClick={() => setLocale(l.value as Locale)}>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border bg-background py-1 pl-1 pr-3 text-sm hover:bg-accent">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </span>
                <span className="hidden max-w-32 truncate sm:inline">
                  {ctx?.profile.full_name || ctx?.profile.email}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="space-y-0.5">
                <div className="truncate text-sm">{ctx?.profile.full_name}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {ctx?.profile.email}
                </div>
                <div className="flex items-center gap-1 pt-1 text-xs font-normal text-primary">
                  <ShieldCheck className="size-3" />
                  {t(`role.${ctx?.roles[0] ?? "EMPLOYEE"}`)}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/trocar-senha" })}>
                {t("password.changeTitle")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 size-4" />
                {t("auth.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              {t("error.unknown")}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
