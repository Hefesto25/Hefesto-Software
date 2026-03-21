-- ============================================================
-- HEFESTO IA — Performance Indexes
-- Migration: 030_performance_indexes
-- ============================================================

-- notificacoes: composite covering user feed query
-- Covers: WHERE usuario_id = ? AND lida = false ORDER BY criada_em DESC
CREATE INDEX IF NOT EXISTS idx_notificacoes_feed
  ON public.notificacoes(usuario_id, lida, criada_em DESC);

-- mensagens: composite for channel timeline
-- Covers: WHERE canal_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_mensagens_canal_timeline
  ON public.mensagens(canal_id, created_at DESC);

-- dm_mensagens: composite for DM thread timeline
-- Only created if dm_mensagens table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dm_mensagens'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dm_mensagens_dm_timeline
      ON public.dm_mensagens(dm_id, created_at DESC)';
  END IF;
END $$;

-- financial_transactions: date range queries
CREATE INDEX IF NOT EXISTS idx_fin_transactions_date
  ON public.financial_transactions(created_at DESC);

-- deals: assignee text lookup (kept as TEXT per architecture decision)
CREATE INDEX IF NOT EXISTS idx_deals_assignee
  ON public.deals(assignee);
