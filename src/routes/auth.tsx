import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/nexus/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Nexus ERP" },
      {
        name: "description",
        content: "Acesse o Nexus ERP, a plataforma de gestão empresarial multiempresa.",
      },
      { property: "og:title", content: "Entrar | Nexus ERP" },
      {
        property: "og:description",
        content: "Acesse o Nexus ERP, a plataforma de gestão empresarial multiempresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(t("auth.invalid"));
      return;
    }
    navigate({ to: "/", replace: true });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    toast.success(t("auth.linkSent"));
    setMode("login");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Logo />
        <div className="space-y-4">
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Gestão completa, isolada e segura para cada empresa.
          </h2>
          <p className="max-w-md text-sm text-sidebar-foreground/60">
            Vendas, estoque, compras, financeiro e controle de acesso em uma única plataforma
            multiempresa.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/40">{t("auth.noPublicSignup")}</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold">
              {mode === "login" ? t("auth.title") : t("auth.forgotTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? t("auth.subtitle") : t("auth.forgotSubtitle")}
            </p>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode === "login" && (
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "login" ? t("auth.signIn") : t("auth.sendLink")}
            </Button>
          </form>

          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "forgot" : "login")}
          >
            {mode === "login" ? t("auth.forgot") : t("common.back")}
          </button>
        </div>
      </div>
    </div>
  );
}
