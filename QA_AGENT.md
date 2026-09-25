# Nexus QA Agent

Primeira camada automática de QA do Nexus.

Verifica existência dos módulos, CRUDs essenciais, isolamento por company_id, integração financeiro/caixa, telas principais, lint e build.

## Execução
npm run qa
npm run lint
npm run build

O workflow .github/workflows/qa.yml roda automaticamente em push e Pull Request.

Este agente não cria dados reais nem faz alterações destrutivas no banco.

Próxima evolução: testes autenticados em ambiente de teste para login, permissões, CRUD, baixas financeiras, sincronização do caixa, isolamento entre empresas e auditoria.
