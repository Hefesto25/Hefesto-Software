-- ============================================
-- HEFESTO IA — Correção de Recursividade Infinita no RLS
-- Migration: 009_fix_rls_recursion
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Cria uma função de segurança para verificar se o usuário é admin
-- O uso de SECURITY DEFINER é CRUCIAL para evitar recursividade infinita no RLS,
-- pois a função executará com privilégios de proprietário, ignorando as políticas da tabela usuarios.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
    AND '/configuracoes' = ANY(modulos_acesso)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Atualiza a política na tabela 'usuarios'
DROP POLICY IF EXISTS "Admin can manage all usuarios" ON public.usuarios;
CREATE POLICY "Admin can manage all usuarios"
  ON public.usuarios FOR ALL
  USING (public.is_admin());

-- 3. Atualiza as políticas nas outras 19 tabelas para usar a função is_admin()
-- Isso torna as políticas mais limpas e seguras.
DO $$
DECLARE
    t TEXT;
    table_list TEXT[] := ARRAY[
        'admin_demands', 'admin_meetings', 'budget_plan', 'calendar_events', 'channels', 
        'chat_messages', 'contacts', 'contracts', 'deals', 'expense_categories', 
        'financial_categories', 'financial_data', 'financial_goals', 'financial_transactions', 
        'financial_types', 'legal_documents', 'legal_pendencies', 'tasks', 'team_members'
    ];
BEGIN
    FOREACH t IN ARRAY table_list LOOP
        -- Remove a política antiga
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage" ON %I', t);

        -- Cria a política nova usando a função centralizada
        EXECUTE format('CREATE POLICY "Admins can manage" ON %I FOR ALL TO authenticated USING (public.is_admin())', t);
    END LOOP;
END $$;
