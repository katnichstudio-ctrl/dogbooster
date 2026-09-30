// POST /api/register — (สาธารณะ) ลูกค้าสมัครเรียนจากหน้า /register.html
// body: { classId, customerName, customerPhone, staffCode? }
const { readJson, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const body = await readJson(req);

    const classId = (body.classId || '').trim();
    const customerName = (body.customerName || '').trim();
    const customerPhone = (body.customerPhone || '').trim();
    const staffCodeRaw = (body.staffCode || '').trim();

    if (!classId || !customerName || !customerPhone) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const classes = await sb(
      `class_pricing?select=id,label,price,is_open&id=eq.${encodeURIComponent(classId)}`
    );
    const cls = (classes || [])[0];
    if (!cls || cls.is_open === false) {
      return res.status(400).json({ error: 'คลาสนี้ไม่เปิดรับสมัครแล้ว' });
    }

    let staffId = null;
    if (staffCodeRaw) {
      const staffRows = await sb(
        `staff?select=id&staff_code=eq.${encodeURIComponent(staffCodeRaw)}`
      );
      staffId = (staffRows || [])[0] ? staffRows[0].id : null;
    }

    const created = await sb('registrations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        class_pricing_id: cls.id,
        class_label: cls.label,
        price: cls.price,
        customer_name: customerName,
        customer_phone: customerPhone,
        staff_code: staffCodeRaw || null,
        staff_id: staffId
      })
    });

    res.status(200).json({ registration: (created || [])[0] || null });
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
