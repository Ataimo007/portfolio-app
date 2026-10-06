FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node worker.cjs ./worker.cjs
USER node
EXPOSE 3001
CMD ["node", "worker.cjs"]
