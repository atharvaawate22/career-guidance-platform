# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────
# Stage 1 — dependencies
#   Separated from the builder so npm ci can be cached independently
#   of the source code. A source-only change won't re-download deps.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────────
# Stage 2 — build
#   next build with output:'standalone' produces a minimal server
#   bundle in .next/standalone that can be run without node_modules.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for NEXT_PUBLIC_* env vars baked into static output.
# Pass at build time: --build-arg NEXT_PUBLIC_API_BASE_URL=https://…
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_CUTOFF_YEAR
ARG NEXT_PUBLIC_CAP_SCHEDULE_YEAR
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG CSP_ENFORCE

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_CUTOFF_YEAR=$NEXT_PUBLIC_CUTOFF_YEAR
ENV NEXT_PUBLIC_CAP_SCHEDULE_YEAR=$NEXT_PUBLIC_CAP_SCHEDULE_YEAR
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV CSP_ENFORCE=$CSP_ENFORCE
# Switches next.config.ts to output:'standalone' for this build only.
ENV NEXT_OUTPUT_STANDALONE=1

RUN npm run build

# ─────────────────────────────────────────────────────────────────
# Stage 3 — production runner
#   next.config.ts sets output:'standalone', so .next/standalone is
#   a self-contained server.js with no node_modules needed at runtime.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable Next.js telemetry inside containers.
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user — defence in depth.
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Public files served directly by the standalone server.
COPY --from=builder /app/public ./public

# The standalone bundle is self-contained — no node_modules needed.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
