-- 0006_seed_and_storage: tipos de festa iniciais + bucket de fotos de estoque
-- Ver docs/03-modelo-de-dados.md §7.2 e docs/04-seguranca-rls-lgpd.md

insert into public.party_types (nome) values
  ('Recreação Básica'),
  ('Discoteca Básica'),
  ('Discoteca Completa'),
  ('DJ'),
  ('Camarim'),
  ('Oficina')
on conflict (nome) do nothing;

-- Bucket privado para fotos do estoque (leitura via signed URL; escrita admin-only)
insert into storage.buckets (id, name, public)
values ('estoque', 'estoque', false)
on conflict (id) do nothing;

create policy "estoque_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'estoque' and public.is_admin())
  with check (bucket_id = 'estoque' and public.is_admin());
