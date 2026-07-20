// Instagram OAuth geri dönüşü — yetkilendirme kodunu alır,
// kısa ömürlü token'a, sonra 60 günlük uzun ömürlü token'a çevirir
// ve kullanıcıyı uygulamaya geri yönlendirir.
// Gerekli ortam değişkenleri: IG_APP_ID, IG_APP_SECRET, IG_REDIRECT_URI

module.exports = async (req, res) => {
  const { code, error, error_description } = req.query || {};

  const back = (hash) => {
    res.statusCode = 302;
    res.setHeader('Location', '/#' + hash);
    res.end();
  };

  if (error) {
    back('ig_error=' + encodeURIComponent(error_description || error));
    return;
  }
  if (!code) {
    back('ig_error=' + encodeURIComponent('Yetkilendirme kodu alinamadi'));
    return;
  }

  try {
    // 1) Kod -> kısa ömürlü token (1 saat)
    const form = new URLSearchParams({
      client_id: process.env.IG_APP_ID,
      client_secret: process.env.IG_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: process.env.IG_REDIRECT_URI,
      code: code
    });

    const r1 = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form
    });
    const d1 = await r1.json();
    const item = Array.isArray(d1.data) ? d1.data[0] : d1;

    if (!item || !item.access_token) {
      throw new Error(d1.error_message || d1.error_type || JSON.stringify(d1).slice(0, 150));
    }

    // 2) Kısa ömürlü -> uzun ömürlü token (60 gün)
    const r2 = await fetch(
      'https://graph.instagram.com/access_token' +
      '?grant_type=ig_exchange_token' +
      '&client_secret=' + encodeURIComponent(process.env.IG_APP_SECRET) +
      '&access_token=' + encodeURIComponent(item.access_token)
    );
    const d2 = await r2.json();

    const token = d2.access_token || item.access_token;
    const expires = d2.expires_in || 3600;

    back(
      'ig_token=' + encodeURIComponent(token) +
      '&ig_user=' + encodeURIComponent(item.user_id || '') +
      '&ig_expires=' + encodeURIComponent(expires)
    );
  } catch (e) {
    back('ig_error=' + encodeURIComponent(String(e.message || e).slice(0, 180)));
  }
};
