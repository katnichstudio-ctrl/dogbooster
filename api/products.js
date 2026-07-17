// GET    /api/products          — list products (public)
// POST   /api/products          — (admin) add product {image, name, price, detail}
// DELETE /api/products?id=xxx   — (admin) remove product
const { readJson, sb, requireAdmin } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const rows = await sb('products?select=*&order=created_at.desc&limit=100');
      return res.status(200).json({ products: rows || [] });

    } else if (req.method === 'POST') {
      requireAdmin(req);
      const body = await readJson(req);
      const { image, name, price, detail } = body;
      if (!name) return res.status(400).json({ error: 'name is required' });
      await sb('products', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          image: image || null,
          name,
          price: price || null,
          detail: detail || null,
          created_at: new Date().toISOString()
        })
      });
      return res.status(200).json({ ok: true });

    } else if (req.method === 'DELETE') {
      requireAdmin(req);
      const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
      const id = req.query?.id || qs.get('id');
      if (!id) return res.status(400).json({ error: 'id required' });
      await sb(`products?id=eq.${encodeURIComponent(id)}`, {
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
