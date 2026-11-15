# Meu Financeiro — Laboratório v1.0

Ambiente demonstrativo **isolado da produção**. O endereço publicado será https://lucasmamede.github.io/meu-financeiro/teste/ após a integração na branch principal.

## Segurança

- A demonstração não inicializa Supabase Auth, Edge Functions ou conexão com as tabelas da produção.
- Todos os registros são fictícios e ficam no navegador, na chave `meu-financeiro-laboratorio-demo-v1`.
- O botão Reiniciar demonstração apaga apenas o conjunto fictício local; nenhum registro real é lido, enviado ou alterado.
- O botão de importação permite exclusivamente backup JSON de demonstração; não há restauração para a produção.
- A atualização de CDI é opcional e consulta somente a API pública SGS 12 do Banco Central; existe uma taxa didática de fallback, com identificação clara.

## Diagnóstico do app existente

A versão atual concentra UI, eventos e integração em arquivo HTML grande, dificultando manutenção. A navegação mistura responsabilidades e requer atenção a competências distintas: compra, faturamento e pagamento. O laboratório separa visualmente resultado de competência, caixa e investimentos estimados.

## O que foi desenvolvido

| Tela | Fluxos implementados |
| --- | --- |
| Dashboard | Receitas, gastos por competência, saldo real de caixa demonstrativo, faturas, aportes, tendências e próximos vencimentos |
| Lançamentos | Cadastro de seis tipos, edição, exclusão, duplicação, busca, filtros, seleção e categorização em lote; categoria rápida |
| Contas | Cadastro de contas, extrato por conta, saldo consolidado, transferência e contas a pagar |
| Cartões | Limite, faturas por vencimento, parcelamento, pagamento parcial, reversão e detalhes |
| Calendário | Vencimentos, contas pagas, compras, faturas e assinaturas, com ações nos eventos |
| Assinaturas | Cadastro, edição, pausa, cancelamento e registro de cobrança sem duplicar previsão |
| Investimentos | Aporte, resgate, CDI, posição por data e simulador em cenários de 1/3/5/10 anos |
| Configurações | Categorias (nome/tipo/cor/ícone), backup fictício JSON, restauração, reset e testes financeiros |

As páginas Metas e Cupons não fazem parte do Laboratório.

## Regras importantes

- Dinheiro armazenado em centavos inteiros.
- Fechamento dia 27, vencimento dia 03: compra 25/06 -> 03/07; compra 28/06 -> 03/08.
- Parcelamento em faturas com valor dividido; campo parcela atual suportado.
- Compra de cartão integra consumo na competência da parcela; pagamento da fatura reduz caixa, sem duplicar consumo.
- Contas recorrentes têm status por ocorrência e permitem edição pontual, futura ou na série inteira.
- Assinaturas só geram despesa de consumo depois de registrada a cobrança.
- Aporte reduz o caixa mas não é despesa de consumo; resgate aumenta o caixa; datas futuras não entram no patrimônio de datas anteriores.
- Rendimento é estimativa antes de impostos/tarifas, não um saldo bancário confirmado.

## Arquitetura

- `index.html`: entrada do aplicativo e navegação responsiva.
- `styles.css`: identidade visual escura para desktop e celular.
- `rules.js`: lógica pura para competência, faturas, parcelas, caixa e investimentos.
- `seed.js`: gerador de dados fictícios.
- `engine.js`: operações CRUD e armazenamento isolado.
- `views.js`: renderização das oito telas.
- `app.js`: formulários, ações e modais.
- `tests.js`: 23 testes de regras sem alterações no armazenamento real ou fictício.
- `tests/flow.spec.cjs`: testes de interface Playwright.
- `playwright.config.cjs`: execução Chromium desktop e mobile.

## Testes

Em Configurações, clique **Executar testes**. Os 23 cenários criam dados de teste em memória, sem alterar sua demonstração.

A suíte Playwright cobre navegação, persistência local, criação de despesas, compras parceladas, pagamento de fatura, categorias e execução dos testes financeiros. Ela roda em Chromium desktop e emulação de celular quando instalada/executada.

Comandos locais dentro de `meu-financeiro/teste`:

    npm install
    npx playwright install chromium
    npm test

O workflow do GitHub Actions (`.github/workflows/meu-financeiro-lab.yml`) executa esses testes automaticamente ao atualizar a pasta de testes na branch master. Verifique o resultado da execução antes da integração com a produção.

## Fluxos para testar manualmente

1. Dashboard → Lançamentos → nova despesa → conferir gastos e saldo de caixa.
2. Compra parcelada → Cartões → fatura → pagar → verificar que o consumo não duplicou.
3. Calendário → conta pendente → marcar paga e reverter.
4. Configurações → categoria nova → Lançamentos → categorizar vários registros.
5. Assinaturas → registrar cobrança → conferir lançamento e próximo vencimento.
6. Investimentos → lançar aporte futuro → comparar posição antes e depois da data.
7. Configurações → exportar JSON demonstrativo → reiniciar → importar.

## Referências verificadas

- Actual Budget: https://actualbudget.org/docs/transactions/bulk-editing/
- Actual Budget: https://actualbudget.org/docs/schedules/
- YNAB: https://support.ynab.com/en_us/credit-card-payments-a-guide-r1_506Q1j
- Material Design responsivo: https://developer.android.com/guide/navigation/responsive/config-changes
- Banco Central: https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json

## Limitações

É um laboratório de homologação com cenários fictícios, não uma migração funcional já conectada ao Supabase real. Não sincroniza entre dispositivos. Dados locais podem ser removidos pelo navegador. O CDI depende de disponibilidade e CORS da API oficial. As regras devem ser comparadas com a produção e auditadas antes de qualquer substituição do aplicativo principal.
