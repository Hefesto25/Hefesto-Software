-- Migration 023: Create lead_loss_records table for managing lost leads

CREATE TABLE IF NOT EXISTS lead_loss_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    motivo_perda TEXT NOT NULL,
    descricao TEXT,
    data_retorno DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'retomado', 'descartado')),
    notificacoes_enviadas INT DEFAULT 0,
    ultima_notificacao TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_loss_deal_id ON lead_loss_records(deal_id);
CREATE INDEX IF NOT EXISTS idx_lead_loss_data_retorno ON lead_loss_records(data_retorno);
CREATE INDEX IF NOT EXISTS idx_lead_loss_status ON lead_loss_records(status);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_lead_loss_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_loss_updated_at
    BEFORE UPDATE ON lead_loss_records
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_loss_updated_at();

-- Enable RLS
ALTER TABLE lead_loss_records ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users
CREATE POLICY "lead_loss_records_select" ON lead_loss_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "lead_loss_records_insert" ON lead_loss_records
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "lead_loss_records_update" ON lead_loss_records
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "lead_loss_records_delete" ON lead_loss_records
    FOR DELETE TO authenticated USING (true);
