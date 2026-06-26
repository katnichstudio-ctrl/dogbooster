// GET  /api/homework?dogId=xxx  — list submissions with feedback
// POST /api/homework             — {dogId, studentId, url, note} submit homework
// PATCH /api/homework            — {submissionId, feedback, status, lineUserId} teacher reply
const { readJson, sb } = require('./_lib');

async function isTeacher(lineUserId) {
  if (!lineUserId) return false;
  try {
    const rows = await sb(`teachers?line_user_id=eq.${encodeURIComponent(lineUserId)}&select=id&limit=1`);
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const dogId = req.query?.dogId || new URLSearchParams(req.url.split('?')[1] || '').get('dogId');
      if (!dogId) return res.status(400).json({ error: 'dogId required' });
      const rows = await sb(
        `homework_submissions?dog_id=eq.${encodeURIComponent(dogId)}&select=*,homework_feedback(*)&order=submitted_at.desc`
      );
      return res.status(200).json({ submissions: rows || [] });

    } else if (req.method === 'POST') {
      const body = await readJson(req);
      const { dogId, studentId, url, note } = body;
      if (!dogId || !url) return res.status(400).json({ error: 'dogId and url are required' });
      const row = {
        dog_id: dogId,
        student_id: studentId || null,
        url,
        note: note || null,
        status: 'รอตรวจ',
        submitted_at: new Date().toISOString()
      };
      await sb('homework_submissions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
      return res.status(200).json({ ok: true });

    } else if (req.method === 'PATCH') {
      const body = await readJson(req);
      const { submissionId, feedback, status, lineUserId } = body;
      if (!submissionId) return res.status(400).json({ error: 'submissionId required' });
      const teacher = await isTeacher(lineUserId);
      if (!teacher) return res.status(403).json({ error: 'teacher access only' });

      if (status) {
        await sb(`homework_submissions?id=eq.${encodeURIComponent(submissionId)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status })
        });
      }
      if (feedback) {
        const rows = await sb(`teachers?line_user_id=eq.${encodeURIComponent(lineUserId)}&select=name&limit=1`);
        const teacherName = (rows && rows[0] && rows[0].name) || 'ครู';
        await sb('homework_feedback', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            submission_id: submissionId,
            teacher_line_id: lineUserId,
            teacher_name: teacherName,
            text: feedback,
            created_at: new Date().toISOString()
          })
        });
      }
      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'method not allowed' });
    }
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
