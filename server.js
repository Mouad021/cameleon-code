// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ======== إعدادات من .env ========
const PORT = process.env.PORT || 8080;
const ALLOWED_TOKENS =
  (process.env.ALLOWED_TOKENS || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

const SELFIE_TTL_MINUTES = parseInt(process.env.SELFIE_TTL_MINUTES || '30', 10);
const SELFIE_TTL_MS = SELFIE_TTL_MINUTES * 60 * 1000;

// ======== وسطيات عامة ========
app.use(cors());            // يسمح للمتصفحات / الإضافات بالوصول
app.use(express.json());    // يفك JSON body

// تخزين بسيط في RAM: token -> { code, ts }
const selfieStore = new Map();

// تنظيف الكود المنتهي الصلاحية
function isExpired(entry) {
  if (!entry) return true;
  if (!SELFIE_TTL_MS || SELFIE_TTL_MS <= 0) return false; // لا تنتهي الصلاحية
  return Date.now() - entry.ts > SELFIE_TTL_MS;
}

function validateToken(token) {
  if (!ALLOWED_TOKENS.length) return true; // لو ماحددنا حتى واحد، نقبل كلشي (اختياري)
  return ALLOWED_TOKENS.includes(token);
}

// ======== Routes ========

// صفحة بسيطة للفحص
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'MILANO Selfie Server',
    now: new Date().toISOString(),
    ttl_minutes: SELFIE_TTL_MINUTES,
  });
});

// POST /api/selfie  { token, code }
app.post('/api/selfie', (req, res) => {
  const { token, code } = req.body || {};

  if (!token || !code) {
    return res.status(400).json({
      ok: false,
      error: 'token and code are required',
    });
  }

  if (!validateToken(token)) {
    return res.status(403).json({
      ok: false,
      error: 'token not allowed',
    });
  }

  selfieStore.set(token, {
    code,
    ts: Date.now(),
  });

  console.log(`[SELFIE][SET] token=${token} code=${code}`);

  res.json({
    ok: true,
    token,
  });
});

// GET /api/selfie?token=ROOM
app.get('/api/selfie', (req, res) => {
  const token = (req.query.token || '').trim();

  if (!token) {
    return res.status(400).json({
      ok: false,
      error: 'token is required',
    });
  }

  if (!validateToken(token)) {
    return res.status(403).json({
      ok: false,
      error: 'token not allowed',
    });
  }

  const entry = selfieStore.get(token);

  if (!entry || isExpired(entry)) {
    if (entry && isExpired(entry)) {
      selfieStore.delete(token);
      console.log(`[SELFIE][EXPIRE] token=${token}`);
    }

    return res.json({
      ok: true,
      token,
      code: null,
      expired: true,
    });
  }

  res.json({
    ok: true,
    token,
    code: entry.code,
    ts: entry.ts,
    expired: false,
  });
});

// (اختياري) مسح الكود: DELETE /api/selfie?token=ROOM
app.delete('/api/selfie', (req, res) => {
  const token = (req.query.token || '').trim();

  if (!token) {
    return res.status(400).json({
      ok: false,
      error: 'token is required',
    });
  }

  if (!validateToken(token)) {
    return res.status(403).json({
      ok: false,
      error: 'token not allowed',
    });
  }

  selfieStore.delete(token);
  console.log(`[SELFIE][DELETE] token=${token}`);

  res.json({
    ok: true,
    token,
    deleted: true,
  });
});

// ======== بدء السرفر ========
app.listen(PORT, () => {
  console.log(`MILANO Selfie Server listening on port ${PORT}`);
});
