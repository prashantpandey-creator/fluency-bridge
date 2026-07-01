/*
 * Fluency Bridge — API Server (Express + JSON file store)
 * Zero native dependencies. Debug-first: isolate the crash.
 */
import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DB_PATH ? dirname(process.env.DB_PATH) : resolve(__dirname, 'data');
const DATA_FILE = process.env.DB_PATH || resolve(DATA_DIR, 'waitlist.json');

const app = express();
app.use(express.json());

// ── JSON Store ──────────────────────────────────────────────────────
mkdirSync(DATA_DIR, { recursive: true });

function readStore() {
  try {
    if (existsSync(DATA_FILE)) {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Read error, starting fresh:', e.message);
  }
  return [];
}

function writeStore(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let waitlist = readStore();
console.log(`Store loaded: ${waitlist.length} entries from ${DATA_FILE}`);

// ── API: Join waitlist ──────────────────────────────────────────────
app.post('/api/waitlist', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const profile = (req.body.profile || '').trim();

  if (!email || !email.includes('@') || !email.split('@')[1]?.includes('.')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!['beginner', 'young', 'adult', 'intermediate'].includes(profile)) {
    return res.status(400).json({ error: 'Profile selection required' });
  }

  const exists = waitlist.find(e => e.email === email);
  if (exists) {
    return res.json({ ok: true, message: "You were already on the list — welcome back!" });
  }

  const entry = {
    id: waitlist.length + 1,
    email,
    profile,
    created_at: new Date().toISOString()
  };
  waitlist.push(entry);
  writeStore(waitlist);
  return res.status(201).json({ ok: true, message: "You're on the list!" });
});

// ── API: List waitlist ──────────────────────────────────────────────
app.get('/api/waitlist', (_req, res) => {
  res.json([...waitlist].reverse());
});

// ── Admin dashboard ─────────────────────────────────────────────────
app.get('/admin', (_req, res) => {
  const total = waitlist.length;
  const byProfile = {};
  waitlist.forEach(w => {
    byProfile[w.profile] = (byProfile[w.profile] || 0) + 1;
  });

  const labels = {
    beginner: 'Absolute Beginner',
    young: 'Young Learner (Parent)',
    adult: 'Adult Beginner',
    intermediate: 'Intermediate',
  };

  const statsHtml = Object.entries(byProfile).map(([k, v]) =>
    `<div class="stat-card"><div class="stat-number">${v}</div><div class="stat-label">${labels[k] || k}</div></div>`
  ).join('');

  const rowsHtml = [...waitlist].reverse().map(r =>
    `<tr><td>${r.id}</td><td>${r.email}</td><td><span class="badge badge--${r.profile}">${labels[r.profile] || r.profile}</span></td><td>${r.created_at.replace('T',' ').slice(0,19)}</td></tr>`
  ).join('');

  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Fluency Bridge — Admin</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f3f0;color:#1a1816;padding:2rem}
.container{max-width:900px;margin:0 auto}
h1{font-size:1.75rem;margin-bottom:.25rem}
.sub{color:#5c5854;margin-bottom:2rem}
.stats{display:flex;gap:1rem;margin-bottom:2rem;flex-wrap:wrap}
.stat-card{background:#fff;padding:1.25rem 1.5rem;border-radius:12px;text-align:center;min-width:140px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.stat-number{font-size:2rem;font-weight:800;color:#2563eb}
.stat-label{font-size:.8rem;color:#8c8884;margin-top:.25rem}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
th,td{padding:.85rem 1rem;text-align:left;border-bottom:1px solid #f0edea;font-size:.9rem}
th{background:#faf9f7;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:.75rem;color:#5c5854}
.badge{display:inline-block;padding:.25rem .65rem;border-radius:999px;font-size:.75rem;font-weight:600}
.badge--beginner{background:#f5f3ff;color:#7c3aed}
.badge--young{background:#fdf2f8;color:#db2777}
.badge--adult{background:#fff7ed;color:#ea580c}
.badge--intermediate{background:#ecfdf5;color:#059669}
.refresh{margin-bottom:1rem}
.refresh a{color:#2563eb;font-size:.85rem;text-decoration:none}
</style></head><body><div class="container">
<h1>🌉 Fluency Bridge — Waitlist</h1>
<p class="sub">Total signups: <strong>${total}</strong></p>
<div class="stats">${statsHtml}</div>
<p class="refresh"><a href="/admin">↻ Refresh</a></p>
<table><thead><tr><th>#</th><th>Email</th><th>Profile</th><th>Signed up</th></tr></thead><tbody>${rowsHtml}</tbody></table>
</div></body></html>`);
});

// ── Health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Start ───────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🌉 Fluency Bridge v2 running on :${PORT}`);
  console.log(`   Store: ${DATA_FILE} (${waitlist.length} entries)`);
});

process.on('uncaughtException', (err) => console.error('UNCAUGHT:', err));
process.on('unhandledRejection', (err) => console.error('UNHANDLED:', err));
