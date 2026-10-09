<div align="center">

# 🌾 AgroMart

**A full-stack farmer marketplace for buying, selling, and renting agricultural goods.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Apollo_4-e10098?logo=graphql)](https://www.apollographql.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io/)
[![Terraform](https://img.shields.io/badge/Terraform-1.9-7B42BC?logo=terraform)](https://www.terraform.io/)

</div>

---

## 📋 Overview

AgroMart is a farmer e-commerce marketplace where farmers can:

- 🌾 **Buy and Sell Crops** — wheat, rice, vegetables, fruits
- 🧪 **Buy and Sell Fertilizers** — urea, DAP, potash, pesticides
- 🚜 **Rent Equipment** — tractors, harvesters, irrigation pumps

The app also serves as the base for **4 AWS DevOps infrastructure projects**:

| Project | Purpose |
|---|---|
| Cost-Aware GitOps Gate | Estimates K8s deployment cost from resource requests |
| Terraform Drift Detection | Detects and auto-remediates infra drift |
| Self-Healing Incident Loop | Uses Prometheus alerts to auto-recover services |
| Supply-Chain Deployment Pipeline | Signs, scans, and gates container images |

---

## 🏗️ Architecture

```
                +---------------------+
                |   Next.js 15 (SSR)  |  :3000
                |  Tailwind + Apollo  |
                +--------+------------+
                         | GraphQL
                +--------v------------+
                |  Express + Apollo   |  :4000
                |   Server 4 (Node)   |
                +---+----------+------+
                    |          |
         +----------v--+    +--v-------+
         | PostgreSQL  |    |  Redis   |
         |     16      |    |  Cache   |
         +-------------+    +----------+
```

### Repository Structure

```
agromart/
├── frontend/          # Next.js 15 — App Router, TypeScript, Tailwind
│   ├── app/           # Pages (file-based routing)
│   ├── components/    # Shared UI components
│   ├── lib/           # Apollo Client, utilities
│   └── types/         # Shared TypeScript types
├── backend/           # Node.js + Apollo GraphQL API
│   ├── prisma/        # Schema, migrations, seed
│   └── src/
│       ├── schema/    # TypeDefs + resolvers
│       ├── middleware/ # Auth (JWT)
│       ├── payments/  # Razorpay integration
│       ├── lib/       # Redis, Prisma clients
│       └── metrics.ts # Prometheus metrics
├── infra/             # Terraform: EKS, RDS, ElastiCache, ECR
├── gitops/            # Kubernetes manifests + ArgoCD CRs
└── docker-compose.yml # Local dev — all services
```

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) v2+
- [Node.js](https://nodejs.org/) 20.x
- [Razorpay test account](https://dashboard.razorpay.com/) (free)

### 1. Start Infrastructure

```bash
docker compose up postgres redis -d
```

### 2. Set Up Backend

```bash
cd backend
npm install
cp .env.example .env          # fill in your values (see .env.example)
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed             # loads 3 users + 15 products
```

### 3. Set Up Frontend

```bash
cd ../frontend
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_GRAPHQL_URL
```

### 4. Run Dev Servers

```bash
# Terminal 1 — backend (hot-reload on :4000)
cd backend && npm run dev

# Terminal 2 — frontend (hot-reload on :3000)
cd frontend && npm run dev
```

### 5. Verify Everything Is Working

```bash
curl http://localhost:4000/health    # {"status":"ok"}
curl http://localhost:4000/ready     # {"status":"ready"}
curl http://localhost:4000/metrics   # Prometheus text format
open http://localhost:3000           # AgroMart UI
open http://localhost:4000/graphql   # Apollo Sandbox
```

---

## 🐳 Run With Docker Compose

```bash
docker compose up --build     # first time (builds images)
docker compose up -d          # subsequent runs (detached)
docker compose down           # stop everything
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/agromart` |
| `REDIS_URL` | Redis / Upstash URL | `rediss://...@upstash.io:6379` |
| `JWT_SECRET` | Secret for signing JWTs | `super-secret-key` |
| `RAZORPAY_KEY_ID` | Razorpay public key | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (**never expose**) | `your_secret` |
| `PORT` | Server port | `4000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_GRAPHQL_URL` | Backend GraphQL endpoint | `http://localhost:4000/graphql` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key only | `rzp_test_xxxx` |

---

## 🗄️ Database

### Models

| Model | Purpose |
|---|---|
| `User` | Buyers, sellers, or both |
| `Product` | Crops, fertilizers, equipment |
| `Order` | Links buyer → product, tracks status and rental dates |
| `Payment` | Razorpay records linked to orders |
| `Review` | One per user per product (post-delivery only) |

### Seed Data (loaded by `prisma db seed`)

| Email | Password | Role |
|---|---|---|
| `buyer@agromart.com` | `Password123!` | BUYER |
| `seller@agromart.com` | `Password123!` | SELLER |
| `both@agromart.com` | `Password123!` | BOTH |

15 products are created: 6 crops, 5 fertilizers, 4 equipment (2 rentals).

### Migrations

```bash
# Create a named migration after schema changes
npx prisma migrate dev --name <descriptive-name>

# Regenerate the Prisma client
npx prisma generate
```

> ⚠️ Never use `prisma db push` in production. Never edit migration files after committing them.

---

## 🔴 Redis Caching

All product reads use the **cache-aside** pattern:

| Cache Key | TTL | Data |
|---|---|---|
| `products:{category}:{page}` | 120s | Product list |
| `product:{id}` | 300s | Single product |
| `products:featured` | 600s | Featured listings |
| `session:{userId}` | 7 days | Auth session |

Cache is **invalidated automatically** on create/update/delete mutations.

---

## 💳 Payment Flow (Razorpay)

```
1. createPaymentOrder  →  backend calls Razorpay API  →  DB status = CREATED
2. Razorpay modal      →  handled entirely in frontend
3. verifyPayment       →  frontend sends signature  →  backend verifies HMAC-SHA256  →  DB status = SUCCESS
```

**Test card:** `4111 1111 1111 1111` · Exp: `12/26` · CVV: `123` · OTP: `1234`

---

## 📊 Observability

The backend exposes these Prometheus metrics at `GET /metrics`:

| Metric | Type |
|---|---|
| `http_requests_total` | Counter |
| `http_request_duration_seconds` | Histogram |
| `http_requests_errors_total` | Counter (watched by Self-Healing alert) |

Health and readiness probes (used by Kubernetes):

```bash
GET /health   →  200 { "status": "ok" }
GET /ready    →  200 { "status": "ready" } | 503
```

---

## ☁️ AWS Infrastructure (Terraform)

All resources live in `infra/`:

- **EKS** — managed Kubernetes cluster
- **RDS PostgreSQL 16** — managed database
- **ElastiCache Redis** — managed cache
- **ECR** — private container registry

```bash
cd infra
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

> State is stored in S3 with DynamoDB locking. Never commit `*.tfstate` files.

---

## 🚢 GitOps (ArgoCD)

Kubernetes manifests live in `gitops/`. ArgoCD watches this directory and syncs changes to the EKS cluster.

All `Deployment` manifests include resource requests/limits (required by the Cost Gate CI):

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript 5, Tailwind CSS 3 |
| GraphQL Client | Apollo Client 3 |
| Backend | Express 4, Apollo Server 4, TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (ioredis 5) |
| Auth | JWT (jsonwebtoken 9) |
| Payments | Razorpay Node SDK 2 |
| Metrics | prom-client 15 |
| IaC | Terraform 1.9 |
| Container | Docker + Docker Compose |
| Orchestration | Kubernetes (EKS via ArgoCD) |

---

## 📝 Git Conventions

### Commit Format

```
<type>(<scope>): <short description>

Types : feat | fix | chore | docs | refactor | test
Scopes: frontend | backend | infra | gitops
```

### Branch Naming

```
feature/<short-description>   e.g. feature/product-search
fix/<short-description>       e.g. fix/payment-webhook-signature
```

---

## ✅ Pre-Commit Checklist

```bash
# TypeScript — backend
cd backend && npx tsc --noEmit

# Prisma schema validity
cd backend && npx prisma validate

# TypeScript — frontend
cd frontend && npx tsc --noEmit

# Full stack smoke test
docker compose up --build -d
curl http://localhost:4000/health   # must return 200
curl http://localhost:3000          # must return 200
docker compose down
```

---

<div align="center">

Made with ❤️ for Indian farmers 🌾

</div>