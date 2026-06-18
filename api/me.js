// POST /api/me — ลงทะเบียน/อัปเดตผู้ใช้จาก LINE token แล้วคืนสิทธิที่มี
const { readJson, verifyLineIdToken, sb, COURSES } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const { idToken } = await readJson(req);
    const u = await verifyLineIdToken(idToken);

    // upsert ผู้ใช้ (อัปเดตชื่อ/รูป/last_login ทุกครั้งที่ล็อกอิน)
    await sb('users?on_conflict=line_user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        line_user_id: u.userId,
        display_name: u.displayName,
        picture_url: u.pictureUrl,
        last_login: new Date().toISOString()
      })
    });

    const ent = await sb(
      `entitlements?line_user_id=eq.${encodeURIComponent(u.userId)}&select=course_code`
    );
    const codes = (ent || []).map((e) => e.course_code);

    res.status(200).json({ profile: u, courses: codes, catalog: COURSES });
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
