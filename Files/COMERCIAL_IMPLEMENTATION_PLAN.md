# 🗺️ Plano de Implementação - Melhorias Visuais Comercial

**Data:** 18 de Março, 2026
**Versão:** 1.0
**Status:** PRONTO PARA IMPLEMENTAÇÃO

---

## 🎯 Objetivo Final

Implementar 4 features integradas na aba Comercial:
1. Dashboard Hub com 3 widgets
2. Fila de Retorno (aba nova)
3. Funil de Conversão (aba nova)
4. Badge de Feedback (no cliente CRM)

**Tempo Total Estimado:** 40-50 horas
**Complexidade:** Média

---

## 📋 Tarefas por Fase

---

# ⚙️ PHASE 0: SETUP & VERIFICAÇÃO (2 horas)

## Task 0.1: Verificar Schema do Banco
**Ação:** Verificar se colunas necessárias existem no Supabase

```sql
-- Verificar:
SELECT column_name FROM information_schema.columns
WHERE table_name='deals' AND column_name IN ('data_retorno', 'motivo_perda', 'data_entrada_etapa');

SELECT column_name FROM information_schema.columns
WHERE table_name='diretorio_clientes' AND column_name IN ('cliente_crm_id', 'sincronizado_em');
```

**Verificação:** ✅ Todas as colunas existem ou foram adicionadas
**Arquivos afetados:** Nenhum (apenas banco)

**Tempo:** 10 min

---

## Task 0.2: Adicionar Colunas ao Banco (se necessário)
**Ação:** Executar migrations no Supabase

```sql
-- Se não existem:
ALTER TABLE deals ADD COLUMN IF NOT EXISTS data_retorno DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS motivo_perda TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS data_entrada_etapa TIMESTAMP DEFAULT NOW();

ALTER TABLE diretorio_clientes ADD COLUMN IF NOT EXISTS cliente_crm_id UUID REFERENCES clientes_crm(id);
ALTER TABLE diretorio_clientes ADD COLUMN IF NOT EXISTS sincronizado_em TIMESTAMP;
```

**Verificação:** ✅ Columns criadas sem erros
**Arquivos afetados:** N/A (Supabase)

**Tempo:** 15 min

---

## Task 0.3: Verificar RLS Policies
**Ação:** Confirmar que RLS permite leitura/escrita para usuários comerciais

```sql
-- Verificar policies:
SELECT * FROM pg_policies WHERE tablename IN ('deals', 'diretorio_clientes', 'feedback_crm');
```

**Verificação:** ✅ Policies existem para /comercial access
**Arquivos afetados:** N/A

**Tempo:** 10 min

---

## Task 0.4: Atualizar lib/types.ts
**Ação:** Adicionar tipos para novas estruturas

```typescript
// Adicionar em lib/types.ts:

export interface LeadPerdidoRetorno {
    id: string;
    deal_id: string;
    data_retorno: string; // YYYY-MM-DD
    motivo_perda: string;
    observacoes?: string;
    status: 'agendado' | 'vencido' | 'concluido';
    created_at: string;
}

export interface FunilConversaoRow {
    stage: string;
    quantidade: number;
    valor_total: number;
    taxa_conversao: number; // 0-100
    dias_medio: number;
    responsaveis: string[];
}

export interface FeedbackStats {
    elogios: number;
    sugestoes: number;
    reclamacoes: number;
}
```

**Verificação:** ✅ TypeScript compila sem erros
**Arquivos afetados:** `lib/types.ts`

**Tempo:** 15 min

---

# 🔧 PHASE 1: BACKEND & HOOKS (8 horas)

## Task 1.1: Criar Hook useLeadsPerdidos()
**Ação:** Adicionar função ao `lib/hooks.ts`

```typescript
export function useLeadsPerdidos(filtros?: { responsavel_id?: string; motivo?: string }) {
    // Fetch deals com stage='perdido' + data_retorno
    // Retornar: { vencidos, proximos7d, proximasemanas }
    // Usar useMemo para caching
}
```

**Verificação:**
- ✅ Hook retorna dados corretos
- ✅ Testa com filtro responsavel_id
- ✅ Usa useMemo para performance

**Arquivos afetados:** `lib/hooks.ts`

**Tempo:** 1.5 horas

---

## Task 1.2: Criar Hook useConversaoFunil()
**Ação:** Adicionar função ao `lib/hooks.ts`

```typescript
export function useConversaoFunil(dataInicio: string, dataFim: string) {
    // Retornar array de FunilConversaoRow
    // Stages: prospeccao → diagnostico → negociacao → (fechado | perdido)
    // Calcular: quantidade, valor_total, taxa_conversao, dias_medio, responsaveis
}
```

**Verificação:**
- ✅ Calcula taxa corretamente (N+1 / N)
- ✅ Agrupa por responsáveis
- ✅ Tempo médio em dias calcula corretamente

**Arquivos afetados:** `lib/hooks.ts`

**Tempo:** 2 horas

---

## Task 1.3: Criar Hook useFeedbackStats()
**Ação:** Adicionar função ao `lib/hooks.ts`

```typescript
export function useFeedbackStats(client_id: string) {
    // Contar feedbacks por tipo (Elogio, Sugestão, Reclamação)
    // Retornar: { elogios, sugestoes, reclamacoes }
}
```

**Verificação:**
- ✅ Conta corretamente por tipo
- ✅ Retorna 0 se nenhum feedback

**Arquivos afetados:** `lib/hooks.ts`

**Tempo:** 45 min

---

## Task 1.4: Criar Hook useSincronizarCRM()
**Ação:** Adicionar função ao `lib/hooks.ts`

```typescript
export async function sincronizarClienteCRMpDiretorio(clienteCRMId: string) {
    // Buscar ClientCRM
    // Mapear campos: name→nome, segment→segmento, contact_email→email, website→site, status→status
    // Criar ou atualizar DiretorioCliente
    // Retornar: { sucesso: boolean, cliente_diretorio_id: string }
}

export async function sincronizarDiretorioparaCRM(clienteDiretorioId: string, campos: string[]) {
    // Usuário escolhe quais campos sincronizar
    // Atualizar ClientCRM com novos valores
    // Retornar: { sucesso: boolean }
}
```

**Verificação:**
- ✅ Sincronização automática funciona
- ✅ Sincronização sob demanda funciona
- ✅ Sem duplicatas

**Arquivos afetados:** `lib/hooks.ts`

**Tempo:** 2 horas

---

## Task 1.5: Criar Função updateDealRetorno()
**Ação:** Adicionar função ao `lib/hooks.ts`

```typescript
export async function updateDealRetorno(dealId: string, data: {
    data_retorno: string;
    motivo_perda: string;
    observacoes?: string;
}) {
    // Atualizar deal com stage='perdido'
    // Criar notificação para todos com /comercial access
}
```

**Verificação:**
- ✅ Deal atualizado corretamente
- ✅ Notificação criada para todos os usuarios /comercial

**Arquivos afetados:** `lib/hooks.ts`

**Tempo:** 1.5 horas

---

# 🎨 PHASE 2: FRONTEND - COMPONENTES (25 horas)

## Task 2.1: Criar WidgetLeadsRetorno.tsx
**Ação:** Novo componente em `app/comercial/components/DashboardWidgets/`

```typescript
// WidgetLeadsRetorno.tsx
export function WidgetLeadsRetorno() {
    const { vencidos, proximos7d } = useLeadsPerdidos();

    return (
        <div className="widget widget-leads">
            {/* Badge vermelho com contagem */}
            {/* 3-5 items vencidos */}
            {/* CTA: Ver Fila Completa */}
        </div>
    );
}
```

**Verificação:**
- ✅ Renderiza corretamente
- ✅ Clique em CTA abre aba Fila Retorno
- ✅ Mostra apenas vencidos + próximos 7d (máx 5 items)

**Arquivos afetados:**
- `app/comercial/components/DashboardWidgets/WidgetLeadsRetorno.tsx` (NOVA)

**Tempo:** 2 horas

---

## Task 2.2: Criar WidgetTaxaConversao.tsx
**Ação:** Novo componente

```typescript
// WidgetTaxaConversao.tsx
export function WidgetTaxaConversao() {
    const { data: funil } = useConversaoFunil(mesAtual_inicio, mesAtual_fim);

    return (
        <div className="widget widget-conversao">
            {/* Resumo visual: Prospeccao → Diagnostico (68%) → ... */}
            {/* CTA: Análise Completa */}
        </div>
    );
}
```

**Verificação:**
- ✅ Renderiza taxa corretamente
- ✅ Clique em CTA abre aba Funil com período "Este Mês"

**Arquivos afetados:**
- `app/comercial/components/DashboardWidgets/WidgetTaxaConversao.tsx` (NOVA)

**Tempo:** 2 horas

---

## Task 2.3: Criar WidgetFeedbacksRecentes.tsx
**Ação:** Novo componente

```typescript
// WidgetFeedbacksRecentes.tsx
interface WidgetFeedbacksRecentsProps {
    feedbacks: FeedbackCRM[]; // ← Recebe como prop do pai
}

export function WidgetFeedbacksRecentes({ feedbacks }: WidgetFeedbacksRecentsProps) {
    // Usa dados do pai (sincronizados em tempo real)
    const ultimosFeedbacks = feedbacks.slice(0, 3);

    return (
        <div className="widget widget-feedbacks">
            {/* 3 feedbacks mais recentes */}
            {/* CTA: Ver Todos */}
        </div>
    );
}
```

**IMPORTANTE - Prevenir Cache Issue:**
- ✅ Recebe `feedbacks` como **prop do componente pai** (page.tsx)
- ✅ **NÃO** faz seu próprio `useFeedbacks()` (evita cache separado)
- ✅ Quando pai chama `setFeedbacksData()`, widget atualiza automaticamente
- ✅ Ativa em tempo real

**Em page.tsx, render assim:**
```typescript
<WidgetFeedbacksRecentes feedbacks={feedbacks} />
```

**Verificação:**
- ✅ Mostra 3 feedbacks mais recentes
- ✅ Atualiza em tempo real quando novo feedback é criado
- ✅ Clique em CTA abre aba Clientes com filtro feedback

**Arquivos afetados:**
- `app/comercial/components/DashboardWidgets/WidgetFeedbacksRecentes.tsx` (NOVA)
- `app/comercial/page.tsx` (modificar render do widget)

**Tempo:** 1.5 horas

---

## Task 2.4: Criar FilaRetornoTab.tsx
**Ação:** Novo componente em `app/comercial/components/FilaRetorno/`

```typescript
// FilaRetornoTab.tsx
export function FilaRetornoTab() {
    const { vencidos, proximos7d, proximasemanas } = useLeadsPerdidos();

    return (
        <div className="fila-retorno">
            {/* 3 seções: Vencidos | Próximos 7d | Próximas Semanas */}
            {/* Cada seção tem cards de lead */}
            {/* Filtros: Por Responsável, Motivo, Período */}
        </div>
    );
}
```

**Verificação:**
- ✅ Renderiza 3 seções corretamente
- ✅ Cores: 🔴 vencido, 🟡 próximos 7d, 🟢 futuro
- ✅ Filtros funcionam

**Arquivos afetados:**
- `app/comercial/components/FilaRetorno/FilaRetornoTab.tsx` (NOVA)

**Tempo:** 3 horas

---

## Task 2.5: Criar CardLeadPerdido.tsx
**Ação:** Componente reutilizável

```typescript
// CardLeadPerdido.tsx
interface CardLeadPerdidoProps {
    lead: LeadPerdidoRetorno & { deal: Deal };
    urgencia: 'vencido' | 'proximo' | 'futuro';
}

export function CardLeadPerdido({ lead, urgencia }: CardLeadPerdidoProps) {
    // Renderizar card com actions
}
```

**Verificação:**
- ✅ Renderiza com cores corretas
- ✅ Ações funcionam: Marcar Concluído, Reagendar, Ver Deal

**Arquivos afetados:**
- `app/comercial/components/FilaRetorno/CardLeadPerdido.tsx` (NOVA)

**Tempo:** 2 horas

---

## Task 2.6: Criar ModalRagendarRetorno.tsx
**Ação:** Modal de reagendamento

```typescript
// ModalRagendarRetorno.tsx
export function ModalRagendarRetorno({ leadId, onClose }: Props) {
    // Form com:
    // - Date picker (nova data)
    // - Textarea motivo
    // - Submit/Cancel
}
```

**Verificação:**
- ✅ Date picker funciona
- ✅ Salvar atualiza deal corretamente

**Arquivos afetados:**
- `app/comercial/components/FilaRetorno/ModalRagendarRetorno.tsx` (NOVA)

**Tempo:** 1.5 horas

---

## Task 2.7: Criar FunilTab.tsx
**Ação:** Container principal do funil

```typescript
// FunilTab.tsx
export function FunilTab() {
    const [periodo, setPeriodo] = useState({ tipo: 'mes', mes: 'março' });
    const { data: funil } = useConversaoFunil(dataInicio, dataFim);

    return (
        <div>
            {/* Seletor período */}
            {/* Gráfico Funil */}
            {/* Tabela Conversão */}
        </div>
    );
}
```

**Verificação:**
- ✅ Seletor de período funciona
- ✅ Gráfico + tabela atualizam juntos

**Arquivos afetados:**
- `app/comercial/components/FunilConversao/FunilTab.tsx` (NOVA)

**Tempo:** 2 horas

---

## Task 2.8: Criar SeletorPeriodo.tsx
**Ação:** Componente de seleção

```typescript
// SeletorPeriodo.tsx
export function SeletorPeriodo({ onPeriodoChange }: Props) {
    // Quick select: [Mês ▼] [Trimestre ▼]
    // Advanced: [Customizado] → date picker
}
```

**Verificação:**
- ✅ Quick select funciona (mês/trimestre)
- ✅ Date picker customizado funciona

**Arquivos afetados:**
- `app/comercial/components/FunilConversao/SeletorPeriodo.tsx` (NOVA)

**Tempo:** 1.5 horas

---

## Task 2.9: Criar GraficoFunil.tsx
**Ação:** Gráfico usando Recharts

```typescript
// GraficoFunil.tsx
export function GraficoFunil({ data: FunilConversaoRow[] }) {
    // Usar PieChart ou custom SVG para funil
    // Cores por stage
    // Tooltip com valores
}
```

**Verificação:**
- ✅ Renderiza corretamente
- ✅ Cores correspondem ao design
- ✅ Tooltip funciona ao hover

**Arquivos afetados:**
- `app/comercial/components/FunilConversao/GraficoFunil.tsx` (NOVA)

**Tempo:** 2 horas

---

## Task 2.10: Criar TabelaConversao.tsx
**Ação:** Tabela detalhada

```typescript
// TabelaConversao.tsx
export function TabelaConversao({ data: FunilConversaoRow[] }) {
    // 5 colunas: Stage | Qtd | R$ | % | Dias | Resp.
    // Sorting por coluna
    // Clique em responsável filtra
}
```

**Verificação:**
- ✅ Renderiza 5 colunas corretamente
- ✅ Sorting funciona
- ✅ Clique em responsável filtra tabela

**Arquivos afetados:**
- `app/comercial/components/FunilConversao/TabelaConversao.tsx` (NOVA)

**Tempo:** 2.5 horas

---

## Task 2.11: Criar ExportarFunil.tsx
**Ação:** Função de export CSV

```typescript
// ExportarFunil.tsx
export function ExportarFunil({ data }: Props) {
    // Botão [Exportar CSV]
    // Gera CSV com coluna do funil
}
```

**Verificação:**
- ✅ Clique baixa arquivo CSV
- ✅ Arquivo tem formato correto

**Arquivos afetados:**
- `app/comercial/components/FunilConversao/ExportarFunil.tsx` (NOVA)

**Tempo:** 1 hora

---

## Task 2.12: Criar BadgeFeedback.tsx
**Ação:** Mini-cards de feedback no cliente

```typescript
// BadgeFeedback.tsx
export function BadgeFeedback({ clientId }: Props) {
    const { elogios, sugestoes, reclamacoes } = useFeedbackStats(clientId);

    return (
        <div className="feedback-badge">
            {/* 3 mini-cards: Elogios | Sugestões | Reclamações */}
            {/* Clicável: leva para sub-aba Feedback */}
        </div>
    );
}
```

**Verificação:**
- ✅ Renderiza 3 mini-cards
- ✅ Números corretos
- ✅ Cores corretas (verde/amarelo/vermelho)
- ✅ Clique leva para sub-aba Feedback

**Arquivos afetados:**
- `app/comercial/components/ClienteCRM/BadgeFeedback.tsx` (NOVA)

**Tempo:** 1.5 horas

---

## Task 2.13: Modificar page.tsx (Comercial)
**Ação:** Adicionar abas + widgets ao arquivo principal

**Modificações:**
```typescript
// Em app/comercial/page.tsx:

// 1. Adicionar 3 abas novas:
const TABS = [
    { id: 'painel', label: 'Painel' },
    { id: 'negócios', label: 'Negócios' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'fila-retorno', label: 'Fila de Retorno' },  // NOVO
    { id: 'funil', label: 'Funil de Conversão' }       // NOVO
];

// 2. Adicionar widgets no Painel:
{activeTab === 'painel' && (
    <>
        <div className="dashboard-widgets">
            <WidgetLeadsRetorno />
            <WidgetTaxaConversao />
            <WidgetFeedbacksRecentes />
        </div>
        {/* Conteúdo padrão do painel abaixo */}
    </>
)}

// 3. Renderizar novas abas:
{activeTab === 'fila-retorno' && <FilaRetornoTab />}
{activeTab === 'funil' && <FunilTab />}

// 4. Adicionar BadgeFeedback no card do cliente:
{/* Dentro do modal de cliente, adicionar acima das sub-abas: */}
<BadgeFeedback clientId={selectedClient.id} />
```

**Verificação:**
- ✅ Abas aparecem no tab bar
- ✅ Widgets renderizam no painel
- ✅ Clique em tabs muda conteúdo
- ✅ Badge aparece no cliente

**Arquivos afetados:** `app/comercial/page.tsx`

**Tempo:** 2 horas

---

# ✅ PHASE 3: TESTES & VALIDAÇÃO (8 horas)

## Task 3.1: Testar Sincronização CRM → Diretório
**Ação:** Executar testes manuais

```
1. Criar novo cliente no CRM
2. Verificar: DiretorioCliente criado com dados corretos
3. Editar campo no Diretório
4. Modal aparece: "Sincronizar para CRM?"
5. Clique [Sim]
6. Verificar: ClientCRM atualizado
```

**Verificação:** ✅ Todos os passos passam

**Arquivos afetados:** N/A

**Tempo:** 1.5 horas

---

## Task 3.2: Testar Fila de Retorno
**Ação:** Testes manuais

```
1. Criar deal em "Negociação"
2. Mover para "Perdido"
3. Modal abre: data_retorno + motivo
4. Preencher e salvar
5. Verificar: deal atualizado, aparece em Fila com cor correta
6. Testar filtros (por responsável, motivo, período)
7. Testar ações (Marcar Concluído, Reagendar)
```

**Verificação:** ✅ Todos os passos passam

**Arquivos afetados:** N/A

**Tempo:** 2 horas

---

## Task 3.3: Testar Funil de Conversão
**Ação:** Testes manuais

```
1. Acessar aba Funil
2. Verificar: gráfico renderiza corretamente
3. Testar seletor período (quick + customizado)
4. Verificar: tabela atualiza com dados corretos
5. Testar sorting (clicar em coluna)
6. Testar clique em responsável (filtra)
7. Testar export CSV
```

**Verificação:** ✅ Todos os passos passam

**Arquivos afetados:** N/A

**Tempo:** 2 horas

---

## Task 3.4: Testar Badge de Feedback
**Ação:** Testes manuais

```
1. Abrir cliente CRM
2. Verificar: badge aparece com contadores corretos
3. Adicionar novo feedback (Elogio)
4. Verificar: badge atualiza em tempo real
5. Testar clique em cada mini-card (leva para Feedback)
```

**Verificação:** ✅ Todos os passos passam

**Arquivos afetados:** N/A

**Tempo:** 1 hora

---

## Task 3.5: Testar Notificações
**Ação:** Verificar sistema de notificações

```
1. Criar deal com retorno agendado para hoje
2. Recarregar página
3. Verificar: badge "X leads para retomar hoje" mostra contagem
4. Criar deal com retorno agendado para 7 dias
5. Verificar: aparece em seção "Próximos 7 dias"
6. Aguardar ou simular: passar a data vencida
7. Verificar: muda de cor para vermelho
```

**Verificação:** ✅ Notificações funcionam corretamente

**Arquivos afetados:** N/A

**Tempo:** 1.5 horas

---

## Task 3.6: Testar Responsividade
**Ação:** Testar em diferentes resoluções

```
Telas testadas:
- Desktop (1920x1080)
- Tablet (768px)
- Mobile (375px)

Verificar:
- Widgets não quebram
- Tabelas scrollam horizontalmente
- Gráfico redimensiona
- Filtros acessíveis em mobile
```

**Verificação:** ✅ Funciona em todos os breakpoints

**Arquivos afetados:** N/A

**Tempo:** 1 hora

---

## Task 3.7: Testar Acessibilidade
**Ação:** Auditoria de acessibilidade

```
- Cores: Contrast ratio ≥ 4.5:1
- Labels: Todos os inputs têm label
- ARIA: Tabelas têm scope, buttons têm aria-label
- Keyboard: Tab funciona em todos os elementos
- Screen reader: Testa com NVDA/JAWS
```

**Verificação:** ✅ Passa em auditoria de acessibilidade

**Arquivos afetados:** N/A

**Tempo:** 1.5 horas

---

# 🚀 PHASE 4: DEPLOYMENT (1 hora)

## Task 4.1: Build & Deploy
**Ação:** Build da aplicação

```bash
npm run build
```

**Verificação:** ✅ Build sem erros

**Arquivos afetados:** N/A

**Tempo:** 30 min

---

## Task 4.2: Smoke Tests em Produção
**Ação:** Testes rápidos em produção

```
1. Acessar /comercial
2. Verificar widgets no painel
3. Clicar em cada aba nova
4. Verificar funcionalidades básicas
```

**Verificação:** ✅ Tudo funcionando em prod

**Arquivos afetados:** N/A

**Tempo:** 30 min

---

# 📊 Resumo de Arquivos

## Novos Arquivos a Criar (13):

```
app/comercial/components/
├── DashboardWidgets/
│   ├── WidgetLeadsRetorno.tsx
│   ├── WidgetTaxaConversao.tsx
│   └── WidgetFeedbacksRecentes.tsx
├── FilaRetorno/
│   ├── FilaRetornoTab.tsx
│   ├── CardLeadPerdido.tsx
│   └── ModalRagendarRetorno.tsx
├── FunilConversao/
│   ├── FunilTab.tsx
│   ├── SeletorPeriodo.tsx
│   ├── GraficoFunil.tsx
│   ├── TabelaConversao.tsx
│   └── ExportarFunil.tsx
└── ClienteCRM/
    └── BadgeFeedback.tsx
```

## Arquivos a Modificar (2):

```
lib/hooks.ts (adicionar 5 funções)
lib/types.ts (adicionar 3 interfaces)
app/comercial/page.tsx (adicionar abas + widgets + badge)
```

---

# ⏱️ Timeline

| Phase | Tarefas | Horas | Dias (8h/dia) |
|-------|---------|-------|---------------|
| **0** | Setup | 2h | 0.25 |
| **1** | Backend | 8h | 1 |
| **2** | Frontend | 25h | 3.1 |
| **3** | Testes | 8h | 1 |
| **4** | Deploy | 1h | 0.12 |
| **TOTAL** | | **44h** | **~5-6 dias** |

---

# 🎯 Dependências

```
Phase 0 (Setup)
    ↓
Phase 1 (Backend/Hooks)
    ↓
Phase 2 (Frontend - componentes em paralelo)
    ↓
Phase 3 (Testes)
    ↓
Phase 4 (Deploy)
```

**Componentes do Phase 2 podem ser feitos em paralelo:**
- WidgetLeadsRetorno + WidgetTaxaConversao + WidgetFeedbacksRecentes (paralelo)
- FilaRetornoTab + CardLeadPerdido + ModalRagendarRetorno (paralelo)
- FunilTab + GraficoFunil + TabelaConversao (paralelo)

---

# ⚠️ Riscos & Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Cálculo taxa conversão incorreto | Média | Alto | Testar com dados conhecidos (Task 3.3) |
| RLS policies impedem sincronização | Baixa | Alto | Verificar policies antes (Task 0.3) |
| Performance tabela com muitos deals | Média | Médio | Usar paginação + useMemo |
| Gráfico Recharts quebra em mobile | Baixa | Médio | Testar responsividade (Task 3.6) |
| Sincronização duplica clientes | Baixa | Alto | Adicionar unique constraint no banco |

---

# ✅ Checklist Final

Antes de marcar como "Done":

- [ ] Todas as tarefas de Phase 0 completadas
- [ ] Todas as tarefas de Phase 1 completadas
- [ ] Todos os 12 componentes criados
- [ ] page.tsx modificado com abas + widgets
- [ ] Todos os testes de Phase 3 passaram
- [ ] Build sem erros
- [ ] Smoke tests em produção OK
- [ ] Documento de design (COMERCIAL_VISUAL_DESIGN.md) validado

---

**Status:** ✅ PRONTO PARA INICIAR PHASE 0

