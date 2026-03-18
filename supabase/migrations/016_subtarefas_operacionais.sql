-- Migration para Subtarefas Operacionais

CREATE TABLE IF NOT EXISTS public.subtarefas_operacionais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tarefa_id UUID NOT NULL REFERENCES public.tarefas_operacionais(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    concluida BOOLEAN DEFAULT FALSE,
    ordem INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.subtarefas_operacionais ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Autenticados podem ler subtarefas" ON public.subtarefas_operacionais
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem inserir" ON public.subtarefas_operacionais
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar" ON public.subtarefas_operacionais
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem deletar" ON public.subtarefas_operacionais
    FOR DELETE USING (auth.role() = 'authenticated');
