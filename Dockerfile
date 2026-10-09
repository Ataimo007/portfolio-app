FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG SITE_URL=https://ataimo.com
ENV NEXT_TELEMETRY_DISABLED=1 SITE_URL=${SITE_URL}
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --fetch-timeout=60000 --fetch-retries=2
COPY . .
RUN npm run build && npm run build:platform

FROM node:22-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/dist/worker.cjs ./worker.cjs
COPY --chown=node:node LICENSE COPYRIGHT.md PATENTS.md /app/licenses/
COPY --chown=node:node public/fonts/*LICENSE* /app/licenses/
USER node
EXPOSE 3001
CMD ["node", "worker.cjs"]

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/dist/migrate.cjs ./scripts/migrate.cjs
COPY --from=build --chown=node:node /app/db ./db
COPY --chown=node:node LICENSE COPYRIGHT.md PATENTS.md /app/licenses/
COPY --chown=node:node public/fonts/*LICENSE* /app/licenses/
USER node
EXPOSE 3000
CMD ["node", "server.js"]
