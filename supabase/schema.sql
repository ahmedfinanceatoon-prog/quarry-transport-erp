-- ============================================================
-- نظام إدارة نقليات البحص — إعداد قاعدة البيانات في Supabase
-- الصق هذا الملف كاملاً في SQL Editor داخل مشروع Supabase واضغط Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- الأسطول ----------
create table if not exists trucks (
  id uuid primary key default gen_random_uuid(),
  number text,
  driver text,
  status text default 'نشط',
  created_at timestamptz default now()
);

-- ---------- العملاء ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  opening_balance numeric default 0,
  created_at timestamptz default now()
);

-- ---------- الموردين ----------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ---------- الأصناف ----------
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text default 'طن',
  created_at timestamptz default now()
);

-- لو الجدول أُنشئ سابقًا (قبل هذا التحديث) بدون قيد unique على الاسم، نضيفه الآن بأمان
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'items_name_key'
  ) then
    alter table items add constraint items_name_key unique (name);
  end if;
exception when others then
  -- لو فيه أصناف مكررة بالفعل، تجاهل الخطأ (احذف المكرر يدويًا من Table Editor إذا رغبت)
  null;
end $$;

-- ---------- الرحلات (سجل الردود) ----------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  date date,
  supplier text,
  truck text,
  driver text,
  ticket_no text,
  net_weight numeric,
  price numeric,
  value_ex_vat numeric,
  value_inc_vat numeric,
  receipt_date date,
  receipt_no text,
  customer_receipt_no text,
  item text,
  client text,
  delivered_qty numeric,
  diff_qty numeric,
  trip_order numeric default 1,
  trip_value numeric default 0,
  unit text default 'طن',
  created_at timestamptz default now()
);

-- ============================================================
-- الصلاحيات (RLS)
-- ملاحظة مهمة: هذا الموقع بدون تسجيل دخول، فأي شخص يملك رابط
-- الموقع (ومفتاح anon المُضمَّن فيه) يقدر يقرأ ويعدّل البيانات.
-- هذا مناسب لأداة داخلية صغيرة، لكن لا يصلح إذا احتجت صلاحيات
-- مستخدمين مختلفة أو حماية أقوى — أخبرني إذا احتجت ذلك لاحقًا.
-- ============================================================

alter table trucks enable row level security;
alter table clients enable row level security;
alter table suppliers enable row level security;
alter table items enable row level security;
alter table trips enable row level security;

create policy "public full access trucks" on trucks for all using (true) with check (true);
create policy "public full access clients" on clients for all using (true) with check (true);
create policy "public full access suppliers" on suppliers for all using (true) with check (true);
create policy "public full access items" on items for all using (true) with check (true);
create policy "public full access trips" on trips for all using (true) with check (true);

-- ============================================================
-- بيانات ابتدائية: أصناف البحص الشائعة
-- ============================================================
insert into items (name, unit) values
  ('0', 'طن'),
  ('3/8', 'طن'),
  ('3/4', 'طن')
on conflict do nothing;
