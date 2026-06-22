// POST /api/reviews — submit a review
// GET  /api/reviews — get all reviews (public)
const { readJson, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const rows = await sb('reviews?select=*&order=created_at.desc&limit=50');
      return res.status(200).json({ reviews: rows || [] });

    } else if (req.method === 'POST') {
      const body = await readJson(req);
      const { studentId, ownerName, text, ownerPhoto } = body;
      if (!studentId || !text) {
        return res.status(400).json({ error: 'studentId and text are required' });
      }
      const row = {
        student_id:   studentId,
        owner_name:   ownerName || '',
        text:         text,
        owner_photo:  ownerPhoto || null,
        created_at:   new Date().toISOString()
      };
      await sb('reviews', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'method not allowed' });
    }
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
