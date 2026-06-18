// POST /api/admin-grant — (แอดมิน) ให้/ถอนสิทธิคอร์สของผู้ใช้
// body: { lineUserId, courseCode, grant: true|false }
const { requireAdmin, readJson, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const { lineUserId, courseCode, grant } = await readJson(req);
    if (!lineUserId || !courseCode) return res.status(400).json({ error: 'missing fields' });

    if (grant) {
      await sb('entitlements?on_conflict=line_user_id,course_code', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ line_user_id: lineUserId, course_code: courseCode, granted_by: 'admin' })
      });
    } else {
      await sb(
        `entitlements?line_user_id=eq.${encodeURIComponent(lineUserId)}` +
        `&course_code=eq.${encodeURIComponent(courseCode)}`,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
      );
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
