// Instagram/Facebook webhook alıcısı — yeni yorumları anında yakalar,
// kayıtlı otomasyon kurallarına göre otomatik yanıtlar.
// GET: Meta doğrulama   POST: olay bildirimi

const { readQueue, writeQueue, findToken } = require('./queue.js');

const IG_API = 'https://graph.instagram.com/v23.0';

function trLower(s) { return String(s || '').toLocaleLowerCase('tr'); }

module.exports = async (req, res) => {
  // --- Meta doğrulama (webhook'u kaydederken bir kez) ---
  if (req.method === 'GET') {
    const q = req.query || {};
    const verify = (process.env.WEBHOOK_VERIFY_TOKEN || 'sosyalpro').trim();
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === verify) {
      res.status(200).send(q['hub.challenge']);
    } else {
      res.status(403).send('dogrulama basarisiz');
    }
    return;
  }

  if (req.method !== 'POST') { res.status(405).send('yok'); return; }

  // Meta'ya hemen 200 dön (yoksa tekrar tekrar dener); işi arka planda yap
  res.status(200).send('EVENT_RECEIVED');

  try {
    const token = findToken();
    if (!token) return;
    const { data } = await readQueue(token);
    const ig = data.ig;
    if (!ig || !ig.token) return;
    const rules = (data.automations || []).filter(a => a.active && a.trigger === 'comment' && (a.keywords || []).length);
    if (!rules.length) return;

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    if (Buffer.isBuffer(body)) body = JSON.parse(body.toString('utf8'));

    const seen = data.repliedComments || [];
    let changed = false;

    for (const entry of (body.entry || [])) {
      const changes = entry.changes || [];
      for (const ch of changes) {
        if (ch.field !== 'comments') continue;
        const v = ch.value || {};
        const commentId = v.id;
        const text = v.text || '';
        const fromId = (v.from && v.from.id) || '';
        if (!commentId || !text) continue;
        // kendi yorumumuza yanıt verme
        if (ig.userId && fromId === ig.userId) continue;
        // aynı yorumu iki kez yanıtlama
        if (seen.includes(commentId)) continue;

        const low = trLower(text);
        const rule = rules.find(r => (r.keywords || []).some(k => low.includes(trLower(k))));
        if (!rule) continue;

        try {
          const r = await fetch(IG_API + '/' + commentId + '/replies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ message: rule.reply, access_token: ig.token })
          });
          const d = await r.json();
          if (!d.error) {
            seen.push(commentId);
            rule.hits = (rule.hits || 0) + 1;
            changed = true;
          }
        } catch (e) { /* tek yorum hatası tüm akışı durdurmasın */ }
      }
    }

    if (changed) {
      data.repliedComments = seen.slice(-500); // son 500 yorumu hatırla
      await writeQueue(token, data);
    }
  } catch (e) {
    // yanıt zaten gönderildi; sadece logla
    console.error('webhook hata:', e.message);
  }
};
