-- ============================================================
-- HEFESTO IA — FK: notificacoes.usuario_id → usuarios.id
-- Migration: 029_notificacoes_fk
-- ============================================================
-- notificacoes.usuario_id is already UUID in the live DB.
-- Just clean orphans and add FK with ON DELETE CASCADE.

-- Step 1: Remove orphaned records
DELETE FROM public.notificacoes
WHERE usuario_id NOT IN (SELECT id FROM public.usuarios);

-- Step 2: Add FK constraint with cascade delete
ALTER TABLE public.notificacoes
  ADD CONSTRAINT fk_notificacoes_usuario
  FOREIGN KEY (usuario_id)
  REFERENCES public.usuarios(id)
  ON DELETE CASCADE;
