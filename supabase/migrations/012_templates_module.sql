-- ============================================
-- Templates Module — Tables, RLS, Storage
-- ============================================

-- 1. Categorias
CREATE TABLE IF NOT EXISTS public.template_categorias (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  tipo       text NOT NULL CHECK (tipo IN ('modelo', 'site')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- 2. Modelos de Software
CREATE TABLE IF NOT EXISTS public.template_modelos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  descricao        text,
  categoria_id     uuid REFERENCES public.template_categorias(id) ON DELETE SET NULL,
  imagem_url       text,
  url_demo         text,
  url_repositorio  text,
  tecnologias      text[] DEFAULT '{}',
  status           text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'em_desenvolvimento', 'arquivado')),
  responsavel_id   uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT NOW()
);

-- 3. Sites Úteis
CREATE TABLE IF NOT EXISTS public.template_sites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  url          text NOT NULL,
  descricao    text,
  categoria_id uuid REFERENCES public.template_categorias(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.template_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sites ENABLE ROW LEVEL SECURITY;

-- SELECT: todos autenticados
CREATE POLICY "template_categorias_select" ON public.template_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_modelos_select" ON public.template_modelos FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_sites_select" ON public.template_sites FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE: todos autenticados (controle admin no frontend)
CREATE POLICY "template_categorias_insert" ON public.template_categorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "template_categorias_update" ON public.template_categorias FOR UPDATE TO authenticated USING (true);
CREATE POLICY "template_categorias_delete" ON public.template_categorias FOR DELETE TO authenticated USING (true);

CREATE POLICY "template_modelos_insert" ON public.template_modelos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "template_modelos_update" ON public.template_modelos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "template_modelos_delete" ON public.template_modelos FOR DELETE TO authenticated USING (true);

CREATE POLICY "template_sites_insert" ON public.template_sites FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "template_sites_update" ON public.template_sites FOR UPDATE TO authenticated USING (true);
CREATE POLICY "template_sites_delete" ON public.template_sites FOR DELETE TO authenticated USING (true);

-- ============================================
-- Storage bucket for template images
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('template-images', 'template-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated can upload, public can read
CREATE POLICY "template_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'template-images');
CREATE POLICY "template_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'template-images');
CREATE POLICY "template_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'template-images');
CREATE POLICY "template_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'template-images');

-- ============================================
-- Seed default categories
-- ============================================
INSERT INTO public.template_categorias (nome, tipo) VALUES
  ('CRM', 'modelo'),
  ('Financeiro', 'modelo'),
  ('E-commerce', 'modelo'),
  ('Landing Page', 'modelo'),
  ('Dashboard', 'modelo'),
  ('UX/UI', 'site'),
  ('Inteligências Artificiais', 'site'),
  ('Design', 'site'),
  ('Produtividade', 'site'),
  ('Anotações', 'site'),
  ('Desenvolvimento', 'site'),
  ('Outros', 'site');

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';
