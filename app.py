"""
Fluency Bridge — Backend Server
Serves static frontend + waitlist API with SQLite storage.
"""
import sqlite3
import os
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory, g

APP = Flask(__name__, static_folder=".", static_url_path="")
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "waitlist.db"))

# Ensure DB table exists on startup (critical for gunicorn)
os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
with sqlite3.connect(DB_PATH) as _db:
    _db.execute("""
        CREATE TABLE IF NOT EXISTS waitlist (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT    NOT NULL UNIQUE,
            profile     TEXT    NOT NULL,
            created_at  TEXT    NOT NULL
        )
    """)
    _db.commit()


def get_db():
    """Get or create a database connection for this request."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@APP.teardown_appcontext
def close_db(_error=None):
    """Close database connection at end of request."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create tables if they don't exist."""
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS waitlist (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT    NOT NULL UNIQUE,
            profile     TEXT    NOT NULL,
            created_at  TEXT    NOT NULL
        )
    """)
    db.commit()
    db.close()


# ── Static file serving ──────────────────────────────────────────────
@APP.route("/")
def index():
    return send_from_directory(".", "index.html")


@APP.route("/<path:path>")
def static_files(path):
    if os.path.isfile(os.path.join(".", path)):
        return send_from_directory(".", path)
    return jsonify({"error": "not found"}), 404


# ── API: Join waitlist ────────────────────────────────────────────────
@APP.route("/api/waitlist", methods=["POST"])
def join_waitlist():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    profile = (data.get("profile") or "").strip()

    if not email or "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Valid email required"}), 400
    if profile not in ("beginner", "young", "adult", "intermediate"):
        return jsonify({"error": "Profile selection required"}), 400

    db = get_db()
    try:
        db.execute(
            "INSERT INTO waitlist (email, profile, created_at) VALUES (?, ?, ?)",
            (email, profile, datetime.now(timezone.utc).isoformat()),
        )
        db.commit()
        return jsonify({"ok": True, "message": "You're on the list!"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"ok": True, "message": "You were already on the list — welcome back!"}), 200


# ── API: View waitlist (simple admin) ─────────────────────────────────
@APP.route("/api/waitlist", methods=["GET"])
def list_waitlist():
    db = get_db()
    rows = db.execute(
        "SELECT id, email, profile, created_at FROM waitlist ORDER BY created_at DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


# ── Admin dashboard (basic HTML table) ────────────────────────────────
@APP.route("/admin")
def admin():
    db = get_db()
    rows = db.execute(
        "SELECT id, email, profile, created_at FROM waitlist ORDER BY created_at DESC"
    ).fetchall()
    total = db.execute("SELECT COUNT(*) FROM waitlist").fetchone()[0]
    by_profile = db.execute(
        "SELECT profile, COUNT(*) as cnt FROM waitlist GROUP BY profile ORDER BY cnt DESC"
    ).fetchall()

    profile_labels = {
        "beginner": "Absolute Beginner",
        "young": "Young Learner (Parent)",
        "adult": "Adult Beginner",
        "intermediate": "Intermediate",
    }

    rows_html = ""
    for r in rows:
        label = profile_labels.get(r["profile"], r["profile"])
        rows_html += f"""
        <tr>
            <td>{r['id']}</td>
            <td>{r['email']}</td>
            <td><span class="badge badge--{r['profile']}">{label}</span></td>
            <td>{r['created_at'][:19].replace('T',' ')}</td>
        </tr>"""

    stats_html = ""
    for bp in by_profile:
        label = profile_labels.get(bp["profile"], bp["profile"])
        stats_html += f"""
        <div class="stat-card">
            <div class="stat-number">{bp['cnt']}</div>
            <div class="stat-label">{label}</div>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fluency Bridge — Admin</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f5f3f0; color:#1a1816; padding:2rem; }}
  .container {{ max-width:900px; margin:0 auto; }}
  h1 {{ font-size:1.75rem; margin-bottom:.25rem; }}
  .sub {{ color:#5c5854; margin-bottom:2rem; }}
  .stats {{ display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; }}
  .stat-card {{ background:#fff; padding:1.25rem 1.5rem; border-radius:12px; text-align:center; min-width:140px; box-shadow:0 1px 3px rgba(0,0,0,.06); }}
  .stat-number {{ font-size:2rem; font-weight:800; color:#2563eb; }}
  .stat-label {{ font-size:.8rem; color:#8c8884; margin-top:.25rem; }}
  table {{ width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.06); }}
  th, td {{ padding:.85rem 1rem; text-align:left; border-bottom:1px solid #f0edea; font-size:.9rem; }}
  th {{ background:#faf9f7; font-weight:700; text-transform:uppercase; letter-spacing:.04em; font-size:.75rem; color:#5c5854; }}
  .badge {{ display:inline-block; padding:.25rem .65rem; border-radius:999px; font-size:.75rem; font-weight:600; }}
  .badge--beginner {{ background:#f5f3ff; color:#7c3aed; }}
  .badge--young {{ background:#fdf2f8; color:#db2777; }}
  .badge--adult {{ background:#fff7ed; color:#ea580c; }}
  .badge--intermediate {{ background:#ecfdf5; color:#059669; }}
  .refresh {{ margin-bottom:1rem; }}
  .refresh a {{ color:#2563eb; font-size:.85rem; text-decoration:none; }}
</style>
</head>
<body>
<div class="container">
  <h1>🌉 Fluency Bridge — Waitlist</h1>
  <p class="sub">Total signups: <strong>{total}</strong></p>
  <div class="stats">{stats_html}</div>
  <p class="refresh"><a href="/admin">↻ Refresh</a></p>
  <table>
    <thead><tr><th>#</th><th>Email</th><th>Profile</th><th>Signed up</th></tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
</div>
</body>
</html>"""


# ── Startup ───────────────────────────────────────────────────────────

@APP.route("/api/health")
def health():
    return {"status": "ok", "uptime": "n/a"}

if __name__ == "__main__":
    init_db()
    print("🌉 Fluency Bridge running at http://0.0.0.0:8080")
    APP.run(host="0.0.0.0", port=8080, debug=False)
