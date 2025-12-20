FROM oven/bun:1 AS base
WORKDIR /app

# Install ALL dependencies
FROM base AS deps
# Copy root package files
COPY package.json bun.lock ./
# Copy ALL workspace package.json files
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
# Install with full workspace resolution
RUN bun install

# Production
FROM base AS runner
ENV NODE_ENV=production

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY packages ./packages
COPY apps/server ./apps/server
COPY package.json ./

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
