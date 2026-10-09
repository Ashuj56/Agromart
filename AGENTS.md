# AGENTS.md — AgroMart Project

> This file provides context and rules for AI coding agents (OpenCode, Claude, Cursor, etc.)
> working on the AgroMart codebase. Read this before writing any code.

---

## Project Overview

**AgroMart** is a farmer's e-commerce marketplace where farmers can:
- Buy and sell **crops** (wheat, rice, vegetables, fruits)
- Buy and sell **fertilizers** (urea, DAP, potash, pesticides)
- **Rent equipment** (tractors, harvesters, irrigation pumps)

The app also serves as the base application for **4 AWS DevOps infrastructure projects**:
1. Cost-Aware GitOps Gate
2. Terraform Drift Detection & Auto-Remediation
3. Self-Healing Incident Loop
4. Supply-Chain-Secured Deployment Pipeline

This dual purpose means the app must produce real container images (for Supply Chain), real
Prometheus metrics (for Self-Healing), real Terraform-managed infra (for Drift Detection),
and real Kubernetes manifests with resource requests (for Cost Gate).

---

## Repository Structure

```
agromart/
├── frontend/          Next.js 15 app (App Router, TypeScript, Tailwind)
├── backend/           Node.js + Apollo GraphQL API (TypeScript, Express)
│   └── prisma/        Prisma schema + migrations + seed
├── infra/             Terraform for AWS (EKS, RDS, ElastiCache, ECR)
├── gitops/            Kubernetes manifests + ArgoCD Application CRs
├── docker-compose.yml Local dev: all 4 services
└── AGENTS.md          This file
```

---

## Tech Stack — Do Not Change Without Asking

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | Next.js | 15.3.x |
| Frontend language | TypeScript | 5.x |
| CSS | Tailwind CSS | 3.x |
| GraphQL client | Apollo Client | 3.x |
| Backend framework | Express | 4.x |
| GraphQL server | Apollo Server | 4.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Cache | Redis (ioredis) | 7 / 5.x |
| Auth | JWT (jsonwebtoken) | 9.x |
| Password hashing | bcryptjs | 2.x |
| Payments | Razorpay Node SDK | 2.x |
| Metrics | prom-client | 15.x |
| Validation | Zod | 3.x |
| Forms | react-hook-form | 7.x |
| IaC | Terraform | 1.9.x |

**Do not introduce:**
- Redux, Zustand, Jotai (use Apollo reactive variables for global state)
- Prisma alternatives (no Drizzle, Sequelize, TypeORM)
- Any CSS framework other than Tailwind
- MongoDB, MySQL, or any non-Postgres database
- Any payment gateway other than Razorpay

---

## Setup & Run Commands

### Prerequisites
- Docker and Docker Compose v2 installed
- Node.js 20.x installed
- A Razorpay test account (free at dashboard.razorpay.com)

### First-Time Setup

```bash
# 1. Start infrastructure (PostgreSQL + Redis)
docker compose up postgres redis -d

# 2. Install backend dependencies and run migrations
cd backend
npm install
cp .env.example .env          # then fill in values
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed            # loads 3 users + 15 sample products
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cp .env.local.example .env.local    # then fill in values
cd ..
```

### Run in Development (Hot Reload)

```bash
# Terminal 1 — backend
cd backend && npm run dev     # runs ts-node src/index.ts on port 4000

# Terminal 2 — frontend
cd frontend && npm run dev    # runs Next.js on port 3000
```

### Run Everything via Docker

```bash
docker compose up --build     # first time
docker compose up -d          # subsequent runs
docker compose down           # stop all
```

### Verify Services Are Up

```bash
curl http://localhost:4000/health      # should return {"status":"ok"}
curl http://localhost:4000/ready       # should return {"status":"ready"}
curl http://localhost:4000/metrics     # should return Prometheus text format
open http://localhost:3000             # should load AgroMart homepage
open http://localhost:4000/graphql     # should load Apollo Sandbox
```

---

## Database Rules

### Prisma Schema Location
`backend/prisma/schema.prisma` — the single source of truth for all DB models.

### Migration Rules
- **Always create a named migration**: `npx prisma migrate dev --name <descriptive-name>`
- **Never use `prisma db push`** in any environment except a local throwaway database
- **Never edit migration files** after they have been committed
- **After any schema change**: run `npx prisma generate` to regenerate the client

### Models (5 total — do not add more without discussion)
1. `User` — buyers, sellers, or both
2. `Product` — crops, fertilizers, or equipment (rental or purchase)
3. `Order` — links buyer → product, tracks status and rental dates
4. `Payment` — Razorpay payment records linked to orders
5. `Review` — one per user per product, only after a DELIVERED order

### Data Rules
- UUIDs for all primary keys (Prisma default: `@default(uuid())`)
- Soft deletes: if you need to "delete" data, add a `deletedAt DateTime?` field — never hard-delete
- All timestamps in UTC
- Money (price, totalAmount) stored as `Decimal @db.Decimal(10, 2)`, NOT as Float
- Razorpay amounts stored as `Int` in **paise** (₹1 = 100 paise)

### Seed Data
`backend/prisma/seed.ts` creates:
- 3 users: `buyer@agromart.com`, `seller@agromart.com`, `both@agromart.com`
- All passwords: `Password123!` (bcrypt-hashed, rounds=10)
- 15 products: 6 crops, 5 fertilizers, 4 equipment (2 are rentals)

---

## GraphQL API Rules

### Resolver File Structure
```
backend/src/schema/resolvers/
├── index.ts              merge all resolvers here — do not put logic here
├── auth.resolver.ts      register, login only
├── product.resolver.ts   CRUD for products + cache logic
├── order.resolver.ts     placeOrder, cancelOrder, updateOrderStatus
├── payment.resolver.ts   createPaymentOrder, verifyPayment
└── review.resolver.ts    addReview
```

### Resolver Rules
1. **Validate all inputs with Zod** before touching the database. Never trust raw GraphQL input.
2. **Every authenticated resolver must verify `ctx.user` exists** before doing anything.
3. **Role checks are explicit**: 
   - `createProduct` → role must be `SELLER` or `BOTH`
   - `placeOrder` → role must be `BUYER` or `BOTH`
   - `updateOrderStatus` → role must be `SELLER` or `BOTH`, AND the order's product must belong to their listings
4. **Never expose password hash** in any User resolver response.
5. **Throw `GraphQLError`** (not plain `Error`) for user-facing errors so status codes are correct:
   ```typescript
   throw new GraphQLError('Product not found', {
     extensions: { code: 'NOT_FOUND' }
   });
   ```

### Context Shape
```typescript
interface Context {
  user:   { userId: string; role: UserRole } | null;
  prisma: PrismaClient;
  redis:  Redis;
}
```
Auth middleware populates `ctx.user` from the `Authorization: Bearer <token>` header.
If the token is invalid or absent, `ctx.user` is `null` (not an error — public resolvers handle this).

---

## Redis Caching Rules

### Cache Keys (use these exact patterns)
| Data | Key | TTL |
|---|---|---|
| Products list | `products:{category}:{page}` | 120s |
| Single product | `product:{id}` | 300s |
| Featured products | `products:featured` | 600s |
| User session | `session:{userId}` | 604800s (7 days) |

### Cache-Aside Pattern (use for ALL product reads)
```typescript
const cacheKey = `product:${id}`;
const cached = await ctx.redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await ctx.prisma.product.findUnique({ where: { id } });
await ctx.redis.setex(cacheKey, 300, JSON.stringify(result));
return result;
```

### Cache Invalidation Rules
- `createProduct` → delete `products:{category}:*` and `products:featured`
- `updateProduct` → delete `product:{id}`, `products:{category}:*`, `products:featured`
- `deleteProduct` → delete `product:{id}`, `products:{category}:*`, `products:featured`
- Use `redis.del(key)` for single keys, `redis.keys(pattern)` + `redis.del(...keys)` for pattern-based deletion

---

## Razorpay Payment Rules

### Security Rules — Non-Negotiable
1. **`RAZORPAY_KEY_SECRET` must never appear in any frontend code, response, or log**
2. **Only `RAZORPAY_KEY_ID` is safe to send to the frontend** (it starts with `rzp_test_` or `rzp_live_`)
3. **Every payment must be verified** via HMAC-SHA256 signature before marking SUCCESS
4. **Never mark an order CONFIRMED** until `verifyPayment` resolves successfully
5. The webhook route (`POST /webhook/razorpay`) must be registered **before** `express.json()` middleware because it needs the raw request body for signature verification

### Payment Flow (3 Steps — Do Not Shortcut)
```
Step 1: createPaymentOrder mutation (backend → Razorpay API → DB row status=CREATED)
Step 2: Razorpay modal (frontend only — no backend involvement)
Step 3: verifyPayment mutation (frontend sends signature → backend verifies → DB status=SUCCESS)
```

### Razorpay Test Card
- Number: `4111 1111 1111 1111`
- Expiry: `12/26`
- CVV: `123`
- OTP: `1234`

---

## Authentication Rules

- **JWT payload**: `{ userId: string, role: UserRole }` — nothing else
- **JWT expiry**: `'7d'`
- **JWT secret**: from `process.env.JWT_SECRET` — never hardcoded
- **Token delivery**: client sends `Authorization: Bearer <token>` header on every request
- **Session storage in Redis**: store refresh token as `session:{userId}` with 7-day TTL
- **On logout**: delete `session:{userId}` from Redis

---

## Frontend Rules

### File Naming
- Pages: `app/page.tsx`, `app/marketplace/page.tsx` (lowercase folder names)
- Components: `PascalCase.tsx` (e.g., `ProductCard.tsx`, `PayButton.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Utilities: `camelCase.ts` (e.g., `utils.ts`)

### Component Rules
1. Use `'use client'` directive only when the component needs:
   - Browser events (`onClick`, `onChange`)
   - Browser APIs (`window`, `localStorage`)
   - React hooks (`useState`, `useEffect`, `useMutation`)
2. Prefer **Server Components** for data fetching pages (call GraphQL from server)
3. Every page that requires authentication must redirect to `/login` if `ctx.user` is null

### Design Rules (Non-Negotiable)
- Use CSS variables defined in `app/globals.css` — no hardcoded color hex/rgb values in components
- Primary green: `var(--color-primary)` = `hsl(142, 71%, 30%)`
- Accent amber: `var(--color-accent)` = `hsl(38, 92%, 50%)`
- Fonts: Inter for body/UI, Merriweather for H1 headings
- No inline styles — use Tailwind classes referencing CSS variables

### Apollo Client Setup
- Singleton in `frontend/lib/apollo-client.ts`
- Include `Authorization: Bearer ${token}` in every request via `authLink`
- Do not create a new `ApolloClient` instance inside components

---

## Prometheus Metrics Rules

The backend **must** expose these metrics at `GET /metrics` for the Self-Healing AWS project:

| Metric | Type | Purpose |
|---|---|---|
| `http_requests_errors_total` | Counter | Watched by Prometheus alert rule for self-healing |
| `http_requests_total` | Counter | Total request count |
| `http_request_duration_seconds` | Histogram | Request latency |

**Do not remove or rename these metrics.** The Self-Healing Incident Loop project
configures a Prometheus alert that fires when `http_requests_errors_total` spikes.

Health endpoints (required for Kubernetes probes):
- `GET /health` → `200 { "status": "ok" }` — always responds if the process is alive
- `GET /ready` → `200 { "status": "ready" }` if DB + Redis are reachable, else `503`

---

## Kubernetes & AWS Rules

### K8s Manifests Location
All manifests live in `gitops/`. Do not create manifests inside `frontend/` or `backend/`.

### Resource Requests — Must Be Present
Every Deployment manifest must have `resources.requests` set:
```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```
These are read by the **Cost-Aware GitOps Gate** project to estimate deployment costs.
Removing them will break the cost gate CI check.

### Terraform Location
All Terraform code lives in `infra/`. The backend: S3 + DynamoDB state locking.
Do not store Terraform state files in the repo (they are `.gitignore`'d).

---

## Git Rules

### Files to Never Commit
```
.env
.env.local
.env.*.local
*.tfstate
*.tfstate.*
.terraform/
node_modules/
dist/
.next/
```

### Commit Message Format
```
<type>(<scope>): <short description>

Types: feat | fix | chore | docs | refactor | test
Scope: frontend | backend | infra | gitops

Examples:
feat(backend): add product search by name filter
fix(frontend): fix PayButton not showing for BOTH role users
chore(infra): add ElastiCache Redis cluster to Terraform
```

### Branch Naming
```
feature/<short-description>     e.g. feature/product-search
fix/<short-description>         e.g. fix/payment-webhook-signature
```

---

## Testing Checklist Before Committing

Run these checks before every commit:

```bash
# Backend: TypeScript compiles cleanly
cd backend && npx tsc --noEmit

# Backend: Prisma schema is valid
cd backend && npx prisma validate

# Frontend: TypeScript compiles cleanly
cd frontend && npx tsc --noEmit

# Full stack: Docker Compose starts cleanly
docker compose up --build -d
curl http://localhost:4000/health    # must return 200
curl http://localhost:3000           # must return 200
docker compose down
```

---

## Do Not Touch (Read-Only Files)

| File/Directory | Reason |
|---|---|
| `backend/prisma/migrations/` | Auto-generated by Prisma — never edit manually |
| `gitops/budgets.yaml` | Read by Cost Gate CI — only modify intentionally |
| `backend/src/metrics.ts` | Metric names watched by Prometheus — renaming breaks Self-Healing project |
| `infra/*.tf` | Terraform drift detection runs against this — must match live infra |

---

## Common Mistakes to Avoid

1. **Do not use `Float` for money in Prisma** — use `Decimal @db.Decimal(10,2)`
2. **Do not call Razorpay API from the frontend** — all Razorpay API calls go through the backend
3. **Do not forget `express.raw()` before `express.json()`** on the webhook route — raw body is required for signature verification
4. **Do not paginate with `OFFSET` on large tables** — use cursor-based pagination if product count exceeds 10,000
5. **Do not cache mutation responses** — only cache Query results
6. **Do not hard-code the JWT secret** — always use `process.env.JWT_SECRET`
7. **Do not return the full user object from auth resolvers** without stripping the `password` field
