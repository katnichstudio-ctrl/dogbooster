// GET  /api/teacher-notes?dogId=xxx&lineUserId=xxx  — teacher only
// POST /api/teacher-notes  — {dogId, text, lineUserId}
const { readJson, sb } = require('./_lib');

async function getTeacher(lineUserId) {
  if (!lineUserId) return null;
  try {
    const rows = await sb(`teachers?line_user_id=eq.${encodeURIComponent(lineUserId)}&select=*&limit=1`);
    return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
      const dogId = req.query?.dogId || qs.get('dogId');
      const lineUserId = req.query?.lineUserId || qs.get('lineUserId');
      if (!dogId) return res.status(400).json({ error: 'dogId required' });
      const teacher = await getTeacher(lineUserId);
      if (!teacher) return res.status(403).json({ error: 'teacher access only' });
      const rows = await sb(`teacher_notes?dog_id=eq.${encodeURIComponent(dogId)}&order=created_at.desc`);
      return res.status(200).json({ notes: rows || [] });

    } else if (req.method === 'POST') {
      const body = await readJson(req);
      const { dogId, text, lineUserId } = body;
      if (!dogId || !text) return res.status(400).json({ error: 'dogId and text required' });
      const teacher = await getTeacher(lineUserId);
      if (!teacher) return res.status(403).json({ error: 'teacher access only' });
      await sb('teacher_notes', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          dog_id: dogId,
          teacher_line_id: lineUserId,
          teacher_name: teacher.name || 'ครู',
          text,
          created_at: new Date().toISOString()
        })
      });
      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'method not allowed' });
    }
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
