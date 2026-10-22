# Lab replacement for alpine/k8s — clears GHSA-6q48-6c7w-9gw2 (certifi) and
# CVE-2025-68121 (Go crypto/tls in bundled tools) for CronJobs / restore Jobs.
# Multi-arch: amd64 + arm64 (Proxmox workers + Pis).
#
# Pin used across minilab manifests:
#   registry.stadthagen.dev/ops/k8s-toolbox:<VERSION>  (lab mirror)
#   ghcr.io/henryhst/k8s-toolbox:<VERSION>            (CI source of truth)
ARG ALPINE_VERSION=3.22
ARG KUBECTL_VERSION=v1.37.1
ARG VERSION=0.0.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

FROM alpine:${ALPINE_VERSION}
ARG TARGETARCH
ARG KUBECTL_VERSION
ARG VERSION
ARG VCS_REF
ARG BUILD_DATE

LABEL org.opencontainers.image.title="k8s-toolbox" \
      org.opencontainers.image.description="nXk3 helper image (bash, kubectl, python, DB clients)" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/HenryHST/minilab/tree/main/apps/ops/k8s-toolbox"

RUN apk add --no-cache \
      bash \
      ca-certificates \
      curl \
      git \
      gzip \
      jq \
      wget \
      mariadb-client \
      postgresql-client \
      python3 \
      py3-pip \
      tar \
    && curl -fsSL -o /usr/local/bin/kubectl \
         "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
    && chmod +x /usr/local/bin/kubectl \
    && kubectl version --client \
    && pip3 install --break-system-packages --no-cache-dir --root-user-action=ignore \
         'certifi>=2026.10.19' \
    && python3 -c 'import certifi; print("certifi", certifi.__version__)'

WORKDIR /work
ENTRYPOINT ["/bin/bash"]
