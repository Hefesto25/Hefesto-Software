-- ============================================================
-- HEFESTO IA — Correção de Carga de Arquivos do Chat e Deleção de Módulo
-- Migration: 012_chat_files_bucket_and_policies
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ① Criar o bucket de storage "chat-files"
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- ② Políticas de leitura/escrita para o bucket "chat-files"
CREATE POLICY "Visualização pública de arquivos de chat" ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Upload de arquivos de chat para autenticados" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Deleção de arquivos próprios" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files' AND (auth.uid() = owner OR public.is_admin()));

CREATE POLICY "Acesso de update aos arquivos do chat" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-files' AND owner = auth.uid());

-- ③ Correção do Delete CASCADE para canais (permite que canais removam mensagens)
-- A falta dessa política impedia a exclusão dos canais com histórico de mensagens.
CREATE POLICY "excluir_mensagem" ON public.mensagens
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.canais
    WHERE id = mensagens.canal_id
    AND (criador_id = auth.uid() OR public.is_admin())
  )
);
