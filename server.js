'use strict';

const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');
const crypto       = require('crypto');
const fs           = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Feature flags ────────────────────────────────────────────────────────────
// Toggle via /admin. Resets on server restart.

const flags = {
  thuiswinkel: true,   // Thuiswinkel Waarborg blok op /security
  avg        : true,   // AVG/GDPR vermeldingen
};

// ─── Feature processor ────────────────────────────────────────────────────────
// Strips <!-- FEATURE:x -->...<!-- /FEATURE:x --> blocks when the flag is off.

function processFeatures(html) {
  return Object.entries(flags).reduce((out, [name, enabled]) => {
    if (enabled) return out;
    const re = new RegExp(
      `<!--\\s*FEATURE:${name}\\s*-->[\\s\\S]*?<!--\\s*/FEATURE:${name}\\s*-->`,
      'g'
    );
    return out.replace(re, '');
  }, html);
}

// ─── Page helper ──────────────────────────────────────────────────────────────

function servePage(res, filename) {
  const filePath = path.join(__dirname, 'public', filename);
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Internal Server Error');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(processFeatures(html));
  });
}

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
      "frame-src 'self' https://guardlight.io", 
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
    'Policy: https://cinestore.nl/security\n' +
    'Acknowledgments: https://cinestore.nl/security#meldingen\n' +
    'Canonical: https://cinestore.nl/.well-known/security.txt\n'
  );
});

// ─── Static files (assets only — no HTML extension matching) ────────────────

app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
}));

// ─── Admin panel (/admin — not linked from site) ──────────────────────────────

const ADMIN_HTML = (f) => `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Admin \u2014 CineStore</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 4rem auto; padding: 1.5rem; }
    h1   { font-size: 1.4rem; margin-bottom: 1.5rem; }
    label { display: flex; align-items: center; gap: .75rem; margin-bottom: .5rem; font-size: 1rem; cursor: pointer; }
    input[type=checkbox] { width: 1.1rem; height: 1.1rem; cursor: pointer; }
    .desc { font-size: .8rem; color: #555; margin: 0 0 1.25rem 1.85rem; }
    button { margin-top: .5rem; padding: .55rem 1.4rem; background: #1a7f3c; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
    button:hover { background: #156932; }
  </style>
</head>
<body>
  <h1>Feature beheer</h1>
  <form method="POST" action="/admin">
    <label>
      <input type="checkbox" name="thuiswinkel" value="1"${f.thuiswinkel ? ' checked' : ''}>
      Thuiswinkel Waarborg
    </label>
    <p class="desc">Toont het Thuiswinkel Waarborg keurmerk op de beveiligingspagina.</p>
    <label>
      <input type="checkbox" name="avg" value="1"${f.avg ? ' checked' : ''}>
      AVG/GDPR vermeldingen
    </label>
    <p class="desc">Toont AVG/GDPR-vermeldingen op de privacypagina, cookiepagina en algemene voorwaarden.</p>
    <button type="submit">Opslaan</button>
  </form>
</body>
</html>`;

app.get('/admin', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(ADMIN_HTML(flags));
});

app.post('/admin', (req, res) => {
  flags.thuiswinkel = req.body.thuiswinkel === '1';
  flags.avg         = req.body.avg         === '1';
  res.redirect(303, '/admin');
});

// ─── Page routes ──────────────────────────────────────────────────────────────

app.get('/', (_req, res) => servePage(res, 'index.html'));

const PAGES = ['privacy', 'cookies', 'terms', 'contact', 'checkout', 'products', 'security', 'about'];

for (const page of PAGES) {
  app.get(`/${page}`, (_req, res) => servePage(res, `${page}.html`));
}

// Aliases
app.get('/privacybeleid',        (_req, res) => servePage(res, 'privacy.html'));
app.get('/cookiebeleid',         (_req, res) => servePage(res, 'cookies.html'));
app.get('/algemene-voorwaarden', (_req, res) => servePage(res, 'terms.html'));
app.get('/beveiliging',          (_req, res) => servePage(res, 'security.html'));

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  CineStore  →  http://localhost:${PORT}`);
  console.log(`  Admin      →  http://localhost:${PORT}/admin\n`);
});
