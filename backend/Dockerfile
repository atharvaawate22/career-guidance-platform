# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────
# Stage 1 — build
#   Compile TypeScript to dist/ so the production image ships only
#   compiled JavaScript and doesn't need ts-node or the TypeScript
#   compiler at runtime.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (including devDependencies — the TS compiler lives there).
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─────────────────────────────────────────────────────────────────
# Stage 2 — production image
#   Only the compiled output, migrations, and production dependencies.
#   No source, no compiler, no dev tooling.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies in the final layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled server code.
COPY --from=builder /app/dist ./dist

# SQL migration files — runMigrations() reads these from disk at startup.
COPY migrations ./migrations

# PM2 config (used by `npm run start:prod`).
COPY ecosystem.config.js ./

EXPOSE 5000

# Use node directly (not pm2) inside a container — the container itself is
# the process boundary; PM2's clustering is for bare-metal multi-core.
# Switch to `npm run start:prod` if you want PM2 clustering inside the container.
CMD ["node", "dist/server.js"]
