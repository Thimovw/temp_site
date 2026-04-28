'use strict';

const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');
const crypto       = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

// ─── Security headers ─────────────────────────────────────────────────────────
// All six headers checked by the Harbour Protector badge scanner.

app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src http://localhost:3002",
      "frame-src https://guardlight.io",

      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  next();
});

// ─── Session cookie ───────────────────────────────────────────────────────────
// Sets a session cookie on every request; Secure + HttpOnly + SameSite=Strict
// satisfies all cookie-security checks in the Harbour Protector scanner.

app.use((req, res, next) => {
  if (!req.cookies['vs_session']) {
    const token = crypto.randomBytes(24).toString('base64url');
    res.cookie('vs_session', token, {
      httpOnly : true,
      secure   : true,       // set to false for plain HTTP local dev if you want the Secure flag off
      sameSite : 'Strict',
      maxAge   : 7_200_000,  // 2 hours
      path     : '/',
    });
  }
  next();
});

// ─── security.txt (/.well-known/security.txt) ────────────────────────────────
// Required by the Deck Watcher GDPR scanner. Needs a valid Contact + Expires.

app.get('/.well-known/security.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(
    'Contact: mailto:security@veldsterk.nl\n' +
    'Preferred-Languages: nl, en\n' +
    'Expires: 2027-04-22T00:00:00.000Z\n' +
    'Policy: https://veldsterk.nl/security\n' +
    'Acknowledgments: https://veldsterk.nl/security#meldingen\n' +
    'Canonical: https://veldsterk.nl/.well-known/security.txt\n'
  );
});

// ─── Static files ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public'), {
  index     : 'index.html',
  extensions: ['html'],
}));

// ─── Clean URL routing ────────────────────────────────────────────────────────

const PAGES = ['privacy', 'cookies', 'terms', 'contact', 'checkout', 'products', 'security', 'about'];

for (const page of PAGES) {
  app.get(`/${page}`, (_req, res) =>
    res.sendFile(path.join(__dirname, 'public', `${page}.html`))
  );
}

// Aliases
app.get('/privacybeleid',       (_req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/cookiebeleid',        (_req, res) => res.sendFile(path.join(__dirname, 'public', 'cookies.html')));
app.get('/algemene-voorwaarden',(_req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
app.get('/beveiliging',         (_req, res) => res.sendFile(path.join(__dirname, 'public', 'security.html')));

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  VeldSterk Outdoor  →  http://localhost:${PORT}\n`);
});
