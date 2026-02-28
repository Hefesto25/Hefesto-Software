-- ============================================
-- HEFESTO IA — Endurecimento de Segurança (Security Hardening)
-- Migration: 008_security_hardening
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Correção: Search Path Mutável em Função SECURITY DEFINER
-- Melhora a segurança da função de trigger definindo um search_path fixo.
-- Isso evita ataques de sequestro de caminho (path hijacking).
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 2. Correção: Políticas RLS Excessivamente Permissivas
-- Muitas tabelas estavam com "Allow public access" usando (true).
-- Vamos restringir o acesso apenas a usuários AUTENTICADOS e remover permissões universais de escrita.

-- Lista de tabelas afetadas baseada no relatório do Linter:
-- admin_demands, admin_meetings, budget_plan, calendar_events, channels, chat_messages, 
-- contacts, contracts, deals, expense_categories, financial_categories, financial_data, 
-- financial_goals, financial_transactions, financial_types, legal_documents, legal_pendencies, 
-- tasks, team_members

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
        -- Remove a política genérica "Allow public access" se existir
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for all users" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for all users" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update access for all users" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable delete access for all users" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all actions for anon users (public access)" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert for all users" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update for all users" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable delete for all users" ON %I', t);

        -- Cria nova política: Apenas usuários AUTENTICADOS podem ler
        EXECUTE format('CREATE POLICY "Authenticated users can select" ON %I FOR SELECT TO authenticated USING (true)', t);
        
        -- Cria nova política: Administradores podem gerenciar tudo
        -- Nota: Esta política usa a verificação de modulos_acesso que já implementamos em outras tabelas.
        EXECUTE format('CREATE POLICY "Admins can manage" ON %I FOR ALL TO authenticated USING (
            EXISTS (
                SELECT 1 FROM public.usuarios u
                WHERE u.id = auth.uid()
                AND ''/configuracoes'' = ANY(u.modulos_acesso)
            )
        )', t);
    END LOOP;
END $$;
