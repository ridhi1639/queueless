-- ============ MENU CATEGORIES ============
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create index menu_categories_business_idx on public.menu_categories(business_id);

alter table public.menu_categories enable row level security;

-- Customers can read categories of active shops
create policy "public read categories"
  on public.menu_categories for select
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.is_active = true
  ));

-- Admin can do everything on their own categories
create policy "admin manage own categories"
  on public.menu_categories for all
  to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ));

-- ============ MENU ITEMS ============
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid,
  name text not null,
  description text,
  price_paise int not null check (price_paise >= 0),
  image_path text,                         -- path in Supabase Storage (Phase 5)
  is_available boolean not null default true,   -- in stock right now
  is_published boolean not null default true,   -- false = AI-extracted, not yet confirmed
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- category must belong to the same business
  foreign key (category_id, business_id)
    references public.menu_categories(id, business_id)
    on delete set null (category_id)
);

create index menu_items_business_idx on public.menu_items(business_id);
create index menu_items_category_idx on public.menu_items(category_id);

alter table public.menu_items enable row level security;

-- Customers only see confirmed items of active shops
create policy "public read published items"
  on public.menu_items for select
  using (
    is_published = true
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.is_active = true
    )
  );

-- Admin can do everything on their own items (including unpublished drafts)
create policy "admin manage own items"
  on public.menu_items for all
  to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ));