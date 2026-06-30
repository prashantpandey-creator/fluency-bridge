#!/bin/bash
set -e

echo "========================================="
echo "  Fluency Bridge — Hetzner Setup"
echo "========================================="

# ── 1. Clone repo ────────────────────────────────────────────
echo ""
echo "[1/4] Setting up repository..."
cd /root

if [ -d "fluency-bridge" ]; then
    echo "  Directory exists, pulling latest..."
    cd fluency-bridge
    git fetch origin
    git reset --hard origin/main
else
    git clone https://github.com/prashantpandey-creator/fluency-bridge.git
    cd fluency-bridge
fi

# ── 2. Ensure Coolify network exists ─────────────────────────
echo ""
echo "[2/4] Checking networks..."
docker network inspect coolify >/dev/null 2>&1 || {
    echo "  Creating coolify network..."
    docker network create coolify
}

# ── 3. Build ─────────────────────────────────────────────────
echo ""
echo "[3/4] Building Fluency Bridge..."
docker compose build

# ── 4. Launch ─────────────────────────────────────────────────
echo ""
echo "[4/4] Starting Fluency Bridge..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d

echo ""
echo "========================================="
echo "  Fluency Bridge is live!"
echo "========================================="
echo ""
echo "  Public:  http://204.168.176.229:8080"
echo "  Admin:   http://204.168.176.229:8080/admin"
echo "  API:     http://204.168.176.229:8080/api/waitlist"
echo ""
echo "  Logs:    docker compose logs -f"
echo "  Status:  docker compose ps"
echo ""

sleep 3
docker compose ps
