FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv && apt-get clean
ARG CODEX_VERSION=0.160.0
RUN PUPPETEER_SKIP_DOWNLOAD=true npm install -g @openai/codex@${CODEX_VERSION} \
    @modelcontextprotocol/server-filesystem@2026.8.31 \
    @modelcontextprotocol/server-puppeteer@2025.5.12
RUN mkdir -p /home/node/.codex /home/node/.azure && chown node:node /home/node/.codex /home/node/.azure && chmod 700 /home/node/.azure
ARG KIND_VERSION=0.33.0
RUN set -eu; arch="$(dpkg --print-architecture)"; \
    curl -fsSL --retry 3 "https://github.com/kubernetes-sigs/kind/releases/download/v${KIND_VERSION}/kind-linux-${arch}" -o /tmp/kind-linux-${arch}; \
    curl -fsSL --retry 3 "https://github.com/kubernetes-sigs/kind/releases/download/v${KIND_VERSION}/kind-linux-${arch}.sha256sum" -o /tmp/kind.sha256sum; \
    cd /tmp && sha256sum -c kind.sha256sum; \
    install -m 755 /tmp/kind-linux-${arch} /usr/local/bin/kind
USER node
