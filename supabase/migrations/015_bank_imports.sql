-- Migration 015: Bank imports and reconciliation tables

-- Table: bank_imports
-- Stores metadata of each bank statement upload
CREATE TABLE IF NOT EXISTS bank_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banco TEXT NOT NULL CHECK (banco IN ('mercado_pago', 'santander')),
  formato TEXT NOT NULL CHECK (formato IN ('ofx', 'pdf')),
  data_importacao TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado')),
  total_transacoes INTEGER DEFAULT 0,
  total_conciliadas INTEGER DEFAULT 0,
  periodo_inicio DATE,
  periodo_fim DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: bank_import_transactions
-- Stores individual transactions parsed from the bank statement
CREATE TABLE IF NOT EXISTS bank_import_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES bank_imports(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  status_reconciliacao TEXT NOT NULL DEFAULT 'novo' CHECK (status_reconciliacao IN ('novo', 'duplicado', 'conciliado', 'ignorado')),
  transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
  selecionado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for bank_imports
ALTER TABLE bank_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bank_imports"
  ON bank_imports FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can insert bank_imports"
  ON bank_imports FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update bank_imports"
  ON bank_imports FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can delete bank_imports"
  ON bank_imports FOR DELETE
  TO authenticated
  USING (TRUE);

-- RLS policies for bank_import_transactions
ALTER TABLE bank_import_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bank_import_transactions"
  ON bank_import_transactions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can insert bank_import_transactions"
  ON bank_import_transactions FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update bank_import_transactions"
  ON bank_import_transactions FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can delete bank_import_transactions"
  ON bank_import_transactions FOR DELETE
  TO authenticated
  USING (TRUE);

-- Index for fast reconciliation queries
CREATE INDEX IF NOT EXISTS idx_bank_import_transactions_import_id
  ON bank_import_transactions(import_id);

CREATE INDEX IF NOT EXISTS idx_bank_import_transactions_data
  ON bank_import_transactions(data);

CREATE INDEX IF NOT EXISTS idx_bank_imports_status
  ON bank_imports(status);
