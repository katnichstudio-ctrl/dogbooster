// GET    /api/admin-registrations          — (แอดมิน) รายการใบสมัครทั้งหมด (ใหม่สุดก่อน)
// POST   /api/admin-registrations          — (แอดมิน) เปลี่ยนสถานะใบสมัคร { id, status }
// DELETE /api/admin-registrations?id=...   — (แอดมิน) ลบใบสมัคร (เช่นรายการสแปม/กรอกผิด)
const { requireAdmin, readJson, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await sb(
        'registrations?select=*,staff(name)&order=created_at.desc'
      );
      return res.status(200).json({ registrations: rows || [] });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const id = (body.id || '').trim();
      const status = body.status;
      if (!id || ['pending', 'confirmed', 'cancelled'].indexOf(status) < 0) {
        return res.status(400).json({ error: 'missing/invalid id or status' });
      }
      const updated = await sb(`registrations?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status })
      });
      return res.status(200).json({ registration: (updated || [])[0] || null });
    }

    if (req.method === 'DELETE') {
      const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
      const id = (req.query && req.query.id) || qs.get('id');
      if (!id) return res.status(400).json({ error: 'missing id' });
      await sb(`registrations?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
