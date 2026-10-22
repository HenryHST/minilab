# postgres:16-alpine ships gosu with Go 1.24.6 → CVE-2025-68121.
ARG GOLANG_VERSION=1.25.7
ARG GOSU_VERSION=1.19
ARG POSTGRES_TAG=16.15-alpine

FROM golang:${GOLANG_VERSION}-bookworm AS gosu
ARG GOSU_VERSION
ARG TARGETARCH
WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && git clone --depth 1 --branch "${GOSU_VERSION}" https://github.com/tianon/gosu.git . \
    && CGO_ENABLED=0 GOOS=linux GOARCH="${TARGETARCH}" \
         go build -trimpath -ldflags='-s -w' -o /gosu .

FROM postgres:${POSTGRES_TAG}
COPY --from=gosu /gosu /usr/local/bin/gosu
RUN gosu --version
