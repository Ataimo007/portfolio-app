FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node worker.cjs ./worker.cjs
COPY --chown=node:node identity-mail-guard.cjs ./identity-mail-guard.cjs
USER node
EXPOSE 3001
CMD ["node", "worker.cjs"]
