-- ============================================================
-- HEFESTO IA — Presença de Usuários (Online Status)
-- Migration: 025_presenca_table
--
-- MOTIVO:
-- Substituição do Supabase Realtime Presence pelo modelo
-- próprio via tabela pública. O Presence cria partições diárias
-- em realtime.messages (messages_YYYY_MM_DD) que acumulam
-- indefinidamente no dashboard.
--
-- NOVO MODELO:
-- - Tabela presenca com last_seen atualizado a cada 30s
-- - Usuário é considerado online se last_seen < 2 min atrás
-- - Postgres Changes notifica mudanças em tempo real
-- - Zero partições criadas no schema realtime
-- ============================================================

-- ① Criar tabela de presença
CREATE TABLE IF NOT EXISTS public.presenca (
  usuario_id  uuid PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  last_seen   timestamptz NOT NULL DEFAULT NOW()
);

-- ② Index para consultas de usuários ativos por tempo
CREATE INDEX IF NOT EXISTS idx_presenca_last_seen
  ON public.presenca(last_seen DESC);

-- ③ RLS
ALTER TABLE public.presenca ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ver quem está online
CREATE POLICY "ver_presenca" ON public.presenca
  FOR SELECT TO authenticated
  USING (true);

-- Usuário só pode inserir/atualizar a própria presença
CREATE POLICY "inserir_presenca" ON public.presenca
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "atualizar_presenca" ON public.presenca
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid());

-- ④ Habilitar Realtime (Postgres Changes — sem partições!)
ALTER PUBLICATION supabase_realtime ADD TABLE presenca;

-- ⑤ Função de limpeza de registros stale (> 5 minutos sem heartbeat)
CREATE OR REPLACE FUNCTION public.limpar_presenca_stale()
RETURNS integer AS $$
DECLARE
  total integer;
BEGIN
  DELETE FROM public.presenca
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS total = ROW_COUNT;
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
