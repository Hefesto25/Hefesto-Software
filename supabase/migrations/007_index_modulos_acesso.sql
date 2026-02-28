-- ============================================
-- HEFESTO IA — Índice GIN para performance de permissões
-- Migration: 007_index_modulos_acesso
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Cria um índice GIN para a coluna modulos_acesso.
-- Isso otimiza a performance das políticas RLS que verificam as permissões do usuário.
CREATE INDEX IF NOT EXISTS idx_usuarios_modulos_acesso ON public.usuarios USING GIN (modulos_acesso);
