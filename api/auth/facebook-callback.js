// Facebook OAuth geri dönüşü — kodu uzun ömürlü kullanıcı token'ına çevirir.
// Gerekli ortam değişkenleri: FB_APP_ID, FB_APP_SECRET (App settings > Basic'teki değerler)

function redirectUriFrom(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return proto + '://' + host + '/api/auth/facebook-callback';
}

module.exports = async (req, res) => {
  const { code, error, error_description } = req.query || {};

  const back = (hash) => {
    res.statusCode = 302;
    res.setHeader('Location', '/#' + hash);
    res.end();
  };

  if (error) { back('fb_error=' + encodeURIComponent(error_description || error)); return; }
  if (!code) { back('fb_error=' + encodeURIComponent('Yetkilendirme kodu alinamadi')); return; }

  try {
    const appId = (process.env.FB_APP_ID || '').trim();
    const secret = (process.env.FB_APP_SECRET || '').trim();

    // 1) Kod -> kullanıcı token'ı
    const r1 = await fetch(
      'https://graph.facebook.com/v23.0/oauth/access_token' +
      '?client_id=' + encodeURIComponent(appId) +
      '&client_secret=' + encodeURIComponent(secret) +
      '&redirect_uri=' + encodeURIComponent(redirectUriFrom(req)) +
      '&code=' + encodeURIComponent(String(code).replace(/#_$/, ''))
    );
    const d1 = await r1.json();
    if (!d1.access_token) throw new Error((d1.error && d1.error.message) || 'token alinamadi');

    // 2) Uzun ömürlü kullanıcı token'ı (60 gün; bununla alınan sayfa token'ları süresiz olur)
    const r2 = await fetch(
      'https://graph.facebook.com/v23.0/oauth/access_token' +
      '?grant_type=fb_exchange_token' +
      '&client_id=' + encodeURIComponent(appId) +
      '&client_secret=' + encodeURIComponent(secret) +
      '&fb_exchange_token=' + encodeURIComponent(d1.access_token)
    );
    const d2 = await r2.json();

    back('fb_token=' + encodeURIComponent(d2.access_token || d1.access_token));
  } catch (e) {
    back('fb_error=' + encodeURIComponent(String(e.message || e).slice(0, 180)));
  }
};
