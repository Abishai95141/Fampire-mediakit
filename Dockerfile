# No `# syntax=` directive: it makes every build pull the dockerfile frontend
# from Docker Hub, which is an avoidable network dependency and the thing that
# intermittently failed here. Nothing in this file needs a newer frontend than
# the one built into the daemon.
# FAMPIRE Media Center — production image.
#
# Three stages so the runtime image carries neither the build toolchain nor the
# ~1.4 GB node_modules tree: `deps` installs, `builder` compiles, and `runner`
# copies only Next's traced standalone output plus the few things Payload needs
# at runtime.

# ── deps ────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# No apt-get anywhere in this file, deliberately. The base image has no
# `openssl` binary and no /etc/ssl/certs bundle, but nothing here needs either:
# Node ships its own CA store and does its own TLS (verified: `require("tls")`
# loads and Postgres connects over TLS), pg is pure JS, and sharp ships
# prebuilt with libvips bundled.
#
# It also removes a build-time dependency on Debian's mirrors — which is what
# broke the cross-architecture build, where DNS inside the emulated container
# could not resolve deb.debian.org at all.
# libc6/openssl are what sharp and node-postgres link against on slim images.
COPY package.json package-lock.json ./
# `npm ci` builds exactly the lockfile — a deploy must never resolve a
# different tree than the one that was tested.
#
# `--ignore-scripts` is not a shortcut, it is the fix for a real failure: on
# Docker's overlay filesystem esbuild's postinstall execs a binary that is
# still being written, and `npm ci` dies with `spawnSync … ETXTBSY`. Nothing
# here needs a postinstall — sharp, esbuild, lightningcss and tailwind/oxide
# all ship PREBUILT binaries through the platform packages declared in
# package.json's optionalDependencies. The migration step at boot exercises
# esbuild for real, so a broken binary cannot slip through unnoticed.
RUN npm ci --ignore-scripts --no-audit --no-fund

# ── prod-deps ───────────────────────────────────────────────────────────
# Runtime dependency tree, without the dev half.
#
# The migration step at boot runs Payload's CLI, which loads the TypeScript
# config through `tsx` and reads the .ts files in migrations/. Next's
# `standalone` output deliberately does NOT include any of that — it traces
# only what the SERVER imports — so the container started, printed "applying
# database migrations", and died with "Cannot find package 'tsx'".
#
# Omitting dev dependencies drops eslint, playwright and the rest of the
# build-only half of a 938 MB tree while keeping what migrations actually
# need.
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# ── builder ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The build imports payload.config.ts, which requires both of these to be
# present — they are NOT the real values and never reach the running image.
# The real ones arrive as runtime environment variables.
ENV DATABASE_URI=postgres://build:build@localhost:5432/build
ENV PAYLOAD_SECRET=build-time-placeholder-not-a-real-secret
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ──────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Never run as root.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations run at boot, so the image needs the migration files, the Payload
# config they describe, and the CLI that applies them. `standalone` traces only
# what the SERVER imports and would otherwise leave all of this behind.
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/payload.config.ts ./payload.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/payload-types.ts ./payload-types.ts
COPY --from=builder --chown=nextjs:nodejs /app/collections ./collections
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
# The whole runtime tree, so `payload migrate` can resolve tsx, the database
# adapter and every package the config imports. Placed AFTER the standalone
# copy so it wins where the two overlap.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
