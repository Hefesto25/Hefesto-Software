# Subtarefas Estilo ClickUp — Aba Operacional

## Goal
Permitir criar subtarefas (checklist) em tarefas operacionais, com progresso automático calculado pelos checks, barra de progresso no Kanban e na tabela, e conclusão automática ao atingir 100%.

## Contexto Técnico
- Stack: Next.js + Supabase + TypeScript
- Arquivo principal: `app/operacional/page.tsx` (~1116 linhas)
- Tipos: `lib/types.ts` | Hooks: `lib/hooks.ts`
- Kanban existente: colunas "A Fazer", "Fazendo", "Revisando", "Finalizado"
- Tabela "Operações" com filtros de cliente/membro/status/prazo

## Tasks

- [ ] **Task 1:** Criar migration `016_subtarefas_operacionais.sql`
  - Campos: `id UUID PK`, `tarefa_id UUID FK → tarefas_operacionais`, `titulo TEXT NOT NULL`, `concluida BOOLEAN DEFAULT FALSE`, `ordem INT DEFAULT 0`, `created_at TIMESTAMPTZ`
  - RLS: autenticados podem ler/inserir/atualizar/deletar
  - Aplicar via Supabase MCP (projeto `hlqftzvwilbwchfqelqy`)
  - → Verify: tabela visível no Supabase Studio

- [ ] **Task 2:** Adicionar tipo `SubtarefaOperacional` em `lib/types.ts`
  - `{ id, tarefa_id, titulo, concluida, ordem, created_at? }`
  - → Verify: sem erros TypeScript ao importar o tipo

- [ ] **Task 3:** Adicionar hooks em `lib/hooks.ts`
  - `useSubtarefas(tarefaId: string)` — busca subtarefas ordenadas por `ordem`
  - `addSubtarefa(tarefaId, titulo)` — insere com `ordem = length + 1`
  - `toggleSubtarefa(id, concluida)` — atualiza campo `concluida`
  - `removeSubtarefa(id)` — deleta
  - → Verify: exportadas sem erro TypeScript

- [ ] **Task 4:** Criar função helper `calcularProgresso(subtarefas: SubtarefaOperacional[]): number`
  - Retorna 0 se lista vazia; `Math.round(concluidas / total * 100)` caso contrário
  - Exportar de `lib/utils.ts`
  - → Verify: `calcularProgresso([{concluida:true},{concluida:false}])` retorna `50`

- [ ] **Task 5:** Criar `TaskDetailPanel` em `app/operacional/page.tsx`
  - Painel lateral direito (drawer) que abre ao clicar no card do Kanban
  - Seções: cabeçalho (título, cliente, responsável, prazo), descrição, dificuldade, subtarefas
  - Subtarefas: lista inline com checkbox + título + botão deletar; campo "Nova subtarefa" com `Enter` para adicionar
  - Ao marcar/desmarcar subtarefa: recalcula progresso → se 100%, chama `updateOperationalTask(id, { status: 'Finalizado', data_conclusao: today })` automaticamente
  - → Verify: abrir painel mostra tarefa + subtarefas; marcar todos os checks fecha o painel com a tarefa em "Finalizado"

- [ ] **Task 6:** Adicionar barra de progresso nos cards do Kanban
  - Mostrar apenas se a tarefa tiver ≥ 1 subtarefa
  - Barra fina (4px) no rodapé do card: cor verde proporcional ao `progresso%`
  - Texto `"X/Y subtarefas"` ao lado da barra
  - → Verify: card com 2/3 subtarefas feitas mostra barra ~66% verde

- [ ] **Task 7:** Adicionar coluna "Progresso" na tabela de Operações
  - Coluna após "Dificuldade": mini barra de progresso + `X%`
  - Se sem subtarefas: exibir "—"
  - → Verify: tabela mostra progresso corretamente para tarefas com e sem subtarefas

- [ ] **Task 8:** Verificação final
  - `pnpm tsc --noEmit` → sem erros
  - Fluxo completo: criar tarefa → abrir painel → adicionar 3 subtarefas → marcar todas → tarefa vai para "Finalizado" automaticamente
  - → Verify: kanban atualizado, progresso 100% visível no card antes de concluir

## Done When
- [ ] Painel lateral abre ao clicar em qualquer card do Kanban
- [ ] Subtarefas podem ser adicionadas, marcadas e removidas inline
- [ ] Progresso calculado automaticamente (1/3 = 33%, 2/3 = 66%, 3/3 = 100%)
- [ ] Ao 100%, tarefa muda para "Finalizado" sem interação manual
- [ ] Barra de progresso visível nos cards do Kanban e na tabela de Operações
- [ ] Zero erros TypeScript

## Notas
- O painel lateral deve sobrepor o kanban (fixed right drawer), não empurrar o layout — mesmo padrão visual dark theme já usado na plataforma
- Ao fechar o painel (botão X ou clique fora), o kanban deve refletir o estado atualizado imediatamente
- A tabela "Operações" precisa buscar subtarefas para calcular o progresso — considerar buscar todas de uma vez com `useSubtarefas` por tarefa apenas quando a aba for carregada (evitar N+1 queries)
- Não há necessidade de campo `progresso` no `OperationalTask` — o progresso é sempre derivado das subtarefas em tempo real
