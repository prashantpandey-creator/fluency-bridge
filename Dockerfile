FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py index.html styles.css app.js ./
RUN mkdir -p /data && chmod 777 /data
ENV DB_PATH=/data/waitlist.db
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "30", "app:APP"]
