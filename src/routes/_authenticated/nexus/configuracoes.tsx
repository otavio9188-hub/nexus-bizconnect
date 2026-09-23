import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/nexus/AppShell";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/nexus/configuracoes")({
  component: PlatformSettingsPage,
});

function PlatformSettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { data: ctx } = useSessionContext();

  return (
    <AppShell title={t("nav.settings")} description={t("nav.platform")}>
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("role.NEXUS_OWNER")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">{t("employees.name")}: </span>
              {ctx?.profile.full_name}
            </div>
            <div>
              <span className="text-muted-foreground">{t("auth.email")}: </span>
              {ctx?.profile.email}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("common.language")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <Button
                key={l.value}
                variant={locale === l.value ? "default" : "outline"}
                size="sm"
                onClick={() => setLocale(l.value as Locale)}
              >
                {l.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("nav.plans")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cada empresa possui um plano registrado. A gestão comercial de planos entra em uma
              fase seguinte da implantação.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
