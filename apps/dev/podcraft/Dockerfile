# syntax=docker/dockerfile:1.28
FROM python:3.15-slim

ARG VERSION=0.1.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

ENV APP_VERSION=${VERSION} \
    VCS_REF=${VCS_REF} \
    BUILD_DATE=${BUILD_DATE}

LABEL org.opencontainers.image.title="podcraft" \
      org.opencontainers.image.description="minilab k3s workload control plane (Pulse UI)" \
      org.opencontainers.image.url="https://podcraft.stadthagen.dev" \
      org.opencontainers.image.source="https://github.com/HenryHST/minilab/tree/main/apps/dev/podcraft" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="HenryHST" \
      org.opencontainers.image.authors="HenryHST" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.base.name="docker.io/library/python:3.14-slim"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN groupadd --gid 10001 app \
  && useradd --create-home --uid 10001 --gid 10001 --shell /usr/sbin/nologin app \
  && mkdir -p /tmp /config \
  && chown -R app:app /app /tmp /config

COPY requirements.txt .
# zlib1g: CVE-2026-27171 / CVE-2026-76844 / CVE-2026-85091 (Debian trixie → +deb13u1)
# setuptools: pin+purge so base-image leftovers (CVE-2025-47273 / CVE-2026-59890 / GHSA-xmj3) cannot linger
RUN apt-get update \
  && apt-get install -y --no-install-recommends --only-upgrade zlib1g \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --no-cache-dir -U "pip" "setuptools>=84.1.0" \
  && pip install --no-cache-dir -r requirements.txt \
  && pip uninstall -y setuptools \
  && python3 -c 'import importlib.metadata as m; v=tuple(int(x) for x in m.version("urllib3").split(".")[:3]); assert v>=(2,8,0), v'

COPY --chown=app:app VERSION .
COPY --chown=app:app app/ app/

USER 10001:10001
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
