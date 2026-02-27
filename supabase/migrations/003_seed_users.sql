-- ============================================
-- HEFESTO IA — Seed de Usuários
-- Migration: 003_seed_users
-- ⚠️  Execute MANUALMENTE no SQL Editor do Supabase
-- ⚠️  NÃO commitar este arquivo no repositório
-- ============================================

-- Marcel Sgarioni — Admin Geral
SELECT auth.create_user_by_email_password(
  'marcelsgarioni@hefestoia.com',
  'Marcel@08090'
);

-- Rodrigo Lessa — Operacional
SELECT auth.create_user_by_email_password(
  'rodrigolessa@hefestoia.com',
  'LuMaRo*25'
);

-- Luigi Alban — Operacional
SELECT auth.create_user_by_email_password(
  'luigialban@hefestoia.com',
  'LuMaRo*25'
);

-- ============================================
-- Após criar os usuários acima, execute este
-- bloco para inserir os perfis na tabela usuarios.
-- Substitua os UUIDs pelos IDs reais gerados.
-- ============================================
-- INSERT INTO usuarios (id, nome, email, cargo, categoria, modulos_acesso) VALUES
-- ('<UUID_MARCEL>', 'Marcel Sgarioni', 'marcelsgarioni@hefestoia.com', 'Sócio-Fundador', 'Admin Geral',
--   ARRAY['/', '/comercial', '/financeiro', '/operacional', '/administrativo', '/calendario', '/chat', '/configuracoes', '/notificacoes']),
-- ('<UUID_RODRIGO>', 'Rodrigo Lessa', 'rodrigolessa@hefestoia.com', 'Sócio-Fundador', 'Admin Geral',
--   ARRAY['/', '/comercial', '/financeiro', '/operacional', '/administrativo', '/calendario', '/chat', '/configuracoes', '/notificacoes']),
-- ('<UUID_LUIGI>', 'Luigi Alban', 'luigialban@hefestoia.com', 'Colaborador', 'Operacional',
--   ARRAY['/', '/operacional', '/calendario', '/chat', '/notificacoes']);
