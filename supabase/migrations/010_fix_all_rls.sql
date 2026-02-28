-- ============================================================
-- HEFESTO IA — Correção Definitiva e Completa do RLS
-- Migration: 010_fix_all_rls
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================
-- Este script resolve 3 problemas de uma vez:
-- 1. Recursividade infinita na tabela usuarios
-- 2. Usuários autenticados sem permissão de SELECT na tabela usuarios
-- 3. Trigger de criação automática (garante que está ativo)
-- ============================================================

-- ① Cria função de verificação de admin (SECURITY DEFINER evita o loop)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE id = auth.uid()
    AND '/configuracoes' = ANY(modulos_acesso)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ② Remove TODAS as políticas existentes na tabela usuarios e recria do zero
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios podem ler todos os perfis" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated read all" ON public.usuarios;
DROP POLICY IF EXISTS "Allow public access" ON public.usuarios;
DROP POLICY IF EXISTS "Authenticated users can select" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can manage" ON public.usuarios;

-- Política A: Qualquer usuário AUTENTICADO pode ler todos os perfis (necessário para a plataforma funcionar)
CREATE POLICY "Authenticated users can read all"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (true);

-- Política B: Cada usuário pode atualizar o PRÓPRIO perfil (nome, foto)
CREATE POLICY "Users can update own profile"
  ON public.usuarios FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política C: Administradores podem gerenciar TODOS os perfis (INSERT, UPDATE, DELETE)
-- Usa a função is_admin() para evitar recursividade
CREATE POLICY "Admin can manage all usuarios"
  ON public.usuarios FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ③ Garante que o trigger de criação automática está ativo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (
    id,
    email,
    nome,
    cargo,
    categoria,
    modulos_acesso,
    foto_url,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'cargo', ''),
    COALESCE(NEW.raw_user_meta_data->>'categoria', 'Operacional'),
    ARRAY['/', '/chat', '/notificacoes'],
    NULL,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Evita erro se o perfil já existir
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
