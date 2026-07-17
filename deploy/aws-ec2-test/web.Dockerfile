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

FROM node:26-bookworm-slim AS build
WORKDIR /app/migration
# deps first → layer caches on the lockfile, not on every source edit
COPY migration/package.json migration/package-lock.json ./
RUN npm ci
COPY migration/ ./
RUN npm run build          # → /app/migration/dist (relative /trpc baked in, config-free)

# Stock Caddy has no rate-limit directive built in — caddy-ratelimit is a third-party plugin,
# which Caddy only ships via a custom-compiled binary (xcaddy). caddy:2-builder-alpine bundles
# xcaddy; this stage's only output is the compiled /usr/bin/caddy binary, copied into the final
# stage below (final image stays caddy:2-alpine, not the builder — no Go toolchain in prod).
FROM caddy:2-builder-alpine AS caddy-build
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:2-alpine
COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
COPY deploy/aws-ec2-test/Caddyfile /etc/caddy/Caddyfile
# TLS-mode toggle snippets (CADDY_TLS_MODE=internal|acme) — see Caddyfile header.
COPY deploy/aws-ec2-test/tls-internal.caddy /etc/caddy/tls-internal.caddy
COPY deploy/aws-ec2-test/tls-acme.caddy /etc/caddy/tls-acme.caddy
COPY --from=build /app/migration/dist /srv
# Caddy auto-provisions Let's Encrypt TLS for $PUBLIC_HOST on first boot.
EXPOSE 80 443
