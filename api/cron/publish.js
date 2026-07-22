// Zamanlanmış yayınlayıcı — kuyruktaki vakti gelen gönderileri paylaşır.
// Vercel Cron veya harici bir cron servisi (cron-job.org) tarafından çağrılır.
// Türkiye saati (UTC+3) esas alınır.

const { readQueue, writeQueue, findToken } = require('../queue.js');

const IG_API = 'https://graph.instagram.com/v23.0';
const FB_API = 'https://graph.facebook.com/v23.0';

// "2026-07-25" + "14:30" (TR saati) -> epoch ms
function trToEpoch(date, time) {
  return Date.parse(date + 'T' + (time || '00:00') + ':00+03:00');
}

async function igPublish(post, ig) {
  const mk = await fetch(IG_API + '/me/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image_url: post.img, caption: post.caption || '', access_token: ig.token })
  }).then(r => r.json());
  if (!mk.id) throw new Error((mk.error && mk.error.message) || 'konteyner olusmadi');

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const st = await fetch(IG_API + '/' + mk.id + '?fields=status_code&access_token=' + encodeURIComponent(ig.token)).then(r => r.json());
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('gorsel islenemedi');
    if (i === 14) throw new Error('gorsel hazirlanamadi (zaman asimi)');
  }

  const pub = await fetch(IG_API + '/me/media_publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: mk.id, access_token: ig.token })
  }).then(r => r.json());
  if (!pub.id) throw new Error((pub.error && pub.error.message) || 'yayin onayi alinamadi');
  return pub.id;
}

async function fbPublish(post, fb) {
  const url = FB_API + '/' + fb.pageId + (post.img ? '/photos' : '/feed');
  const body = post.img
    ? { url: post.img, caption: post.caption || '', access_token: fb.token }
    : { message: post.caption || '', access_token: fb.token };
  const d = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  }).then(r => r.json());
  if (d.error) throw new Error(d.error.message);
  return d.id || d.post_id || 'ok';
}

module.exports = async (req, res) => {
  try {
    // İsteğe bağlı güvenlik: CRON_SECRET tanımlıysa ?secret=... zorunlu
    const secret = (process.env.CRON_SECRET || '').trim();
    if (secret) {
      const given = (req.query && req.query.secret) || '';
      const auth = (req.headers && req.headers.authorization) || '';
      if (given !== secret && auth !== 'Bearer ' + secret) {
        res.status(401).json({ error: 'yetkisiz' });
        return;
      }
    }

    const token = findToken();
    if (!token) throw new Error('Blob deposu bagli degil');

    const { data } = await readQueue(token);
    const posts = data.posts || [];
    const now = Date.now();
    const sonuc = [];
    let degisti = false;

    for (const p of posts) {
      if (p.status === 'yayınlandı' || p.status === 'hata') continue;
      const due = trToEpoch(p.date, p.time);
      if (!due || due > now) continue;

      const hedefler = [];
      try {
        if ((p.platforms || []).includes('instagram') && data.ig && data.ig.token && p.img) {
          await igPublish(p, data.ig);
          hedefler.push('Instagram');
        }
        if ((p.platforms || []).includes('facebook') && data.fb && data.fb.token && data.fb.pageId) {
          await fbPublish(p, data.fb);
          hedefler.push('Facebook');
        }
        p.status = hedefler.length ? 'yayınlandı' : 'atlandı';
        p.publishedAt = new Date().toISOString();
        p.result = hedefler.join(' + ') || 'gerçek hedef yok';
        degisti = true;
        sonuc.push({ id: p.id, durum: p.status, hedef: p.result });
      } catch (e) {
        p.status = 'hata';
        p.error = String(e.message || e).slice(0, 200);
        degisti = true;
        sonuc.push({ id: p.id, durum: 'hata', mesaj: p.error });
      }
    }

    if (degisti) await writeQueue(token, data);

    res.status(200).json({
      calisti: new Date().toISOString(),
      kuyruk: posts.length,
      islenen: sonuc.length,
      sonuc
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
