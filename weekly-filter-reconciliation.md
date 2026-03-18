# Filtro Semanal + Conciliação Bancária

## Goal
Adicionar modal de filtro por intervalo livre de datas na aba Movimentações e lógica de conciliação que identifica automaticamente quais transações cadastradas foram efetivamente realizadas com base no extrato importado.

## Contexto Técnico
- Arquivo principal: `app/financeiro/page.tsx`
- Tab alvo: `movimentacoes`
- Painel (`painel`) receberá card de resumo da conciliação
- Depende do plano `bank-import-ofx-pdf.md` (tabela `bank_import_transactions` já existente)

## Tasks

- [x] **Task 1:** Adicionar estado de filtro por período em `page.tsx`
  - `const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null })`
  - `const [showDateRangeModal, setShowDateRangeModal] = useState(false)`
  - → Verify: estados declarados sem erro de TypeScript

- [x] **Task 2:** Criar `DateRangeModal` em `page.tsx`
  - Dois campos `<input type="date">` — "De" e "Até"
  - Botão "Aplicar filtro" → `setDateRange({ from, to })` + fecha modal
  - Botão "Limpar" → reseta para `null` (volta ao filtro mensal padrão)
  - → Verify: modal abre, seleção de datas funciona, filtro é aplicado visualmente

- [x] **Task 3:** Aplicar filtro de período nas transações exibidas em Movimentações
  - Se `dateRange.from && dateRange.to`: filtrar `transactions` por `data_vencimento` no intervalo
  - Senão: usar filtro mensal existente (comportamento atual mantido)
  - Mostrar badge "Período: 10/03 – 16/03" no header da aba quando filtro ativo
  - → Verify: transações filtradas correspondem exatamente ao intervalo selecionado

- [x] **Task 4:** Adicionar botão "Filtrar Período" na aba Movimentações
  - Posicionar ao lado dos filtros rápidos existentes (avulso, recorrente, imposto…)
  - Ícone de calendário + texto "Período"
  - → Verify: botão visível, ao clicar abre `DateRangeModal`

- [x] **Task 5:** Criar lógica de conciliação em `lib/bankParser.ts`
  - `reconcileTransactions(bankImportId: string, registeredTransactions: FinancialTransaction[]): ReconciliationResult`
  - Para cada transação do extrato: tenta casar com transação cadastrada (valor exato + data ± 1 dia)
  - Retorna: `{ conciliadas: [], naoEncontradas: [], novasNoBanco: [] }`
  - → Verify: função retorna listas corretas ao testar com dados mock

- [x] **Task 6:** Executar conciliação automaticamente após confirmação do import (`BankImportReviewModal`)
  - Após `confirmBankImport()`: chama `reconcileTransactions()` e atualiza `status` em `financial_transactions`
  - Status: `'pago_recebido'` para conciliadas, mantém `'pendente'` para as não encontradas
  - Atualiza `status_reconciliacao` em `bank_import_transactions`
  - → Verify: após importar extrato, transações pagas mudam de "Pendente" para "Pago/Recebido" automaticamente

- [x] **Task 7:** Adicionar card de conciliação no Painel (`painel`)
  - Card "Última Conciliação": data do import, banco, total conciliadas / total do extrato
  - Indicador: "X transações pendentes não encontradas no extrato"
  - Link "Ver detalhes" → navega para aba Movimentações com filtro do período do import
  - → Verify: card aparece no painel após primeiro import confirmado

## Done When
- [x] Modal de filtro por intervalo livre funciona em Movimentações
- [x] Após importar extrato, transações pagas são atualizadas automaticamente para "Pago/Recebido"
- [x] Transações não encontradas no extrato permanecem "Pendente" (sinalizando que não foram pagas)
- [x] Card de resumo da conciliação aparece no Painel

## Notas
- A conciliação responde à pergunta: "O que estava cadastrado como previsto realmente aconteceu?"
- `novasNoBanco` = lançamentos no extrato sem equivalente cadastrado → sugerir ao usuário criar a transação
- Ordem de execução: primeiro concluir `bank-import-ofx-pdf.md`, depois este plano
- O filtro semanal é independente do import; pode ser usado sem ter feito upload de extrato
