// Meetup video library — วิดีโอเรียนย้อนหลัง ล็อกด้วยรหัสรายรุ่น
//
// POST   /api/meetup?unlock=1   — (public) body {code} → คืน {name, videos} ของรุ่นที่รหัสตรง
// GET    /api/meetup            — (admin) list ทุกรุ่น (เห็นรหัสด้วย)
// POST   /api/meetup            — (admin) สร้างรุ่น {name, code, videos:[{title,youtube}]}
// PATCH  /api/meetup?id=xxx     — (admin) แก้ไขรุ่น {name?, code?, videos?}
// DELETE /api/meetup?id=xxx     — (admin) ลบรุ่น
//
// ตาราง Supabase ที่ต้องมี:
//   create table meetup_batches (
//     id uuid primary key default gen_random_uuid(),
//     name text not null,
//     code text not null,
//     videos jsonb default '[]',
//     created_at timestamptz default now()
//   );
const { readJson, sb, requireAdmin } = require('./_lib');

function qsId(req) {
  const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
  return req.query?.id || qs.get('id');
}
function hasUnlock(req) {
  const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
  return req.query?.unlock || qs.get('unlock');
}

// ทำวิดีโอให้สะอาด: รับได้ทั้ง youtube id ล้วน หรือลิงก์ → เก็บเป็น id
function extractYouTubeId(v) {
  if (!v) return '';
  v = String(v).trim();
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  return v.replace(/[^A-Za-z0-9_-]/g, '');
}
function cleanVideos(videos) {
  if (!Array.isArray(videos)) return [];
  return videos
    .map((x) => ({ title: String(x.title || '').slice(0, 200), youtube: extractYouTubeId(x.youtube) }))
    .filter((x) => x.youtube);
}

module.exports = async (req, res) => {
  try {
    // ---- ปลดล็อกดูวิดีโอ (public) ----
    if (req.method === 'POST' && hasUnlock(req)) {
      const body = await readJson(req);
      const code = String(body.code || '').trim();
      if (!code) return res.status(400).json({ error: 'กรุณาใส่รหัส' });
      const rows = await sb(
        `meetup_batches?select=name,videos&code=eq.${encodeURIComponent(code)}&limit=1`
      );
      if (!rows || !rows.length) return res.status(404).json({ error: 'รหัสไม่ถูกต้อง' });
      return res.status(200).json({ name: rows[0].name, videos: rows[0].videos || [] });
    }

    if (req.method === 'GET') {
      requireAdmin(req);
      const rows = await sb('meetup_batches?select=*&order=created_at.desc&limit=200');
      return res.status(200).json({ batches: rows || [] });

    } else if (req.method === 'POST') {
      requireAdmin(req);
      const body = await readJson(req);
      const name = String(body.name || '').trim();
      const code = String(body.code || '').trim();
      if (!name) return res.status(400).json({ error: 'name is required' });
      if (!code) return res.status(400).json({ error: 'code is required' });
      await sb('meetup_batches', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          name,
          code,
          videos: cleanVideos(body.videos),
          created_at: new Date().toISOString()
        })
      });
      return res.status(200).json({ ok: true });

    } else if (req.method === 'PATCH') {
      requireAdmin(req);
      const id = qsId(req);
      if (!id) return res.status(400).json({ error: 'id required' });
      const body = await readJson(req);
      const patch = {};
      if (body.name !== undefined) patch.name = String(body.name).trim();
      if (body.code !== undefined) patch.code = String(body.code).trim();
      if (body.videos !== undefined) patch.videos = cleanVideos(body.videos);
      await sb(`meetup_batches?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch)
      });
      return res.status(200).json({ ok: true });

    } else if (req.method === 'DELETE') {
      requireAdmin(req);
      const id = qsId(req);
      if (!id) return res.status(400).json({ error: 'id required' });
      await sb(`meetup_batches?id=eq.${encodeURIComponent(id)}`, {
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
