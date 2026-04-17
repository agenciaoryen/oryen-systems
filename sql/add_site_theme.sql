-- Adiciona coluna site_theme na tabela site_settings
-- Permite que o dono do site escolha tema dark ou light para o site público
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS site_theme text DEFAULT 'dark';
