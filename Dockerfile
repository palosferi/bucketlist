# Debian slim rather than Alpine: sharp ships prebuilt glibc binaries, so the
# image needs no compiler and the build stays fast on modest hardware.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

# dumb-init gives PID 1 correct signal handling, so SIGTERM reaches node and
# the graceful shutdown in index.js actually runs.
RUN apt-get update \
 && apt-get install -y --no-install-recommends dumb-init \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# Photos live on a mounted volume, not in the image layer.
RUN mkdir -p /data/photos && chown -R node:node /data
ENV UPLOAD_DIR=/data/photos

USER node
EXPOSE 3000

# Probes the real health endpoint, which moves with BASE_PATH.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const p=(process.env.BASE_PATH||'')+'/healthz';require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+p,r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
