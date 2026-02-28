-- ============================================
-- HEFESTO IA — RLS para edição de perfis
-- Migration: 006_rls_admin_and_update
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Remove políticas antigas que podem conflitar
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Service role can manage all" ON usuarios;
DROP POLICY IF EXISTS "usuarios_own_profile" ON usuarios;
DROP POLICY IF EXISTS "admin_all_usuarios" ON usuarios;

-- Política: qualquer usuário autenticado pode atualizar seu PRÓPRIO perfil
CREATE POLICY "Users can update own profile"
  ON usuarios FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: administradores (com 'configuracoes' nos módulos) podem gerenciar TODOS os perfis
-- Cobre SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Admin can manage all usuarios"
  ON usuarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
      AND '/configuracoes' = ANY(u.modulos_acesso)
    )
  );
