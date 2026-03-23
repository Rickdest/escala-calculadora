
create table public.ads_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  nome_produto_csv text not null,
  shopee_product_id text,
  impressoes integer default 0,
  cliques integer default 0,
  ctr numeric(5,2) default 0,
  conversoes integer default 0,
  taxa_conversao numeric(5,2) default 0,
  itens_vendidos integer default 0,
  gmv numeric(10,2) default 0,
  despesas numeric(10,2) default 0,
  roas numeric(6,2) default 0,
  acos numeric(6,2) default 0,
  roas_direto numeric(6,2) default 0,
  acos_direto numeric(6,2) default 0,
  gmv_direto numeric(10,2) default 0,
  custo_por_conversao numeric(10,2) default 0,
  metodo_lance text,
  status_anuncio text,
  impressoes_produto integer,
  cliques_produto integer,
  posicao_media numeric(5,1),
  posicao_importada boolean default false,
  roas_empate numeric(6,2),
  margem_contribuicao numeric(5,2),
  classificacao text,
  periodo_inicio date,
  periodo_fim date,
  importado_em timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

alter table public.ads_data enable row level security;

create policy "Users can select own ads data"
  on public.ads_data for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own ads data"
  on public.ads_data for insert to authenticated
  with check (auth.uid() = user_id and has_active_subscription());

create policy "Users can update own ads data"
  on public.ads_data for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own ads data"
  on public.ads_data for delete to authenticated
  using (auth.uid() = user_id);
