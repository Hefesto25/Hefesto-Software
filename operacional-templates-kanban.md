# Operacional — Templates de Tarefas Padronizadas

## Goal
Criar um sistema de templates de tarefas com sub-tarefas pré-definidas que, ao ser selecionado, carrega automaticamente no kanban da aba operacional — podendo ser editado conforme o projeto.

## Tasks

- [x] **Modelar dados:** Adicionar tipo `TaskTemplate` em `lib/types.ts` com campos:
  `id`, `nome`, `descricao`, `categoria`, `subtarefas_padrao[]`, `icone`, `criado_por`, `ativo`
  → Verify: tipos compilam sem erro no TS

- [x] **Migration:** Criar tabelas `task_templates` e `task_template_subtarefas` no Supabase
  → Verify: migration roda sem erros, relacionamento FK correto

- [x] **Hook de dados:** Criar `useTaskTemplates` em `lib/hooks.ts` com listagem, criação e CRUD de templates
  → Verify: hook retorna templates com subtarefas populadas

- [x] **Gerenciador de Templates:** Criar página `/app/templates/tarefas/page.tsx` para CRUD de templates — criar, editar, arquivar templates e suas sub-tarefas
  → Verify: é possível criar um template "IA de Atendimento" com 5 sub-tarefas pré-definidas

- [x] **Seletor no modal de nova tarefa:** Adicionar etapa "Usar template?" no modal de criação de tarefa em `/app/operacional/page.tsx` com busca/listagem de templates disponíveis
  → Verify: ao selecionar template, campos são preenchidos e sub-tarefas aparecem na lista

- [x] **Sub-tarefas editáveis pós-import:** Garantir que sub-tarefas carregadas do template são independentes e editáveis (add, remove, rename) sem afetar o template original
  → Verify: editar subtarefa da tarefa não altera o template

- [x] **Indicador visual no kanban:** Mostrar badge/ícone "template" no card da tarefa para indicar que foi criada a partir de um template
  → Verify: card exibe indicador correto no kanban

## Templates iniciais sugeridos para seeding
- IA de Atendimento (6 sub-tarefas)
- Desenvolvimento de Site (8 sub-tarefas)
- Automação de Processos (5 sub-tarefas)
- Integração de Sistema (7 sub-tarefas)

## Done When
- [x] É possível criar e gerenciar templates com sub-tarefas
- [x] Ao criar tarefa, selecionar template preenche tudo automaticamente
- [x] Sub-tarefas são editáveis sem impactar o template
- [x] Time pode criar novos templates sem ajuda de dev
