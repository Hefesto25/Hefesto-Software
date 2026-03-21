# Financeiro — Controle de Faturamento (seção na aba Financeiro)

## Goal
Adicionar seção "Controle de Faturamento" na aba financeira para rastrear o status de cada cobrança enviada via Asaas e se a nota fiscal correspondente foi gerada e está correta. Cobranças são vinculadas a clientes do CRM/Diretório. Controle manual (sem integração automática com API Asaas por ora).

## Tasks

- [x] **Modelar dados:** Adicionar tipos `AsaasCobranca` e `AsaasNotaFiscal` em `lib/types.ts`
  → Verify: tipos compilam sem erro no TS

- [x] **Migration:** Criar tabela `asaas_cobranças` com campos: `id`, `cliente_id` (FK para clientes do CRM), `cliente_nome`, `valor`, `status` (`pendente | enviada | nf_gerada | nf_verificada`), `data_emissao`, `data_vencimento`, `numero_nf`, `observacoes`, `criado_por`, `updated_at`
  → Verify: migration roda sem erros no Supabase

- [x] **Hook de dados:** Criar `useAsaasCobranças` em `lib/hooks.ts` com CRUD e filtros por status
  → Verify: hook retorna dados do Supabase corretamente

- [x] **Componente — Tabela de Cobranças:** Adicionar seção "Cobranças Asaas" na `/app/financeiro/page.tsx` com colunas: Cliente, Valor, Vencimento, Status Cobrança, Status NF, Ações
  → Verify: tabela renderiza com estados visuais corretos (badges coloridos por status)

- [x] **Fluxo de Status:** Implementar transição de estados com botões de ação inline:
  - `Pendente` → `Cobrança Enviada` → `NF Gerada` → `NF Verificada`
  → Verify: botão muda status e atualiza no banco sem reload

- [x] **Filtros rápidos:** Adicionar chips de filtro "Todas / Pendentes / Sem NF / Verificadas" no topo da seção
  → Verify: filtros funcionam corretamente

- [x] **Alerta visual:** Destacar cobranças onde vencimento < 3 dias e NF ainda não gerada
  → Verify: item aparece com borda/badge vermelho no prazo crítico

## Done When
- [x] É possível registrar uma cobrança, marcar que foi enviada, registrar a NF e marcá-la como verificada
- [x] O painel exibe claramente o que está pendente vs. completo
- [x] Nenhuma cobrança "cai no esquecimento" sem NF
