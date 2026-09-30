// GET    /api/admin-classes          — (แอดมิน) รายการราคา/ค่าคอมมิชชันตามคลาสทั้งหมด
// POST   /api/admin-classes          — (แอดมิน) เพิ่ม/แก้ไขคลาส (ส่ง id มาด้วย = แก้ไข, ไม่ส่ง = เพิ่มใหม่)
// DELETE /api/admin-classes?id=...   — (แอดมิน) ลบคลาส
const { requireAdmin, readJson, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await sb('class_pricing?select=*&order=created_at.asc');
      return res.status(200).json({ classes: rows || [] });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const label = (body.label || '').trim();
      if (!label) return res.status(400).json({ error: 'missing label' });

      const row = {
        label,
        price: Number(body.price) || 0,
        partner_commission_baht: Number(body.partnerCommissionBaht) || 0,
        sale_commission_type: body.saleCommissionType === 'amount' ? 'amount' : 'percent',
        sale_commission_value: Number(body.saleCommissionValue) || 0,
        is_open: body.isOpen !== false,
        updated_at: new Date().toISOString()
      };

      if (body.id) {
        const updated = await sb(`class_pricing?id=eq.${encodeURIComponent(body.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(row)
        });
        return res.status(200).json({ class: (updated || [])[0] || null });
      }

      const created = await sb('class_pricing', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row)
      });
      return res.status(200).json({ class: (created || [])[0] || null });
    }

    if (req.method === 'DELETE') {
      const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
      const id = (req.query && req.query.id) || qs.get('id');
      if (!id) return res.status(400).json({ error: 'missing id' });
      await sb(`class_pricing?id=eq.${encodeURIComponent(id)}`, {
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
