FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# muitas plataformas expõem PORT; padrão 8000
ENV PORT=8000

CMD ["sh", "-c", "gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  -w ${WEB_CONCURRENCY:-2} \
  -b 0.0.0.0:${PORT} \
  --timeout ${GUNICORN_TIMEOUT:-180} \
  --graceful-timeout ${GUNICORN_GRACEFUL_TIMEOUT:-30} \
  --max-requests ${GUNICORN_MAX_REQUESTS:-200} \
  --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER:-50} \
  --access-logfile - \
  --error-logfile - \
  --log-level ${LOG_LEVEL:-info} \
  --capture-output"]
