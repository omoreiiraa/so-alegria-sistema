-- 0029_tipo_festa_locacao: novo tipo de festa "Locação"
insert into public.party_types (nome) values ('Locação')
on conflict (nome) do update set ativo = true;
