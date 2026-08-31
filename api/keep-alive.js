// api/keep-alive.js — ปิงฐานข้อมูล Supabase วันละครั้ง (ผ่าน Vercel Cron)
// กันไม่ให้โปรเจกต์ Supabase (free tier) ถูก pause เพราะไม่มี activity
const { sb } = require('./_lib');

module.exports = async (req, res) => {
  // ถ้าตั้ง CRON_SECRET ไว้ ให้ตรวจสอบ (Vercel ส่งมาใน Authorization: Bearer <secret>)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
  }

  // ยิง query เบา ๆ ไปยังตารางจริง เพื่อให้เกิด DB activity
  const tables = ['products', 'teachers', 'meetup_batches'];
  for (const t of tables) {
    try {
      await sb(`${t}?select=*&limit=1`, { headers: { Prefer: 'count=none' } });
      return res.status(200).json({ ok: true, pinged: t, at: new Date().toISOString() });
    } catch (e) {
      // ตารางนี้อาจไม่มี — ลองตารางถัดไป
    }
  }

  return res.status(200).json({ ok: false, note: 'no table reachable', at: new Date().toISOString() });
};
