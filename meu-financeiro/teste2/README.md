# Meu Financeiro — Estúdio (Teste 2)

## Objetivo

Segunda proposta **visualmente e estruturalmente diferente** do Laboratório 1. Mantém o motor de cálculos validado e reimagina as telas: navegação horizontal, painel inicial com saldo disponível, compromissos e ações prioritárias, formulários laterais, tema escuro ou claro e menos cards sem contexto.

URL de demonstração após publicar: https://lucasmamede.github.io/meu-financeiro/teste2/

## Isolamento

- Esta página é uma demonstração. **Não consulta ou altera o Supabase real**.
- Não contém chaves, URLs ou login da produção.
- Todos os dados são fictícios, na chave `meu-financeiro-teste2-demo-v1` do localStorage.
- Não compartilha o armazenamento da primeira demonstração (`/teste/`).
- O botão Reiniciar apaga apenas os dados fictícios do Teste 2.
- A versão publicada em `/meu-financeiro/` e o Laboratório 1 em `/meu-financeiro/teste/` não devem ser alterados por este projeto.
- O CDI é a única consulta opcional de rede, somente leitura, à série SGS 12 do Banco Central. Se falhar, mantém a taxa didática explicitamente identificada.

## Novo fluxo

- **Início**: um valor principal (caixa disponível hoje) e o resumo do mês, próximos compromissos, categorias e movimentações. O valor investido é rotulado como estimativa, separado do caixa.
- **Lançamentos**: escolha entre receita, despesa, compra no cartão, transferência, aporte e resgate. Busca, filtro, detalhamento, edição, exclusão, duplicação e categorias em lote.
- **Agenda**: calendário de compromissos, faturas, assinaturas e movimentações. Selecionar um dia revela os itens e as ações aplicáveis.
- **Cartões**: tela única com seleção do cartão, visão de limite, ciclo, faturas e pagamento sem duplicar consumo.
- **Investimentos**: evolução da carteira por data, CDI percentual, aporte/resgate e projeção hipotética.
- **Contas**: saldos, transferências, cadastro e vencimentos com pagamento.
- **Assinaturas**: cadastro e registro de cobrança, pausa, cancelamento.
- **Configurações**: categorias com ícones/cores, tema claro/escuro, backup demonstrativo, reinicialização e testes das regras.

Não há páginas Metas ou Cupons.

## Detalhes técnicos

Arquivos: `index.html`, `style.css`, `rules.js`, `seed.js`, `engine.js`, `tests.js`, `views.js` e `app.js`. `rules.js`, `seed.js`, `engine.js` e `tests.js` partem da implementação validada no Laboratório 1, mas o mecanismo de armazenamento usa uma chave distinta. O frontend da segunda proposta é uma reimplementação original e não reutiliza o layout da primeira.

O motor preserva cálculos de centavos, fechamento e vencimento, parcelamentos, pagamentos de fatura sem dupla contagem, recorrências, rendimentos estimados por data e segurança dos vínculos.

## Testes

Os 23 testes financeiros do motor são executados em memória (Configurações > Executar testes). Os testes automáticos Playwright verificam navegação, cadastro e persistência de despesa, parcelamento, pagamento da fatura, pagamentos no calendário, categoria e tema, em Chromium desktop e celular.

O workflow `.github/workflows/meu-financeiro-teste2.yml` usa Ubuntu 24.04 para executar os testes automaticamente ao atualizar a pasta do Teste 2.

### Rodar localmente

Dentro de `meu-financeiro/teste2`:

```sh
npm install
npx playwright install chromium
npm test
```

## Comparação entre testes

| Laboratório 1 | Estúdio (Teste 2) |
| --- | --- |
| Menu lateral denso | Navegação horizontal e menu responsivo |
| Muitos cartões de informação | Um saldo principal e prioridades do dia |
| Gráficos em vários componentes | Visualização de gastos e compromissos contextual |
| Formulários centrais | Painel lateral para inserir e editar |
| Fundo azul-escuro | Paleta verde editorial, com opção de tema claro |
| Dados fictícios no navegador | Outros dados fictícios, em chave totalmente separada |

**Não migre nenhuma das versões para o app principal sem análise dos fluxos e autorização explícita.**

## Limitações

É uma demonstração funcional com dados locais, não um lançamento de software financeiro pronto para produção. Não há sincronização entre dispositivos, acesso direto aos bancos, contas reais, cotação garantida nem restauração de dados de produção. O retorno do CDI é meramente indicativo, antes de taxas/impostos, e não garante desempenho futuro.
