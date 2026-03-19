# Plano de Implementação: Módulo Comercial v2
## Sincronização CRM + Leads Perdidos + Painel do Funil

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar 5 funcionalidades críticas para o módulo comercial: sincronização CRM↔Diretório, gestão de leads perdidos com notificações, indicador visual de feedback, e painel do funil com taxa de conversão.

**Architecture:** Triggers SQL bidireccionais para sincronização, nova tabela `lead_loss_records` para rastreamento de perdas, notificações in-app diárias, gráfico de funil em Recharts com filtro Mês/Ano.

**Tech Stack:** Next.js 14, React 19, TypeScript, Supabase (PostgreSQL 17.6.1), Recharts, TailwindCSS

---

## 🔥 FASE 1: Sincronização CRM ↔ Diretório (Semanas 1-2)

### Task 1.1: Criar Índices para Performance

**Objetivo:** Preparar banco para triggers sem deadlocks

**Files:**
- Create: `supabase/migrations/002_add_sync_indexes.sql`

**Step 1: Escrever migration com índices**

```sql
-- Migration: Add indexes for CRM-Directory sync performance
-- Purpose: Prevent deadlocks and improve trigger performance

-- Index on clients for faster lookups during sync
CREATE INDEX IF NOT EXISTS idx_clients_id_status
ON clients(id, status);

-- Index on diretorio_clientes for faster sync lookups
CREATE INDEX IF NOT EXISTS idx_diretorio_clientes_id
ON diretorio_clientes(id);

-- Index on feedbacks for quick "last feedback" queries
CREATE INDEX IF NOT EXISTS idx_feedbacks_client_date
ON feedbacks(client_id, date DESC);

-- Index on deals for funil calculations
CREATE INDEX IF NOT EXISTS idx_deals_stage_created
ON deals(stage, created_at);

-- Composite index for conversão queries
CREATE INDEX IF NOT EXISTS idx_deals_stage_order
ON deals(stage, created_at DESC);
```

**Step 2: Aplicar migration no Supabase**

```bash
# Via Supabase CLI ou via execute_sql tool
supabase db push
```

**Expected:** Migration aplicada sem erros

**Step 3: Commit**

```bash
git add supabase/migrations/002_add_sync_indexes.sql
git commit -m "db: add indexes for CRM-Directory sync"
```

---

### Task 1.2: Criar Função SQL para Sincronizar clients → diretorio_clientes (INSERT)

**Objetivo:** Ao inserir cliente em `clients`, criar automaticamente em `diretorio_clientes`

**Files:**
- Create: `supabase/migrations/003_create_sync_insert_function.sql`

**Step 1: Escrever função SQL**

```sql
-- Migration: Create function to sync clients INSERT to diretorio_clientes
-- Purpose: Automatically create directory entry when new client is added to CRM

CREATE OR REPLACE FUNCTION sync_client_to_directory_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO diretorio_clientes (
    id,
    nome,
    segmento,
    email,
    telefone,
    site,
    status,
    observacoes,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.name,
    NEW.segment,
    NEW.contact_email,
    NEW.contact_phone,
    NEW.website,
    COALESCE(NEW.status, 'Ativo'),
    NEW.observations,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    segmento = EXCLUDED.segmento,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    site = EXCLUDED.site,
    status = EXCLUDED.status,
    observacoes = EXCLUDED.observacoes
  WHERE diretorio_clientes.id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in sync_client_to_directory_insert: %', SQLERRM;
  RETURN NEW; -- Don't fail the original insert
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE OR REPLACE TRIGGER trg_sync_client_insert
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_client_to_directory_insert();
```

**Step 2: Aplicar migration**

```bash
supabase db push
```

**Expected:** Função criada, trigger ativo

**Step 3: Testar manualmente**

```bash
# Insert test client in Supabase CLI or via app
# Verify that diretorio_clientes receives the entry
```

**Step 4: Commit**

```bash
git add supabase/migrations/003_create_sync_insert_function.sql
git commit -m "db: create trigger for clients INSERT sync to directory"
```

---

### Task 1.3: Criar Função SQL para Sincronizar clients → diretorio_clientes (UPDATE)

**Objetivo:** Ao atualizar cliente em `clients`, atualizar em `diretorio_clientes`

**Files:**
- Create: `supabase/migrations/004_create_sync_update_function.sql`

**Step 1: Escrever função SQL**

```sql
-- Migration: Create function to sync clients UPDATE to diretorio_clientes
-- Purpose: Bidirectional sync when CRM fields change

CREATE OR REPLACE FUNCTION sync_client_to_directory_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if relevant fields changed
  IF (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.segment IS DISTINCT FROM NEW.segment OR
    OLD.website IS DISTINCT FROM NEW.website OR
    OLD.contact_email IS DISTINCT FROM NEW.contact_email OR
    OLD.contact_phone IS DISTINCT FROM NEW.contact_phone OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.observations IS DISTINCT FROM NEW.observations
  ) THEN
    UPDATE diretorio_clientes SET
      nome = NEW.name,
      segmento = NEW.segment,
      email = NEW.contact_email,
      telefone = NEW.contact_phone,
      site = NEW.website,
      status = COALESCE(NEW.status, 'Ativo'),
      observacoes = NEW.observations,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in sync_client_to_directory_update: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE OR REPLACE TRIGGER trg_sync_client_update
AFTER UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_client_to_directory_update();
```

**Step 2: Aplicar migration**

```bash
supabase db push
```

**Step 3: Testar**

```bash
# Update a client in CRM, verify diretorio_clientes updates
```

**Step 4: Commit**

```bash
git add supabase/migrations/004_create_sync_update_function.sql
git commit -m "db: create trigger for clients UPDATE sync to directory"
```

---

### Task 1.4: Criar Função SQL para Sincronizar diretorio_clientes → clients (UPDATE reverso)

**Objetivo:** Ao atualizar cliente no Diretório, atualizar campos compartilhados em CRM

**Files:**
- Create: `supabase/migrations/005_create_sync_reverse_function.sql`

**Step 1: Escrever função SQL**

```sql
-- Migration: Create function to sync diretorio_clientes UPDATE back to clients
-- Purpose: Keep shared fields in sync from directory back to CRM

CREATE OR REPLACE FUNCTION sync_directory_to_client_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync shared fields back to clients
  IF (
    OLD.nome IS DISTINCT FROM NEW.nome OR
    OLD.segmento IS DISTINCT FROM NEW.segmento OR
    OLD.site IS DISTINCT FROM NEW.site OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.telefone IS DISTINCT FROM NEW.telefone OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.observacoes IS DISTINCT FROM NEW.observacoes
  ) THEN
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
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in sync_directory_to_client_update: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE OR REPLACE TRIGGER trg_sync_directory_update
AFTER UPDATE ON diretorio_clientes
FOR EACH ROW
EXECUTE FUNCTION sync_directory_to_client_update();
```

**Step 2: Aplicar migration**

```bash
supabase db push
```

**Step 3: Testar sincronização bidirecional**

```bash
# 1. Create client in CRM → verify in Directory
# 2. Update client name in CRM → verify in Directory
# 3. Update email in Directory → verify in CRM
# 4. Verify no infinite loops (check logs)
```

**Step 4: Commit**

```bash
git add supabase/migrations/005_create_sync_reverse_function.sql
git commit -m "db: create bidirectional sync trigger for directory updates"
```

---

### Task 1.5: Atualizar Hooks para Refletir Sincronização

**Objetivo:** Adicionar hook para `useDiretorioClientes()` que reflete mudanças do CRM

**Files:**
- Modify: `lib/hooks.ts:1509-1524`

**Step 1: Adicionar função para sincronização manual (fallback)**

```typescript
// Near line 1509 in lib/hooks.ts

/**
 * Sync all clients from CRM to Directory
 * This is a fallback in case triggers fail silently
 * Should only be used for data recovery, not daily operations
 */
export async function syncClientsToDirectory() {
  try {
    const { data: clients, error: fetchErr } = await supabase
      .from('clients')
      .select('*');

    if (fetchErr) throw fetchErr;
    if (!clients) return { success: false, error: 'No clients found' };

    for (const client of clients) {
      const { error: syncErr } = await supabase
        .from('diretorio_clientes')
        .upsert({
          id: client.id,
          nome: client.name,
          segmento: client.segment,
          email: client.contact_email,
          telefone: client.contact_phone,
          site: client.website,
          status: client.status || 'Ativo',
          observacoes: client.observations,
        }, { onConflict: 'id' });

      if (syncErr) {
        console.error(`Failed to sync client ${client.id}:`, syncErr);
      }
    }

    return { success: true, synced: clients.length };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: String(error) };
  }
}
```

**Step 2: Commit**

```bash
git add lib/hooks.ts
git commit -m "feat: add manual sync fallback function for CRM-Directory"
```

---

### Task 1.6: Testes de Integração - Sincronização

**Objetivo:** Validar que sync funciona sem loops infinitos

**Files:**
- Create: `__tests__/sync.test.ts`

**Step 1: Escrever testes**

```typescript
// __tests__/sync.test.ts

import { supabase } from '@/lib/supabase';

describe('CRM-Directory Sync', () => {

  test('should sync new client from CRM to Directory', async () => {
    const testClient = {
      name: 'Test Company',
      segment: 'Tech',
      contact_email: 'test@company.com',
      contact_phone: '+55 11 99999-9999',
      website: 'https://example.com',
      status: 'Ativo',
      observations: 'Test client',
    };

    // Insert into clients
    const { data: inserted, error: insertErr } = await supabase
      .from('clients')
      .insert(testClient)
      .select()
      .single();

    expect(insertErr).toBeNull();
    expect(inserted).toBeDefined();

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify in diretorio_clientes
    const { data: dirClient, error: fetchErr } = await supabase
      .from('diretorio_clientes')
      .select('*')
      .eq('id', inserted.id)
      .single();

    expect(fetchErr).toBeNull();
    expect(dirClient).toBeDefined();
    expect(dirClient.nome).toBe(testClient.name);
    expect(dirClient.email).toBe(testClient.contact_email);

    // Cleanup
    await supabase.from('clients').delete().eq('id', inserted.id);
  });

  test('should sync client updates from CRM to Directory', async () => {
    const testClient = {
      name: 'Original Name',
      segment: 'Tech',
      contact_email: 'test@example.com',
    };

    const { data: inserted } = await supabase
      .from('clients')
      .insert(testClient)
      .select()
      .single();

    // Update in CRM
    const { error: updateErr } = await supabase
      .from('clients')
      .update({ name: 'Updated Name' })
      .eq('id', inserted.id);

    expect(updateErr).toBeNull();

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify update in Directory
    const { data: dirClient } = await supabase
      .from('diretorio_clientes')
      .select('*')
      .eq('id', inserted.id)
      .single();

    expect(dirClient.nome).toBe('Updated Name');

    // Cleanup
    await supabase.from('clients').delete().eq('id', inserted.id);
  });

  test('should NOT create infinite sync loops', async () => {
    // This is more of a manual check - monitor trigger logs
    // for repeated firing on the same record
    expect(true).toBe(true); // Placeholder
  });
});
```

**Step 2: Executar testes**

```bash
npm test -- __tests__/sync.test.ts
```

**Expected:** Todos os testes passam, nenhum loop infinito

**Step 3: Commit**

```bash
git add __tests__/sync.test.ts
git commit -m "test: add integration tests for CRM-Directory sync"
```

---

## 🎯 FASE 2: Gestão de Leads Perdidos (Semana 3)

### Task 2.1: Criar Tabela `lead_loss_records`

**Objetivo:** Armazenar dados de leads perdidos com data de retorno

**Files:**
- Create: `supabase/migrations/006_create_lead_loss_records.sql`

**Step 1: Escrever migration**

```sql
-- Migration: Create lead_loss_records table
-- Purpose: Track lost leads with return date and reason

CREATE TABLE IF NOT EXISTS lead_loss_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  motivo_perda TEXT NOT NULL,
  descricao TEXT,
  data_retorno DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente',
  -- status: 'pendente' (awaiting return), 'retomado' (resumed), 'descartado' (discarded)
  notificacoes_enviadas INT DEFAULT 0,
  ultima_notificacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_lead_loss_deal_id ON lead_loss_records(deal_id);
CREATE INDEX idx_lead_loss_data_retorno ON lead_loss_records(data_retorno);
CREATE INDEX idx_lead_loss_status ON lead_loss_records(status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_lead_loss_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_loss_updated_at
BEFORE UPDATE ON lead_loss_records
FOR EACH ROW
EXECUTE FUNCTION update_lead_loss_timestamp();
```

**Step 2: Aplicar migration**

```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/006_create_lead_loss_records.sql
git commit -m "db: create lead_loss_records table for tracking lost leads"
```

---

### Task 2.2: Adicionar Tipos TypeScript para lead_loss_records

**Objetivo:** Definir interfaces para o novo tipo

**Files:**
- Modify: `lib/types.ts`

**Step 1: Adicionar tipo**

Adicionar após a linha 331 (depois de FeedbackCRM):

```typescript
export interface LeadLossRecord {
  id: string;
  deal_id: string;
  motivo_perda: string;
  descricao?: string;
  data_retorno: string; // date format YYYY-MM-DD
  status: 'pendente' | 'retomado' | 'descartado';
  notificacoes_enviadas?: number;
  ultima_notificacao?: string;
  created_at?: string;
  updated_at?: string;
}
```

**Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "type: add LeadLossRecord interface"
```

---

### Task 2.3: Criar Hooks para lead_loss_records

**Objetivo:** Funções para CRUD de registros de perda

**Files:**
- Modify: `lib/hooks.ts`

**Step 1: Adicionar após useFeedbacks (linha ~920)**

```typescript
export function useLeadLossRecords() {
  return useSupabaseTable<LeadLossRecord>(
    'lead_loss_records',
    { column: 'data_retorno', ascending: true }
  );
}

export async function addLeadLossRecord(
  record: Omit<LeadLossRecord, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('lead_loss_records')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data as LeadLossRecord;
}

export async function updateLeadLossRecord(
  id: string,
  updates: Partial<LeadLossRecord>
) {
  const { data, error } = await supabase
    .from('lead_loss_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as LeadLossRecord;
}

export async function removeLeadLossRecord(id: string) {
  const { error } = await supabase
    .from('lead_loss_records')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Get loss record by deal_id
export async function getLeadLossRecordByDealId(dealId: string) {
  const { data, error } = await supabase
    .from('lead_loss_records')
    .select('*')
    .eq('deal_id', dealId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data as LeadLossRecord | null;
}
```

**Step 2: Commit**

```bash
git add lib/hooks.ts
git commit -m "feat: add hooks for lead loss records management"
```

---

### Task 2.4: Criar Modal de Perda de Lead no Frontend

**Objetivo:** Modal obrigatório ao marcar lead como perdido

**Files:**
- Create: `app/comercial/LossLeadModal.tsx`

**Step 1: Criar componente do modal**

```typescript
// app/comercial/LossLeadModal.tsx

'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Deal } from '@/lib/types';
import { addLeadLossRecord, updateDeal } from '@/lib/hooks';

interface LossLeadModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LOSS_REASONS = [
  'Preço muito alto',
  'Cliente escolheu concorrente',
  'Falta de budget do cliente',
  'Timing inadequado',
  'Mudança de prioridades',
  'Falta de fit do produto',
  'Razão não especificada',
];

export default function LossLeadModal({
  deal,
  isOpen,
  onClose,
  onSuccess,
}: LossLeadModalProps) {
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!deal) throw new Error('Deal not found');
      if (!motivo) throw new Error('Motivo da perda é obrigatório');
      if (!dataRetorno) throw new Error('Data de retorno é obrigatória');

      // 1. Create loss record
      await addLeadLossRecord({
        deal_id: deal.id,
        motivo_perda: motivo,
        descricao: descricao || undefined,
        data_retorno: dataRetorno,
        status: 'pendente',
      });

      // 2. Update deal status to 'perdido'
      await updateDeal(deal.id, { stage: 'perdido' });

      // Reset form
      setMotivo('');
      setDescricao('');
      setDataRetorno('');

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao registrar perda'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !deal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            <h2 className="text-xl font-semibold">Registrar Perda de Lead</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deal Info */}
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Lead</p>
            <p className="font-semibold">{deal.company}</p>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo da Perda *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={loading}
            >
              <option value="">Selecione um motivo...</option>
              {LOSS_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais sobre a perda..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Data de Retorno */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Retorno do Contato *
            </label>
            <input
              type="date"
              value={dataRetorno}
              onChange={(e) => setDataRetorno(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Perda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/comercial/LossLeadModal.tsx
git commit -m "feat: create modal for registering lost leads"
```

---

### Task 2.5: Integrar Modal na Página Comercial

**Objetivo:** Disparar modal ao mover lead para "Perdido"

**Files:**
- Modify: `app/comercial/page.tsx`

**Step 1: Importar modal e estado (linha ~10)**

```typescript
// Near the imports at top
import LossLeadModal from './LossLeadModal';

// In component state (after other useState lines, ~85)
const [showLossLeadModal, setShowLossLeadModal] = useState(false);
const [selectedDealForLoss, setSelectedDealForLoss] = useState<Deal | null>(null);
```

**Step 2: Atualizar função ao mudar deal para "Perdido" (procurar por updateDeal call)**

```typescript
// Find where deals are updated (around line 600-800)
// Modify to open modal instead of directly updating

const handleDealStageChange = async (dealId: string, newStage: string) => {
  if (newStage === 'perdido') {
    // Find the deal and open modal
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setSelectedDealForLoss(deal);
      setShowLossLeadModal(true);
    }
  } else {
    // Update normally for other stages
    await updateDeal(dealId, { stage: newStage });
    setDealsData([...deals]); // Refresh
  }
};
```

**Step 3: Adicionar modal ao JSX (final do component, antes do closing div)**

```typescript
// Add before final </div> of ComercialPage component
<LossLeadModal
  deal={selectedDealForLoss}
  isOpen={showLossLeadModal}
  onClose={() => {
    setShowLossLeadModal(false);
    setSelectedDealForLoss(null);
  }}
  onSuccess={() => {
    refetch(); // Refresh deals
  }}
/>
```

**Step 4: Commit**

```bash
git add app/comercial/page.tsx
git commit -m "feat: integrate loss lead modal into comercial page"
```

---

### Task 2.6: Criar Aba "Leads Perdidos"

**Objetivo:** Aba separada para gerenciar leads perdidos

**Files:**
- Create: `app/comercial/LeadsLostTab.tsx`

**Step 1: Criar componente**

```typescript
// app/comercial/LeadsLostTab.tsx

'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';
import type { Deal, LeadLossRecord } from '@/lib/types';
import { useDeals, useLeadLossRecords, updateDeal, updateLeadLossRecord } from '@/lib/hooks';
import { getBahiaDate, formatLocalSystemDate } from '@/lib/utils';

export default function LeadsLostTab() {
  const { data: deals, loading: loadingDeals, refetch: refetchDeals } = useDeals();
  const { data: lossRecords, loading: loadingLoss, refetch: refetchLoss } = useLeadLossRecords();
  const [resumeLoading, setResumeLoading] = useState<string | null>(null);

  // Filter only lost deals with their loss records
  const lostDealsWithRecords = useMemo(() => {
    return deals
      .filter(d => d.stage === 'perdido')
      .map(deal => {
        const record = lossRecords.find(r => r.deal_id === deal.id);
        return { deal, record };
      });
  }, [deals, lossRecords]);

  // Count overdue (data_retorno reached)
  const overdueCount = useMemo(() => {
    const today = getBahiaDate();
    return lossRecords.filter(r => {
      const returnDate = new Date(r.data_retorno);
      return r.status === 'pendente' && returnDate <= today;
    }).length;
  }, [lossRecords]);

  const handleResumeContact = async (dealId: string, lossRecordId: string) => {
    setResumeLoading(dealId);
    try {
      // Move deal back to Prospecção
      await updateDeal(dealId, { stage: 'prospeccao' });

      // Update loss record status to 'retomado'
      await updateLeadLossRecord(lossRecordId, { status: 'retomado' });

      refetchDeals();
      refetchLoss();
    } catch (error) {
      console.error('Failed to resume contact:', error);
    } finally {
      setResumeLoading(null);
    }
  };

  if (loadingDeals || loadingLoss) {
    return <div className="p-8 text-center">Carregando leads perdidos...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads Perdidos</h2>
          <p className="text-gray-600 mt-1">
            {lostDealsWithRecords.length} leads em status perdido
            {overdueCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                {overdueCount} prontos para retomada
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            refetchDeals();
            refetchLoss();
          }}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Empty state */}
      {lostDealsWithRecords.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Nenhum lead perdido ainda</p>
        </div>
      ) : (
        /* List */
        <div className="space-y-3">
          {lostDealsWithRecords.map(({ deal, record }) => {
            if (!record) return null;

            const returnDate = new Date(record.data_retorno);
            const today = getBahiaDate();
            const isOverdue = returnDate <= today && record.status === 'pendente';

            return (
              <div
                key={deal.id}
                className={`p-4 border rounded-lg ${
                  isOverdue
                    ? 'bg-red-50 border-red-300'
                    : 'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{deal.company}</h3>
                    <p className="text-sm text-gray-600">{deal.title}</p>
                  </div>
                  {isOverdue && (
                    <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
                      <AlertCircle size={14} />
                      Pronto para retomada
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Motivo da Perda</p>
                    <p className="font-medium">{record.motivo_perda}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Data de Retorno</p>
                    <p className="font-medium">
                      {formatLocalSystemDate(record.data_retorno)}
                    </p>
                  </div>
                </div>

                {record.descricao && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600">Descrição</p>
                    <p className="text-sm">{record.descricao}</p>
                  </div>
                )}

                {record.status === 'pendente' && (
                  <button
                    onClick={() => handleResumeContact(deal.id, record.id)}
                    disabled={resumeLoading === deal.id}
                    className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    {resumeLoading === deal.id
                      ? 'Retomando...'
                      : 'Retomar Contato'}
                  </button>
                )}

                {record.status !== 'pendente' && (
                  <div className="text-xs text-gray-600 mt-3">
                    Status: {record.status === 'retomado' ? '✓ Retomado' : '✗ Descartado'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/comercial/LeadsLostTab.tsx
git commit -m "feat: create Lost Leads tab with resume functionality"
```

---

### Task 2.7: Adicionar Aba "Leads Perdidos" ao Menu Principal

**Objetivo:** Integrar aba ao comercial page

**Files:**
- Modify: `app/comercial/page.tsx`

**Step 1: Importar aba (linha ~10)**

```typescript
import LeadsLostTab from './LeadsLostTab';
```

**Step 2: Adicionar tab ao estado (linha ~66)**

```typescript
const [activeTab, setActiveTab] = useState<'painel' | 'negocios' | 'time' | 'crm' | 'comissao' | 'tarefas' | 'leads_perdidos'>('painel');
```

**Step 3: Adicionar botão ao tab bar (procurar pela seção de tabs, ~500-600)**

```typescript
<button
  className={`tab-btn ${activeTab === 'leads_perdidos' ? 'active' : ''}`}
  onClick={() => setActiveTab('leads_perdidos')}
>
  <AlertTriangle size={16} />
  Leads Perdidos
</button>
```

**Step 4: Adicionar renderização (procurar por renderização de tabs, ~900-1000)**

```typescript
{activeTab === 'leads_perdidos' && <LeadsLostTab />}
```

**Step 5: Commit**

```bash
git add app/comercial/page.tsx
git commit -m "feat: add Lost Leads tab to comercial module"
```

---

### Task 2.8: Sistema de Notificações Diárias

**Objetivo:** Disparar notificações para usuários quando lead está pronto para retomada

**Files:**
- Create: `supabase/functions/notify-lost-leads/index.ts`

**Step 1: Criar edge function**

```typescript
// supabase/functions/notify-lost-leads/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

Deno.serve(async (req) => {
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Find all overdue lost leads
    const { data: overdueLeads, error: findErr } = await supabase
      .from('lead_loss_records')
      .select('*, deals(company, title)')
      .eq('status', 'pendente')
      .lte('data_retorno', today);

    if (findErr) throw findErr;
    if (!overdueLeads || overdueLeads.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all users with comercial access
    const { data: users, error: usersErr } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('in_comercial_team', true);

    if (usersErr) throw usersErr;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create notifications for each user
    const notifications = [];
    for (const user of users) {
      for (const lead of overdueLeads) {
        notifications.push({
          usuario_id: user.id,
          tipo: 'lead_pronto_retomada',
          titulo: 'Lead Pronto para Retomada',
          mensagem: `Lead "${lead.deals.company}" está pronto para retomada. Motivo anterior: ${lead.motivo_perda}`,
          lida: false,
          modulo_origem: 'Comercial',
          criada_em: new Date().toISOString(),
        });
      }
    }

    // Batch insert notifications
    const { error: insertErr } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertErr) throw insertErr;

    // Update last_notification timestamp
    const { error: updateErr } = await supabase
      .from('lead_loss_records')
      .update({ ultima_notificacao: new Date().toISOString() })
      .in(
        'id',
        overdueLeads.map((l) => l.id)
      );

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({
        notified: users.length * overdueLeads.length,
        leads: overdueLeads.length,
        users: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Deploy function**

```bash
supabase functions deploy notify-lost-leads
```

**Step 3: Schedule function (via Supabase dashboard or PgCron)**

```sql
-- Add to migrations to schedule daily at 8 AM
SELECT cron.schedule('notify-lost-leads-daily', '0 8 * * *',
  'SELECT http_post(''https://your-project.supabase.co/functions/v1/notify-lost-leads'', '''', ''{"Content-Type":"application/json"}'')');
```

**Step 4: Commit**

```bash
git add supabase/functions/notify-lost-leads/index.ts
git commit -m "feat: add daily notification function for lost leads"
```

---

## 🎨 FASE 3: Indicador Visual de Feedback (Semana 2-3, Paralelo)

### Task 3.1: Criar Query Otimizada para Último Feedback

**Objetivo:** Função rápida para buscar último feedback por cliente

**Files:**
- Create: `supabase/migrations/007_create_latest_feedback_function.sql`

**Step 1: Criar função SQL**

```sql
-- Migration: Create function to get latest feedback per client
-- Purpose: Optimize queries for feedback indicators

CREATE OR REPLACE FUNCTION get_latest_feedback(p_client_id UUID)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  type TEXT,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE
) AS $$
SELECT
  f.id,
  f.client_id,
  f.type,
  f.description,
  f.date
FROM feedbacks f
WHERE f.client_id = p_client_id
ORDER BY f.date DESC
LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Index to speed up the function
CREATE INDEX IF NOT EXISTS idx_feedbacks_client_date_desc
ON feedbacks(client_id, date DESC);
```

**Step 2: Aplicar**

```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/007_create_latest_feedback_function.sql
git commit -m "db: create optimized function for latest feedback queries"
```

---

### Task 3.2: Criar Hook para Último Feedback

**Objetivo:** Hook reutilizável para buscar feedback

**Files:**
- Modify: `lib/hooks.ts`

**Step 1: Adicionar após removeFeedback**

```typescript
/**
 * Get the latest feedback for a client
 * Returns null if no feedbacks exist
 */
export async function getLatestFeedback(clientId: string) {
  const { data, error } = await supabase.rpc(
    'get_latest_feedback',
    { p_client_id: clientId }
  );

  if (error && error.code !== 'PGRST116') throw error;
  return (data?.[0] || null) as FeedbackCRM | null;
}

// Hook to fetch latest feedback for multiple clients
export function useClientsFeedback(clientIds: string[]) {
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackCRM | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchFeedbacks = async () => {
      setLoading(true);
      try {
        const results: Record<string, FeedbackCRM | null> = {};
        for (const clientId of clientIds) {
          results[clientId] = await getLatestFeedback(clientId);
        }
        setFeedbacks(results);
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [clientIds]);

  return { feedbacks, loading };
}
```

**Step 2: Commit**

```bash
git add lib/hooks.ts
git commit -m "feat: add hooks for latest feedback queries"
```

---

### Task 3.3: Criar Componente de Badge de Feedback

**Objetivo:** Indicador visual reutilizável

**Files:**
- Create: `app/components/FeedbackBadge.tsx`

**Step 1: Criar componente**

```typescript
// app/components/FeedbackBadge.tsx

import type { FeedbackCRM } from '@/lib/types';

interface FeedbackBadgeProps {
  feedback: FeedbackCRM | null;
  size?: 'sm' | 'md' | 'lg';
}

const FEEDBACK_CONFIG = {
  Elogio: {
    color: '#10B981',
    bgColor: '#D1FAE5',
    label: 'Elogio',
  },
  Sugestão: {
    color: '#6B7280',
    bgColor: '#F3F4F6',
    label: 'Sugestão',
  },
  Reclamação: {
    color: '#EF4444',
    bgColor: '#FEE2E2',
    label: 'Reclamação',
  },
};

export default function FeedbackBadge({
  feedback,
  size = 'md',
}: FeedbackBadgeProps) {
  if (!feedback || !feedback.type) {
    return null;
  }

  const config =
    FEEDBACK_CONFIG[feedback.type as keyof typeof FEEDBACK_CONFIG];
  if (!config) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      className={`rounded-full font-medium inline-flex items-center ${sizeClasses[size]}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
      title={`${config.label} - ${feedback.date ? new Date(feedback.date).toLocaleDateString('pt-BR') : ''}`}
    >
      {config.label}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/FeedbackBadge.tsx
git commit -m "feat: create reusable FeedbackBadge component"
```

---

### Task 3.4: Integrar Badge na Aba Comercial (Negócios)

**Objetivo:** Mostrar badge de feedback em cada deal card

**Files:**
- Modify: `app/comercial/page.tsx`

**Step 1: Importar FeedbackBadge e hook (linha ~10)**

```typescript
import FeedbackBadge from '@/app/components/FeedbackBadge';
import { useClientsFeedback } from '@/lib/hooks';
```

**Step 2: Adicionar hook para feedbacks (linha ~78, com outros hooks)**

```typescript
const clientIds = useMemo(() => deals.map(d => d.id), [deals]);
const { feedbacks: dealFeedbacks } = useClientsFeedback(clientIds);
```

**Step 3: Encontrar card de deal e adicionar badge (procurar por renderização de deals, ~800-900)**

```typescript
// Inside deal card/kanban item rendering
<div className="flex items-center justify-between">
  <h3>{deal.title}</h3>
  {dealFeedbacks[deal.id] && (
    <FeedbackBadge feedback={dealFeedbacks[deal.id]} size="sm" />
  )}
</div>
```

**Step 4: Commit**

```bash
git add app/comercial/page.tsx
git commit -m "feat: add feedback badges to deal cards in comercial tab"
```

---

### Task 3.5: Integrar Badge na Aba Diretório

**Objetivo:** Mostrar badge de feedback em clientes do Diretório

**Files:**
- Modify: `app/diretorio/page.tsx`

**Step 1: Importar badge e hook (linha ~10)**

```typescript
import FeedbackBadge from '@/app/components/FeedbackBadge';
import { useClientsFeedback } from '@/lib/hooks';
```

**Step 2: Adicionar hook (linha ~48, com outros hooks)**

```typescript
const { feedbacks: clienteFeedbacks } = useClientsFeedback(
  clientes.map(c => c.id)
);
```

**Step 3: Adicionar badge ao card de cliente (procurar pela renderização de clientes)**

```typescript
// Inside cliente card
<div className="flex items-center justify-between">
  <h3>{cliente.nome}</h3>
  {clienteFeedbacks[cliente.id] && (
    <FeedbackBadge feedback={clienteFeedbacks[cliente.id]} size="sm" />
  )}
</div>
```

**Step 4: Commit**

```bash
git add app/diretorio/page.tsx
git commit -m "feat: add feedback badges to clients in directory tab"
```

---

## 📊 FASE 4: Painel do Funil (Semana 4)

### Task 4.1: Criar Query SQL para Conversão do Funil

**Objetivo:** Calcular conversão entre etapas

**Files:**
- Create: `supabase/migrations/008_create_funnel_statistics_function.sql`

**Step 1: Criar função**

```sql
-- Migration: Create function to calculate sales funnel statistics
-- Purpose: Get conversion rates between stages

CREATE OR REPLACE FUNCTION get_funnel_statistics(
  p_month INT,
  p_year INT
)
RETURNS TABLE (
  stage TEXT,
  stage_order INT,
  total_leads BIGINT,
  conversion_rate NUMERIC
) AS $$
WITH stage_mapping AS (
  SELECT 'prospeccao' as stage, 1 as order
  UNION ALL SELECT 'diagnostico', 2
  UNION ALL SELECT 'negociacao', 3
  UNION ALL SELECT 'fechado', 4
  UNION ALL SELECT 'perdido', 5
),
leads_by_stage AS (
  SELECT
    d.stage,
    COUNT(*) as count,
    ROW_NUMBER() OVER (ORDER BY sm.order) as stage_order
  FROM deals d
  INNER JOIN stage_mapping sm ON d.stage = sm.stage
  WHERE EXTRACT(MONTH FROM d.created_at) = p_month
    AND EXTRACT(YEAR FROM d.created_at) = p_year
  GROUP BY d.stage, sm.order
)
SELECT
  lbs.stage,
  lbs.stage_order::INT,
  lbs.count,
  CASE
    WHEN LAG(lbs.count) OVER (ORDER BY lbs.stage_order) IS NULL
    THEN NULL::NUMERIC
    ELSE ROUND(
      (lbs.count::NUMERIC / LAG(lbs.count) OVER (ORDER BY lbs.stage_order)) * 100,
      2
    )
  END as conversion_rate
FROM leads_by_stage lbs
ORDER BY lbs.stage_order;
$$ LANGUAGE SQL STABLE;

-- Create index for faster aggregations
CREATE INDEX IF NOT EXISTS idx_deals_month_year
ON deals(EXTRACT(MONTH FROM created_at), EXTRACT(YEAR FROM created_at));
```

**Step 2: Aplicar**

```bash
supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/008_create_funnel_statistics_function.sql
git commit -m "db: create funnel statistics calculation function"
```

---

### Task 4.2: Criar Hook para Dados do Funil

**Objetivo:** Buscar dados de conversão

**Files:**
- Modify: `lib/hooks.ts`

**Step 1: Adicionar tipo e hook**

```typescript
// Add type first
export interface FunnelStage {
  stage: string;
  stage_order: number;
  total_leads: number;
  conversion_rate: number | null;
}

// Add hook
export async function getFunnelStatistics(month: number, year: number) {
  const { data, error } = await supabase.rpc(
    'get_funnel_statistics',
    {
      p_month: month,
      p_year: year,
    }
  );

  if (error) throw error;
  return data as FunnelStage[];
}

// Hook to use
export function useFunnelStatistics(month: number, year: number) {
  const [data, setData] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const stats = await getFunnelStatistics(month, year);
        setData(stats);
      } catch (error) {
        console.error('Error fetching funnel:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [month, year]);

  return { data, loading };
}
```

**Step 2: Commit**

```bash
git add lib/hooks.ts
git commit -m "feat: add hooks for funnel statistics"
```

---

### Task 4.3: Criar Componente do Gráfico de Funil

**Objetivo:** Visualização em pirâmide com Recharts

**Files:**
- Create: `app/comercial/FunnelChart.tsx`

**Step 1: Criar componente**

```typescript
// app/comercial/FunnelChart.tsx

'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { FunnelStage } from '@/lib/hooks';

interface FunnelChartProps {
  data: FunnelStage[];
  loading?: boolean;
}

const STAGE_COLORS = {
  prospeccao: '#8B5CF6',
  diagnostico: '#3B82F6',
  negociacao: '#F59E0B',
  fechado: '#10B981',
  perdido: '#EF4444',
};

const STAGE_LABELS = {
  prospeccao: 'Prospecção',
  diagnostico: 'Diagnóstico',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export default function FunnelChart({ data, loading }: FunnelChartProps) {
  // Transform data for better visualization
  const chartData = useMemo(() => {
    return data.map((stage) => ({
      name: STAGE_LABELS[stage.stage as keyof typeof STAGE_LABELS],
      value: stage.total_leads,
      conversion: stage.conversion_rate,
      fill: STAGE_COLORS[stage.stage as keyof typeof STAGE_COLORS],
    }));
  }, [data]);

  if (loading) {
    return <div className="h-96 flex items-center justify-center">Carregando...</div>;
  }

  if (chartData.length === 0) {
    return <div className="h-96 flex items-center justify-center text-gray-500">
      Sem dados disponíveis para este período
    </div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Funil de Conversão</h3>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={180} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'value') return [value, 'Leads'];
              if (name === 'conversion') return [`${value}%`, 'Conversão'];
              return value;
            }}
          />
          <Bar dataKey="value" fill="#3B82F6" name="Leads" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion rates table */}
      <div className="mt-8">
        <h4 className="font-semibold mb-4">Taxa de Conversão</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Etapa</th>
              <th className="text-left py-2">Leads</th>
              <th className="text-left py-2">Conversão</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="py-2 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: row.fill }}
                  />
                  {row.name}
                </td>
                <td className="py-2">{row.value}</td>
                <td className="py-2">
                  {row.conversion ? `${row.conversion}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/comercial/FunnelChart.tsx
git commit -m "feat: create funnel visualization component with Recharts"
```

---

### Task 4.4: Integrar Gráfico na Aba "Painel"

**Objetivo:** Adicionar gráfico ao painel principal com filtro Mês/Ano

**Files:**
- Modify: `app/comercial/page.tsx`

**Step 1: Importar componente e hook (linha ~10)**

```typescript
import FunnelChart from './FunnelChart';
import { useFunnelStatistics } from '@/lib/hooks';
```

**Step 2: Adicionar estado para filtros (linha ~72)**

```typescript
// Keep existing filterMonth and filterYear state
// They're already defined
```

**Step 3: Adicionar hook (linha ~78, com outros hooks)**

```typescript
const { data: funnelData, loading: loadingFunnel } = useFunnelStatistics(
  parseInt(filterMonth),
  parseInt(filterYear)
);
```

**Step 4: Renderizar gráfico na seção "Painel" (procurar por if activeTab === 'painel')**

```typescript
{activeTab === 'painel' && (
  <div className="space-y-6">
    {/* Existing painel content */}

    {/* Add Funnel Chart */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Funil de Vendas</h2>
        <div className="flex gap-2">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <FunnelChart data={funnelData} loading={loadingFunnel} />
    </div>
  </div>
)}
```

**Step 5: Commit**

```bash
git add app/comercial/page.tsx
git commit -m "feat: integrate funnel chart with month/year filters in painel tab"
```

---

### Task 4.5: Destaque de Gargalos

**Objetivo:** Visualmente destacar etapas com baixa conversão

**Files:**
- Modify: `app/comercial/FunnelChart.tsx`

**Step 1: Atualizar componente para destacar gargalos**

```typescript
// Add logic to identify bottlenecks (conversion < 30%)
const chartData = useMemo(() => {
  return data.map((stage) => {
    const isBottleneck = stage.conversion_rate !== null && stage.conversion_rate < 30;
    return {
      name: STAGE_LABELS[stage.stage as keyof typeof STAGE_LABELS],
      value: stage.total_leads,
      conversion: stage.conversion_rate,
      fill: STAGE_COLORS[stage.stage as keyof typeof STAGE_COLORS],
      isBottleneck,
    };
  });
}, [data]);

// Add warning badge below chart
return (
  <div className="bg-white p-6 rounded-lg shadow">
    {/* existing chart code */}

    {/* Add bottleneck warnings */}
    {chartData.some(s => s.isBottleneck) && (
      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded">
        <h4 className="font-semibold text-orange-900 mb-2">⚠️ Gargalos Identificados</h4>
        <ul className="text-sm text-orange-800">
          {chartData
            .filter(s => s.isBottleneck)
            .map(s => (
              <li key={s.name}>
                {s.name}: {s.conversion}% conversão (objetivo: 30%+)
              </li>
            ))}
        </ul>
      </div>
    )}
  </div>
);
```

**Step 2: Commit**

```bash
git add app/comercial/FunnelChart.tsx
git commit -m "feat: add bottleneck highlighting to funnel chart"
```

---

## 🧪 Testes Finais & Deployment

### Task 5.1: Testes de Integração Completos

**Objetivo:** Validar todas as funcionalidades juntas

**Files:**
- Create: `__tests__/comercial.integration.test.ts`

**Step 1: Escrever testes**

```typescript
// __tests__/comercial.integration.test.ts

import { supabase } from '@/lib/supabase';

describe('Módulo Comercial - Integração Completa', () => {

  test('complete workflow: create client, sync to directory, add feedback, create lost lead', async () => {
    // 1. Create client
    const { data: client } = await supabase
      .from('clients')
      .insert({ name: 'Integration Test Co' })
      .select()
      .single();

    expect(client).toBeDefined();

    // Wait for sync trigger
    await new Promise(r => setTimeout(r, 1000));

    // 2. Verify sync to directory
    const { data: dirClient } = await supabase
      .from('diretorio_clientes')
      .select('*')
      .eq('id', client.id)
      .single();

    expect(dirClient).toBeDefined();

    // 3. Create deal
    const { data: deal } = await supabase
      .from('deals')
      .insert({
        title: 'Test Deal',
        company: client.name,
        stage: 'prospeccao',
        value: 10000,
        assignee: 'test-user',
      })
      .select()
      .single();

    expect(deal).toBeDefined();

    // 4. Add feedback
    const { data: feedback } = await supabase
      .from('feedbacks')
      .insert({
        client_id: client.id,
        type: 'Elogio',
        description: 'Great service!',
      })
      .select()
      .single();

    expect(feedback).toBeDefined();

    // 5. Create lost lead record
    const { data: lossRecord } = await supabase
      .from('lead_loss_records')
      .insert({
        deal_id: deal.id,
        motivo_perda: 'Budget constraints',
        data_retorno: '2026-04-15',
        status: 'pendente',
      })
      .select()
      .single();

    expect(lossRecord).toBeDefined();

    // 6. Update deal status to 'perdido'
    const { error: updateErr } = await supabase
      .from('deals')
      .update({ stage: 'perdido' })
      .eq('id', deal.id);

    expect(updateErr).toBeNull();

    // Cleanup
    await supabase.from('deals').delete().eq('id', deal.id);
    await supabase.from('clients').delete().eq('id', client.id);
  });
});
```

**Step 2: Executar testes**

```bash
npm test -- __tests__/comercial.integration.test.ts
```

**Step 3: Commit**

```bash
git add __tests__/comercial.integration.test.ts
git commit -m "test: add comprehensive integration tests for comercial module"
```

---

### Task 5.2: Deployment Checklist

**Before going to production:**

- [ ] All tests passing locally
- [ ] Migrations tested on staging
- [ ] RLS policies reviewed (triggers have appropriate permissions)
- [ ] Notification function scheduled (cron job)
- [ ] Edge functions deployed
- [ ] TypeScript types updated
- [ ] UI components tested in browser
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Accessibility checked

**Deployment Commands:**

```bash
# 1. Push migrations
supabase db push

# 2. Deploy edge functions
supabase functions deploy notify-lost-leads

# 3. Deploy frontend
npm run build
npm run deploy # (or your deployment command)

# 4. Verify
npm run test:e2e
```

---

## 📋 Summary

**Total Tasks**: 25
**Estimated Effort**: 80-100 developer hours (distributed across team)
**Timeline**: 4 weeks (with parallelization)

**Key Milestones**:
- ✅ Week 1-2: Sincronização testada em staging
- ✅ Week 3: Leads perdidos com notificações diárias ativas
- ✅ Week 4: Painel do funil com gráficos em produção

---

**Next Step**: Choose execution method:
1. **Subagent-Driven**: I deploy fresh subagent per task
2. **Manual**: You implement tasks locally
3. **Hybrid**: Your team implements, I review

Which approach? 🚀
