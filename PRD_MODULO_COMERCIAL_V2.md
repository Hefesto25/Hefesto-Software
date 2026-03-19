# PRD - Módulo Comercial v2
## Sincronização CRM + Gestão de Leads Perdidos + Painel do Funil

**Data**: 2026-03-19
**Status**: Em Planejamento (Brainstorming)
**Prioridade**: Alta

---

## 1. CONTEXTO & DESCOBERTAS

### 1.1 Estrutura de Banco Atual

**Tabelas Relevantes:**

| Tabela | Propósito | FK Existentes |
|--------|-----------|---------------|
| `clients` | ClientCRM (CRM com dados comerciais) | Nenhuma para diretorio_clientes |
| `diretorio_clientes` | Diretório de clientes (dados administrativos) | Nenhuma para clients |
| `feedbacks` | Feedbacks dos clientes | `client_id` (nullable) |
| `deals` | Leads com etapas do funil | Referencia implícita a clients |
| `meetings` | Reuniões com clientes | `client_id` (uuid) |

**Problema Identificado**: ❌ **Não existe relacionamento (FK) entre `clients` e `diretorio_clientes`**
→ Sincronização precisa ser implementada via triggers ou lógica de aplicação

---

## 2. FUNCIONALIDADES A IMPLEMENTAR

### 2.1 Sincronização Automática CRM → Diretório (PRIORIDADE: MÁXIMA)

**Objetivo**: Quando um cliente é criado/atualizado em `clients`, sincronizar automaticamente com `diretorio_clientes`

**Tipo**: Híbrido (CRM → Diretório, com campos adicionais no Diretório)

**Mapeamento de Campos**:

| clients (origem) | diretorio_clientes (destino) | Sincronização |
|------------------|------------------------------|---------------|
| `id` | `id` | 1:1 PK |
| `name` | `nome` | Bidirecional |
| `segment` | `segmento` | Bidirecional |
| `website` | `site` | Bidirecional |
| `contact_email` | `email` | Bidirecional |
| `contact_phone` | `telefone` | Bidirecional |
| `status` | `status` | Bidirecional |
| `observations` | `observacoes` | Bidirecional |
| - | `whatsapp` | Apenas Diretório |
| - | `diretorio_contatos` (FK) | Apenas Diretório |
| - | `diretorio_logins` (FK) | Apenas Diretório |
| - | `diretorio_assinaturas` (FK) | Apenas Diretório |

**Fluxo**:
1. **Criar cliente em CRM** (`clients.insert`) → Trigger cria registro em `diretorio_clientes`
2. **Atualizar cliente em CRM** (`clients.update`) → Trigger sincroniza campos bidirecionais
3. **Atualizar cliente no Diretório** → Trigger sincroniza volta para CRM (campos compartilhados)

**Campos Únicos do Diretório** (não sincronizam):
- `whatsapp`
- Relacionamentos: `diretorio_contatos`, `diretorio_logins`, `diretorio_assinaturas`, `diretorio_custos`

---

### 2.2 Gestão de Leads Perdidos

**Requisitos**:

1. **Lead em Status "Perdido"**:
   - ❌ Opção de deletar **completamente removida** (não aparece no menu)
   - ✅ Cria-se uma **aba "Leads Perdidos"** no módulo Comercial
   - ✅ Ao mudar para "Perdido" → Modal obrigatório abre

2. **Modal ao Marcar como Perdido**:
   - Campo: **Motivo da Perda** (select com opções pré-definidas)
   - Campo: **Descrição Livre** (textarea)
   - Campo: **Data de Retorno do Contato** (date picker)
   - Ação: Dados salvos no registro do lead

3. **Notificações Diárias**:
   - Quando data de retorno chega → Notificação diária in-app
   - **Destinatários**: Todos com acesso ao módulo Comercial (não apenas Admin Geral)
   - **Conteúdo**: "Lead [nome] está pronto para retomada - Motivo anterior: [motivo]"
   - **Frequência**: Diária, até que lead seja movido para Prospecção
   - **Ação**: Click na notificação → Abre lead na aba Leads Perdidos

4. **Retomada de Lead**:
   - **Manualmente** → Move para etapa **"Prospecção"** no Kanban
   - Lead sai de "Leads Perdidos" e volta ao Kanban normal
   - Histórico de perda é preservado

---

### 2.3 Indicador Visual de Feedback

**Objetivo**: Exibir "temperatura dos clientes" na aba Comercial

**Implementação**:
- Mostrar **último feedback** de cada cliente
- Representação: **Nomenclatura + Cor** (sem emojis)

| Tipo | Nomenclatura | Cor |
|------|--------------|-----|
| Elogio | "Elogio" | Verde (#10B981) |
| Sugestão | "Sugestão" | Neutro (#6B7280) |
| Reclamação | "Reclamação" | Vermelho (#EF4444) |

**Localização**:
- Card do cliente na aba Comercial (aba "Negócios")
- Também no Diretório (aba Clientes)
- Posição: Canto superior direito do card

**Query**: Buscar feedback mais recente por `client_id` ordenado por `date DESC LIMIT 1`

---

### 2.4 Painel Visual do Funil de Conversão

**Objetivo**: Visualizar funil de vendas com taxa de conversão entre etapas

**Etapas (conforme sistema)**:
1. Prospecção (início)
2. Diagnóstico
3. Negociação
4. Fechado (conversão bem-sucedida)
5. Perdido (saída)

**Métricas**:
- **Quantidade por etapa**: Total de leads em cada etapa
- **Taxa de conversão**: (Leads que saíram da etapa A para B) / (Total em A) × 100%
- **Pressuposição**: Se lead vai de Prospecção → Fechado, presume-se que passou por todas as intermediárias

**Cálculo Exemplo**:
```
Prospecção: 10 leads
→ Diagnóstico: 2 leads = Conversão 20%
→ Negociação: 1 lead = Conversão 50% (de 2)
→ Fechado: 0.5 leads (1 lead em 2 períodos) = Conversão 100%
```

**Formato**: Gráfico de Funil (pirâmide) com:
- Barras horizontais por etapa
- Números absolutos + percentual
- Cores por etapa
- Destaque visual para gargalos (baixa conversão)

**Filtro**: Seletor de **Mês/Ano** customizável

**Tab de Implementação**: Aba "Painel" (já existe em Comercial)

---

## 3. ARQUITETURA TÉCNICA (RECOMENDADA)

### 3.1 Sincronização CRM ↔ Diretório

**Abordagem**: Triggers SQL + Views (recomendado)

**Estrutura de Triggers**:

```sql
-- TRIGGER 1: Ao inserir em clients → criar em diretorio_clientes
CREATE TRIGGER sync_client_to_directory_insert
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_client_to_directory_insert();

-- TRIGGER 2: Ao atualizar clients → sincronizar em diretorio_clientes
CREATE TRIGGER sync_client_to_directory_update
AFTER UPDATE ON clients
FOR EACH ROW
WHEN (
  OLD.name IS DISTINCT FROM NEW.name OR
  OLD.segment IS DISTINCT FROM NEW.segment OR
  OLD.website IS DISTINCT FROM NEW.website OR
  OLD.contact_email IS DISTINCT FROM NEW.contact_email OR
  OLD.contact_phone IS DISTINCT FROM NEW.contact_phone OR
  OLD.status IS DISTINCT FROM NEW.status OR
  OLD.observations IS DISTINCT FROM NEW.observations
)
EXECUTE FUNCTION sync_client_to_directory_update();

-- TRIGGER 3: Ao atualizar diretorio_clientes → sincronizar volta em clients
CREATE TRIGGER sync_directory_to_client_update
AFTER UPDATE ON diretorio_clientes
FOR EACH ROW
WHEN (
  OLD.nome IS DISTINCT FROM NEW.nome OR
  OLD.segmento IS DISTINCT FROM NEW.segmento OR
  OLD.site IS DISTINCT FROM NEW.site OR
  OLD.email IS DISTINCT FROM NEW.email OR
  OLD.telefone IS DISTINCT FROM NEW.telefone OR
  OLD.status IS DISTINCT FROM NEW.status OR
  OLD.observacoes IS DISTINCT FROM NEW.observacoes
)
EXECUTE FUNCTION sync_directory_to_client_update();
```

**Functions (Pseudocódigo)**:

```sql
-- Inserir em diretorio_clientes quando clients é criado
CREATE FUNCTION sync_client_to_directory_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO diretorio_clientes (
    id, nome, segmento, email, telefone, site, status, observacoes
  )
  VALUES (
    NEW.id, NEW.name, NEW.segment, NEW.contact_email,
    NEW.contact_phone, NEW.website, NEW.status, NEW.observations
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    segmento = EXCLUDED.segmento,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    site = EXCLUDED.site,
    status = EXCLUDED.status,
    observacoes = EXCLUDED.observacoes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar diretorio_clientes quando clients muda
CREATE FUNCTION sync_client_to_directory_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE diretorio_clientes SET
    nome = NEW.name,
    segmento = NEW.segment,
    email = NEW.contact_email,
    telefone = NEW.contact_phone,
    site = NEW.website,
    status = NEW.status,
    observacoes = NEW.observations,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar clients quando diretorio_clientes muda (campos compartilhados)
CREATE FUNCTION sync_directory_to_client_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients SET
    name = NEW.nome,
    segment = NEW.segmento,
    contact_email = NEW.email,
    contact_phone = NEW.telefone,
    website = NEW.site,
    status = NEW.status,
    observations = NEW.observacoes,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Proteção contra Loop Infinito**:
- ✅ Usar `IS DISTINCT FROM` para não disparar se valor não mudou
- ✅ Adicionar coluna `syncing_flag` (optional) para bloquear re-trigger
- ✅ Logs de auditoria para rastrear sincronizações

**Índices Necessários**:
```sql
CREATE INDEX idx_diretorio_clientes_id ON diretorio_clientes(id);
CREATE INDEX idx_clients_id ON clients(id);
CREATE INDEX idx_feedbacks_client_id ON feedbacks(client_id);
CREATE INDEX idx_feedbacks_date ON feedbacks(date DESC);
```

---

### 3.2 Leads Perdidos + Notificações

**Nova Tabela** (opcional, melhora UX):
```sql
CREATE TABLE lead_loss_records (
  id UUID PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id),
  motivo TEXT NOT NULL,
  descricao TEXT,
  data_retorno DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'retomado', 'descartado'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Notificação** (nova tabela ou expansion):
```sql
ALTER TABLE notifications ADD COLUMN:
- lead_loss_record_id UUID
- scheduled_for DATE
- recurring_daily BOOLEAN DEFAULT TRUE

-- Trigger para criar notificações quando chega data_retorno
CREATE TRIGGER create_daily_notifications_for_lost_leads
DAILY AT 08:00 -- Exemplo
EXECUTE FUNCTION notify_users_about_lost_leads();
```

---

### 3.3 Painel do Funil

**Query para Funil**:
```sql
SELECT
  stage,
  COUNT(*) as total_leads,
  ROUND(
    (COUNT(*)::FLOAT / LAG(COUNT(*)) OVER (ORDER BY stage_order))::NUMERIC * 100, 2
  ) as conversion_rate
FROM deals
WHERE created_at >= DATE_TRUNC('month', NOW())
  AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
GROUP BY stage, stage_order
ORDER BY stage_order;
```

---

## 4. DECISÕES ARQUITETURAIS

| Decisão | Opção Escolhida | Alternativas Rejeitadas | Razão |
|---------|-----------------|-------------------------|-------|
| Sincronização | Triggers SQL (bidirecional) | Application logic | Melhor performance, menos latência, garantia transacional |
| Armazenamento Loss Records | Nova tabela (`lead_loss_records`) | Campo em `deals` | Melhor separação de concerns, auditoria mais clara |
| Notificações | In-app daily + UI flag | Email + SMS | MVP, evita spam, menos configurações SMTP |
| Funil Cálculo | Pressuposição (passou todas as etapas) | Histórico completo | Mais simples, menos queries, CRM típico |
| Feedback Visual | Last feedback com nome | Score agregado | Mais interpretável, menos queries, menor overhead |

---

## 5. DEPENDÊNCIAS & CONFLITOS POTENCIAIS

### 5.1 Row Level Security (RLS)

⚠️ **CRÍTICO**: Supabase com RLS habilitado pode bloquear triggers
→ Verificar se `clients`, `diretorio_clientes`, `feedbacks` têm RLS
→ Triggers podem falhar se policy não permite INSERT/UPDATE na tabela destino

**Solução**:
- Usar `security invoker` ou role com privilégios elevados para triggers
- Ou desabilitar RLS temporariamente para sync

### 5.2 Foreign Keys

❌ **Não criar FK hard entre clients ↔ diretorio_clientes**
→ Permite deleção independente, melhor para flexibilidade
→ Sincronização é responsabilidade dos triggers, não do banco

### 5.3 Cascading Deletes

⚠️ **Se deletar client → não deletar diretorio_cliente automaticamente**
→ Diretório pode ter dados adicionais únicos que se perderiam
→ Melhor: Marcar como "inativo" ao invés de deletar

---

## 6. IMPLEMENTAÇÃO - ORDEM

### Fase 1: Sincronização Básica (Semana 1-2)

- [ ] Criar triggers para sync CRM → Diretório
- [ ] Criar indices para performance
- [ ] Testar sync com 100 registros de teste
- [ ] Validar não há loops infinitos
- [ ] Deployment em dev

### Fase 2: Leads Perdidos (Semana 3)

- [ ] Criar tabela `lead_loss_records`
- [ ] Modal no frontend ao marcar como "Perdido"
- [ ] Criar aba "Leads Perdidos"
- [ ] Implementar notificações diárias
- [ ] Remover opção de deletar leads perdidos

### Fase 3: Indicadores de Feedback (Semana 2-3, paralelo)

- [ ] Query de último feedback por client
- [ ] Badge/indicador visual no card de cliente
- [ ] Cache de último feedback (Redis opcional)
- [ ] Implementar em ambas as abas (Comercial + Diretório)

### Fase 4: Painel do Funil (Semana 4)

- [ ] Query de conversão por etapa
- [ ] Gráfico de funil (Recharts)
- [ ] Filtro Mês/Ano
- [ ] Destaque de gargalos
- [ ] Cálculo de pressuposição

---

## 7. RISCOS & MITIGAÇÃO

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Trigger loop infinito | Crash de DB | `IS DISTINCT FROM`, flag `syncing` |
| RLS bloqueia triggers | Sync falha silenciosamente | Testar com RLS desabilitado primeiro |
| Deadlock entre tabelas | Performance ruim | Ordem consistente de UPDATE, índices |
| Dados inconsistentes | Data integrity | Logs de auditoria, triggerverification |
| Muitas notificações diárias | Spam | Consolidar em 1 notificação por usuário/dia |

---

## 8. PRÓXIMOS PASSOS

✅ **Design finalizado**
→ Aguardando aprovação do PRD
→ Iniciar implementação em Fase 1

---

**Documento preparado para**: Skill Backend-Architect + Data-Engineer
**Próximas análises**: RLS policies, performance tuning, deployment strategy
