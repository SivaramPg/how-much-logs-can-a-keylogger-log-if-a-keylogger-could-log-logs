# Cache bust: v5
FROM oven/bun:1
WORKDIR /app

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Copy everything
COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN bun install

# Build
WORKDIR /app/apps/web
RUN bun run build

# Run with Bun (Nitro bun preset)
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", ".output/server/index.mjs"]
