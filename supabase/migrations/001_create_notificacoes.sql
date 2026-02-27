-- ============================================
-- HEFESTO IA — Sistema de Notificações
-- Migration: Tabelas notificacoes + notification_settings
-- ============================================

-- Tabela principal de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('tarefa_atribuida', 'tarefa_vencimento', 'mencao_chat')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  redirecionamento TEXT,
  modulo_origem TEXT,
  criada_em TIMESTAMPTZ DEFAULT NOW(),
  lida_em TIMESTAMPTZ
);

-- Tabela de configurações de notificação por usuário
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id TEXT NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  notif_tarefa_atribuida BOOLEAN DEFAULT true,
  notif_tarefa_vencimento BOOLEAN DEFAULT true,
  notif_mencao_chat BOOLEAN DEFAULT true,
  vencimento_dias_antes TEXT DEFAULT '5,3,1'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(usuario_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_criada ON notificacoes(criada_em DESC);

-- Habilitar Realtime para a tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- Disable RLS for simplicity (same pattern as existing tables)
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for notificacoes" ON notificacoes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for notification_settings" ON notification_settings FOR ALL USING (true) WITH CHECK (true);
