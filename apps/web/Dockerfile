# Cache bust: v2
FROM oven/bun:1 AS builder
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

# Production - serve with nginx
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
