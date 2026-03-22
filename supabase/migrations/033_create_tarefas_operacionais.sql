-- ============================================================
-- HEFESTO SOFTWARE — Tarefas Operacionais
-- Migration: 033_create_tarefas_operacionais
--
-- CONTEXTO:
-- Esta tabela foi criada manualmente antes do controle por
-- migrations. Esta migration retroativa documenta o schema
-- real da tabela e garante que ambientes novos (staging,
-- CI, local) criem a tabela corretamente.
--
-- CAMPOS IMPORTANTES:
-- • responsavel_id  → TEXT, armazena o NOME do responsável
--                     (campo legado; usado apenas para exibição)
-- • responsaveis_ids → TEXT[], armazena os UUIDs (auth.users.id)
--                     dos responsáveis (campo canonical para
--                     filtros em "Minhas Tarefas" e notificações)
-- • participantes_ids → TEXT[], UUIDs dos participantes
-- ============================================================

-- ① Tabela principal
CREATE TABLE IF NOT EXISTS public.tarefas_operacionais (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo           text        NOT NULL,
    descricao        text,
    tipo             text        NOT NULL,
    cliente_nome     text        NOT NULL DEFAULT '',
    negocio_id       text,
    responsavel_id   text,                              -- legado: armazena NOME
    responsaveis_ids text[]      NOT NULL DEFAULT '{}', -- canonical: UUIDs auth
    participantes_ids text[]     NOT NULL DEFAULT '{}', -- UUIDs auth
    status           text        NOT NULL DEFAULT 'pendente',
    origem           text        NOT NULL DEFAULT 'manual',
    dificuldade      numeric              DEFAULT 1,
    progresso        text                DEFAULT 'Não iniciado',
    categoria_tarefa text,
    data_inicio      timestamptz,
    data_termino     timestamptz,
    data_criacao     timestamptz          DEFAULT now(),
    data_conclusao   timestamptz,
    observacoes      text
);

-- ② RLS
ALTER TABLE public.tarefas_operacionais ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'tarefas_operacionais'
          AND policyname = 'tarefas_operacionais_authenticated'
    ) THEN
        CREATE POLICY "tarefas_operacionais_authenticated"
            ON public.tarefas_operacionais
            FOR ALL TO authenticated
            USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ③ Índices (criados retroativamente via migration 030_performance_indexes)
CREATE INDEX IF NOT EXISTS idx_tarefas_status_data_criacao
    ON public.tarefas_operacionais(status, data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_tarefas_data_termino
    ON public.tarefas_operacionais(data_termino)
    WHERE data_termino IS NOT NULL;
