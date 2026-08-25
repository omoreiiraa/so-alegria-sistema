-- 0019_party_party_types_admin_only: alinha a última tabela fora do padrão.
-- As policies vinham da 0011 concedidas ao papel `public` (que inclui anon) e o
-- SELECT liberava qualquer sessão via `auth.uid() is not null`. Sem colaborador
-- logado, isso não faz mais sentido — e duas policies permissivas para a mesma
-- ação ainda custavam uma avaliação extra por linha.

drop policy if exists party_party_types_select      on public.party_party_types;
drop policy if exists party_party_types_admin_write on public.party_party_types;

create policy party_party_types_admin on public.party_party_types
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- FK sem índice de cobertura, apontada pelo advisor.
create index if not exists idx_party_party_types_type
  on public.party_party_types (party_type_id);
