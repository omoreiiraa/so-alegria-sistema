-- 0022_contrato_do_evento: guarda o orçamento devolvido pelo cliente.
--
-- O contrato não é guardado: ele é o orçamento devolvido mais a página de dados
-- da empresa, montada na hora. Guardar o PDF pronto só criaria uma cópia que
-- envelhece quando os dados da festa mudam. Ver ADR-0019.

alter table public.parties
  add column if not exists orcamento_assinado_path text;

comment on column public.parties.orcamento_assinado_path is
  'Caminho no bucket contratos do orçamento preenchido/assinado devolvido pelo cliente.';

-- Bucket privado: o orçamento devolvido tem dado pessoal do contratante.
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

create policy "contratos_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'contratos' and public.is_admin())
  with check (bucket_id = 'contratos' and public.is_admin());
