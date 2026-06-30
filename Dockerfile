# ── Fluency Bridge — Production Docker image ──────────────────
FROM python:3.11-slim

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app.py .
COPY index.html styles.css app.js ./

# Create data directory for SQLite
RUN mkdir -p /data && chmod 777 /data

ENV DB_PATH=/data/waitlist.db

# Run with gunicorn
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "30", "app:APP"]
