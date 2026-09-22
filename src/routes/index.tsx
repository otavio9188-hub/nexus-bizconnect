import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/nexus/Logo";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nexus ERP — Gestão empresarial multiempresa" },
      {
        name: "description",
        content:
          "Nexus ERP: vendas, estoque, compras, financeiro e controle de acesso para empresas de todos os portes.",
      },
      { property: "og:title", content: "Nexus ERP — Gestão empresarial multiempresa" },
      {
        property: "og:description",
        content:
          "Nexus ERP: vendas, estoque, compras, financeiro e controle de acesso para empresas de todos os portes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function route() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const isOwner = (roles ?? []).some((r) => r.role === "NEXUS_OWNER");
      navigate({ to: isOwner ? "/nexus" : "/painel", replace: true });
    }
    void route();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Logo />
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
