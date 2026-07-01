# ── Fluency Bridge — Node.js Backend ─────────────────────────────
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY server.js .

# Data directory for SQLite
RUN mkdir -p /data && chmod 777 /data
ENV DB_PATH=/data/waitlist.db
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server.js"]
