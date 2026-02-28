-- ============================================================
-- HEFESTO IA — Módulo de Chat
-- Migration: 011_chat_module
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ① Remover tabelas antigas de mock
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;

-- ② Criar tabela de canais
CREATE TABLE public.canais (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  descricao   text,
  tipo        text NOT NULL CHECK (tipo IN ('canal', 'grupo_projeto')),
  criador_id  uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

-- ③ Criar tabela de participantes
CREATE TABLE public.canal_participantes (
  canal_id      uuid REFERENCES public.canais(id) ON DELETE CASCADE,
  usuario_id    uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  adicionado_em timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (canal_id, usuario_id)
);

-- ④ Criar tabela de mensagens
CREATE TABLE public.mensagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id        uuid NOT NULL REFERENCES public.canais(id) ON DELETE CASCADE,
  autor_id        uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  conteudo        text,
  tipo            text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'arquivo')),
  arquivo_url     text,
  arquivo_nome    text,
  arquivo_tamanho bigint,
  resposta_de     uuid REFERENCES public.mensagens(id) ON DELETE SET NULL,
  deletada        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT NOW()
);

-- ⑤ Indexes para performance
CREATE INDEX idx_mensagens_canal_id ON public.mensagens(canal_id);
CREATE INDEX idx_mensagens_created_at ON public.mensagens(created_at);
CREATE INDEX idx_canal_participantes_usuario ON public.canal_participantes(usuario_id);

-- ⑥ RLS — Habilitar
ALTER TABLE public.canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canal_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

-- ⑦ RLS — Canais: só ver canais em que participa
CREATE POLICY "ver_canais_proprios" ON public.canais
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.canal_participantes
      WHERE canal_id = canais.id AND usuario_id = auth.uid()
    )
  );

-- Qualquer autenticado pode criar canal
CREATE POLICY "criar_canal" ON public.canais
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Criador ou admin pode atualizar canal
CREATE POLICY "atualizar_canal" ON public.canais
  FOR UPDATE TO authenticated
  USING (criador_id = auth.uid() OR public.is_admin());

-- Criador ou admin pode excluir canal
CREATE POLICY "excluir_canal" ON public.canais
  FOR DELETE TO authenticated
  USING (criador_id = auth.uid() OR public.is_admin());

-- ⑧ RLS — Participantes: membros podem ver participantes do canal
CREATE POLICY "ver_participantes" ON public.canal_participantes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.canal_participantes cp
      WHERE cp.canal_id = canal_participantes.canal_id AND cp.usuario_id = auth.uid()
    )
  );

-- Autenticados podem adicionar participantes (ao criar canal ou editar)
CREATE POLICY "adicionar_participante" ON public.canal_participantes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Criador ou admin pode remover participantes
CREATE POLICY "remover_participante" ON public.canal_participantes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.canais
      WHERE id = canal_participantes.canal_id
      AND (criador_id = auth.uid() OR public.is_admin())
    )
    OR usuario_id = auth.uid() -- pode sair do canal
  );

-- ⑨ RLS — Mensagens: só ver mensagens de canais em que participa
CREATE POLICY "ver_mensagens" ON public.mensagens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.canal_participantes
      WHERE canal_id = mensagens.canal_id AND usuario_id = auth.uid()
    )
  );

-- Participante pode enviar mensagem no canal
CREATE POLICY "enviar_mensagem" ON public.mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.canal_participantes
      WHERE canal_id = mensagens.canal_id AND usuario_id = auth.uid()
    )
  );

-- Autor pode atualizar sua mensagem (soft delete)
CREATE POLICY "atualizar_mensagem" ON public.mensagens
  FOR UPDATE TO authenticated
  USING (autor_id = auth.uid());

-- ⑩ Função de limpeza de mensagens expiradas (60 dias)
CREATE OR REPLACE FUNCTION public.limpar_mensagens_expiradas()
RETURNS void AS $$
BEGIN
  DELETE FROM public.mensagens
  WHERE created_at < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ⑪ Habilitar Realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;

-- ⑫ Criar canal #geral padrão com todos os usuários
DO $$
DECLARE
  canal_geral_id uuid;
  u_id uuid;
BEGIN
  INSERT INTO public.canais (nome, descricao, tipo)
  VALUES ('geral', 'Canal geral da equipe', 'canal')
  RETURNING id INTO canal_geral_id;

  FOR u_id IN SELECT id FROM public.usuarios LOOP
    INSERT INTO public.canal_participantes (canal_id, usuario_id)
    VALUES (canal_geral_id, u_id);
  END LOOP;
END $$;
