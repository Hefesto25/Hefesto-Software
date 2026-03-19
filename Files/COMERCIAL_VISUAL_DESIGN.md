# 📋 Design Detalhado: Melhorias Visuais na Aba Comercial

**Data:** 18 de Março, 2026
**Versão:** 1.0 - DESIGN VALIDADO
**Status:** ✅ Pronto para Plan-Writing + Frontend-Design

---

## 🎯 Visão Geral

Implementação de **4 features integradas** na aba Comercial para melhorar visibilidade de leads e análise de funil:

1. **Dashboard Hub** - 3 widgets principais
2. **Fila de Retorno** - Leads perdidos agendados
3. **Funil de Conversão** - Análise de taxa e conversão
4. **Badge de Feedback** - Sentimento do cliente

**Abordagem:** Hybrid (Dashboard central + abas modulares)

---

## 📊 Arquitetura de Informação

### **1. Dashboard Principal (Hub)**

```
/comercial
├── [Painel] [Negócios] [Clientes] [Fila Retorno] [Funil]
│
└── PAINEL (aba ativa)
    ├── Widget 1: 🔴 X Leads para Retomar Hoje
    ├── Widget 2: 📈 Taxa Conversão Este Mês
    ├── Widget 3: 💬 Últimos Feedbacks
    └── (Conteúdo padrão do painel abaixo)
```

**Widget 1: Leads para Retomar**
```
Posição: Topo esquerdo
Altura: ~120px
Conteúdo:
- Badge vermelho com contagem (🔴 5 vencidos)
- 3-5 leads mais urgentes (ordem por dias atrasados)
- Cada linha: empresa + dias vencidos
- CTA: [Ver Fila Completa →]

Comportamento:
- Clique em qualquer lugar → Abre aba "Fila Retorno"
- Cores: 🔴 vencido | 🟡 hoje | 🟢 próximos dias
```

**Widget 2: Taxa Conversão Este Mês**
```
Posição: Topo meio
Altura: ~120px
Conteúdo:
- Resumo visual: Prospeccao → Diagnostico (68%) → Negociação (52%) → Fechado (33%)
- Mostra taxa de passagem entre stages
- CTA: [Análise Completa →]

Comportamento:
- Clique → Abre aba "Funil Conversão" com período "Este Mês"
- Atualiza automaticamente todo dia às 00:00
```

**Widget 3: Últimos Feedbacks**
```
Posição: Topo direito
Altura: ~120px
Conteúdo:
- 3 feedbacks mais recentes (mix de tipos)
- Formato: Ícone + Tipo + Empresa + "há X dias"
- CTA: [Ver Todos →]

Comportamento:
- Clique → Abre aba "Clientes" + filtra por feedback recente
- Mostra últimos 20 feedbacks

⚠️ IMPLEMENTAÇÃO CRÍTICA - Evitar Cache Issue:
- Widget RECEBE feedbacks como prop do pai (page.tsx)
- NÃO deve usar useFeedbacks() localmente
- Quando pai chama setFeedbacksData(), widget atualiza em tempo real
- Isso garante que novos feedbacks apareçam imediatamente no widget
```

---

### **2. Aba: Fila de Retorno**

```
/comercial?tab=fila-retorno
```

**Layout:**
```
Cabeçalho:
├── Título: "Fila de Retorno"
├── Filtros: [Por Responsável ▼] [Por Motivo ▼] [Por Período ▼]
└── Estatísticas: 3 vencidos | 5 próximos 7d | 8 próximas semanas

Corpo:
├── Seção 🔴 VENCIDOS (3)
│   ├── Card 1: Empresa + Resp + Data vencimento + Motivo
│   │   └── Ações: [Marcar Concluído] [Reagendar] [Ver Deal]
│   ├── Card 2: ...
│   └── Card 3: ...
│
├── Seção 🟡 PRÓXIMOS 7 DIAS (5)
│   └── Cards...
│
└── Seção 🟢 PRÓXIMAS SEMANAS (8)
    └── Cards...
```

**Card de Lead:**
```
┌─────────────────────────────────────────────────────┐
│ 🔴 João Silva - Empresa XYZ                        │
│ Retorno: 10/03 (2 dias atrasado) | Resp: Vendedor A│
│                                                     │
│ Motivo: "Aguardando feedback do cliente"           │
│                                                     │
│ [Marcar Concluído] [Reagendar] [Ver Deal] [...]    │
└─────────────────────────────────────────────────────┘
```

**Ações dos Botões:**
- **[Marcar Concluído]** → Move para "fechado" (deal)
- **[Reagendar]** → Modal com novo date picker
- **[Ver Deal]** → Abre deal no kanban (negócios)
- **[...]** → Mais opções (editar motivo, deletar, etc)

**Filtros:**
- Por Responsável (dropdown multi-select)
- Por Motivo (checkboxes dos motivos mais comuns)
- Por Período (Vencidos / Próx 7d / Próximas semanas)

**Ordenação Padrão:**
- Mais urgentes primeiro (vencidos → próximos)
- Dentro de cada seção: por dias restantes

---

### **3. Aba: Funil de Conversão**

```
/comercial?tab=funil
```

**Seletor de Período:**
```
Quick Select: [Março ▼] [Trimestre ▼]
Advanced: [Customizado] → abre date picker (ini → fim)

Padrão: Mês atual
```

**Gráfico Funil (Topo):**
```
Tipo: Cone decrescente
Biblioteca: Recharts (PieChart ou custom SVG)
Stages:
├── Prospeccao (50 | R$ 250k)
├── Diagnostico (34 | R$ 170k) - 68% de conversão
├── Negociação (18 | R$ 90k) - 52% de conversão
├── Fechado (6 | R$ 30k) - 33% do topo
└── Perdido (3 | R$ 15k) - 6% do topo

Cores:
├── Prospeccao: #8B5CF6 (roxo)
├── Diagnostico: #3B82F6 (azul)
├── Negociação: #F59E0B (amarelo)
├── Fechado: #10B981 (verde)
└── Perdido: #EF4444 (vermelho)

Interatividade:
- Hover mostra tooltip com valor exato
- Clique abre lista de deals daquela etapa
```

**Tabela Detalhada (Abaixo):**
```
Colunas:
├── ESTÁGIO (stage name)
├── QTD (quantidade de deals)
├── R$ TOTAL (soma de valores)
├── % CONVERSÃO (deals no stage+1 / deals neste stage)
├── DIAS MÉD. (tempo médio nesta etapa)
└── RESPONSÁVEIS (avatares com nomes ao hover)

Exemplo:
┌──────────────────────────────────────────────────────────┐
│ Estágio    │ Qtd │ R$ Total   │ % Conv │ Dias │ Resp.   │
├──────────────────────────────────────────────────────────┤
│ Prospeccao │ 50  │ 250.000    │ 68%    │ 15   │ A, B, C │
│ Diagnóstico│ 34  │ 170.000    │ 52%    │ 10   │ A, C    │
│ Negociação │ 18  │  90.000    │ 33%    │  8   │ B, D    │
│ Fechado    │  6  │  30.000    │ 100%   │  5   │ A       │
│ Perdido    │  3  │  15.000    │ 100%   │ 20   │ C, D    │
└──────────────────────────────────────────────────────────┘
```

**Interatividade da Tabela:**
- Clique em número de QTD → Lista deals daquela etapa
- Clique em responsável → Filtra tabela por pessoa
- [Exportar CSV] → Download dos dados
- Sorting: Clique na coluna para ordenar

---

### **4. Badge de Feedback (no Cliente CRM)**

**Localização:**
```
Card do Cliente (quando clica para abrir detalhes)
Abaixo do nome e status
Acima das sub-abas (Info | Reuniões | Feedback | Custos)
```

**Renderização:**
```
┌──────────────────────────────────────────────┐
│ 👤 João Silva - Empresa XYZ                 │
│ Status: Ativo | Segment: Tecnologia          │
│                                              │
│ Contatos: joao@xyz.com | (11) 9999-9999     │
│ Responsável: Vendedor A                     │
│                                              │
│ 📊 FEEDBACK HISTÓRICO                       │
│ ┌─────────────┬────────────┬──────────────┐│
│ │ 😊 Elogios  │ ⚠️ Sugestões│ 😞 Reclamações││
│ │     5       │      2     │       0      ││
│ └─────────────┴────────────┴──────────────┘│
│                                              │
│ [Sub-abas: Info | Reuniões | Feedback | ...│
└──────────────────────────────────────────────┘
```

**Mini-Cards (3 colunas):**
```
Coluna 1: 😊 Elogios
├── Fundo: Verde suave (#D1FAE5)
├── Número grande: 5
├── Texto: "Elogios"
└── Clicável: Leva para sub-aba Feedback

Coluna 2: ⚠️ Sugestões
├── Fundo: Amarelo suave (#FEF3C7)
├── Número grande: 2
├── Texto: "Sugestões"
└── Clicável: Leva para sub-aba Feedback

Coluna 3: 😞 Reclamações
├── Fundo: Vermelho suave (#FEE2E2)
├── Número grande: 0
├── Texto: "Reclamações"
└── Clicável: Leva para sub-aba Feedback
```

**Sub-aba Feedback (já existe, apenas referência):**
```
Tabela de histórico:
┌─────────────┬──────────────┬─────────────┬──────────────┐
│ DATA        │ TIPO         │ AUTOR       │ DESCRIÇÃO    │
├─────────────┬──────────────┬─────────────┬──────────────┤
│ 15/03/2026  │ Elogio       │ João Silva  │ "Ótimo!"     │
│ 10/03/2026  │ Sugestão     │ Admin       │ "Melhorar..." │
│ 05/03/2026  │ Elogio       │ Cliente     │ "Perfeito!" │
└─────────────┴──────────────┴─────────────┴──────────────┘
```

---

## 🔄 Fluxos de Dados

### **Fluxo 1: Sincronização CRM → Diretório**

```
EVENTO: Novo ClientCRM criado
│
├─ Admin preenche: name, segment, contact_email, website, status
│
├─ Hook automático executa:
│  ├─ Cria DiretorioCliente
│  ├─ Maps: name→nome, segment→segmento, etc
│  └─ Status sincronizado
│
└─ ✅ DiretorioCliente criado

EVENTO: Editar DiretorioCliente após criação
│
├─ Admin edita um campo (ex: email)
│
├─ Modal: "Sincronizar mudança para CRM?"
│
├─ Se [Sim]:
│  └─ Atualiza ClientCRM com novo valor
│
└─ Se [Não]:
   └─ Fica local (não sincroniza)
```

### **Fluxo 2: Lead Perdido com Retorno**

```
EVENTO: Deal movido para "Perdido" no kanban
│
├─ Modal abre:
│  ├─ Data de Retorno (date picker)
│  ├─ Motivo (textarea - "Orçamento em revisão")
│  └─ Descrição (textarea)
│
├─ Deal atualizado:
│  ├─ stage = "perdido"
│  ├─ data_retorno = 15/04/2026
│  └─ motivo_perda = "..."
│
├─ Notificação criada:
│  ├─ Tipo: "lead_retorno_vencido"
│  └─ Data: 15/04/2026
│
└─ Diariamente (ao carregar comercial):
   ├─ Sistema verifica: hoje >= data_retorno?
   ├─ Se sim: destaca na Fila (vermelho/amarelo)
   └─ Badge mostra contador "X vencidos"
```

### **Fluxo 3: Feedback do Cliente**

```
EVENTO: Admin clica em cliente CRM
│
├─ Modal abre com sub-abas
│
├─ Clica em "Feedback"
│
├─ Form de novo feedback:
│  ├─ Tipo: [Elogio | Sugestão | Reclamação]
│  ├─ Descrição: (textarea)
│  ├─ Autor: (auto-preenchido)
│  └─ Data: (hoje, automático)
│
├─ FeedbackCRM criado
│
└─ Badge atualizado:
   ├─ Contadores recalculados
   └─ 😊 6 | ⚠️ 2 | 😞 0 (novo estado)
```

### **Fluxo 4: Funil de Conversão**

```
EVENTO: Usuário acessa aba "Funil Conversão"
│
├─ Seleciona período:
│  ├─ Quick: [Março ▼] ou [Trimestre ▼]
│  └─ Advanced: [Customizado] → date range
│
├─ Sistema calcula:
│  ├─ Deals por stage (naquele período)
│  ├─ Soma R$ por stage
│  ├─ Taxa % = (deals N+1) / (deals N)
│  ├─ Tempo médio por stage
│  └─ Responsáveis únicos
│
├─ Renderiza:
│  ├─ Gráfico funil (Recharts)
│  └─ Tabela com 5 linhas
│
└─ Interatividade:
   ├─ Clique em stage → lista deals
   ├─ Clique em responsável → filtra
   └─ [Exportar CSV]
```

---

## 🗄️ Estrutura de Banco de Dados

### **Tabela: deals (modificações)**

```sql
ALTER TABLE deals ADD COLUMN (
  data_retorno DATE,              -- Data de retorno agendada
  motivo_perda TEXT,              -- Motivo da perda
  data_entrada_etapa TIMESTAMP    -- Quando entrou nesta etapa
);
```

### **Tabela: diretorio_clientes (modificações)**

```sql
ALTER TABLE diretorio_clientes ADD COLUMN (
  cliente_crm_id UUID REFERENCES crm_clientes(id),
  sincronizado_em TIMESTAMP
);
```

### **Tabela: feedback_crm (já existe)**

```
- id, client_id, date, author_type, author_name
- type: 'Elogio' | 'Sugestão' | 'Reclamação'
- description
```

---

## 🔧 Componentes & Hooks Necessários

### **Novos Componentes:**

```
/app/comercial/components/

DashboardWidgets/
├── WidgetLeadsRetorno.tsx       (Widget 1)
├── WidgetTaxaConversao.tsx      (Widget 2)
└── WidgetFeedbacksRecentes.tsx  (Widget 3)

FilaRetorno/
├── FilaRetornoTab.tsx           (Container principal)
├── CardLeadPerdido.tsx          (Card individual)
├── ModalRagendarRetorno.tsx     (Modal para reagendar)
└── FilterFilaRetorno.tsx        (Filtros e ordenação)

FunilConversao/
├── FunilTab.tsx                 (Container principal)
├── SeletorPeriodo.tsx           (Quick select + customizado)
├── GraficoFunil.tsx             (Recharts)
├── TabelaConversao.tsx          (Tabela detalhada)
└── ExportarFunil.tsx            (Export CSV)

ClienteCRM/
└── BadgeFeedback.tsx            (Mini-cards de feedback)
```

### **Novos Hooks:**

```
/lib/hooks.ts

export function useSincronizarCRM()
  - Sincronizar campos comuns CRM → Diretório

export function useLeadsPerdidos()
  - Buscar deals em "perdido" com data_retorno

export function useConversaoFunil(periodo)
  - Calcular taxa, volume, valor, dias médios

export function useFeedbackStats(client_id)
  - Contar elogios/sugestões/reclamações
```

### **Modificações em page.tsx:**

```
- Adicionar 3 abas novas: [Fila Retorno] [Funil]
- Adicionar 3 widgets ao painel
- Adicionar Badge de feedback ao card do cliente
```

---

## 📐 Non-Functional Requirements

| Requisito | Especificação |
|-----------|---------------|
| **Performance** | Widgets carregam em <500ms, tabelas em <1s |
| **Scale** | Suportar até 10k deals/mês, 1000 clientes |
| **Notificações** | Diárias (ao carregar), sem delays |
| **RLS** | Respeitar permissões existentes (/comercial) |
| **Compatibilidade** | Chrome, Firefox, Safari, Edge (últimas 2 versões) |
| **Responsividade** | Adaptável para tablets (>=768px) |
| **Acessibilidade** | WCAG 2.1 AA (tabelas, cores, labels) |

---

## ✅ Checklist de Implementação

- [ ] Criar componentes DashboardWidgets (3)
- [ ] Criar componentes FilaRetorno (4)
- [ ] Criar componentes FunilConversao (5)
- [ ] Criar componente BadgeFeedback
- [ ] Criar hooks no lib/hooks.ts (4)
- [ ] Modificar page.tsx (adicionar abas + widgets)
- [ ] Adicionar colunas ao banco (data_retorno, etc)
- [ ] Testar sincronização CRM ↔ Diretório
- [ ] Testar notificações de leads vencidos
- [ ] Testar cálculos de funil
- [ ] Testar badge de feedback
- [ ] Testar filtros e ordenação
- [ ] Testar responsividade
- [ ] Testar acessibilidade

---

## 🚀 Decision Log (Resumido)

| # | Decisão | Escolha | Razão |
|---|---------|---------|-------|
| 1 | Sincronização | Automática CRM→Dir + bidirecional sob demanda | Workflow simples + controle |
| 2 | Notificações | In-app diária ao carregar | Menos ruído |
| 3 | Período funil | Quick select + customizado | Análise rápida + profunda |
| 4 | Visualização funil | Gráfico + Tabela | Executiva + detalhada |
| 5 | Dados tabela | Vol + Val + % + Dias + Resp | Análise completa |
| 6 | Fila de retorno | Aba dedicada + Widget | Visibilidade + profundidade |
| 7 | Badge feedback | Contadores mini-cards | Histórico visual |
| 8 | Sincronização bidi | Sob demanda c/ confirmação | Controle total |
| 9 | Arquitetura | Hybrid (hub + spokes) | Integrado + modular |

---

## 📄 Próximos Passos

1. **Plan-Writing** → Criar plano detalhado de implementação (ordem, dependências, estimativas)
2. **Frontend-Design** → Criar wireframes de alta fidelidade + specs CSS
3. **Implementação** → Seguir plano em ordem

---

**Status:** ✅ DESIGN VALIDADO - PRONTO PARA PLAN-WRITING + FRONTEND-DESIGN

