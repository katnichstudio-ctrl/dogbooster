// GET    /api/reviews         — get all reviews (public)
// POST   /api/reviews         — (admin) add a review
// DELETE /api/reviews?id=xxx  — (admin) remove a review
const { readJson, sb, requireAdmin } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const rows = await sb('reviews?select=*&order=created_at.desc&limit=50');
      return res.status(200).json({ reviews: rows || [] });

    } else if (req.method === 'POST') {
      requireAdmin(req);
      const body = await readJson(req);
      const { studentId, ownerName, text, ownerPhoto } = body;
      if (!text) {
        return res.status(400).json({ error: 'text is required' });
      }
      const row = {
        student_id:   studentId || '',
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

    } else if (req.method === 'DELETE') {
      requireAdmin(req);
      const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
      const id = req.query?.id || qs.get('id');
      if (!id) return res.status(400).json({ error: 'id required' });
      await sb(`reviews?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'method not allowed' });
    }
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
