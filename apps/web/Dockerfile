# Cache bust: v6
FROM oven/bun:1
WORKDIR /app

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Copy only what web needs (no server/api/db dependencies)
COPY package.json bun.lock ./
COPY packages/config ./packages/config
COPY apps/web ./apps/web

# Install dependencies
RUN bun install

# Build
WORKDIR /app/apps/web
RUN bun run build

# Run with Bun (Nitro bun preset)
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", ".output/server/index.mjs"]
