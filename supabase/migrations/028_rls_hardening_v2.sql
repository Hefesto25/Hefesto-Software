-- ============================================================
-- HEFESTO IA — RLS Hardening v2
-- Migration: 028_rls_hardening_v2
-- Fixes:
--   1. notificacoes: scope SELECT to own records (auth.uid())
--   2. notification_settings: require authenticated
--   3. financial_transactions: restrict SELECT to admins only
--   4. comercial_commission_tiers: require authenticated
--   5. financial_taxes: require authenticated
-- ============================================================

-- ① notificacoes — escopo por usuário
DROP POLICY IF EXISTS "Allow all for notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated users can select" ON public.notificacoes;

CREATE POLICY "Users can read own notifications"
  ON public.notificacoes FOR SELECT
  TO authenticated
  USING (usuario_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own notifications"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id::text = auth.uid()::text);

CREATE POLICY "Users can update own notifications"
  ON public.notificacoes FOR UPDATE
  TO authenticated
  USING (usuario_id::text = auth.uid()::text);

CREATE POLICY "Admins can manage notificacoes"
  ON public.notificacoes FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ② notification_settings — exigir autenticação
DROP POLICY IF EXISTS "Allow all for notification_settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Authenticated users can select" ON public.notification_settings;

CREATE POLICY "Users can manage own notification settings"
  ON public.notification_settings FOR ALL
  TO authenticated
  USING (usuario_id::text = auth.uid()::text)
  WITH CHECK (usuario_id::text = auth.uid()::text);

CREATE POLICY "Admins can manage notification settings"
  ON public.notification_settings FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ③ financial_transactions — leitura restrita a admins
-- (A política "Admins can manage" já existe e cobre ALL; apenas ajustamos o SELECT)
DROP POLICY IF EXISTS "Authenticated users can select" ON public.financial_transactions;

CREATE POLICY "Admins can read financial transactions"
  ON public.financial_transactions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ④ comercial_commission_tiers — substituir USING(true) sem role
DROP POLICY IF EXISTS "Enable read access for all to comercial_commission_tiers" ON public.comercial_commission_tiers;
DROP POLICY IF EXISTS "Enable insert access for all to comercial_commission_tiers" ON public.comercial_commission_tiers;
DROP POLICY IF EXISTS "Enable update access for all to comercial_commission_tiers" ON public.comercial_commission_tiers;
DROP POLICY IF EXISTS "Enable delete access for all to comercial_commission_tiers" ON public.comercial_commission_tiers;

CREATE POLICY "Authenticated users can read commission tiers"
  ON public.comercial_commission_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage commission tiers"
  ON public.comercial_commission_tiers FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ⑤ financial_taxes — substituir USING(true) sem role
DROP POLICY IF EXISTS "Enable read access for all to financial_taxes" ON public.financial_taxes;
DROP POLICY IF EXISTS "Enable insert access for all to financial_taxes" ON public.financial_taxes;
DROP POLICY IF EXISTS "Enable update access for all to financial_taxes" ON public.financial_taxes;
DROP POLICY IF EXISTS "Enable delete access for all to financial_taxes" ON public.financial_taxes;

CREATE POLICY "Authenticated users can read financial taxes"
  ON public.financial_taxes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage financial taxes"
  ON public.financial_taxes FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ⑥ financial_transactions — drop remaining legacy permissive policies
-- (applied as hotfix after initial migration run)
DROP POLICY IF EXISTS "Enable all actions for anon users (public access)" ON public.financial_transactions;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.financial_transactions;

-- ⑦ Comprehensive fix: 14 tables with public/anon access not covered by migration 008
-- (migration 008 was not applied to the live DB for these tables)
DO $$
DECLARE
  t TEXT;
  table_list TEXT[] := ARRAY[
    'contacts','contracts','deals','legal_documents','legal_pendencies',
    'tasks','team_members','budget_plan','calendar_events','expense_categories',
    'financial_categories','financial_data','financial_goals','financial_types'
  ];
BEGIN
  FOREACH t IN ARRAY table_list LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable update access for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable delete access for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable update for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Enable delete for all users" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can select" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can manage" ON %I', t);
    EXECUTE format('CREATE POLICY "Authenticated users can select" ON %I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Admins can manage" ON %I FOR ALL TO authenticated USING (public.is_admin())', t);
  END LOOP;
END $$;

-- financial_transactions: add missing write policy for admins
CREATE POLICY "Admins can manage financial transactions"
  ON public.financial_transactions FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ⑧ Fix notificacoes INSERT policy: allow cross-user inserts
-- (original INSERT policy incorrectly scoped to auth.uid() which blocked
-- chat mentions, DM notifications, calendar and commercial cross-user inserts)
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notificacoes;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (true);
