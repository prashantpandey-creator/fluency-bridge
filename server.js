/*
 * Fluency Bridge — API Server (Express + sql.js)
 * Pure JS SQLite — no native build tools needed.
 */
import express from 'express';
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || resolve(__dirname, 'waitlist.db');

const app = express();
app.use(express.json());

// ── Database ────────────────────────────────────────────────────────
const SQL = await initSqlJs();
let db;

try {
  if (existsSync(DB_PATH)) {
    const buf = readFileSync(DB_PATH);
    db = new SQL.Database(buf);
    console.log(`DB loaded from ${DB_PATH} (${buf.length} bytes)`);
  } else {
    db = new SQL.Database();
    console.log(`DB created in memory, will save to ${DB_PATH}`);
  }

  db.run(`CREATE TABLE IF NOT EXISTS waitlist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE,
    profile    TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  )`);

  function saveDb() {
    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  }
  saveDb();
  console.log('DB initialized and saved');
} catch (err) {
  console.error('DB init error:', err.message);
  process.exit(1);
}

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

  try {
    db.run(
      'INSERT INTO waitlist (email, profile, created_at) VALUES (?, ?, ?)',
      [email, profile, new Date().toISOString()]
    );
    saveDb();
    return res.status(201).json({ ok: true, message: "You're on the list!" });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.json({ ok: true, message: "You were already on the list — welcome back!" });
    }
    console.error('Waitlist insert error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

// ── API: List waitlist ──────────────────────────────────────────────
app.get('/api/waitlist', (_req, res) => {
  const rows = [];
  const stmt = db.prepare(
    'SELECT id, email, profile, created_at FROM waitlist ORDER BY created_at DESC'
  );
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  res.json(rows);
});

// ── Admin dashboard ─────────────────────────────────────────────────
app.get('/admin', (_req, res) => {
  const rows = [];
  const stmt = db.prepare(
    'SELECT id, email, profile, created_at FROM waitlist ORDER BY created_at DESC'
  );
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  const total = rows.length;

  const profStmt = db.prepare(
    'SELECT profile, COUNT(*) as cnt FROM waitlist GROUP BY profile ORDER BY cnt DESC'
  );
  const byProfile = [];
  while (profStmt.step()) byProfile.push(profStmt.getAsObject());
  profStmt.free();

  const labels = {
    beginner: 'Absolute Beginner',
    young: 'Young Learner (Parent)',
    adult: 'Adult Beginner',
    intermediate: 'Intermediate',
  };

  const statsHtml = byProfile.map(b =>
    `<div class="stat-card"><div class="stat-number">${b.cnt}</div><div class="stat-label">${labels[b.profile] || b.profile}</div></div>`
  ).join('');

  const rowsHtml = rows.map(r =>
    `<tr>
      <td>${r.id}</td>
      <td>${r.email}</td>
      <td><span class="badge badge--${r.profile}">${labels[r.profile] || r.profile}</span></td>
      <td>${r.created_at.replace('T', ' ').slice(0, 19)}</td>
    </tr>`
  ).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
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
</style>
</head>
<body>
<div class="container">
<h1>🌉 Fluency Bridge — Waitlist</h1>
<p class="sub">Total signups: <strong>${total}</strong></p>
<div class="stats">${statsHtml}</div>
<p class="refresh"><a href="/admin">↻ Refresh</a></p>
<table>
<thead><tr><th>#</th><th>Email</th><th>Profile</th><th>Signed up</th></tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</div>
</body>
</html>`);
});

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Start ───────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🌉 Fluency Bridge API running on :${PORT}`);
  console.log(`   DB: ${DB_PATH}`);
});

// Catch unhandled errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
