FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies (including devDependencies for build)
FROM base AS deps
ENV NODE_ENV=development
# Copy all package.json files for workspace resolution
COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY apps/web/package.json ./apps/web/
RUN bun install

# Build stage
FROM base AS builder
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy all source code
COPY . .

WORKDIR /app/apps/web
RUN bun run build

# Production - serve with nginx
FROM nginx:alpine AS runner

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
