CREATE TABLE IF NOT EXISTS diretorio_ferramentas_predefinidas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE diretorio_ferramentas_predefinidas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'diretorio_ferramentas_predefinidas' AND policyname = 'Enable all for authenticated users'
    ) THEN
        CREATE POLICY "Enable all for authenticated users" ON diretorio_ferramentas_predefinidas FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;
