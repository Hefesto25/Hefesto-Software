-- ============================================================
-- HEFESTO IA — Permissões Restritas para Exclusão de Canais e Remoção de Participantes
-- Migration: 013_chat_admin_permissions
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Apenas Admin Geral pode excluir canais
DROP POLICY IF EXISTS "excluir_canal" ON public.canais;
CREATE POLICY "excluir_canal" ON public.canais
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 2. Apenas Admin Geral pode remover participantes (ou o próprio usuário pode sair voluntariamente)
DROP POLICY IF EXISTS "remover_participante" ON public.canal_participantes;
CREATE POLICY "remover_participante" ON public.canal_participantes
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR usuario_id = auth.uid() -- O próprio usuário pode sair do canal voluntariamente
  );
