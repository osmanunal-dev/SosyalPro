// Instagram Business Login başlangıcı.
// redirect_uri artık ortam değişkeninden DEĞİL, isteğin geldiği alan adından
// otomatik türetilir — böylece login ve callback her zaman birebir aynı adresi kullanır.
// Gerekli ortam değişkenleri: IG_APP_ID (IG_REDIRECT_URI artık gerekmez)

function redirectUriFrom(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return proto + '://' + host + '/api/auth/callback';
}

module.exports = (req, res) => {
  const appId = (process.env.IG_APP_ID || '').trim();
  if (!appId) {
    res.status(500).send('IG_APP_ID ortam degiskeni tanimli degil. Vercel ayarlarindan ekleyin.');
    return;
  }

  const scope = [
    'instagram_business_basic',
    'instagram_business_manage_comments',
    'instagram_business_content_publish',
    'instagram_business_manage_messages'
  ].join(',');

  const url =
    'https://www.instagram.com/oauth/authorize' +
    '?client_id=' + encodeURIComponent(appId) +
    '&redirect_uri=' + encodeURIComponent(redirectUriFrom(req)) +
    '&response_type=code' +
    '&scope=' + scope;

  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
