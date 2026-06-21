// POST /api/students — upsert student enrollment record
// GET  /api/students — list all students (admin use)
const { readJson, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const body = await readJson(req);
      const { lineUserId, studentId, dogName, breed, owner, phone, class: cls, enrollDate } = body;

      if (!studentId || !owner || !phone) {
        return res.status(400).json({ error: 'studentId, owner and phone are required' });
      }

      await sb(`students?on_conflict=student_id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          student_id:   studentId,
          line_user_id: lineUserId || null,
          dog_name:     dogName || '',
          breed:        breed || '',
          owner_name:   owner,
          phone:        phone,
          class_name:   cls || '',
          enroll_date:  enrollDate || new Date().toISOString().slice(0, 10),
          updated_at:   new Date().toISOString()
        })
      });

      return res.status(200).json({ ok: true, studentId });

    } else if (req.method === 'GET') {
      const rows = await sb(`students?select=*&order=created_at.desc`);
      return res.status(200).json({ students: rows || [] });

    } else {
      return res.status(405).json({ error: 'method not allowed' });
    }
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
