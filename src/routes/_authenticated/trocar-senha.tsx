import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { changeMyPassword } from "@/lib/session.functions";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/nexus/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/trocar-senha")({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: ctx } = useSessionContext();
  const change = useServerFn(changeMyPassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: (pw: string) => change({ data: { password: pw } }),
    onSuccess: async () => {
      toast.success(t("password.changed"));
      await queryClient.invalidateQueries({ queryKey: ["session-context"] });
      navigate({ to: ctx?.isNexusOwner ? "/nexus" : "/painel", replace: true });
    },
    onError: () => toast.error(t("error.unknown")),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("password.tooShort"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("password.mismatch"));
      return;
    }
    mutation.mutate(password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6">
      <div className="w-full max-w-sm space-y-8 rounded-xl border bg-card p-8 shadow-sm">
        <Logo />
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">{t("password.changeTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("password.changeSubtitle")}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">{t("password.new")}</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">{t("password.confirm")}</Label>
            <Input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </form>
      </div>
    </div>
  );
}
