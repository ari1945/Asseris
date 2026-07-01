# W10 — deploy-ready container image for the NeoSuite AMS server (tRPC + Prisma).
#
# ✅ VERIFIED IN CI: .github/workflows/deploy-smoke.yml builds THIS image and boots the full compose
#    stack (server + postgres:16) on every server/migration/compose change, asserting the chain
#    db push → healthz → seed → login. (The old "UNTESTED FROM THE DEV MACHINE" note referred to the
#    Windows dev box having no Docker; CI on ubuntu-latest supersedes it.) See BUILD.md › "Deploy (W10)".
#
# Build context MUST be the REPO ROOT: the server imports ../../migration/src/{rbac,data}.js
# (the shared RBAC SSOT + seed data), so both packages have to be in the image.
#   docker build -f server/Dockerfile -t neosuite-ams-server .

FROM node:22-bookworm-slim AS base
# Prisma needs OpenSSL (engine) + CA certs (outbound LLM proxy) at build and runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install deps first so the layer caches on the manifests, not on every source edit.
# Runtime tooling (tsx for `npm start`, prisma CLI for `db push`) lives in dependencies, so
# `npm ci --omit=dev` is SAFE here and would slim the image (drops typescript/vitest/@types).
# Kept as plain `npm ci` until a real build verifies the slim path end-to-end.
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Source for BOTH packages (node_modules/*.db excluded via .dockerignore).
# MUST copy migration/package.json too — migration/src/*.js uses ESM (export const),
# and without "type":"module" in package.json, tsx treats them as CommonJS → crashes
# the runtime with "does not provide an export named ...". See also W10 debug notes.
COPY migration/package.json ./migration/package.json
COPY migration/src ./migration/src
COPY server ./server
WORKDIR /app/server

# Prod runs on Postgres. Flip the single source datasource at image-build time (the repo's
# schema stays sqlite for zero-ops dev), then generate the client against it.
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma \
    && npx prisma generate

ENV NODE_ENV=production
ENV PORT=5181
EXPOSE 5181

# Container-level liveness — same probe a load balancer would use.
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:5181/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Schema is applied by the compose entrypoint (DB must be up first); here we just run the server.
CMD ["npm", "start"]
