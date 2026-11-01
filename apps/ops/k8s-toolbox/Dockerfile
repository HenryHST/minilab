# Lab helper replacing alpine/k8s — CronJobs / restore / GC.
# Lab SoT: Forgejo ops/k8s-toolbox → git.stadthagen.dev/ops/k8s-toolbox
# Optional mirror: registry.stadthagen.dev + GHCR (dispatch-only GHA).
# Multi-arch: amd64 + arm64. Variants: full (default) | slim.
#
# Build:
#   docker buildx build --build-arg VARIANT=full|slim --build-arg VERSION=1.0.2 …
ARG ALPINE_VERSION=3.24
ARG KUBECTL_VERSION=v1.37.1
# sha256 from https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/{amd64,arm64}/kubectl.sha256
ARG KUBECTL_SHA256_AMD64=65691ff77eb6fa44c908b77a1082c9f092c3b9733b5cefabec0d1104890e21a8
ARG KUBECTL_SHA256_ARM64=ff749f4b78d9c4f1ec87307df9b50119ed819e2094aa9810cb9acffc3286c8c7
ARG VARIANT=full
ARG VERSION=0.0.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

FROM alpine:${ALPINE_VERSION}
ARG TARGETARCH
ARG KUBECTL_VERSION
ARG KUBECTL_SHA256_AMD64
ARG KUBECTL_SHA256_ARM64
ARG VARIANT
ARG VERSION
ARG VCS_REF
ARG BUILD_DATE

LABEL org.opencontainers.image.title="k8s-toolbox" \
      org.opencontainers.image.description="nXk3 helper image (bash, kubectl; full=+DB/python/aws)" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://git.stadthagen.dev/ops/k8s-toolbox" \
      org.opencontainers.image.variant="${VARIANT}"

# Slim: bash toolkit + kubectl. Full: + git, python/certifi, DB clients, aws-cli.
RUN set -euo pipefail \
    && apk add --no-cache \
         bash \
         ca-certificates \
         curl \
         gzip \
         jq \
         tar \
         wget \
    && if [ "${VARIANT}" = "full" ]; then \
         apk add --no-cache \
           git \
           mariadb-client \
           postgresql-client \
           python3 \
           py3-pip \
           aws-cli \
       ; elif [ "${VARIANT}" != "slim" ]; then \
         echo "VARIANT must be full or slim, got: ${VARIANT}" >&2 \
         && exit 1 \
       ; fi \
    && case "${TARGETARCH}" in \
         amd64) KUBECTL_SHA256="${KUBECTL_SHA256_AMD64}" ;; \
         arm64) KUBECTL_SHA256="${KUBECTL_SHA256_ARM64}" ;; \
         *) echo "unsupported TARGETARCH=${TARGETARCH}" >&2; exit 1 ;; \
       esac \
    && curl -fsSL -o /usr/local/bin/kubectl \
         "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl" \
    && echo "${KUBECTL_SHA256}  /usr/local/bin/kubectl" | sha256sum -c - \
    && chmod +x /usr/local/bin/kubectl \
    && kubectl version --client \
    && if [ "${VARIANT}" = "full" ]; then \
         pip3 install --break-system-packages --no-cache-dir --root-user-action=ignore \
           'certifi>=2026.10.19' \
         && python3 -c 'import certifi; print("certifi", certifi.__version__)' \
         && aws --version \
       ; fi

WORKDIR /work
ENTRYPOINT ["/bin/bash"]
