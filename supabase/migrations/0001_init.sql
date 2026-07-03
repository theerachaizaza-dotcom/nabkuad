-- =====================================================================
-- NabKuad (นับขวด) — Beverage Stock Count
-- Migration 0001: initial schema
--
-- Core idea: mobile ยิง raw data (full_bottles + leftover_ml) เข้ามา
-- ระบบ snapshot capacity ณ ตอนนับ แล้วคำนวณ net_bottles อัตโนมัติ
-- เพื่อให้ยอดเก่าไม่เพี้ยนถ้า admin แก้ capacity ของสินค้าในภายหลัง
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- helper: updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles  (ต่อยอดจาก Supabase Auth: auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('admin','staff')),
  location_id uuid,                       -- staff ผูกกับ location ไหน (FK เพิ่มด้านล่าง)
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- categories  (หมวดหมู่เครื่องดื่ม)
-- ---------------------------------------------------------------------
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_categories_updated before update on categories
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- locations  (จุดที่นับสต็อก)
-- ---------------------------------------------------------------------
create table locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  code       text unique,                 -- MAIN, SVC, TER, ROOF, BOAT
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ผูก FK ของ profiles.location_id หลังจากมีตาราง locations แล้ว
alter table profiles
  add constraint profiles_location_fk
  foreign key (location_id) references locations(id) on delete set null;

-- ---------------------------------------------------------------------
-- products  (รายการเครื่องดื่ม + ขนาดความจุ)
-- ---------------------------------------------------------------------
create table products (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references categories(id) on delete restrict,
  name           text not null,
  sku            text unique,
  capacity_ml    integer not null check (capacity_ml > 0),  -- ความจุขวดเต็ม (ML)
  count_mode     text not null default 'fractional'
                   check (count_mode in ('fractional','unit')),
                   -- fractional = ขวด + เศษ ML (เหล้า/ไวน์/ไซรัป)
                   -- unit       = นับเป็นชิ้น/ลัง (เบียร์/น้ำอัดลม/ซิการ์/ชา)
                   --              -> mobile ซ่อนช่อง ML, leftover_ml = 0 เสมอ
  units_per_pack integer,                                   -- ลัง เช่น เบียร์ 24 (optional)
  price_per_unit numeric(12,2),                             -- ราคาต่อขวด/หน่วย (บาท) - null ได้
  unit           text not null default 'bottle',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_products_category on products(category_id);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- count_sessions  (รอบการนับ 1 รอบ = 1 session)
-- ---------------------------------------------------------------------
create table count_sessions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,               -- เช่น "Stock Count 2026-07-01"
  count_date date not null default current_date,
  status     text not null default 'open' check (status in ('open','closed')),
  note       text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at  timestamptz
);
create index idx_sessions_status on count_sessions(status);

-- ---------------------------------------------------------------------
-- location_submissions  (สถานะการส่งยอดของแต่ละ location ในแต่ละ session)
--   ใช้ตอบคำถาม dashboard: จุดไหน submit แล้ว / ยังไม่ส่ง
-- ---------------------------------------------------------------------
create table location_submissions (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references count_sessions(id) on delete cascade,
  location_id  uuid not null references locations(id) on delete restrict,
  status       text not null default 'pending' check (status in ('pending','submitted')),
  submitted_at timestamptz,
  submitted_by uuid references profiles(id) on delete set null,
  unique (session_id, location_id)
);
create index idx_submissions_session on location_submissions(session_id);

-- ---------------------------------------------------------------------
-- count_lines  (raw data + ยอดสุทธิที่คำนวณอัตโนมัติ)
--   net_bottles = full_bottles + (leftover_ml / capacity_ml_snapshot)
--   *** capacity_ml_snapshot สำคัญมาก: ก็อปมาจาก products.capacity_ml
--       ตอนบันทึก เพื่อ freeze ค่าไว้ ยอดเก่าจะไม่เปลี่ยนถ้าแก้ product ทีหลัง
-- ---------------------------------------------------------------------
create table count_lines (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references count_sessions(id) on delete cascade,
  location_id          uuid not null references locations(id) on delete restrict,
  product_id           uuid not null references products(id) on delete restrict,
  full_bottles         integer not null default 0 check (full_bottles >= 0),
  leftover_ml          integer not null default 0 check (leftover_ml >= 0),
  capacity_ml_snapshot integer not null check (capacity_ml_snapshot > 0),
  net_bottles          numeric(12,3) generated always as (
                         full_bottles + (leftover_ml::numeric / capacity_ml_snapshot)
                       ) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (session_id, location_id, product_id)
);
create index idx_lines_session_location on count_lines(session_id, location_id);
create trigger trg_lines_updated before update on count_lines
  for each row execute function set_updated_at();

-- =====================================================================
-- Row Level Security (v1 — permissive, ค่อยรัดให้แน่นทีหลัง)
-- =====================================================================
alter table profiles             enable row level security;
alter table categories           enable row level security;
alter table locations            enable row level security;
alter table products             enable row level security;
alter table count_sessions       enable row level security;
alter table location_submissions enable row level security;
alter table count_lines          enable row level security;

create or replace function is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- profiles: เห็นตัวเอง / admin เห็นทั้งหมด
create policy "profiles read"  on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles write" on profiles for all    using (is_admin()) with check (is_admin());

-- master data: authenticated อ่านได้ทุกคน / เขียนได้เฉพาะ admin
create policy "categories read"  on categories for select using (auth.role() = 'authenticated');
create policy "categories write" on categories for all    using (is_admin()) with check (is_admin());
create policy "locations read"   on locations  for select using (auth.role() = 'authenticated');
create policy "locations write"  on locations  for all    using (is_admin()) with check (is_admin());
create policy "products read"    on products   for select using (auth.role() = 'authenticated');
create policy "products write"   on products   for all    using (is_admin()) with check (is_admin());

-- sessions: authenticated อ่าน / admin จัดการ
create policy "sessions read"  on count_sessions for select using (auth.role() = 'authenticated');
create policy "sessions write" on count_sessions for all    using (is_admin()) with check (is_admin());

-- submissions + lines: authenticated อ่าน/เขียนได้ (mobile ต้องยิงเข้ามาได้)
--   TODO: รัดให้ staff เขียนได้เฉพาะ location ของตัวเอง โดยเทียบกับ profiles.location_id
create policy "submissions read"   on location_submissions for select using (auth.role() = 'authenticated');
create policy "submissions insert" on location_submissions for insert with check (auth.role() = 'authenticated');
create policy "submissions update" on location_submissions for update using (auth.role() = 'authenticated');

create policy "lines read"   on count_lines for select using (auth.role() = 'authenticated');
create policy "lines insert" on count_lines for insert with check (auth.role() = 'authenticated');
create policy "lines update" on count_lines for update using (auth.role() = 'authenticated');
