-- Controle de Faturamento (Asaas)

CREATE TABLE IF NOT EXISTS public.asaas_cobranças (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES public.diretorio_clientes(id) ON DELETE SET NULL,
    cliente_nome TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'enviada', 'nf_gerada', 'nf_verificada')),
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE NOT NULL,
    numero_nf TEXT,
    observacoes TEXT,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para filtros frequentes
CREATE INDEX IF NOT EXISTS idx_asaas_cobranças_status ON public.asaas_cobranças(status);
CREATE INDEX IF NOT EXISTS idx_asaas_cobranças_data_vencimento ON public.asaas_cobranças(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_asaas_cobranças_cliente_id ON public.asaas_cobranças(cliente_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_asaas_cobranças_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asaas_cobranças_updated_at
    BEFORE UPDATE ON public.asaas_cobranças
    FOR EACH ROW EXECUTE FUNCTION update_asaas_cobranças_updated_at();

-- RLS
ALTER TABLE public.asaas_cobranças ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler cobranças" ON public.asaas_cobranças
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem inserir cobranças" ON public.asaas_cobranças
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem atualizar cobranças" ON public.asaas_cobranças
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem deletar cobranças" ON public.asaas_cobranças
    FOR DELETE USING (auth.role() = 'authenticated');
