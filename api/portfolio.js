// GET    /api/portfolio          — list portfolio images (public)
// POST   /api/portfolio          — (admin) add image  {image, caption}
// DELETE /api/portfolio?id=xxx   — (admin) remove image
const { readJson, sb, requireAdmin } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const rows = await sb('portfolio?select=*&order=created_at.desc&limit=60');
      return res.status(200).json({ items: rows || [] });

    } else if (req.method === 'POST') {
      requireAdmin(req);
      const body = await readJson(req);
      const { image, caption } = body;
      if (!image) return res.status(400).json({ error: 'image is required' });
      await sb('portfolio', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          image,
          caption: caption || null,
          created_at: new Date().toISOString()
        })
      });
      return res.status(200).json({ ok: true });

    } else if (req.method === 'DELETE') {
      requireAdmin(req);
      const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
      const id = req.query?.id || qs.get('id');
      if (!id) return res.status(400).json({ error: 'id required' });
      await sb(`portfolio?id=eq.${encodeURIComponent(id)}`, {
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
