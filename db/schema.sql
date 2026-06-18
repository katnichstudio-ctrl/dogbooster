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

-- เปิด RLS แต่ไม่สร้าง policy ใด ๆ → ไม่มีใครเข้าถึงตรง ๆ ได้
-- มีแต่ service_role key (ฝั่ง server /api เท่านั้น) ที่ bypass RLS ได้
alter table public.users        enable row level security;
alter table public.entitlements enable row level security;
