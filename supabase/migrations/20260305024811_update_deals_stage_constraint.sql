ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_stage_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_stage_check 
  CHECK (stage = ANY (ARRAY['prospeccao'::text, 'diagnostico'::text, 'negociacao'::text, 'fechado'::text, 'perdido'::text]));

-- Insert seed data for testing if not exists
INSERT INTO public.deals (id, title, company, value, stage, assignee, assignee_color, date, probability, origem)
SELECT gen_random_uuid(), 'Desenvolvimento de E-commerce', 'Tech Store', 150000, 'prospeccao', 'Marcel Sgarioni', '#3B82F6', CURRENT_DATE, 20, 'Indicação'
WHERE NOT EXISTS (SELECT 1 FROM public.deals WHERE company = 'Tech Store');

INSERT INTO public.deals (id, title, company, value, stage, assignee, assignee_color, date, probability, origem)
SELECT gen_random_uuid(), 'Implementação de CRM', 'Vendas SA', 85000, 'diagnostico', 'Marcel Sgarioni', '#10B981', CURRENT_DATE, 50, 'Outbound'
WHERE NOT EXISTS (SELECT 1 FROM public.deals WHERE company = 'Vendas SA');

INSERT INTO public.deals (id, title, company, value, stage, assignee, assignee_color, date, probability, origem)
SELECT gen_random_uuid(), 'Automação de Marketing', 'Digital Marketing', 45000, 'prospeccao', 'Marcel Sgarioni', '#F59E0B', CURRENT_DATE, 80, 'Inbound'
WHERE NOT EXISTS (SELECT 1 FROM public.deals WHERE company = 'Digital Marketing');
