import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/nexus/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/acesso-bloqueado")({
  component: BlockedPage,
});

function BlockedPage() {
  const { t } = useI18n();
  const { data: ctx } = useSessionContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const inactiveUser = ctx?.profile.status !== "ACTIVE";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <h1 className="text-xl font-semibold">{t("blocked.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {inactiveUser ? t("blocked.inactiveUser") : t("blocked.message")}
        </p>
        <Button variant="outline" onClick={signOut}>
          {t("auth.signOut")}
        </Button>
      </div>
    </div>
  );
}
