import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AppShell } from "@/components/nexus/AppShell";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Article = { title: string; body: string; steps: string[]; tip?: string };

const ARTICLES: Article[] = [
  {
    title: "Primeiros passos",
    body: "Todo acesso ao Nexus ERP é criado pela administração — não existe cadastro público.",
    steps: [
      "Receba seu e-mail e a senha temporária do administrador da empresa.",
      "Entre na tela de login com esses dados.",
      "Defina uma senha definitiva na tela que aparece automaticamente.",
      "Pronto: o menu lateral mostra apenas os módulos liberados para você.",
    ],
    tip: "Esqueceu a senha? Use “Esqueci minha senha” na tela de login.",
  },
  {
    title: "Funcionários",
    body: "Administradores cadastram a equipe e definem o que cada pessoa pode fazer.",
    steps: [
      "Abra Funcionários no menu lateral.",
      "Clique em Novo funcionário e preencha os dados.",
      "Escolha o perfil de acesso (Administrador, Gerente ou Funcionário).",
      "Copie a senha temporária exibida e envie à pessoa — ela aparece apenas uma vez.",
    ],
    tip: "Para tirar o acesso de alguém sem apagar o histórico, use Desativar.",
  },
  {
    title: "Permissões",
    body: "As permissões são por módulo e por ação: ver, criar, editar e excluir.",
    steps: [
      "Em Funcionários, abra Permissões no funcionário desejado.",
      "Marque as ações permitidas em cada módulo.",
      "Salve — a mudança vale imediatamente, inclusive no servidor.",
    ],
    tip: "Administradores têm acesso completo à própria empresa automaticamente.",
  },
  {
    title: "Auditoria",
    body: "Todas as operações sensíveis ficam registradas com usuário, data e valores.",
    steps: [
      "Abra Auditoria no menu lateral.",
      "Use a busca para filtrar por usuário, ação ou módulo.",
    ],
  },
  {
    title: "Segurança e isolamento entre empresas",
    body: "Cada empresa tem um ambiente isolado. O sistema nunca aceita a identificação da empresa vinda da tela: ela é sempre deduzida do usuário autenticado.",
    steps: [
      "Nenhum usuário enxerga dados de outra empresa, mesmo alterando endereços ou requisições.",
      "Empresas suspensas ou bloqueadas têm o acesso interrompido para todos os usuários.",
    ],
  },
];

export const Route = createFileRoute("/_authenticated/ajuda")({
  component: HelpPage,
});

function HelpPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = ARTICLES.filter((a) =>
    (a.title + a.body + a.steps.join(" ")).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell title={t("nav.help")} description="Tutoriais e orientações do Nexus ERP">
      <div className="max-w-3xl space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("common.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
            {filtered.map((a) => (
              <AccordionItem key={a.title} value={a.title}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {a.title}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{a.body}</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    {a.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {a.tip && (
                    <p className="rounded-md bg-secondary p-3 text-xs">
                      <strong>Dica:</strong> {a.tip}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </AppShell>
  );
}
