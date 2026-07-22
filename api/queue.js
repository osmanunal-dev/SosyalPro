// Zamanlanmış gönderi kuyruğu — tarayıcıdaki plan sunucuya kaydedilir ki
// bilgisayar kapalıyken de cron görevi yayınlayabilsin.
// POST: kuyruğu kaydeder   GET: kuyruğu okur

const { put, list } = require('@vercel/blob');

function findToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const k = Object.keys(process.env).find(x => /READ_WRITE_TOKEN$/.test(x) && process.env[x]);
  return k ? process.env[k] : null;
}

async function readQueue(token) {
  const { blobs } = await list({ prefix: 'kuyruk/', token });
  if (!blobs || !blobs.length) return { url: null, data: { posts: [] } };
  const newest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  const r = await fetch(newest.url, { cache: 'no-store' });
  const data = await r.json();
  return { url: newest.url, data };
}

async function writeQueue(token, data) {
  const blob = await put('kuyruk/queue.json', JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    token,
    addRandomSuffix: true
  });
  // eski kayıtları temizle
  try {
    const { del } = require('@vercel/blob');
    const { blobs } = await list({ prefix: 'kuyruk/', token });
    const olds = blobs.filter(b => b.url !== blob.url);
    if (olds.length) await del(olds.map(b => b.url), { token });
  } catch (e) { /* önemsiz */ }
  return blob.url;
}

module.exports = async (req, res) => {
  try {
    const token = findToken();
    if (!token) throw new Error('Blob deposu bagli degil');

    if (req.method === 'GET') {
      const { data } = await readQueue(token);
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      if (Buffer.isBuffer(body)) body = JSON.parse(body.toString('utf8'));
      if (!body || !Array.isArray(body.posts)) throw new Error('Gecersiz kuyruk verisi');
      body.updatedAt = new Date().toISOString();
      await writeQueue(token, body);
      res.status(200).json({ ok: true, count: body.posts.length });
      return;
    }

    res.status(405).json({ error: 'GET veya POST' });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};

module.exports.readQueue = readQueue;
module.exports.writeQueue = writeQueue;
module.exports.findToken = findToken;
