CREATE TABLE IF NOT EXISTS diretorio_ferramentas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE diretorio_ferramentas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'diretorio_ferramentas' AND policyname = 'Enable all for authenticated users'
    ) THEN
        CREATE POLICY "Enable all for authenticated users" ON diretorio_ferramentas FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;
