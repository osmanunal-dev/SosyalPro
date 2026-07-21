// Bilgisayardan görsel yükleme — dosyayı Vercel Blob'a kaydeder ve
// Instagram/Facebook API'lerinin erişebileceği herkese açık URL döndürür.
// Kurulum: Vercel > proje > Storage > Create > Blob (token otomatik eklenir)

const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST gerekli' }); return; }
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('Blob deposu bagli degil. Vercel > Storage > Create > Blob adimini yapin ve redeploy edin.');
    }
    const raw = ((req.query && req.query.filename) || 'gorsel.jpg');
    const filename = raw.replace(/[^\w.\-]/g, '_').slice(0, 80) || 'gorsel.jpg';

    let body = req.body;
    if (!body) throw new Error('Dosya verisi bos');
    if (!Buffer.isBuffer(body)) body = Buffer.from(body);
    if (body.length < 100) throw new Error('Dosya verisi bos veya bozuk');
    if (body.length > 4400000) throw new Error('Dosya 4.5MB sinirini asiyor');

    const blob = await put('sosyalpro/' + Date.now() + '-' + filename, body, {
      access: 'public',
      contentType: (req.headers && req.headers['x-file-type']) || 'image/jpeg'
    });

    res.status(200).json({ url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
