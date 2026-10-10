# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install --global npm@latest

# Install dependencies first (cached layer — only invalidated if package files change)
COPY package*.json ./
RUN npm ci --prefer-offline && npm cache clean --force

COPY . .
RUN npm run build

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
# Use the minimal Node Alpine image — no npm, no devDeps, no source code
FROM node:20-alpine AS runner
WORKDIR /app

# Update bundled npm to resolve CVEs
RUN npm install --global npm@latest

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security + smaller attack surface
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone output includes only what's needed to run the server
# It embeds the required node_modules subset — no npm install needed here
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standalone output puts server.js at the root
CMD ["node", "server.js"]
