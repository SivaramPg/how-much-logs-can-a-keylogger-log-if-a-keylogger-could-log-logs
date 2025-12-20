# Simple single-stage build
FROM oven/bun:1
WORKDIR /app

# Copy everything
COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install

# Set working directory and run
WORKDIR /app/apps/server
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
