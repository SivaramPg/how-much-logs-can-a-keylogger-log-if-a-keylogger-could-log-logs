FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
# Copy all package.json files for workspace resolution
COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY apps/server/package.json ./apps/server/
RUN bun install

# Build stage
FROM base AS builder
# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy all source code
COPY . .

# Production
FROM base AS runner
ENV NODE_ENV=production

# Copy everything needed to run
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/package.json ./

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
