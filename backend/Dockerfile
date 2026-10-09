# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (devDeps needed for tsc + prisma CLI)
COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

# Generate Prisma client & compile TypeScript in one layer
RUN npx prisma generate && npm run build

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies, then clean cache in a single layer
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy Prisma schema (needed for migrations / runtime schema resolution)
COPY --from=builder /app/prisma ./prisma

# Copy the pre-generated Prisma client — no need to run prisma generate again
# This avoids pulling the heavy prisma CLI into the final image
COPY --from=builder /app/node_modules/.prisma        ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 4000
CMD ["node", "dist/index.js"]
