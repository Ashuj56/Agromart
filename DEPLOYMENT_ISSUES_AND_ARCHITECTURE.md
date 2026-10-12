# AgroMart on AWS EKS: Architecture & Deployment Troubleshooting Guide

This document provides a comprehensive technical overview of the **AgroMart** deployment on Amazon Elastic Kubernetes Service (EKS), including the end-to-end AWS cloud architecture diagram and an in-depth retrospective of every issue encountered during deployment, root causes, and resolutions.

---

## 1. AWS Cloud Architecture Diagram

The deployment utilizes a secure, multi-tier AWS architecture configured via Terraform, with compute running on Amazon EKS and data stored in Amazon RDS PostgreSQL and Amazon ElastiCache Redis within private subnets.

The diagram is organized from left to right: source control and users, AWS platform
services, the VPC network boundary, EKS workloads, and the private data tier.
Dashed traffic represents local `kubectl port-forward` access; solid traffic
represents deployment or application traffic.

```mermaid
flowchart LR
    Developer[Developer / Git client] -->|git push| GitHub[GitHub repository + Actions]
    Browser[User browser] -.->|kubectl port-forward<br/>8080 / 4000 / 8081| EKS

    subgraph AWS["AWS account • us-east-1"]
        ECR_BE[ECR: backend]
        ECR_FE[ECR: frontend]
        IAM[OIDC provider + IAM roles]
        GitHub -->|OIDC + push images| ECR_BE
        GitHub -->|OIDC + push images| ECR_FE
        GitHub -->|PR cost gate| CostExplorer[AWS Cost Explorer]

        subgraph VPC["AgroMart VPC • 10.0.0.0/16"]
            subgraph Public["Public subnets • us-east-1a / us-east-1b"]
                IGW[Internet Gateway]
                NAT[NAT Gateway + Elastic IP]
                LB[Optional external load balancer]
            end

            subgraph Private["Private subnets • us-east-1a / us-east-1b"]
                subgraph EKS["Amazon EKS • agromart-staging • v1.30"]
                    ControlPlane[EKS managed control plane]
                    subgraph Nodes["4 x EC2 worker nodes • t3.micro • AL2023"]
                        System["kube-system<br/>aws-node • kube-proxy • CoreDNS (1)"]
                        Argo["argocd namespace<br/>server • repo-server • redis • controller"]
                        App["agromart namespace<br/>frontend :3000 • backend :4000<br/>Prisma migration job"]
                    end
                end
                subgraph Data["Managed data tier"]
                    RDS[(RDS PostgreSQL 16<br/>private • 5432 • encrypted gp3)]
                    Redis[(ElastiCache Redis<br/>private • 6379)]
                end
            end
        end
    end

    Argo -->|poll manifests| GitHub
    Argo -->|deploy / self-heal| App
    App -->|internal DNS / GraphQL| RDS
    App -->|TCP 6379| Redis
    App -->|ECR / AWS APIs| NAT
    NAT -->|outbound internet| IGW
    ControlPlane --> System
    ControlPlane --> Argo
    ControlPlane --> App
```

### Generate an AWS-icon SVG

The repository also includes a Python source file that renders the same layout
with official AWS and Kubernetes icons:
[`scripts/aws_architecture_diagram.py`](C:/Users/ashuj/Desktop/AWS%20Projects/Agromart/scripts/aws_architecture_diagram.py).

Install the two local rendering prerequisites, then run it from the repository
root:

```bash
python -m pip install diagrams
python scripts/aws_architecture_diagram.py
```

Install [Graphviz](https://graphviz.org/download/) separately and ensure its
`dot` executable is on `PATH`. The generated file is
`docs/architecture/agromart_aws_architecture.svg`.

---

## 2. Infrastructure & Component Specifications

| Tier | Resource | Configuration | Network Location |
|---|---|---|---|
| **VPC** | `agromart-staging-vpc` | CIDR `10.0.0.0/16` | Multi-AZ (`us-east-1a`, `us-east-1b`) |
| **Public Subnets** | 2 Subnets | `10.0.101.0/24`, `10.0.102.0/24` | Internet Gateway + NAT Gateway |
| **Private Subnets** | 2 Subnets | `10.0.1.0/24`, `10.0.2.0/24` | EKS Nodes, RDS, ElastiCache |
| **Compute (EKS)** | `agromart-staging` | 4 Nodes (`t3.micro`, AL2023) | Private Subnets |
| **Database** | RDS PostgreSQL 16 | `db.t3.micro`, 20GB gp3 storage | Private Subnet Group (Port 5432) |
| **Caching** | ElastiCache Redis | `cache.t3.micro` | Private Subnet Group (Port 6379) |
| **Image Registry** | Amazon ECR | 2 Repositories (`backend`, `frontend`) | AWS Managed |
| **GitOps Engine** | ArgoCD v2.x | Namespace `argocd`, automated sync | EKS Cluster |

---

## 3. Comprehensive Deployment Issue Retrospective

This section details every technical challenge faced during the setup, including symptoms, root cause analysis, immediate fixes, and production best practices.

---

### Issue 1: Pod Scheduling Failure (`0/4 nodes are available: 4 Too many pods`)

#### Symptoms
Pods remained stuck in `Pending` state. Describing pods (e.g., `argocd-application-controller-0`, `prisma-migrate`) returned:
```text
Warning  FailedScheduling  default-scheduler  0/4 nodes are available: 4 Too many pods. 
preemption: 0/4 nodes are available: 4 No preemption victims found for incoming pod.
```

#### Root Cause Analysis
In AWS EKS, each EC2 instance type has a maximum pod limit (`max-pods`) calculated based on the number of Elastic Network Interfaces (ENIs) and secondary IPv4 addresses allowed per ENI:
$$\text{Max Pods} = (\text{ENIs} \times (\text{IPs per ENI} - 1)) + 2$$
For a **`t3.micro`** instance (2 ENIs, 2 IPs per ENI):
$$\text{Max Pods} = (2 \times (2 - 1)) + 2 = 4 \text{ pods per node}$$
Across 4 `t3.micro` nodes, the absolute cluster capacity was **$4 \times 4 = 16 \text{ pods}$**.

System pods alone occupied **10 slots**:
- 4x `aws-node` (DaemonSet: 1 per node)
- 4x `kube-proxy` (DaemonSet: 1 per node)
- 2x `coredns` (Deployment: 2 replicas)

This left only **6 available pod slots** across the entire cluster. Trying to schedule ArgoCD (4 pods) + AgroMart backend (2 replicas) + frontend (2 replicas) + migration job (1 pod) required **19 pods**, causing the scheduler to reject incoming pods.

#### How We Resolved It
1. **Scaled CoreDNS to 1 replica:**
   ```bash
   kubectl scale deployment coredns -n kube-system --replicas=1
   ```
   *(Freed 1 slot, reducing system pods to 9).*
2. **Reduced application workloads to 1 replica each:**
   - Modified [`gitops/backend-deployment.yaml`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/gitops/backend-deployment.yaml#L9): `replicas: 1`
   - Modified [`gitops/frontend-deployment.yaml`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/gitops/frontend-deployment.yaml#L9): `replicas: 1`
3. **Deleted orphan and failed pods** that were holding onto pod allocations.
4. Total required pods dropped to **15 / 16 available slots**, allowing all workloads and ArgoCD to schedule immediately.

---

### Issue 2: Subnet IP Exhaustion in VPC CNI (`failed to assign an IP address`)

#### Symptoms
Containers stuck in `ContainerCreating`. Pod events showed:
```text
Failed to create pod sandbox: rpc error: code = Unknown desc = failed to setup network for sandbox: 
plugin type="aws-cni" name="aws-cni" failed (add): add cmd: failed to assign an IP address to container
```

#### Root Cause Analysis
The private subnets were constrained, and older worker node instances that launched before VPC CNI Prefix Delegation was configured had exhausted their individual secondary IP allocation table.

#### How We Resolved It
1. Enabled Prefix Delegation on the AWS CNI DaemonSet:
   ```bash
   kubectl set env daemonset aws-node -n kube-system ENABLE_PREFIX_DELEGATION=true
   ```
2. Recycled the worker node instances so newly launched nodes initialized with `/28` prefix allocations (16 IPs per prefix slot).
3. Restarted the CNI DaemonSet:
   ```bash
   kubectl rollout restart daemonset aws-node -n kube-system
   ```

---

### Issue 3: Invalid Database Connection String (`invalid domain character in database URL`)

#### Symptoms
Prisma migrations crashed with:
```text
Error: P1013: The provided database string is invalid. invalid domain character in database URL. 
Please refer to the documentation in https://www.prisma.io/docs/reference/database-reference/connection-urls
```
Simultaneously, the backend log reported:
```text
[Redis] Failed to initialize client, falling back to in-memory cache: Invalid URL
```

#### Root Cause Analysis
Two compounded factors caused this issue:
1. **Port Duplication in Manual Commands:** Terraform's `rds_endpoint` output already includes `:5432` (`agromart-staging-postgres...rds.amazonaws.com:5432`). Appending `:5432` resulted in an invalid domain with consecutive colons (`:5432:5432`).
2. **ArgoCD Self-Healing Placeholder Sync:** The repository contained [`gitops/secrets.example.yaml`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/gitops/secrets.example.template) directly in the `gitops/` directory containing template placeholders:
   ```yaml
   DATABASE_URL: "postgresql://agromart_admin:YourDbPassword@<rds-endpoint>:5432/agromart?schema=public"
   REDIS_URL: "redis://<redis-endpoint>:6379"
   ```
   Because ArgoCD monitored the `gitops/` path with `selfHeal: true`, every time a real secret was applied via `kubectl`, **ArgoCD immediately detected drift and reverted the secret back to the literal string `<rds-endpoint>`**. The angle brackets (`<` and `>`) are illegal URL domain characters.

#### How We Resolved It
1. **Renamed the example template file:**
   ```bash
   git mv gitops/secrets.example.yaml gitops/secrets.example.template
   ```
   *(ArgoCD only parses `.yaml`/`.yml` files; changing the extension stopped ArgoCD from deploying placeholder credentials).*
2. **Deleted the ArgoCD-tracked dummy secret and created the real secret:**
   ```bash
   kubectl delete secret agromart-backend-secrets -n agromart --ignore-not-found

   kubectl create secret generic agromart-backend-secrets -n agromart \
     --from-literal=DATABASE_URL="postgresql://agromart_admin:Sql080505@agromart-staging-postgres.ccx40ygk0fiy.us-east-1.rds.amazonaws.com:5432/agromart?schema=public" \
     --from-literal=REDIS_URL="redis://agromart-staging-redis.oe60pj.0001.use1.cache.amazonaws.com:6379" \
     --from-literal=JWT_SECRET="agromart-super-secret-jwt-key-2026-production" \
     --from-literal=RAZORPAY_KEY_ID="rzp_test_placeholder" \
     --from-literal=RAZORPAY_KEY_SECRET="placeholder_secret"
   ```

---

### Issue 4: Secret Overwrite Error (`secrets ... already exists`)

#### Symptoms
Running `kubectl create secret` returned:
```text
error: failed to create secret secrets "agromart-backend-secrets" already exists
```

#### Root Cause Analysis
`kubectl create` is an imperative creation command and fails if the resource already exists in Kubernetes etcd.

#### How We Resolved It
Used declarative pipe-to-apply with dry-run:
```bash
kubectl create secret generic agromart-backend-secrets -n agromart \
  --from-literal=... \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

### Issue 5: Network Unreachable to RDS & Redis (`P1001: Can't reach database server` / `ETIMEDOUT`)

#### Symptoms
Prisma migration output:
```text
Datasource "db": PostgreSQL database "agromart", schema "public" at "agromart-staging-postgres...:5432"
Error: P1001: Can't reach database server at `agromart-staging-postgres.ccx40ygk0fiy.us-east-1.rds.amazonaws.com:5432`
```
Backend logs showed:
```text
⚠️ [Redis Connection Warning]: connect ETIMEDOUT
```

#### Root Cause Analysis
In [`infra/security_groups.tf`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/infra/security_groups.tf), the RDS (`sg-04336a6699ea30993`) and Redis (`sg-0f77d9bc29799f571`) security groups were configured with:
```hcl
ingress {
  from_port       = 5432
  to_port         = 5432
  protocol        = "tcp"
  security_groups = [aws_security_group.eks_nodes.id] # sg-02ec5662d04ab4298
}
```
However, in [`infra/eks.tf`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/infra/eks.tf#L79), the EKS Managed Node Group (`aws_eks_node_group.main`) did not have a custom launch template explicitly attaching `aws_security_group.eks_nodes.id`. 

By default, AWS EKS attaches the **Cluster Security Group** (`cluster_security_group_id`: `sg-03c5093d12f5d742f`) to worker node network interfaces. Because the worker nodes lacked `aws_security_group.eks_nodes.id`, the RDS and Redis AWS security group firewalls dropped all inbound TCP traffic on ports 5432 and 6379.

#### How We Resolved It
1. Authorized inbound rules for the cluster security group (`sg-03c5093d12f5d742f`):
   ```bash
   aws ec2 authorize-security-group-ingress --group-id sg-04336a6699ea30993 \
     --protocol tcp --port 5432 --source-group sg-03c5093d12f5d742f

   aws ec2 authorize-security-group-ingress --group-id sg-0f77d9bc29799f571 \
     --protocol tcp --port 6379 --source-group sg-03c5093d12f5d742f
   ```
2. Codified the change into [`infra/security_groups.tf`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/infra/security_groups.tf#L63-L95) to prevent Terraform configuration drift:
   ```hcl
   security_groups = [
     aws_security_group.eks_nodes.id,
     aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
   ]
   ```
3. Re-ran Prisma migration:
   ```text
   Applying migration `20261009031424_init`
   All migrations have been successfully applied.
   ```
4. Restarted backend:
   ```text
   🚀 [Redis] Connected successfully to Upstash Redis cluster
   💓 [DB Keepalive] ping ok
   ```

---

### Issue 6: Client-Side GraphQL DNS Resolution Failure

#### Symptoms
Frontend loaded in browser, but product catalogs, categories, and marketplace items failed to load.

#### Root Cause Analysis
In [`gitops/frontend-deployment.yaml`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/gitops/frontend-deployment.yaml#L30-L31), the environment variable was defined as:
```yaml
- name: NEXT_PUBLIC_GRAPHQL_URL
  value: "http://agromart-backend:4000/graphql"
```
In Next.js, Apollo Client executes **client-side inside the user's web browser**. The browser on a user's laptop cannot resolve Kubernetes internal DNS names (`agromart-backend:4000`), resulting in browser-level `ERR_NAME_NOT_RESOLVED` network failures.

#### How We Resolved It
For local access and port-forwarding:
1. Port-forward the backend service to `localhost:4000`:
   ```bash
   kubectl port-forward svc/agromart-backend -n agromart 4000:4000
   ```
2. Port-forward the frontend service to `localhost:8080`:
   ```bash
   kubectl port-forward svc/agromart-frontend -n agromart 8080:80
   ```
3. Apollo Client connects to `http://localhost:4000/graphql`, allowing the browser to fetch GraphQL data cleanly.

---

### Issue 7: Empty Database Catalog After Migration

#### Symptoms
Database migration succeeded and backend started, but the store returned 0 products.

#### Root Cause Analysis
Running `prisma migrate deploy` only executes DDL SQL statements to construct database tables (`User`, `Product`, `Order`, `Review`). It does not seed records. The seed logic is defined separately in [`backend/prisma/seed.ts`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/backend/prisma/seed.ts).

#### How We Resolved It
1. Compiled `seed.ts` to CommonJS `seed.js`:
   ```bash
   npx tsc prisma/seed.ts --esModuleInterop --skipLibCheck --target ES2022 --module CommonJS --outDir prisma/
   ```
2. Executed the seed script directly inside the live backend pod:
   ```bash
   cat prisma/seed.js | kubectl exec -i -n agromart $(kubectl get pods -n agromart -l app=agromart-backend -o jsonpath="{.items[0].metadata.name}") -- node -
   ```
3. Output:
   ```text
   🌱 Starting AgroMart database seeding...
   ✅ Created 3 users: buyer, seller, both
   ✅ Seeded 15 products across CROP, FERTILIZER, and EQUIPMENT (with 2 rentals)
   🎉 Seeding completed successfully!
   ```

---

### Issue 8: Conftest Package Discovery Mismatch (`0 tests, 0 passed`)

#### Symptoms
Running Conftest returned:
```text
0 tests, 0 passed, 0 warnings, 0 failures, 0 exceptions
```

#### Root Cause Analysis
By default, the Conftest CLI only evaluates rules defined under **`package main`**. The policy was initially declared as `package cost.gate`, which Conftest ignored unless explicitly passed the `--namespace cost.gate` argument.

#### How We Resolved It
Updated [`policy/cost_gate.rego`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/policy/cost_gate.rego#L1) to use `package main`:
```rego
package main

default allow = false
...
```
Conftest immediately recognized the rules:
```text
1 test, 1 passed, 0 warnings, 0 failures, 0 exceptions
```

---

## 4. Cost-Aware GitOps Gate: Implemented Architecture

To prevent future cost overruns before deployments reach AWS, we implemented an automated 8-phase Shift-Left FinOps pipeline:

| Phase | Component | Location | Role |
|---|---|---|---|
| **Phase 2** | Budget Schema | [`gitops/budgets.yaml`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/gitops/budgets.yaml) | Declares monthly USD budgets & compute limits per namespace |
| **Phase 3** | Cost Ingestion | [`scripts/cost_ingest.py`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/scripts/cost_ingest.py) | Pulls MTD actual spend from AWS Cost Explorer API |
| **Phase 4** | Cost Estimator | [`scripts/cost_estimator.py`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/scripts/cost_estimator.py) | Computes projected workload cost deltas from manifest diffs |
| **Phase 5** | Policy Gate | [`policy/cost_gate.rego`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/policy/cost_gate.rego) | OPA/Conftest rules that deny or warn on budget overruns |
| **Phase 6** | CI PR Gate | [`.github/workflows/cost-gate.yml`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/.github/workflows/cost-gate.yml) | Blocks PR merges and posts automated cost breakdown comments |
| **Phase 7** | Metrics Exporter | [`scripts/cost_exporter.py`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/scripts/cost_exporter.py) | Exposes Prometheus metrics on port 9102 |
| **Phase 7** | Grafana Dashboard | [`monitoring/cost-dashboard.json`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/monitoring/cost-dashboard.json) | Pre-built dashboard showing spend trends and budget lines |
| **Phase 8** | Test Suite | [`scripts/test_cost_gate.py`](file:///c:/Users/ashuj/Desktop/AWS%20Projects/agromart/scripts/test_cost_gate.py) | Automated test suite validating PASS, DENY, and Override paths |

---

## 5. Verification Commands Quick Reference

### Cluster Health Check
```bash
# Check all pods across the cluster
kubectl get pods -A

# Check pod limits on nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,POD_CAPACITY:.status.capacity.pods

# View backend database connection health
kubectl logs -n agromart deployment/agromart-backend --tail=30
```

### Accessing Services Locally
```bash
# Frontend UI (http://localhost:8080)
kubectl port-forward svc/agromart-frontend -n agromart 8080:80

# Backend GraphQL API (http://localhost:4000/graphql)
kubectl port-forward svc/agromart-backend -n agromart 4000:4000

# ArgoCD Dashboard (https://localhost:8081)
kubectl port-forward svc/argocd-server -n argocd 8081:443
```

### Running the Cost Gate Test Suite
```bash
cd "/mnt/c/Users/ashuj/Desktop/AWS Projects/agromart"
python3 scripts/test_cost_gate.py
```
