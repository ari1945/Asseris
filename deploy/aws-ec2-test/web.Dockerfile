# AWS EC2 test deploy — frontend image.
# Builds the Vite SPA (migration/) and bakes it into a Caddy image that ALSO
# reverse-proxies /trpc → the API container, so the browser sees ONE origin
# (httpOnly auth cookies stay first-party — same model as the Vite dev proxy).
#
# Build context MUST be the REPO ROOT (so it can read migration/).
#   docker build -f deploy/aws-ec2-test/web.Dockerfile -t asseris-web .
#
# node_modules/ and dist/ are excluded by the repo .dockerignore, so the
# `COPY migration/ ./` below never clobbers the build with host artifacts.

FROM node:22-bookworm-slim AS build
WORKDIR /app/migration
# deps first → layer caches on the lockfile, not on every source edit
COPY migration/package.json migration/package-lock.json ./
RUN npm ci
COPY migration/ ./
RUN npm run build          # → /app/migration/dist (relative /trpc baked in, config-free)

FROM caddy:2-alpine
COPY deploy/aws-ec2-test/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/migration/dist /srv
# Caddy auto-provisions Let's Encrypt TLS for $PUBLIC_HOST on first boot.
EXPOSE 80 443
