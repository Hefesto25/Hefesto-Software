-- Task Templates para Operacional

CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    descricao TEXT,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_template_subtarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    ordem INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS task_templates
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler templates" ON public.task_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem inserir templates" ON public.task_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar templates" ON public.task_templates
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem deletar templates" ON public.task_templates
    FOR DELETE USING (auth.role() = 'authenticated');

-- RLS task_template_subtarefas
ALTER TABLE public.task_template_subtarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler subtarefas template" ON public.task_template_subtarefas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem inserir subtarefas template" ON public.task_template_subtarefas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar subtarefas template" ON public.task_template_subtarefas
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem deletar subtarefas template" ON public.task_template_subtarefas
    FOR DELETE USING (auth.role() = 'authenticated');

-- Seeds iniciais
INSERT INTO public.task_templates (nome, descricao) VALUES
    ('IA de Atendimento', 'Desenvolvimento e implementação de IA para atendimento ao cliente'),
    ('Desenvolvimento de Site', 'Criação de site completo do zero'),
    ('Automação de Processos', 'Automação de fluxos e processos internos'),
    ('Integração de Sistema', 'Integração entre plataformas e sistemas externos');

-- Subtarefas: IA de Atendimento
WITH t AS (SELECT id FROM public.task_templates WHERE nome = 'IA de Atendimento' LIMIT 1)
INSERT INTO public.task_template_subtarefas (template_id, titulo, ordem)
SELECT t.id, sub.titulo, sub.ordem FROM t,
(VALUES
    ('Levantamento de requisitos e fluxos de atendimento', 1),
    ('Definição da base de conhecimento', 2),
    ('Configuração e treinamento da IA', 3),
    ('Integração com canal de atendimento (WhatsApp/Chat)', 4),
    ('Testes e ajustes de resposta', 5),
    ('Entrega e documentação ao cliente', 6)
) AS sub(titulo, ordem);

-- Subtarefas: Desenvolvimento de Site
WITH t AS (SELECT id FROM public.task_templates WHERE nome = 'Desenvolvimento de Site' LIMIT 1)
INSERT INTO public.task_template_subtarefas (template_id, titulo, ordem)
SELECT t.id, sub.titulo, sub.ordem FROM t,
(VALUES
    ('Briefing e coleta de materiais do cliente', 1),
    ('Definição de layout e aprovação de wireframe', 2),
    ('Desenvolvimento das páginas', 3),
    ('Integração de formulários e integrações', 4),
    ('Otimização SEO básica', 5),
    ('Revisão e ajustes com o cliente', 6),
    ('Publicação e configuração de domínio', 7),
    ('Entrega e treinamento', 8)
) AS sub(titulo, ordem);

-- Subtarefas: Automação de Processos
WITH t AS (SELECT id FROM public.task_templates WHERE nome = 'Automação de Processos' LIMIT 1)
INSERT INTO public.task_template_subtarefas (template_id, titulo, ordem)
SELECT t.id, sub.titulo, sub.ordem FROM t,
(VALUES
    ('Mapeamento do processo atual', 1),
    ('Definição do fluxo automatizado', 2),
    ('Configuração da ferramenta de automação', 3),
    ('Testes e validação do fluxo', 4),
    ('Entrega e documentação', 5)
) AS sub(titulo, ordem);

-- Subtarefas: Integração de Sistema
WITH t AS (SELECT id FROM public.task_templates WHERE nome = 'Integração de Sistema' LIMIT 1)
INSERT INTO public.task_template_subtarefas (template_id, titulo, ordem)
SELECT t.id, sub.titulo, sub.ordem FROM t,
(VALUES
    ('Levantamento das APIs e documentações', 1),
    ('Análise de compatibilidade e requisitos', 2),
    ('Desenvolvimento da integração', 3),
    ('Mapeamento de campos e transformação de dados', 4),
    ('Testes de ponta a ponta', 5),
    ('Deploy e monitoramento inicial', 6),
    ('Documentação técnica', 7)
) AS sub(titulo, ordem);
