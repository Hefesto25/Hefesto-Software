-- ============================================
-- HEFESTO IA — Remoção das tabelas do módulo Administrativo
-- Migration: 024_drop_admin_tables
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Remove políticas RLS antes de dropar as tabelas
DROP POLICY IF EXISTS "Authenticated users can select" ON admin_demands;
DROP POLICY IF EXISTS "Admins can manage" ON admin_demands;
DROP POLICY IF EXISTS "Authenticated users can select" ON admin_meetings;
DROP POLICY IF EXISTS "Admins can manage" ON admin_meetings;

-- Dropa as tabelas do módulo Administrativo
DROP TABLE IF EXISTS admin_demands CASCADE;
DROP TABLE IF EXISTS admin_meetings CASCADE;
