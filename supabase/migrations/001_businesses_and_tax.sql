-- ============ BUSINESSES ============
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  country_code text not null,
  region_code text,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index businesses_admin_id_idx on public.businesses(admin_id);

alter table public.businesses enable row level security;

-- Anyone (customers) can read active shops
create policy "public read active businesses"
  on public.businesses for select
  using (is_active = true);

-- Admin can read their own business even if inactive
create policy "admin read own business"
  on public.businesses for select
  to authenticated
  using (admin_id = (select auth.uid()));

create policy "admin insert own business"
  on public.businesses for insert
  to authenticated
  with check (admin_id = (select auth.uid()));

create policy "admin update own business"
  on public.businesses for update
  to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));

create policy "admin delete own business"
  on public.businesses for delete
  to authenticated
  using (admin_id = (select auth.uid()));

-- ============ TAX RULES (defaults you maintain) ============
create table public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  region_code text,
  tax_name text not null,
  components jsonb not null,
  prices_include_tax boolean not null default false,
  effective_from date not null default current_date
);

alter table public.tax_rules enable row level security;

-- Everyone can read; nobody can write from the app (you edit in the dashboard)
create policy "public read tax rules"
  on public.tax_rules for select
  using (true);

-- ============ BUSINESS TAX SETTINGS ============
create table public.business_tax_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  country_code text not null,
  region_code text,
  tax_name text not null,
  tax_registration_no text,
  components jsonb not null,
  prices_include_tax boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.business_tax_settings enable row level security;

-- Tax details appear on bills anyway, so customers may read them for active shops
create policy "public read tax settings"
  on public.business_tax_settings for select
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.is_active = true
  ));

create policy "admin manage own tax settings"
  on public.business_tax_settings for all
  to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ));

-- ============ SEED: default tax rules ============
-- Example rates only. Verify against official sources before real use.
insert into public.tax_rules (country_code, tax_name, components, prices_include_tax) values
  ('IN', 'GST', '[{"name":"CGST","rate":2.5},{"name":"SGST","rate":2.5}]', false),
  ('AE', 'VAT', '[{"name":"VAT","rate":5}]', true),
  ('GB', 'VAT', '[{"name":"VAT","rate":20}]', true);