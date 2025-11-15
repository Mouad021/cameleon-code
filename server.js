// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ===== إعدادات من .env =====
const PORT = process.env.PORT || 8080;
const SELFIE_TTL_MINUTES = parseInt(process.env.SELFIE_TTL_MINUTES || '30', 10);
const SELFIE_TTL_MS = SELFIE_TTL_MINUTES * 60 * 1000;

// وسطيات
app.use(cors());
app.use(express.json());

// نخزن غير كود واحد عالمي
let selfieEntry = null; // { code, ts }

// واش منتهي الصلاحية؟
function isExpired(entry) {
  if (!entry) return true;
  if (!SELFIE_TTL_MS || SELFIE_TTL_MS <= 0) return false; // ماكاينش صلاحية
  return Date.now() - entry.ts > SELFIE_TTL_MS;
}

// صفحة فحص بسيطة
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'MILANO Selfie Server (no token)',
    now: new Date().toISOString(),
    ttl_minutes: SELFIE_TTL_MINUTES
  });
});

// POST /api/selfie  { code }
app.post('/api/selfie', (req, res) => {
  const { code } = req.body || {};

  if (!code) {
    return res.status(400).json({
      ok: false,
      error: 'code is required'
    });
  }

  selfieEntry = {
    code,
    ts: Date.now()
  };

  console.log(`[SELFIE][SET] code=${code}`);

  res.json({
    ok: true
  });
});

// GET /api/selfie
app.get('/api/selfie', (req, res) => {
  if (!selfieEntry || isExpired(selfieEntry)) {
    if (selfieEntry && isExpired(selfieEntry)) {
      console.log('[SELFIE][EXPIRE]');
      selfieEntry = null;
    }

    return res.json({
      ok: true,
      code: null,
      expired: true
    });
  }

  res.json({
    ok: true,
    code: selfieEntry.code,
    ts: selfieEntry.ts,
    expired: false
  });
});

// DELETE /api/selfie  (اختياري لمسح الكود)
app.delete('/api/selfie', (req, res) => {
  selfieEntry = null;
  console.log('[SELFIE][DELETE]');
  res.json({
    ok: true,
    deleted: true
  });
});

// تشغيل السرفر
app.listen(PORT, () => {
  console.log(`MILANO Selfie Server (no token) listening on port ${PORT}`);
});
