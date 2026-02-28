-- ============================================
-- HEFESTO IA — Trigger para criação automática de perfil
-- Migration: 005_trigger_handle_new_user
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Função que cria o perfil automaticamente na tabela usuarios
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
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data->>'modulos_acesso' IS NOT NULL
        THEN string_to_array(NEW.raw_user_meta_data->>'modulos_acesso', ',')
        ELSE NULL
      END,
      ARRAY['/', '/chat', '/notificacoes']
    ),
    NULL,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que dispara a função após cada novo usuário no Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
