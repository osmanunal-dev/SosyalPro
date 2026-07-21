// Google OAuth geri dönüşü — kodu access + refresh token'a çevirir.
// Gerekli ortam değişkenleri: YT_CLIENT_ID, YT_CLIENT_SECRET

function redirectUriFrom(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return proto + '://' + host + '/api/auth/youtube-callback';
}

module.exports = async (req, res) => {
  const { code, error } = req.query || {};

  const back = (hash) => {
    res.statusCode = 302;
    res.setHeader('Location', '/#' + hash);
    res.end();
  };

  if (error) { back('yt_error=' + encodeURIComponent(error)); return; }
  if (!code) { back('yt_error=' + encodeURIComponent('Yetkilendirme kodu alinamadi')); return; }

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: (process.env.YT_CLIENT_ID || '').trim(),
        client_secret: (process.env.YT_CLIENT_SECRET || '').trim(),
        redirect_uri: redirectUriFrom(req),
        grant_type: 'authorization_code'
      })
    });
    const d = await r.json();
    if (!d.access_token) throw new Error(d.error_description || d.error || 'token alinamadi');

    back(
      'yt_access=' + encodeURIComponent(d.access_token) +
      '&yt_refresh=' + encodeURIComponent(d.refresh_token || '') +
      '&yt_expires=' + encodeURIComponent(d.expires_in || 3600)
    );
  } catch (e) {
    back('yt_error=' + encodeURIComponent(String(e.message || e).slice(0, 180)));
  }
};
