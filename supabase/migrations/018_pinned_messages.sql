-- Add pinned messages support to chat
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS pinada boolean DEFAULT false;

-- Index for efficient pinned message queries
CREATE INDEX IF NOT EXISTS idx_mensagens_pinada ON mensagens(canal_id, pinada) WHERE pinada = true;
