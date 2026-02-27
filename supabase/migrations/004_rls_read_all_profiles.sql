-- ============================================
-- HEFESTO IA — RLS para leitura de perfis
-- Permite que usuários autenticados vejam
-- todos os perfis (necessário para Configurações)
-- ============================================

-- Remove a política anterior restritiva (se existir)
DROP POLICY IF EXISTS "Users can read own profile" ON usuarios;

-- Nova política: qualquer usuário autenticado pode ler todos os perfis
CREATE POLICY "Authenticated users can read all profiles"
  ON usuarios FOR SELECT
  USING (auth.role() = 'authenticated');
