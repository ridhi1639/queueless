-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,

  -- queue token (one counter per shop per day, assigned by server code in Phase 7)
  token_date date not null default current_date,
  token_number int not null,

  customer_name text,
  customer_phone text,
  notes text,

  -- preparation status and payment status are SEPARATE on purpose
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'failed', 'refunded')),
  payment_method text not null default 'counter'
    check (payment_method in ('counter', 'online')),

  -- money, frozen at order time (all in paise)
  subtotal_paise int not null check (subtotal_paise >= 0),
  tax_name text,
  tax_breakdown jsonb not null default '[]',
  tax_total_paise int not null default 0 check (tax_total_paise >= 0),
  total_paise int not null check (total_paise >= 0),
  check (total_paise = subtotal_paise + tax_total_paise),

  -- snapshots so old receipts never change (used in Phase 11)
  business_name_snapshot text not null,
  tax_registration_no_snapshot text,

  -- duplicate-submit protection: same key from the same shop is rejected
  idempotency_key text not null,

  accepted_at timestamptz,    -- queue order is based on this
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (business_id, token_date, token_number),
  unique (business_id, idempotency_key)
);

create index orders_business_status_idx on public.orders(business_id, status);
create index orders_business_created_idx on public.orders(business_id, created_at desc);

alter table public.orders enable row level security;

-- Admin can READ orders of their own business (needed for the live board).
-- There are deliberately NO insert/update/delete policies:
-- all writes go through server code, never straight from the browser.
create policy "admin read own orders"
  on public.orders for select
  to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ));

-- ============ ORDER ITEMS ============
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,

  -- snapshots: the name and price at the moment of ordering
  name_snapshot text not null,
  price_paise_snapshot int not null check (price_paise_snapshot >= 0),
  quantity int not null check (quantity > 0),
  line_total_paise int not null check (line_total_paise >= 0),
  check (line_total_paise = price_paise_snapshot * quantity)
);

create index order_items_order_idx on public.order_items(order_id);

alter table public.order_items enable row level security;

create policy "admin read own order items"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.admin_id = (select auth.uid())
  ));

-- ============ TOKEN COUNTERS ============
-- Keeps the "last token used" per shop per day. Server-only table.
create table public.order_token_counters (
  business_id uuid not null references public.businesses(id) on delete cascade,
  token_date date not null,
  last_token int not null default 0,
  primary key (business_id, token_date)
);

-- RLS on with NO policies = completely locked from the browser.
alter table public.order_token_counters enable row level security;