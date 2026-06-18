# DogBooster

เว็บแอป (มือถือ) สำหรับแบบทดสอบบุคลิกสุนัข + โรงเรียนฝึกสุนัขแบบ choice-based
หน้าเว็บเป็น static HTML + LINE Login (LIFF) และมีระบบจัดการสิทธิเข้าเรียนด้วย
Supabase + Vercel serverless functions

## หน้าหลัก (static)
| ไฟล์ | หน้าจอ |
|---|---|
| `index.html` | เข้าสู่ระบบ (LINE Login) |
| `onboarding.html` | กรอกโปรไฟล์สุนัข + แบบประเมิน → ผลบุคลิก |
| `learning-path.html` | เส้นทางการเรียน |
| `learning-options.html` | ตัวเลือกการเรียน |
| `school.html` | โรงเรียน/สถาบันฝึก |
| `type-detail.html?type=CODE` | รายละเอียดบุคลิก (16 ไทป์ data-driven) |
| `result-style-options.html` | รูปแบบแสดงผลบุคลิก |
| `admin.html` | จัดการสิทธิเข้าเรียน (แอดมิน) |

## LINE Login (LIFF)
ตั้งค่า `LIFF_ID` ใน `index.html` — Scope ที่ต้องเปิดใน LINE Login channel: `profile`, `openid`

## ระบบจัดการสิทธิเข้าเรียน
- **ตัวตนผู้ใช้** = LINE userId (จาก LIFF)
- **ฐานข้อมูล** = Supabase (ตาราง `users`, `entitlements`)
- **ทุกการเข้าถึง DB ผ่าน `/api`** (Vercel serverless) ด้วย service-role key → client ไม่แตะ DB ตรง
- **แอดมิน** จัดการสิทธิที่ `admin.html`

### ตั้งค่า
1. รัน `db/schema.sql` ใน Supabase (SQL Editor)
2. ตั้ง Environment Variables ใน Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret)
   - `LINE_CHANNEL_ID` (เลขนำหน้า LIFF ID)
   - `ADMIN_TOKEN` (รหัสลับเข้าหน้าแอดมิน)
3. **Redeploy** หลังตั้ง env vars

### API
| Endpoint | ใช้ทำอะไร |
|---|---|
| `POST /api/me` | ตรวจ LINE id token → upsert ผู้ใช้ → คืนสิทธิที่มี |
| `GET /api/admin-users` | (แอดมิน) รายชื่อผู้ใช้ + สิทธิ + แคตตาล็อกคอร์ส |
| `POST /api/admin-grant` | (แอดมิน) ให้/ถอนสิทธิคอร์สของผู้ใช้ |

### คอร์ส (catalog)
`FBI` · `STOP_BARK` · `NOSE_WORK` · `FITNESS` · `TRICKS` · `AGILITY`
(แก้ได้ที่ `api/_lib.js` และ `assets/courses.js`)

### Gate ฝั่งผู้ใช้
`assets/access.js` ดึงสิทธิจาก `/api/me` แล้วล็อก element ที่มี attribute `data-course`
ที่ผู้ใช้ยังไม่มีสิทธิ (ใส่ class `.locked`)
