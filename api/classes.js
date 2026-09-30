// GET /api/classes — (สาธารณะ) รายการคลาสที่เปิดขาย ใช้แสดงในหน้า /register.html
// ไม่ส่งข้อมูลค่าคอมมิชชันออกไป (เฉพาะแอดมินเห็นได้ผ่าน /api/admin-classes)
const { sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
    const rows = await sb(
      'class_pricing?select=id,label,price&is_open=eq.true&order=created_at.asc'
    );
    res.status(200).json({ classes: rows || [] });
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
