// Facebook Sayfası bağlantısı — kullanıcıyı Facebook yetkilendirme ekranına yönlendirir.
// Gerekli ortam değişkenleri: FB_APP_ID (uygulamanın FACEBOOK App ID'si — Instagram app ID DEĞİL)

function redirectUriFrom(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return proto + '://' + host + '/api/auth/facebook-callback';
}

module.exports = (req, res) => {
  const appId = (process.env.FB_APP_ID || '').trim();
  if (!appId) {
    res.status(500).send('FB_APP_ID ortam degiskeni tanimli degil. Vercel ayarlarindan ekleyin.');
    return;
  }

  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_read_user_content',
    'pages_manage_posts',
    'pages_manage_engagement'
  ].join(',');

  const url =
    'https://www.facebook.com/v23.0/dialog/oauth' +
    '?client_id=' + encodeURIComponent(appId) +
    '&redirect_uri=' + encodeURIComponent(redirectUriFrom(req)) +
    '&response_type=code' +
    '&scope=' + scope;

  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
