// Bilgisayardan görsel yükleme — dosyayı Vercel Blob'a kaydeder ve
// Instagram/Facebook API'lerinin erişebileceği herkese açık URL döndürür.

const { put } = require('@vercel/blob');

// Token adı bağlantı ayarına göre değişebilir (BLOB_READ_WRITE_TOKEN,
// SOSYALPRO_GORSEL_READ_WRITE_TOKEN vb.) — hepsini yakala.
function findToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find(k => /READ_WRITE_TOKEN$/.test(k) && process.env[k]);
  return key ? process.env[key] : null;
}

module.exports = async (req, res) => {
  // Teşhis: tarayıcıdan /api/upload adresini açınca durum bilgisi verir
  if (req.method === 'GET') {
    const found = Object.keys(process.env).filter(k => /BLOB|READ_WRITE_TOKEN/.test(k));
    res.status(200).json({
      hazir: !!findToken(),
      bulunanDegiskenler: found,
      not: found.length ? 'Token bulundu ise yukleme calisir.' : 'Blob baglantisinda read-write token secenegi isaretlenmemis olabilir.'
    });
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'POST gerekli' }); return; }

  try {
    const token = findToken();
    if (!token) {
      throw new Error('Blob token bulunamadi. Vercel > Storage > sosyalpro-gorsel > Connect Project adiminda "read-write token" secenegini isaretleyin, sonra redeploy edin.');
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
      contentType: (req.headers && req.headers['x-file-type']) || 'image/jpeg',
      token: token,
      addRandomSuffix: true
    });

    res.status(200).json({ url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
