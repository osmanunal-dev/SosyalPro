// YouTube bağlantısı — kullanıcıyı Google yetkilendirme ekranına yönlendirir.
// Gerekli ortam değişkeni: YT_CLIENT_ID (Google Cloud OAuth istemci kimliği)

function redirectUriFrom(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return proto + '://' + host + '/api/auth/youtube-callback';
}

module.exports = (req, res) => {
  const clientId = (process.env.YT_CLIENT_ID || '').trim();
  if (!clientId) {
    res.status(500).send('YT_CLIENT_ID ortam degiskeni tanimli degil. Vercel ayarlarindan ekleyin.');
    return;
  }

  const url =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUriFrom(req)) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/youtube.force-ssl') +
    '&access_type=offline' +
    '&prompt=consent';

  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
