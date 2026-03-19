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
