// Instagram Business Login başlangıcı — kullanıcıyı Instagram yetkilendirme ekranına yönlendirir.
// Gerekli ortam değişkenleri (Vercel > Settings > Environment Variables):
//   IG_APP_ID        : Meta panelindeki Instagram App ID
//   IG_REDIRECT_URI  : https://SENIN-PROJEN.vercel.app/api/auth/callback

module.exports = (req, res) => {
  const appId = process.env.IG_APP_ID;
  const redirectUri = process.env.IG_REDIRECT_URI;

  if (!appId || !redirectUri) {
    res.status(500).send('IG_APP_ID ve IG_REDIRECT_URI ortam değişkenleri tanımlı değil. Vercel ayarlarından ekleyin.');
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
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=code' +
    '&scope=' + scope;

  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
