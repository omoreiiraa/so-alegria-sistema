-- Campo para registrar qual administradora fechou/cadastrou a festa.
-- Nota: aplicado diretamente no projeto em 2026-08-19; este arquivo sincroniza o histórico local.
alter table public.parties
  add column if not exists fechada_por text;

comment on column public.parties.fechada_por is
  'Nome da administradora que fechou/cadastrou a festa. Preenchido manualmente no formulário.';
