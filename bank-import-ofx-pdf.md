# Importação de Extrato Bancário (OFX/PDF)

## Goal
Permitir o upload de extratos OFX (Mercado Pago, Santander) e PDF na aba Movimentações, parsear automaticamente as transações e exibir um modal de revisão antes de salvar no banco.

## Contexto Técnico
- Stack: Next.js + Supabase + TypeScript
- Arquivo principal: `app/financeiro/page.tsx`
- Hooks: `lib/hooks.ts` | Tipos: `lib/types.ts`
- Bancos: Mercado Pago (OFX) e Santander (OFX/PDF)

## Tasks

- [x] **Task 1:** Instalar dependências de parsing
  - `pnpm add ofx-js pdf-parse`
  - `pnpm add -D @types/pdf-parse`
  - → Verify: `package.json` contém as duas libs

- [x] **Task 2:** Criar migration Supabase para `bank_imports`
  - Campos: `id`, `banco` (mercado_pago | santander), `data_importacao`, `formato` (ofx | pdf), `status` (pendente | confirmado), `created_at`
  - Tabela `bank_import_transactions`: `id`, `import_id (FK)`, `descricao`, `valor`, `data`, `tipo` (entrada | saida), `status_reconciliacao` (novo | duplicado | conciliado), `transaction_id (FK nullable)`
  - → Verify: migration aplicada, tabelas visíveis no Supabase

- [x] **Task 3:** Criar `lib/bankParser.ts` com parsers para OFX e PDF
  - `parseOFX(file: File): ParsedTransaction[]` — usa `ofx-js`, extrai `DTPOSTED`, `TRNAMT`, `MEMO`
  - `parsePDF(file: File): ParsedTransaction[]` — usa `pdf-parse` + regex para Santander e Mercado Pago
  - Tipo `ParsedTransaction`: `{ descricao, valor, data, tipo }`
  - → Verify: `console.log` retorna array de transações ao testar com arquivo real

- [x] **Task 4:** Adicionar hooks em `lib/hooks.ts`
  - `useBankImports()` — lista imports anteriores
  - `saveBankImport(banco, formato, transactions[])` — cria registro + transações em `bank_import_transactions`
  - `confirmBankImport(importId, selectedTransactions[])` — salva confirmadas em `financial_transactions`
  - → Verify: funções exportadas sem erro de TypeScript

- [x] **Task 5:** Criar componente de upload em `app/financeiro/page.tsx` (dentro da aba Movimentações)
  - Botão "Importar Extrato" ao lado do botão "Exportar CSV" existente
  - `<input type="file" accept=".ofx,.pdf" />` com drag-and-drop
  - Ao selecionar arquivo: chama parser correto (detecta por extensão) → abre modal de revisão
  - → Verify: arquivo OFX é carregado e o modal abre com as transações parseadas

- [x] **Task 6:** Criar `BankImportReviewModal` em `app/financeiro/page.tsx`
  - Lista as transações parseadas em tabela: data | descrição | valor | tipo | categoria (select editável)
  - Checkbox por linha para selecionar quais importar
  - Badge "Duplicado" para transações já existentes (comparar por valor + data ± 1 dia)
  - Botão "Confirmar importação" → chama `confirmBankImport()`
  - → Verify: modal exibe transações, permite desmarcar duplicadas e salva apenas as selecionadas

- [x] **Task 7:** Adicionar tipos em `lib/types.ts`
  - `BankImport`, `BankImportTransaction`, `ParsedTransaction`
  - → Verify: sem erros de TypeScript em `page.tsx` ao usar os novos tipos

## Done When
- [x] Upload de OFX do Santander e Mercado Pago parseia corretamente
- [x] Modal de revisão mostra transações com detecção de duplicatas
- [x] Transações confirmadas aparecem em Movimentações sem duplicar
- [x] Histórico de imports visível na aba

## Notas
- PDF do Mercado Pago tem layout fixo; criar regex específica para o cabeçalho "Descrição | Data | Valor"
- PDF do Santander usa colunas "Lançamento | Histórico | Débito | Crédito" — regex separada
- OFX é padrão open; `ofx-js` cobre ambos os bancos sem customização
- Duplicatas: comparar `valor` exato + `data_vencimento` ± 1 dia + `tipo`
