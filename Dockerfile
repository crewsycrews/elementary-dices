FROM oven/bun:1 AS dependency-resolver

WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
COPY shared/package.json ./shared/package.json

RUN bun install --frozen-lockfile


FROM dependency-resolver AS builder

COPY client ./client
COPY server ./server
COPY shared ./shared

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN rm -f shared/tsconfig.tsbuildinfo \
  && bun --filter @elementary-dices/shared build \
  && bun --filter @elementary-dices/client build


FROM dependency-resolver AS backend-runner

COPY server ./server
COPY shared ./shared

WORKDIR /app/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "index.ts"]


FROM caddy:2-alpine AS frontend-runner

COPY client/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/client/dist /usr/share/caddy

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
