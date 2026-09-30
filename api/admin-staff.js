// GET    /api/admin-staff          — (แอดมิน) รายชื่อสตาฟ/พาร์ทเนอร์ทั้งหมด
// POST   /api/admin-staff          — (แอดมิน) เพิ่ม/แก้ไขสตาฟ (ส่ง id มาด้วย = แก้ไข, ไม่ส่ง = เพิ่มใหม่)
// DELETE /api/admin-staff?id=...   — (แอดมิน) ลบสตาฟ
const { requireAdmin, readJson, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await sb('staff?select=*&order=created_at.asc');
      return res.status(200).json({ staff: rows || [] });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const name = (body.name || '').trim();
      const staffCode = (body.staffCode || '').trim();
      if (!name || !staffCode) return res.status(400).json({ error: 'missing name/staffCode' });

      const row = {
        name,
        staff_code: staffCode,
        bank_name: (body.bankName || '').trim() || null,
        bank_account_no: (body.bankAccountNo || '').trim() || null
      };

      if (body.id) {
        const updated = await sb(`staff?id=eq.${encodeURIComponent(body.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(row)
        });
        return res.status(200).json({ staff: (updated || [])[0] || null });
      }

      const created = await sb('staff', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row)
      });
      return res.status(200).json({ staff: (created || [])[0] || null });
    }

    if (req.method === 'DELETE') {
      const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
      const id = (req.query && req.query.id) || qs.get('id');
      if (!id) return res.status(400).json({ error: 'missing id' });
      await sb(`staff?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    const msg = String(e.message || e);
    // Postgres unique_violation on staff_code
    if (msg.indexOf('23505') > -1 || msg.toLowerCase().indexOf('duplicate') > -1) {
      return res.status(409).json({ error: 'รหัสสตาฟนี้ถูกใช้แล้ว' });
    }
    res.status(e.status || 500).json({ error: msg });
  }
};
