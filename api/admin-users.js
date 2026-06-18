// GET /api/admin-users — (แอดมิน) รายชื่อผู้ใช้ + สิทธิที่มี + แคตตาล็อกคอร์ส
const { requireAdmin, sb, COURSES } = require('./_lib');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
    const users = await sb(
      'users?select=line_user_id,display_name,picture_url,last_login&order=last_login.desc'
    );
    const ents = await sb('entitlements?select=line_user_id,course_code');

    const map = {};
    (ents || []).forEach((e) => {
      (map[e.line_user_id] = map[e.line_user_id] || []).push(e.course_code);
    });
    const rows = (users || []).map((u) => ({ ...u, courses: map[u.line_user_id] || [] }));

    res.status(200).json({ users: rows, catalog: COURSES });
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
