-- Adicionar colunas em deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS data_retorno DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS motivo_perda TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS data_entrada_etapa TIMESTAMP DEFAULT NOW();

-- Adicionar colunas em diretorio_clientes
ALTER TABLE diretorio_clientes ADD COLUMN IF NOT EXISTS cliente_crm_id UUID REFERENCES clients(id);
ALTER TABLE diretorio_clientes ADD COLUMN IF NOT EXISTS sincronizado_em TIMESTAMP;
