# syntax=docker/dockerfile:1.27
FROM python:3.12-slim

ARG VERSION=1.0.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="vw-restore" \
      org.opencontainers.image.description="Vaultwarden NFS backup restore UI (nXk3)" \
      org.opencontainers.image.url="https://vw-restore.stadthagen.dev" \
      org.opencontainers.image.source="https://github.com/HenryHST/minilab/tree/main/apps/dev/vaultwarden/restore-ui" \
      org.opencontainers.image.documentation="https://github.com/HenryHST/minilab/blob/main/docs/bookstack/books/vaultwarden/07-backup-restore.md" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="HenryHST" \
      org.opencontainers.image.authors="HenryHST" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.base.name="docker.io/library/python:3.12-slim"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN useradd --create-home --uid 1000 --shell /usr/sbin/nologin app \
  && mkdir -p /tmp \
  && chown -R app:app /app /tmp

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app app.py .
COPY --chown=app:app templates/ templates/
COPY --chown=app:app static/ static/

USER 1000:1000
EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
