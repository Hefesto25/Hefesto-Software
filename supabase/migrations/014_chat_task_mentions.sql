-- ============================================================
-- HEFESTO IA — Menções de Tarefas no Chat
-- Migration: 014_chat_task_mentions
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- Adicionar coluna 'mencoes_tarefas' na tabela mensagens para armazenar os dados da menção.
-- Formato esperado: array de objetos JSON com tipo, tarefa_id, tarefa_titulo, modulo, status_no_momento
ALTER TABLE public.mensagens
ADD COLUMN IF NOT EXISTS mencoes_tarefas JSONB DEFAULT '[]'::jsonb;
