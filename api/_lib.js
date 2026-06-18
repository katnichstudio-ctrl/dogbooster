// api/_lib.js — helper ใช้ร่วม (ไฟล์ขึ้นต้น _ จะไม่ถูกทำเป็น endpoint)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// แคตตาล็อกคอร์ส (source of truth ฝั่ง server)
const COURSES = [
  { code: 'FBI', name: 'FBI · Four Basic Instinct' },
  { code: 'STOP_BARK', name: 'หยุดเห่าอย่างเข้าใจ' },
  { code: 'NOSE_WORK', name: 'Nose Work' },
  { code: 'FITNESS', name: 'Dog Fitness' },
  { code: 'TRICKS', name: 'Dog Show Tricks' },
  { code: 'AGILITY', name: 'Agility Dog' }
];

// อ่าน JSON body (รองรับทั้งกรณี Vercel parse ให้แล้วและยังไม่ parse)
function readJson(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') {
        try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); }
      }
      return resolve(req.body);
    }
    let d = '';
    req.on('data', (c) => { d += c; });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

// ตรวจ LINE ID token (จาก liff.getIDToken()) → คืน userId/ชื่อ/รูป
async function verifyLineIdToken(idToken) {
  if (!idToken) { const e = new Error('missing idToken'); e.status = 400; throw e; }
  if (!LINE_CHANNEL_ID) throw new Error('LINE_CHANNEL_ID not configured');
  const r = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: LINE_CHANNEL_ID })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.sub) {
    const e = new Error('invalid LINE token: ' + (data.error_description || data.error || r.status));
    e.status = 401; throw e;
  }
  return { userId: data.sub, displayName: data.name || null, pictureUrl: data.picture || null };
}

// เรียก Supabase REST (PostgREST) ด้วย service key — bypass RLS
async function sb(path, opts = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase env vars not configured');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    },
    body: opts.body
  });
  if (!r.ok) { const t = await r.text(); throw new Error(`supabase ${r.status}: ${t}`); }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// กันคนที่ไม่ใช่แอดมิน
function requireAdmin(req) {
  const t = req.headers['x-admin-token'];
  if (!ADMIN_TOKEN || !t || t !== ADMIN_TOKEN) {
    const e = new Error('unauthorized'); e.status = 401; throw e;
  }
}

module.exports = { COURSES, readJson, verifyLineIdToken, sb, requireAdmin };
