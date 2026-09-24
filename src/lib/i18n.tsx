import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "pt-BR" | "en" | "es";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "pt-BR", label: "Português (BR)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

type Dict = Record<string, string>;

const pt: Dict = {
  "app.name": "Nexus ERP",
  "app.tagline": "Gestão empresarial multiempresa",

  "common.save": "Salvar",
  "common.cancel": "Cancelar",
  "common.create": "Criar",
  "common.edit": "Editar",
  "common.delete": "Excluir",
  "common.close": "Fechar",
  "common.search": "Buscar",
  "common.actions": "Ações",
  "common.status": "Status",
  "common.loading": "Carregando...",
  "common.empty": "Nenhum registro encontrado",
  "common.error": "Não foi possível concluir a operação",
  "common.confirm": "Confirmar",
  "common.copy": "Copiar",
  "common.copied": "Copiado!",
  "common.yes": "Sim",
  "common.no": "Não",
  "common.all": "Todos",
  "common.required": "Campo obrigatório",
  "common.back": "Voltar",
  "common.none": "—",
  "common.language": "Idioma",

  "auth.title": "Entrar no Nexus ERP",
  "auth.subtitle": "Acesse com as credenciais fornecidas pela sua empresa.",
  "auth.email": "E-mail",
  "auth.password": "Senha",
  "auth.signIn": "Entrar",
  "auth.forgot": "Esqueci minha senha",
  "auth.forgotTitle": "Recuperar senha",
  "auth.forgotSubtitle": "Enviaremos um link de redefinição para o seu e-mail.",
  "auth.sendLink": "Enviar link",
  "auth.linkSent": "Se o e-mail existir, o link de redefinição foi enviado.",
  "auth.invalid": "E-mail ou senha incorretos.",
  "auth.signOut": "Sair",
  "auth.noPublicSignup": "O acesso é criado pela administração. Não há cadastro público.",

  "password.changeTitle": "Defina sua nova senha",
  "password.changeSubtitle": "Por segurança, troque a senha temporária antes de continuar.",
  "password.new": "Nova senha",
  "password.confirm": "Confirmar senha",
  "password.mismatch": "As senhas não conferem.",
  "password.tooShort": "A senha deve ter pelo menos 8 caracteres.",
  "password.changed": "Senha alterada com sucesso.",
  "password.resetTitle": "Redefinir senha",
  "password.temporary": "Senha temporária gerada",
  "password.temporaryHint": "Copie e envie ao usuário. Ela não será exibida novamente.",

  "blocked.title": "Acesso indisponível",
  "blocked.message":
    "Sua empresa está suspensa ou bloqueada no momento. Entre em contato com o Suporte Nexus.",
  "blocked.inactiveUser": "Seu usuário está inativo. Fale com o administrador da sua empresa.",

  "nav.dashboard": "Painel",
  "nav.sales": "Vendas",
  "nav.customers": "Clientes",
  "nav.products": "Produtos",
  "nav.inventory": "Estoque",
  "nav.purchases": "Compras",
  "nav.suppliers": "Fornecedores",
  "nav.finance": "Financeiro",
  "nav.accounts_payable": "Contas a pagar",
  "nav.accounts_receivable": "Contas a receber",
  "nav.reports": "Relatórios",
  "nav.employees": "Funcionários",
  "nav.company_settings": "Configurações",
  "nav.audit_logs": "Auditoria",
  "nav.help": "Ajuda / Tutorial",
  "nav.platform": "Plataforma Nexus",
  "nav.companies": "Empresas",
  "nav.users": "Usuários",
  "nav.plans": "Planos",
  "nav.settings": "Configurações",

  "role.NEXUS_OWNER": "Dono da plataforma",
  "role.COMPANY_ADMIN": "Administrador",
  "role.MANAGER": "Gerente",
  "role.EMPLOYEE": "Funcionário",

  "status.ACTIVE": "Ativa",
  "status.SUSPENDED": "Suspensa",
  "status.BLOCKED": "Bloqueada",
  "status.userACTIVE": "Ativo",
  "status.userINACTIVE": "Inativo",

  "action.VIEW": "Ver",
  "action.CREATE": "Criar",
  "action.EDIT": "Editar",
  "action.DELETE": "Excluir",

  "nexus.title": "Administração Nexus",
  "nexus.companies": "Empresas",
  "nexus.newCompany": "Nova empresa",
  "nexus.company.name": "Nome fantasia",
  "nexus.company.legalName": "Razão social",
  "nexus.company.cnpj": "CNPJ",
  "nexus.company.email": "E-mail",
  "nexus.company.phone": "Telefone",
  "nexus.company.address": "Endereço",
  "nexus.company.city": "Cidade",
  "nexus.company.state": "Estado",
  "nexus.company.zip": "CEP",
  "nexus.company.createdAt": "Criada em",
  "nexus.company.users": "Usuários",
  "nexus.company.admin": "Administrador",
  "nexus.admin.section": "Administrador inicial",
  "nexus.admin.name": "Nome completo",
  "nexus.admin.email": "E-mail",
  "nexus.admin.phone": "Telefone",
  "nexus.suspend": "Suspender",
  "nexus.block": "Bloquear",
  "nexus.reactivate": "Reativar",
  "nexus.deleteCompany": "Excluir definitivamente",
  "nexus.deleteOnlyBlocked": "Só é possível excluir empresas suspensas ou bloqueadas.",
  "nexus.deleteConfirm": "Digite o nome da empresa para confirmar a exclusão:",
  "nexus.deleted": "Empresa excluída definitivamente.",
  "nexus.created": "Empresa criada com sucesso.",
  "nexus.statusChanged": "Status da empresa atualizado.",

  "customers.title": "Clientes",
  "customers.new": "Novo cliente",
  "customers.edit": "Editar cliente",
  "customers.name": "Nome",
  "customers.document": "CPF / CNPJ",
  "customers.contact": "Contato",
  "customers.phone": "Telefone",
  "customers.email": "E-mail",
  "customers.address": "Endereço",
  "customers.city": "Cidade",
  "customers.state": "UF",
  "customers.zip": "CEP",
  "customers.notes": "Observações",
  "customers.location": "Localização",
  "customers.searchPlaceholder": "Buscar por nome, documento, e-mail, telefone ou cidade...",
  "customers.formDescription": "Cadastre os dados de contato e endereço do cliente.",
  "customers.noMatch": "Nenhum cliente corresponde aos filtros.",
  "customers.created": "Cliente cadastrado com sucesso.",
  "customers.updated": "Cliente atualizado com sucesso.",
  "customers.deleted": "Cliente excluído com sucesso.",
  "customers.deactivated": "Cliente desativado.",
  "customers.reactivated": "Cliente reativado.",
  "customers.deactivate": "Desativar",
  "customers.reactivate": "Reativar",
  "customers.deleteTitle": "Excluir cliente?",
  "customers.deleteDescription": "Esta ação removerá o cadastro de",
  
  "employees.title": "Funcionários",
  "employees.new": "Novo funcionário",
  "employees.name": "Nome",
  "employees.email": "E-mail",
  "employees.phone": "Telefone",
  "employees.cpf": "CPF",
  "employees.position": "Cargo",
  "employees.department": "Departamento",
  "employees.role": "Perfil de acesso",
  "employees.permissions": "Permissões",
  "employees.deactivate": "Desativar",
  "employees.reactivate": "Reativar",
  "employees.resetPassword": "Redefinir senha",
  "employees.created": "Funcionário criado.",
  "employees.updated": "Funcionário atualizado.",
  "employees.permissionsSaved": "Permissões atualizadas.",

  "audit.title": "Registros de auditoria",
  "audit.user": "Usuário",
  "audit.action": "Ação",
  "audit.module": "Módulo",
  "audit.record": "Registro",
  "audit.date": "Data/hora",
  "audit.company": "Empresa",

  "dashboard.title": "Painel",
  "dashboard.welcome": "Bem-vindo ao Nexus ERP",
  "dashboard.soon": "Este módulo será liberado na próxima fase da implantação.",

  "error.forbidden": "Você não tem permissão para executar esta ação.",
  "error.unknown": "Ocorreu um erro inesperado. Tente novamente.",
};

const en: Dict = {
  "app.tagline": "Multi-company business management",
  "auth.title": "Sign in to Nexus ERP",
  "auth.signIn": "Sign in",
  "auth.email": "Email",
  "auth.password": "Password",
  "common.save": "Save",
  "common.cancel": "Cancel",
};

const es: Dict = {
  "app.tagline": "Gestión empresarial multiempresa",
  "auth.title": "Entrar en Nexus ERP",
  "auth.signIn": "Entrar",
  "auth.email": "Correo",
  "auth.password": "Contraseña",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
};

const DICTS: Record<Locale, Dict> = { "pt-BR": pt, en, es };

const STORAGE_KEY = "nexus.locale";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-BR");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in DICTS) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) =>
      DICTS[locale][key] ?? DICTS["pt-BR"][key] ?? fallback ?? key,
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
