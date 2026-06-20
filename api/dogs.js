// GET /api/dogs?idToken=xxx  — fetch dogs from Supabase
// POST /api/dogs             — sync local dogs array up to Supabase
const { readJson, verifyLineIdToken, sb } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const { idToken, dogs } = await readJson(req);
      const u = await verifyLineIdToken(idToken);

      if (!Array.isArray(dogs)) return res.status(400).json({ error: 'dogs must be an array' });

      for (const dog of dogs) {
        await sb(`dogs?on_conflict=id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            id: dog.id,
            line_user_id: u.userId,
            data: dog,
            updated_at: new Date().toISOString()
          })
        });
      }

      return res.status(200).json({ ok: true, count: dogs.length });

    } else if (req.method === 'GET') {
      const idToken = req.query && req.query.idToken;
      const u = await verifyLineIdToken(idToken);

      const rows = await sb(
        `dogs?line_user_id=eq.${encodeURIComponent(u.userId)}&select=id,data,updated_at&order=created_at.asc`
      );

      return res.status(200).json({ dogs: (rows || []).map(r => r.data) });

    } else {
      return res.status(405).json({ error: 'method not allowed' });
    }
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
};
