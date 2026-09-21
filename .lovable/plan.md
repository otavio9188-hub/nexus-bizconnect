# Nexus ERP — plano de construção por fases

ERP SaaS multiempresa, real e funcional: banco de dados próprio, login seguro, isolamento total entre empresas e permissões aplicadas no servidor (não só na tela).

Identidade visual: azul corporativo (#0B1B34, #1D4ED8, #2563EB, #F1F5F9). Interface em Português (Brasil), já estruturada para receber Inglês e Espanhol depois.

## Como vamos trabalhar

Construo por fases. A cada fase você recebe algo utilizável e testável, e só então seguimos para a próxima. Nada de telas de mentira: se aparece na tela, funciona.

---

## Fase 1 — Fundação (esta fase)

O que fica pronto e testável no fim dela:

1. **Banco de dados completo** com todas as tabelas do ERP (empresas, usuários, permissões, clientes, produtos, estoque, vendas, compras, fornecedores, financeiro, registros de auditoria). Toda linha carrega a empresa dona, e o banco bloqueia acesso de uma empresa aos dados de outra.
2. **Login seguro**, sem cadastro público. Esqueci minha senha e redefinição de senha funcionando.
3. **Sua conta de dono da plataforma** criada para otavio.9188@gmail.com.
4. **Área Nexus (dono da plataforma)**: criar empresa + administrador inicial, com senha temporária gerada automaticamente e botão de copiar (mostrada só naquele momento). Listar, ver, editar, suspender, reativar e excluir empresas — exclusão apenas de empresas bloqueadas e com confirmação digitando o nome.
5. **Troca obrigatória de senha no primeiro acesso**.
6. **Bloqueio de empresa suspensa**: usuários dessa empresa não entram e veem a mensagem de contato com o suporte.
7. **Gestão de funcionários** pela empresa: criar, editar, desativar, reativar, trocar cargo, redefinir senha temporária.
8. **Permissões por módulo e por ação** (ver, criar, editar, excluir), aplicadas no servidor.
9. **Layout base do ERP**: menu lateral, barra superior, menu do usuário, tabelas, filtros, modais, avisos, estados de carregando/vazio/erro, responsivo.
10. **Registro de auditoria** de tudo que acontece nessas operações.

## Fases seguintes

- **Fase 2** — Clientes, Fornecedores, Produtos e Estoque (com histórico de movimentações e alertas de estoque baixo).
- **Fase 3** — Vendas e Compras, com baixa/entrada automática de estoque e lançamento financeiro, tudo em operação única (ou tudo grava, ou nada grava).
- **Fase 4** — Financeiro: fluxo de caixa, contas a pagar e a receber.
- **Fase 5** — Painel inicial com números reais e gráficos, e Relatórios com filtros e exportação.
- **Fase 6** — Central de Ajuda com tutoriais e busca.
- **Fase 7** — Inglês e Espanhol + polimento visual final.

---

## Detalhes técnicos (Fase 1)

- Backend: Lovable Cloud (Postgres + autenticação). Todas as tabelas com `company_id`, chaves estrangeiras, índices e RLS ativa.
- Papéis em tabela separada (`user_roles`: NEXUS_OWNER, COMPANY_ADMIN, MANAGER, EMPLOYEE) + `user_permissions` por módulo/ação. Nunca papel na tabela de perfil.
- Funções `security definer`: `current_company_id()`, `has_role()`, `has_permission(module, action)`, `company_is_active()`. Políticas RLS usam essas funções — evita recursão e impede escolher `company_id` pelo cliente.
- `company_id` nunca vem do frontend: é derivado do usuário autenticado no servidor.
- Criação de empresa/usuário e reset de senha temporária via server functions privilegiadas, autorizadas por papel antes de qualquer escrita; senha temporária gerada com gerador criptográfico e devolvida uma única vez, nunca gravada em texto.
- Rotas protegidas em `_authenticated`; gate adicional para a área Nexus.
- Auditoria via tabela `audit_logs` gravada nas próprias operações do servidor (usuário, empresa, ação, módulo, registro, valor anterior/novo).
- i18n com arquivo de chaves PT-BR desde o início; nenhum texto fixo no código.
