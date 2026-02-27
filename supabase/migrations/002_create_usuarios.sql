-- ============================================
-- HEFESTO IA — Tabela de Perfis de Usuários
-- Migration: 002_create_usuarios
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT,
  categoria TEXT NOT NULL DEFAULT 'operacional',
  foto_url TEXT,
  modulos_acesso TEXT[] DEFAULT ARRAY['/']::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Usuário pode ler e atualizar apenas seu próprio perfil
CREATE POLICY "Users can read own profile"
  ON usuarios FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON usuarios FOR UPDATE
  USING (auth.uid() = id);

-- Admin (service role) pode ver todos os perfis
CREATE POLICY "Service role can manage all"
  ON usuarios FOR ALL
  USING (auth.role() = 'service_role');
