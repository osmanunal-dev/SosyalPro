// YouTube access token yenileme — istemci, süresi dolan token'ı buradan tazeler.
// Gerekli ortam değişkenleri: YT_CLIENT_ID, YT_CLIENT_SECRET

module.exports = async (req, res) => {
  const refresh = (req.query && req.query.refresh_token) || '';
  if (!refresh) { res.status(400).json({ error: 'refresh_token gerekli' }); return; }

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: (process.env.YT_CLIENT_ID || '').trim(),
        client_secret: (process.env.YT_CLIENT_SECRET || '').trim(),
        refresh_token: refresh,
        grant_type: 'refresh_token'
      })
    });
    const d = await r.json();
    res.status(200).json(d);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
