# ── Fluency Bridge — Node.js Backend ─────────────────────────────
FROM node:22

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js .

RUN mkdir -p /data && chmod 777 /data
ENV DB_PATH=/data/waitlist.db
ENV PORT=8080

# Healthcheck with curl (available in node:22 full)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

EXPOSE 8080
CMD ["node", "server.js"]
