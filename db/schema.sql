-- DogBooster — Supabase schema สำหรับระบบสิทธิเข้าเรียน
-- รันใน Supabase Dashboard → SQL Editor → New query → Run

-- ผู้ใช้ (ตัวตน = LINE userId จาก LIFF)
create table if not exists public.users (
  line_user_id text primary key,
  display_name text,
  picture_url  text,
  created_at   timestamptz default now(),
  last_login   timestamptz default now()
);

-- สิทธิเข้าเรียน: 1 แถว = user 1 คนเข้าได้ 1 คอร์ส
create table if not exists public.entitlements (
  line_user_id text not null references public.users(line_user_id) on delete cascade,
  course_code  text not null,
  granted_at   timestamptz default now(),
  granted_by   text,
  primary key (line_user_id, course_code)
);

create index if not exists entitlements_user_idx on public.entitlements(line_user_id);

-- ราคาและค่าคอมมิชชันของแต่ละคลาส (แสดงให้ลูกค้าเห็นตอนลงทะเบียน)
create table if not exists public.class_pricing (
  id                     uuid primary key default gen_random_uuid(),
  label                  text not null,
  price                  numeric(10, 2) not null default 0,
  partner_commission_baht numeric(10, 2) not null default 0,
  sale_commission_type   text not null default 'percent' check (sale_commission_type in ('percent', 'amount')),
  sale_commission_value  numeric(10, 2) not null default 0,
  is_open                boolean not null default true,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- สตาฟ/พาร์ทเนอร์ที่มีรหัสค่าคอมเป็นของตัวเอง (ลูกค้าใส่รหัสนี้ตอนลงทะเบียนเพื่อผูกยอดขาย)
create table if not exists public.staff (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  staff_code       text not null unique,
  bank_name        text,
  bank_account_no  text,
  created_at       timestamptz default now()
);

-- ใบสมัครจากหน้า /register.html (สาธารณะ) — เก็บราคา/ชื่อคลาส ณ ตอนสมัครไว้ (snapshot)
-- เผื่อราคาภายหลังถูกแก้ไข ไม่ให้ประวัติเก่าเปลี่ยนตาม
create table if not exists public.registrations (
  id                uuid primary key default gen_random_uuid(),
  class_pricing_id  uuid references public.class_pricing(id) on delete set null,
  class_label       text not null,
  price             numeric(10, 2) not null default 0,
  customer_name     text not null,
  customer_phone    text not null,
  staff_code        text,
  staff_id          uuid references public.staff(id) on delete set null,
  status            text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at        timestamptz default now()
);

create index if not exists registrations_created_idx on public.registrations(created_at desc);

-- เปิด RLS แต่ไม่สร้าง policy ใด ๆ → ไม่มีใครเข้าถึงตรง ๆ ได้
-- มีแต่ service_role key (ฝั่ง server /api เท่านั้น) ที่ bypass RLS ได้
alter table public.users         enable row level security;
alter table public.entitlements  enable row level security;
alter table public.class_pricing enable row level security;
alter table public.staff         enable row level security;
alter table public.registrations enable row level security;
