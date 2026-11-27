-- ImobiAires — Supabase Schema & RLS

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  phone text default '',
  email text default '',
  status text not null default 'active',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.agency_members (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member', 'admin')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create table if not exists public.properties (
  id text primary key,
  title text not null,
  type text not null check (type in ('Terreno', 'Casa', 'Apartamento', 'Comercial')),
  district text not null,
  city text not null default 'Venâncio Aires',
  state text not null default 'RS',
  lat double precision not null,
  lng double precision not null,
  points jsonb not null default '[]'::jsonb,
  area double precision not null check (area > 0),
  front double precision not null default 0,
  depth double precision not null default 0,
  beds integer not null default 0,
  deal text not null check (deal in ('Venda', 'Aluguel')),
  description text not null default '',
  photo_url text not null default '',
  status text not null default 'published',
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  deal_type text not null check (deal_type in ('Venda', 'Aluguel')),
  price numeric not null check (price > 0),
  status text not null default 'published',
  created_at timestamptz not null default now(),
  unique (property_id, agency_id)
);

-- Admin helper
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce((auth.jwt() ->> 'email') = 'fabiano.schmits@outlook.com', false)
  or exists (
    select 1 from public.agency_members
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Enable RLS
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.properties enable row level security;
alter table public.offers enable row level security;

-- Agencies policies
drop policy if exists "Public read active agencies" on public.agencies;
create policy "Public read active agencies" on public.agencies
  for select using (status = 'active' or public.is_admin());

drop policy if exists "Authenticated create agency" on public.agencies;
create policy "Authenticated create agency" on public.agencies
  for insert to authenticated with check (true);

drop policy if exists "Members or admin update agency" on public.agencies;
create policy "Members or admin update agency" on public.agencies
  for update to authenticated using (
    public.is_admin() or exists (
      select 1 from public.agency_members m where m.agency_id = id and m.user_id = auth.uid()
    )
  );

-- Agency members policies
drop policy if exists "Read own memberships or admin" on public.agency_members;
create policy "Read own memberships or admin" on public.agency_members
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Insert own membership or admin" on public.agency_members;
create policy "Insert own membership or admin" on public.agency_members
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());

-- Properties policies
drop policy if exists "Public read published properties" on public.properties;
create policy "Public read published properties" on public.properties
  for select using (status = 'published' or public.is_admin() or created_by = auth.uid());

drop policy if exists "Authenticated insert property" on public.properties;
create policy "Authenticated insert property" on public.properties
  for insert to authenticated with check (auth.uid() = created_by or public.is_admin());

drop policy if exists "Owner or admin update property" on public.properties;
create policy "Owner or admin update property" on public.properties
  for update to authenticated using (created_by = auth.uid() or public.is_admin());

drop policy if exists "Owner or admin delete property" on public.properties;
create policy "Owner or admin delete property" on public.properties
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- Offers policies
drop policy if exists "Public read published offers" on public.offers;
create policy "Public read published offers" on public.offers
  for select using (status = 'published' or public.is_admin());

drop policy if exists "Agency member or admin insert offer" on public.offers;
create policy "Agency member or admin insert offer" on public.offers
  for insert to authenticated with check (
    public.is_admin() or exists (
      select 1 from public.agency_members m where m.agency_id = agency_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Agency member or admin update offer" on public.offers;
create policy "Agency member or admin update offer" on public.offers
  for update to authenticated using (
    public.is_admin() or exists (
      select 1 from public.agency_members m where m.agency_id = agency_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Agency member or admin delete offer" on public.offers;
create policy "Agency member or admin delete offer" on public.offers
  for delete to authenticated using (
    public.is_admin() or exists (
      select 1 from public.agency_members m where m.agency_id = agency_id and m.user_id = auth.uid()
    )
  );

-- Storage bucket for property photos
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read property photos" on storage.objects;
create policy "Public read property photos" on storage.objects
  for select using (bucket_id = 'property-photos');

drop policy if exists "Authenticated upload property photos" on storage.objects;
create policy "Authenticated upload property photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'property-photos');

drop policy if exists "Authenticated delete property photos" on storage.objects;
create policy "Authenticated delete property photos" on storage.objects
  for delete to authenticated using (bucket_id = 'property-photos');

