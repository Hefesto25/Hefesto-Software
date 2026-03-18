-- ============================================================
-- HEFESTO IA — Direct Messages (DMs)
-- Migration: 017_direct_messages
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ① Criar tabela de conversas diretas (DM threads)
CREATE TABLE public.dms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_a_id    uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  usuario_b_id    uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  criado_em       timestamptz NOT NULL DEFAULT NOW(),
  ultima_mensagem timestamptz DEFAULT NOW(),
  UNIQUE(usuario_a_id, usuario_b_id),
  CONSTRAINT usuarios_diferentes CHECK (usuario_a_id < usuario_b_id)
);

-- ② Criar tabela de mensagens DM
CREATE TABLE public.dm_mensagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id           uuid NOT NULL REFERENCES public.dms(id) ON DELETE CASCADE,
  autor_id        uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  conteudo        text,
  tipo            text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'arquivo')),
  arquivo_url     text,
  arquivo_nome    text,
  arquivo_tamanho bigint,
  lida            boolean NOT NULL DEFAULT false,
  lida_em         timestamptz,
  deletada        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

-- ③ Indexes para performance
CREATE INDEX idx_dms_usuario_a ON public.dms(usuario_a_id);
CREATE INDEX idx_dms_usuario_b ON public.dms(usuario_b_id);
CREATE INDEX idx_dm_mensagens_dm_id ON public.dm_mensagens(dm_id);
CREATE INDEX idx_dm_mensagens_created_at ON public.dm_mensagens(created_at);
CREATE INDEX idx_dm_mensagens_nao_lidas ON public.dm_mensagens(lida) WHERE NOT lida;

-- ④ RLS — Habilitar
ALTER TABLE public.dms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_mensagens ENABLE ROW LEVEL SECURITY;

-- ⑤ RLS — DMs: só ver conversas próprias
CREATE POLICY "ver_dms" ON public.dms
  FOR SELECT TO authenticated
  USING (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid());

-- Qualquer autenticado pode criar DM
CREATE POLICY "criar_dm" ON public.dms
  FOR INSERT TO authenticated
  WITH CHECK (
    (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid())
    AND usuario_a_id < usuario_b_id
  );

-- Atualizar DM (apenas ultima_mensagem)
CREATE POLICY "atualizar_dm" ON public.dms
  FOR UPDATE TO authenticated
  USING (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid())
  WITH CHECK (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid());

-- ⑥ RLS — DM Mensagens: só ver próprias mensagens
CREATE POLICY "ver_dm_mensagens" ON public.dm_mensagens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dms
      WHERE id = dm_mensagens.dm_id
      AND (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid())
    )
  );

-- Participante pode enviar mensagem DM
CREATE POLICY "enviar_dm_mensagem" ON public.dm_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.dms
      WHERE id = dm_mensagens.dm_id
      AND (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid())
    )
  );

-- Autor pode atualizar sua mensagem (soft delete ou marcar como lida)
CREATE POLICY "atualizar_dm_mensagem" ON public.dm_mensagens
  FOR UPDATE TO authenticated
  USING (
    autor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.dms
      WHERE id = dm_mensagens.dm_id
      AND (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid())
    )
  )
  WITH CHECK (
    (autor_id = auth.uid() AND deletada = true)
    OR (
      EXISTS (
        SELECT 1 FROM public.dms
        WHERE id = dm_mensagens.dm_id
        AND (usuario_a_id = auth.uid() OR usuario_b_id = auth.uid())
      )
      AND lida = true
    )
  );

-- ⑦ Função para obter ou criar DM entre dois usuários
CREATE OR REPLACE FUNCTION public.get_or_create_dm(outro_usuario_id uuid)
RETURNS uuid AS $$
DECLARE
  user_a uuid;
  user_b uuid;
  dm_id uuid;
BEGIN
  user_a := LEAST(auth.uid(), outro_usuario_id);
  user_b := GREATEST(auth.uid(), outro_usuario_id);

  -- Procurar DM existente
  SELECT id INTO dm_id FROM public.dms
  WHERE usuario_a_id = user_a AND usuario_b_id = user_b;

  IF dm_id IS NOT NULL THEN
    RETURN dm_id;
  END IF;

  -- Criar novo DM
  INSERT INTO public.dms (usuario_a_id, usuario_b_id)
  VALUES (user_a, user_b)
  RETURNING id INTO dm_id;

  RETURN dm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ⑧ Habilitar Realtime para DM mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE dm_mensagens;
